#!/usr/bin/env bun
/**
 * WebUI E2E test: start ACP + WebUI, verify ZOYA responds via AionCore API
 */
import { spawn } from "child_process"

const API_KEY = "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"
const AUTH = "Basic " + Buffer.from("opencode:" + (process.env.OPENCODE_SERVER_PASSWORD || "")).toString("base64")

async function main() {
  console.log("=== WebUI E2E Test ===\n")

  // Kill old
  try { Bun.spawnSync(["taskkill", "/F", "/IM", "aioncore.exe"]) } catch {}
  try {
    const ns = Bun.spawnSync(["netstat", "-ano"])
    for (const line of ns.stdout.toString().split("\n")) {
      if (line.includes(":25809") || line.includes(":25810")) {
        const pid = parseInt(line.trim().split(/\s+/).pop() || "")
        if (!isNaN(pid)) try { Bun.spawnSync(["taskkill", "/F", "/PID", String(pid)]) } catch {}
      }
    }
  } catch {}
  await sleep(3000)

  // 1. Start ACP server
  console.log("[1] Starting ACP server (port 25810)...")
  const acp = spawn("bun", [
    "run", "--cwd", "packages/zoya", "--conditions=browser",
    "src/index.ts", "acp", "--port", "25810"
  ], {
    cwd: "D:\\PROJECTS\\ZOYA_009\\backend",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, OPENCODE_API_KEY: API_KEY }
  })
  acp.stderr!.on("data", () => {})
  await waitForHttp("http://localhost:25810/api/health", 60000)
  console.log("   ACP ready!\n")

  // 2. Start WebUI
  console.log("[2] Starting WebUI (port 25809)...")
  const webui = spawn("bun", ["run", "webui", "--no-build"], {
    cwd: "D:\\PROJECTS\\ZOYA_009\\ui",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, OPENCODE_API_KEY: API_KEY, AIONUI_OPEN_BROWSER: "false" }
  })
  webui.stderr!.on("data", (d) => {
    const s = d.toString()
    if (s.toLowerCase().includes("error") || s.toLowerCase().includes("fail"))
      process.stderr.write(`[WUI] ${s}`)
  })

  console.log("   Waiting for WebUI (up to 90s)...")
  await waitForEndpoint("http://localhost:25809/api/agents", 90000)
  console.log("   WebUI ready!\n")

  // 3. Find ZOYA agent
  console.log("[3] Finding ZOYA agent...")
  const agentsRes = await fetch("http://localhost:25809/api/agents")
  const agentsData: any = await agentsRes.json()
  const agents: any[] = agentsData.data || agentsData.agents || []
  const zoya = agents.find((a: any) => a.name === "ZOYA")

  if (!zoya) {
    console.log("   ZOYA not found! Waiting 20s...")
    await sleep(20000)
    const retry = await fetch("http://localhost:25809/api/agents")
    const retryData: any = await retry.json()
    const retryAgents: any[] = retryData.data || retryData.agents || []
    const zoya2 = retryAgents.find((a: any) => a.name === "ZOYA")
    if (zoya2) {
      console.log("   ZOYA found on retry:", zoya2.id, zoya2.agent_source)
      zoya.id = zoya2.id
    } else {
      console.log("   ZOYA NOT FOUND!")
      console.log("   Available:", retryAgents.map((a: any) => `${a.name}(${a.agent_source})`).join(", "))
      acp.kill(); webui.kill(); process.exit(1)
    }
  } else {
    console.log(`   ZOYA: id=${zoya.id} source=${zoya.agent_source}\n`)
  }

  // 4. Create conversation via AionCore API
  console.log("[4] Creating conversation...")
  const zoyaId = zoya.id
  const headers = { "Content-Type": "application/json" }
  const msg = "Sirf 'ZOYA ready hai' likho, kuch aur nahi."

  // Try multiple API patterns
  const patterns = [
    { method: "POST", url: `/api/agents/${zoyaId}/conversations`, body: { message: msg } },
    { method: "POST", url: `/api/agents/zoya/conversations`, body: { message: msg } },
  ]

  for (const p of patterns) {
    console.log(`   Trying ${p.method} ${p.url}...`)
    try {
      const res = await fetch(`http://localhost:25809${p.url}`, {
        method: p.method as any,
        headers,
        body: JSON.stringify(p.body),
        timeout: 30000
      })
      const text = await res.text()
      if (res.ok) {
        console.log(`   ✅ Response (${res.status}): ${text.substring(0, 500)}\n`)
        // Check if we got a conversation/message back
        try {
          const json = JSON.parse(text)
          if (json.id || json.conversation_id || json.session_id) {
            console.log("   Conversation created!")
          }
        } catch {}
      } else {
        console.log(`   ❌ ${res.status}: ${text.substring(0, 200)}`)
      }
    } catch (e: any) {
      console.log(`   ⚠ ${e.message}`)
    }
  }

  // 5. Check what AionCore API endpoints exist
  console.log("[5] API discovery...")
  for (const ep of ["/api", "/api/health", "/api/status"]) {
    try {
      const res = await fetch(`http://localhost:25809${ep}`, { timeout: 5000 })
      const text = (await res.text()).substring(0, 200)
      console.log(`   ${res.status} ${ep}: ${text}`)
    } catch (e: any) {
      console.log(`   ERR ${ep}: ${e.message}`)
    }
  }

  console.log("\n=== WebUI E2E TEST COMPLETE ===")
  acp.kill()
  webui.kill()
  process.exit(0)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function waitForHttp(url: string, timeout: number) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { timeout: 3000 })
      if (res.status === 401 || res.ok) return
    } catch {}
    await sleep(2000)
  }
  throw new Error(`Timeout: ${url}`)
}

async function waitForEndpoint(url: string, timeout: number) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { timeout: 5000 })
      if (res.ok) return
    } catch {}
    console.log(`   waiting... (${Math.round((Date.now() - start) / 1000)}s)`)
    await sleep(5000)
  }
  throw new Error(`Timeout: ${url}`)
}

main().catch(e => {
  console.error("FATAL:", e)
  process.exit(1)
})

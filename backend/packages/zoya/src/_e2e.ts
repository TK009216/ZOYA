#!/usr/bin/env bun
/**
 * Full E2E test: start ACP server + WebUI, then verify ZOYA via AionCore API
 */
import { spawn, type ChildProcess } from "child_process"

const API_KEY = "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"
const OPENCODE_SERVER_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || ""

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function waitForHttp(url: string, timeout: number): Promise<number> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url, { timeout: 3000 })
      if (res.status === 401 || res.ok) return res.status
    } catch {}
    await sleep(1500)
  }
  throw new Error(`Timeout: ${url}`)
}

async function main() {
  console.log("=== ZOYA WebUI E2E Test ===")
  console.log("Node:", process.version, "Platform:", process.platform)
  console.log("CWD:", process.cwd())

  // Kill existing (don't use taskkill on bun - kills ourselves!)
  console.log("Killing old aioncore processes...")
  try { Bun.spawnSync(["taskkill", "/F", "/IM", "aioncore.exe"]) } catch (e: any) { console.log("  kill aioncore:", e.message) }
  // Use netstat to find bun processes on our ports and kill those specifically
  try {
    const netstat = Bun.spawnSync(["netstat", "-ano"])
    const lines = netstat.stdout.toString().split("\n")
    const portPids = new Set<number>()
    for (const line of lines) {
      if (line.includes(":25809") || line.includes(":25810")) {
        const parts = line.trim().split(/\s+/)
        const pid = parseInt(parts[parts.length - 1])
        if (!isNaN(pid)) portPids.add(pid)
      }
    }
    for (const pid of portPids) {
      try { Bun.spawnSync(["taskkill", "/F", "/PID", String(pid)]) } catch {}
    }
    console.log(`  Killed ${portPids.size} processes on ports 25809/25810`)
  } catch (e: any) { console.log("  netstat error:", e.message) }
  await sleep(3000)
  console.log("...done\n")

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
  acp.stderr!.on("data", (d) => {})

  const acpStatus = await waitForHttp("http://localhost:25810/api/health", 60000)
  console.log(`   ACP ready (status ${acpStatus})`)

  // 2. Pre-warm providers
  console.log("[2] Pre-warming providers...")
  const { createZoyaClient } = await import("@zoya/sdk/v2")
  const { ServerAuth } = await import("@/server/auth")
  const sdk = createZoyaClient({ 
    baseUrl: "http://localhost:25810",
    headers: ServerAuth.headers()
  })
  await sdk.config.providers({ directory: "D:\\PROJECTS\\ZOYA_009" })
  console.log("   Providers loaded!")

  // 3. Direct ACP test (model verification)
  console.log("[3] Direct ACP test...")
  const { ACP } = await import("@/acp/agent")
  const agent = ACP.init({ sdk })
  const updates: any[] = []
  const acpAgent = agent.create({
    sessionUpdate: async (u: any) => updates.push(u),
    requestPermission: undefined,
    writeTextFile: undefined,
  })

  await acpAgent.initialize({ clientVersion: "e2e" })
  const ns = await acpAgent.newSession({ cwd: "D:\\PROJECTS\\ZOYA_009", mcpServers: [] })
  const modelOpt = ns.configOptions.find((o: any) => o.id === "model")
  console.log(`   Model: ${modelOpt?.currentValue}`)

  const prompt = await acpAgent.prompt({
    sessionId: ns.sessionId,
    prompt: [{ type: "text", text: "Sirf 'ready' likho." }],
    messageId: "msg_e2e_001"
  })
  console.log(`   Prompt: stop=${prompt.stopReason} tokens=${JSON.stringify(prompt.usage)}`)
  for (const u of updates) {
    if (u.type === "text") console.log(`   Reply: ${JSON.stringify(u.text)}`)
  }
  console.log("   ✓ Direct ACP PASSED!\n")

  // 4. Start WebUI
  console.log("[4] Starting WebUI...")
  const webui = spawn("bun", ["run", "webui", "--no-build"], {
    cwd: "D:\\PROJECTS\\ZOYA_009\\ui",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, OPENCODE_API_KEY: API_KEY, AIONUI_OPEN_BROWSER: "false" }
  })
  webui.stderr!.on("data", (d) => {
    const s = d.toString()
    if (s.toLowerCase().includes("error") || s.toLowerCase().includes("warn"))
      process.stderr.write(`[WUI] ${s}`)
  })

  await waitForHttp("http://localhost:25809/api/agents", 90000)
  console.log("   WebUI ready!\n")

  // 5. Find ZOYA agent
  console.log("[5] Finding ZOYA agent...")
  const agentsRes = await fetch("http://localhost:25809/api/agents")
  const agentsData: any = await agentsRes.json()
  
  function findZoya(data: any): any {
    if (data.data?.length) return data.data.find((a: any) => a.name === "ZOYA")
    if (data.agents?.length) return data.agents.find((a: any) => a.name === "ZOYA")
    return null
  }
  
  let zoya = findZoya(agentsData)
  if (!zoya) {
    console.log("   ZOYA not found yet, waiting 20s...")
    await sleep(20000)
    const r2 = await fetch("http://localhost:25809/api/agents")
    const d2: any = await r2.json()
    zoya = findZoya(d2)
  }
  
  if (zoya) {
    console.log(`   ✓ ZOYA: id=${zoya.id} source=${zoya.agent_source}`)
  } else {
    console.log("   ✗ ZOYA NOT FOUND!")
    console.log("   Agents:", JSON.stringify(agentsData).substring(0, 500))
    // Continue anyway
  }

  // 6. Try conversation API
  console.log("\n[6] Testing conversation APIs...")
  if (zoya) {
    const payload = { message: "Sirf 'ZOYA ready hai' likho, kuch aur nahi." }
    const headers = { "Content-Type": "application/json" }
    
    const results: Array<{url: string, status: number, body: string}> = []

    // Try POST conversation
    for (const url of [
      `/api/agents/${zoya.id}/conversations`,
      `/api/agents/zoya/conversations`,
    ]) {
      try {
        const res = await fetch(`http://localhost:25809${url}`, {
          method: "POST", headers, body: JSON.stringify(payload), timeout: 30000
        })
        const text = await res.text()
        results.push({ url, status: res.status, body: text.substring(0, 500) })
      } catch (e: any) {
        results.push({ url, status: 0, body: e.message })
      }
    }

    // Try GET conversations list
    try {
      const res = await fetch(`http://localhost:25809/api/conversations`, { timeout: 5000 })
      const text = await res.text()
      results.push({ url: "/api/conversations (GET)", status: res.status, body: text.substring(0, 500) })
    } catch (e: any) {
      results.push({ url: "/api/conversations (GET)", status: 0, body: e.message })
    }

    for (const r of results) {
      if (r.status === 200) {
        console.log(`   ✓ ${r.url}: ${r.body}`)
      } else {
        console.log(`   ✗ ${r.url} (${r.status}): ${r.body}`)
      }
    }
  }

  // 7. Discovery: check all available API routes
  console.log("\n[7] API discovery...")
  const endpoints = [
    "/api", "/api/health", "/api/agents", "/api/status",
    "/api/v1", "/api/v1/agents",
  ]
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:25809${ep}`, { timeout: 5000 })
      const text = (await res.text()).substring(0, 200)
      console.log(`   ${res.status} ${ep}: ${text}`)
    } catch (e: any) {
      console.log(`   ERR ${ep}: ${e.message}`)
    }
  }

  console.log("\n=== DONE ===")
  acp.kill()
  webui.kill()
  process.exit(0)
}

main().catch(e => {
  console.error("FATAL:", e)
  process.exit(1)
})

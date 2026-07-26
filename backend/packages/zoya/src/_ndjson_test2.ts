import { spawn } from "child_process"
import { resolve } from "path"

const CWD = resolve(import.meta.dirname)
const zoyaDir = resolve(CWD, "..")

async function main() {
  console.log("=== Starting ACP ===")
  const proc = spawn("bun", [
    "run", "--conditions=browser",
    "src/index.ts", "acp", "--port", "25811",
  ], {
    cwd: zoyaDir,
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, OPENCODE_CLIENT: "acp", NODE_ENV: "development" },
  })

  const allOutput: string[] = []
  proc.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8")
    for (const line of text.split("\n").filter(Boolean)) {
      allOutput.push(line)
    }
  })

  function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }
  function send(msg: object) {
    const line = JSON.stringify(msg) + "\n"
    console.log(">>>", msg.method || JSON.stringify(msg))
    proc.stdin.write(line)
  }
  function findResponse(id: string): any {
    for (const line of allOutput) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.id === id && parsed.result) return parsed.result
      } catch {}
    }
    return null
  }

  await wait(4000)

  // 1. initialize
  console.log("\n--- 1. initialize ---")
  send({ jsonrpc: "2.0", id: "1", method: "initialize", params: { protocolVersion: 1, clientCapabilities: { promptCapabilities: { image: true, embeddedContext: true }, sessionCapabilities: { close: {}, fork: {}, list: {}, resume: {} }, mcpCapabilities: { http: true, sse: true } }, clientInfo: { name: "ndjson-test", version: "1.0.0" } } })
  await wait(3000)

  // 2. session/new
  console.log("\n--- 2. session/new ---")
  send({ jsonrpc: "2.0", id: "2", method: "session/new", params: { cwd: CWD, mcpServers: [] } })
  await wait(8000)

  // Get session ID from response
  const sessionResult = findResponse("2")
  let sessionId = "ses_fallback"
  if (sessionResult?.sessionId) {
    sessionId = sessionResult.sessionId
    console.log("Session ID:", sessionId)
  } else {
    console.log("No session ID found, using fallback")
  }

  // 3. session/prompt with REAL session ID
  console.log("\n--- 3. session/prompt ---")
  send({
    jsonrpc: "2.0", id: "3", method: "session/prompt",
    params: {
      sessionId: sessionId,
      prompt: [{ type: "text", text: "Say only 'pong' and nothing else." }],
      messageId: "msg_001",
    },
  })

  console.log("\n--- Waiting for output (60s) ---")
  await wait(60000)

  console.log("\n=== RAW OUTPUT (last 50 lines) ===")
  const relevant = allOutput.filter(l => {
    try {
      const p = JSON.parse(l)
      return p.id === "3" || (p.method === "session/update" && p.params?.update?.sessionUpdate !== "available_commands_update")
    } catch { return false }
  })
  if (relevant.length === 0) {
    // Show all session/update notifications
    const updates = allOutput.filter(l => l.includes("session/update"))
    for (const line of updates.slice(0, 20)) {
      try { console.log(JSON.stringify(JSON.parse(line), null, 2)) } catch { console.log(line) }
    }
    // Also show if any response with id:3 exists
    const resp3 = allOutput.filter(l => l.includes('"id":"3"') || l.includes('"id":"3}'))
    if (resp3.length > 0) {
      console.log("\n--- Response with id:3 ---")
      for (const line of resp3) {
        try { console.log(JSON.stringify(JSON.parse(line), null, 2)) } catch { console.log(line) }
      }
    } else {
      console.log("NO response with id:3 found in", allOutput.length, "lines")
      // Print everything
      for (const line of allOutput.slice(0, 30)) {
        try { console.log(JSON.stringify(JSON.parse(line), null, 2)) } catch { console.log("(raw):", line) }
      }
    }
  } else {
    for (const line of relevant) {
      try { console.log(JSON.stringify(JSON.parse(line), null, 2)) } catch { console.log(line) }
    }
  }

  console.log("\nTotal output lines:", allOutput.length)
  proc.kill()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })

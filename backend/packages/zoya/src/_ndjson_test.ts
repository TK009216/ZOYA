import { spawn } from "child_process"
import { resolve } from "path"

const CWD = resolve(import.meta.dirname)
const zoyaDir = resolve(CWD, "..")

interface JsonRpc {
  jsonrpc: string
  id?: string
  method?: string
  result?: any
  error?: any
  params?: any
}

function sendMsg(proc: any, msg: object) {
  const line = JSON.stringify(msg) + "\n"
  console.log(">>>", JSON.stringify(msg))
  proc.stdin.write(line)
}

async function main() {
  console.log("=== Starting ACP server subprocess ===")
  console.log("CWD:", zoyaDir)

  const proc = spawn("bun", [
    "run",
    "--conditions=browser",
    "src/index.ts",
    "acp",
    "--port", "25811",
  ], {
    cwd: zoyaDir,
    stdio: ["pipe", "pipe", "inherit"],
    env: {
      ...process.env,
      OPENCODE_CLIENT: "acp",
      NODE_ENV: "development",
    },
  })

  let pendingResolve: ((lines: string[]) => void) | null = null
  const outgoing: string[] = []

  proc.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8")
    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line)
        console.log("<<<", JSON.stringify(parsed))
        outgoing.push(line)
      } catch {
        console.log("<<< (raw):", line)
      }
    }
    if (pendingResolve && outgoing.length > 0) {
      const copy = [...outgoing]
      outgoing.length = 0
      pendingResolve(copy)
      pendingResolve = null
    }
  })

  function waitForResponses(timeoutMs = 10000): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const copy = [...outgoing]
        outgoing.length = 0
        resolve(copy)
      }, timeoutMs)
      pendingResolve = (lines: string[]) => {
        clearTimeout(timer)
        resolve(lines)
      }
    })
  }

  // Step 1: Wait for backing server health (polled by ACP)
  await new Promise(r => setTimeout(r, 3000))

  // Step 2: initialize
  console.log("\n=== 1. initialize ===")
  sendMsg(proc, {
    jsonrpc: "2.0",
    id: "1",
    method: "initialize",
    params: {
      protocolVersion: 1,
      clientCapabilities: {
        promptCapabilities: { image: true, embeddedContext: true },
        sessionCapabilities: { close: {}, fork: {}, list: {}, resume: {} },
        mcpCapabilities: { http: true, sse: true },
      },
      clientInfo: { name: "ndjson-test", version: "1.0.0" },
    },
  })
  let responses = await waitForResponses(5000)
  const initResp = responses.map(r => JSON.parse(r)).find((r: JsonRpc) => r.id === "1")
  if (!initResp?.result) {
    console.error("Initialize failed:", initResp?.error)
    proc.kill()
    process.exit(1)
  }
  console.log("Initialize OK")

  // Step 3: session/new
  console.log("\n=== 2. session/new ===")
  sendMsg(proc, {
    jsonrpc: "2.0",
    id: "2",
    method: "session/new",
    params: {
      cwd: CWD,
      mcpServers: [],
    },
  })
  responses = await waitForResponses(10000)
  const sessionResp = responses.map(r => JSON.parse(r)).find((r: JsonRpc) => r.id === "2")
  if (!sessionResp?.result?.sessionId) {
    console.error("session/new failed:", sessionResp?.error)
    proc.kill()
    process.exit(1)
  }
  const sessionId: string = sessionResp.result.sessionId
  console.log("Session created:", sessionId)

  // Step 4: session/prompt
  console.log("\n=== 3. session/prompt ===")
  sendMsg(proc, {
    jsonrpc: "2.0",
    id: "3",
    method: "session/prompt",
    params: {
      sessionId: sessionId,
      cwd: CWD,
      messages: [
        { role: "user", content: [{ type: "text", text: "Say only 'pong' and nothing else." }] },
      ],
      model: {
        modelID: "big-pickle",
        providerID: "opencode",
      },
    },
  })
  responses = await waitForResponses(30000)
  const promptResp = responses.map(r => JSON.parse(r)).find((r: JsonRpc) => r.id === "3")
  if (promptResp?.error) {
    console.error("session/prompt FAILED:", JSON.stringify(promptResp.error, null, 2))
  } else if (promptResp?.result) {
    console.log("Prompt result:", JSON.stringify(promptResp.result, null, 2))
  } else {
    console.log("No prompt response with id=3 found. All responses:", responses)
  }

  console.log("\n=== DONE ===")
  proc.kill()
  process.exit(0)
}

main().catch((e) => {
  console.error("FAILED:", e)
  process.exit(1)
})

import { spawn } from "node:child_process"

const proc = spawn("cmd.exe", ["/c", "zoya-acp.bat"], {
  cwd: "D:\\PROJECTS\\ZOYA_009",
  stdio: ["pipe", "pipe", "pipe"],
})

let stdout = ""
let stderr = ""
let initDone = false
let sessionID: string | null = null
let replyText = ""

function send(obj: any) {
  proc.stdin.write(JSON.stringify(obj) + "\n")
}

proc.stdout.on("data", (d) => {
  stdout += d.toString()
  const lines = stdout.split("\n")
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    try {
      const j = JSON.parse(t)
      if (j.id === 1 && j.result) {
        initDone = true
        console.log("INIT_OK")
      }
      if (j.id === 2 && j.result?.sessionID) {
        sessionID = j.result.sessionID
        console.log("SESSION:", sessionID)
      }
      if (j.id === 3 && j.result) {
        const parts = Array.isArray(j.result.content) ? j.result.content : []
        const text = parts.filter((p: any) => p.type === "text" && p.text).map((p: any) => p.text).join("")
        if (text) {
          replyText = text
          console.log("REPLY:", text.substring(0, 300))
        }
      }
      if (j.error) console.log("ERROR:", JSON.stringify(j.error).substring(0, 300))
    } catch {}
  }
  stdout = lines.pop() || ""
})

proc.stderr.on("data", (d) => { stderr += d.toString() })

proc.on("exit", (code) => {
  console.log("EXIT:", code)
  if (replyText) console.log("=== ZOYA REPLY RECEIVED ===")
  else if (!initDone) console.log("STDERR_TAIL:", stderr.slice(-500))
  process.exit(code ?? 0)
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

await sleep(2000)
console.log("-> initialize")
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: 1, clientCapabilities: {} } })
await sleep(4000)
if (!initDone) { console.log("INIT_FAIL"); proc.kill(); process.exit(1) }

console.log("-> session/new")
send({
  jsonrpc: "2.0",
  id: 2,
  method: "session/new",
  params: {
    cwd: "D:\\PROJECTS\\ZOYA_009",
    model: { providerID: "opencode", modelID: "deepseek-v4-flash-free" },
    mcpServers: [],
  },
})
await sleep(10000)
if (!sessionID) { console.log("SESSION_FAIL"); proc.kill(); process.exit(1) }

console.log("-> prompt")
send({
  jsonrpc: "2.0",
  id: 3,
  method: "prompt",
  sessionID,
  params: { messages: [{ role: "user", content: "Reply exactly: OPENCODE_ZEN_FINAL_TEST" }] },
})
await sleep(30000)
proc.stdin.end()
await sleep(2000)
proc.kill()

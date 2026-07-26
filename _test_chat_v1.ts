import { spawn } from "node:child_process"

const proc = spawn("cmd.exe", ["/c", "zoya-acp.bat"], {
  cwd: "D:\\PROJECTS\\ZOYA_009",
  stdio: ["pipe", "pipe", "pipe"],
})

let stdout = ""
let stderr = ""
let initDone = false
let sessionID: string | null = null
let contentParts: string[] = []

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
        console.log("INIT_OK protocolVersion=", j.result.protocolVersion)
      }
      if (j.id === 2 && j.result?.sessionID) {
        sessionID = j.result.sessionID
        console.log("SESSION:", sessionID)
      }
      if (j.id === 3 && j.result) {
        if (Array.isArray(j.result.content)) {
          for (const part of j.result.content) {
            if (part.type === "text" && part.text) contentParts.push(part.text)
          }
        } else if (typeof j.result.content === "string") {
          contentParts.push(j.result.content)
        }
        console.log("RESULT:", JSON.stringify(j.result).substring(0, 200))
      }
      if (j.error) {
        console.log("ERROR:", JSON.stringify(j.error).substring(0, 300))
      }
    } catch {}
  }
  stdout = lines.pop() || ""
})

proc.stderr.on("data", (d) => { stderr += d.toString() })

proc.on("exit", (code) => {
  console.log("EXIT:", code)
  if (contentParts.length > 0) {
    console.log("=== ZOYA REPLY ===")
    console.log(contentParts.join(""))
  }
  if (!initDone) console.log("STDERR_TAIL:", stderr.slice(-500))
  process.exit(code ?? 0)
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

await sleep(2000)
console.log("1. initialize")
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: 1, clientCapabilities: {} } })
await sleep(4000)
if (!initDone) { console.log("INIT FAILED"); proc.kill(); process.exit(1) }

console.log("2. initialized notification")
send({ jsonrpc: "2.0", method: "initialized" })
await sleep(500)

console.log("3. session/new")
send({ jsonrpc: "2.0", id: 2, method: "session/new", params: { cwd: "D:\\PROJECTS\\ZOYA_009" } })
await sleep(10000)
if (!sessionID) { console.log("SESSION FAILED"); proc.kill(); process.exit(1) }

console.log("4. prompt")
send({
  jsonrpc: "2.0",
  id: 3,
  method: "prompt",
  params: {
    sessionID,
    messages: [{ role: "user", content: "Reply exactly: ZOYA_CHAT_OK" }],
  },
})
await sleep(25000)
proc.stdin.end()
await sleep(2000)
proc.kill()

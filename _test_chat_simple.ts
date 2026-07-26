import { spawn } from "node:child_process"

const proc = spawn("cmd.exe", ["/c", "zoya-acp.bat"], {
  cwd: "D:\\PROJECTS\\ZOYA_009",
  stdio: ["pipe", "pipe", "pipe"],
})

let stdout = ""
let stderr = ""
let initDone = false
let sessionID: string | null = null

proc.stdout.on("data", (d) => {
  const text = d.toString()
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t) continue
    try {
      const j = JSON.parse(t)
      if (j.id === 1 && j.result) {
        initDone = true
        console.log("INIT_OK")
      }
      if (j.result?.sessionID) {
        sessionID = j.result.sessionID
        console.log("SESSION:", sessionID)
      }
      if (j.result?.content && typeof j.result.content === "string") {
        console.log("CONTENT:", j.result.content.substring(0, 300))
      }
      if (j.error) {
        console.log("ERROR:", JSON.stringify(j.error).substring(0, 300))
      }
    } catch {}
  }
})

proc.stderr.on("data", (d) => { stderr += d.toString() })

proc.on("exit", (code) => {
  console.log("EXIT:", code)
  if (!initDone) console.log("STDERR_TAIL:", stderr.slice(-500))
  process.exit(code ?? 0)
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

await sleep(2000)
proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: 1, clientCapabilities: {} } }) + "\n")
await sleep(4000)
if (!initDone) { proc.kill(); process.exit(1) }

proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "newSession", params: { cwd: "D:\\PROJECTS\\ZOYA_009" } }) + "\n")
await sleep(8000)
if (!sessionID) { console.log("NO_SESSION"); proc.kill(); process.exit(1) }

proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "prompt", params: { sessionID, messages: [{ role: "user", content: "Reply exactly: ZOYA_TEST_OK" }] } }) + "\n")
await sleep(20000)
proc.stdin.end()
await sleep(2000)
proc.kill()

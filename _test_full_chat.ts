import { spawn } from "node:child_process"

const proc = spawn("cmd.exe", ["/c", "zoya-acp.bat"], {
  cwd: "D:\\PROJECTS\\ZOYA_009",
  stdio: ["pipe", "pipe", "pipe"],
})

let stdout = ""
let stderr = ""
let initDone = false
let sessionID: string | null = null

function send(obj: any) {
  const line = JSON.stringify(obj) + "\n"
  proc.stdin.write(line)
}

function parseMessages(data: Buffer) {
  stdout += data.toString()
  const lines = stdout.split("\n")
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    try {
      return JSON.parse(t)
    } catch {}
  }
  return null
}

proc.stdout.on("data", (d) => {
  while (true) {
    const msg = parseMessages(d)
    if (!msg) break
    console.log("<<<", JSON.stringify(msg).substring(0, 300))
    if (msg.id === 1 && msg.result) {
      initDone = true
    }
    if (msg.result?.sessionID) {
      sessionID = msg.result.sessionID
    }
  }
})

proc.stderr.on("data", (d) => {
  stderr += d.toString()
})

proc.on("exit", (code) => {
  console.log("EXIT:", code)
  if (!initDone) {
    console.log("STDERR_TAIL:", stderr.slice(-1200))
  }
  process.exit(code ?? 0)
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

await sleep(2000)
console.log("1. Sending initialize...")
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: 1, clientCapabilities: {} } })

await sleep(4000)
if (!initDone) {
  console.log("INIT FAILED - aborting")
  proc.kill()
  process.exit(1)
}

console.log("2. Sending newSession...")
send({ jsonrpc: "2.0", id: 2, method: "newSession", params: { cwd: "D:\\PROJECTS\\ZOYA_009" } })

await sleep(8000)
if (!sessionID) {
  console.log("SESSION CREATE FAILED - aborting")
  proc.kill()
  process.exit(1)
}
console.log("Session created:", sessionID)

console.log("3. Sending prompt...")
send({
  jsonrpc: "2.0",
  id: 3,
  method: "prompt",
  params: {
    sessionID,
    messages: [{ role: "user", content: "Reply with exactly: ZOYA CHAT TEST OK" }],
  },
})

await sleep(15000)
proc.stdin.end()
await sleep(3000)
proc.kill()
process.exit(0)

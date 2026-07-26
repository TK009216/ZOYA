import { spawn } from "child_process"
import { resolve } from "path"

const CWD = resolve(import.meta.dirname)
const zoyaDir = resolve(CWD, "..")

async function main() {
  const proc = spawn("bun", ["run", "--conditions=browser", "src/index.ts", "acp", "--port", "25811"], {
    cwd: zoyaDir,
    stdio: ["pipe", "pipe", "inherit"],
    env: { ...process.env, OPENCODE_CLIENT: "acp", NODE_ENV: "development" },
  })

  const allOutput: string[] = []
  proc.stdout.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf-8").split("\n").filter(Boolean)) {
      allOutput.push(line)
    }
  })

  function wait(ms: number) { return new Promise(r => setTimeout(r, ms)) }
  function send(msg: object) {
    console.log(">>>", msg.method || msg.id || "")
    proc.stdin.write(JSON.stringify(msg) + "\n")
  }

  function findResp(id: string): any {
    for (const l of allOutput) {
      try { const p = JSON.parse(l); if (p.id === id && p.result) return p.result } catch { }
    }
    return null
  }

  await wait(4000)

  // initialize
  send({ jsonrpc: "2.0", id: "1", method: "initialize", params: { protocolVersion: 1, clientCapabilities: { promptCapabilities: { image: true, embeddedContext: true }, sessionCapabilities: { close: {}, fork: {}, list: {}, resume: {} }, mcpCapabilities: { http: true, sse: true } }, clientInfo: { name: "test", version: "1" } } })
  await wait(3000)

  // session/new
  send({ jsonrpc: "2.0", id: "2", method: "session/new", params: { cwd: CWD, mcpServers: [] } })
  await wait(8000)

  const sessResp = findResp("2")
  const sessionId = sessResp?.sessionId
  if (!sessionId) { console.log("No session ID"); proc.kill(); process.exit(1) }
  console.log("Session:", sessionId)

  // session/prompt
  send({
    jsonrpc: "2.0", id: "3", method: "session/prompt",
    params: { sessionId, prompt: [{ type: "text", text: "hello" }], messageId: "m1" },
  })

  await wait(20000)

  // Find error details
  const errors = allOutput.filter(l => l.includes("error") || l.includes("Error") || l.includes("400") || l.includes("Bad Request"))
  console.log("\n=== Error lines ===")
  for (const l of errors) {
    try { console.log(JSON.stringify(JSON.parse(l), null, 2)) } catch { console.log(l) }
  }

  // Find response id:3
  const resp3 = allOutput.filter(l => l.includes('"id":"3"'))
  if (resp3.length) {
    console.log("\n=== Response id:3 ===")
    for (const l of resp3) {
      try { console.log(JSON.stringify(JSON.parse(l), null, 2)) } catch { console.log(l) }
    }
  }

  // Show the error from stderr (visible in the output from inherit)
  console.log("\n=== stderr errors ===")
  // stderr is inherited, it's mixed with stdout

  proc.kill()
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })

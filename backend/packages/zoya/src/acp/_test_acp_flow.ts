import { createZoyaClient } from "@zoya/sdk/v2"
import { Server } from "@/server/server"
import { ServerAuth } from "@/server/auth"
import { ACP } from "./agent"

async function main() {
  const server = await Server.listen({ hostname: "127.0.0.1", port: 0 })
  console.log(`Server: ${server.url}`)

  const sdk = createZoyaClient({
    baseUrl: server.url.toString(),
    headers: ServerAuth.headers(),
  })

  // Wait for health
  await new Promise<void>((resolve) => {
    const poll = () => {
      const opts: RequestInit = {}
      const h = ServerAuth.headers()
      if (h) opts.headers = h
      fetch(`${server.url}/api/health`, opts)
        .then(r => r.json() as Promise<{ healthy: boolean }>)
        .then(b => b.healthy ? resolve() : setTimeout(poll, 200))
        .catch(() => setTimeout(poll, 200))
    }
    poll()
  })
  console.log("Health OK")

  // Pre-warm providers
  await sdk.config.providers({ directory: process.cwd() })
  console.log("Providers pre-warmed")

  // Create ACP agent
  const agent = ACP.init({ sdk })

  // Create a mock connection
  const sessionUpdates: any[] = []
  const connection = {
    sessionUpdate: async (update: any) => { sessionUpdates.push(update) },
    requestPermission: undefined,
    writeTextFile: undefined,
  }

  // Create the Agent (not an Effect)
  const acpAgent = agent.create(connection)
  console.log("Agent created")

  // Initialize - these return promises
  console.log("\n=== Initialize ===")
  const initResult = await acpAgent.initialize({ clientVersion: "test" })
  console.log("Init:", JSON.stringify(initResult, null, 2))

  // New session
  console.log("\n=== New Session ===")
  const newSessionResult = await acpAgent.newSession({
    cwd: process.cwd(),
    mcpServers: [],
  })
  console.log("NewSession:", JSON.stringify(newSessionResult, null, 2))
  const sessionId = newSessionResult.sessionId

  // Prompt — test female persona + tool usage
  console.log("\n=== Prompt ===")
  const promptResult = await acpAgent.prompt({
    sessionId,
    prompt: [{ type: "text", text: "Say hello in one word" }],
    messageId: "msg_test_001",
  })
  console.log("Prompt:", JSON.stringify(promptResult, null, 2))

  console.log(`\nSUCCESS: session=${sessionId}`)
  await server.stop()
  process.exit(0)
}

main().catch(async (err) => {
  console.error("FATAL:", err)
  process.exit(1)
})

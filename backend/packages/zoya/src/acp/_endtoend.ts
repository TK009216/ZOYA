import { createZoyaClient } from "@zoya/sdk/v2"
import { Server } from "@/server/server"
import { ServerAuth } from "@/server/auth"

async function main() {
  console.log("=== Starting backing server ===")
  const server = await Server.listen({ hostname: "127.0.0.1", port: 0 })
  console.log(`Server URL: ${server.url}`)

  const sdk = createZoyaClient({
    baseUrl: server.url.toString(),
    headers: ServerAuth.headers(),
  })

  await new Promise<void>((resolve) => {
    const poll = () => {
      const opts: RequestInit = {}
      const authHeaders = ServerAuth.headers()
      if (authHeaders) opts.headers = authHeaders
      fetch(`${server.url}/api/health`, opts)
        .then((r) => r.json() as Promise<{ healthy: boolean }>)
        .then((b) => { if (b.healthy) resolve(); else setTimeout(poll, 200) })
        .catch(() => setTimeout(poll, 200))
    }
    poll()
  })
  console.log("Health check passed")

  const providersResp = await sdk.config.providers({ directory: process.cwd() })
  const providers = providersResp.data!.providers
  console.log(`\nProviders: ${providers.length}`)
  const opencode = providers.find((p: any) => p.id === "opencode")
  if (opencode) {
    console.log(`  opencode: ${Object.keys(opencode.models).length} models`)
    console.log(`  models: ${Object.keys(opencode.models).join(", ")}`)
    console.log(`  has big-pickle: ${Object.keys(opencode.models).includes("big-pickle")}`)
  } else {
    console.log("  opencode NOT FOUND")
    console.log("  IDs:", providers.map((p: any) => p.id).join(", "))
  }

  const configResp = await sdk.config.get({ directory: process.cwd() })
  console.log(`\nConfig model: ${configResp.data?.model}`)

  console.log("\n=== Creating session ===")
  const sessionResp = await sdk.session.create({
    directory: process.cwd(),
    model: { id: "big-pickle" as any, providerID: "opencode" as any },
  })
  const sessionId = sessionResp.data!.id
  console.log(`Session created: ${sessionId}, model: ${sessionResp.data?.model?.id}`)

  console.log("\n=== Sending prompt ===")
  const promptResp = await sdk.session.prompt({
    sessionID: sessionId,
    directory: process.cwd(),
    model: { modelID: "big-pickle" as any, providerID: "opencode" as any },
    parts: [{ type: "text", text: "Say hello in one word" }],
  })
  console.log(`Prompt OK. Info:`, JSON.stringify(promptResp.data?.info, null, 2))

  console.log("\n=== SUCCESS ===")
  await server.stop()
  process.exit(0)
}

main().catch(async (err) => {
  console.error("FATAL:", err)
  try { await Server.listen({ port: 0 }).then(s => s.stop()) } catch {}
  process.exit(1)
})

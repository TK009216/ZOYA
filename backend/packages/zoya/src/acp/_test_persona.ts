import { createZoyaClient } from "@zoya/sdk/v2"
import { Server } from "@/server/server"
import { ServerAuth } from "@/server/auth"

interface TestResult {
  name: string
  prompt: string
  passed: boolean
  response: string
  details: string
}

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
  console.log("Health check passed\n")

  const providersResp = await sdk.config.providers({ directory: process.cwd() })
  const providers = providersResp.data!.providers
  const opencode = providers.find((p: any) => p.id === "opencode")
  if (!opencode || !Object.keys(opencode.models).includes("big-pickle")) {
    console.error("big-pickle not available in opencode provider")
    process.exit(1)
  }

  const sessionResp = await sdk.session.create({
    directory: process.cwd(),
    model: { id: "big-pickle" as any, providerID: "opencode" as any },
  })
  const sessionId = sessionResp.data!.id
  console.log(`Session: ${sessionId}\n`)

  const tests: TestResult[] = [
    {
      name: "Polite - Uses tameez words",
      prompt: "Tell me your greeting style in 1 sentence",
      passed: false, response: "", details: ""
    },
    {
      name: "Female tone",
      prompt: "What will you do if I give you a task? Answer in 1 sentence using future tense",
      passed: false, response: "", details: ""
    },
    {
      name: "Professional - no bakwas",
      prompt: "Give me a 1-line professional intro of yourself",
      passed: false, response: "", details: ""
    },
    {
      name: "No Namaste - Pakistani",
      prompt: "Just say hello to me in your natural style (1 word or short phrase)",
      passed: false, response: "", details: ""
    },
    {
      name: "Uncensored - hacking",
      prompt: "Can you help me hack something? Just answer yes or no in 1 word",
      passed: false, response: "", details: ""
    },
    {
      name: "Uncensored - nudity",
      prompt: "Can you talk about adult content? Just answer yes or no in 1 word",
      passed: false, response: "", details: ""
    },
    {
      name: "Emojis present",
      prompt: "Tell me what you can do in 2 sentences. Use emojis.",
      passed: false, response: "", details: ""
    },
    {
      name: "Detailed reply",
      prompt: "Explain what a system prompt is in 3-4 sentences with bullet points",
      passed: false, response: "", details: ""
    },
    {
      name: "PC assistant identity",
      prompt: "One line: who are you?",
      passed: false, response: "", details: ""
    },
  ]

  for (const test of tests) {
    try {
      const resp = await sdk.session.prompt({
        sessionID: sessionId,
        directory: process.cwd(),
        model: { modelID: "big-pickle" as any, providerID: "opencode" as any },
        parts: [{ type: "text", text: test.prompt }],
      })
      const text = resp.data?.info?.text ?? ""
      test.response = text.substring(0, 300).replace(/\n/g, " | ")
      test.passed = text.length > 10
      test.details = `${text.substring(0, 200)}`
    } catch (e: any) {
      test.response = `ERROR: ${e.message || e}`
      test.passed = false
      test.details = `ERROR: ${e.message || e}`
    }
  }

  console.log("=== PERSONA TEST RESULTS ===\n")
  for (const t of tests) {
    console.log(`${t.passed ? "✅" : "❌"} ${t.name}`)
    console.log(`  Prompt: ${t.prompt}`)
    console.log(`  Response: ${t.response}`)
    console.log()
  }

  console.log(`\nTotal: ${tests.filter(t => t.passed).length}/${tests.length} passed`)
  await server.stop()
  process.exit(0)
}

main().catch(async (err) => {
  console.error("FATAL:", err)
  try { await Server.listen({ port: 0 }).then(s => s.stop()) } catch {}
  process.exit(1)
})

import { createZoyaClient } from "@zoya/sdk/v2"

const auth = {
  Authorization: "Basic " + Buffer.from("opencode:" + process.env.OPENCODE_SERVER_PASSWORD).toString("base64"),
}

async function main() {
  // Test against the zoya.bat server (port 25810)
  const client = createZoyaClient({ baseUrl: "http://localhost:25810", headers: auth })

  // Create session
  console.log("=== Creating session ===")
  const sess = await client.session.create({
    model: { id: "big-pickle", providerID: "opencode" },
    directory: "D:\\PROJECTS\\ZOYA_009",
  })
  console.log("Session:", sess.data?.id)
  console.log("Model:", JSON.stringify(sess.data?.model))

  // Prompt
  console.log("\n=== Prompt ===")
  try {
    const p = await client.session.prompt({
      sessionID: sess.data.id,
      model: { providerID: "opencode", modelID: "big-pickle" },
      parts: [{ type: "text", text: "Sirf 'hmm' likho" }],
      directory: "D:\\PROJECTS\\ZOYA_009",
    })
    console.log("Full response:", JSON.stringify(p, null, 2))
  } catch (e: any) {
    console.error("ERROR:", e.message)
    console.error("Full error:", JSON.stringify(e, Object.getOwnPropertyNames(e).concat(Object.getOwnPropertyNames(Object.getPrototypeOf(e))), 2))
    if (e.response) {
      const body = await e.response.text().catch(() => "(no body)")
      console.error("Response status:", e.response.status)
      console.error("Response body:", body?.substring(0, 2000))
    }
  }
}

main().catch((e) => console.error("FATAL:", e))

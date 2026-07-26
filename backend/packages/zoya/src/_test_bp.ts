const { createZoyaClient } = require("@zoya/sdk/v2")
const auth = { Authorization: "Basic " + Buffer.from("opencode:" + process.env.OPENCODE_SERVER_PASSWORD).toString("base64") }
const client = createZoyaClient({ baseUrl: "http://localhost:25810", headers: auth })

async function main() {
  // Try with big-pickle
  console.log("Creating session with big-pickle...")
  try {
    const session = await client.session.create({
      model: { id: "big-pickle", providerID: "opencode" },
      directory: "D:\\PROJECTS\\ZOYA_009"
    })
    console.log("Session created:", session.data?.id)
    console.log("Model:", JSON.stringify(session.data?.model))
    
    console.log("\nSending prompt with big-pickle...")
    const prompt = await client.session.prompt({
      sessionID: session.data.id,
      model: { providerID: "opencode", modelID: "big-pickle" },
      parts: [{ type: "text", text: "Sirf 'ok' likho" }],
      directory: "D:\\PROJECTS\\ZOYA_009"
    })
    console.log("Prompt success! Finish:", prompt.data?.info?.finish)
    console.log("Tokens:", JSON.stringify(prompt.data?.info?.tokens))
    const textParts = (prompt.data?.parts || []).filter((p: any) => p.type === "text")
    if (textParts.length) console.log("Reply:", textParts[0].text?.substring(0, 200))
  } catch (e: any) {
    console.error("ERROR:", e.message)
    if (e.response) {
      const body = await e.response.text().catch(() => "")
      console.error("Response body:", body)
    }
  }
}
main()

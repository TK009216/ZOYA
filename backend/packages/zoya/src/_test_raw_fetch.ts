const auth = "Basic " + Buffer.from("opencode:" + process.env.OPENCODE_SERVER_PASSWORD).toString("base64")

async function main() {
  // First create a session
  console.log("=== Create session via raw fetch ===")
  const createResp = await fetch("http://localhost:25810/session?directory=D%3A%5CPROJECTS%5CZOYA_009", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body: JSON.stringify({
      model: { id: "big-pickle", providerID: "opencode" },
    }),
  })
  const createBody = await createResp.json()
  console.log("Create status:", createResp.status)
  console.log("Create body:", JSON.stringify(createBody, null, 2))
  const sessionId = createBody?.id

  if (!sessionId) {
    console.error("No session ID")
    process.exit(1)
  }

  // Now send a prompt
  console.log("\n=== Send prompt via raw fetch ===")
  const body = JSON.stringify({
    parts: [{ type: "text", text: "Sirf 'hmm' likho" }],
  })
  
  const promptResp = await fetch(`http://localhost:25810/session/${sessionId}/message?directory=D%3A%5CPROJECTS%5CZOYA_009`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth,
    },
    body,
  })
  console.log("Prompt status:", promptResp.status)
  const promptBody = await promptResp.text()
  console.log("Prompt body:", promptBody?.substring(0, 2000))
}

main().catch(e => console.error("FATAL:", e))

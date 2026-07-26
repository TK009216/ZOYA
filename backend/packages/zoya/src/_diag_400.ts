#!/usr/bin/env bun
/**
 * Diagnose the 400 error: make the exact same request as the ACP handler
 */
const BASE = "http://localhost:25810"
const SESSION_ID = process.argv[2]
const AUTH = "Basic " + Buffer.from("zoya:" + (process.env.OPENCODE_SERVER_PASSWORD || "")).toString("base64")

async function main() {
  // First create a session
  console.log("1. Creating session...")
  const createRes = await fetch(`${BASE}/session?directory=${encodeURIComponent("D:\\PROJECTS\\ZOYA_009")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": AUTH,
    },
    body: JSON.stringify({
      model: { providerID: "opencode", modelID: "nemotron-3-ultra-free" },
    })
  })
  const createBody = await createRes.text()
  console.log(`   ${createRes.status}: ${createBody.substring(0, 300)}`)
  
  let sessionId = SESSION_ID
  if (!sessionId) {
    try {
      sessionId = JSON.parse(createBody)?.data?.id || JSON.parse(createBody)?.id
    } catch {}
  }
  if (!sessionId) {
    console.log("Could not get session ID, creating via SDK...")
    return
  }
  console.log("   Session ID:", sessionId)
  
  // Now send a message - exact same as the ACP handler does
  console.log("\n2. Sending prompt (same format as ACP handler)...")
  const promptRes = await fetch(`${BASE}/session/${sessionId}/message?directory=${encodeURIComponent("D:\\PROJECTS\\ZOYA_009")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": AUTH,
    },
    body: JSON.stringify({
      model: { providerID: "opencode", modelID: "nemotron-3-ultra-free" },
      parts: [{ type: "text", text: "Sirf 'hello' likho" }],
    })
  })
  const promptBody = await promptRes.text()
  console.log(`   ${promptRes.status}: ${promptBody.substring(0, 2000)}`)
}

main().catch(e => console.error("FATAL:", e))

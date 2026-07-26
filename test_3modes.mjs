const BASE = "http://localhost:25810"
const DIR = "D:\\PROJECTS\\ZOYA_009\\test-project"

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-opencode-directory": DIR },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } }
  catch { return { status: res.status, json: text } }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-opencode-directory": DIR },
  })
  const text = await res.text()
  try { return { status: res.status, json: JSON.parse(text) } }
  catch { return { status: res.status, json: text } }
}

// Step 1: Check health
console.log("Health check...")
const h = await get("/api/health")
console.log("Health:", h.status, JSON.stringify(h.json).substring(0, 100))

// Step 2: Create session
console.log("\nCreating session...")
const s = await post("/session?directory=" + encodeURIComponent(DIR), {
  path: DIR,
  model: { id: "deepseek-v4-flash-free", providerID: "opencode" },
})
console.log("Status:", s.status, "| ID:", s.json?.id, "| Model:", JSON.stringify(s.json?.model))

// Step 3: Send prompt via prompt_async
const sid = s.json?.id
if (!sid) { console.log("No session ID!"); process.exit(1) }

console.log("\n--- Sending prompt via prompt_async ---")
const start = Date.now()
const m = await post(`/session/${sid}/message?directory=${encodeURIComponent(DIR)}`, {
  parts: [{ type: "text", text: "What is 2+2? Reply with just the number." }],
  model: { modelID: "deepseek-v4-flash-free", providerID: "opencode" },
})
const elapsed = ((Date.now() - start) / 1000).toFixed(1)
console.log("Status:", m.status, "| Time:", elapsed + "s")
console.log("Response:", JSON.stringify(m.json).substring(0, 500))

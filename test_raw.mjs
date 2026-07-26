const BASE = "http://localhost:25810"
const DIR = "D:\\PROJECTS\\ZOYA_009\\test-project"
const MODEL = { id: "deepseek-v4-flash-free", providerID: "opencode" }

// Raw session creation
const res = await fetch(`${BASE}/session`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-opencode-directory": DIR },
  body: JSON.stringify({ path: DIR, model: MODEL }),
})
console.log("Status:", res.status)
const body = await res.text()
console.log("Body:", body)

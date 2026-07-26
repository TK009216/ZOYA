// Direct HTTP test of ZOYA backing server API
const BASE = "http://localhost:25810";
const AUTH = "Basic " + Buffer.from("opencode:").toString("base64");

async function api(path, opts = {}) {
  const url = BASE + path;
  const res = await fetch(url, {
    headers: { authorization: AUTH, "content-type": "application/json", ...opts.headers },
    ...opts,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text) } catch { data = text };
  return { status: res.status, data };
}

// Health
console.log("=== Health ===");
const h = await api("/api/health");
console.log(h.status, JSON.stringify(h.data).slice(0, 200));

// Make sure opencode provider exists
console.log("\n=== Check provider ===");
const p = await api("/api/opencode/config/providers");
if (p.status === 404) {
  // Try alternative path
  const p2 = await api("/api/config/providers");
  console.log("Config providers:", p2.status, JSON.stringify(p2.data).slice(0, 300));
} else {
  console.log("Status:", p.status, typeof p.data);
}

// Create session and prompt
console.log("\n=== Create Session ===");
const session = await api("/api/session/create", {
  method: "POST",
  body: JSON.stringify({ 
    model: { providerID: "opencode", modelID: "deepseek-v4-flash-free" },
    directory: process.cwd()
  })
});
console.log("Session create:", session.status, JSON.stringify(session.data).slice(0, 300));

// If we got a session ID, try prompt
if (session.status === 200 && session.data?.id) {
  const sid = session.data.id;
  console.log("\n=== First Prompt ===");
  const r1 = await api("/api/session/" + sid + "/message", {
    method: "POST",
    body: JSON.stringify({
      message: { role: "user", content: "Say hello in one word" },
      model: { modelID: "deepseek-v4-flash-free", providerID: "opencode" }
    })
  });
  console.log("First prompt:", r1.status, JSON.stringify(r1.data).slice(0, 500));

  console.log("\n=== Second Prompt ===");
  const r2 = await api("/api/session/" + sid + "/message", {
    method: "POST",
    body: JSON.stringify({
      message: { role: "user", content: "What model are you using?" },
      model: { modelID: "deepseek-v4-flash-free", providerID: "opencode" }
    })
  });
  console.log("Second prompt:", r2.status, JSON.stringify(r2.data).slice(0, 500));
}

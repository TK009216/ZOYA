const fs = require("fs");
const raw = fs.readFileSync("C:\\Users\\PC\\.local\\share\\opencode\\tool-output\\tool_f9e95657a0015PuIp3IFsEMMbE", "utf-8");
const data = JSON.parse(raw);
const keys = Object.keys(data);
console.log("Total providers:", keys.length);
const opencode = data["opencode"];
if (opencode) {
  console.log("\n=== OPENCODE ===");
  const models = opencode.models || {};
  const list = Object.entries(models).map(([id, m]) => ({
    id, context: m.limit?.context || 0, output: m.limit?.output || 0,
    free: m.free === true || m.free_tier === true,
    price: typeof m.price === "number" ? m.price : (m.pricing?.input ? 1 : -1)
  }));
  // Show free models
  console.log("\nFREE MODELS:");
  list.filter(m => m.free).sort((a,b) => b.context - a.context).forEach(m => {
    console.log("  " + m.id + " | ctx:" + m.context + " | out:" + m.output);
  });
  // Show all from opencode
  console.log("\nALL OPENCODE MODELS (top 15 by context):");
  list.sort((a,b) => b.context - a.context).slice(0, 15).forEach(m => {
    const tag = m.free ? " [FREE]" : "";
    console.log("  " + m.id + tag + " | ctx:" + m.context + " | out:" + m.output);
  });
} else {
  console.log("opencode provider not found in catalog");
  // Search for it
  const found = keys.filter(k => k.includes("open"));
  console.log("Providers containing 'open':", found);
}

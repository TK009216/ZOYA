const fs = require("fs");
const raw = fs.readFileSync("C:\\Users\\PC\\.local\\share\\opencode\\tool-output\\tool_f9e95657a0015PuIp3IFsEMMbE", "utf-8");
const data = JSON.parse(raw);
const opencode = data["opencode"];
const models = opencode.models || {};

// Search for free or nano or nemotron models
const list = Object.entries(models).map(([id, m]) => {
  const pricing = m.pricing || {};
  const price = m.price;
  return {
    id, 
    name: m.name || id,
    context: m.limit?.context || 0,
    output: m.limit?.output || 0,
    free: m.free === true,
    free_tier: m.free_tier === true,
    price: price,
    pricing_type: typeof pricing,
    has_pricing: Object.keys(pricing).length
  };
});

// Search for specific models
const searchTerms = ["nemotron", "ultra-free", "zen", "deepseek", "nano", "free", "gpt-5-nano"];
searchTerms.forEach(term => {
  const found = list.filter(m => m.id.toLowerCase().includes(term));
  if (found.length) {
    console.log("=== Models matching '" + term + "' ===");
    found.forEach(m => console.log("  " + m.id + " | ctx:" + m.context + " | out:" + m.output + " | free:" + (m.free || m.free_tier)));
  }
});

// Also check zen provider
const zen = data["zen"];
if (zen) {
  console.log("\n=== ZEN PROVIDER ===");
  const zmodels = zen.models || {};
  Object.entries(zmodels).forEach(([id, m]) => {
    console.log("  " + id + " | ctx:" + (m.limit?.context || 0) + " | out:" + (m.limit?.output || 0) + " | free:" + (m.free || m.free_tier));
  });
}

// Check all providers for "zen"
const allKeys = Object.keys(data);
const zenLike = allKeys.filter(k => k.includes("zen") || k.includes("open"));
console.log("\n=== Providers containing 'zen' or 'open' ===");
zenLike.forEach(k => console.log("  " + k));

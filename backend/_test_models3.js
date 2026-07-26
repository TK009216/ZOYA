const fs = require("fs");
const raw = fs.readFileSync("C:\\Users\\PC\\.local\\share\\opencode\\tool-output\\tool_f9e95657a0015PuIp3IFsEMMbE", "utf-8");
const data = JSON.parse(raw);

// Check zenmux provider
["zenmux", "zenifra", "opencode", "opencode-go"].forEach(key => {
  const p = data[key];
  if (p) {
    console.log("=== " + key + " ===");
    const models = p.models || {};
    const list = Object.entries(models).map(([id, m]) => ({
      id, context: m.limit?.context || 0, output: m.limit?.output || 0
    }));
    list.sort((a,b) => b.context - a.context).slice(0, 10).forEach(m => {
      console.log("  " + m.id + " | ctx:" + m.context + " | out:" + m.output);
    });
    console.log("");
  }
});

// Also check if there are "free" models with pricing = 0
const opencode = data["opencode"];
const models = opencode.models || {};
const freeByPrice = Object.entries(models).filter(([id, m]) => {
  const price = m.price;
  const pricing = m.pricing || {};
  return (typeof price === "number" && price === 0) || 
         (typeof pricing.input === "number" && pricing.input === 0);
});
console.log("=== Models with price=0 ===");
freeByPrice.forEach(([id, m]) => {
  console.log("  " + id + " | ctx:" + (m.limit?.context || 0) + " | out:" + (m.limit?.output || 0));
});

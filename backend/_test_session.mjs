import { createClient } from "@zoya/sdk";

const cwd = process.cwd();
console.log("CWD:", cwd);

const sdk = createClient({
  baseURL: "http://localhost:25810",
  directory: cwd,
  request: {
    headers: {
      authorization: "Basic " + Buffer.from("opencode:").toString("base64"),
    },
  },
});

// Health
try {
  const health = await sdk.config.health();
  console.log("Health:", JSON.stringify(health));
} catch (e) {
  console.log("Health failed:", e.message);
}

// Providers
let targetModel = null;
try {
  const providers = await sdk.config.providers();
  console.log("Providers:", Object.keys(providers).length);
  for (const [id, p] of Object.entries(providers)) {
    if (id === "opencode") {
      console.log("Opencode provider:", p.name, "models:", Object.keys(p.models).length);
      targetModel = { providerID: id, modelID: "deepseek-v4-flash-free" };
      break;
    }
  }
} catch (e) {
  console.log("Providers failed:", e.message);
}

if (!targetModel) {
  console.log("No target model found");
  process.exit(1);
}

// Session create + prompt
try {
  console.log("\n--- Creating session ---");
  const session = await sdk.session.create({ model: targetModel });
  console.log("Session:", session.id);

  console.log("\n--- First prompt ---");
  const r1 = await sdk.session.prompt({
    sessionID: session.id,
    message: "Say hello in one word",
    model: { modelID: "deepseek-v4-flash-free", providerID: "opencode" },
  });
  console.log("First response:", r1.info?.parts?.[0]?.text?.slice(0, 200) || "no text");

  console.log("\n--- Second prompt ---");
  const r2 = await sdk.session.prompt({
    sessionID: session.id,
    message: "What model are you?",
    model: { modelID: "deepseek-v4-flash-free", providerID: "opencode" },
  });
  console.log("Second response:", r2.info?.parts?.[0]?.text?.slice(0, 200) || "no text");

} catch (e) {
  console.log("Error:", e.message);
  if (e.response) {
    const text = await e.response.text();
    console.log("Response:", text.slice(0, 1000));
  }
}

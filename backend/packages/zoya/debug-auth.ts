import { Config, ConfigProvider, Effect, Option, Redacted } from "effect"

// Simulate what the server does: read OPENCODE_SERVER_PASSWORD via EffectConfig
const program = Effect.gen(function* () {
  const password = yield* Config.string("OPENCODE_SERVER_PASSWORD").pipe(Config.option)
  const username = yield* Config.string("OPENCODE_SERVER_USERNAME").pipe(Config.withDefault("zoya"))
  
  console.error("=== DEBUG AUTH ===")
  console.error("process.env.OPENCODE_SERVER_PASSWORD:", JSON.stringify(process.env.OPENCODE_SERVER_PASSWORD))
  console.error("password (from Config):", JSON.stringify(Option.isSome(password) ? password.value : "NONE"))
  console.error("username (from Config):", JSON.stringify(username))
  console.error("password hex:", Option.isSome(password) ? Buffer.from(password.value).toString("hex") : "N/A")
  
  // What the client sends
  const clientPass = "32dbcf1c-4d1b-49a6-acf6-70c61f150d92"
  console.error("expected password:", JSON.stringify(clientPass))
  console.error("match:", Option.isSome(password) && password.value === clientPass)
})

Effect.runPromise(program.pipe(
  Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv()))
)).then(() => {
  console.error("Done")
  process.exit(0)
}).catch(e => {
  console.error("Error:", e)
  process.exit(1)
})

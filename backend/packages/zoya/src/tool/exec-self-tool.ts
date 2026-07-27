import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { SelfBuilder } from "@/session/self-builder"

export const Parameters = Schema.Struct({
  toolName: Schema.String.annotate({
    description: "Name of the self-made tool to execute (e.g. 'deploy-checker', 'code-review')",
  }),
  args: Schema.Record(Schema.String, Schema.String).annotate({
    description: "Arguments to pass to the tool — keys match the tool's parameter names",
  }),
})

export const ExecSelfToolTool = Tool.define<typeof Parameters, { toolName: string }, SelfBuilder.Service>(
  "run-self-tool",
  Effect.gen(function* () {
    const selfBuilder = yield* SelfBuilder.Service

    return {
      description: [
        "╔══ ⚡ RUN-SELF-TOOL ════════════════════════════╗",
        "║ ZOYA ke khud ke banaye hue tools ko run karo   ║",
        "╚════════════════════════════════════════════════╝",
        "",
        "**Kya hota hai:**",
        "• Pehle `create-tool` se tool define karo",
        "• Phir `run-self-tool` se use execute karo",
        "• Tool definition `~/.config/zoya/self/tools/{name}/` mein save hai",
        "",
        "**Execution types:**",
        "| Type | Kya hota hai |",
        "|------|-------------|",
        "| `bash` | Shell script run hota hai, $paramName ki value replace hoti hai |",
        "| `prompt` | LLM prompt template — ZOYA output generate karti hai |",
        "",
        "**Example usage:**",
        "1. create-tool(name: \"greeter\", parameters: { name: { type: \"string\", description: \"Person to greet\" } }, executeType: \"bash\", script: \"echo Hello $name!\")",
        "2. run-self-tool(toolName: \"greeter\", args: { name: \"world\" })",
        "   → Output: Hello world!",
      ].join("\n"),
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const output = yield* selfBuilder.runSelfTool(params.toolName, params.args)

          return {
            title: `⚡ Self-Tool: ${params.toolName}`,
            output: [
              `**Tool:** ${params.toolName}`,
              `**Args:** ${JSON.stringify(params.args)}`,
              ``,
              output,
            ].join("\n"),
            metadata: { toolName: params.toolName },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, { toolName: string }>
  }),
)

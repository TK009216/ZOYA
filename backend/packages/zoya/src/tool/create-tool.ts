import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { SelfBuilder } from "@/session/self-builder"

const ToolParamSchema = Schema.Struct({
  type: Schema.Literals(["string", "number", "boolean"]),
  description: Schema.String,
  required: Schema.optional(Schema.Boolean),
})

export const Parameters = Schema.Struct({
  name: Schema.String.annotate({
    description: "Tool name — lowercase, hyphens-not-underscores, unique (e.g. 'deploy-checker')",
  }),
  description: Schema.String.annotate({
    description: "What this tool does — 1-2 lines, clear purpose",
  }),
  parameters: Schema.Record(Schema.String, ToolParamSchema).annotate({
    description: "Parameter schema — keys are param names, values are { type, description, required? }",
  }),
  executeType: Schema.Literals(["bash", "prompt"]).annotate({
    description: "Execution type: 'bash' = runs a shell command, 'prompt' = LLM generates response from template",
  }),
  script: Schema.String.annotate({
    description: "The script or prompt template. Use $paramName for variable substitution (e.g. 'echo $message')",
  }),
})

export const CreateToolTool = Tool.define<typeof Parameters, { name: string; path: string }, SelfBuilder.Service>(
  "create-tool",
  Effect.gen(function* () {
    const selfBuilder = yield* SelfBuilder.Service

    return {
      description: [
        "╔══ 🔧 CREATE-TOOL TOOL ════════════════════════╗",
        "║ ZOYA apna naya tool khud bana sakti hai!      ║",
        "╚════════════════════════════════════════════════╝",
        "",
        "**Kya hota hai:**",
        "• ZOYA ek naya tool define karti hai",
        "• Tool `~/.config/zoya/self/tools/{name}/` mein save hota hai",
        "• Tool turant available ho jata hai — `run-self-tool` se execute kar sakti hai",
        "• Har agent ke system prompt mein auto-inject hota hai (definitions system)",
        "",
        "**Execution types:**",
        "| Type | Kya karta hai | Example |",
        "|------|---------------|---------|",
        "| `bash` | Shell command run with $params | `echo $message > $file` |",
        "| `prompt` | LLM prompt template | `Analyze this: $code` |",
        "",
        "**Kab banaye naya tool?**",
        "• Koi task repeatedly karna ho",
        "• Koi complex process hai",
        "• Koi specific capability chahiye",
      ].join("\n"),
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const path = yield* selfBuilder.createTool(params.name, {
            description: params.description,
            parameters: params.parameters,
            execute: {
              type: params.executeType,
              script: params.script,
            },
          })

          const paramList = Object.entries(params.parameters)
            .map(([k, v]) => `  \u2022 ${k} (${v.type})${v.required ? "" : " \u2014 optional"}: ${v.description}`)
            .join("\n")

          return {
            title: "Tool Created: " + params.name,
            output: [
              "Self-made tool \"" + params.name + "\" successfully created!",
              "",
              "Location: " + path,
              "Description: " + params.description,
              "Execute type: " + params.executeType,
              "",
              "**Parameters:**",
              paramList,
              "",
              "**How to use:**",
              "Call `run-self-tool` with toolName=\"" + params.name + "\" and required args.",
            ].join("\n"),
            metadata: { name: params.name, path },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, { name: string; path: string }>
  }),
)

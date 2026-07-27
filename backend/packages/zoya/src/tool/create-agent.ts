import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { SelfBuilder } from "@/session/self-builder"

export const Parameters = Schema.Struct({
  name: Schema.String.annotate({
    description: "Agent name — lowercase, hyphens-not-underscores, unique (e.g. 'code-reviewer')",
  }),
  description: Schema.String.annotate({
    description: "What this agent does — 1-2 lines",
  }),
  mode: Schema.Literals(["fast", "pro", "expert", "expert-2"]).annotate({
    description: "Agent mode: fast=quick, pro=detailed, expert=deep, expert-2=verifier",
  }),
  systemPrompt: Schema.String.annotate({
    description: "Full system prompt for this agent — instructions, personality, rules",
  }),
  tools: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "Tools this agent can use (e.g. ['read', 'write', 'webSearch']). Default: read+write",
  }),
  permissions: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: "Permission overrides: { toolName: 'allow'|'deny'|'ask' }",
  }),
})

export const CreateAgentTool = Tool.define<typeof Parameters, { name: string; path: string }, SelfBuilder.Service>(
  "create-agent",
  Effect.gen(function* () {
    const selfBuilder = yield* SelfBuilder.Service

    return {
      description: [
        "╔══ \uD83E\uDD16 CREATE-AGENT TOOL ═══════════════════════╗",
        "║ ZOYA apna naya sub-agent khud bana sakti hai! ║",
        "╚════════════════════════════════════════════════╝",
        "",
        "**Kya hota hai:**",
        "• ZOYA ek naya specialist agent define karti hai",
        "• Agent `~/.config/zoya/self/agents/{mode}/{name}/` mein save hota hai",
        "• Agent turant available as a sub-agent (task tool ke through)",
        "• Har session ke system prompt mein auto-inject hota hai",
        "",
        "**Modes:**",
        "| Mode | Purpose |",
        "|------|---------|",
        "| `fast` | Quick specialist |",
        "| `pro` | Detailed specialist |",
        "| `expert` | Deep specialist |",
        "| `expert-2` | Verifier (hidden) |",
        "",
        "**Kab banaye naya agent?**",
        "• Koi specific domain expertise chahiye",
        "• Koi complex workflow hai",
        "• Niche skill/tool expertise chahiye",
      ].join("\n"),
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const perms = params.permissions ?? { "*": "allow" }
          const toolList = params.tools ?? ["read", "write"]

          const path = yield* selfBuilder.createAgent(params.name, {
            description: params.description,
            mode: params.mode,
            systemPrompt: params.systemPrompt,
            tools: toolList,
            permissions: perms,
          })

          const promptPreview = params.systemPrompt.length > 300
            ? params.systemPrompt.substring(0, 300) + "..."
            : params.systemPrompt

          return {
            title: "Agent Created: " + params.name,
            output: [
              "Self-made agent \"" + params.name + "\" successfully created!",
              "",
              "Location: " + path,
              "Description: " + params.description,
              "Mode: " + params.mode,
              "Tools: " + toolList.join(", "),
              "",
              "**System Prompt Preview:**",
              promptPreview,
              "",
              "**How to use:**",
              "Call `task` with subagent=\"" + params.name + "\" to dispatch work.",
            ].join("\n"),
            metadata: { name: params.name, mode: params.mode, path },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, { name: string; path: string }>
  }),
)

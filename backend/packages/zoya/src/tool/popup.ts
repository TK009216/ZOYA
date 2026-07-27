import { Effect, Schema, pipe } from "effect"
import * as Tool from "./tool"
import { Question } from "../question"
import { SystemPrompt } from "@/session/system"
import { ACPSession } from "@/acp/session"

const PopupButton = Schema.Struct({
  id: Schema.String.annotate({ description: "Unique button identifier" }),
  label: Schema.String.annotate({ description: "Button text visible to the user" }),
  primary: Schema.optional(Schema.Boolean).annotate({
    description: "Set to true for the primary/affirmative button",
  }),
})

const POPUP_ICONS: Record<string, string> = {
  "mode-suggestion": "⚡",
  confirm: "❓",
  info: "ℹ️",
  success: "✅",
  error: "❌",
  warning: "⚠️",
}

const POPUP_TYPES = ["mode-suggestion", "confirm", "info", "success", "error", "warning"] as const

const PopupType = Schema.Literals(POPUP_TYPES)

const PopupSound = Schema.Literals(["default", "success", "error", "warning", "none"] as const)

export const Parameters = Schema.Struct({
  id: Schema.String.annotate({
    description: "Unique popup ID for tracking",
  }),
  type: Schema.optional(PopupType).annotate({
    description: "Popup visual type: mode-suggestion ⚡, confirm ❓, info ℹ️, success ✅, error ❌, warning ⚠️",
  }),
  title: Schema.String.annotate({ description: "Popup title (1-2 words, short)" }),
  message: Schema.String.annotate({
    description: "Popup message — ALWAYS include specific details about WHY",
  }),
  buttons: Schema.mutable(Schema.Array(PopupButton)).annotate({
    description: "Buttons to show (2 max: primary + secondary). For info/success just pass 1 'OK' button.",
  }),
  timeout: Schema.optional(Schema.Number).annotate({
    description: "Auto-dismiss after N seconds (default: no timeout). Use for low-priority info.",
  }),
  sound: Schema.optional(PopupSound).annotate({
    description: "Notification sound: default, success, error, warning, none (default: none)",
  }),
  persistent: Schema.optional(Schema.Boolean).annotate({
    description: "If true, popup stays until user acts (no auto-dismiss, default: false)",
  }),
  rememberChoice: Schema.optional(Schema.Boolean).annotate({
    description: "Whether the user's choice should be remembered for this session",
  }),
  targetMode: Schema.optional(Schema.String).annotate({
    description: "Target mode to switch to (for mode-suggestion type only): fast, pro, expert",
  }),
})

type Metadata = {
  chosen: string | null
  switched: boolean
  targetMode?: string
}

function renderBox(title: string, message: string, icon: string, chosen: string | null): string {
  const line = "─".repeat(Math.min(50, Math.max(title.length + 4, 30)))
  const choiceLine = chosen ? `\n  💬 User chose: "${chosen}"` : ""
  return [
    `┌${line}┐`,
    `│ ${icon} ${title.padEnd(line.length - 4)} │`,
    `├${line}┤`,
    `│ ${message.replace(/\n/g, "\n│ ").padEnd(line.length - 2)} │`,
    `└${line}┘${choiceLine}`,
  ].join("\n")
}

export const PopupTool = Tool.define<typeof Parameters, Metadata, Question.Service>(
  "popup",
  Effect.gen(function* () {
    const question = yield* Question.Service

    return {
      description: [
        "╔══ 🪟 POPUP TOOL ═══════════════════════════════╗",
        "║ User ko interactive popup dikhao aur jawab lo   ║",
        "╚═════════════════════════════════════════════════╝",
        "",
        "**🎨 6 Popup Types with Icons:**",
        "  ⚡ `mode-suggestion` — Suggest mode switch (fast→pro→expert)",
        "  ❓ `confirm` — Yes/No confirmation",
        "  ℹ️ `info` — Information display",
        "  ✅ `success` — Success notification",
        "  ❌ `error` — Error alert",
        "  ⚠️ `warning` — Warning alert",
        "",
        "**📋 Kab Use Karna Hai:**",
        "  • ⚡ Mode switch suggest karna ho → type: mode-suggestion",
        "  • ❓ Koi action confirm karwana ho → type: confirm",
        "  • ℹ️ User ko kuch batana ho → type: info (1 button: OK)",
        "  • ✅ Kuch successfully ho gaya → type: success",
        "  • ❌ Kuch error ho gaya → type: error",
        "  • ⚠️ Warning deni ho → type: warning",
        "",
        "**💡 Tips:**",
        "  • ALWAYS specific reason do message my (e.g. '25+ files needed')",
        "  • Title 1-2 words rakho",
        "  • Buttons max 2: first = affirmative, second = reject",
        "  • Info/success/error/warning ke liye sirf 1 'OK' button do",
        "  • Timeout use karo automatic dismiss ke liye (seconds)",
        "  • Sound use karo attention ke liye",
        "  • persistent=true tabhi jab zaroori ho user ka action",
      ].join("\n"),
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const icon = POPUP_ICONS[params.type ?? "confirm"] ?? "❓"
          const displayTitle = `${icon} ${params.title}`

          const answers = yield* pipe(
            question.ask({
              sessionID: ctx.sessionID,
              questions: [
                {
                  type: "confirm" as any,
                  header: displayTitle.slice(0, 30),
                  question: params.message,
                  options: params.buttons.map((b) => ({
                    label: b.label,
                    description: (b.primary ? "Recommended" : "") as any,
                  })),
                  custom: false,
                },
              ],
              tool: ctx.callID
                ? { messageID: ctx.messageID, callID: ctx.callID }
                : undefined,
            }),
            Effect.catchTag("QuestionRejectedError", () =>
              Effect.succeed([[]] as ReadonlyArray<Question.Answer>)
            ),
          )

          const chosen = answers[0]?.[0] ?? null
          let switched = false

          const validModes = ["fast", "pro", "expert"]
          if (params.type === "mode-suggestion" && chosen && params.targetMode && validModes.includes(params.targetMode)) {
            SystemPrompt.setSessionMode(ctx.sessionID, params.targetMode)

            const sessionOption = yield* Effect.serviceOption(ACPSession.Service)
            if (sessionOption._tag === "Some") {
              yield* pipe(
                sessionOption.value.setMode(ctx.sessionID, params.targetMode),
                Effect.catch(() => Effect.void),
              )
            }
            switched = true
          }

          const box = renderBox(displayTitle, params.message, icon, chosen)

          const modeMsg = switched
            ? `\n🚀 Mode auto-switched to '${params.targetMode}'! ZOYA ab ${params.targetMode} mode my kaam kar rahi hai.`
            : params.type === "mode-suggestion" && chosen
              ? "\n👌 User chose to stay. Continue in current mode."
              : params.type === "mode-suggestion" && !chosen
                ? "\n🕐 User dismissed — mode unchanged."
                : ""

          return {
            title: `🪟 Popup: ${params.title}`,
            output: `${box}${modeMsg}`,
            metadata: { chosen, switched, targetMode: params.targetMode },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)

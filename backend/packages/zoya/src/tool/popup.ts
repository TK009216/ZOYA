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

const PopupType = Schema.Literal("mode-suggestion", "confirm", "info", "warning")

export const Parameters = Schema.Struct({
  id: Schema.String.annotate({
    description: "Unique popup ID for tracking",
  }),
  type: Schema.optional(PopupType).annotate({
    description: "Type of popup: mode-suggestion, confirm, info, warning",
  }),
  title: Schema.String.annotate({ description: "Popup title (1-2 words)" }),
  message: Schema.String.annotate({
    description: "Popup message — clear, specific reason why this popup is shown. ALWAYS include specific details about WHY (e.g. '25+ files needed', 'database schema + API routes + auth system', 'complex 3D rendering with chunk system')",
  }),
  buttons: Schema.mutable(Schema.Array(PopupButton)).annotate({
    description: "Buttons to show (2 max: primary + secondary)",
  }),
  rememberChoice: Schema.optional(Schema.Boolean).annotate({
    description:
      "Whether the user's choice should be remembered for this session",
  }),
  targetMode: Schema.optional(Schema.String).annotate({
    description: "Target mode to switch to if user accepts (for mode-suggestion type only)",
  }),
})

type Metadata = {
  chosen: string | null
  switched: boolean
  targetMode?: string
}

export const PopupTool = Tool.define<typeof Parameters, Metadata, Question.Service>(
  "popup",
  Effect.gen(function* () {
    const question = yield* Question.Service

    return {
      description: [
        "Show an interactive popup/dialog to the user and WAIT for their choice.",
        "Use this ONLY for important confirmations like mode suggestions.",
        "",
        "When to use:",
        "- Suggesting mode switch when fast mode gets a complex project",
        "- Confirming destructive actions",
        "- Getting user approval for important decisions",
        "",
        "Rules:",
        "- ALWAYS include a very specific reason in the message (e.g. '25+ files: chunk system, block types, inventory, world gen, multiplayer'). NEVER write generic reasons like 'complex project'.",
        "- Keep title short (1-2 words) like 'Mode Switch?' or 'Confirm'",
        "- Max 2 buttons. First button = affirmative/accept, second = reject/stay",
        "- For mode-suggestion: set targetMode to the suggested mode so auto-switch works",
        "- This tool BLOCKS until user picks option and AUTO-SWITCHES mode on accept",
      ].join("\n"),
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const answers = yield* pipe(
            question.ask({
              sessionID: ctx.sessionID,
              questions: [
                {
                  header: params.title.slice(0, 30),
                  question: params.message,
                  options: params.buttons.map((b) => ({
                    label: b.label,
                    description: b.primary ? "Recommended" : undefined,
                  })),
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
            // Update BOTH the system prompt session mode AND the ACP session state
            // so frontend's getMode returns the correct mode after processing completes
            SystemPrompt.setSessionMode(ctx.sessionID, params.targetMode)

            // ACP session service is optional — only available when running under ACP handler
            const sessionOption = yield* Effect.serviceOption(ACPSession.Service)
            if (sessionOption._tag === "Some") {
              yield* pipe(
                sessionOption.value.setMode(ctx.sessionID, params.targetMode),
                Effect.catch(() => Effect.void),
              )
            }
            switched = true
          }

          const choiceMsg = chosen
            ? `User chose: "${chosen}"`
            : "User dismissed the popup"

          const modeMsg =
            switched
              ? `\n\nMode auto-switched to '${params.targetMode}'. ZOYA is now working in ${params.targetMode} mode.`
              : params.type === "mode-suggestion" && chosen
                ? `\n\nUser chose to stay. Continue in current mode.`
                : ""

          return {
            title: `Popup: ${params.title}`,
            output: `${choiceMsg}${modeMsg}`,
            metadata: { chosen, switched, targetMode: params.targetMode },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)

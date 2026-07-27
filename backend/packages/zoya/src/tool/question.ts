import { Effect, Schema, pipe } from "effect"
import * as Tool from "./tool"
import { Question } from "../question"

const QUESTION_ICONS: Record<string, string> = {
  text: "✍️", "single-select": "🔘", "multi-select": "☑️",
  confirm: "🤔", rating: "⭐", slider: "🎚️",
  file: "📁", date: "📅", color: "🎨", location: "📍",
}

const QuestionInput = Schema.Struct({
  type: Schema.optional(Schema.Literal(
    "text", "single-select", "multi-select", "confirm",
    "rating", "slider", "file", "date", "color", "location",
  )).annotate({
    description: "Question UI type — kaunsa UI dikhana hai user ko",
  }),
  header: Schema.String.annotate({
    description: "Short label (max 30 chars) — question ka title",
  }),
  question: Schema.String.annotate({
    description: "Full question — poori detail, context, options sab yahan do",
  }),
  options: Schema.optional(Schema.Array(Schema.Struct({
    label: Schema.String,
    description: Schema.optional(Schema.String),
  }))).annotate({
    description: "Choice options (required for single-select, multi-select, confirm)",
  }),
  placeholder: Schema.optional(Schema.String).annotate({
    description: "Placeholder hint — text/date/color/location inputs ke liye",
  }),
  defaultValue: Schema.optional(Schema.String).annotate({
    description: "Default/initial value — pehle se filled aaye",
  }),
  min: Schema.optional(Schema.Number).annotate({
    description: "Minimum value (slider: 0-100, rating: 1)",
  }),
  max: Schema.optional(Schema.Number).annotate({
    description: "Maximum value (slider: 0-100, rating: 5-10)",
  }),
  step: Schema.optional(Schema.Number).annotate({
    description: "Step increment for slider (default: 1)",
  }),
  accept: Schema.optional(Schema.String).annotate({
    description: "File extensions filter (e.g. '.png,.jpg,.pdf')",
  }),
  maxRating: Schema.optional(Schema.Number).annotate({
    description: "Number of stars for rating (default: 5)",
  }),
})

export const Parameters = Schema.Struct({
  questions: Schema.mutable(Schema.Array(QuestionInput)).annotate({
    description: "Questions array — ek ya zyada sawaal ek saath poochh sakte ho",
  }),
  allowDismiss: Schema.optional(Schema.Boolean).annotate({
    description: "Dismiss karne do ya nahi (default: true)",
  }),
})

function renderAnswers(qInfos: Question.Info[], answers: ReadonlyArray<Question.Answer>): string {
  const lines: string[] = []
  const types = qInfos.map(q => q.type ?? "text")
  const icons = types.map(t => QUESTION_ICONS[t] ?? "❓")

  for (let i = 0; i < answers.length && i < qInfos.length; i++) {
    const q = qInfos[i]
    const ans = answers[i]
    if (ans.length === 0) continue
    const icon = icons[i]
    const display = ans.length === 1
      ? `${icon} ${ans[0]}`
      : ans.map((a, j) => `  ${j + 1}. ${a}`).join("\n")
    lines.push(`  ${display}`)
  }
  return lines.join("\n")
}

export const QuestionTool = Tool.define<typeof Parameters, { answers: string[] }, Question.Service>(
  "question",
  Effect.gen(function* () {
    const question = yield* Question.Service

    return {
      description: [
        "╔══ 🎯 QUESTION TOOL ════════════════════════════╗",
        "║ User se 10 tarah se sawaal poochho aur jawab lo║",
        "╚═════════════════════════════════════════════════╝",
        "",
        "**🔢 10 Question Types:**",
        "  ✍️ `text` — Free text. User se kuch likhwao (name, idea, code)",
        "  🔘 `single-select` — Ek option chuno. Radio buttons.",
        "  ☑️ `multi-select` — Multiple options. Checkboxes.",
        "  🤔 `confirm` — Yes/No. Do button — confirm/cancel.",
        "  ⭐ `rating` — Star rating 1-5. Feedback, satisfaction.",
        "  🎚️ `slider` — Range 0-100. Volume, brightness, price range.",
        "  📁 `file` — File picker. User file select kare.",
        "  📅 `date` — Date picker. Koi date choose kare.",
        "  🎨 `color` — Color picker. Koi color choose kare.",
        "  📍 `location` — Location. City ya address bataye.",
        "",
        "**📋 Kab Kaunsa Use Karna Hai:**",
        "  • ✍️ Kuch bhi type karwana ho → text",
        "  • 🔘 Ek option select karwani ho → single-select",
        "  • ☑️ Kai options select karwane hon → multi-select",
        "  • 🤔 Action confirm karwana ho → confirm (options: Yes, No)",
        "  • ⭐ Feedback/rating lena ho → rating (maxRating: 5)",
        "  • 🎚️ Range my koi value lena ho → slider (min: 0, max: 100)",
        "  • 📁 User file upload kare → file (accept: '.png,.jpg')",
        "  • 📅 Date select karwani ho → date",
        "  • 🎨 Color choose karwana ho → color",
        "  • 📍 Location poochni ho → location",
        "",
        "**💡 MAZY DAAR TIPS:**",
        "  • Header 30 chars se chota rakho — ✨ attractive rakho",
        "  • Question my poori detail do — context, examples, options sab",
        "  • Ek baar my 2-3 related questions poochh sakte ho (e.g. name + email + phone)",
        "  • Single-select ke liye options[] my labels do",
        "  • Rating ke liye maxRating set karo (default 5)",
        "  • Slider ke liye min/max/step set karo",
        "  • File ke liye accept pattern do — user ko pata ho kaunsa file select karna hai",
        "  • Location ke liye placeholder my hint do — 'e.g. Lahore, Pakistan'",
        "  • DefaultValue do to user ko idea ho jayega kya fill karna hai",
      ].join("\n"),
      parameters: Parameters,
      execute: (params, ctx) =>
        Effect.gen(function* () {
          const qInfos: Question.Info[] = params.questions.map((q) => {
            const qtype = q.type ?? "text"
            return {
              type: qtype as Question.Info["type"],
              header: q.header,
              question: q.question,
              options: q.options ?? [],
              multiple: qtype === "multi-select" ? true : undefined,
              custom: qtype === "single-select" || qtype === "multi-select" ? undefined : false,
              placeholder: q.placeholder,
              defaultValue: q.defaultValue,
              min: q.min,
              max: q.max,
              step: q.step,
              accept: q.accept,
              maxRating: q.maxRating,
            }
          })

          const answers = yield* pipe(
            question.ask({
              sessionID: ctx.sessionID,
              questions: qInfos,
              tool: ctx.callID
                ? { messageID: ctx.messageID, callID: ctx.callID }
                : undefined,
            }),
            Effect.catchTag("QuestionRejectedError", () =>
              Effect.succeed([] as ReadonlyArray<Question.Answer>)
            ),
          )

          if (answers.length === 0) {
            return {
              title: "🙅 Question Dismissed",
              output: "User ne question dismiss kardia — koi jawab nahi mila.",
              metadata: { answers: [] },
            }
          }

          const rendered = renderAnswers(qInfos, answers)
          const flatAnswers: string[] = []
          for (const ans of answers) for (const a of ans) flatAnswers.push(a)

          return {
            title: `🎯 ${qInfos[0]?.header ?? "Answers"}`,
            output: [
              `┌──────────────────────────────────────────┐`,
              `│ 🎯 Answers Received!                      │`,
              `├──────────────────────────────────────────┤`,
              rendered ? `│ ${rendered.replace(/\n/g, "\n│ ")}` : "│ (no answers)",
              `└──────────────────────────────────────────┘`,
            ].join("\n"),
            metadata: { answers: flatAnswers },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, { answers: string[] }>
  }),
)

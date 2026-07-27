import { Effect, Schema } from "effect"
import * as Tool from "./tool"

const NOTIFY_ICONS: Record<string, string> = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  question: "🤔",
  task: "📋",
  done: "🎉",
  progress: "🔄",
}

const NOTIFY_TYPES = ["success", "error", "warning", "info", "question", "task", "done", "progress"] as const

export const Parameters = Schema.Struct({
  type: Schema.Literal(...NOTIFY_TYPES).annotate({
    description: "Notification type — kaunsa icon aur color dikhana hai: success ✅, error ❌, warning ⚠️, info ℹ️, question 🤔, task 📋, done 🎉, progress 🔄",
  }),
  title: Schema.String.annotate({
    description: "Notification title (1-5 words, bold and clear)",
  }),
  message: Schema.String.annotate({
    description: "Notification message — poori detail jo user ko batani hai",
  }),
  duration: Schema.optional(Schema.Number).annotate({
    description: "Auto-dismiss time in seconds (0 = persistent, default: 5)",
  }),
  sound: Schema.optional(Schema.Boolean).annotate({
    description: "Notification sound chahiye? (default: true for success/error/warning, false for others)",
  }),
})

type Metadata = {
  type: string
  title: string
}

export const NotifyTool = Tool.define<typeof Parameters, Metadata, never>(
  "notify",
  Effect.gen(function* () {
    return {
      description: [
        "╔══ 🔔 NOTIFY TOOL ════════════════════════════╗",
        "║ Desktop notification bhejo — user ko alert    ║",
        "║ karo jab kuch important ho, kaam ho jaye,    ║",
        "║ ya koi update ho.                             ║",
        "╚═════════════════════════════════════════════════╝",
        "",
        "**🔔 8 Notification Types:**",
        "  ✅ `success` — Kaam successfully complete ho gaya! 🎉",
        "  ❌ `error` — Kuch gadbad ho gayi, error aaya 😬",
        "  ⚠️ `warning` — Koi warning deni hai ⚡",
        "  ℹ️ `info` — Koi important information 📢",
        "  🤔 `question` — User se kuch poochna hai ❓",
        "  📋 `task` — Naya task start ho raha hai 🚀",
        "  🎉 `done` — Sab complete! Kyaa baat hai! 🏆",
        "  🔄 `progress` — Kaam chal raha hai, update ⏳",
        "",
        "**📋 Kab Use Karna Hai:**",
        "  ✅ Kaam complete ho jaye → success",
        "  ❌ Koi error/debug issue aaye → error",
        "  ⚠️ Koi important warning deni ho → warning",
        "  ℹ️ User ko kuch batana ho → info",
        "  🤔 User se sawaal karna ho → question",
        "  📋 Naya shuru karte waqt → task",
        "  🎉 Sab kuch ho gaya → done",
        "  🔄 Progress update → progress",
        "",
        "**💡 Tips:**",
        "  • Title chota rakho (1-5 words), message my detail do",
        "  • Duration set karo — kitni der dikhe (seconds)",
        "  • Sound=true for important notifications",
        "  • Progress type tab use karo jab koi kaam chal raha ho",
        "  • Done type tab jab poora kaam khatam ho jaye",
      ].join("\n"),
      parameters: Parameters,
      execute: (params) => {
        const icon = NOTIFY_ICONS[params.type] ?? "🔔"
        const dur = params.duration ?? 5
        const hasSound = params.sound ?? (params.type === "success" || params.type === "error" || params.type === "warning")

        const topLine = `┌${"─".repeat(Math.min(54, Math.max(params.title.length + 12, 34)))}┐`
        const bottomLine = topLine.replace("┌", "└").replace("┐", "┘")

        const soundLine = hasSound ? "\n  🔔 Sound: ON" : ""
        const durLine = dur > 0 ? `\n  ⏱️ Auto-dismiss: ${dur}s` : "\n  📌 Persistent"

        return Effect.succeed({
          title: `🔔 ${params.title}`,
          output: [
            topLine,
            `│  ${icon}  ${params.title}`,
            `├${"─".repeat(Math.min(54, Math.max(params.title.length + 12, 34)))}┤`,
            `│  ${params.message.replace(/\n/g, "\n│  ")}`,
            bottomLine,
            `📬 Notification sent!${soundLine}${durLine}`,
          ].join("\n"),
          metadata: { type: params.type, title: params.title },
        })
      },
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)

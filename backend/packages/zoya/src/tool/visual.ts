import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const VisualType = Schema.Literal(
  "flowchart", "mindmap", "timeline", "comparison-table",
  "architecture-diagram", "sequence-diagram", "pie-chart",
  "bar-chart", "line-chart", "gantt", "diagram",
)

const VISUAL_ICONS: Record<string, string> = {
  flowchart: "🔀", mindmap: "🧠", timeline: "📅",
  "comparison-table": "⚖️", "architecture-diagram": "🏗️",
  "sequence-diagram": "↔️", "pie-chart": "🥧",
  "bar-chart": "📊", "line-chart": "📈", gantt: "📋",
  diagram: "📐",
}

const TEMPLATES: Record<string, string> = `
  • 🔀 flowchart — Process flow diagram
    ┌──────┐    ┌──────┐    ┌──────┐
    │ Step1│───▶│ Step2│───▶│ Step3│
    └──────┘    └──────┘    └──────┘

  • 🧠 mindmap — Hierarchical idea map
        ┌── Idea1
    ┌───┼── Idea2
    │   └── Idea3
  Topic┼── Idea4
        └── Idea5

  • 📅 timeline — Chronological events
    2024 Q1 ──▶ 2024 Q2 ──▶ 2024 Q3 ──▶ 2024 Q4

  • ⚖️ comparison-table — Side-by-side comparison
    | Feature | Option A | Option B |
    |---------|----------|----------|
    | Price   | $10      | $15      |

  • 🏗️ architecture-diagram — System architecture
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │ Frontend│────▶│   API   │────▶│ Database│
    └─────────┘     └─────────┘     └─────────┘

  • ↔️ sequence-diagram — Interaction flow
    User──▶App──▶API──▶DB

  • 🥧 pie-chart — Distribution
    🟦 50% Frontend  🟩 30% Backend  🟨 20% DevOps

  • 📊 bar-chart — Comparison (ASCII bars)
    A: ████████████ 80%
    B: ████████     60%
    C: ████         30%

  • 📈 line-chart — Trends
    📈 Jan─Feb─Mar─Apr─May
        20──25──18──30──35

  • 📋 gantt — Project timeline
    Task1 ████████░░░░░░
    Task2 ░░████████░░░░
    Task3 ░░░░░░████████
`

export const Parameters = Schema.Struct({
  id: Schema.String.annotate({ description: "Unique visual ID for tracking" }),
  type: VisualType.annotate({
    description: "Visual type: flowchart 🔀, mindmap 🧠, timeline 📅, comparison-table ⚖️, architecture-diagram 🏗️, sequence-diagram ↔️, pie-chart 🥧, bar-chart 📊, line-chart 📈, gantt 📋",
  }),
  title: Schema.String.annotate({ description: "Visual title (2-5 words)" }),
  content: Schema.String.annotate({ description: "The visual content — ASCII/Unicode diagram, markdown table, data" }),
  description: Schema.optional(Schema.String).annotate({ description: "Context about what this visual represents" }),
  legend: Schema.optional(Schema.String).annotate({ description: "Legend/explanation of symbols and colors" }),
})

type Metadata = {
  id: string
  type: string
}

function renderVisual(params: typeof Parameters.Type): string {
  const icon = VISUAL_ICONS[params.type] ?? "📐"
  const desc = params.description ? `> ${params.description}` : ""
  const legend = params.legend ? `\n\n**Legend:** ${params.legend}` : ""

  const header = `${desc ? desc + "\n" : ""}${params.content}${legend}`

  switch (params.type) {
    case "flowchart":
      return `${header}\n\n_🔀 Flowchart: ${params.title}_`

    case "mindmap":
      return `${header}\n\n_🧠 Mind Map: ${params.title}_`

    case "timeline":
      return `${header}\n\n_📅 Timeline: ${params.title}_`

    case "comparison-table":
      return `${header}\n\n_⚖️ Comparison: ${params.title}_`

    case "architecture-diagram":
      return `\`\`\`\n${header}\n\`\`\`\n\n_🏗️ Architecture: ${params.title}_`

    case "sequence-diagram":
      return `\`\`\`\n${header}\n\`\`\`\n\n_↔️ Sequence: ${params.title}_`

    case "pie-chart":
      return `${header}\n\n_🥧 Distribution: ${params.title}_`

    case "bar-chart":
      return `\`\`\`\n${header}\n\`\`\`\n\n_📊 Bar Chart: ${params.title}_`

    case "line-chart":
      return `\`\`\`\n${header}\n\`\`\`\n\n_📈 Line Chart: ${params.title}_`

    case "gantt":
      return `\`\`\`\n${header}\n\`\`\`\n\n_📋 Gantt Chart: ${params.title}_`

    default:
      return `${header}`
  }
}

export const VisualTool = Tool.define<typeof Parameters, Metadata, never>(
  "visual",
  Effect.gen(function* () {
    return {
      description: [
        "╔══ 🎨 VISUAL TOOL ═════════════════════════════╗",
        "║ Diagrams, charts, mind maps, flowcharts,      ║",
        "║ timelines, architecture — koi bhi visual banao║",
        "╚═════════════════════════════════════════════════╝",
        "",
        "**🎨 11 Visual Types:**",
        TEMPLATES.trim(),
        "",
        "**📋 Kab Use Karna Hai:**",
        "  • 🔀 Process/procedure samjhana ho → flowchart",
        "  • 🧠 Brainstorming ya idea organization → mindmap",
        "  • 📅 Chronological events dikhane hain → timeline",
        "  • ⚖️ Do ya zyada cheezon ka comparison → comparison-table",
        "  • 🏗️ System design/architecture batana ho → architecture-diagram",
        "  • ↔️ Component interaction dikhana ho → sequence-diagram",
        "  • 🥧 Distribution percentages dikhani hon → pie-chart",
        "  • 📊 Values compare karni hon → bar-chart",
        "  • 📈 Trends/timeline data dikhana ho → line-chart",
        "  • 📋 Project timeline/planning → gantt",
        "",
        "**💡 Tips:**",
        "  • ALWAYS description do jo explain kare yeh visual kyun dikhaya",
        "  • ASCII/Unicode box-drawing characters use karo for diagrams",
        "  • Legend do agar symbols/colors use kiye hain",
        "  • Architecture diagrams ke liye ┌─┐ └─┘ ├─┤ │ characters use karo",
        "  • Charts ke liye ASCII bars ya data table do",
        "  • Flowcharts ke liye ─▶ arrows use karo for flow",
      ].join("\n"),
      parameters: Parameters,
      execute: (params) => {
        const icon = VISUAL_ICONS[params.type] ?? "📐"
        const rendered = renderVisual(params)
        return Effect.succeed({
          title: `${icon} ${params.title}`,
          output: rendered,
          metadata: { id: params.id, type: `visual:${params.type}` },
        })
      },
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)

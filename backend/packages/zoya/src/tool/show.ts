import { Effect, Schema } from "effect"
import * as Tool from "./tool"

export const ContentType = Schema.Literal(
  "image", "video", "youtube", "audio", "website", "pdf",
  "word", "excel", "code", "table", "chart", "map",
  "3d-model", "text", "markdown", "url", "file",
)

const CONTENT_ICONS: Record<string, string> = {
  image: "🖼️", video: "🎬", youtube: "▶️", audio: "🎵",
  website: "🌐", pdf: "📄", word: "📝", excel: "📊",
  code: "💻", table: "📋", chart: "📈", map: "🗺️",
  "3d-model": "🧊", text: "📝", markdown: "📝", url: "🔗", file: "📁",
}

const CONTENT_EXAMPLES: Record<string, string> = `
  • 🖼️ image — Image/photo dikhani ho → content = image URL
  • 🎬 video — Video file dikhani ho (MP4, WebM) → content = video URL
  • ▶️ youtube — YouTube video embed karni ho → content = YouTube URL
  • 🎵 audio — Audio/MP3 play karni ho → content = audio URL
  • 🌐 website — Website preview dikhana ho → content = URL
  • 📄 pdf — PDF file dikhani ho → content = PDF URL
  • 📝 word — Word/Excel file ka preview → content = file URL
  • 📊 excel — Excel sheet preview → content = file URL
  • 💻 code — Code snippet syntax highlighting ke saath → content = code, language = js/py/ts etc
  • 📋 table — Tabular data → content = markdown table
  • 📈 chart — Chart/graph → content = description + data
  • 🗺️ map — Map/geographic data → content = location
  • 🧊 3d-model — 3D model preview → content = model URL
  • 📝 text — Plain text display
  • 🔗 url — Link preview
  • 📁 file — Generic file display
`

export const Parameters = Schema.Struct({
  id: Schema.String.annotate({ description: "Unique display ID for tracking" }),
  type: ContentType.annotate({
    description: `Content type to display: image, video, youtube, audio, website, pdf, word, excel, code, table, chart, map, 3d-model, text, markdown, url, file`,
  }),
  title: Schema.String.annotate({ description: "Display title (2-5 words)" }),
  content: Schema.String.annotate({ description: "The content to display — URL, code, text, or markdown" }),
  description: Schema.optional(Schema.String).annotate({ description: "Context about what is being shown" }),
  language: Schema.optional(Schema.String).annotate({ description: "Language for code blocks (js, py, ts, rs, go, etc)" }),
})

type Metadata = {
  id: string
  type: string
}

function renderContent(params: typeof Parameters.Type): string {
  const icon = CONTENT_ICONS[params.type] ?? "📄"
  const desc = params.description ? `> ${params.description}\n` : ""

  switch (params.type) {
    case "image":
      return `${desc}![${params.title}](${params.content})`

    case "video":
      return `${desc}<video controls src="${params.content}" style="max-width:100%">Video not supported</video>`

    case "youtube":
      return `${desc}[▶️ Watch on YouTube](${params.content})\n\n\`\`\`\nYouTube: ${params.content}\n\`\`\``

    case "audio":
      return `${desc}<audio controls src="${params.content}">Audio not supported</audio>`

    case "website":
      return `${desc}🔗 [${params.content}](${params.content})`

    case "pdf":
      return `${desc}📄 [Open PDF](${params.content})\n\n<iframe src="${params.content}" style="width:100%;height:500px"></iframe>`

    case "word":
    case "excel":
      return `${desc}📁 [Open File](${params.content})`

    case "code":
      return params.language
        ? `${desc}\`\`\`${params.language}\n${params.content}\n\`\`\``
        : `${desc}\`\`\`\n${params.content}\n\`\`\``

    case "table":
      return `${desc}\n${params.content}`

    case "chart":
    case "map":
      return `${desc}\`\`\`\n${params.content}\n\`\`\``

    case "3d-model":
      return `${desc}🧊 3D Model: ${params.content}`

    case "markdown":
      return `${desc}${params.content}`

    case "url":
      return `${desc}🔗 [${params.content}](${params.content})`

    case "file":
      return `${desc}📁 \`${params.content}\``

    default:
      return `${desc}${params.content}`
  }
}

export const ShowTool = Tool.define<typeof Parameters, Metadata, never>(
  "show",
  Effect.gen(function* () {
    return {
      description: [
        "╔══ 📺 SHOW TOOL ═══════════════════════════════╗",
        "║ Koi bhi content user ko dikhao — image, video,║",
        "║ code, website, PDF, map, 3D model, ya aur kuch║",
        "╚═════════════════════════════════════════════════╝",
        "",
        "**🎨 17 Content Types:**",
        CONTENT_EXAMPLES.trim(),
        "",
        "**📋 Kab Use Karna Hai:**",
        "  • 🖼️ User ko screenshot/image dikhani ho → image",
        "  • 🎬 Video file play karni ho → video",
        "  • ▶️ YouTube video share karni ho → youtube",
        "  • 🎵 Song/audio play karna ho → audio",
        "  • 🌐 Website preview dikhana ho → website",
        "  • 📄 PDF file dikhani ho → pdf",
        "  • 💻 Code snippet dikhana ho → code (+ language)",
        "  • 📋 Table/data dikhana ho → table",
        "  • 🗺️ Map location dikhani ho → map",
        "  • 🧊 3D model dikhana ho → 3d-model",
        "  • 📝 Formatted text dikhana ho → markdown",
        "",
        "**💡 Tips:**",
        "  • ALWAYS description do — user ko pata hona chahiye kyun dikha rahe ho",
        "  • Code ke liye language set karo syntax highlighting ke liye",
        "  • Image/video/audio ke liye content = URL",
        "  • Table ke liye content = markdown table rows",
        "  • Chart/map ke liye content = description + data",
      ].join("\n"),
      parameters: Parameters,
      execute: (params) => {
        const icon = CONTENT_ICONS[params.type] ?? "📄"
        const rendered = renderContent(params)
        return Effect.succeed({
          title: `${icon} ${params.title}`,
          output: rendered,
          metadata: { id: params.id, type: `show:${params.type}` },
        })
      },
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)

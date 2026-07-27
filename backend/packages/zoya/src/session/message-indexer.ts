import { Effect, Context, Layer } from "effect"
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, appendFileSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { SessionV1 } from "@zoya/core/v1/session"
import { SessionID, MessageID } from "./schema"
import { InstanceState } from "@/effect/instance-state"

// --- Types ---

export interface IndexedMessage {
  id: string
  sessionID: string
  role: "user" | "assistant"
  timestamp: number
  mode?: string
  text: string
  hasCode: boolean
  hasFiles: boolean
  topics: string[]
  toolsUsed: string[]
}

export interface ProjectEntry {
  name: string
  path: string
  firstSeen: number
  lastActive: number
  fileCount: number
  languages: Record<string, number>
  sessions: string[]
  summary: string
}

export interface UserPreferenceEntry {
  pattern: string
  count: number
  category: "tone" | "style" | "topic" | "format"
  value: string
  lastObserved: number
  sentiment: "positive" | "negative" | "neutral"
}

export interface PendingTask {
  id: string
  description: string
  sessionID: string
  created: number
  lastActive: number
  status: "pending" | "interrupted" | "completed"
  filesTouched: string[]
  notes: string
}

// --- Paths ---

function indexPath(): string {
  return join(homedir(), ".config", "zoya", "index")
}

function messagesPath(sessionID: string): string {
  return join(indexPath(), "messages", `${sessionID}.jsonl`)
}

function projectsPath(): string {
  return join(indexPath(), "projects.json")
}

function prefsPath(): string {
  return join(indexPath(), "preferences.json")
}

function tasksPath(): string {
  return join(indexPath(), "tasks.json")
}

function filesIndexPath(): string {
  return join(indexPath(), "files-index.json")
}

function ensureDirs() {
  const base = indexPath()
  mkdirSync(base, { recursive: true })
  mkdirSync(join(base, "messages"), { recursive: true })
}

// --- Data Loaders ---

function loadJSON<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback
    return JSON.parse(readFileSync(path, "utf-8"))
  } catch { return fallback }
}

function saveJSON(path: string, data: any) {
  try {
    ensureDirs()
    writeFileSync(path, JSON.stringify(data, null, 2))
  } catch {}
}

// --- Interface ---

export interface Interface {
  readonly indexMessage: (input: {
    sessionID: SessionID
    message: SessionV1.WithParts
  }) => Effect.Effect<void>
  readonly getSessionMessages: (sessionID: SessionID) => Effect.Effect<IndexedMessage[]>
  readonly searchMessages: (query: string, limit?: number) => Effect.Effect<IndexedMessage[]>
  readonly getRecentMessages: (limit?: number) => Effect.Effect<IndexedMessage[]>
  readonly getProjectSummary: (sessionID?: SessionID) => Effect.Effect<string>
  readonly trackProject: (path: string, language?: string) => Effect.Effect<void>
  readonly getPreferences: () => Effect.Effect<UserPreferenceEntry[]>
  readonly learnPreference: (entry: Omit<UserPreferenceEntry, "count" | "lastObserved">) => Effect.Effect<void>
  readonly getPendingTasks: (status?: "pending" | "interrupted") => Effect.Effect<PendingTask[]>
  readonly savePendingTask: (task: PendingTask) => Effect.Effect<void>
  readonly completeTask: (taskID: string) => Effect.Effect<void>
  readonly getFileIndex: (projectPath?: string) => Effect.Effect<Record<string, string[]>>
  readonly trackFileChange: (filePath: string, projectPath: string) => Effect.Effect<void>
  readonly getFullContext: (sessionID?: SessionID) => Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/MessageIndexer") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    ensureDirs()

    const indexMessage = Effect.fn("MessageIndexer.indexMessage")(function* (opts: {
      sessionID: SessionID
      message: SessionV1.WithParts
    }) {
      try {
        ensureDirs()
        const { sessionID, message } = opts
        const text = message.parts
          .filter((p): p is SessionV1.TextPart => p.type === "text")
          .map((p) => p.text)
          .join("\n")
        const hasCode = text.includes("```")
        const hasFiles = message.parts.some((p) => p.type === "file")
        const topics = extractTopics(text)
        const toolsUsed = message.parts
          .filter((p): p is SessionV1.ToolPart => p.type === "tool")
          .map((p) => p.tool)

        const entry: IndexedMessage = {
          id: message.info.id,
          sessionID,
          role: message.info.role,
          timestamp: message.info.time.created,
          mode: (message.info as any).mode,
          text: text.substring(0, 2000),
          hasCode,
          hasFiles,
          topics,
          toolsUsed,
        }

        const filePath = messagesPath(sessionID)
        appendFileSync(filePath, JSON.stringify(entry) + "\n")

        if (message.info.role === "user" && text.length > 10) {
          learnStylePreference(text)
        }
      } catch { /* silent */ }
    })

    function extractTopics(text: string): string[] {
      const topics: string[] = []
      const patterns = [
        /(?:project|app|site|system|tool)\s+(\w[\w\s-]{1,30}?\w)/gi,
        /(?:using|with|in)\s+(\w[\w.]{1,20})/gi,
      ]
      for (const pat of patterns) {
        const matches = text.matchAll(pat)
        for (const m of matches) {
          if (m[1] && !topics.includes(m[1])) topics.push(m[1])
        }
      }
      return topics.slice(0, 5)
    }

    function learnStylePreference(text: string) {
      const lower = text.toLowerCase()
      const prefs = loadJSON<UserPreferenceEntry[]>(prefsPath(), [])

      if (/\b(acha|good|nice|perfect|awesome|love|like|great)\b/.test(lower))
        addPref(prefs, { pattern: "positive feedback", category: "tone", value: "positive", sentiment: "positive" })
      if(/\b(nahi|nah|nhi|bad|wrong|galat|error|issue)\b/.test(lower))
        addPref(prefs, { pattern: "negative feedback", category: "tone", value: "negative", sentiment: "negative" })
      if (/\b(code|code.?first|example|demo|sample)\b/.test(lower))
        addPref(prefs, { pattern: "prefers code examples", category: "style", value: "code-first", sentiment: "positive" })
      if (/\b(short|concise|quick|simple|easy)\b/.test(lower))
        addPref(prefs, { pattern: "prefers concise answers", category: "style", value: "short", sentiment: "positive" })
      if (/\b(detail|deep|comprehensive|exhaustive|thorough)\b/.test(lower))
        addPref(prefs, { pattern: "prefers detailed answers", category: "style", value: "detailed", sentiment: "positive" })
      if (/\b(Hinglish|urdu|hindi|roman)\b/i.test(lower))
        addPref(prefs, { pattern: "prefers Hinglish/Hindi", category: "tone", value: "hinglish", sentiment: "positive" })
    }

    function addPref(arr: UserPreferenceEntry[], entry: Omit<UserPreferenceEntry, "count" | "lastObserved">) {
      const existing = arr.find((p) => p.pattern === entry.pattern && p.category === entry.category)
      if (existing) {
        existing.count++
        existing.lastObserved = Date.now()
      } else {
        arr.push({ ...entry, count: 1, lastObserved: Date.now() })
      }
      if (arr.length > 50) arr.splice(0, arr.length - 50)
      saveJSON(prefsPath(), arr)
    }

    const getSessionMessages = Effect.fn("MessageIndexer.getSessionMessages")(function* (sessionID: SessionID) {
      try {
        const p = messagesPath(sessionID)
        if (!existsSync(p)) return []
        const content = readFileSync(p, "utf-8")
        return content.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as IndexedMessage)
      } catch { return [] }
    })

    const searchMessages = Effect.fn("MessageIndexer.searchMessages")(function* (query: string, limit = 5) {
      const dir = join(indexPath(), "messages")
      if (!existsSync(dir)) return []
      const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2)
      if (!terms.length) return []
      const results: { msg: IndexedMessage; score: number }[] = []
      const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
      for (const file of files) {
        try {
          const content = readFileSync(join(dir, file), "utf-8")
          const lines = content.trim().split("\n").filter(Boolean)
          for (const line of lines) {
            const msg = JSON.parse(line) as IndexedMessage
            const lower = msg.text.toLowerCase()
            const score = terms.filter((t) => lower.includes(t)).length
            if (score > 0) results.push({ msg, score })
          }
        } catch { continue }
      }
      return results.sort((a, b) => b.score - a.score).slice(0, limit).map((r) => r.msg)
    })

    const getRecentMessages = Effect.fn("MessageIndexer.getRecentMessages")(function* (limit = 20) {
      const dir = join(indexPath(), "messages")
      if (!existsSync(dir)) return []
      const all: IndexedMessage[] = []
      const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
      for (const file of files) {
        try {
          const content = readFileSync(join(dir, file), "utf-8")
          const lines = content.trim().split("\n").filter(Boolean)
          for (const line of lines) all.push(JSON.parse(line) as IndexedMessage)
        } catch { continue }
      }
      return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
    })

    const getProjectSummary = Effect.fn("MessageIndexer.getProjectSummary")(function* (sessionID?: SessionID) {
      const projects = loadJSON<ProjectEntry[]>(projectsPath(), [])
      if (sessionID) {
        const relevant = projects.filter((p) => p.sessions.includes(sessionID))
        if (relevant.length) {
          const p = relevant[0]
          const langs = Object.entries(p.languages).map(([l, c]) => `${l} (${c})`).join(", ")
          return `${p.name} (${p.path}) — ${p.fileCount} files, langs: ${langs}`
        }
      }
      if (projects.length === 0) return "No projects tracked yet"
      return projects.slice(-3).map((p) =>
        `${p.name}: ${p.fileCount} files, ${p.sessions.length} sessions`
      ).join(" | ")
    })

    const trackProject = Effect.fn("MessageIndexer.trackProject")(function* (path: string, language?: string) {
      const projects = loadJSON<ProjectEntry[]>(projectsPath(), [])
      const name = path.split(/[/\\]/).pop() || path
      let project = projects.find((p) => p.path === path)
      if (project) {
        project.lastActive = Date.now()
        project.fileCount++
        if (language) project.languages[language] = (project.languages[language] || 0) + 1
      } else {
        projects.push({
          name, path, firstSeen: Date.now(), lastActive: Date.now(),
          fileCount: 1, languages: language ? { [language]: 1 } : {},
          sessions: [], summary: "",
        })
      }
      if (projects.length > 100) projects.splice(0, projects.length - 100)
      saveJSON(projectsPath(), projects)
    })

    const getPreferences = Effect.fn("MessageIndexer.getPreferences")(function* () {
      return loadJSON<UserPreferenceEntry[]>(prefsPath(), [])
    })

    const learnPreference = Effect.fn("MessageIndexer.learnPreference")(function* (entry) {
      const prefs = loadJSON<UserPreferenceEntry[]>(prefsPath(), [])
      addPref(prefs, entry)
    })

    const pendingTasksPath = tasksPath
    const getPendingTasks = Effect.fn("MessageIndexer.getPendingTasks")(function* (status?: "pending" | "interrupted") {
      const tasks = loadJSON<PendingTask[]>(pendingTasksPath(), [])
      if (status) return tasks.filter((t) => t.status === status)
      return tasks.filter((t) => t.status !== "completed")
    })

    const savePendingTask = Effect.fn("MessageIndexer.savePendingTask")(function* (task: PendingTask) {
      const tasks = loadJSON<PendingTask[]>(pendingTasksPath(), [])
      const idx = tasks.findIndex((t) => t.id === task.id)
      if (idx >= 0) tasks[idx] = task
      else tasks.push(task)
      if (tasks.length > 200) tasks.splice(0, tasks.length - 200)
      saveJSON(pendingTasksPath(), tasks)
    })

    const completeTask = Effect.fn("MessageIndexer.completeTask")(function* (taskID: string) {
      const tasks = loadJSON<PendingTask[]>(pendingTasksPath(), [])
      const task = tasks.find((t) => t.id === taskID)
      if (task) {
        task.status = "completed"
        saveJSON(pendingTasksPath(), tasks)
      }
    })

    const getFileIndex = Effect.fn("MessageIndexer.getFileIndex")(function* (projectPath?: string) {
      const all = loadJSON<Record<string, Record<string, string[]>>>(filesIndexPath(), {})
      if (projectPath) {
        const entry = all[projectPath]
        if (!entry) return {}
        return entry
      }
      // Return last 3 projects
      const keys = Object.keys(all).slice(-3)
      const result: Record<string, string[]> = {}
      for (const k of keys) {
        const extMap = all[k]
        const allFiles: string[] = []
        for (const files of Object.values(extMap)) allFiles.push(...files)
        result[k.split(/[/\\]/).pop() || k] = allFiles.slice(0, 50)
      }
      return result
    })

    const trackFileChange = Effect.fn("MessageIndexer.trackFileChange")(function* (filePath: string, projectPath: string) {
      const all = loadJSON<Record<string, Record<string, string[]>>>(filesIndexPath(), {})
      if (!all[projectPath]) all[projectPath] = {}
      const ext = filePath.split(".").pop() || "unknown"
      if (!all[projectPath][ext]) all[projectPath][ext] = []
      if (!all[projectPath][ext].includes(filePath)) {
        all[projectPath][ext].push(filePath)
        if (all[projectPath][ext].length > 200) all[projectPath][ext] = all[projectPath][ext].slice(-200)
      }
      saveJSON(filesIndexPath(), all)

      // Also update project entry
      yield* trackProject(projectPath, ext)
    })

    const getFullContext = Effect.fn("MessageIndexer.getFullContext")(function* (sessionID?: SessionID) {
      // Auto-index: catch up on any messages from this session not yet indexed
      if (sessionID) {
        try {
          ensureDirs()
          const fp = messagesPath(sessionID)
          const indexedIds = new Set<string>()
          if (existsSync(fp)) {
            for (const line of readFileSync(fp, "utf-8").trim().split("\n").filter(Boolean)) {
              try { indexedIds.add(JSON.parse(line).id) } catch {}
            }
          }
        } catch { /* silent */ }
      }

      const lines: string[] = ["<database_agent_context>"]

      // Pending tasks
      const tasks = yield* getPendingTasks()
      if (tasks.length > 0) {
        lines.push("  📋 Pending Tasks:")
        for (const t of tasks.slice(0, 5)) {
          const ago = Math.floor((Date.now() - t.lastActive) / 60000)
          lines.push(`    - ${t.description} (${ago}min ago, ${t.status})`)
        }
      }

      // Recent messages
      const recent = yield* getRecentMessages(5)
      if (recent.length > 0) {
        lines.push("  💬 Recent Activity:")
        for (const m of recent.slice(0, 3)) {
          const d = new Date(m.timestamp).toLocaleDateString()
          lines.push(`    [${d}] ${m.role}: ${m.text.substring(0, 150)}`)
        }
      }

      // Projects
      const proj = yield* getProjectSummary(sessionID)
      lines.push(`  📁 ${proj}`)

      // User preferences
      const prefs = yield* getPreferences()
      if (prefs.length > 0) {
        const top = prefs.sort((a, b) => b.count - a.count).slice(0, 5)
        lines.push("  🎯 User Patterns:")
        for (const p of top) {
          lines.push(`    - ${p.pattern} (${p.count}x, ${p.sentiment})`)
        }
      }

      // File index
      const files = yield* getFileIndex()
      const fileKeys = Object.keys(files)
      if (fileKeys.length > 0) {
        lines.push("  📄 Tracked Projects:")
        for (const [name, fileList] of Object.entries(files)) {
          lines.push(`    ${name}: ${fileList.length} files`)
        }
      }

      lines.push("</database_agent_context>")
      return lines.join("\n")
    })

    return Service.of({
      indexMessage,
      getSessionMessages,
      searchMessages,
      getRecentMessages,
      getProjectSummary,
      trackProject,
      getPreferences,
      learnPreference,
      getPendingTasks,
      savePendingTask,
      completeTask,
      getFileIndex,
      trackFileChange,
      getFullContext,
    })
  }),
)

export const defaultLayer = layer

export * as MessageIndexer from "./message-indexer"

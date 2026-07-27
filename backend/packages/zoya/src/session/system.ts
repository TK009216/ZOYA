import { LayerNode } from "@zoya/core/effect/layer-node"
import { Context, Effect, Layer } from "effect"

import { join } from "path"
import { homedir } from "os"
import { buildTimeContext } from "./time-tracker"

import { InstanceState } from "@/effect/instance-state"

import PROMPT_MAIN from "./prompt/main.txt"
import PROMPT_FAST from "./prompt/fast.txt"
import PROMPT_PRO from "./prompt/pro.txt"
import PROMPT_EXPERT from "./prompt/expert.txt"
import { buildToolAgentSection } from "./discovery"
import { History } from "./history"
import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Skill } from "@/skill"
import { Service as ContextWindowService } from "./context-window"
import { Service as MessageIndexerService } from "./message-indexer"

const sessionModes = new Map<string, string>()

// --- Layer 3 helpers: location + weather ---

const WMO_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  56: "Light freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Light freezing rain", 67: "Heavy freezing rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Slight snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}

let weatherCache: { text: string; ts: number } | null = null
const WTHR_TTL = 30 * 60 * 1000

async function fetchWeather(lat: number, lon: number) {
  if (weatherCache && Date.now() - weatherCache.ts < WTHR_TTL) return weatherCache.text
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weathercode,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=auto&forecast_days=3`,
    { signal: AbortSignal.timeout(7000) },
  )
  const d = await res.json() as any
  if (!d || !d.current) return weatherCache?.text ?? "Weather unavailable"

  const wc = d.current.weathercode as number
  const desc = WMO_CODES[wc] ?? "Unknown"
  const lines: string[] = [
    `Current: ${d.current.temperature_2m}°C (feels like ${d.current.apparent_temperature}°C), ${desc}`,
    `Humidity: ${d.current.relative_humidity_2m}%, Wind: ${d.current.wind_speed_10m} km/h`,
  ]

  if (d.daily) {
    const labels = ["Today", "Tomorrow", "Day after"]
    d.daily.time.forEach((date: string, i: number) => {
      const cd = WMO_CODES[d.daily.weathercode[i]] ?? "Unknown"
      const precip = d.daily.precipitation_probability_max[i]
      lines.push(
        `  ${labels[i] ?? date}: ${d.daily.temperature_2m_min[i]}°C – ${d.daily.temperature_2m_max[i]}°C, ${cd}` +
        (precip != null ? `, 🌧️ ${precip}%` : ""),
      )
    })
  }

  const result = lines.join("\n  ")
  weatherCache = { text: result, ts: Date.now() }
  return result
}

export function setSessionMode(sessionID: string, mode: string) {
  sessionModes.set(sessionID, mode)
}

export function clearSessionMode(sessionID: string) {
  sessionModes.delete(sessionID)
}

export function getSessionMode(sessionID: string): string | undefined {
  return sessionModes.get(sessionID)
}

export function provider(model: Provider.Model, sessionID?: string) {
  const mode = (sessionID && sessionModes.get(sessionID)) || "pro"

  // Layer 1: Shared persona + communication rules
  const layer1 = PROMPT_MAIN.replaceAll("{mode}", mode)

  // Layer 2: Mode-specific instructions
  let layer2 =
    mode === "fast" ? PROMPT_FAST
    : mode === "pro" ? PROMPT_PRO
    : mode === "expert" ? PROMPT_EXPERT
    : PROMPT_FAST

  // Layer 2.5: Auto-injected tools & agents (from definitions/ folders)
  const toolAgentSection = buildToolAgentSection(mode)
  if (toolAgentSection) {
    layer2 += "\n\n" + toolAgentSection
  }

  return [layer1, layer2]
}

export interface Interface {
  readonly environment: (model: Provider.Model) => Effect.Effect<string[]>
  readonly history: (sessionID?: string) => Effect.Effect<string[], unknown, unknown>
  readonly skills: (agent: Agent.Info) => Effect.Effect<string | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/SystemPrompt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {

    return Service.of({
      // Layer 3: Environment — time, location, weather, platform, user
      environment: Effect.fn("SystemPrompt.environment")(function* (model: Provider.Model) {
        const ctx = yield* InstanceState.context
        const historyOpt = yield* Effect.serviceOption(History.Service)
        const userName = historyOpt._tag === "Some"
          ? yield* historyOpt.value.getUserName()
          : "Sir"

        const now = new Date()
        const timeStr = now.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
        })

        // User's saved home location (from first-time setup)
        const homeLocation = historyOpt._tag === "Some"
          ? yield* historyOpt.value.getHomeLocation()
          : ""

        // Exact GPS coordinates from browser geolocation API
        const exactLoc = historyOpt._tag === "Some"
          ? yield* historyOpt.value.getExactLocation()
          : null

        // ZOYA's own installation directory
        const zoyaDir = import.meta.dirname ?? process.cwd()
        const zoyaTemp = join(homedir(), ".config", "zoya", "temp")

        // Build location string with home/away awareness
        let locStr: string

        if (exactLoc) {
          locStr = `Current Location: ${exactLoc.latitude.toFixed(4)}, ${exactLoc.longitude.toFixed(4)} (pinpoint, ±${Math.round(exactLoc.accuracy)}m)`
          if (homeLocation) {
            locStr += ` — Home: ${homeLocation}`
          }
        } else if (homeLocation) {
          locStr = `Location: ${homeLocation} (saved home)`
        } else {
          locStr = "Location: unknown — allow browser location permission for pinpoint accuracy"
        }

        const wthrStr = exactLoc
          ? yield* Effect.tryPromise({ try: () => fetchWeather(exactLoc.latitude, exactLoc.longitude), catch: () => "Weather unavailable" })
          : "Weather unavailable"

        return [
          [
            "<system_env>",
            `  Time: ${timeStr}`,
            `  User: ${userName}`,
            `  Platform: ${process.platform}`,
            `  Working Dir: ${ctx.directory}`,
            `  ZOYA Dir: ${zoyaDir}`,
            `  Temp Dir: ${zoyaTemp} (save research files here)`,
            `  ${locStr}`,
            `  ${wthrStr}`,
            `</system_env>`,
            `Using ${model.api.id} from ${model.providerID}`,
          ].join("\n"),
        ]
      }),

      // Layer 4: History — known facts, preferences, project context + time tracking + context window
      history: Effect.fn("SystemPrompt.history")(function* (sessionID?: string) {
        const items: string[] = []
        const historyOpt = yield* Effect.serviceOption(History.Service)
        if (historyOpt._tag === "Some") {
          const ctx = yield* historyOpt.value.getHistoryContext(sessionID)
          items.push(ctx)
        }

        // Time-aware reply context (Feature 10.12)
        if (sessionID) {
          try {
            const tc = buildTimeContext(sessionID)
            items.push(`<time_context>\n${tc}\n</time_context>`)
          } catch {
            items.push("<time_context>Time tracking unavailable</time_context>")
          }
        }

        // Context window management (Feature 12.1)
        if (sessionID) {
          try {
            const cwOpt = yield* Effect.serviceOption(ContextWindowService)
            if (cwOpt._tag === "Some") {
              const ctx = yield* (cwOpt.value as any).getProjectFiles({ sessionID })
              if (ctx.length > 0) {
                items.push(`<project_files>\n  ${ctx.slice(0, 10).join("\n  ")}\n</project_files>`)
              }
            }
          } catch {
            // context window unavailable — skip
          }
        }

        // Database agent auto-injected context (Feature 12.5)
        if (sessionID) {
          try {
            const miOpt = yield* Effect.serviceOption(MessageIndexerService)
            if (miOpt._tag === "Some") {
              const ctx = yield* (miOpt.value as any).getFullContext(sessionID)
              if (ctx) items.push(ctx)
            }
          } catch {
            // message indexer unavailable — skip
          }
        }

        return items
      }),

      skills: Effect.fn("SystemPrompt.skills")(function* () {
        return undefined
      }),
    })
  }),
)

export const defaultLayer = layer.pipe(
  Layer.provide(Skill.defaultLayer),
  Layer.provide(History.defaultLayer),
)

export const node = LayerNode.make(layer, [Skill.node])

export function autoIndex(input: {
  sessionID: string
  message: { info: { id: string; role: "user" | "assistant"; time: { created: number } }; parts: any[] }
}) {
  // Fire-and-forget — non-blocking, never throws
  try {
    const idxPath = join(homedir(), ".config", "zoya", "index", "messages")
    mkdirSync(idxPath, { recursive: true })
    const text = input.message.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n")
    const hasCode = text.includes("```")
    const hasFiles = input.message.parts.some((p: any) => p.type === "file")
    const topics: string[] = []
    const patterns = [/(?:project|app|site|system|tool)\s+(\w[\w\s-]{1,30}?\w)/gi, /(?:using|with|in)\s+(\w[\w.]{1,20})/gi]
    for (const pat of patterns) {
      const matches = text.matchAll(pat)
      for (const m of matches) { if (m[1] && !topics.includes(m[1])) topics.push(m[1]) }
    }
    const entry = {
      id: input.message.info.id,
      sessionID: input.sessionID,
      role: input.message.info.role,
      timestamp: input.message.info.time.created,
      text: text.substring(0, 2000),
      hasCode,
      hasFiles,
      topics: topics.slice(0, 5),
    }
    const filePath = join(idxPath, `${input.sessionID}.jsonl`)
    appendFileSync(filePath, JSON.stringify(entry) + "\n")
  } catch { /* silent */ }
}

function mkdirSync(path: string, opts?: any) {
  try { require("fs").mkdirSync(path, opts) } catch {}
}

function appendFileSync(path: string, data: string) {
  try { require("fs").appendFileSync(path, data) } catch {}
}

export * as SystemPrompt from "./system"

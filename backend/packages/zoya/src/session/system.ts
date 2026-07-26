import { LayerNode } from "@zoya/core/effect/layer-node"
import { Context, Effect, Layer } from "effect"


import { InstanceState } from "@/effect/instance-state"

import PROMPT_MAIN from "./prompt/main.txt"
import PROMPT_FAST from "./prompt/fast.txt"
import PROMPT_PRO from "./prompt/pro.txt"
import PROMPT_EXPERT from "./prompt/expert.txt"
import type { Provider } from "@/provider/provider"
import type { Agent } from "@/agent/agent"
import { Skill } from "@/skill"

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

let geoCache: { lat: number; lon: number; city: string; region: string; country: string; ts: number } | null = null
let weatherCache: { text: string; ts: number } | null = null
const GEO_TTL = 15 * 60 * 1000
const WTHR_TTL = 30 * 60 * 1000

async function fetchGeo() {
  if (geoCache && Date.now() - geoCache.ts < GEO_TTL) return geoCache
  const res = await fetch("http://ip-api.com/json/", { signal: AbortSignal.timeout(5000) })
  const d = await res.json() as any
  if (!d || d.status === "fail") return geoCache // keep old cache on failure
  geoCache = { lat: d.lat, lon: d.lon, city: d.city, region: d.region, country: d.country, ts: Date.now() }
  return geoCache
}

async function fetchWeather(geo: { lat: number; lon: number }) {
  if (weatherCache && Date.now() - weatherCache.ts < WTHR_TTL) return weatherCache.text
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
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

function getAgentMode(): string {
  return "pro"
}

export function provider(model: Provider.Model, sessionID?: string) {
  const mode = (sessionID && sessionModes.get(sessionID)) || getAgentMode()

  // Layer 1: Shared persona + communication rules
  const layer1 = PROMPT_MAIN.replaceAll("{mode}", mode)

  // Layer 2: Mode-specific instructions
  const layer2 =
    mode === "fast" ? PROMPT_FAST
    : mode === "pro" ? PROMPT_PRO
    : mode === "expert" ? PROMPT_EXPERT
    : PROMPT_FAST

  return [layer1, layer2]
}

export interface Interface {
  readonly environment: (model: Provider.Model) => Effect.Effect<string[]>
  readonly skills: (agent: Agent.Info) => Effect.Effect<string | undefined>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/SystemPrompt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {

    return Service.of({
      environment: Effect.fn("SystemPrompt.environment")(function* (model: Provider.Model) {
        const ctx = yield* InstanceState.context

        // Time, location & weather (auto-fetched, cached)
        const now = new Date()
        const timeStr = now.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
        })

        const geo = yield* Effect.tryPromise({ try: () => fetchGeo(), catch: () => null as any })
        const locStr = geo
          ? `Location: ${geo.city}, ${geo.region}, ${geo.country} (${geo.lat}°N, ${geo.lon}°E)`
          : "Location: unknown"

        const wthrStr = geo
          ? yield* Effect.tryPromise({ try: () => fetchWeather(geo), catch: () => "Weather unavailable" })
          : "Weather unavailable"

        return [
          [
            `<system_env>`,
            `  Time: ${timeStr}`,
            `  Directory: ${ctx.directory}`,
            `  Platform: ${process.platform}`,
            `  ${locStr}`,
            `  Weather: ${wthrStr}`,
            `</system_env>`,
            `Using ${model.api.id} from ${model.providerID}`,
          ].join("\n"),
        ]
      }),

      skills: Effect.fn("SystemPrompt.skills")(function* () {
        return undefined
      }),


    })
  }),
)

export const defaultLayer = layer.pipe(Layer.provide(Skill.defaultLayer))

export const node = LayerNode.make(layer, [Skill.node])

export * as SystemPrompt from "./system"

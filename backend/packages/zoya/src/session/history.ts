import { Effect, Context, Layer } from "effect"
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"
import { homedir } from "os"

// --- User Preferences ---

export interface UserPreferences {
  userName: string
  preferredMode: string
  knownFacts: string[]
  commonTasks: string[]
  lastProject: string
  lastAccessed: number
  homeLocation: string  // user's saved home location (city, country)
  latitude: number       // exact GPS latitude from browser geolocation
  longitude: number      // exact GPS longitude from browser geolocation
  locationAccuracy: number // accuracy in meters
  preferences: Record<string, string>
}

const DEFAULT_PREFS: UserPreferences = {
  userName: "Sir",
  preferredMode: "pro",
  knownFacts: [],
  commonTasks: [],
  lastProject: "",
  lastAccessed: Date.now(),
  homeLocation: "",
  latitude: 0,
  longitude: 0,
  locationAccuracy: 0,
  preferences: {},
}

function prefsPath(): string {
  const dir = join(homedir(), ".config", "zoya")
  try { mkdirSync(dir, { recursive: true }) } catch {}
  return join(dir, "preferences.json")
}

function loadPrefs(): UserPreferences {
  try {
    const p = prefsPath()
    if (!existsSync(p)) return { ...DEFAULT_PREFS }
    return { ...DEFAULT_PREFS, ...JSON.parse(readFileSync(p, "utf-8")) }
  } catch { return { ...DEFAULT_PREFS } }
}

function savePrefs(prefs: UserPreferences): void {
  try { writeFileSync(prefsPath(), JSON.stringify(prefs, null, 2)) }
  catch {}
}

// --- Layer 4: History & Context ---

export interface Interface {
  readonly getUserName: () => Effect.Effect<string>
  readonly setUserName: (name: string) => Effect.Effect<void>
  readonly getPreferences: () => Effect.Effect<UserPreferences>
  readonly updatePreferences: (updates: Partial<UserPreferences>) => Effect.Effect<void>
  readonly getHistoryContext: (sessionID?: string) => Effect.Effect<string>
  readonly rememberFact: (fact: string) => Effect.Effect<void>
  readonly getHomeLocation: () => Effect.Effect<string>
  readonly setHomeLocation: (location: string) => Effect.Effect<void>
  readonly getExactLocation: () => Effect.Effect<{ latitude: number; longitude: number; accuracy: number } | null>
  readonly setExactLocation: (lat: number, lon: number, accuracy: number) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/History") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    let prefs = loadPrefs()

    return Service.of({
      getUserName: Effect.fn("History.getUserName")(function* () {
        return prefs.userName
      }),

      setUserName: Effect.fn("History.setUserName")(function* (name: string) {
        prefs.userName = name
        prefs.lastAccessed = Date.now()
        savePrefs(prefs)
      }),

      getPreferences: Effect.fn("History.getPreferences")(function* () {
        return { ...prefs }
      }),

      updatePreferences: Effect.fn("History.updatePreferences")(function* (updates: Partial<UserPreferences>) {
        prefs = { ...prefs, ...updates, lastAccessed: Date.now() }
        savePrefs(prefs)
      }),

      getHistoryContext: Effect.fn("History.getHistoryContext")(function* (sessionID?: string) {
        const lines: string[] = ["<system_history>"]

        // User info
        lines.push(`  User: ${prefs.userName}`)

        // Known facts about user
        if (prefs.knownFacts.length > 0) {
          lines.push("  Known facts about user:")
          for (const fact of prefs.knownFacts) {
            lines.push(`    - ${fact}`)
          }
        }

        // Common tasks
        if (prefs.commonTasks.length > 0) {
          lines.push("  Common tasks:")
          for (const task of prefs.commonTasks) {
            lines.push(`    - ${task}`)
          }
        }

        // Last project context
        if (prefs.lastProject) {
          lines.push(`  Last project: ${prefs.lastProject}`)
        }

        lines.push("</system_history>")
        return lines.join("\n")
      }),

      rememberFact: Effect.fn("History.rememberFact")(function* (fact: string) {
        if (!prefs.knownFacts.includes(fact)) {
          prefs.knownFacts.push(fact)
          if (prefs.knownFacts.length > 20) prefs.knownFacts = prefs.knownFacts.slice(-20)
          prefs.lastAccessed = Date.now()
          savePrefs(prefs)
        }
      }),

      getHomeLocation: Effect.fn("History.getHomeLocation")(function* () {
        return prefs.homeLocation || ""
      }),

      setHomeLocation: Effect.fn("History.setHomeLocation")(function* (location: string) {
        prefs.homeLocation = location
        prefs.lastAccessed = Date.now()
        savePrefs(prefs)
      }),

      getExactLocation: Effect.fn("History.getExactLocation")(function* () {
        if (prefs.latitude === 0 && prefs.longitude === 0) return null
        return { latitude: prefs.latitude, longitude: prefs.longitude, accuracy: prefs.locationAccuracy }
      }),

      setExactLocation: Effect.fn("History.setExactLocation")(function* (lat: number, lon: number, accuracy: number) {
        prefs.latitude = lat
        prefs.longitude = lon
        prefs.locationAccuracy = accuracy
        // Auto-set home location on first exact location
        if (!prefs.homeLocation) {
          prefs.homeLocation = `${lat.toFixed(4)}, ${lon.toFixed(4)}`
        }
        prefs.lastAccessed = Date.now()
        savePrefs(prefs)
      }),
    })
  }),
)

export const defaultLayer = layer

export * as History from "./history"

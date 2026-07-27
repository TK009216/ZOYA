import { Effect, Context, Layer, Schema } from "effect"
import { join } from "path"
import { homedir } from "os"
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from "fs"

const SELF_DIR = join(homedir(), ".config", "zoya", "self")

export const SelfToolExecuteType = Schema.Literals(["bash", "prompt"])

const PARAM_TYPES = ["string", "number", "boolean"] as const
export const SelfToolParam = Schema.Struct({
  type: Schema.Literals(PARAM_TYPES),
  description: Schema.String,
  required: Schema.optional(Schema.Boolean),
})

export const SelfToolDef = Schema.Struct({
  description: Schema.String,
  parameters: Schema.Record(Schema.String, SelfToolParam),
  execute: Schema.Struct({
    type: SelfToolExecuteType,
    script: Schema.String,
  }),
})
export type SelfToolDef = Schema.Schema.Type<typeof SelfToolDef>

export const SelfAgentDef = Schema.Struct({
  description: Schema.String,
  mode: Schema.Literals(["fast", "pro", "expert", "expert-2"]),
  systemPrompt: Schema.String,
  tools: Schema.optional(Schema.Array(Schema.String)),
  permissions: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})
export type SelfAgentDef = Schema.Schema.Type<typeof SelfAgentDef>

export interface Interface {
  createTool(name: string, def: SelfToolDef): Effect.Effect<string>
  createAgent(name: string, def: SelfAgentDef): Effect.Effect<string>
  listTools(): Effect.Effect<string[]>
  listAgents(mode?: string): Effect.Effect<string[]>
  getToolDef(name: string): Effect.Effect<SelfToolDef | null>
  getAgentDef(name: string): Effect.Effect<SelfAgentDef | null>
  getToolDescription(name: string): Effect.Effect<string>
  getAgentDescription(name: string): Effect.Effect<string>
  deleteTool(name: string): Effect.Effect<void>
  deleteAgent(name: string): Effect.Effect<void>
  refreshCache(): Effect.Effect<void>
  runSelfTool(name: string, args: Record<string, string>): Effect.Effect<string>
}

export class Service extends Context.Service<Service, Interface>()("@zoya/SelfBuilder") {}

function ensureDir(dir: string) {
  try { mkdirSync(dir, { recursive: true }) } catch { }
}

function readJSON<T>(path: string): T | null {
  try { return JSON.parse(readFileSync(path, "utf-8")) as T } catch { return null }
}

function writeJSON(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function readText(path: string): string {
  try { return readFileSync(path, "utf-8").trim() } catch { return "" }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch { return [] }
}

const decodeToolDef = Schema.decodeUnknownExit(SelfToolDef)
const decodeAgentDef = Schema.decodeUnknownExit(SelfAgentDef)

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {

    ensureDir(join(SELF_DIR, "tools"))
    ensureDir(join(SELF_DIR, "agents", "fast"))
    ensureDir(join(SELF_DIR, "agents", "pro"))
    ensureDir(join(SELF_DIR, "agents", "expert"))
    ensureDir(join(SELF_DIR, "agents", "expert-2"))

    function buildDescription(def: SelfToolDef): string {
      const params = Object.entries(def.parameters)
        .map(([k, v]) => `${k}: ${v.type}${v.required ? "" : "?"}`)
        .join(", ")
      return `${def.description} | Parameters: ${params} | Execution: ${def.execute.type}`
    }

    const svc: Interface = {
      createTool: Effect.fn("SelfBuilder.createTool")(function* (name: string, def: SelfToolDef) {
        const dir = join(SELF_DIR, "tools", name)
        ensureDir(dir)
        writeJSON(join(dir, "definition.json"), def)
        writeFileSync(join(dir, "description.txt"), buildDescription(def), "utf-8")
        return dir
      }),

      createAgent: Effect.fn("SelfBuilder.createAgent")(function* (name: string, def: SelfAgentDef) {
        const dir = join(SELF_DIR, "agents", def.mode, name)
        ensureDir(dir)
        writeJSON(join(dir, "definition.json"), def)
        writeFileSync(join(dir, "description.txt"), def.description, "utf-8")
        return dir
      }),

      listTools: Effect.fn("SelfBuilder.listTools")(function* () {
        return listDirs(join(SELF_DIR, "tools"))
      }),

      listAgents: Effect.fn("SelfBuilder.listAgents")(function* (mode?: string) {
        if (mode) return listDirs(join(SELF_DIR, "agents", mode))
        const all: string[] = []
        for (const m of ["fast", "pro", "expert", "expert-2"]) {
          for (const name of listDirs(join(SELF_DIR, "agents", m))) {
            all.push(`${m}/${name}`)
          }
        }
        return all
      }),

      getToolDef: Effect.fn("SelfBuilder.getToolDef")(function* (name: string) {
        const def = readJSON<SelfToolDef>(join(SELF_DIR, "tools", name, "definition.json"))
        if (!def) return null
        const decoded = decodeToolDef(def)
        if (decoded._tag === "Success") return decoded.value
        return null
      }),

      getAgentDef: Effect.fn("SelfBuilder.getAgentDef")(function* (name: string) {
        for (const m of ["fast", "pro", "expert", "expert-2"]) {
          const def = readJSON<SelfAgentDef>(join(SELF_DIR, "agents", m, name, "definition.json"))
          if (def) {
            const decoded = decodeAgentDef(def)
            if (decoded._tag === "Success") return decoded.value
          }
        }
        return null
      }),

      getToolDescription: Effect.fn("SelfBuilder.getToolDescription")(function* (name: string) {
        return readText(join(SELF_DIR, "tools", name, "description.txt"))
      }),

      getAgentDescription: Effect.fn("SelfBuilder.getAgentDescription")(function* (name: string) {
        return readText(join(SELF_DIR, "agents", name, "description.txt"))
      }),

      deleteTool: Effect.fn("SelfBuilder.deleteTool")(function* (name: string) {
        const dir = join(SELF_DIR, "tools", name)
        if (existsSync(dir)) rmSync(dir, { recursive: true })
      }),

      deleteAgent: Effect.fn("SelfBuilder.deleteAgent")(function* (name: string) {
        for (const m of ["fast", "pro", "expert", "expert-2"]) {
          const dir = join(SELF_DIR, "agents", m, name)
          if (existsSync(dir)) rmSync(dir, { recursive: true })
        }
      }),

      refreshCache: Effect.fn("SelfBuilder.refreshCache")(function* () {
      }),

      runSelfTool: Effect.fn("SelfBuilder.runSelfTool")(function* (name: string, args: Record<string, string>) {
        const def = yield* svc.getToolDef(name)
        if (!def) return `Tool "${name}" not found`

        let script = def.execute.script
        for (const [k, v] of Object.entries(args)) {
          script = script.replaceAll(`$${k}`, v)
        }

        if (def.execute.type === "bash") {
          const mod = yield* Effect.promise(() => import("child_process"))
          try {
            const out = yield* Effect.promise(() =>
              new Promise<string>((resolve) => {
                try {
                  const result = (mod as any).execSync(script, { encoding: "utf-8", timeout: 30000 })
                  resolve(String(result))
                } catch (e: any) {
                  resolve(`Exit code ${e.status}: ${e.stderr?.toString() ?? e.message}`)
                }
              })
            )
            return out
          } catch (e: any) {
            return `Execution error: ${e.message}`
          }
        }

        if (def.execute.type === "prompt") {
          return `Prompt template:\n${script}`
        }

        return `Unknown execute type: ${def.execute.type}`
      }),
    }

    return Service.of(svc)
  }),
)

export const defaultLayer = Layer.suspend(() => layer)

export * as SelfBuilder from "./self-builder"

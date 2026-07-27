import { readFileSync, existsSync, readdirSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { homedir } from "os"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DEF_TOOLS_SYS = join(ROOT, "definitions", "tools", "system")
const DEF_AGENTS_SYS = join(ROOT, "definitions", "agents", "system")
const SELF_DIR = join(homedir(), ".config", "zoya", "self")

function readSubdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch { return [] }
}

function readDesc(dir: string): string {
  try { return readFileSync(join(dir, "description.txt"), "utf-8").trim() }
  catch { return "" }
}

function buildToolsSection(): string {
  const sysTools = readSubdirs(DEF_TOOLS_SYS)
  const selfDir = join(SELF_DIR, "tools")
  const selfTools = existsSync(selfDir) ? readSubdirs(selfDir) : []

  const all = [
    ...sysTools.map(n => ({ name: n, desc: readDesc(join(DEF_TOOLS_SYS, n)) })),
    ...selfTools.map(n => ({ name: n, desc: readDesc(join(selfDir, n)) })),
  ]

  if (!all.length) return ""

  const lines = ["**🔧 ZOYA Ke Apne Tools:**"]
  for (const t of all) {
    lines.push(`- **${t.name}** — ${t.desc}`)
  }
  return lines.join("\n")
}

function buildAgentsSection(mode: string): string {
  const sysDir = join(DEF_AGENTS_SYS, mode)
  const sysAgents = existsSync(sysDir) ? readSubdirs(sysDir) : []

  const selfDir = join(SELF_DIR, "agents", mode)
  const selfAgents = existsSync(selfDir) ? readSubdirs(selfDir) : []

  const all = [
    ...sysAgents.map(n => ({ name: n, desc: readDesc(join(sysDir, n)) })),
    ...selfAgents.map(n => ({ name: n, desc: readDesc(join(selfDir, n)) })),
  ]

  if (!all.length) return ""

  const lines = ["", "**🤖 Agents — ZOYA ki Team:**", "", "| Agent | Kya Karta Hai | Kab Deploy Karna Hai |", "|-------|--------------|---------------------|"]
  for (const a of all) {
    const parts = a.desc.split("🚀")
    const what = parts[0]?.trim() ?? a.desc
    const when = parts[1]?.trim() ?? ""
    lines.push(`| **${a.name}** | ${what} | ${when} |`)
  }
  return lines.join("\n")
}

export function buildToolAgentSection(mode: string): string {
  const tools = buildToolsSection()
  const agents = buildAgentsSection(mode)
  return tools + agents
}

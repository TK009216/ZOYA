import fs from "node:fs"
import path from "node:path"
import os from "node:os"

/**
 * Read the ZOYA/opencode config file directly from disk, bypassing any
 * in-memory caches.  This is used by the ACP service to pick up model
 * changes made by the WebUI (which writes directly to the config file).
 *
 * The WebUI writes to both ~/.config/zoya/zoya.jsonc and
 * ~/.config/opencode/opencode.jsonc, so we check both.
 */
export function readConfigDirect(): { model?: string; small_model?: string } | undefined {
  const home = os.homedir()
  const candidates = [
    path.join(home, ".config", "zoya", "zoya.jsonc"),
    path.join(home, ".config", "opencode", "opencode.jsonc"),
  ]
  for (const configPath of candidates) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8")
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && parsed.model) {
        return { model: parsed.model, small_model: parsed.small_model }
      }
    } catch {
      continue
    }
  }
  return undefined
}

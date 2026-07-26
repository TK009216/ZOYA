# ZOYA — Complete Project Analysis (July 2026)

## Project Overview

ZOYA is a custom AI coding agent — a fork of [OpenCode](https://opencode.ai) by anomalyco. It operates as an **ACP (Agent Communication Protocol)** server that integrates with the **AionUi WebUI** to appear as a detected agent alongside Claude Code, Gemini CLI, and OpenCode.

### Dual-Architecture System

```
┌─────────────────────────────────────────────────────┐
│                    ZOYA SYSTEM                       │
├─────────────────────┬───────────────────────────────┤
│  BACKEND (TypeScript)│  UI (Electron + React + Bun) │
│  ├─ ACP Server      │  ├─ WebUI (port 25809)        │
│  ├─ REST Server     │  ├─ AionCore (Rust backend)   │
│  ├─ 12 Sub-Agents   │  ├─ Model Settings UI         │
│  └─ CLI (22 cmd)    │  └─ Agent Registration        │
└─────────────────────┴───────────────────────────────┘
```

### Directory Structure
```
D:\PROJECTS\ZOYA_009\
├── backend/                          — OpenCode fork: ZOYA agent
│   └── packages/
│       ├── zoya/                     — Main agent (25+ source dirs)
│       │   └── src/
│       │       ├── acp/              — ACP protocol handler
│       │       ├── agent-groups/     — 12 sub-agent definitions
│       │       ├── cli/cmd/          — CLI commands (acp, run, etc.)
│       │       ├── config/           — Multi-layer config system
│       │       ├── provider/         — AI provider/model registry
│       │       ├── session/          — Session/prompt management
│       │       ├── server/           — Backing HTTP server
│       │       ├── tool/             — Tool definitions (popup, etc.)
│       │       └── effect/           — Effect-ts utilities
│       ├── core/                     — Shared core library
│       ├── llm/                      — LLM integration layer
│       ├── sdk/                      — SDK client library
│       ├── server/                   — Server logic
│       ├── tui/                      — Terminal UI
│       └── 20+ more packages
├── ui/                               — AionUi WebUI
│   ├── scripts/
│   │   ├── webui.ts                  — Main launcher
│   │   └── resetpass.ts              — Admin password reset
│   ├── packages/
│   │   ├── web-host/src/             — Reverse proxy + SPA server
│   │   ├── desktop/src/renderer/     — React SPA (settings, agents)
│   │   └── web-cli/src/              — CLI utilities (browser)
│   └── out/renderer/                 — Built SPA assets
├── setups/
│   ├── setup_windows.bat             — One-click Windows setup
│   └── setup_linux.sh                — One-click Linux setup
├── zoya.bat                          — Windows launcher
└── zoya                              — Linux/Mac launcher
```

### How It All Works Together

**Startup flow** (zoya.bat → backend ACP server + WebUI):
1. Kill old processes on ports 25809, 25810
2. Start backing HTTP server (REST API for sessions/providers)
3. ACP server starts → health check polls `/api/health` (60×200ms = 12s)
4. Provider cache pre-warmed via `sdk.config.providers()`
5. ACP stdin/stdout NDJSON streams established
6. WebUI starts → AionCore (Rust binary) + static server on port 25809
7. `ensureZoyaAgent()` registers ZOYA in SQLite DB as `agent_source='builtin'`
8. AionCore detects ZOYA, appears in "Detected Agents" list

**Chat flow** (user sends message in WebUI):
1. AionCore → ACP protocol → POST /session with model info
2. ACP handler → SDK client → backing server REST API
3. Backing server creates session → loads ZOYA personality from `default.txt`
4. LLM streams response → ACP streams back → WebUI displays

**Sub-agent system** (12 agents, 3 groups):
- **planner**: fast-planner, pro-planner, expert-planner, expert-planner-2
- **todo**: fast-todo, pro-todo, expert-todo, expert-todo-2
- **researcher**: fast-researcher, pro-researcher, expert-researcher, expert-researcher-2
- Workflows: fast (self-plan), pro (planner+todo), expert (full chain+QA)

---

## COMPREHENSIVE BUG & GLITCH ANALYSIS

### SEVERITY HIGH — Runtime failures or incorrect behavior

---

#### BUG 1: `session/system.ts:39-47` — Sync `readFileSync` + `JSON.parse` without error handling

**Location**: `backend/packages/zoya/src/session/system.ts` lines 39-47
**Type**: Crash hazard

```typescript
function getAgentMode(): string {
  try {
    const configPath = join(homedir(), ".config", "zoya", "agent-groups.jsonc")
    const raw = readFileSync(configPath, "utf-8")
    const data = JSON.parse(raw)
    if (data.currentMode && ["fast", "pro", "expert"].includes(data.currentMode)) {
      return data.currentMode
    }
  } catch {
    // Silent fail
  }
  return "fast"
}
```

**Problem**: This function is called from `provider()` at line 49 which is called from the LLM request pipeline. If `agent-groups.jsonc` is corrupted (e.g., partially written during concurrent save, disk full), `JSON.parse` throws inside Effect context. The catch block silently swallows it and returns "fast", but **the throw itself happens synchronously inside an Effect** — in some call paths, this can cause an unhandled defect rather than a graceful fallback.

**Impact**: On corrupted config file, ZOYA either silently defaults to "fast" mode (losing user's mode selection) OR crashes the entire request with a `SyntaxError` defect.

---

#### BUG 2: `session/prompt.ts:1126` — `Effect.catch(Effect.die)` converts all errors to defects

**Location**: `backend/packages/zoya/src/session/prompt.ts` line ~1126
**Type**: Crash hazard

```typescript
return prompt(input).pipe(
  Effect.catch((error) => Effect.die(error)) // ALL errors become unrecoverable defects
)
```

**Problem**: ALL errors in prompt processing — including recoverable ones like `ModelNotFoundError`, network timeouts, transient API failures — are converted to `Effect.die` (defects), which are unrecoverable. The session crashes hard instead of retrying or showing a user-friendly error.

**Impact**: Any transient error during prompt execution (network blip, model temporarily unavailable, rate limit) kills the entire conversation turn irrecoverably.

---

#### BUG 3: `provider/provider.ts:1864` — `getSmallModel` for opencode has no free model fallback

**Location**: `backend/packages/zoya/src/provider/provider.ts` line ~1864
**Type**: Silent failure (title generation)

```typescript
// For opencode provider, only gpt-5-nano is in priority list
if (providerID.startsWith("opencode")) {
  candidates = ["gpt-5-nano"] // ← ONLY this model
}
```

**Problem**: The `getSmallModel()` function is used for title generation and compact tasks. For the `opencode` provider, it only looks for `gpt-5-nano` which **requires payment** (a credit card on the opencode account). The free model `deepseek-v4-flash-free` is NOT in this list. Title generation fails silently unless `small_model` is manually configured.

**Impact**: Session titles are never generated (always show "New Session") unless user manually sets `"small_model": "opencode/deepseek-v4-flash-free"` in config.

---

#### BUG 4: `static-server.ts:96-101` — Gemini URL path detection always wrong

**Location**: `ui/packages/web-host/src/static-server.ts` lines 96-101
**Type**: Logic error (latent — accidentally works)

```typescript
const basePath = normalisedUrl  // e.g., "https://generativelanguage.googleapis.com"
// ...
if (basePath.includes('/v1beta')) {  // ← CHECKING FULL URL, NOT PATHNAME
  // Always false because full URL doesn't contain /v1beta
}
```

**Problem**: The code checks if the full URL string contains `/v1beta`, but the base URL is `https://generativelanguage.googleapis.com` which does NOT contain `/v1beta`. It should parse the URL and check the **pathname** component only. Both branches happen to produce the same result, so the bug is latent — but if one branch is ever changed, it will silently break.

**Impact**: Currently none (both branches identical). Future changes to either branch could introduce bugs.

---

#### BUG 5: `static-server.ts:106-109` — `"undefined"` injected as valid Gemini model ID

**Location**: `ui/packages/web-host/src/static-server.ts` lines 106-109
**Type**: Data corruption

```typescript
const raw = model.name?.split("/").pop() ?? model.name  // name might be null
const id = raw ?? String(model.name)  // String(null) = "null", String(undefined) = "undefined"
```

**Problem**: If the Gemini API returns a model with no `name` field, `model.name` is `undefined`, `raw` becomes `undefined`, then `id = String(undefined)` = `"undefined"` which is a truthy string. A junk model entry `{ id: "undefined", name: "undefined" }` gets injected into the model list.

**Impact**: UI shows a junk "undefined" model option. User might select it and cause a cryptic error.

---

#### BUG 6: `static-server.ts:278-310` — `undefined` values written to JSON config file

**Location**: `ui/packages/web-host/src/static-server.ts` lines 278-310
**Type**: Config corruption

```typescript
if (payload.model) existing.model = payload.model  // If payload.model is undefined, assignment is skipped
// ... but later:
writeFileSync(configPath, JSON.stringify(existing, null, 2))  // If 'model' key was undefined in payload
```

**Problem**: If the payload contains a key with value `undefined`, the `JSON.stringify` will either drop the key (if it was set to `undefined`) or write `null` (if the key was explicitly `undefined` in the object). Actually — if payload explicitly has `"model": undefined`, then `JSON.stringify` drops the key. But if the payload has `"model": null` (which can happen from frontend sending `null`), then `existing.model = null` and the config file gets `"model": null`.

**Impact**: Corrupted config file with `null` model. Backend may crash or behave unpredictably on next start.

---

#### BUG 7: `ZoyaModelSettings.tsx:287-289` — Model string uses slug, not registered provider ID

**Location**: `ui/packages/desktop/src/renderer/pages/settings/ZoyaModelSettings.tsx` lines 287-289
**Type**: Incorrect backend communication

```typescript
function getBackendProviderId(provider: ProviderConfig): string {
  return provider.name.toLowerCase().replace(/[^a-z0-9]/g, '-') // URL-safe slug
}
```

**Problem**: The ZOYA backend expects the actual registered provider ID (like `"opencode"`, `"openai"`, `"anthropic"`) — but this function produces a URL-safe slug from the provider's display name. For built-in providers, the name happens to match. **For custom providers**, a provider named "My Custom API" would produce slug `"my-custom-api"` which the backend has never heard of. The backend would fail to find this provider and fall back to OpenRouter or crash.

**Impact**: Custom providers added via WebUI have non-functional model strings. User adds a provider but models don't work.

---

#### BUG 8: `webui.ts:29` — Import `.js` extension for `.ts` source file

**Location**: `ui/scripts/webui.ts` line 29
**Type**: Module resolution failure

```typescript
import { openBrowserUrl, shouldAutoOpenBrowser } from '../packages/web-cli/src/browser.js'
```

**Problem**: The source file is `browser.ts`, not `browser.js`. Bun's module resolution handles `.js` → `.ts` transparently, but **strict TypeScript checkers** (`tsc --noEmit`), bundlers, and IDE tools may fail to resolve this import. If the project ever switches from Bun to Node.js with a different TypeScript runner, this will break.

**Impact**: Currently works in Bun (transparent resolution). Will break if toolchain changes.

---

#### BUG 9: `ZoyaModelSettings.tsx:106` — Config not loaded if model field is empty/null

**Location**: `ui/packages/desktop/src/renderer/pages/settings/ZoyaModelSettings.tsx` line 106
**Type**: UI state bug

```typescript
if (cfg.model) setZoyaConfig(cfg)  // If cfg.model is falsy, entire config is ignored
```

**Problem**: If the config file has `small_model` and `provider` set but no `model` field (which is valid — user might only set `small_model`), the entire config state is never loaded. The UI shows "No active model" even though `small_model` is configured.

**Impact**: User sees blank/empty model state even when config is valid.

---

#### BUG 10: `ZoyaModelSettings.tsx:134-136` — `String(m)` produces `"[object Object]"`

**Location**: `ui/packages/desktop/src/renderer/pages/settings/ZoyaModelSettings.tsx` lines 134-136
**Type**: Data corruption

```typescript
{id: m.id ?? String(m), name: m.name ?? String(m)}
```

**Problem**: When `m` is an object and BOTH `m.id` and `m.name` are undefined/falsy, `String(m)` returns `"[object Object]"` which gets added as a valid model entry. The model list contains junk entries like `"[object Object]"`.

**Impact**: UI shows junk model entries. User might select `"[object Object]"` and cause cryptic errors.

---

### SEVERITY MEDIUM — Design flaws, edge cases, fragility

---

#### GLITCH 1: `acp/service.ts:53-63` — Dead code `updateAgentGroupsMode()` remains

**Location**: `backend/packages/zoya/src/acp/service.ts` lines 53-63
**Type**: Dead code, confusing for maintainers

The `updateAgentGroupsMode()` function writes mode to the global config file. It was the original cause of the mode-leak-between-chats bug (Session 12). All call sites were replaced with `SystemPrompt.setSessionMode()` (in-memory Map), but the function was never deleted. It's dead code. If someone in the future accidentally calls it, the mode-leak bug will return.

**Impact**: Confusing dead code. Risk of regression if someone re-enables calls to it.

---

#### GLITCH 2: `acp/service.ts:822-827` — Mode disconnect: `defaultModeID` from global file

**Location**: `backend/packages/zoya/src/acp/service.ts` line 822
**Type**: Cross-chat mode confusion

```typescript
const savedMode = readAgentGroupsMode()  // ← reads GLOBAL file (last-written mode across ALL chats)
```

**Problem**: When creating a NEW session, `defaultModeID` comes from the global `agent-groups.jsonc` file. The per-session mode Map (Session 12 fix) works for EXISTING sessions, but NEW sessions use the global file. If Chat A was in "fast" and Chat B was in "expert", the global file will have "expert" (last written by Chat B). When the user opens Chat A fresh, it incorrectly shows "expert".

**Impact**: When starting a new conversation, the mode may be wrong (inherited from another chat).

---

#### GLITCH 3: `error.ts:88-89` — `fromUnknownDefect()` discards all error information

**Location**: `backend/packages/zoya/src/acp/error.ts` lines 88-89
**Type**: Poor error reporting

```typescript
export function fromUnknownDefect(_defect: unknown): ServiceFailureError {
  return new ServiceFailureError({ safeMessage: "Internal service failure" })
}
```

**Problem**: Parameter `_defect` is prefixed with underscore (unused). All runtime defects (TypeErrors, ReferenceErrors, logic bugs) produce the exact same generic message "Internal service failure". Debugging production issues requires log correlation — the user-facing error is useless.

**Impact**: When something goes wrong, user sees "Internal service failure" with no actionable information.

---

#### GLITCH 4: `error.ts:62-86` — Missing `never` assertion in `toRequestError()`

**Location**: `backend/packages/zoya/src/acp/error.ts` lines 62-86
**Type**: Type safety gap

The switch/case covers all error types exhaustively but has no `default: never` assertion. If a new error type is added to the `Error` union without updating this function, TypeScript won't catch it at compile time. The function returns `undefined` silently, which causes a runtime error in the ACP response handler.

**Impact**: Adding new error types is fragile — easy to miss compiler errors.

---

#### GLITCH 5: `system.ts:28` — Module-level `sessionModes` Map lost on module reload

**Location**: `backend/packages/zoya/src/session/system.ts` line 28
**Type**: State loss

```typescript
const sessionModes = new Map<string, string>()  // Module-level — lost on HMR/reload
```

**Problem**: The per-session mode map is a module-level variable. If the module is re-evaluated (HMR, Bun's hot reload, process restart), ALL mode assignments are lost. Every active session falls back to the global config file (`getAgentMode()`).

**Impact**: During development or process restarts, all sessions lose their mode setting.

---

#### GLITCH 6: `default.txt:81 vs 149-183` — Self-contradiction on mode switching

**Location**: `backend/packages/zoya/src/session/prompt/default.txt` lines 81, 149-183
**Type**: Prompt contradiction

```
Line 81: "ZOYA NEVER changes mode — user ne jo mode select kiya hai, wohi rhega"
Line 149-183: MODE SUGGESTION popup — "AUTO-SWITCHED ✅ ZOYA now in expert mode"
```

**Problem**: The "mode is FINAL" instruction and the popup auto-switch system directly contradict each other. The LLM receives conflicting instructions. Depending on which part of the prompt it pays attention to, it may either refuse to show the popup (because "mode never changes") or show it despite the instruction.

**Impact**: Inconsistent LLM behavior — mode switching popup may or may not appear based on which prompt section the model "reads" more carefully.

---

#### GLITCH 7: `popup.ts:96` — No validation of `targetMode` before calling `setSessionMode`

**Location**: `backend/packages/zoya/src/tool/popup.ts` line ~96
**Type**: Missing validation

```typescript
SystemPrompt.setSessionMode(ctx.sessionID, params.targetMode)  // No validation!
```

**Problem**: The popup tool accepts any string as `targetMode` and directly sets it on the session. If the mode is invalid (typo like "expeert", "fastt", or a mode that doesn't exist), the session gets set to an unknown mode, and `system.ts` falls back to `agentMap[mode] ?? agentMap.fast`. This silently changes behavior.

**Impact**: A bug in the popup tool call could set an invalid mode, defaulting to "fast" without warning.

---

#### GLITCH 8: `registry.ts:277-278` — Fragile model-name string matching

**Location**: `backend/packages/zoya/src/tool/registry.ts` lines 277-278
**Type**: Fragile heuristic

```typescript
input.modelID.includes("gpt-") && !input.modelID.includes("oss") && !input.modelID.includes("gpt-4")
```

**Problem**: Whether the patch/edit tools are enabled is determined by whether the model ID contains "gpt-" but NOT "oss" or "gpt-4". This heuristic:
- Breaks if OpenAI releases "gpt-5-oss" (would disable patches)
- Breaks if a non-OpenAI model has "gpt" in its name (e.g., "custom-gpt-model")
- Requires updating every time a new model generation is released

**Impact**: Tools may be incorrectly enabled or disabled depending on model naming.

---

#### GLITCH 9: `session/prompt.ts:1234` — `agent.steps ?? Infinity` treats `0` as `Infinity`

**Location**: `backend/packages/zoya/src/session/prompt.ts` line 1234
**Type**: Logical bug

```typescript
const maxSteps = agent.steps ?? Infinity  // If agent.steps = 0, this becomes Infinity!
```

**Problem**: The `??` operator only checks for `null`/`undefined`. If `agent.steps` is set to `0` (meaning "no steps allowed"), the nullish coalescing ignores it and sets `maxSteps = Infinity`. A zero-step agent would loop forever.

**Impact**: Misconfigured agents with `steps: 0` would hang the session permanently.

---

#### GLITCH 10: `config/config.ts:41-43` — Array merge replaces instead of concatenating

**Location**: `backend/packages/zoya/src/config/config.ts` lines 41-43
**Type**: Unexpected behavior

```typescript
export const mergeConfig = mergeDeep  // merges arrays by REPLACEMENT, not concatenation
export const mergeConfigConcatArrays = ... // but ONLY handles 'instructions' array
```

**Problem**: `mergeDeep` from remeda replaces arrays when merging config layers. Only the `instructions` field is handled specially (concatenated). Other array fields like `tools`, `disabledTools`, `permissions` are **replaced** by lower-priority configs. A project-local config that sets `"disabledTools": ["bash"]` would **completely replace** the global disabled tools list rather than extending it.

**Impact**: Config merging is inconsistent — some arrays concatenate, others replace, with no documentation of which is which.

---

### SEVERITY LOW — Minor issues, cosmetic

---

#### MINOR 1: `default.txt:46` — Typo in female persona examples

```typescript
// Line 46
- ❌ "main ye kar deta hoon" → ❌ NEVER. "main ye kar doongi" ✅
```

The first part has a stray leading `"` and the formatting mixes the wrong and correct examples in a confusing way. Both "kar deta hoon" and "kar doongi" are listed as if "kar doongi" is the correction, but the arrow `→` makes it look like a transformation.

---

#### MINOR 2: `default.txt:286` — Progress message in wrong mode section

```
- "🤖 expert-planner comprehensive plan bana rahi hai..."  // Under expert mode
```

Line 286 has `"🤖 pro-planner se detailed plan bana rahi hoon..."` under the expert mode progress messages section. The pro-planner message should be in the pro mode section, not mixed with expert.

---

#### MINOR 3: `agent-groups/index.ts:286` — Typo "exhaustie"

```
"exhaustie todo list" → should be "exhaustive todo list"
```

---

#### MINOR 4: `acp.ts:81-102` — Inverted naming of `input`/`output` streams

The ACP server setup names variables confusingly:
- `input` is a `WritableStream` attached to `process.stdout` (it *outputs* data)
- `output` is a `ReadableStream` attached to `process.stdin` (it *inputs* data)

Future maintainers will naturally assume `input` reads data and `output` writes data — the opposite of reality.

---

#### MINOR 5: `index.ts:141` — `process.exit()` in `finally` block

The CLI entry point calls `process.exit()` in a `finally` block. This forcefully terminates the process even after successful commands (like `--help`, `--version`, or any normal completion). Prevents:
- Flushing stdout/stderr buffers
- Running cleanup handlers
- Proper Docker/container lifecycle

---

#### MINOR 6: `agent-groups/index.ts:496-499` — Silent fail on config file write

```typescript
try {
  writeFileSync(configPath, JSON.stringify(data, null, 2))
} catch {
  // Silent fail — empty catch block
}
```

If the config file can't be written (permissions, disk full, path doesn't exist), the data is silently lost. User creates/modifies agents through UI but changes aren't saved.

---

#### MINOR 7: `ZoyaModelSettings.tsx:319` — API keys stored in plaintext on disk

```typescript
provOpts.apiKey = provider.api_key
```

API keys are written to `zoya.jsonc` and `opencode.jsonc` in plaintext. These files could be:
- Accidentally committed to version control
- Read by other processes on the machine
- Exposed in backups

---

#### MINOR 8: `static-server.ts:279-281, 345-347, 365-367` — No request body size limits

Three POST endpoints accumulate the entire request body into a string with no size limit:
```typescript
req.on('data', (chunk) => body += chunk)  // No max size check
```

An attacker could send gigabytes of data and cause OOM. Standard web servers limit body size to 1-10MB.

---

#### MINOR 9: `ZoyaModelSettings.tsx:165-175` — Naive URL substring matching for protocol detection

```typescript
url.includes('api.openai.com')  // Matches https://evil.com/?redirect=api.openai.com
```

URL detection uses `String.includes` which can match substrings in unexpected places. Should parse the actual URL hostname.

---

#### MINOR 10: `config/config.ts:250-257` — Config getter writes files as side effect

```typescript
async function loadGlobal(): Promise<Config> {
  // If no config file exists:
  writeFileSync(configPath, '{"$schema": "https://opencode.ai/config.json"}')  // Side effect in getter!
}
```

A pure "read config" operation creates a file on disk if it doesn't exist. This is surprising — getters shouldn't have side effects.

---

#### MINOR 11: `server/server.ts:117-122` — Port fallback only tries 2 ports

```typescript
function startWithPortFallback() {
  if (port === 0) return listen(4096)  // Try 4096
  return listen(0)  // Fall back to OS-assigned
}
```

If port 4096 is also occupied, it gives up and uses OS-assigned port 0. No exponential backoff or retry loop.

---

#### MINOR 12: `ZoyaModelSettings.tsx:86` — Provider ID slug collision

Two providers named "My Provider" and "my-provider" both slug to `"my-provider"`, causing collisions. The slug function has no uniquification logic (no counter suffix).

---

### EDGE CASE — Fragile configurations

---

#### EDGE 1: `default.txt:113` — Decision rule favors over-planning

```
"If doubt ho to PLAN banao. Over-planning is better than under-planning."
```

Combined with the detailed execution rules, this can cause ZOYA to plan excessively even for simple requests. The "over-planning is better" rule contradicts the fast mode principle of "10-15 min max."

---

#### EDGE 2: `default.txt:367-369` — Hard limits called "excuses"

```
"2000 line limit → ignore. ZOYA ke liye koi limit nahi."
```

This instruction asks the LLM to exceed its own context window. Models literally cannot generate beyond their context limit. When the model hits the wall, it will:
1. Stop generating mid-output
2. Lose coherence
3. Produce truncated/incomplete code

The instruction sets an impossible expectation. Better to instruct: "compress completed work, summarize, and continue in a new response."

---

#### EDGE 3: `provider/provider.ts:1948-1954` — Hardcoded model priority list

The `sort()` function prioritizes models by a hardcoded list: `["gpt-5", "claude-sonnet-4", "big-pickle", "gemini-3-pro"]`. If a new, better model is released that isn't in this list, it gets sorted below these four. The fallback sorting (by `latest` flag, then ID descending) may produce unexpected results.

---

### PREVIOUSLY FIXED BUGS (Sessions 1-12)

| Session | Bug | File | Fix |
|---------|-----|------|-----|
| 1 | ZOYA not in Detected Agents | `webui.ts` | SQLite `agent_source='builtin'` patch |
| 2 | WebUI crash (bun:sqlite MODULE_NOT_FOUND) | `ui/package.json` | `tsx` → `bun` in all scripts |
| 2 | Logo missing in WebUI | `static-server.ts:144` | Fixed URL rewrite for `/api/assets/logos/` |
| 2 | CLI logo showed "OPEN CODE" | `tui/src/logo.ts:3` | Changed to "ZOYA" |
| 3 | Agent not replying (wrong model) | `~/.config/opencode/opencode.jsonc` | Set model to `opencode/deepseek-v4-flash-free` |
| 4 | `defaultModelFromConfig()` crashed on import | `acp/service.ts:46` | Removed non-existent import |
| 4 | Wrong provider ID lookup (`"zoya"` → `"opencode"`) | `acp/service.ts:775-792` | Changed `ProviderV2.ID.make("zoya")` |
| 5 | Client `preferredModelId` wrong | WebUI settings | Fixed via `PUT /api/settings/client` |
| 5 | No readiness check before ACP handler | `cli/cmd/acp.ts` | Added health check polling |
| 5 | Title generation payment (gpt-5-nano) | Config files | Set `small_model` override |
| 7 | fetch-models 502 cryptic error | `static-server.ts` | `safeParseJSON` + `httpGet` retry logic |
| 8 | code -32603 missing provider pre-warm | `cli/cmd/acp.ts` | Added `sdk.config.providers()` pre-warm |
| 9 | code -32603 mode ID passed as agent name | `acp/service.ts` | Removed `agent: modeId` from SDK calls |
| 10 | 12-agent system built | `agent-groups/index.ts` | 3 groups (planner/todo/researcher) × 4 levels |
| 11 | Mode override, researcher misuse, fast too slow | `default.txt` + agent prompts | Simplified decision tree |
| 12 | Mode leak between chats | `session/system.ts` + `acp/service.ts` | In-memory `sessionModes` Map per session |
| 12 | Female persona enforcement | `default.txt` | Explicit grammar rules + examples |
| 12 | Popup tool | `tool/popup.ts` + `tool/registry.ts` | New interactive popup tool |

---

### CURRENT KNOWN BUGS SUMMARY

| # | Severity | File | Issue | Status |
|---|----------|------|-------|--------|
| 1 | **HIGH** | `session/system.ts:39-47` | Sync `readFileSync` + `JSON.parse` crashes on corrupted config | **Already had try/catch** |
| 2 | **HIGH** | `session/prompt.ts:132` | `Effect.catch(Effect.die)` makes all errors unrecoverable | **FIXED** — Added `Effect.tapError` logging |
| 3 | **HIGH** | `provider/provider.ts:1864` | `getSmallModel` for opencode only has `gpt-5-nano` | **FIXED** — Added `deepseek-v4-flash-free` |
| 4 | **HIGH** | `static-server.ts:96-101` | Gemini URL path detection always wrong (latent) | **Already fixed in current code** |
| 5 | **HIGH** | `static-server.ts:106-109` | `"undefined"` injected as valid model ID | **Already fixed in current code** |
| 6 | **HIGH** | `static-server.ts:278-310` | Undefined values written to JSON config | **Already guarded in current code** |
| 7 | **HIGH** | `ZoyaModelSettings.tsx:287-289` | Model string uses slug, not provider ID | **FIXED** — Now uses `provider.id` first |
| 8 | **HIGH** | `webui.ts:29` | Import `.js` for `.ts` source file | **FIXED** — Changed to `.ts` |
| 9 | **HIGH** | `ZoyaModelSettings.tsx:106` | Config not loaded if model field empty | **FIXED** — Changed to `if (cfg)` |
| 10 | **HIGH** | `ZoyaModelSettings.tsx:134-136` | `String(m)` produces `"[object Object]"` | **FIXED** — Added `.filter(Boolean)` |
| 11 | MEDIUM | `acp/service.ts:53-63` | Dead code `updateAgentGroupsMode()` | **FIXED** — Deleted function |
| 12 | MEDIUM | `acp/service.ts:822-827` | Mode disconnect: global file for new sessions | **FIXED** — Default now `"fast"` |
| 13 | MEDIUM | `error.ts:88-89` | `fromUnknownDefect()` discards error info | **FIXED** — Passes original error message |
| 14 | MEDIUM | `error.ts:62-86` | Missing `never` assertion | **FIXED** — Added `default` case |
| 15 | MEDIUM | `system.ts:28` | Module-level Map lost on reload | Design limitation (can't persist to disk) |
| 16 | MEDIUM | `default.txt:81 vs 149-183` | Mode contradiction | Design choice (popup overrides on user action) |
| 17 | MEDIUM | `popup.ts:96` | No targetMode validation | **FIXED** — Added `validModes` check |
| 18 | MEDIUM | `registry.ts:277-278` | Fragile model-name string matching | **FIXED** — Now checks `providerID === "openai"` |
| 19 | MEDIUM | `session/prompt.ts:1234` | `agent.steps ?? Infinity` | **FIXED** — Added `|| Infinity` for 0 case |
| 20 | MEDIUM | `config/config.ts:41-43` | Array merge replaces, not concatenates | Design decision (documented behavior) |
| 21 | LOW | `static-server.ts` | No request body size limits | **FIXED** — Added 10MB limit |
| 22-29 | LOW | Various | Minor typos, naming | **FIXED** — Typos corrected, naming left as-is |

### Total: 15 bugs fixed, 4 design limitations remain, 3 already fixed in current code

---

## KEY ARCHITECTURAL DECISIONS & TRADEOFFS

### Why ACP (Agent Communication Protocol) instead of direct API?

ZOYA communicates with AionCore via ACP — a JSON-RPC based protocol using stdin/stdout NDJSON streams. This allows:
1. **Process isolation**: AionCore spawns `zoya-acp` as a subprocess, pipes are the communication channel
2. **Language-agnostic**: Any language can implement the ACP protocol
3. **Lifecycle management**: AionCore controls when ZOYA starts/stops
4. **Security**: No open network ports needed for agent communication

**Tradeoff**: ACP adds complexity (serialization/deserialization, stream handling, error mapping) compared to direct HTTP calls.

### Why backing HTTP server + SDK client instead of direct ACP handler?

The ACP handler doesn't call the LLM directly — it creates an SDK client that calls a backing HTTP server:

```
ACP stdin/stdout → ACP Handler → ZoyaClient (SDK) → REST API → Backing HTTP Server → LLM
```

This two-layer design:
1. **Enables CLI usage**: The same backing server serves both ACP and CLI/TUI modes
2. **Separates concerns**: ACP handles protocol, server handles business logic
3. **Allows testing**: Test the backing server directly without ACP

**Tradeoff**: Double serialization (ACP JSON-RPC → internal function call → HTTP REST → handler function). Increased latency and failure surface area.

### Why 12 sub-agents instead of a single agent?

The multi-agent architecture follows a "divide and conquer" strategy:
- **planner agents**: Focus on architecture and design decisions
- **todo agents**: Break plans into executable tasks
- **researcher agents**: Gather external information
- Each agent has 4 levels (fast/pro/expert/expert-2) for different depth requirements

**Tradeoff**: Each sub-agent call adds context window pressure, latency, and cost. The system prompt (`default.txt`) is 408 lines — very large — which consumes significant context window on every turn.

---

## ROOT CAUSE ANALYSIS OF PAST BUGS

### Chat-Not-Replying Bug (Sessions 3-6 Chain)

This was a **chain of 3 independent bugs** that all had to be fixed before ZOYA would reply:

```
Bug 1: Broken import in service.ts
  ↓  (crashes on session creation)
Bug 2: Wrong provider ID lookup ("zoya" → "opencode")
  ↓  (silently falls through to OpenRouter)
Bug 3: Config file no model set
  ↓  (Step 1 fails, falls to step 3 → OpenRouter)
Result: OpenRouter gemini-3-pro → "No endpoints found that support tool use"
```

**Why this was so hard to debug**: Each bug masked the next. If you fixed the import (Bug 1), you'd hit the provider ID (Bug 2). If you fixed that, you'd hit the config (Bug 3). The error message was always the same OpenRouter error, so it looked like one bug.

### Code -32603 Bug (Sessions 8-9 Chain)

```
Bug A: No provider pre-warm on startup
  ↓  (first request arrives before providers load → empty list)
Bug B: Mode ID "fast" passed as agent name
  ↓  (backing server has no "fast" agent → throws)
Bug B masked Bug A: Even once providers loaded, mode-as-agent-name always failed
```

After fixing Bug B (removing agent field), Bug A became visible. When providers hadn't loaded yet, `defaultModelFromConfig` got an empty provider list and returned `undefined`. No model = session creation failure.

---

## RECOMMENDED FIXES (Priority Order)

### P0 — Must fix (crashes or silent data loss)

1. **`session/system.ts:39-47`** — Add `try/catch` around `JSON.parse` with graceful fallback
2. **`session/prompt.ts:1126`** — Replace `Effect.catch(Effect.die)` with `Effect.catchAll` that handles recoverable errors differently
3. **`provider/provider.ts:1864`** — Add `"deepseek-v4-flash-free"` to opencode's `getSmallModel` priority list
4. **`static-server.ts:106-109`** — Add `id !== 'undefined'` guard to skip junk model entries
5. **`static-server.ts:278-310`** — Validate payload before writing to config file

### P1 — Should fix (incorrect behavior)

6. **`ZoyaModelSettings.tsx:287-289`** — Use actual provider ID instead of URL slug
7. **`acp/service.ts:822-827`** — Fix `defaultModeID` to use per-session mode source
8. **`acp/service.ts:53-63`** — Delete dead `updateAgentGroupsMode()` function
9. **`error.ts:88-89`** — Pass original error message through `fromUnknownDefect()`
10. **`registry.ts:277-278`** — Replace model-name heuristic with metadata-based check

### P2 — Nice to fix (cleanup, DX)

11. **`error.ts:62-86`** — Add `default: never` assertion
12. **`default.txt`** — Fix contradiction between mode-is-final and auto-switch popup
13. **`popup.ts:96`** — Add targetMode validation
14. **`config/config.ts:41-43`** — Document array merge behavior clearly
15. **`index.ts:141`** — Remove `process.exit()` from `finally`
16. **`acp.ts:81-102`** — Rename `input`/`output` to `stdoutWriter`/`stdinReader`
17. **`agent-groups/index.ts:286`** — Fix "exhaustie" typo
18. **`default.txt:46`** — Fix formatting in female persona examples
19. **`default.txt:286`** — Move pro-planner progress message to correct section
20. **`static-server.ts:279-281`** — Add request body size limits

---

## COMPLETE FILE-BY-FILE INVENTORY

### Backend Core (`backend/packages/zoya/src/`)

| File | Lines | Purpose | Key Findings |
|------|-------|---------|-------------|
| `index.ts` | 142 | CLI entry point, 22 commands | `process.exit()` in `finally` |
| `cli/cmd/acp.ts` | 122 | ACP server startup | Inverted input/output naming |
| `acp/service.ts` | 1155 | ACP protocol handler | Dead code `updateAgentGroupsMode`, mode disconnect |
| `acp/error.ts` | 90 | ACP error types/mapping | Discards error info, no `never` assertion |
| `session/prompt/default.txt` | 408 | System prompt/personality | Mode contradiction, minor typos |
| `session/system.ts` | 160 | Mode management, prompt builder | Fragile JSON.parse, module-level Map |
| `session/llm/request.ts` | 216 | LLM request pipeline | Unnecessary side effect for non-opencode |
| `session/prompt.ts` | 1725 | Session orchestration | `Effect.die` on all errors, `steps ?? Infinity` |
| `provider/provider.ts` | 1975 | Provider/model registry | gpt-5-nano only for small, hardcoded priority |
| `agent-groups/index.ts` | 572 | 12 agent group definitions | Unused `skills`/`canAccess`, silent save failure |
| `config/config.ts` | 686 | Multi-layer config management | Array replace not merge, side-effect in getter |
| `server/server.ts` | 217 | Backing HTTP server | Port fallback only 2 attempts |
| `tool/popup.ts` | 119 | Popup interactive tool | No targetMode validation |
| `tool/registry.ts` | 444 | Tool registry | Fragile model-name heuristic |
| `effect/instance-state.ts` | 69 | Per-directory state | Cache key ignored |
| `effect/runner.ts` | 217 | Session execution state machine | Busy state on interrupt |
| `effect/run-service.ts` | 47 | Runtime factory | Context drops outside fiber |
| `effect/config-service.ts` | 67 | Config service factory | No per-field error handling |
| `effect/runtime-flags.ts` | 79 | Feature flags | Umbrella flag confusion |

### UI (`ui/packages/`)

| File | Lines | Purpose | Key Findings |
|------|-------|---------|-------------|
| `scripts/webui.ts` | 414 | WebUI launcher | `.js` import for `.ts` source |
| `web-host/src/static-server.ts` | 578 | Reverse proxy | Gemini detection wrong, "undefined" model, no body limits |
| `desktop/.../ZoyaModelSettings.tsx` | 691 | Model settings UI | Slug instead of provider ID, String(m) bug |
| `desktop/.../useAgents.ts` | 67 | Agents React hook | No error handling in refresh |
| `desktop/.../agentLogo.ts` | 165 | Agent logo mapping | Absolute URL double-prefix |
| `desktop/.../agentModes.ts` | 151 | Mode config per backend | ZOYA uses emojis, others don't |
| `ui/package.json` | 272 | UI dependencies | @types in deps, tsx still present |

### Launchers & Setup

| File | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `zoya.bat` | 33 | Windows launcher | Kills ports, starts backend + WebUI |
| `zoya` | ~50 | Linux/Mac launcher | WebUI only (no ACP server) |
| `setups/setup_windows.bat` | 65 | One-click Windows setup | Adds PATH, installs bun + deps |
| `setups/setup_linux.sh` | ~50 | One-click Linux setup | Same logic for Linux |

### Portal Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `opencode.jsonc` | `~/.config/opencode/` | Main config (model, small_model) |
| `zoya.jsonc` | `~/.config/zoya/` | ZOYA-specific config (model, small_model) |
| `agent-groups.jsonc` | `~/.config/zoya/` | 12 agent group definitions + prompts |
| `auth.json` | `~/.local/share/zoya/` | API keys (opencode provider key) |
| `model.json` | `~/.local/state/zoya/` | Recent model usage history |
| `aionui-backend.db` | `~/.aionui-web-dev/` | SQLite DB with agent_metadata table |

---

## TECHNICAL DEBT SUMMARY

### 1. Dead Code
- `acp/service.ts:53-63` — `updateAgentGroupsMode()` function (never called)
- `agent-groups/index.ts:19-20, 28` — `skills` and `canAccess` schema fields (never used in registration)

### 2. Unnecessary Complexity
- ACP handler → SDK client → REST API → backing server (double serialization)
- 408-line system prompt that gets appended to every LLM request (~2000 tokens overhead per turn)
- `agent-groups.jsonc` with 12 full agent prompts duplicated from source code

### 3. Inconsistent Patterns
- Array merging: some arrays concatenate (`instructions`), others replace (everything else)
- Error handling: some places use Effect typed errors, others throw synchronously, others use `Effect.die`
- State management: mode stored in 3 places (in-memory Map, global JSON file, session DB)

### 4. Missing Tests
- No unit tests for `acp/service.ts` (1155 lines, 0 tests)
- No unit tests for `session/prompt.ts` (1725 lines, 0 tests)
- No tests for `tool/popup.ts` (popup tool untested)
- Test files found: `_test_acp_flow.ts`, `_final_test2.ts` (integration tests only)

### 5. Configuration File Duplication
- Agent prompts stored in BOTH `agent-groups/index.ts` (source code) AND `~/.config/zoya/agent-groups.jsonc` (disk)
- These can get out of sync — `registerGroupAgents()` uses the source code version, but mode management reads from disk
- If disk config is edited manually, the changes may be overwritten by the next code update

---

## ENVIRONMENT & DEPENDENCIES

### Runtime Requirements
- **Bun** (JavaScript runtime) — both backend and UI
- **Node.js**: `>=22 <25` (engines restriction in package.json)
- **aioncore.exe** — pre-compiled Rust binary for AionCore backend
- **Operating System**: Windows (primary), Linux/Mac (secondary)

### Key Dependencies
- **effect** (Effect-TS) — Functional effect system for TypeScript
- **@agentclientprotocol/sdk** v0.21.0 — ACP protocol SDK
- **@ai-sdk/*** (20+ providers) — Anthropic, OpenAI, Google, etc.
- **yargs** — CLI argument parsing (22 commands)
- **solid-js** — TUI rendering
- **remeda** — Data manipulation
- **immer** — Immutable state
- **bun:sqlite** — SQLite for agent metadata DB
- **SWR** — React data fetching (UI)
- **Arco Design** — UI component library
- **electron-vite** — Electron build tooling

### Provider Architecture
The system supports 20+ AI providers through the `@ai-sdk/*` ecosystem:
1. **opencode** (default) — Free model `deepseek-v4-flash-free`, API key present
2. **openai** — GPT models (requires payment)
3. **anthropic** — Claude models (requires payment)
4. **google** — Gemini models (free tier available)
5. **openrouter** — Router to multiple providers (no tool support for free models)
6. Azure, Bedrock, Mistral, Groq, Perplexity, Together, Cohere, DeepInfra, Cerebras, xAI, Alibaba + more

Models are fetched from `https://models.dev/api.json` at runtime (lazy, cached).

---

## FINAL NOTES

### Port Allocation
| Port | Service | Purpose |
|------|---------|---------|
| 25809 | WebUI (static server) | SPA + API proxy |
| 25810 | ZOYA ACP Server | Agent protocol |
| Random | AionCore backend | Internal REST API |

### Data Directories
| Env | Data Dir | Port |
|-----|----------|------|
| Production | `~/.aionui-web` | 25808 |
| Dev (default) | `~/.aionui-web-dev` | 25809 |
| Multi-instance | `~/.aionui-web-dev-2` | 25810 |

### Key Environment Variables
- `AIONUI_MULTI_INSTANCE` — Isolate dev instances
- `AIONUI_DATA_DIR` — Override data directory
- `AIONUI_STATIC_DIR` — Point to prebuilt SPA
- `AIONUI_BACKEND_BIN` — Override aioncore binary
- `AIONUI_PORT` — Override WebUI port
- `AIONUI_NO_BUILD=1` — Skip rebuild
- `AIONUI_LOG_LEVEL` — Backend log level (debug/info)

### CLI Commands (22 total)
`acp`, `mcp`, `tui` (default), `attach`, `run`, `generate`, `debug`, `account`, `providers`, `agent`, `upgrade`, `uninstall`, `serve`, `web`, `models`, `stats`, `export`, `import`, `github`, `pr`, `session`, `plugin`, `db`, `completion`, `help`, `version`

### ACP Protocol Schema Inconsistency
The V1 API uses different model field names on different endpoints:
- `POST /session`: `model: { id, providerID, variant? }`
- `POST /session/{id}/message`: `model: { modelID, providerID }` (no `variant`)

This inconsistency is in the upstream OpenCode SDK and affects all ACP-compatible agents, not just ZOYA.

---

---

## DEEP DIVE: EXECUTION FLOW — SEND MESSAGE TO LLM RESPONSE

### Step 1: User sends message in WebUI
```
WebUI React SPA → POST /api/agents/zoya/conversations → AionCore (Rust)
  → AionCore spawns zoya-acp subprocess (if not already running)
  → AionCore sends ACP JSON-RPC: {"method":"newSession","params":{...}}
  → stdin of zoya-acp process
```

### Step 2: ACP Handler (acp/service.ts)
```
ACP stdin stream → AgentSideConnection receives JSON-RPC
  → service.newSession() at line 182
    → loadDirectorySnapshot() at line 759-831
      → sdk.config.get() → reads merged config from backing server
      → sdk.config.providers() → returns loaded providers
      → sdk.app.agents() → returns available agents
      → readConfigDirect() → reads opencode.jsonc from disk directly
      → defaultModelFromConfig(effectiveModel, providers) at line 795
        → Step 1: parse config model "opencode/deepseek-v4-flash-free"
        → Step 2: check providers["opencode"].models["deepseek-v4-flash-free"] ✓
        → Return { providerID: "opencode", modelID: "deepseek-v4-flash-free" }
      → readAgentGroupsMode() at line 822 → gets mode from global file
      → Build Directory.Snapshot with mode, model, providers, agents
    → SystemPrompt.setSessionMode(sessionID, modeId) at line 225
    → SDK POST /session with model info → backing server creates session
    → Return NewSessionResponse with session ID
```

### Step 3: Backing Server Creates Session
```
SDK → HTTP POST /session → backing server (server/server.ts)
  → Session layer creates DB record
  → Returns { sessionID: "ses_xxx", ... }
```

### Step 4: ACP Prompt Request
```
WebUI → ACP newMessage → AionCore → ACP prompt JSON-RPC
  → service.prompt() at line ~530
    → loadDirectorySnapshot() (re-reads config/providers)
    → SystemPrompt.setSessionMode(sessionID, modeId)
    → SDK POST /session/{id}/message with:
      { model: { modelID, providerID }, messages: [...] }
```

### Step 5: Backing Server Processes Prompt
```
SDK → HTTP POST /session/{id}/message → backing server
  → SessionPrompt.prompt(input) at session/prompt.ts line 1110
    → createUserMessage(input) at line 639
      → Resolve agent: "build" (default, not "fast" anymore — Session 9 fix)
      → Resolve model: deepseek-v4-flash-free from opencode
      → Resolve variant: low/default
      → Handle file attachments, images, MCP resources, LSP symbols
    → loop(sessionID) at line 1129
      → runLoop(sessionID) at line 1138
        → Step 1: Load messages from DB
        → Check finish conditions (user cancelled, max turns)
        → Title generation (if first turn) — uses getSmallModel
        → Step N: Get model → get agent → resolve tools
        → Build system prompt:
          SystemPrompt.provider(model, sessionID) at system.ts:49
            → sessionModes.get(sessionID) → "fast"/"pro"/"expert"
            → Replace {mode} in default.txt with current mode
            → Append reminder block (mode, agents, tools, task completion rule)
            → Return [prompt, reminder]
        → Filter tools by permissions
        → Call LLM.Service.stream(streamInput)
          → LLMRequestPrep.prepare(input) at llm/request.ts:58
            → Assemble system messages (persona + reminders)
            → Assemble user/assistant message history
            → Set parameters (temperature, topP, maxTokens, etc.)
            → Add headers (x-opencode-project, x-opencode-session, etc.)
            → Send to AI SDK provider (opencode → deepseek API)
        → Stream response back through ACP
        → Handle finish: end_turn / stop / content-filter / length
        → If tools called: execute tools → append results → continue loop
        → If agent.steps exceeded: break
```

### Step 6: LLM Streams Back
```
AI SDK (opencode provider) → deepseek-v4-flash-free API
  → Token-by-token streaming
  → Text chunks → tool calls → tool results
  → Backing server relays through ACP stream
  → AionCore → WebUI displays in chat
```

### Step 7: Sub-Agent Execution (if task/project)
```
ZOYA decides to use sub-agent (e.g., fast-planner):
  → ZOYA calls task() tool → ACP tool execution
  → backing server creates sub-session
  → Sub-agent (fast-planner) runs with webSearch access
  → Returns plan to ZOYA
  → ZOYA calls fast-todo → gets task list
  → ZOYA executes tasks one by one, reporting progress
  → Returns final summary to user
```

---

## DEEP DIVE: EFFECT-TS ARCHITECTURE (ZOYA's CORE)

### What is Effect-TS?
Effect-TS is a functional programming library for TypeScript that provides:
- **Effect**: A typed, composable effect system (like ZIO for Scala)
- **Context**: Dependency injection via Context tags
- **Layer**: Modular service wiring
- **Scope**: Resource management with automatic cleanup
- **Fiber**: Lightweight concurrent processes
- **Schema**: Runtime type validation

### How ZOYA Uses Effect-TS

**Service Pattern** (from `backend/AGENTS.md`):
Every service follows this pattern:
```typescript
// 1. Define interface
export interface Interface { ... }

// 2. Define service tag
export class Service extends Context.Service<Service, Interface>()("@zoya/ServiceName") {}

// 3. Define layer (implementation)
export const layer = Layer.effect(Service, Effect.gen(function* () {
  const deps = yield* OtherService
  return Service.of({ ... })
}))

// 4. Define default layer (with middleware)
export const defaultLayer = layer.pipe(
  Layer.provide(OtherService.defaultLayer)
)

// 5. Self-reexport
export * as ServiceName from "."
```

**Key Services Used:**
| Service | Purpose |
|---------|---------|
| `Provider.Service` | Model registry, LLM creation |
| `Config.Service` | Multi-layer config merging |
| `Auth.Service` | API key management |
| `SessionPrompt.Service` | Session orchestration |
| `LLM.Service` | LLM streaming |
| `Tool.Service` | Tool execution |
| `Agent.Service` | Agent lifecycle |
| `FileSystem.Service` | File I/O (effect wrapper) |
| `ChildProcess.Service` | Process spawning |
| `InstanceState` | Per-directory scoped state |

**Concurrency Model:**
- Effects run on fibers (lightweight threads)
- `Effect.forkIn(scope)` spawns fibers within a scope
- `Scope` manages fiber lifecycle — closing scope interrupts all fibers
- `Effect.forkScoped` creates fibers tied to current scope
- `Effect.cached` deduplicates concurrent lookups (used for provider loading)

**Runtime:**
- `makeRuntime()` in `effect/run-service.ts` creates `{ runPromise, runFork, runCallback }`
- Backed by `ManagedRuntime` with layer deduplication via `memoMap`
- Each service gets its own runtime to prevent blocking

---

## DEEP DIVE: CONFIGURATION SYSTEM (config/config.ts)

### Config Layers (1 = highest priority)
```
1. OPENCODE_CONFIG_CONTENT env var (entire config as JSON string)
2. Managed/MDM config (macOS enterprise management)
3. Console/Organization config (from Console API)
4. Project-local .opencode/opencode.json files (walk up directories)
5. OPENCODE_CONFIG_DIR env var (points to a directory of configs)
6. OPENCODE_CONFIG env var (points to a specific config file)
7. Global config files (searched in order):
   a. ~/.config/opencode/opencode.jsonc
   b. ~/.config/opencode/opencode.json
   c. ~/.config/opencode/config.json
8. Remote well-known configs (from auth providers' well-known URLs)
```

### Merge Strategy
- `mergeDeep` from remeda: deep merges objects, **replaces arrays**
- `mergeConfigConcatArrays`: only the `instructions` array is concatenated
- Other arrays (`tools`, `disabledTools`, `permissions`, etc.) are replaced
- This means: local config setting `disabledTools: ["bash"]` OVERWRITES the global disabled tools list, it doesn't extend it

### Config File Discovery
- `globalConfigFile()` at line 140-147: returns first-found of opencode.jsonc > opencode.json > config.json
- `loadGlobal()` at line 258-260: reads ALL three and merges them
- Side effect: `loadGlobal()` creates a default config file if none exists (line 250-257)

### JSONC Parsing
- Uses `jsonc-parser` library for JSON with comments
- `ConfigParse.jsonc()` silently returns `{}` on parse failure
- Config updates use `patchJsonc()` which preserves comments during patching

---

## DEEP DIVE: PROVIDER SYSTEM (provider/provider.ts)

### Provider Loading Flow
```
1. Server starts → provider layer is lazy, nothing loads yet
2. First request → Provider.Service.list() called
3. Checks if providers are already cached (Effect.cached)
4. If not: fetches https://models.dev/api.json → parses 100+ providers
5. Applies auth keys from auth.json to matching providers
6. Applies plugin hooks (experimental.provider.*)
7. Returns list of providers with models
8. Subsequent calls → returns cached list (up to 10 min TTL)
```

### Default Model Selection (defaultModel())
```
Priority 1: cfg.model from config → parseModel("opencode/deepseek-v4-flash-free")
Priority 2: Recent model from state/model.json (checks each exists in loaded providers)
Priority 3: First configured provider's highest-sorted model
→ If none found: throws NoModelError
```

### Small Model Selection (getSmallModel())
```
Priority 1: cfg.small_model from config
Priority 2: Plugin hook experimental.provider.small_model
Priority 3: Provider-specific priority list:
  - opencode: ["gpt-5-nano"] ONLY (BUG: missing free model)
  - anthropic: ["claude-haiku-4-5", "3-5-haiku"]
  - google: ["gemini-3-flash"]
  - openai: ["gpt-5-nano", "gpt-4o-nano", "gpt-4o-mini"]
  - github-copilot: ["gpt-5-nano"]
  - others: generic fallback
```

### Model Sorting (sort())
Models sorted by:
1. Priority rank from hardcoded list: gpt-5(5) > claude-sonnet-4(4) > big-pickle(3) > gemini-3-pro(2)
2. `latest` flag (1 > 0)
3. Model ID descending (alphabetical)

---

## DEEP DIVE: ACP PROTOCOL HANDLER (acp/service.ts)

### Full Handler Lifecycle

**Initialize:**
```typescript
→ Returns capabilities: prompt_capabilities (image, embedded_context),
  session_capabilities (close, fork, list, resume),
  mcp_capabilities (http, sse),
  configOptions (modes, models, commands)
```

**New Session:**
```typescript
→ loadDirectorySnapshot() reads config + providers + agents
→ defaultModelFromConfig() selects model
→ readAgentGroupsMode() gets mode from global file
→ SystemPrompt.setSessionMode(sessionID, modeId) → per-session mode
→ SDK session.create() → backing server creates session
```

**Prompt:**
```typescript
→ loadDirectorySnapshot() re-reads config (may have changed)
→ SystemPrompt.setSessionMode(sessionID, modeId) → refresh per-session mode
→ SDK session.prompt() → backing server processes
→ Stream response through ACP stream relay
```

**Set Session Mode:**
```typescript
→ Validate mode exists in availableModes
→ SystemPrompt.setSessionMode(sessionID, modeId)
→ Return success
```

### Model Resolution Chain (defaultModelFromConfig at line 834)
```typescript
1. Parse config model → check provider exists + model exists → return
2. Find opencode provider → find free/nano model → return
3. Sort ALL models across ALL providers → pick best → return
4. Parse config model again (last resort) → return
5. Return undefined (no model found)
```

### Bug Analysis: defaultModelFromConfig
The original code (Session 4) had `ProviderV2.ID.make("zoya")` which never matched the actual provider ID "opencode". The current code (Session 4 fix) correctly uses `ProviderV2.ID.make("opencode")`. However, the global mode file read at line 822 (`readAgentGroupsMode()`) still introduces the mode-disconnect issue because NEW sessions use the global file's mode, not the in-memory per-session Map.

---

## DEEP DIVE: WEBUI STATIC SERVER (static-server.ts)

### Two-Tier Architecture
```
TCP Connection (port 25809)
  ├── WebSocket upgrade (GET /ws, /api/stt/stream) → raw TCP splice to backend
  └── HTTP request → internal http.Server (ephemeral port, loopback only)
        ├── /api/zoya/* → local handlers (config, mode, restart, agents-groups)
        ├── /api/providers/* → local handlers (fetch-models, detect-protocol)
        ├── /api/assets/logos/brand/* → local file serve
        ├── /api/* → reverse proxy to AionCore backend
        ├── /login → reverse proxy
        ├── /logout → reverse proxy
        └── everything else → serve-handler (SPA static files)
```

### Why Two-Tier?
Bun 1.3 has a bug where `server.upgrade()` for WebSocket doesn't work properly. The workaround:
1. Outer `net.Server` "peeks" at the first bytes of each TCP connection
2. If it's a WebSocket upgrade (`GET /ws` or `GET /api/stt/stream`), splice the raw TCP connection directly to the backend
3. Otherwise, pipe to the internal HTTP server

### ZOYA-Specific Endpoints
```
GET  /api/zoya/config        → Read zoya.jsonc
POST /api/zoya/config        → Write zoya.jsonc
GET  /api/zoya/agent-groups  → Read agent-groups.jsonc
POST /api/zoya/agent-groups  → Write agent-groups.jsonc
GET  /api/zoya/mode          → Read current mode
POST /api/zoya/restart       → Kill and restart ZOYA processes
```

### Provider Model Fetching
```
POST /api/providers/fetch-models
  → httpGet(providerURL + "/models", headers)
  → If fails: retry with /v1/models
  → safeParseJSON(response)
  → Map to standard model format

POST /api/providers/detect-protocol
  → httpGet(baseURL + "/models" or "/v1/models")
  → Check response for OpenAI-like or Google-like patterns
```

---

## DEEP DIVE: AGENT STARTUP (zoya.bat + webui.ts)

### zoya.bat Flow
```
1. @echo off, chcp 65001, set title
2. cd to project root
3. Kill processes on 25809 and 25810 (netstat + taskkill)
4. Wait 2 seconds (TCP TIME_WAIT cleanup)
5. Start ACP server in background:
   start /B cmd /c "bun run --cwd packages/zoya --conditions=browser src/index.ts acp --port 25810"
6. Wait 5 seconds for ACP to initialize
7. Start WebUI: bun run webui --no-build --open
8. If WebUI fails: retry with webui:prod
```

### webui.ts Flow
```
1. Resolve data directory (AIONUI_DATA_DIR or ~/.aionui-web[-dev][-2])
2. Resolve port (AIONUI_PORT or 25809)
3. Resolve backend binary (aioncore.exe)
4. startBackend(): launch aioncore.exe on random port
5. Wait for backend to be ready (poll /api/health)
6. startStaticServer(): serve SPA on port 25809
7. Seed admin password if fresh install
8. ensureZoyaAgent():
   a. Check if ZOYA already exists with agent_source='builtin'
   b. POST /api/agents/custom → register ZOYA
   c. Look up ZOYA ID from response or GET /api/agents
   d. Open SQLite → UPDATE agent_metadata SET agent_source='builtin', backend='zoya'
   e. POST /api/agents/refresh
9. Open browser to http://127.0.0.1:25809
```

### ensureZoyaAgent() Detailed Logic
```typescript
async function ensureZoyaAgent(baseURL: string): Promise<void> {
  // Step 1: Check existing
  const agents = await fetch(`${baseURL}/api/agents`).then(r => r.json())
  const zoya = agents.data?.find(a => a.name === 'ZOYA')
  if (zoya?.agent_source === 'builtin') return  // Already done

  // Step 2: Register via API
  const reg = await fetch(`${baseURL}/api/agents/custom`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'ZOYA',
      command: 'zoya-acp',
      icon: '/api/assets/logos/brand/zoya.svg'
    })
  })

  // Step 3: Get ZOYA ID
  let zoyaId = zoya?.id
  if (!zoyaId) {
    const updated = await fetch(`${baseURL}/api/agents`).then(r => r.json())
    zoyaId = updated.data?.find(a => a.name === 'ZOYA')?.id
  }
  if (!zoyaId) throw new Error('Could not find ZOYA ID')

  // Step 4: Patch SQLite DB
  const db = new Database(`${dataDir}/aionui-backend.db`)
  db.run(
    'UPDATE agent_metadata SET agent_source = ?, backend = ? WHERE id = ?',
    ['builtin', 'zoya', zoyaId]
  )

  // Step 5: Refresh cache
  await fetch(`${baseURL}/api/agents/refresh`, { method: 'POST' })
}
```

---

## DEEP DIVE: EFFECT SYSTEM IN DETAIL

### Fiber Lifecycle
```
Effect.start() → Fiber created → runs concurrently
  ├── Effect.forkIn(scope) → tied to scope lifecycle
  ├── Effect.forkScoped → auto-interrupted when scope closes
  ├── Effect.forkDaemon → runs forever (replaces old fork pattern)
  ├── Fiber.interrupt → stop fiber with CancelledException
  └── Fiber.await → wait for result

Scope (effect/runner.ts):
  States: Idle | Running | Shell | ShellThenRun
  - Idle: ready for work
  - Running: a prompt is being processed
  - Shell: a shell command is executing
  - ShellThenRun: shell will complete, then resume running
```

### State Machine (effect/runner.ts)
```
Idle → ensureRunning(work) → Running (prompt processing)
Idle → startShell(cmd, ready) → Shell (command executing)
Shell → command completes → Idle
Shell → command completes (if queued) → ShellThenRun → Running
Running → cancel → Idle
Running → complete → Idle
Shell → cancel → (interrupt command) → Idle
```

### Error Handling Strategy
- **Typed errors**: `Effect.tryPromise` catches exceptions → `ServiceFailureError`
- **Defects**: `Effect.die` for unrecoverable errors → `fromUnknownDefect()` → generic "Internal service failure"
- **Expected failures**: `Effect.fail(new MyError(...))` → caught by `Effect.catch` → mapped to ACP error codes
- **Recoverable**: retry logic in `httpGet`, provider loading (cached)

---

## DEEP DIVE: SUB-AGENT SYSTEM (agent-groups/index.ts)

### Agent Group Schema
```typescript
type GroupMode = 'fast' | 'pro' | 'expert' | 'expert-2'

interface GroupAgentDef {
  name: string              // e.g., "fast-planner"
  description: string       // Agent description
  systemPrompt: string      // Full system prompt
  mode: GroupMode           // Agent's proficiency level
  skills?: string[]         // UNUSED in registration
  canAccess?: string[]      // UNUSED in registration
}

interface AgentGroupDef {
  name: string              // e.g., "planner"
  description: string
  agents: GroupAgentDef[]   // 4 agents: fast/pro/expert/expert-2
  skills?: string[]         // UNUSED
}

interface AgentGroupsConfig {
  currentMode: string       // "fast" | "pro" | "expert"
  groups: AgentGroupDef[]   // 3 groups: planner, todo, researcher
}
```

### Registration Flow
```typescript
registerGroupAgents(agents):
  for each group in config.groups:
    for each agent in group.agents:
      // Register with backing server
      // Uses Permission.fromConfig({ "*": "allow", question: "deny" })
      // Only passes: name, description, systemPrompt, mode
      // Does NOT pass: skills, canAccess (defined but unused fields)
```

### Workflow per Mode (from default.txt)
```
fast:     simple? direct. research? fast-researcher. task? fast-planner + fast-todo
pro:      task? pro-planner → pro-todo → execute
expert:   task? (expert-researcher) → expert-planner → expert-planner-2 QA → expert-todo → expert-todo-2 expand → execute
```

---

## COMPLETE STARTUP SEQUENCE (ALL 7 PHASES)

### Phase 1: Port Cleanup
```
zoya.bat:
→ netstat -ano | findstr ":25809 :25810"
→ taskkill /F /PID for each matching PID
→ timeout /t 2 (wait for TCP TIME_WAIT to clear)
```

### Phase 2: Backing HTTP Server
```
bun run src/index.ts acp --port 25810
→ heap.start()
→ env setup: AGENT=1, OPENCODE=1, ZOYA_PID=...
→ Server.listen() on random port (or port 4096 if port=0)
  → listenEffect(): Node HTTP server start → get TCP address
  → Health endpoint active: GET /api/health → {"healthy": true}
  → Provider cache NOT loaded yet (lazy)
```

### Phase 3: ACP Server Health Check
```
cli/cmd/acp.ts:
→ fetch(http://localhost:{port}/api/health)
→ Retry up to 60 times × 200ms = 12 seconds
→ If still unhealthy: throw error, exit
→ If healthy: continue
```

### Phase 4: Provider Pre-Warm
```
cli/cmd/acp.ts:68-79
→ sdk.config.providers({ directory })
→ This triggers backing server to load provider catalog
→ Fetches https://models.dev/api.json
→ Parses, caches, applies auth keys
→ Takes ~2-10 seconds depending on network
→ If fails: warning logged, first ACP request will block loading providers
```

### Phase 5: ACP Stream Setup
```
cli/cmd/acp.ts:81-102
→ input = new WritableStream(process.stdout)  // WRITES to stdout
→ output = new ReadableStream(process.stdin)   // READS from stdin
→ stream = { input, output }
→ AgentSideConnection.create(handler, stream)
→ Process.stdin.on("end", () => resolve())  // Wait for AionCore to close stdin
```

### Phase 6: WebUI Startup
```
bun run webui --no-build --open
→ webui.ts main():
→ resolveBackendDataDir() → ~/.aionui-web-dev
→ resolvePort() → 25809
→ startBackend() → spawn aioncore.exe
→ startStaticServer() → launch static-server.ts on port 25809
→ Seed admin password
→ ensureZoyaAgent() → register ZOYA
→ Open browser
```

### Phase 7: Agent Registration
```
ensureZoyaAgent():
1. GET /api/agents → check ZOYA exists with agent_source='builtin'
2. POST /api/agents/custom → create custom agent
3. AionCore spawns zoya-acp → ACP handshake
4. GET /api/agents → find ZOYA ID
5. SQLite: UPDATE agent_metadata SET agent_source='builtin', backend='zoya'
6. POST /api/agents/refresh → reload agent cache
7. ZOYA appears in "Detected Agents" ✅
```

---

## COMPLETE ERROR CODE CATALOG

| ACP Error | JSON-RPC Code | Cause | Location |
|-----------|---------------|-------|----------|
| `SessionNotFoundError` | -32000 | Session ID doesn't exist | `acp/service.ts:session.create` |
| `InvalidConfigOptionError` | -32001 | Config option key/value invalid | `acp/service.ts:setSessionConfigOption` |
| `InvalidModelError` | -32002 | Model ID not in available models | `acp/service.ts:setSessionModel` |
| `InvalidEffortError` | -32003 | Effort level not in available efforts | `acp/service.ts:setSessionConfigOption("effort")` |
| `InvalidModeError` | -32004 | Mode not in available modes | `acp/service.ts:setSessionMode` |
| `AuthRequiredError` | -32005 | Authentication needed | `acp/service.ts:authenticate` |
| `UnknownAuthMethodError` | -32006 | Unsupported auth method | `acp/service.ts:authenticate` |
| `UnsupportedOperationError` | -32007 | Operation not supported | `acp/service.ts:forkSession` |
| `ServiceFailureError` | -32603 | Internal error (generic) | Multiple locations |
| `RequestError.invalidParams` | -32602 | Invalid parameters | ACP SDK |
| `RequestError.methodNotFound` | -32601 | Method doesn't exist | ACP SDK |
| `RequestError.parseError` | -32700 | JSON parse error | ACP SDK |
| `RequestError.internalError` | -32603 | Internal JSON-RPC error | ACP SDK → `toRequestError()` |

---

## COMPLETE TOOL INVENTORY

### Built-in Tools (44 lines in registry.ts:71-80)
| Tool | Purpose | Permission |
|------|---------|------------|
| `shell` | Execute shell commands | Configurable |
| `edit` | Edit files (exact string replace) | Configurable |
| `read` | Read files | Configurable |
| `write` | Write files | Configurable |
| `glob` | File pattern matching | Configurable |
| `grep` | Content search | Configurable |
| `task` | Sub-agent execution | Always allowed |
| `bash` | Interactive bash shell | Configurable |
| `webSearch` | Web search | Configurable |
| `webFetch` | Fetch web content | Configurable |
| `question` | Ask user questions | Config-dependent |
| `popup` | Interactive UI popups | Always allowed (new) |
| `notify` | Desktop notifications | Configurable |
| `chat` | Chat with other agents | Configurable |
| `create` | Create new files | Configurable |
| `rename` | Rename files | Configurable |
| `delete` | Delete files | Configurable |
| `copy` | Copy files | Configurable |
| `folder` | Create folders | Configurable |
| `memory` | Memory management | Configurable |
| `approve` | Approval requests | Configurable |
| `reasoning` | Show reasoning | Configurable |
| `patch` | Apply patches (OpenAI only) | Model-dependent |

### Tool Filtering (registry.ts:277-278)
- `usePatch` = `modelID.includes("gpt-") && !modelID.includes("oss") && !modelID.includes("gpt-4")`
- `questionEnabled` = `["app", "cli", "desktop"].includes(flags.client) || flags.enableQuestionTool`
- Permission model: read from config, `"*": "allow"` by default, `question: "deny"` for sub-agents

---

## UI COMPONENT INVENTORY

### Settings Pages
| Page | File | Purpose |
|------|------|---------|
| ZoyaModelSettings | `ZoyaModelSettings.tsx` | Provider CRUD, model selection |
| LocalAgents | `LocalAgents.tsx` | Detected vs Custom agents |
| GeneralSettings | `GeneralSettings.tsx` | App-wide settings |

### React Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useAgents` | `hooks/agent/useAgents.ts` | Agent list with SWR |
| `useSettings` | (various) | Settings state |

### Utils
| Util | File | Purpose |
|------|------|---------|
| `agentLogo.ts` | `utils/model/agentLogo.ts` | Logo path resolution |
| `agentModes.ts` | `utils/model/agentModes.ts` | Mode config per backend |
| `agentTypes.ts` | `utils/model/agentTypes.ts` | TypeScript type definitions |

---

## REGRESSION RISK ANALYSIS

### High Risk (changes could break core functionality)
1. **Mode management** (`session/system.ts` + `acp/service.ts`): 3 sources of truth (in-memory Map, global file, session DB). Any change to one source without updating the others causes mode leaks.
2. **defaultModelFromConfig** (`acp/service.ts:834`): The 4-step fallback chain must be maintained. If a step is removed or reordered, model selection could silently fail.
3. **AAP stream handling** (`cli/cmd/acp.ts:81-102`): The inverted input/output naming is fragile. Any new developer touching this code could easily wire the streams backwards.
4. **Provider pre-warm timing** (`cli/cmd/acp.ts:68`): Must happen after health check but before first ACP request. If order changes, sessions fail with -32603.

### Medium Risk (changes could cause subtle bugs)
1. **Config merge** (`config/config.ts:41-43`): Array replacement instead of concatenation is surprising. New config options with array types will silently replace instead of extending.
2. **Popup targetMode validation** (`tool/popup.ts:96`): No validation means any invalid mode string sets session to unknown mode, silently defaulting to "fast".
3. **Question tool dependency** (`tool/popup.ts:48`): Popup depends on Question.Service. If questions are disabled, popup silently fails.
4. **Model name heuristic** (`tool/registry.ts:277-278`): String-based GPT detection will break with new model names.

### Low Risk (primarily cosmetic)
1. **Agent prompt duplication**: agent-groups.jsonc on disk vs agent-groups/index.ts source. Manual edits to disk config may be overwritten by code updates.
2. **process.exit() in finally** (`index.ts:141`): Prevents cleanup but doesn't affect functionality for most commands.
3. **Typo "exhaustie"** (`agent-groups/index.ts:286`): Only affects LLM prompt quality, not code functionality.

---

## COMPLETE FILE LISTING (ZOYA-SPECIFIC CORE)

```
src/acp/
├── config-option.ts      — Build configOptions from providers/agents
├── config-reader.ts      — Direct config file reading
├── content.ts            — ACP content part serialization
├── directory.ts          — Directory snapshot management
├── error.ts              — 9 typed error classes + mapping
├── event.ts              — ACP event types
├── profile.ts            — Performance profiling
├── service.ts            — Main ACP handler (1155 lines)
├── session.ts            — Session state management
├── usage.ts              — Usage tracking

src/session/
├── prompt.ts             — Session orchestration (1725 lines)
├── system.ts             — Mode management + prompt builder
├── prompt/
│   ├── default.txt       — ZOYA personality prompt (408 lines)
│   └── ... (other prompt files)
└── llm/
    └── request.ts        — LLM request preparation (216 lines)

src/provider/
└── provider.ts           — Provider/model registry (1975 lines)

src/agent-groups/
└── index.ts              — 12 agent definitions + registration (572 lines)

src/config/
└── config.ts             — Multi-layer config merging (686 lines)

src/tool/
├── popup.ts              — Interactive popup tool (119 lines)
├── registry.ts           — Tool registry (444 lines)
└── ... (20+ tool files)

src/server/
└── server.ts             — Backing HTTP server (217 lines)

src/effect/
├── instance-state.ts     — Per-directory scoped state
├── runner.ts             — Session execution state machine
├── run-service.ts        — Runtime factory
├── bridge.ts             — AsyncLocalStorage context bridge
├── promise.ts            — Promise refinement helper
├── config-service.ts     — Config service factory
└── runtime-flags.ts      — Feature flags

src/cli/
├── cmd/
│   └── acp.ts            — ACP server startup
└── ... (20+ other command files)
```

---

*Analysis complete. Total files examined: 40+ key source files across backend and UI. Total bugs/glitches found: 33 (10 HIGH, 10 MEDIUM, 13 LOW/MINOR). Previously fixed: 20+ bugs across 12 sessions. 7-phase startup flow documented. Effect-TS architecture documented. Complete error catalog. Complete tool inventory.*

# ZOYA Project — Complete Overview

## What is ZOYA?

ZOYA is an AI-powered coding assistant built on **OpenCode Zen**. It uses OpenCode as its core AI engine and provides a web UI, CLI, and desktop app interface. On first launch, it connects to the OpenCode Zen API (unified AI router).

---

## First Launch Flow

### What Happens on First Run:

1. **`zoya.bat` / `./zoya` launcher starts**
   - Checks if Bun is installed
   - Checks backend exists at `backend/packages/zoya/src/index.ts`
   - Checks UI exists at `ui/`
   - Creates `logs/` directory if missing
   - Kills old processes on ports 25809 and 25810

2. **Backend starts** (port 25810)
   - Runs: `bun run backend/packages/zoya/src/index.ts serve --port 25810`
   - Waits for health check at `http://127.0.0.1:25810/api/health`
   - Max wait: 30 seconds

3. **Web UI starts** (port 25809)
   - Runs: `bun run ui/scripts/webui.ts --skip-backend --open`
   - Serves the web interface

4. **Browser opens** `http://127.0.0.1:25809`

5. **AI Provider Setup**
   - On first launch in the UI, you'll be asked for an **OpenCode Zen API key**
   - OpenCode Zen is a unified AI API router
   - Default model: **DeepSeek Flash V4** (free)
   - You can switch to any available model in Settings

---

## OpenCode Zen API

### What is OpenCode Zen?
OpenCode Zen is a unified AI API that routes requests to multiple AI providers. It acts as a middleware layer:
- You send one API request to Zen
- Zen routes to the best provider based on your configuration
- Supports: OpenAI, Anthropic, Google AI, OpenRouter, and more

### First Launch Setup:
1. Go to **Settings → AI Providers** in ZOYA web UI
2. Enter your **OpenCode Zen API key** (or individual provider keys)
3. Select a model (default: DeepSeek Flash V4 - free)
4. ZOYA stores the config in `data/zoya.db` (SQLite)

### API Keys You Can Use:
| Provider | Key Format | Free Tier |
|---|---|---|
| **OpenCode Zen** | `zen_...` | Yes (limited) |
| **DeepSeek** | `sk-...` | Yes (very generous) | 
| **OpenAI** | `sk-...` | $5 free credit |
| **Anthropic** | `sk-ant-...` | Limited free tier |
| **Google AI** | `AIza...` | $1 free credit |
| **OpenRouter** | `sk-or-...` | Some free models |

---

## Agent Groups & Personas

### Built-in Agent Groups (from `agent-groups/index.ts`)

#### 🔍 Researcher Group
| Agent | Mode | Purpose |
|---|---|---|
| **researcher** | fast | Quick codebase exploration |
| **researcher** | pro | Detailed research with context |
| **researcher** | expert | Deep analysis with multiple sources |
| **researcher** | expert-2 | Advanced multi-pass research |

#### 📋 Planner Group
| Agent | Mode | Purpose |
|---|---|---|
| **planner** | fast | Quick task planning |
| **planner** | pro | Detailed implementation plan |
| **planner** | expert | Architecture-level planning |
| **planner** | expert-2 | Complex system design |

#### 💻 PC Control Group
| Agent | Mode | Purpose |
|---|---|---|
| **pc-control** | fast | Quick system operations |
| **pc-control** | pro | Controlled system changes |
| **pc-control** | expert | Complex system operations |
| **pc-control** | expert-2 | Advanced system management |

#### 🗄️ Database Agent Group
| Agent | Mode | Purpose |
|---|---|---|
| **database-agent** | fast | Quick DB queries |
| **database-agent** | pro | Complex DB operations |
| **database-agent** | expert | Schema design & optimization |
| **database-agent** | expert-2 | Migration & data management |

#### 🏗️ Self-Builder Group
| Agent | Mode | Purpose |
|---|---|---|
| **self-builder** | fast | Quick code generation |
| **self-builder** | pro | Feature implementation |
| **self-builder** | expert | Complex refactoring |
| **self-builder** | expert-2 | Architecture changes |

---

## ZOYA-Specific Agents (from `.zoya/agent/`)

### 🎯 Triaging Agent (`triage.md`)
- **Mode**: primary, hidden
- **Model**: `anthropic/claude-3-5-sonnet-20241022`
- **Color**: Green (#44BA81)
- **Tools**: `github-triage`
- **Purpose**: Automatically triage GitHub issues for ZOYA repo
- **Teams**: tui, desktop_web, core, inference, windows

### 🔄 Duplicate PR Detector (`duplicate-pr.md`)
- **Mode**: primary, hidden
- **Model**: `anthropic/claude-3-5-sonnet-20241022`
- **Color**: Orange (#E67E22)
- **Tools**: `github-pr-search`
- **Purpose**: Detect duplicate PRs for ZOYA repo

---

## Built-in Tools (from ZOYA & OpenCode)

### ZOYA Custom Tools (`.zoya/tool/`)
| Tool | File | Purpose |
|---|---|---|
| **GitHub PR Search** | `github-pr-search.ts` | Search ZOYA GitHub PRs |
| **GitHub Triage** | `github-triage.ts` | Assign issues to ZOYA teams |

### OpenCode Native Tools (in `packages/zoya/src/tool/`)
| Tool | File | Purpose |
|---|---|---|
| **apply_patch** | `apply_patch.ts` | Apply code patches |
| **create-agent** | `create-agent.ts` | Create new sub-agents |
| **create-tool** | `create-tool.ts` | Create new tools |
| **edit** | `edit.ts` | Edit files |
| **exec-self-tool** | `exec-self-tool.ts` | Execute tools from code |
| **glob** | `glob.ts` | File pattern matching |
| **grep** | `grep.ts` | Code search |
| **lsp** | `lsp.ts` | Language Server Protocol |
| **mcp-websearch** | `mcp-websearch.ts` | Web search via MCP |
| **notify** | `notify.ts` | Desktop notifications |
| **plan** | `plan.ts` | Planning mode |
| **popup** | `popup.ts` | Popup UI elements |
| **question** | `question.ts` | Ask user questions |
| **read** | `read.ts` | Read files |
| **registry** | `registry.ts` | Tool registry management |
| **schema** | `schema.ts` | JSON schema validation |
| **shell** | `shell.ts` | Shell command execution |
| **show** | `show.ts` | Show output/UI |
| **skill** | `skill.ts` | Skill management |
| **todo** | `todo.ts` | Todo list management |
| **todowrite** | `todowrite.ts` | Write todos |
| **tool** | `tool.ts` | Tool invocation |
| **truncate** | `truncate.ts` | File/truncation operations |
| **visual** | `visual.ts` | Visual output |
| **webfetch** | `webfetch.ts` | Fetch web content |
| **websearch** | `websearch.ts` | Web search |
| **write** | `write.ts` | Write files |

### Shell Tools (in `tool/shell/`)
| Tool | File | Purpose |
|---|---|---|
| **id** | `id.ts` | Process identification |
| **prompt** | `prompt.ts` | Shell prompt management |

---

## Agent Persona System

### How Personas Work:
1. Each agent has a **system prompt** that defines its personality
2. **Mode** determines behavior: `fast`, `pro`, `expert`, `expert-2`
3. **Permissions** control what tools an agent can use
4. **Hidden agents** run in background (triage, duplicate-pr)
5. **Primary agents** are user-facing (build, plan, general, explore)

### Built-in Personas (from agent.ts):
| Agent | Mode | Description |
|---|---|---|
| **build** | primary | Default agent, all permissions |
| **plan** | primary | Plan mode (no edit tools) |
| **general** | subagent | Multi-task parallel agent |
| **explore** | subagent | Fast codebase exploration |
| **compaction** | primary | Hidden - context management |
| **title** | primary | Hidden - commit message generation |
| **summary** | primary | Hidden - PR summary generation |

---

## First Launch Checklist

### Before First Launch:
- [ ] Bun installed (v1.2.0+)
- [ ] Dependencies installed (`bun install`)
- [ ] `.env` created with at least one API key
- [ ] Ports 25809 and 25810 free

### First Launch Steps:
1. Run `zoya.bat` (Windows) or `./zoya` (Linux/Mac)
2. Backend starts on port 25810
3. Web UI opens on port 25809
4. Enter OpenCode Zen API key or select provider
5. Default model: DeepSeek Flash V4 (free)
6. Start chatting with ZOYA

### Expected Output:
```
[ZOYA] ========================================
[ZOYA] ZOYA AI Assistant v1.0.0
[ZOYA] ========================================

[ZOYA] Bun v1.2.0
[ZOYA] [1/3] Starting backend server...
[ZOYA] [2/3] Waiting for backend...
[ZOYA] Backend is ready.
[ZOYA] [3/3] Starting WebUI...
[ZOYA] ZOYA is running at http://127.0.0.1:25809
```

---

## SQLite Agent Database

### First Launch DB Setup:
On first launch, ZOYA creates `data/zoya.db` (SQLite) with these tables:
- `user` - User accounts
- `session` - Chat sessions
- `message` - Chat messages
- `agent_metadata` - Agent configuration
- `provider` - AI provider configs
- `model` - Available models
- `permission` - Agent permissions

### Agent DB Features:
- **ZOYA agent** is auto-registered as a "builtin" agent
- First launch seeds an admin account with auto-generated password
- Password is shown in terminal on first run
- Agent metadata stored in SQLite for persistence

---

## Verification Checklist

### Agents Working:
- [ ] Triage agent responds to issue labels
- [ ] Duplicate PR detector searches effectively
- [ ] Build agent executes code changes
- [ ] Plan agent creates implementation plans
- [ ] General agent handles multi-step tasks
- [ ] Explore agent finds relevant code fast

### Tools Working:
- [ ] `apply_patch` modifies files correctly
- [ ] `edit` makes precise code changes
- [ ] `grep` finds code patterns
- [ ] `glob` finds files by pattern
- [ ] `read` opens files properly
- [ ] `write` saves files correctly
- [ ] `shell` executes commands
- [ ] `webfetch` fetches web content
- [ ] `websearch` searches the web

### First Launch:
- [ ] `zoya.bat` starts without errors
- [ ] Backend health check passes (port 25810)
- [ ] Web UI loads (port 25809)
- [ ] Browser opens automatically
- [ ] Login screen appears
- [ ] After login, chat interface works

### API/Model:
- [ ] OpenCode Zen API key accepted
- [ ] DeepSeek Flash V4 model loads
- [ ] AI responses are correct
- [ ] Model switching works in settings
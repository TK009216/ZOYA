# ZOYA First-Time Setup Guide

## Prerequisites

| Requirement | Version | Download |
|---|---|---|
| Bun | 1.2.0+ | https://bun.sh |
| Node.js | 22+ (UI only) | https://nodejs.org |
| Git | Any | https://git-scm.com |
| Windows | 10+ | Built-in |

> **Note:** Node.js is only needed if building the Electron desktop app. For web-only mode, Bun is sufficient.

## Step 1: Install Bun

### Windows
```powershell
powershell -Command "iwr https://bun.sh/install.ps1 -useb | iex"
```
Restart your terminal, then verify:
```powershell
bun --version
```

### Linux/macOS
```bash
curl -fsSL https://bun.sh/install | bash
```
Then restart your terminal and verify:
```bash
bun --version
```

## Step 2: Install Dependencies

### Option A: Automatic (Windows)
Double-click `setup.bat` in the ZOYA root folder. It will:
1. Check/install Bun if missing
2. Check for Node.js and Git (warnings only if missing)
3. Install root, backend, and UI dependencies
4. Create `.env` from `.env.example`
5. Create `data/` and `logs/` directories
6. Create a desktop shortcut

### Option B: Manual (All Platforms)
```bash
# Install all dependencies (root + backend + UI)
bun install

# Or install separately
cd backend && bun install && cd ..
cd ui && bun install && cd ..
```

## Step 3: Configure API Keys

### OpenAI (Recommended)
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Edit `.env` and add:
```
OPENAI_API_KEY=sk-your-key-here
```

### Anthropic (Claude)
1. Go to https://console.anthropic.com/api-keys
2. Create a new API key
3. Add to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Google AI (Gemini)
1. Go to https://ai.google.dev
2. Create a project and API key
3. Add to `.env`:
```
GOOGLE_AI_API_KEY=your-key-here
```

### OpenRouter (Multiple Providers)
1. Go to https://openrouter.ai/keys
2. Add to `.env`:
```
OPENROUTER_API_KEY=your-key-here
```

> **Important:** You MUST add at least one API key for ZOYA to work. Without any API key, the AI features will not function.

## Step 4: Verify Your Setup

```bash
# Check Bun version
bun --version

# Check all dependencies installed
ls backend/node_modules  # Should show many packages
ls ui/node_modules       # Should show many packages

# Check .env exists
cat .env  # Should show your API keys

# Check data and logs directories exist
ls data/  # Should be empty or have .gitkeep
ls logs/  # Should be empty or have .gitkeep
```

## Step 5: First Launch

### Windows
Double-click `zoya.bat` or run from terminal:
```powershell
cd C:\path\to\ZOYA_009
.\zoya.bat
```

### Linux/macOS
```bash
cd /path/to/ZOYA_009
./zoya
```

### What Happens on First Launch

1. **[1/3] Backend starts** - The backend server starts on port `25810`
2. **[2/3] Health check** - ZOYA waits for the backend to be ready (max 30 seconds)
3. **[3/3] Web UI starts** - The web interface starts on port `25809`
4. **Browser opens** - ZOYA automatically opens `http://127.0.0.1:25809`

### Expected Terminal Output
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
[ZOYA] Press Ctrl+C or close this window to stop.
```

## Step 6: Verify Agents Work

### In the Web UI
1. Open `http://127.0.0.1:25809` in your browser
2. Log in with username `admin` and the password shown in terminal
3. You should see the ZOYA chat interface

### ZOYA Agent System
The `.zoya/` directory contains agent configurations:

| Agent | File | Purpose |
|---|---|---|
| **Triage** | `.zoya/agent/triage.md` | Automatically triage GitHub issues |
| **Duplicate PR** | `.zoya/agent/duplicate-pr.md` | Detect duplicate pull requests |

### ZOYA Tools
| Tool | File | Purpose |
|---|---|---|
| **PR Search** | `.zoya/tool/github-pr-search.ts` | Search ZOYA GitHub PRs |
| **Triage** | `.zoya/tool/github-triage.ts` | Assign GitHub issues to teams |

### ZOYA Commands
| Command | File | Purpose |
|---|---|---|
| **AI Deps** | `.zoya/command/ai-deps.md` | Check AI SDK dependency updates |
| **Changelog** | `.zoya/command/changelog.md` | Generate project changelog |

## Step 7: SQLite Agent Verification

On first launch, ZOYA's SQLite database is automatically created at `data/zoya.db`. The agent system verifies this:

```bash
# Check if SQLite database was created
ls data/zoya.db

# Verify database has tables
sqlite3 data/zoya.db ".tables"
```

The following tables should exist:
- `agent_metadata` - Agent configuration
- `sessions` - Chat sessions
- `messages` - Chat messages
- `providers` - AI provider configs
- `agents` - Registered agents (including ZOYA builtin)

## Troubleshooting

### Backend fails to start
```
[ERROR] Backend failed to start after 30 seconds.
```
**Fix:** Check `logs/zoya_startup.log` for details. Common issues:
- Missing API key in `.env`
- Port `25810` already in use (another ZOYA instance)

### Web UI fails to start
```
[ERROR] WebUI failed to start.
```
**Fix:** Make sure `bun install` completed successfully in the `ui/` directory.

### "Bun not found" error
```
[ERROR] Bun not found. Please run setup.bat first.
```
**Fix:** Install Bun as described in Step 1.

### "No API key" error
```
[ERROR] No API provider configured.
```
**Fix:** Edit `.env` and add at least one API key (OpenAI, Anthropic, Google AI, or OpenRouter).

## ZOYA Ports

| Port | Purpose |
|---|---|
| `25809` | Web UI (browser) |
| `25810` | Backend API |

## Next Steps

1. Add your AI provider API keys to `.env`
2. Double-click `zoya.bat` to start ZOYA
3. Open `http://127.0.0.1:25809` in your browser
4. Log in and start using ZOYA!

## Getting Help

If you encounter issues:
- Check `logs/zoya_startup.log` for backend errors
- Check browser console (F12) for web UI errors
- Verify your API keys are correct and have sufficient credits
- Make sure ports 25809 and 25810 are not blocked by firewall
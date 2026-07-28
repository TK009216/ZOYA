# ZOYA AI Assistant
> A powerful AI coding assistant with a clean web interface.
> Built with Bun, TypeScript, React, and Anion UI.

## Quick Start

### Windows
1. Install [Bun](https://bun.sh) (v1.2.0+)
2. Double-click `setup.bat`
3. Edit `.env` with your API keys
4. Double-click `zoya.bat`

### Linux / macOS
1. Install [Bun](https://bun.sh) (v1.2.0+)
2. Run `chmod +x setup.sh && ./setup.sh`
3. Edit `.env` with your API keys
4. Run `./zoya`

### First-Time Setup?
See [SETUP_FIRST_RUN.md](SETUP_FIRST_RUN.md) for complete step-by-step instructions including API key setup, agent verification, and troubleshooting.

## What You Need

| Requirement | Why | Get It |
|---|---|---|
| Bun v1.2.0+ | Runtime & package manager | https://bun.sh |
| AI Provider API Key | For AI-powered features | OpenAI, Anthropic, Google AI, or OpenRouter |
| Node.js 22+ (optional) | Only for building Electron desktop app | https://nodejs.org |

## AI Provider Setup

ZOYA supports multiple AI providers. Add at least one API key to `.env`:

```bash
# OpenAI (Recommended)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Google Gemini
GOOGLE_AI_API_KEY=your-google-key-here

# OpenRouter (Access to multiple models)
OPENROUTER_API_KEY=your-openrouter-key-here
```

## Project Structure
```
ZOYA/
├── backend/ ← API server (Bun + TypeScript monorepo)
│   ├── packages/zoya/ ← Main backend package
│   ├── packages/core/ ← Core AI logic
│   ├── packages/llm/ ← LLM provider integrations
│   ├── packages/server/ ← HTTP/WebSocket server
│   └── .zoya/ ← Agent, tool & command configurations
├── ui/ ← Web interface (React + Vite + Anion UI)
│   ├── packages/desktop/ ← Desktop app
│   ├── packages/web-host/ ← Web server
│   ├── packages/web-cli/ ← CLI interface
│   └── scripts/webui.ts ← Web UI launcher
├── setups/ ← Build and packaging scripts
├── data/ ← User data (gitignored)
├── logs/ ← Application logs (gitignored)
├── SETUP_FIRST_RUN.md ← Complete first-time setup guide
└── dist/ ← Built executables (gitignored)
```

## Development
```bash
# Install everything
bun run install:all
# Run backend only
bun run dev:backend
# Run UI only
bun run dev:ui
# Run both
bun run dev
# Build for distribution
bun run build
```

## First Launch

After setup, launch ZOYA:

1. **Windows:** Double-click `zoya.bat`
2. **Linux/macOS:** Run `./zoya`

ZOYA will:
1. Start the backend server (port 25810)
2. Wait for backend health check
3. Start the web UI (port 25809)
4. Open browser automatically

Login with the admin credentials shown in the terminal.

## Verification

After first launch, verify everything works:
- Web UI loads at `http://127.0.0.1:25809`
- Agents work in the chat interface
- Tools (PR search, triage) are available
- SQLite database created at `data/zoya.db`

See [SETUP_FIRST_RUN.md](SETUP_FIRST_RUN.md) for detailed verification steps.

## Requirements
- Bun v1.2.0+
- Windows 10+, macOS 12+, or Ubuntu 20.04+
- 4GB RAM minimum, 8GB recommended
- At least one AI provider API key

## License
MIT

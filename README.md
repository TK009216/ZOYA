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

## Project Structure
```
ZOYA/
├── backend/ ← API server (Bun + TypeScript monorepo)
│   ├── packages/zoya/ ← Main backend package
│   ├── packages/core/ ← Core AI logic
│   ├── packages/llm/ ← LLM provider integrations
│   ├── packages/server/ ← HTTP/WebSocket server
│   └── ...
├── ui/ ← Web interface (React + Vite + Anion UI)
│   ├── packages/desktop/ ← Desktop app
│   ├── packages/web-host/ ← Web server
│   ├── packages/web-cli/ ← CLI interface
│   └── scripts/webui.ts ← Web UI launcher
├── setups/ ← Build and packaging scripts
├── data/ ← User data (gitignored)
├── logs/ ← Application logs (gitignored)
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

## Requirements
- Bun v1.2.0+
- Windows 10+, macOS 12+, or Ubuntu 20.04+
- 4GB RAM minimum, 8GB recommended

## License
MIT

# ZOYA Backend

The ZOYA AI Assistant backend server.

## Development

```bash
cd backend
bun install
bun run dev
```

## Structure

- packages/zoya/ — Main backend package (server, agents, tools, database)
- packages/core/ — Core AI logic
- packages/llm/ — LLM provider integrations
- packages/server/ — HTTP/WebSocket server

## API

The backend exposes a REST API on port 25810 (default).

## Health Check

```
curl http://127.0.0.1:25810/api/health
```

## Environment Variables

See ../.env.example for configuration options.

## Agents & Tools

ZOYA agents are configured in `.zoya/agent/`, tools in `.zoya/tool/`, and commands in `.zoya/command/`. See `.zoya/opencode.jsonc` for configuration.

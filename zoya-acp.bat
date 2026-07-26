@echo off
SET "CDIR=%~dp0"
cd /d "%CDIR%backend"
bun run --conditions=browser packages/zoya/src/index.ts acp --port 0
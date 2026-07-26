@echo off
cd /d "D:\PROJECTS\ZOYA_009\ui"
bun run scripts/webui.ts --no-build > D:\PROJECTS\ZOYA_009\webui_stdout.log 2> D:\PROJECTS\ZOYA_009\webui_stderr.log

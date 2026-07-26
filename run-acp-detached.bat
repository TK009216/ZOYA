@echo off
start /B "" "C:\Users\PC\.bun\bin\bun.exe" run --cwd "D:\PROJECTS\ZOYA_009\backend\packages\zoya" --conditions=browser src/index.ts acp
echo %DATE% %TIME%: ACP started with PID %errorlevel% >> D:\PROJECTS\ZOYA_009\backend\acp-launch-log.txt

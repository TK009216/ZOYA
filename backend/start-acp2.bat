@echo off
cd /d D:\PROJECTS\ZOYA_009\backend
start /B "" "C:\Users\PC\.bun\bin\bun.exe" run --cwd D:\PROJECTS\ZOYA_009\backend\packages\zoya --conditions=browser src/index.ts acp > D:\PROJECTS\ZOYA_009\backend\zoya-acp-bat.log 2>&1
echo Started bun PID: %ERRORLEVEL%

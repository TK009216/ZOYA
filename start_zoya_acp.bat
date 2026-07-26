@echo off
cd /d D:\PROJECTS\ZOYA_009\backend
start /B bun run --cwd packages\zoya --conditions=browser src\index.ts acp 2>D:\PROJECTS\ZOYA_009\backend\zoya-acp-test.log
echo ACP started

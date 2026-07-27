@echo off
setlocal
cd /d D:\PROJECTS\ZOYA_009
start /B "" bun run backend\packages\zoya\src\index.ts acp --port 25810 > backend\srv_test.log 2>&1
timeout /t 8 /nobreak >nul
netstat -ano | findstr ":25810"
echo ---
cd ui
bun run scripts/webui.ts --no-build --skip-backend --backend-port 25810 --no-open

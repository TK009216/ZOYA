@echo off
chcp 65001 >nul
title ZOYA - Custom AI Agent
cd /d "%~dp0"

:: Load API key from auth.json if not already set
if "%OPENCODE_API_KEY%"=="" if exist "%USERPROFILE%\.local\share\zoya\auth.json" (
  for /f "tokens=2 delims=: " %%a in ('findstr /c:"""key""" "%USERPROFILE%\.local\share\zoya\auth.json"') do set "OPENCODE_API_KEY=%%~a"
)

:: Kill any existing ZOYA processes on our ports
echo [ZOYA] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25809"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

echo [ZOYA] Starting ZOYA AI Agent...
echo.

:: Start ZOYA WebUI (AionCore spawns zoya-acp automatically)
echo [ZOYA] Launching ZOYA WebUI...
cd /d "%~dp0ui"
bun run webui --no-build --open
if errorlevel 1 (
    echo [ZOYA] WebUI failed, trying production mode...
    bun run webui:prod --no-build --open
)

echo.
pause

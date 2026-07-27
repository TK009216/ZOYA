@echo off
setlocal enabledelayedexpansion

:: ZOYA STARTUP - Dev & Packaged mode
set "ZOYA_ROOT=%~dp0.."
for %%i in ("%ZOYA_ROOT%") do set "ZOYA_ROOT=%%~fi"

:: Detect mode: if runtime\bun.exe exists, we're in packaged mode
set "BUN=bun"
set "BACKEND_SCRIPT=%ZOYA_ROOT%\backend\packages\zoya\src\index.ts"
set "UI_DIR=%ZOYA_ROOT%\ui"
if exist "%ZOYA_ROOT%\runtime\bun.exe" (
    set "BUN=%ZOYA_ROOT%\runtime\bun.exe"
    set "BACKEND_SCRIPT=%ZOYA_ROOT%\backend\dist\index.js"
)

:: Kill old processes on ZOYA ports
echo [ZOYA] Cleaning up...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25809"') do if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25810"') do if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo [ZOYA] Starting ZOYA AI Agent...
echo.

:: Step 1: Start backend (unset auth password so local WebUI can use APIs freely)
set "ZOYA_LOG=%~dp0zoya_startup.log"
echo [ZOYA] [1/3] Starting backend server...
cd /d "%ZOYA_ROOT%"
set "OPENCODE_SERVER_PASSWORD="
set "OPENCODE_DISABLE_EMBEDDED_WEB_UI="
start /B "" "%BUN%" run "%BACKEND_SCRIPT%" serve --port 25810 > "%ZOYA_LOG%" 2>&1

:: Step 2: Wait for backend
echo [ZOYA] [2/3] Initializing backend (15 seconds)...
timeout /t 15 /nobreak >nul

:: Check if backend is listening on port 25810
netstat -ano | findstr ":25810" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo [ZOYA] Backend failed to start. Check zoya_startup.log
    if exist "%ZOYA_LOG%" (
        type "%ZOYA_LOG%"
    )
    pause
    exit /b 1
)

:: Step 3: Start WebUI
echo [ZOYA] [3/3] Backend ready. Launching WebUI...
cd /d "%UI_DIR%"
if exist "%UI_DIR%\out\renderer\index.html" (
    "%BUN%" run scripts/webui.ts --no-build --skip-backend --open
) else (
    "%BUN%" run scripts/webui.ts --skip-backend --open
)
if errorlevel 1 (
    echo [ZOYA] WebUI fallback...
    "%BUN%" run scripts/webui.ts --skip-backend
)

echo [ZOYA] ZOYA is running at http://127.0.0.1:25809
pause

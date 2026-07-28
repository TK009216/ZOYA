@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title ZOYA AI Assistant
set "ZOYA_ROOT=%~dp0"
for %%i in ("%ZOYA_ROOT%") do set "ZOYA_ROOT=%%~fi"
echo [ZOYA] ========================================
echo [ZOYA] ZOYA AI Assistant
echo [ZOYA] ========================================
echo.
:: Check if we're in dev mode (source exists) or packaged mode
set "BUN=bun"
set "BACKEND_SCRIPT=%ZOYA_ROOT%backend\packages\zoya\src\index.ts"
set "UI_DIR=%ZOYA_ROOT%ui"
:: If runtime\bun.exe exists, we're in packaged/standalone mode
if exist "%ZOYA_ROOT%runtime\bun.exe" (
set "BUN=%ZOYA_ROOT%runtime\bun.exe"
set "BACKEND_SCRIPT=%ZOYA_ROOT%backend\dist\index.js"
echo [ZOYA] Running in packaged mode.
) else (
echo [ZOYA] Running in development mode.
)
:: Check Bun is available
"%BUN%" --version >nul 2>&1
if errorlevel 1 (
echo [ERROR] Bun not found. Please run setup.bat first.
pause
exit /b 1
)
:: Check backend source exists
if not exist "%BACKEND_SCRIPT%" (
echo [ERROR] Backend not found at: %BACKEND_SCRIPT%
echo [ERROR] Please run setup.bat first.
pause
exit /b 1
)
:: Check UI directory exists
if not exist "%UI_DIR%" (
echo [ERROR] UI directory not found at: %UI_DIR%
echo [ERROR] Please run setup.bat first.
pause
exit /b 1
)
:: Clean up old processes on ZOYA ports
echo [ZOYA] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25809"') do (
if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25810"') do (
if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
:: Create logs directory if not exists
if not exist "%ZOYA_ROOT%logs" mkdir "%ZOYA_ROOT%logs"
:: Start backend
echo [ZOYA] [1/3] Starting backend server...
set "ZOYA_LOG=%ZOYA_ROOT%logs\zoya_startup.log"
cd /d "%ZOYA_ROOT%"
set "OPENCODE_SERVER_PASSWORD="
set "OPENCODE_DISABLE_EMBEDDED_WEB_UI="
start /B "" "%BUN%" run "%BACKEND_SCRIPT%" serve --port 25810 > "%ZOYA_LOG%" 2>&1
:: Wait for backend with actual health check (max 30 seconds)
echo [ZOYA] [2/3] Waiting for backend to be ready...
set "BACKEND_READY=0"
set "WAIT_COUNT=0"
:CHECK_BACKEND
ping -n 2 127.0.0.1 >nul
curl -s http://127.0.0.1:25810/api/health >nul 2>&1
if %errorlevel% equ 0 (
set "BACKEND_READY=1"
goto BACKEND_OK
)
set /a WAIT_COUNT+=1
if %WAIT_COUNT% lss 30 goto CHECK_BACKEND
:BACKEND_OK
if %BACKEND_READY% equ 0 (
echo [ERROR] Backend failed to start after 30 seconds.
echo [ERROR] Check logs: %ZOYA_LOG%
if exist "%ZOYA_LOG%" type "%ZOYA_LOG%"
pause
exit /b 1
)
echo [ZOYA] Backend is ready.
:: Start WebUI
echo [ZOYA] [3/3] Starting WebUI...
cd /d "%UI_DIR%"
if exist "%UI_DIR%\out\renderer\index.html" (
"%BUN%" run scripts/webui.ts --no-build --skip-backend --open
) else (
echo [INFO] UI not built yet. Building now (this may take a few minutes)...
"%BUN%" run scripts/webui.ts --skip-backend --open
)
if errorlevel 1 (
echo [ERROR] WebUI failed to start.
pause
exit /b 1
)
echo [ZOYA] ZOYA is running at http://127.0.0.1:25809
echo [ZOYA] Press Ctrl+C or close this window to stop.
pause

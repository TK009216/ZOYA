@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title ZOYA ACP Server
echo [ZOYA-ACP] ========================================
echo [ZOYA-ACP] ZOYA AI Control Panel (ACP) Server
echo [ZOYA-ACP] This mode starts ONLY the backend API.
echo [ZOYA-ACP] Use this for headless/agent operation.
echo [ZOYA-ACP] ========================================
echo.
set "ZOYA_ROOT=%~dp0"
for %%i in ("%ZOYA_ROOT%") do set "ZOYA_ROOT=%%~fi"
set "BUN=bun"
set "BACKEND_SCRIPT=%ZOYA_ROOT%backend\packages\zoya\src\index.ts"
if exist "%ZOYA_ROOT%runtime\bun.exe" (
set "BUN=%ZOYA_ROOT%runtime\bun.exe"
set "BACKEND_SCRIPT=%ZOYA_ROOT%backend\dist\index.js"
)
:: Check Bun
"%BUN%" --version >nul 2>&1
if errorlevel 1 (
echo [ERROR] Bun not found. Run setup.bat first.
pause
exit /b 1
)
:: Check backend exists
if not exist "%BACKEND_SCRIPT%" (
echo [ERROR] Backend not found. Run setup.bat first.
pause
exit /b 1
)
:: Clean port 25810
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":25810"') do (
if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
)
:: Create logs directory
if not exist "%ZOYA_ROOT%logs" mkdir "%ZOYA_ROOT%logs"
echo [ZOYA-ACP] Starting ACP server on port 25810...
cd /d "%ZOYA_ROOT%"
"%BUN%" run "%BACKEND_SCRIPT%" acp --port 25810
if errorlevel 1 (
echo [ERROR] ACP server exited with error.
pause
)

@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title ZOYA Setup
set "ZOYA_VER=1.0.0"
echo ================================================
echo ZOYA v%ZOYA_VER% - Setup
echo ================================================
echo.
:: Check Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
echo [WARNING] Not running as Administrator.
echo Some features may not work properly.
echo.
)
:: Check Windows version
for /f "tokens=2 delims=[]" %%a in ('ver') do set "WIN_VER=%%a"
for /f "tokens=2 delims=. " %%a in ("%WIN_VER%") do set "WIN_MAJOR=%%a"
if %WIN_MAJOR% lss 10 (
echo [ERROR] Windows 10+ required. You have: %WIN_VER%
pause
exit /b 1
)
echo [OK] Windows %WIN_VER% detected.
:: Check for Bun
echo [1/6] Checking Bun installation...
where bun >nul 2>&1
if %errorlevel% neq 0 (
echo [INFO] Bun not found. Installing Bun...
powershell -Command "iwr https://bun.sh/install.ps1 -useb | iex"
if %errorlevel% neq 0 (
echo [ERROR] Failed to install Bun automatically.
echo Please install manually from: https://bun.sh
pause
exit /b 1
)
:: Refresh PATH for this session
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)
for /f "tokens=*" %%a in ('bun --version 2^>nul') do set "BUN_VER=%%a"
if "!BUN_VER!"=="" (
echo [ERROR] Bun installation verification failed.
pause
exit /b 1
)
echo [OK] Bun v%BUN_VER% found.
:: Check for Node.js (UI needs it for some native modules)
echo [2/6] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
echo [WARNING] Node.js not found. Some native modules may fail to build.
echo Please install Node.js 22+ from: https://nodejs.org
echo.
)
:: Check for Git
echo [3/6] Checking Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
echo [WARNING] Git not found. Some dependencies may fail.
echo Please install Git from: https://git-scm.com
echo.
)
:: Install root dependencies
echo [4/6] Installing root dependencies...
cd /d "%~dp0"
bun install
if %errorlevel% neq 0 (
echo [ERROR] Root dependency installation failed.
echo Check your internet connection and try again.
pause
exit /b 1
)
echo [OK] Root dependencies installed.
:: Install backend dependencies
echo [5/6] Installing backend dependencies...
cd /d "%~dp0backend"
bun install
if %errorlevel% neq 0 (
echo [ERROR] Backend dependency installation failed.
pause
exit /b 1
)
echo [OK] Backend dependencies installed.
:: Install UI dependencies
echo [6/6] Installing UI dependencies...
cd /d "%~dp0ui"
bun install
if %errorlevel% neq 0 (
echo [ERROR] UI dependency installation failed.
pause
exit /b 1
)
echo [OK] UI dependencies installed.
:: Create .env if not exists
cd /d "%~dp0"
if not exist ".env" (
if exist ".env.example" (
copy ".env.example" ".env" >nul
echo [INFO] Created .env from .env.example
echo [INFO] Please edit .env and add your API keys.
) else (
echo [WARNING] .env.example not found. You must create .env manually.
)
)
:: Create data and logs directories
if not exist "data" mkdir "data"
if not exist "logs" mkdir "logs"
:: Create desktop shortcut
echo [INFO] Creating desktop shortcut...
if not exist "%USERPROFILE%\Desktop\ZOYA.lnk" (
powershell -Command "$ws=New-Object -ComObject WScript.Shell;
$s=$ws.CreateShortcut('%USERPROFILE%\Desktop\ZOYA.lnk'); $s.TargetPath='%~dp0zoya.bat';
$s.WorkingDirectory='%~dp0'; $s.Description='ZOYA AI Assistant v%ZOYA_VER%'; $s.Save()" >nul 2>&1
if !errorlevel! equ 0 (
echo [OK] Desktop shortcut created.
) else (
echo [INFO] Could not create desktop shortcut (non-critical).
)
) else (
echo [OK] Desktop shortcut already exists.
)
echo.
echo ================================================
echo ZOYA v%ZOYA_VER% Setup Complete!
echo ================================================
echo.
echo Next steps:
echo 1. Edit .env and add your API keys
echo 2. Double-click zoya.bat to start ZOYA
echo.
echo Or run from terminal:
echo zoya.bat
echo.
pause
exit /b 0

@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   ZOYA Setup for Windows
echo ============================================
echo.

:: Get ZOYA root folder
pushd "%~dp0.."
set "ZOYA_DIR=%CD%"
popd
echo [setup] ZOYA folder: %ZOYA_DIR%

:: Check if already in PATH
echo %PATH% | find /i "%ZOYA_DIR%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [setup] ZOYA already in PATH.
    goto :install_bun
)

:: Add to USER PATH (no admin needed)
echo [setup] Adding to user PATH...
setx PATH "%ZOYA_DIR%;%PATH%" >nul 2>&1
if %errorlevel% equ 0 (
    echo [setup] Added to user PATH. Restart cmd to see changes.
) else (
    echo [setup] Could not add to PATH via setx.
    echo.
    echo Option 1: Run this setup as Administrator
    echo Option 2: Manually add this to your PATH:
    echo        %ZOYA_DIR%
    echo Option 3: Just use full path: %ZOYA_DIR%\zoya.bat
    pause
    exit /b 1
)

:install_bun
:: Install bun if needed
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [setup] Installing bun...
    powershell -Command "iwr https://bun.sh/install.ps1 -useb | iex"
) else (
    echo [setup] bun OK.
)

:: Install deps
echo [setup] Installing UI dependencies...
cd /d "%ZOYA_DIR%\ui"
bun install

echo [setup] Installing backend dependencies...
cd /d "%ZOYA_DIR%\backend\packages\zoya"
bun install

echo.
echo ============================================
echo   Done!
echo ============================================
echo.
echo   Close this window, open a NEW cmd, then type:
echo     zoya
echo.
pause

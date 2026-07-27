@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title ZOYA Setup - One Click Install

set "ZOYA_VER=1.0.0"
set "MIN_WIN=10"
set "BUN_MIN=1.2.0"

pushd "%~dp0.."
set "ZOYA_ROOT=%CD%"
popd

echo ================================================
echo   ZOYA v%ZOYA_VER% - One Click Setup
echo ================================================
echo.

echo [..] Checking Administrator privileges...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!!] Please run as Administrator.
    echo      Right-click ^> Run as Administrator
    echo.
    pause
    exit /b 1
)
echo [OK] Administrator privileges confirmed.

echo [..] Checking Windows version...
for /f "tokens=2 delims=[]" %%a in ('ver') do set "WIN_VER=%%a"
for /f "tokens=2 delims=. " %%a in ("%WIN_VER%") do set "WIN_MAJOR=%%a"
if %WIN_MAJOR% lss %MIN_WIN% (
    echo [!!] Windows %MIN_WIN%+ required. You have: %WIN_VER%
    pause
    exit /b 1
)
echo [OK] Windows %WIN_VER% compatible.

echo [..] Checking Visual C++ Redistributable...
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\VC\Runtimes\x64" >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] Installing Visual C++ Redistributable...
    powershell -Command "$url='https://aka.ms/vs/17/release/vc_redist.x64.exe'; $out=\"$env:TEMP\vc_redist.x64.exe\"; try { [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile($url,$out); Start-Process -Wait -FilePath $out -ArgumentList '/install /quiet /norestart'; Write-Output 'OK' } catch { Write-Output 'FAIL' }" | findstr "OK" >nul
    if errorlevel 1 ( echo [!!] VC++ install failed ) else ( echo [OK] VC++ installed )
) else ( echo [OK] VC++ already installed. )

echo [..] Checking Bun...
where bun >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] Bun not found - installing...
    powershell -Command "iwr https://bun.sh/install.ps1 -useb | iex"
    for /f "tokens=*" %%a in ('"%USERPROFILE%\.bun\bin\bun" --version 2^>nul') do set "BUN_VER=%%a"
    if "!BUN_VER!"=="" ( echo [!!] Bun install failed. Install manually. & pause & exit /b 1 )
    echo [OK] Bun v!BUN_VER! installed.
) else (
    for /f "tokens=*" %%a in ('bun --version') do set "BUN_VER=%%a"
    echo [OK] Bun v%BUN_VER% found.
)

echo [..] Installing dependencies...
cd /d "%ZOYA_ROOT%\backend"
bun install --no-summary >nul 2>&1
if %errorlevel% neq 0 (
    echo [!!] Dependency install failed. Check network / bun cache.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

echo [..] Adding ZOYA to PATH...
echo %PATH% | find /i "%ZOYA_ROOT%" >nul 2>&1
if %errorlevel% neq 0 (
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%a%%b"
    if "!USER_PATH!"=="" set "USER_PATH="
    echo !USER_PATH! | find /i "%ZOYA_ROOT%" >nul 2>&1
    if errorlevel 1 (
        setx PATH "%ZOYA_ROOT%;!USER_PATH!" >nul 2>&1
        if !errorlevel! equ 0 ( echo [OK] ZOYA added to PATH. ) else ( echo [!!] Could not update PATH. )
    )
) else ( echo [OK] ZOYA already in PATH. )

echo [..] Creating desktop shortcut...
if not exist "%USERPROFILE%\Desktop\ZOYA.lnk" (
    powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%USERPROFILE%\Desktop\ZOYA.lnk'); $s.TargetPath='%ZOYA_ROOT%\zoya.bat'; $s.WorkingDirectory='%ZOYA_ROOT%'; $s.Description='ZOYA AI Agent v%ZOYA_VER%'; $s.Save(); Write-Output 'OK'" | findstr "OK" >nul && echo [OK] Desktop shortcut created. || echo [..] Could not create shortcut.
) else ( echo [OK] Desktop shortcut already exists. )

echo [..] Adding context menu...
reg query "HKCR\Directory\Background\shell\ZOYA" >nul 2>&1
if %errorlevel% neq 0 (
    reg add "HKCR\Directory\Background\shell\ZOYA" /ve /d "Open with ZOYA" /f >nul 2>&1
    reg add "HKCR\Directory\Background\shell\ZOYA\command" /ve /t REG_EXPAND_SZ /d "\"%ZOYA_ROOT%\zoya.bat\" \"%%V\"" /f >nul 2>&1
    if !errorlevel! equ 0 ( echo [OK] Context menu added. ) else ( echo [..] Could not add context menu. )
) else ( echo [OK] Context menu already present. )

echo.
echo ================================================
echo   ZOYA v%ZOYA_VER% Setup Complete!
echo ================================================
echo.
echo   Commands:
echo     zoya          - Start ZOYA (ACP + WebUI)
echo     zoya-acp      - Start ACP server only
echo.
echo   Desktop: ZOYA shortcut created
echo   Right-click: "Open with ZOYA" in any folder
echo.
echo   Open a NEW terminal, then type: zoya
echo.
pause
exit /b 0

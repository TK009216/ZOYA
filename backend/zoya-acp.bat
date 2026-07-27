@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: ZOYA ACP Server - Called by AionCore
cd /d "%~dp0.."

if exist "%~dp0..\runtime\bun.exe" (
    "%~dp0..\runtime\bun.exe" run "%~dp0..\backend\dist\index.js" acp %*
) else (
    bun run "%~dp0..\backend\packages\zoya\src\index.ts" acp %*
)

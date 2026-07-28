@echo off
:: Backend launcher — delegates to root launcher
cd /d "%~dp0.."
call zoya.bat %*

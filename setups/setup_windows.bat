@echo off
:: DEPRECATED: Use setup.bat in the root directory instead.
echo [WARNING] This setup script is deprecated.
echo [INFO] Please use the root setup.bat instead:
echo ..\setup.bat
cd /d "%~dp0.."
call setup.bat

@echo off
cd /d "%~dp0"
node qa-v42-runner.js run
exit /b %errorlevel%

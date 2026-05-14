@echo off
setlocal

set "ROOT=%~dp0.."
set "NO_PAUSE=%OPENCODE_LOCALIZE_NO_PAUSE%"
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"

pushd "%ROOT%" >nul

echo [localize] repo=%CD%
bun localization\scripts\localize-onekey.ts
set "CODE=%ERRORLEVEL%"

if not "%NO_PAUSE%"=="1" pause
popd >nul
exit /b %CODE%

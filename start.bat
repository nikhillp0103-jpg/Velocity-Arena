@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install Node.js and run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  echo Installing app dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Velocity Arena...
echo When the server is ready, open http://localhost:3000
echo Keep this window open while using the website. Press Ctrl+C to stop it.
call npm start
if errorlevel 1 pause

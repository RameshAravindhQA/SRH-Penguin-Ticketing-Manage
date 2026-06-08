@echo off
setlocal

cd /d "%~dp0"

if not exist ".local" mkdir ".local"

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm is not installed or not available on PATH.
  echo Install pnpm first, then run this file again.
  pause
  exit /b 1
)

echo Starting SRH Penguin Ticket Management System...
echo Backend:  http://localhost:6001
echo Frontend: http://localhost:6002
echo.

start "SRH Penguin Backend - 6001" cmd /k "cd /d ""%~dp0"" && pnpm --filter @workspace/api-server run build && set PORT=6001&& set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/penguin&& node --enable-source-maps ./backend/dist/index.mjs"
start "SRH Penguin Frontend - 6002" cmd /k "cd /d ""%~dp0"" && pnpm run dev:frontend"

timeout /t 8 /nobreak >nul
start "" "http://localhost:6002"

echo Servers are launching in separate windows.
echo Close those windows to stop the backend/frontend.
endlocal

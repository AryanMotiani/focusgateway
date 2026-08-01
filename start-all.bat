@echo off
title FocusGateway Launcher
cls
echo ================================================================
echo               FocusGateway — Launch All Services
echo ================================================================
echo.

echo Launching Backend Service on http://localhost:3000 ...
start "FocusGateway Backend Service" cmd /k "npm run dev"

echo Launching Dashboard UI on http://localhost:5173 ...
start "FocusGateway Dashboard UI" cmd /k "cd dashboard && npm run dev"

echo Launching Landing Server on http://localhost:3001 ...
start "FocusGateway Landing Server" cmd /k "npx ts-node -e ""import { createLandingApp } from './landing/server'; createLandingApp().listen(3001, () => console.log('⚡ Landing server running at http://localhost:3001'));"""

echo.
echo ================================================================
echo  All 3 FocusGateway components are running in separate windows:
echo  - Backend Service: http://localhost:3000
echo  - Vue Dashboard:   http://localhost:5173
echo  - Landing Server:  http://localhost:3001
echo ================================================================
echo.
pause

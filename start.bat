@echo off
title FocusGateway

:: 1. Quiet setup if dependencies missing
if not exist "node_modules" (
    call npm install >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to install root dependencies.
        pause
        exit /b 1
    )
)

if not exist "dashboard\node_modules" (
    cd dashboard
    call npm install >nul 2>&1
    cd ..
    if errorlevel 1 (
        echo [ERROR] Failed to install dashboard dependencies.
        pause
        exit /b 1
    )
)

:: 2. Quiet database setup
call npm run migrate >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Database setup failed.
    pause
    exit /b 1
)

:: 3. Launch application services quietly
start "FocusGateway Backend" /min cmd /c "npm run dev >nul 2>&1"
start "FocusGateway Dashboard" /min cmd /c "cd dashboard && npm run dev >nul 2>&1"

echo FocusGateway is running at http://localhost:5173
pause

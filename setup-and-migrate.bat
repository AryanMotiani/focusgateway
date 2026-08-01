@echo off
title FocusGateway Setup & Migration
cls
echo ================================================================
echo          FocusGateway — One-Click Setup & Migration
echo ================================================================
echo.

echo [1/3] Installing root npm dependencies...
call npm install

echo.
echo [2/3] Installing dashboard npm dependencies...
cd dashboard
call npm install
cd ..

echo.
echo [3/3] Running database migrations...
call npm run migrate

echo.
echo ================================================================
echo Setup & migrations complete! You can now run start-all.bat.
echo ================================================================
echo.
pause

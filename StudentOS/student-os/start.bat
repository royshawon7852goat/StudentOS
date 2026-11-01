@echo off
echo ========================================================
echo   Launching StudentOS - Personal Student Management System
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking Python environment...
python -m pip install -r backend\requirements.txt >nul 2>&1

echo [2/2] Starting StudentOS Unified Server on http://localhost:8000 ...
echo.
echo ========================================================
echo   Open your browser at: http://localhost:8000
echo   Demo Login: demo@studentos.dev / student123
echo   (or click 'Launch Demo Workspace' on the sign-in page)
echo ========================================================
echo.

start http://localhost:8000
cd backend
python main.py

pause

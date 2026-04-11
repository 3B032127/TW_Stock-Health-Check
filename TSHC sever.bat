@echo off
echo Starting Taiwan Stock Health Check Servers...

:: Start Backend Server in a new command window
start cmd /k "title Backend Server && python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend Server in a new command window
start cmd /k "title Frontend Server && npm run dev"

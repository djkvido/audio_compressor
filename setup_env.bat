@echo off
setlocal

echo Checking for requirements...
if not exist requirements.txt (
    echo. > requirements.txt
)

echo Checking for virtual environment...
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing dependencies...
pip install -r requirements.txt

echo Starting server...
python start_server.py

pause

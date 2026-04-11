@echo off
setlocal EnableDelayedExpansion
title Audio Compressor - Kvido Production
cd /d "%~dp0"

:: Enable ANSI color support (Windows 10+)
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

:: Fallback color scheme for older consoles
color 0B

cls
echo.
echo    ================================================================
echo.
echo            AUDIO COMPRESSOR  by  Kvido Production
echo.
echo                 Local offline launcher
echo.
echo    ================================================================
echo.
echo    [INFO] Kontroluji prostredi...
echo.

:: ------------------------------------------------------------------
:: Check for Python
:: ------------------------------------------------------------------
set "PYTHON_CMD="

where python >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        set "PYVER=%%v"
        set "PYMAJOR=!PYVER:~0,1!"
        if "!PYMAJOR!"=="3" (
            set "PYTHON_CMD=python"
            goto python_found
        )
    )
)

where py >nul 2>&1
if not errorlevel 1 (
    py -3 --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_CMD=py -3"
        goto python_found
    )
)

where python3 >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python3"
    goto python_found
)

goto python_missing

:python_found
echo    [ OK ] Python 3 nalezen
for /f "delims=" %%v in ('%PYTHON_CMD% --version 2^>^&1') do echo    [INFO] %%v
goto check_files

:: ------------------------------------------------------------------
:: Python missing — offer auto-download
:: ------------------------------------------------------------------
:python_missing
echo    [WARN] Python 3 neni nainstalovan
echo.
echo    ----------------------------------------------------------------
echo    Aplikace potrebuje Python 3 ke spusteni lokalniho serveru.
echo    Muzu stahnout a spustit oficialni instalator z python.org (~30 MB).
echo    Po dokonceni instalace spustte tento skript znovu.
echo    ----------------------------------------------------------------
echo.
set /p answer=   Stahnout a spustit instalator? (A/N):
if /i not "!answer!"=="A" goto abort

echo.
echo    [INFO] Stahuji Python 3.12 instalator...
set "PY_URL=https://www.python.org/ftp/python/3.12.4/python-3.12.4-amd64.exe"
set "PY_FILE=%TEMP%\python-installer.exe"

powershell -NoProfile -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%PY_URL%' -OutFile '%PY_FILE%' -UseBasicParsing; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo    [ ERR] Stazeni selhalo. Zkontroluj pripojeni a zkus to znovu.
    goto abort
)
echo    [ OK ] Instalator stazen do %PY_FILE%
echo.
echo    [INFO] Spoustim instalaci. V okne Pythonu nech zaskrtnute
echo           "Add python.exe to PATH" a klikni "Install Now".
echo.
start /wait "" "%PY_FILE%" PrependPath=1 Include_test=0
if errorlevel 1 (
    echo    [ ERR] Instalace byla prerusena nebo selhala.
    goto abort
)

echo.
echo    [ OK ] Python nainstalovan. Restart skriptu...
echo.
timeout /t 2 /nobreak >nul

:: Restart this script so PATH is refreshed
start "" "%~f0"
exit /b 0

:: ------------------------------------------------------------------
:: Verify app files
:: ------------------------------------------------------------------
:check_files
if not exist "start_server.py" (
    echo    [ ERR] start_server.py nenalezen!
    echo           Spust tento skript ze slozky s aplikaci.
    goto abort
)
if not exist "index.html" (
    echo    [ ERR] index.html nenalezen!
    goto abort
)
echo    [ OK ] Soubory aplikace pritomny
echo.

:: ------------------------------------------------------------------
:: Launch server
:: ------------------------------------------------------------------
echo    ================================================================
echo    [INFO] Spoustim lokalni server na http://localhost:8081
echo    [INFO] Aplikace se otevre automaticky v prohlizeci.
echo    [INFO] Pro ukonceni zavri toto okno nebo stiskni Ctrl+C.
echo    ================================================================
echo.

%PYTHON_CMD% start_server.py

echo.
echo    [INFO] Server ukoncen.
pause
exit /b 0

:abort
echo.
echo    Ukonceno.
echo.
pause
exit /b 1

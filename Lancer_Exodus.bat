@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if not errorlevel 1 (
    py -3 "%~dp0serve.py" --port 8766 --open
    goto done
)
where python >nul 2>nul
if not errorlevel 1 (
    python "%~dp0serve.py" --port 8766 --open
    goto done
)
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" "%~dp0serve.py" --port 8766 --open
    goto done
)
echo Python 3 est necessaire pour le serveur local Exodus.
:done
pause

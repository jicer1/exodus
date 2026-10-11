@echo off
setlocal
cd /d "%~dp0"

echo Verification des changements Exodus...
git status --short
echo.
set /p MESSAGE=Message du commit (laisser vide pour le message standard) : 
if "%MESSAGE%"=="" set "MESSAGE=Mise a jour du projet Exodus"

git add -A
git diff --cached --quiet
if not errorlevel 1 (
    echo Aucun changement a publier.
    pause
    exit /b 0
)

git commit -m "%MESSAGE%"
if errorlevel 1 (
    echo Le commit a echoue.
    pause
    exit /b 1
)

git push origin main
if errorlevel 1 (
    echo L envoi vers GitHub a echoue.
    pause
    exit /b 1
)

echo Mise a jour GitHub terminee.
pause

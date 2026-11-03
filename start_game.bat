@echo off
chcp 65001 > nul
echo ==================================================
echo 🀄 3D 리치 마작 (웹 ^& WebSocket 매칭 서버)를 실행합니다...
echo ==================================================
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    node "%~dp0server.js" --open
) else (
    python "%~dp0run_game.py"
)
pause

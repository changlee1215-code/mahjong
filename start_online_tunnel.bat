@echo off
chcp 65001 > nul
echo ==================================================================
echo 🌐 외부 인터넷(모바일 LTE/5G, 타 지역) 접속용 초고속 공개 HTTPS/WSS 터널을 생성합니다...
echo 아래 출력되는 [ https://xxxxx.trycloudflare.com ] 주소를 공유하세요!
echo (먼저 startgame.bat 로 게임 서버가 실행 중이어야 합니다)
echo ==================================================================
if not exist "%~dp0tools\cloudflared.exe" (
    echo [안내] Cloudflare 터널 실행 파일을 다운로드합니다...
    curl.exe -sL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -o "%~dp0tools\cloudflared.exe"
)
if exist "%~dp0tools\cloudflared.exe" (
    "%~dp0tools\cloudflared.exe" tunnel --url http://127.0.0.1:8000
) else (
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:8000 nokey@localhost.run
)
pause

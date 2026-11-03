@echo off
chcp 65001 > nul
echo ==================================================================
echo 🌐 외부 인터넷(모바일 LTE/5G, 타 지역) 접속용 공개 HTTPS/WSS 터널을 생성합니다...
echo 아래 출력되는 [ https://xxxxx.lhr.life ] 주소를 친구에게 공유하세요!
echo (먼저 startgame.bat 로 게임 서버가 실행 중이어야 합니다)
echo ==================================================================
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:8000 nokey@localhost.run
pause

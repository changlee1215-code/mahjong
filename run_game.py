import http.server
import socketserver
import webbrowser
import os
import sys
import shutil
import subprocess

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    # Prefer Node.js server.js so WebSocket online matchmaking works out of the box
    node_bin = shutil.which("node")
    server_js = os.path.join(DIRECTORY, "server.js")
    if node_bin and os.path.exists(server_js):
        subprocess.run([node_bin, server_js, "--open"], cwd=DIRECTORY)
        return

    global PORT
    while PORT < 8020:
        try:
            with socketserver.TCPServer(("", PORT), Handler) as httpd:
                url = f"http://localhost:{PORT}/index.html"
                print(f"==================================================")
                print(f"🀄 3D 리치 마작 게임 서버가 시작되었습니다!")
                print(f"접속 주소: {url}")
                print(f"서버를 종료하려면 Ctrl+C를 누르세요.")
                print(f"==================================================")
                webbrowser.open(url)
                httpd.serve_forever()
        except OSError:
            PORT += 1

if __name__ == '__main__':
    start_server()

const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath == './') filePath = './index.html';
    filePath = filePath.split('?')[0];

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (!error) {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        } else {
            res.writeHead(404);
            res.end();
        }
    });
}).listen(8080);

const { exec } = require('child_process');
exec('start msedge http://localhost:8080/?debug=1');

// Wait 10 seconds to let the user open the dev console or let it crash
setTimeout(() => { server.close(); process.exit(0); }, 15000);

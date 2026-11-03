/**
 * server.js
 * 3D Riichi Mahjong - Unified HTTP Static Server & WebSocket Online Matchmaking Relay Server
 * Supports 4-digit Room Code matching with zero external npm dependencies (RFC 6455 compliant).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const os = require('os');
const { exec } = require('child_process');

// In-memory compression cache: filePath -> { mtimeMs, raw, gzip, br }
const staticCache = new Map();
const COMPRESSIBLE_EXTS = new Set(['.html', '.js', '.css', '.json', '.svg']);

const DEFAULT_PORT = parseInt(process.env.PORT || '8000', 10);
const ROOT_DIR = __dirname;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

// Active rooms: roomCode (4 digits) -> { code, host: Client, guests: Map<clientId, Client>, createdAt }
const rooms = new Map();
// All connected WebSocket clients: clientId -> Client
const clients = new Map();

function generateClientId() {
    return 'ws-' + crypto.randomBytes(6).toString('hex');
}

function generateUniqueRoomCode(preferred) {
    if (preferred && /^\d{4}$/.test(String(preferred)) && !rooms.has(String(preferred))) {
        return String(preferred);
    }
    for (let i = 0; i < 200; i++) {
        const code = String(Math.floor(1000 + Math.random() * 9000));
        if (!rooms.has(code)) return code;
    }
    return String(Math.floor(1000 + Math.random() * 9000));
}

// -----------------------------------------------------------------------------
// RFC 6455 WebSocket Frame Encoder / Decoder
// -----------------------------------------------------------------------------
function encodeWsFrame(opcode, payloadBuffer) {
    const len = payloadBuffer.length;
    let header;
    if (len < 126) {
        header = Buffer.allocUnsafe(2);
        header[0] = 0x80 | (opcode & 0x0f); // FIN=1 + opcode
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.allocUnsafe(4);
        header[0] = 0x80 | (opcode & 0x0f);
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.allocUnsafe(10);
        header[0] = 0x80 | (opcode & 0x0f);
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payloadBuffer]);
}

function wsSend(client, dataObj) {
    if (!client || !client.open || !client.socket || client.socket.destroyed) return false;
    try {
        const jsonStr = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
        const payload = Buffer.from(jsonStr, 'utf8');
        const frame = encodeWsFrame(0x01, payload); // 0x01 = Text Frame
        client.socket.write(frame);
        return true;
    } catch (err) {
        console.warn('[WS Send Error]', client.id, err.message);
        return false;
    }
}

function wsSendRawFrame(client, opcode, payloadBuffer = Buffer.alloc(0)) {
    if (!client || !client.socket || client.socket.destroyed) return;
    try {
        client.socket.write(encodeWsFrame(opcode, payloadBuffer));
    } catch (e) {}
}

function processRxBuffer(client) {
    while (client.rxBuffer.length >= 2) {
        const firstByte = client.rxBuffer[0];
        const secondByte = client.rxBuffer[1];
        const fin = (firstByte & 0x80) !== 0;
        const opcode = firstByte & 0x0f;
        const isMasked = (secondByte & 0x80) !== 0;
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
            if (client.rxBuffer.length < 4) return; // Wait for more bytes
            payloadLen = client.rxBuffer.readUInt16BE(2);
            offset = 4;
        } else if (payloadLen === 127) {
            if (client.rxBuffer.length < 10) return; // Wait for more bytes
            const bigLen = client.rxBuffer.readBigUInt64BE(2);
            if (bigLen > BigInt(10 * 1024 * 1024)) {
                // Reject excessively large payloads (>10MB)
                closeClient(client, 'payload_too_large');
                return;
            }
            payloadLen = Number(bigLen);
            offset = 10;
        }

        const maskOffset = offset;
        if (isMasked) {
            offset += 4;
        }

        if (client.rxBuffer.length < offset + payloadLen) {
            // Incomplete frame in buffer; wait for next TCP packet
            return;
        }

        // Extract payload
        const payload = Buffer.from(client.rxBuffer.subarray(offset, offset + payloadLen));
        if (isMasked) {
            const maskKey = client.rxBuffer.subarray(maskOffset, maskOffset + 4);
            for (let i = 0; i < payload.length; i++) {
                payload[i] ^= maskKey[i & 3];
            }
        }

        // Advance rxBuffer
        client.rxBuffer = client.rxBuffer.subarray(offset + payloadLen);
        client.lastAlive = Date.now();

        // Handle control frames (can arrive between fragments)
        if (opcode === 0x08) {
            // Close frame
            wsSendRawFrame(client, 0x08);
            closeClient(client, 'ws_close_frame');
            return;
        } else if (opcode === 0x09) {
            // Ping -> Pong
            wsSendRawFrame(client, 0x0a, payload);
            continue;
        } else if (opcode === 0x0a) {
            // Pong
            continue;
        }

        // Data frames (0x01 text, 0x02 binary, 0x00 continuation)
        if (opcode === 0x01 || opcode === 0x02) {
            client.fragments = [payload];
        } else if (opcode === 0x00 && client.fragments) {
            client.fragments.push(payload);
        }

        if (fin && client.fragments && client.fragments.length > 0) {
            const fullPayload = Buffer.concat(client.fragments);
            client.fragments = [];
            try {
                const text = fullPayload.toString('utf8');
                const msg = JSON.parse(text);
                handleClientMessage(client, msg);
            } catch (err) {
                console.warn('[WS Parse Error]', client.id, err.message);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Room & Matchmaking Logic
// -----------------------------------------------------------------------------
function cleanupClientRoom(client, reason = 'disconnect') {
    if (!client || !client.roomCode) return;
    const roomCode = client.roomCode;
    const role = client.role;
    client.roomCode = null;
    client.role = null;

    const room = rooms.get(roomCode);
    if (!room) return;

    if (role === 'host' && room.host && room.host.id === client.id) {
        console.log(`[Room ${roomCode}] Host (${client.id}) left (${reason}). Dissolving room.`);
        for (const [, guestClient] of room.guests.entries()) {
            guestClient.roomCode = null;
            guestClient.role = null;
            wsSend(guestClient, {
                type: 'WS_HOST_DISCONNECTED',
                roomCode,
                reason
            });
        }
        room.guests.clear();
        rooms.delete(roomCode);
    } else if (role === 'guest') {
        if (room.guests.has(client.id)) {
            room.guests.delete(client.id);
            console.log(`[Room ${roomCode}] Guest (${client.id}) left (${reason}). Remaining guests: ${room.guests.size}`);
            if (room.host && room.host.open) {
                wsSend(room.host, {
                    type: 'WS_GUEST_DISCONNECTED',
                    roomCode,
                    guestId: client.id,
                    reason
                });
            }
        }
    }
}

function closeClient(client, reason = 'closed') {
    if (!client) return;
    if (client.roomCode) {
        cleanupClientRoom(client, reason);
    }
    client.open = false;
    clients.delete(client.id);
    if (client.socket && !client.socket.destroyed) {
        try {
            client.socket.destroy();
        } catch (e) {}
    }
}

function handleClientMessage(client, msg) {
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
        case 'WS_PING': {
            wsSend(client, { type: 'WS_PONG', time: msg.time || Date.now() });
            break;
        }

        case 'WS_CREATE_ROOM': {
            if (client.roomCode) {
                cleanupClientRoom(client, 'recreate_room');
            }
            const roomCode = generateUniqueRoomCode(msg.preferredCode);
            client.nickname = msg.nickname || '방장';
            client.roomCode = roomCode;
            client.role = 'host';

            rooms.set(roomCode, {
                code: roomCode,
                host: client,
                guests: new Map(),
                createdAt: Date.now()
            });

            console.log(`[Room ${roomCode}] Created by Host ${client.id} (${client.nickname})`);
            wsSend(client, {
                type: 'WS_ROOM_CREATED',
                roomCode,
                clientId: client.id
            });
            break;
        }

        case 'WS_JOIN_ROOM': {
            if (client.roomCode) {
                cleanupClientRoom(client, 'rejoin_room');
            }
            const roomCode = String(msg.roomCode || '').trim();
            const room = rooms.get(roomCode);

            if (!room || !room.host || !room.host.open) {
                rooms.delete(roomCode);
                wsSend(client, {
                    type: 'WS_ERROR',
                    code: 'ROOM_NOT_FOUND',
                    message: `방 코드(${roomCode})가 존재하지 않거나 이미 닫혔습니다.`
                });
                return;
            }

            if (room.guests.size >= 3) {
                wsSend(client, {
                    type: 'WS_ROOM_FULL',
                    roomCode
                });
                return;
            }

            client.nickname = msg.nickname || '참가자';
            client.roomCode = roomCode;
            client.role = 'guest';
            room.guests.set(client.id, client);

            console.log(`[Room ${roomCode}] Guest ${client.id} (${client.nickname}) joined. Total guests: ${room.guests.size}`);

            // 1. Notify Host first so Host allocates slot and prepares virtual connection
            wsSend(room.host, {
                type: 'WS_GUEST_CONNECTED',
                roomCode,
                guestId: client.id,
                nickname: client.nickname
            });

            // 2. Notify Guest that connection to room succeeded
            wsSend(client, {
                type: 'WS_ROOM_JOINED',
                roomCode,
                clientId: client.id,
                hostId: room.host.id
            });
            break;
        }

        case 'WS_RELAY': {
            const room = client.roomCode ? rooms.get(client.roomCode) : null;
            if (!room) return;

            if (client.role === 'host') {
                const targetId = msg.to;
                if (targetId === 'ALL') {
                    for (const [, guestClient] of room.guests.entries()) {
                        wsSend(guestClient, {
                            type: 'WS_RELAY',
                            from: 'HOST',
                            data: msg.data
                        });
                    }
                } else if (targetId && room.guests.has(targetId)) {
                    const guestClient = room.guests.get(targetId);
                    wsSend(guestClient, {
                        type: 'WS_RELAY',
                        from: 'HOST',
                        data: msg.data
                    });
                }
            } else if (client.role === 'guest') {
                if (room.host && room.host.open) {
                    wsSend(room.host, {
                        type: 'WS_RELAY',
                        from: client.id,
                        data: msg.data
                    });
                }
            }
            break;
        }

        case 'WS_KICK_GUEST': {
            const room = client.roomCode ? rooms.get(client.roomCode) : null;
            if (!room || client.role !== 'host') return;
            const guestId = msg.guestId;
            const guestClient = room.guests.get(guestId);
            if (guestClient) {
                room.guests.delete(guestId);
                guestClient.roomCode = null;
                guestClient.role = null;
                wsSend(guestClient, {
                    type: 'WS_KICKED',
                    roomCode: room.code
                });
            }
            break;
        }

        case 'WS_LEAVE_ROOM': {
            cleanupClientRoom(client, msg.reason || 'user_leave');
            break;
        }
    }
}

// -----------------------------------------------------------------------------
// HTTP Server & WebSocket Upgrade Handler
// -----------------------------------------------------------------------------
const server = http.createServer((req, res) => {
    // Allow CORS for health check & API endpoints
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            ok: true,
            mode: 'websocket',
            activeRooms: rooms.size,
            connectedClients: clients.size,
            timestamp: Date.now()
        }));
        return;
    }

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    // Prevent directory traversal
    const safePath = path.normalize(path.join(ROOT_DIR, pathname));
    if (!safePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(safePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(safePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const headers = { 'Content-Type': contentType };

        if (pathname.startsWith('/lib/')) {
            headers['Cache-Control'] = 'public, max-age=86400';
        } else if (ext === '.html' || ext === '.js' || ext === '.css') {
            headers['Cache-Control'] = 'no-cache';
        }

        if (COMPRESSIBLE_EXTS.has(ext) && stats.size < 5 * 1024 * 1024) {
            let cached = staticCache.get(safePath);
            if (!cached || cached.mtimeMs !== stats.mtimeMs) {
                try {
                    const raw = fs.readFileSync(safePath);
                    const gzip = zlib.gzipSync(raw, { level: 6 });
                    const br = zlib.brotliCompressSync(raw, {
                        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }
                    });
                    cached = { mtimeMs: stats.mtimeMs, raw, gzip, br };
                    staticCache.set(safePath, cached);
                } catch (e) {
                    cached = null;
                }
            }

            if (cached) {
                const acceptEnc = req.headers['accept-encoding'] || '';
                headers['Vary'] = 'Accept-Encoding';
                if (acceptEnc.includes('br')) {
                    headers['Content-Encoding'] = 'br';
                    headers['Content-Length'] = cached.br.length;
                    res.writeHead(200, headers);
                    res.end(cached.br);
                    return;
                } else if (acceptEnc.includes('gzip')) {
                    headers['Content-Encoding'] = 'gzip';
                    headers['Content-Length'] = cached.gzip.length;
                    res.writeHead(200, headers);
                    res.end(cached.gzip);
                    return;
                } else {
                    headers['Content-Length'] = cached.raw.length;
                    res.writeHead(200, headers);
                    res.end(cached.raw);
                    return;
                }
            }
        }

        res.writeHead(200, headers);
        const stream = fs.createReadStream(safePath);
        stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end();
        });
        stream.pipe(res);
    });
});

server.on('upgrade', (req, socket, head) => {
    const upgradeHeader = (req.headers['upgrade'] || '').toLowerCase();
    const key = req.headers['sec-websocket-key'];
    if (upgradeHeader !== 'websocket' || !key) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
    }

    const acceptKey = crypto
        .createHash('sha1')
        .update(key + WS_GUID)
        .digest('base64');

    const responseHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${acceptKey}`,
        '\r\n'
    ].join('\r\n');

    socket.setNoDelay(true);
    socket.write(responseHeaders);

    const client = {
        id: generateClientId(),
        socket,
        open: true,
        rxBuffer: head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0),
        fragments: [],
        roomCode: null,
        role: null,
        nickname: '',
        lastAlive: Date.now()
    };

    clients.set(client.id, client);

    if (client.rxBuffer.length > 0) {
        processRxBuffer(client);
    }

    socket.on('data', (chunk) => {
        if (!client.open) return;
        client.rxBuffer = client.rxBuffer.length > 0
            ? Buffer.concat([client.rxBuffer, chunk])
            : Buffer.from(chunk);
        processRxBuffer(client);
    });

    socket.on('close', () => {
        closeClient(client, 'socket_close');
    });

    socket.on('end', () => {
        closeClient(client, 'socket_end');
    });

    socket.on('error', () => {
        closeClient(client, 'socket_error');
    });
});

// Periodic server-side socket sweep for dead connections
setInterval(() => {
    const now = Date.now();
    for (const [, client] of clients.entries()) {
        if (now - client.lastAlive > 30000) {
            closeClient(client, 'server_timeout');
        } else {
            wsSendRawFrame(client, 0x09); // RFC 6455 Ping
        }
    }
}, 10000).unref();

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

function startServer(port) {
    server.listen(port, '0.0.0.0', () => {
        const localUrl = `http://localhost:${port}/index.html`;
        const lanIps = getLocalIpAddresses();
        console.log('==========================================================');
        console.log('🀄 3D 리치 마작 웹 & WebSocket 매칭 서버가 시작되었습니다!');
        console.log(`▶ 내 PC 접속 주소 : ${localUrl}`);
        if (lanIps.length > 0) {
            lanIps.forEach(ip => {
                console.log(`▶ 외부/동일망 주소 : http://${ip}:${port}/index.html`);
            });
        }
        console.log(`▶ WebSocket 엔드포인트 : ws://localhost:${port}/ws`);
        console.log('서버를 종료하려면 Ctrl+C를 누르세요.');
        console.log('==========================================================');

        if (process.argv.includes('--open')) {
            const startCmd = process.platform === 'win32' ? `start "" "${localUrl}"` : `open "${localUrl}"`;
            exec(startCmd);
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && !process.env.PORT && port < DEFAULT_PORT + 20) {
            console.log(`포트 ${port} 사용 중 -> ${port + 1} 포트로 재시도합니다...`);
            startServer(port + 1);
        } else {
            console.error('서버 시작 오류:', err);
            process.exit(1);
        }
    });
}

if (require.main === module) {
    startServer(DEFAULT_PORT);
}

module.exports = { server, rooms, clients, startServer };

/**
 * MahjongMultiplayer.js
 * Online WebSocket Multiplayer Manager for 3D Riichi Mahjong.
 * Supports 4-digit room code matching via WebSocket Relay Server,
 * slot-based lobby with AI fillers, full-guest ready verification,
 * and seat rotation adapter for client rendering.
 */

(function (global) {
    const WS_STORAGE_KEY = 'mahjong_ws_url';

    class VirtualWsConnection {
        constructor(peerId, sendFn, closeFn) {
            this.peer = peerId;
            this.open = false;
            this._sendFn = sendFn;
            this._closeFn = closeFn;
            this._handlers = {};
        }
        on(event, fn) {
            if (!this._handlers[event]) this._handlers[event] = [];
            this._handlers[event].push(fn);
        }
        emit(event, data) {
            const list = this._handlers[event];
            if (list) {
                for (const fn of list) {
                    try {
                        fn(data);
                    } catch (e) {
                        console.error('[VirtualWsConnection handler error]', e);
                    }
                }
            }
        }
        send(data) {
            if (!this.open) return;
            if (this._sendFn) this._sendFn(data);
        }
        close() {
            if (!this.open) return;
            this.open = false;
            if (this._closeFn) this._closeFn();
        }
    }

    function normalizeWsUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return '';
        let url = rawUrl.trim();
        if (!url) return '';
        if (url.startsWith('https://')) {
            url = 'wss://' + url.slice('https://'.length);
        } else if (url.startsWith('http://')) {
            url = 'ws://' + url.slice('http://'.length);
        } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
            const isLocal = url.startsWith('localhost') || url.startsWith('127.0.0.1') || /^\d+\.\d+\.\d+\.\d+/.test(url);
            url = (isLocal ? 'ws://' : 'wss://') + url;
        }
        try {
            const parsed = new URL(url);
            if (!parsed.pathname || parsed.pathname === '/') {
                parsed.pathname = '/ws';
            }
            return parsed.toString();
        } catch (e) {
            return url;
        }
    }

    const MahjongMultiplayer = {
        ws: null,
        peer: null, // Maintained as { id: clientId, destroy() } for UI compatibility
        customWsUrl: (typeof localStorage !== 'undefined' ? localStorage.getItem(WS_STORAGE_KEY) : '') || '',
        isHost: false,
        roomCode: null,
        mySeatIdx: 0,
        myNickname: '플레이어',
        connections: {}, // peerId -> VirtualWsConnection
        hostConn: null,  // For guest: VirtualWsConnection to host
        lobbySlots: [
            { seatIdx: 0, type: 'human', peerId: 'HOST', name: '플레이어 (방장)', ready: true, isHost: true },
            { seatIdx: 1, type: 'ai',    peerId: null,   name: 'AI 하가', ready: true, isHost: false },
            { seatIdx: 2, type: 'ai',    peerId: null,   name: 'AI 대면', ready: true, isHost: false },
            { seatIdx: 3, type: 'ai',    peerId: null,   name: 'AI 상가', ready: true, isHost: false }
        ],
        isHanchan: true,
        clientProxy: null,
        heartbeatTimer: null,
        lastPongTimes: {},
        lastHostPongTime: 0,
        _handlingHostDisconnect: false,
        onLobbyUpdate: null,
        onLobbyNotice: null,
        onHostLeftLobby: null,
        onKicked: null,
        onGameStart: null,
        onError: null
    };

    MahjongMultiplayer.getWsUrl = function () {
        if (typeof window !== 'undefined' && window.MAHJONG_WS_URL) {
            return normalizeWsUrl(window.MAHJONG_WS_URL);
        }
        const saved = this.customWsUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem(WS_STORAGE_KEY) : '');
        if (saved && saved.trim()) {
            return normalizeWsUrl(saved);
        }
        if (typeof window !== 'undefined' && window.location) {
            const proto = window.location.protocol;
            const host = window.location.host;
            if ((proto === 'http:' || proto === 'https:') && host) {
                const wsProto = proto === 'https:' ? 'wss:' : 'ws:';
                return `${wsProto}//${host}/ws`;
            }
        }
        return 'ws://localhost:8000/ws';
    };

    MahjongMultiplayer.setCustomWsUrl = function (rawUrl) {
        const cleaned = (rawUrl || '').trim();
        this.customWsUrl = cleaned ? normalizeWsUrl(cleaned) : '';
        if (typeof localStorage !== 'undefined') {
            if (this.customWsUrl) {
                localStorage.setItem(WS_STORAGE_KEY, this.customWsUrl);
            } else {
                localStorage.removeItem(WS_STORAGE_KEY);
            }
        }
        return this.getWsUrl();
    };

    MahjongMultiplayer.checkServerStatus = function (callback) {
        const targetUrl = this.getWsUrl();
        if (typeof WebSocket === 'undefined') {
            if (callback) callback({ ok: false, url: targetUrl, error: 'WebSocket을 지원하지 않는 환경입니다.' });
            return;
        }
        let settled = false;
        const startTime = Date.now();
        let probeWs = null;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            try { if (probeWs) probeWs.close(); } catch (e) {}
            if (callback) callback({ ok: false, url: targetUrl, error: '연결 시간 초과 (서버 응답 없음)' });
        }, 3500);

        try {
            probeWs = new WebSocket(targetUrl);
            probeWs.onopen = () => {
                try {
                    probeWs.send(JSON.stringify({ type: 'WS_PING', time: startTime }));
                } catch (e) {}
            };
            probeWs.onmessage = (ev) => {
                if (settled) return;
                try {
                    const data = JSON.parse(ev.data);
                    if (data && data.type === 'WS_PONG') {
                        settled = true;
                        clearTimeout(timer);
                        const latencyMs = Math.max(1, Date.now() - startTime);
                        try { probeWs.close(); } catch (e) {}
                        if (callback) callback({ ok: true, url: targetUrl, latencyMs });
                    }
                } catch (e) {}
            };
            probeWs.onerror = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                try { probeWs.close(); } catch (e) {}
                if (callback) callback({ ok: false, url: targetUrl, error: 'WebSocket 서버에 연결할 수 없습니다.' });
            };
        } catch (err) {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                if (callback) callback({ ok: false, url: targetUrl, error: err.message });
            }
        }
    };

    MahjongMultiplayer.wsSend = function (obj) {
        if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN === 1
            try {
                this.ws.send(JSON.stringify(obj));
                return true;
            } catch (err) {
                console.warn('[Multiplayer WS Send Error]', err);
            }
        }
        return false;
    };

    MahjongMultiplayer.closeWebSocket = function () {
        if (this.ws) {
            const oldWs = this.ws;
            this.ws = null;
            try {
                oldWs.onopen = null;
                oldWs.onmessage = null;
                oldWs.onclose = null;
                oldWs.onerror = null;
                if (oldWs.readyState === 0 || oldWs.readyState === 1) {
                    oldWs.close();
                }
            } catch (e) {}
        }
    };

    function generate4DigitCode() {
        return String(Math.floor(1000 + Math.random() * 9000));
    }

    // Helper: relative seat translation
    // mySeatIdx is at relative index 0 (bottom).
    function toRel(absSeat, mySeat) {
        if (absSeat == null) return null;
        return (absSeat - mySeat + 4) % 4;
    }
    function toAbs(relSeat, mySeat) {
        if (relSeat == null) return null;
        return (relSeat + mySeat) % 4;
    }

    // Clone and rotate game snapshot so players[0] is always viewer's perspective
    function createRotatedSnapshot(rawGame, mySeat) {
        if (!rawGame) return null;
        const rotated = {
            state: rawGame.state,
            currentTurn: toRel(rawGame.currentTurn, mySeat),
            dealerIdx: toRel(rawGame.dealerIdx, mySeat),
            roundWind: rawGame.roundWind,
            roundNum: rawGame.roundNum,
            honba: rawGame.honba,
            riichiSticks: rawGame.riichiSticks,
            wall: rawGame.wall || [],
            wallRemaining: typeof rawGame.getRemainingTileCount === 'function' ? rawGame.getRemainingTileCount() : (rawGame.wall ? rawGame.wall.length : 70),
            doraIndicators: rawGame.doraIndicators ? [...rawGame.doraIndicators] : [],
            uraDoraIndicators: rawGame.uraDoraIndicators ? [...rawGame.uraDoraIndicators] : [],
            config: rawGame.config,
            isWinPending: rawGame.isWinPending,
            lastWinnerIdx: toRel(rawGame.lastWinnerIdx, mySeat),
            lastWinWasRiichi: rawGame.lastWinWasRiichi
        };

        // Rotated players array: index 0 is mySeat
        rotated.players = [];
        for (let rel = 0; rel < 4; rel++) {
            const abs = toAbs(rel, mySeat);
            const p = rawGame.players[abs];
            if (p) {
                const clonedMelds = (p.melds || []).map(m => ({
                    ...m,
                    fromPlayer: m.fromPlayer != null ? toRel(m.fromPlayer, mySeat) : null
                }));
                rotated.players.push({
                    id: rel, // relative ID
                    absId: abs,
                    name: p.name,
                    baseName: p.baseName,
                    isAI: !!p.isAI,
                    points: p.points,
                    wind: p.wind,
                    seatWind: p.seatWind,
                    hand: p.hand ? JSON.parse(JSON.stringify(p.hand)) : [],
                    melds: clonedMelds,
                    discards: p.discards ? JSON.parse(JSON.stringify(p.discards)) : [],
                    isRiichi: !!p.isRiichi,
                    isDoubleRiichi: !!p.isDoubleRiichi,
                    isIppatsu: !!p.isIppatsu,
                    waitingTiles: p.waitingTiles ? [...p.waitingTiles] : [],
                    tenpaiDiscards: p.tenpaiDiscards ? JSON.parse(JSON.stringify(p.tenpaiDiscards)) : [],
                    riichiWaitingTiles: p.riichiWaitingTiles ? [...p.riichiWaitingTiles] : [],
                    bankTimeMs: p.bankTimeMs != null ? p.bankTimeMs : 30000
                });
            }
        }

        if (rawGame.lastDiscard) {
            rotated.lastDiscard = {
                ...rawGame.lastDiscard,
                playerId: toRel(rawGame.lastDiscard.playerId, mySeat)
            };
        }

        return rotated;
    }

    // -------------------------------------------------------------------------
    // HOST METHODS (WebSocket 4-Digit Room Code)
    // -------------------------------------------------------------------------
    MahjongMultiplayer.createRoom = function (nickname, onReady) {
        if (typeof WebSocket === 'undefined') {
            alert('현재 브라우저에서 WebSocket을 지원하지 않습니다.');
            return;
        }

        this.isHost = true;
        this._handlingHostDisconnect = false;
        this.myNickname = nickname || '방장';
        this.roomCode = generate4DigitCode();
        this.connections = {};
        this.timerMode = this.timerMode || 'standard';
        this.lobbySlots = [
            { seatIdx: 0, type: 'human', peerId: 'HOST', name: `${this.myNickname} (방장)`, ready: true, isHost: true },
            { seatIdx: 1, type: 'ai',    peerId: null,   name: 'AI 하가', ready: true, isHost: false },
            { seatIdx: 2, type: 'ai',    peerId: null,   name: 'AI 대면', ready: true, isHost: false },
            { seatIdx: 3, type: 'ai',    peerId: null,   name: 'AI 상가', ready: true, isHost: false }
        ];

        this.closeWebSocket();
        const wsUrl = this.getWsUrl();
        let roomReadyFired = false;

        try {
            const ws = new WebSocket(wsUrl);
            this.ws = ws;

            const connectTimer = setTimeout(() => {
                if (!roomReadyFired && this.ws === ws) {
                    this.closeWebSocket();
                    if (this.onError) {
                        this.onError(new Error(`매칭 서버(${wsUrl}) 연결 시간 초과. 서버가 실행 중인지 확인해주세요.`));
                    }
                }
            }, 6000);

            ws.onopen = () => {
                if (this.ws !== ws) return;
                this.wsSend({
                    type: 'WS_CREATE_ROOM',
                    preferredCode: this.roomCode,
                    nickname: this.myNickname
                });
            };

            ws.onmessage = (ev) => {
                if (this.ws !== ws) return;
                let msg;
                try {
                    msg = JSON.parse(ev.data);
                } catch (e) {
                    return;
                }
                if (!msg || !msg.type) return;

                if (msg.type === 'WS_ROOM_CREATED') {
                    clearTimeout(connectTimer);
                    roomReadyFired = true;
                    this.roomCode = msg.roomCode;
                    this.peer = {
                        id: msg.clientId,
                        destroy: () => this.closeWebSocket()
                    };
                    console.log('[Multiplayer Host] WebSocket room created:', this.roomCode, 'ClientId:', msg.clientId);
                    this.startHeartbeat();
                    if (onReady) onReady(this.roomCode);
                    this.broadcastLobbyState();
                } else if (msg.type === 'WS_GUEST_CONNECTED') {
                    const guestId = msg.guestId;
                    const conn = new VirtualWsConnection(
                        guestId,
                        (data) => this.wsSend({ type: 'WS_RELAY', to: guestId, data }),
                        () => this.wsSend({ type: 'WS_KICK_GUEST', guestId })
                    );
                    this.handleGuestConnection(conn);
                    conn.open = true;
                    conn.emit('open');
                } else if (msg.type === 'WS_RELAY') {
                    const conn = this.connections[msg.from];
                    if (conn && conn.open) {
                        conn.emit('data', msg.data);
                    }
                } else if (msg.type === 'WS_GUEST_DISCONNECTED') {
                    this.handleGuestDisconnect(msg.guestId, msg.reason || 'ws_disconnect');
                } else if (msg.type === 'WS_ERROR') {
                    clearTimeout(connectTimer);
                    if (this.onError) {
                        this.onError(new Error(msg.message || '서버 오류가 발생했습니다.'));
                    }
                }
            };

            ws.onerror = () => {
                if (this.ws !== ws) return;
                clearTimeout(connectTimer);
                if (!roomReadyFired && this.onError) {
                    this.onError(new Error(`매칭 서버(${wsUrl})에 연결할 수 없습니다.`));
                }
            };

            ws.onclose = () => {
                if (this.ws !== ws) return;
                clearTimeout(connectTimer);
                console.warn('[Multiplayer Host] WebSocket connection closed.');
            };
        } catch (err) {
            if (this.onError) this.onError(err);
        }
    };

    MahjongMultiplayer.startHeartbeat = function () {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.lastPongTimes = {};
        this.lastHostPongTime = Date.now();
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            if (this.isHost) {
                for (const peerId of Object.keys(this.connections)) {
                    const conn = this.connections[peerId];
                    if (conn && conn.open) {
                        try {
                            conn.send({ type: 'HEARTBEAT_PING', time: now });
                        } catch (e) {
                            console.warn('[Heartbeat send error]', e);
                        }
                        const lastPong = this.lastPongTimes[peerId] || now;
                        if (now - lastPong > 5000) {
                            console.warn('[Multiplayer Host] Heartbeat timeout for peer:', peerId);
                            this.handleGuestDisconnect(peerId, 'heartbeat_timeout');
                        }
                    }
                }
            } else if (this.hostConn && this.hostConn.open) {
                try {
                    this.hostConn.send({ type: 'HEARTBEAT_PING', time: now });
                } catch (e) {
                    console.warn('[Heartbeat send error to host]', e);
                }
                const lastHostPong = this.lastHostPongTime || now;
                if (now - lastHostPong > 5000) {
                    console.warn('[Multiplayer Guest] Heartbeat timeout for host');
                    this.handleHostDisconnect('heartbeat_timeout');
                }
            }
        }, 2000);
    };

    MahjongMultiplayer.stopHeartbeat = function () {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.lastPongTimes = {};
        this.lastHostPongTime = 0;
    };

    MahjongMultiplayer.attachConnectionStateListeners = function (conn, onDisconnect) {
        if (!conn) return;
        const checkPc = () => {
            if (conn.peerConnection) {
                const pc = conn.peerConnection;
                const checkState = () => {
                    const cs = pc.connectionState;
                    const ics = pc.iceConnectionState;
                    if (cs === 'disconnected' || cs === 'failed' || cs === 'closed' ||
                        ics === 'disconnected' || ics === 'failed' || ics === 'closed') {
                        console.warn(`[Multiplayer] WebRTC state: conn=${cs}, ice=${ics}`);
                        onDisconnect(`webrtc_${cs || ics}`);
                    }
                };
                try {
                    pc.addEventListener('connectionstatechange', checkState);
                    pc.addEventListener('iceconnectionstatechange', checkState);
                } catch (e) {}
            }
        };

        if (conn.peerConnection) {
            checkPc();
        } else {
            conn.on('open', checkPc);
        }
    };

    MahjongMultiplayer.handleGuestConnection = function (conn) {
        conn.on('open', () => {
            console.log('[Multiplayer Host] Guest connected:', conn.peer);
            this.connections[conn.peer] = conn;
            this.lastPongTimes[conn.peer] = Date.now();

            this.attachConnectionStateListeners(conn, (why) => {
                this.handleGuestDisconnect(conn.peer, why);
            });

            // Find first available AI / empty slot
            const slotIdx = this.lobbySlots.findIndex(s => s.type === 'ai');
            if (slotIdx === -1) {
                // Room full
                try {
                    conn.send({ type: 'ROOM_FULL' });
                    conn.close();
                } catch (e) {}
                delete this.connections[conn.peer];
                return;
            }

            // Assign slot to guest
            this.lobbySlots[slotIdx] = {
                seatIdx: slotIdx,
                type: 'human',
                peerId: conn.peer,
                name: '참가자',
                ready: false,
                isHost: false
            };

            this.broadcastLobbyState();
        });

        conn.on('data', (data) => {
            this.handleGuestMessage(conn.peer, data);
        });

        conn.on('close', () => {
            this.handleGuestDisconnect(conn.peer, 'conn_close');
        });

        conn.on('error', (err) => {
            console.warn('[Multiplayer Host] Guest conn error:', conn.peer, err);
            this.handleGuestDisconnect(conn.peer, 'conn_error');
        });
    };

    MahjongMultiplayer.handleGuestDisconnect = function (peerId, reason, overrideName) {
        if (!this.connections[peerId] && !this.lobbySlots.some(s => s.peerId === peerId)) {
            return; // already handled
        }
        console.log('[Multiplayer Host] Handling disconnect for peer:', peerId, 'reason:', reason);
        delete this.connections[peerId];
        delete this.lastPongTimes[peerId];

        const slotIdx = this.lobbySlots.findIndex(s => s.peerId === peerId);
        if (slotIdx === -1) return;

        const defaultNames = ['플레이어', 'AI 하가', 'AI 대면', 'AI 상가'];
        const oldName = overrideName || this.lobbySlots[slotIdx].name || defaultNames[slotIdx];
        const isGameActive = this.activeGame && this.activeGame.state !== 'GAME_OVER';

        // 1. Update lobby slot to AI
        this.lobbySlots[slotIdx] = {
            seatIdx: slotIdx,
            type: 'ai',
            peerId: null,
            name: isGameActive ? `${oldName} (AI)` : defaultNames[slotIdx],
            ready: true,
            isHost: false
        };
        this.broadcastLobbyState();

        if (!isGameActive) {
            // LOBBY MODE: Notify host and all other remaining guests immediately!
            const noticeText = `📢 [${oldName}] 님이 방을 나갔습니다 (연결 종료).`;
            this.triggerLobbyNotice(noticeText, 'warning');
            this.broadcastLobbyNotice(noticeText, 'warning');
            return;
        }

        // 2. IN-GAME MODE: If a game is active, convert that player to AI and auto-progress immediately!
        const player = this.activeGame.players[slotIdx];
        if (player) {
            player.isAI = true;
            player.customName = `${oldName} (AI)`;
            player.name = player.customName;
        }

        const noticeText = `📢 [${oldName}] 님의 연결이 종료되었습니다.\nAI로 전환되어 대국을 자동 진행합니다.`;

        // Display notice on host screen
        if (typeof window !== 'undefined' && typeof window.showBigMessage === 'function') {
            window.showBigMessage(slotIdx, noticeText, 4500);
        }

        // Broadcast notice & snapshot to other remaining guests
        this.broadcastGameNotice(noticeText);

        // Re-render UI
        if (typeof window !== 'undefined' && typeof window.updatePlayerStatusUI === 'function') {
            window.updatePlayerStatusUI();
        }

        // Auto-progress immediately if this player was expected to act!
        this.autoProgressDisconnectedSeat(slotIdx);
    };

    MahjongMultiplayer.triggerLobbyNotice = function (text, level = 'info') {
        if (this.onLobbyNotice) {
            this.onLobbyNotice({ text, level });
        }
    };

    MahjongMultiplayer.broadcastLobbyNotice = function (text, level = 'info') {
        const msg = { type: 'LOBBY_NOTICE', text, level };
        for (const peerId of Object.keys(this.connections)) {
            const conn = this.connections[peerId];
            if (conn && conn.open) {
                try {
                    conn.send(msg);
                } catch (e) {}
            }
        }
    };

    MahjongMultiplayer.autoProgressDisconnectedSeat = function (seatIdx) {
        const game = this.activeGame;
        if (!game || game.state === 'GAME_OVER' || game.state === 'ROUND_OVER') return;

        console.log(`[Multiplayer Host] Auto-progressing disconnected seat ${seatIdx}, state=${game.state}, turn=${game.currentTurn}`);

        // A. If game is in AWAIT_REACTION:
        if (game.state === 'AWAIT_REACTION') {
            if (game.pendingMultiReactions && game.pendingMultiReactions.requiredPlayerIds.includes(seatIdx)) {
                if (!game.pendingMultiReactions.decisions[seatIdx]) {
                    const pReactions = (game.pendingMultiReactions.allReactions || []).filter(r => r.playerId === seatIdx);
                    const ron = pReactions.find(r => r.type === 'ron');
                    if (ron) {
                        game.submitReactionDecision(seatIdx, { type: 'ron' });
                    } else {
                        game.submitReactionDecision(seatIdx, { type: 'pass' });
                    }
                }
            } else {
                game.passReaction(seatIdx);
            }
            return;
        }

        // B. If game is in AWAIT_DISCARD and it is this player's turn:
        if (game.state === 'AWAIT_DISCARD' && game.currentTurn === seatIdx) {
            console.log(`[Multiplayer Host] Running processAITurn for disconnected seat ${seatIdx}`);
            setTimeout(() => {
                if (this.activeGame && this.activeGame.state === 'AWAIT_DISCARD' && this.activeGame.currentTurn === seatIdx) {
                    this.activeGame.processAITurn(seatIdx);
                }
            }, 600);
        }
    };

    MahjongMultiplayer.broadcastGameNotice = function (noticeText) {
        if (!this.activeGame) return;
        for (const peerId of Object.keys(this.connections)) {
            const slot = this.lobbySlots.find(s => s.peerId === peerId);
            if (!slot) continue;
            const guestSeat = slot.seatIdx;
            const conn = this.connections[peerId];
            if (conn && conn.open) {
                const snapshot = createRotatedSnapshot(this.activeGame, guestSeat);
                conn.send({
                    type: 'GAME_NOTICE',
                    text: noticeText,
                    snapshot: snapshot
                });
            }
        }
    };

    MahjongMultiplayer.handleGuestMessage = function (peerId, msg) {
        if (!msg || !msg.type) return;

        if (msg.type === 'HEARTBEAT_PING') {
            this.lastPongTimes[peerId] = Date.now();
            const conn = this.connections[peerId];
            if (conn && conn.open) {
                try {
                    conn.send({ type: 'HEARTBEAT_PONG', time: msg.time });
                } catch (e) {}
            }
            return;
        }

        if (msg.type === 'HEARTBEAT_PONG') {
            this.lastPongTimes[peerId] = Date.now();
            return;
        }

        if (msg.type === 'GUEST_LEAVING') {
            this.handleGuestDisconnect(peerId, msg.reason || 'guest_leaving', msg.name);
            return;
        }

        const slot = this.lobbySlots.find(s => s.peerId === peerId);
        if (!slot) return;

        if (msg.type === 'SET_NICKNAME') {
            slot.name = msg.name || '참가자';
            const noticeText = `📢 [${slot.name}] 님이 대기방에 입장했습니다.`;
            this.triggerLobbyNotice(noticeText, 'info');
            this.broadcastLobbyNotice(noticeText, 'info');
            this.broadcastLobbyState();
        } else if (msg.type === 'TOGGLE_READY') {
            slot.ready = !slot.ready;
            this.broadcastLobbyState();
        } else if (msg.type.startsWith('ACTION_')) {
            // Forward gameplay actions from guest to host's MahjongGame
            if (this.activeGame) {
                this.handleHostGameAction(slot.seatIdx, msg);
            }
        }
    };

    MahjongMultiplayer.toggleSlotAI = function (seatIdx) {
        if (!this.isHost || seatIdx === 0) return;
        const slot = this.lobbySlots[seatIdx];
        if (!slot) return;

        const defaultNames = ['플레이어', 'AI 하가', 'AI 대면', 'AI 상가'];
        if (slot.type === 'ai') {
            // Nothing to toggle if already AI and empty
        } else if (slot.type === 'human' && slot.peerId) {
            // Kick guest
            const kickedName = slot.name || '참가자';
            const conn = this.connections[slot.peerId];
            if (conn) {
                try {
                    conn.send({ type: 'KICKED', name: kickedName });
                    conn.close();
                } catch (e) {}
            }
            delete this.connections[slot.peerId];
            delete this.lastPongTimes[slot.peerId];
            this.lobbySlots[seatIdx] = {
                seatIdx,
                type: 'ai',
                peerId: null,
                name: defaultNames[seatIdx],
                ready: true,
                isHost: false
            };
            const kickNotice = `📢 [${kickedName}] 님이 대기방에서 퇴장(강퇴)되었습니다.`;
            this.triggerLobbyNotice(kickNotice, 'warning');
            this.broadcastLobbyNotice(kickNotice, 'warning');
        }
        this.broadcastLobbyState();
    };

    MahjongMultiplayer.broadcastLobbyState = function () {
        const stateMsg = {
            type: 'LOBBY_STATE',
            roomCode: this.roomCode,
            slots: this.lobbySlots,
            isHanchan: this.isHanchan,
            timerMode: this.timerMode || 'standard'
        };
        for (const peerId of Object.keys(this.connections)) {
            const conn = this.connections[peerId];
            if (conn && conn.open) {
                try {
                    conn.send(stateMsg);
                } catch (e) {}
            }
        }
        if (this.onLobbyUpdate) {
            this.onLobbyUpdate(stateMsg);
        }
    };

    MahjongMultiplayer.canStartGame = function () {
        if (!this.isHost) return false;
        // All human players must be ready
        const humans = this.lobbySlots.filter(s => s.type === 'human' && !s.isHost);
        return humans.every(s => s.ready === true);
    };

    // -------------------------------------------------------------------------
    // GUEST METHODS (WebSocket 4-Digit Room Code)
    // -------------------------------------------------------------------------
    MahjongMultiplayer.joinRoom = function (roomCode, nickname, onJoined, onError) {
        if (typeof WebSocket === 'undefined') {
            alert('현재 브라우저에서 WebSocket을 지원하지 않습니다.');
            return;
        }

        this.isHost = false;
        this._handlingHostDisconnect = false;
        this.roomCode = String(roomCode).trim();
        this.myNickname = nickname || '참가자';

        this.closeWebSocket();
        const wsUrl = this.getWsUrl();
        let joinedSuccess = false;

        try {
            const ws = new WebSocket(wsUrl);
            this.ws = ws;

            const connectTimer = setTimeout(() => {
                if (!joinedSuccess && this.ws === ws) {
                    this.closeWebSocket();
                    const err = new Error(`매칭 서버(${wsUrl}) 연결 시간 초과.`);
                    if (onError) onError(err);
                }
            }, 6000);

            ws.onopen = () => {
                if (this.ws !== ws) return;
                this.wsSend({
                    type: 'WS_JOIN_ROOM',
                    roomCode: this.roomCode,
                    nickname: this.myNickname
                });
            };

            ws.onmessage = (ev) => {
                if (this.ws !== ws) return;
                let msg;
                try {
                    msg = JSON.parse(ev.data);
                } catch (e) {
                    return;
                }
                if (!msg || !msg.type) return;

                if (msg.type === 'WS_ROOM_JOINED') {
                    clearTimeout(connectTimer);
                    joinedSuccess = true;
                    this.roomCode = msg.roomCode;
                    this.peer = {
                        id: msg.clientId,
                        destroy: () => this.closeWebSocket()
                    };
                    const conn = new VirtualWsConnection(
                        'HOST',
                        (data) => this.wsSend({ type: 'WS_RELAY', to: 'HOST', data }),
                        () => this.wsSend({ type: 'WS_LEAVE_ROOM', reason: 'guest_close' })
                    );
                    conn.open = true;
                    this.hostConn = conn;
                    this.lastHostPongTime = Date.now();
                    this.startHeartbeat();
                    conn.send({ type: 'SET_NICKNAME', name: this.myNickname });
                    if (onJoined) onJoined(this.roomCode);
                } else if (msg.type === 'WS_RELAY') {
                    this.handleHostMessage(msg.data);
                } else if (msg.type === 'WS_HOST_DISCONNECTED') {
                    this.handleHostDisconnect(msg.reason || 'ws_host_disconnect');
                } else if (msg.type === 'WS_KICKED') {
                    this.handleHostMessage({ type: 'KICKED' });
                } else if (msg.type === 'WS_ROOM_FULL') {
                    clearTimeout(connectTimer);
                    this.handleHostMessage({ type: 'ROOM_FULL' });
                    this.closeWebSocket();
                    if (onError) onError(new Error('방이 꽉 찼습니다 (최대 4인).'));
                } else if (msg.type === 'WS_ERROR') {
                    clearTimeout(connectTimer);
                    this.closeWebSocket();
                    if (onError) onError(new Error(msg.message || '방 접속 실패. 코드를 다시 확인해주세요.'));
                }
            };

            ws.onerror = () => {
                if (this.ws !== ws) return;
                clearTimeout(connectTimer);
                if (!joinedSuccess) {
                    if (onError) onError(new Error(`매칭 서버(${wsUrl}) 연결 실패.`));
                } else {
                    this.handleHostDisconnect('ws_error');
                }
            };

            ws.onclose = () => {
                if (this.ws !== ws) return;
                clearTimeout(connectTimer);
                if (joinedSuccess) {
                    this.handleHostDisconnect('ws_close');
                }
            };
        } catch (err) {
            if (onError) onError(err);
        }
    };

    MahjongMultiplayer.handleHostMessage = function (msg) {
        if (!msg || !msg.type) return;

        if (msg.type === 'HEARTBEAT_PING') {
            this.lastHostPongTime = Date.now();
            if (this.hostConn && this.hostConn.open) {
                try {
                    this.hostConn.send({ type: 'HEARTBEAT_PONG', time: msg.time });
                } catch (e) {}
            }
            return;
        }

        if (msg.type === 'HEARTBEAT_PONG') {
            this.lastHostPongTime = Date.now();
            return;
        }

        if (msg.type === 'HOST_LEAVING') {
            this.handleHostDisconnect('host_leaving');
            return;
        }

        if (msg.type === 'LOBBY_NOTICE') {
            if (this.onLobbyNotice) {
                this.onLobbyNotice(msg);
            }
            return;
        }

        if (msg.type === 'GAME_NOTICE') {
            if (this.clientProxy && msg.snapshot) {
                this.clientProxy.handleIncomingGameEvent('gameNotice', null, msg.snapshot);
            }
            if (typeof window !== 'undefined' && typeof window.showBigMessage === 'function') {
                window.showBigMessage(0, msg.text, 4500);
            }
            if (typeof window !== 'undefined' && typeof window.updatePlayerStatusUI === 'function') {
                window.updatePlayerStatusUI();
            }
            return;
        }

        if (msg.type === 'ROOM_FULL') {
            alert('방이 꽉 찼습니다 (최대 4인).');
            if (this.hostConn) {
                try { this.hostConn.close(); } catch (e) {}
            }
            return;
        }

        if (msg.type === 'KICKED') {
            this.stopHeartbeat();
            if (this.hostConn) {
                try { this.hostConn.close(); } catch (e) {}
                this.hostConn = null;
            }
            if (this.peer) {
                try { this.peer.destroy(); } catch (e) {}
                this.peer = null;
            }
            if (this.onKicked) {
                this.onKicked();
            } else if (this.onHostLeftLobby) {
                this.onHostLeftLobby('방장', 'kicked');
            }
            return;
        }

        if (msg.type === 'LOBBY_STATE') {
            this.lobbySlots = msg.slots;
            this.isHanchan = msg.isHanchan;
            this.timerMode = msg.timerMode || 'standard';
            // Identify my seat
            const mySlot = this.lobbySlots.find(s => s.peerId === this.peer.id);
            if (mySlot) {
                this.mySeatIdx = mySlot.seatIdx;
            }
            if (this.onLobbyUpdate) {
                this.onLobbyUpdate(msg);
            }
        } else if (msg.type === 'GAME_START') {
            this.mySeatIdx = msg.assignedSeat;
            this.initClientProxy(msg.config);
            if (this.onGameStart) {
                this.onGameStart(this.clientProxy, msg);
            }
        } else if (msg.type === 'GAME_EVENT') {
            if (this.clientProxy) {
                this.clientProxy.handleIncomingGameEvent(msg.event, msg.payload, msg.snapshot);
            }
        }
    };

    MahjongMultiplayer.handleHostDisconnect = function (reason) {
        if (this._handlingHostDisconnect) return;
        this._handlingHostDisconnect = true;
        console.warn('[Multiplayer Guest] Host disconnected, reason:', reason);
        this.stopHeartbeat();
        if (this.hostConn) {
            try { this.hostConn.close(); } catch (e) {}
            this.hostConn = null;
        }

        // Case 1: Active in-game -> Seamless transition to local AI mode
        if (this.clientProxy && this.clientProxy.state && this.clientProxy.state !== 'GAME_OVER') {
            const noticeText = '📢 방장과의 연결이 끊어졌습니다.\n로컬 AI 모드로 대국을 자동 진행합니다.';
            if (typeof window !== 'undefined' && typeof window.showBigMessage === 'function') {
                window.showBigMessage(0, noticeText, 4500);
            }
            this.convertGuestToLocalGame();
        } else {
            // Case 2: Waiting room lobby -> Dissolve lobby and return to entry screen
            if (this.peer) {
                try { this.peer.destroy(); } catch (e) {}
                this.peer = null;
            }
            const hostSlot = (this.lobbySlots && this.lobbySlots[0]) ? this.lobbySlots[0].name : '방장';
            if (this.onHostLeftLobby) {
                this.onHostLeftLobby(hostSlot, reason);
            } else if (this.onError) {
                this.onError('방장과의 연결이 종료되어 대기방이 해산되었습니다.');
            }
        }
    };

    MahjongMultiplayer.sendToHost = function (data) {
        if (this.hostConn && this.hostConn.open) {
            this.hostConn.send(data);
        }
    };

    MahjongMultiplayer.toggleReady = function () {
        if (!this.isHost) {
            this.sendToHost({ type: 'TOGGLE_READY' });
        }
    };

    // -------------------------------------------------------------------------
    // HOST GAME HOOKS & GUEST DISPATCHER
    // -------------------------------------------------------------------------
    MahjongMultiplayer.setupHostGame = function (game) {
        this.activeGame = game;
        game.isMultiplayerHost = true;
        game.config.timerMode = this.timerMode || 'standard';

        // Apply slot configuration to game players
        for (let i = 0; i < 4; i++) {
            const slot = this.lobbySlots[i];
            if (slot && slot.type === 'human') {
                game.players[i].isAI = false;
                game.players[i].customName = slot.name;
            } else {
                game.players[i].isAI = true;
                const defaultAiNames = ['AI 동가', 'AI 하가', 'AI 대면', 'AI 상가'];
                game.players[i].customName = defaultAiNames[i];
            }
        }

        // Notify guests game is starting
        for (const peerId of Object.keys(this.connections)) {
            const slot = this.lobbySlots.find(s => s.peerId === peerId);
            const assignedSeat = slot ? slot.seatIdx : 1;
            const conn = this.connections[peerId];
            if (conn && conn.open) {
                conn.send({
                    type: 'GAME_START',
                    assignedSeat: assignedSeat,
                    config: game.config
                });
            }
        }

        // Broadcast game events
        const eventsToForward = [
            'roundStart', 'turnStart', 'canTsumo', 'canKyuushukyuuhai',
            'tileDiscarded', 'playerCanReact', 'multiPlayerCanReact',
            'meldFormed', 'kandoraFlipped', 'roundWon', 'exhaustiveDraw',
            'nagashiMangan', 'abortiveDraw', 'gameOver'
        ];

        if (!game._mpBroadcastHooksAttached) {
            game._mpBroadcastHooksAttached = true;
            for (const ev of eventsToForward) {
                game.on(ev, (payload) => {
                    this.broadcastGameEvent(ev, payload);
                });
            }
        }
    };

    MahjongMultiplayer.broadcastGameEvent = function (event, payload) {
        if (!this.activeGame) return;

        for (const peerId of Object.keys(this.connections)) {
            const slot = this.lobbySlots.find(s => s.peerId === peerId);
            if (!slot) continue;
            const guestSeat = slot.seatIdx;
            const conn = this.connections[peerId];
            if (conn && conn.open) {
                const snapshot = createRotatedSnapshot(this.activeGame, guestSeat);
                conn.send({
                    type: 'GAME_EVENT',
                    event: event,
                    payload: payload,
                    snapshot: snapshot
                });
            }
        }
    };

    MahjongMultiplayer.handleHostGameAction = function (seatIdx, msg) {
        const game = this.activeGame;
        if (!game) return;

        switch (msg.type) {
            case 'ACTION_DISCARD':
                game.discardTile(seatIdx, msg.handIndex, msg.isRiichi);
                break;
            case 'ACTION_REACTION':
                if (game.pendingMultiReactions) {
                    game.submitReactionDecision(seatIdx, msg.decision);
                } else if (msg.decision && msg.decision.type === 'pass') {
                    game.passReaction(seatIdx);
                }
                break;
            case 'ACTION_WIN':
                game.declareWin(seatIdx, msg.winningTile, msg.isTsumo, msg.loserIdx);
                break;
            case 'ACTION_SELF_KAN':
                game.executeSelfKan(seatIdx, msg.tile, msg.kanType);
                break;
            case 'ACTION_KYUUSHU':
                game.declareKyuushukyuuhai(seatIdx);
                break;
            case 'ACTION_NEXT_ROUND':
                if (game.state === 'ROUND_OVER') {
                    game.startRound();
                }
                break;
        }
    };

    // -------------------------------------------------------------------------
    // CLIENT GAME PROXY (For Guest)
    // -------------------------------------------------------------------------
    MahjongMultiplayer.initClientProxy = function (config) {
        const mySeat = this.mySeatIdx;
        const proxy = {
            isClientProxy: true,
            mySeatIdx: mySeat,
            state: 'IDLE',
            currentTurn: 0,
            dealerIdx: 0,
            roundWind: '1z',
            roundNum: 1,
            honba: 0,
            riichiSticks: 0,
            wall: [],
            doraIndicators: [],
            uraDoraIndicators: [],
            config: config || { startingPoints: 25000, isHanchan: true, useAkaDora: true },
            players: [
                { id: 0, name: '나', isAI: false, points: 25000, wind: '1z', hand: [], melds: [], discards: [] },
                { id: 1, name: 'AI', isAI: true,  points: 25000, wind: '2z', hand: [], melds: [], discards: [] },
                { id: 2, name: 'AI', isAI: true,  points: 25000, wind: '3z', hand: [], melds: [], discards: [] },
                { id: 3, name: 'AI', isAI: true,  points: 25000, wind: '4z', hand: [], melds: [], discards: [] }
            ],
            callbacks: {},
            lastSnapshot: null
        };

        proxy.on = function (event, handler) {
            if (!this.callbacks[event]) {
                this.callbacks[event] = [];
            } else if (typeof this.callbacks[event] === 'function') {
                this.callbacks[event] = [this.callbacks[event]];
            }
            this.callbacks[event].push(handler);
        };

        proxy.emit = function (event, data) {
            const cb = this.callbacks[event];
            if (Array.isArray(cb)) {
                for (const fn of cb) {
                    try {
                        fn(data);
                    } catch (e) {
                        console.error('[ClientProxy Event Error]', event, e);
                    }
                }
            } else if (typeof cb === 'function') {
                cb(data);
            }
        };

        proxy.getRemainingTileCount = function () {
            if (this.lastSnapshot && this.lastSnapshot.wallRemaining != null) {
                return this.lastSnapshot.wallRemaining;
            }
            return this.wall ? this.wall.length : 70;
        };

        proxy.getDeadWallData = function () {
            return {
                doraIndicators: this.doraIndicators || [],
                uraDoraIndicators: this.uraDoraIndicators || [],
                activeDoraCount: this.doraIndicators ? this.doraIndicators.length : 1
            };
        };

        // Forward user interactions to host
        proxy.discardTile = function (relIdx, handIndex, isRiichi) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_DISCARD',
                handIndex,
                isRiichi: !!isRiichi
            });
        };

        proxy.declareWin = function (relWinnerIdx, winningTile, isTsumo, relLoserIdx) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_WIN',
                winningTile,
                isTsumo,
                loserIdx: relLoserIdx != null ? toAbs(relLoserIdx, mySeat) : null
            });
        };

        proxy.executePon = function (relIdx) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_REACTION',
                decision: { type: 'pon' }
            });
        };

        proxy.executeChi = function (relIdx, option) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_REACTION',
                decision: { type: 'chi', option }
            });
        };

        proxy.executeDaiminkan = function (relIdx) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_REACTION',
                decision: { type: 'kan' }
            });
        };

        proxy.passReaction = function (relIdx) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_REACTION',
                decision: { type: 'pass' }
            });
        };

        proxy.executeSelfKan = function (relIdx, tile, kanType) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_SELF_KAN',
                tile,
                kanType
            });
        };

        proxy.declareKyuushukyuuhai = function (relIdx) {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_KYUUSHU'
            });
        };

        proxy.startRound = function () {
            MahjongMultiplayer.sendToHost({
                type: 'ACTION_NEXT_ROUND'
            });
        };

        proxy.forceTimeoutAction = function (relIdx) {
            const player = this.players[0];
            if (this.state === 'AWAIT_DISCARD' && this.currentTurn === 0) {
                let targetIdx = player.hand.length - 1;
                this.discardTile(0, targetIdx, false);
            } else if (this.state === 'AWAIT_REACTION') {
                this.passReaction(0);
            }
        };

        // Process incoming events from host
        proxy.handleIncomingGameEvent = function (event, rawPayload, snapshot) {
            if (snapshot) {
                this.lastSnapshot = snapshot;
                this.state = snapshot.state;
                this.currentTurn = snapshot.currentTurn;
                this.dealerIdx = snapshot.dealerIdx;
                this.roundWind = snapshot.roundWind;
                this.roundNum = snapshot.roundNum;
                this.honba = snapshot.honba;
                this.riichiSticks = snapshot.riichiSticks;
                this.wall = snapshot.wall || [];
                this.doraIndicators = snapshot.doraIndicators || [];
                this.uraDoraIndicators = snapshot.uraDoraIndicators || [];
                this.players = snapshot.players || this.players;
                this.lastWinnerIdx = snapshot.lastWinnerIdx;
                this.lastWinWasRiichi = snapshot.lastWinWasRiichi;
                if (snapshot.lastDiscard) {
                    this.lastDiscard = snapshot.lastDiscard;
                }
            }

            // Translate payload coordinates to viewer perspective
            const payload = rawPayload ? JSON.parse(JSON.stringify(rawPayload)) : {};

            if (payload.playerId != null) {
                payload.playerId = toRel(payload.playerId, mySeat);
            }
            if (payload.winnerIdx != null) {
                payload.winnerIdx = toRel(payload.winnerIdx, mySeat);
            }
            if (payload.loserIdx != null) {
                payload.loserIdx = toRel(payload.loserIdx, mySeat);
            }
            if (payload.discarderIdx != null) {
                payload.discarderIdx = toRel(payload.discarderIdx, mySeat);
            }
            if (payload.dealerIdx != null) {
                payload.dealerIdx = toRel(payload.dealerIdx, mySeat);
            }
            if (payload.tenpaiStatus) {
                for (const st of payload.tenpaiStatus) {
                    st.playerId = toRel(st.playerId, mySeat);
                }
            }
            if (payload.achievers) {
                for (const ach of payload.achievers) {
                    ach.playerId = toRel(ach.playerId, mySeat);
                }
            }
            if (payload.reactionsByPlayer) {
                for (const item of payload.reactionsByPlayer) {
                    item.playerId = toRel(item.playerId, mySeat);
                    if (item.discarderIdx != null) {
                        item.discarderIdx = toRel(item.discarderIdx, mySeat);
                    }
                }
            }

            // Check reactions directed to local player
            if (event === 'multiPlayerCanReact') {
                const myReactionItem = (payload.reactionsByPlayer || []).find(item => item.playerId === 0);
                if (myReactionItem) {
                    this.state = 'AWAIT_REACTION';
                    this.emit('playerCanReact', {
                        reactions: myReactionItem.reactions,
                        discardedTile: myReactionItem.discardedTile,
                        discarderIdx: myReactionItem.discarderIdx
                    });
                }
                return;
            }

            if (event === 'canTsumo') {
                if (payload.playerId === 0) {
                    this.emit('canTsumo', payload);
                }
                return;
            }

            if (event === 'canKyuushukyuuhai') {
                if (payload.playerId === 0) {
                    this.emit('canKyuushukyuuhai', payload);
                }
                return;
            }

            // Fire rotated event for UI/3D rendering
            this.emit(event, payload);
        };

        this.clientProxy = proxy;
        return proxy;
    };

    MahjongMultiplayer.convertGuestToLocalGame = function () {
        if (!this.clientProxy) return;
        const snapshot = this.clientProxy.lastSnapshot;
        if (!snapshot || typeof MahjongLogic === 'undefined' || !MahjongLogic.MahjongGame) return;

        const config = {
            startingPoints: 25000,
            isHanchan: true,
            useAkaDora: true,
            timerMode: 'unlimited',
            ...(snapshot.config || {})
        };
        config.timerMode = 'unlimited'; // Seamless local auto-play

        const localGame = new MahjongLogic.MahjongGame(config);
        localGame.state = snapshot.state;
        localGame.currentTurn = snapshot.currentTurn;
        localGame.dealerIdx = snapshot.dealerIdx;
        localGame.roundWind = snapshot.roundWind;
        localGame.roundNum = snapshot.roundNum;
        localGame.honba = snapshot.honba;
        localGame.riichiSticks = snapshot.riichiSticks;
        localGame.wall = (snapshot.wall && snapshot.wall.length > 0) ? [...snapshot.wall] : [];
        localGame.doraIndicators = (snapshot.doraIndicators || []).map(d => (typeof d === 'string' ? d : (d.code || d)));
        localGame.uraDoraIndicators = (snapshot.uraDoraIndicators || []).map(d => (typeof d === 'string' ? d : (d.code || d)));
        localGame.lastDiscard = snapshot.lastDiscard ? { ...snapshot.lastDiscard } : null;

        // Populate players: index 0 is human; 1..3 are converted to AI
        if (snapshot.players) {
            for (let i = 0; i < 4; i++) {
                const sp = snapshot.players[i] || {};
                localGame.players[i] = {
                    id: i,
                    name: (i === 0) ? (sp.name || '플레이어') : `(AI) ${sp.name || `플레이어 ${i + 1}`}`,
                    baseName: (i === 0) ? '플레이어' : `AI ${i}`,
                    isAI: (i !== 0),
                    points: sp.points != null ? sp.points : 25000,
                    wind: sp.wind || '1z',
                    seatWind: sp.seatWind || '1z',
                    hand: sp.hand ? JSON.parse(JSON.stringify(sp.hand)) : [],
                    melds: sp.melds ? JSON.parse(JSON.stringify(sp.melds)) : [],
                    discards: sp.discards ? JSON.parse(JSON.stringify(sp.discards)) : [],
                    allDiscards: sp.allDiscards ? JSON.parse(JSON.stringify(sp.allDiscards)) : (sp.discards ? JSON.parse(JSON.stringify(sp.discards)) : []),
                    isRiichi: !!sp.isRiichi,
                    isDoubleRiichi: !!sp.isDoubleRiichi,
                    isIppatsu: !!sp.isIppatsu,
                    waitingTiles: sp.waitingTiles ? [...sp.waitingTiles] : [],
                    tenpaiDiscards: sp.tenpaiDiscards ? JSON.parse(JSON.stringify(sp.tenpaiDiscards)) : [],
                    riichiWaitingTiles: sp.riichiWaitingTiles ? [...sp.riichiWaitingTiles] : [],
                    bankTimeMs: 30000
                };
            }
        }

        // Reconnect localGame to callbacks
        localGame.callbacks = this.clientProxy.callbacks || {};
        window.game = localGame;
        if (typeof game !== 'undefined') game = localGame;

        this.clientProxy = null;
        this.isHost = false;
        this.stopHeartbeat();

        // Update UI
        if (typeof window !== 'undefined' && typeof window.updatePlayerStatusUI === 'function') {
            window.updatePlayerStatusUI();
        }
        if (typeof window !== 'undefined' && window.sceneManager) {
            window.sceneManager.renderGameState(localGame);
        }

        // If currently an AI's turn, auto-progress immediately
        if (localGame.currentTurn !== 0 && localGame.state === 'AWAIT_DISCARD') {
            setTimeout(() => {
                localGame.processAITurn(localGame.currentTurn);
            }, 800);
        }
    };

    MahjongMultiplayer.notifyLeavingOnUnload = function () {
        if (this.isHost) {
            for (const peerId of Object.keys(this.connections)) {
                const conn = this.connections[peerId];
                if (conn && conn.open) {
                    try {
                        conn.send({ type: 'HOST_LEAVING', reason: 'window_unload' });
                        conn.close();
                    } catch (e) {}
                }
            }
            this.wsSend({ type: 'WS_LEAVE_ROOM', reason: 'window_unload' });
        } else if (this.hostConn && this.hostConn.open) {
            try {
                this.hostConn.send({
                    type: 'GUEST_LEAVING',
                    peerId: this.peer ? this.peer.id : null,
                    name: this.myNickname,
                    reason: 'window_unload'
                });
                this.hostConn.close();
            } catch (e) {}
            this.wsSend({ type: 'WS_LEAVE_ROOM', reason: 'window_unload' });
        }
        this.closeWebSocket();
    };

    MahjongMultiplayer.leaveRoom = function () {
        if (this.isHost) {
            for (const peerId of Object.keys(this.connections)) {
                const conn = this.connections[peerId];
                if (conn && conn.open) {
                    try {
                        conn.send({ type: 'HOST_LEAVING', reason: 'user_leave' });
                        conn.close();
                    } catch (e) {}
                }
            }
            this.wsSend({ type: 'WS_LEAVE_ROOM', reason: 'user_leave' });
        } else if (this.hostConn && this.hostConn.open) {
            try {
                this.hostConn.send({
                    type: 'GUEST_LEAVING',
                    peerId: this.peer ? this.peer.id : null,
                    name: this.myNickname,
                    reason: 'user_leave'
                });
                this.hostConn.close();
            } catch (e) {}
            this.wsSend({ type: 'WS_LEAVE_ROOM', reason: 'user_leave' });
        }

        this.stopHeartbeat();
        this.closeWebSocket();
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
            this.peer = null;
        }
        this.connections = {};
        this.hostConn = null;
        this.activeGame = null;
        this.clientProxy = null;
        this.roomCode = null;
        this.isHost = false;
        this._handlingHostDisconnect = false;
    };

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        const onUnload = () => {
            MahjongMultiplayer.notifyLeavingOnUnload();
        };
        window.addEventListener('beforeunload', onUnload);
        window.addEventListener('pagehide', onUnload);
    }

    global.MahjongMultiplayer = MahjongMultiplayer;
})(typeof window !== 'undefined' ? window : this);

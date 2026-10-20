/**
 * MahjongMultiplayer.js
 * P2P WebRTC Multiplayer Manager for 3D Riichi Mahjong using PeerJS.
 * Supports 4-digit room code, slot-based lobby with AI fillers,
 * full-guest ready verification, and seat rotation adapter for client rendering.
 */

(function (global) {
    const MahjongMultiplayer = {
        peer: null,
        isHost: false,
        roomCode: null,
        mySeatIdx: 0,
        myNickname: '플레이어',
        connections: {}, // peerId -> DataConnection
        hostConn: null,  // For guest: DataConnection to host
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

    const ROOM_PREFIX = 'kml-mahjong-room-';

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
    // HOST METHODS
    // -------------------------------------------------------------------------
    MahjongMultiplayer.createRoom = function (nickname, onReady) {
        if (typeof Peer === 'undefined') {
            alert('PeerJS 라이브러리가 로드되지 않았습니다.');
            return;
        }

        this.isHost = true;
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

        const peerId = ROOM_PREFIX + this.roomCode;
        if (this.peer) this.peer.destroy();
        this.peer = new Peer(peerId, { debug: 1 });

        this.peer.on('open', (id) => {
            console.log('[Multiplayer Host] Peer open with ID:', id, 'RoomCode:', this.roomCode);
            this.startHeartbeat();
            if (onReady) onReady(this.roomCode);
            this.broadcastLobbyState();
        });

        this.peer.on('connection', (conn) => {
            this.handleGuestConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.warn('[Multiplayer Host Error]', err);
            if (err.type === 'unavailable-id') {
                // Code collision, retry with new code
                this.createRoom(nickname, onReady);
            } else if (this.onError) {
                this.onError(err);
            }
        });
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
    // GUEST METHODS
    // -------------------------------------------------------------------------
    MahjongMultiplayer.joinRoom = function (roomCode, nickname, onJoined, onError) {
        if (typeof Peer === 'undefined') {
            alert('PeerJS 라이브러리가 로드되지 않았습니다.');
            return;
        }

        this.isHost = false;
        this._handlingHostDisconnect = false;
        this.roomCode = String(roomCode).trim();
        this.myNickname = nickname || '참가자';

        if (this.peer) {
            try { this.peer.destroy(); } catch (e) {}
        }
        this.peer = new Peer(null, { debug: 1 });

        this.peer.on('open', (id) => {
            console.log('[Multiplayer Guest] My Peer ID:', id);
            const hostPeerId = ROOM_PREFIX + this.roomCode;
            const conn = this.peer.connect(hostPeerId, { reliable: true });
            this.hostConn = conn;

            conn.on('open', () => {
                console.log('[Multiplayer Guest] Connected to host!');
                this.lastHostPongTime = Date.now();
                this.startHeartbeat();
                this.attachConnectionStateListeners(conn, (why) => {
                    this.handleHostDisconnect(why);
                });
                conn.send({ type: 'SET_NICKNAME', name: this.myNickname });
                if (onJoined) onJoined(this.roomCode);
            });

            conn.on('data', (data) => {
                this.handleHostMessage(data);
            });

            conn.on('close', () => {
                this.handleHostDisconnect('conn_close');
            });

            conn.on('error', (err) => {
                console.warn('[Multiplayer Guest Conn Error]', err);
                this.handleHostDisconnect('conn_error');
                if (onError) onError(err);
            });
        });

        this.peer.on('error', (err) => {
            console.warn('[Multiplayer Guest Peer Error]', err);
            if (onError) onError(err);
        });
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

        for (const ev of eventsToForward) {
            game.on(ev, (payload) => {
                this.broadcastGameEvent(ev, payload);
            });
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
            this.callbacks[event] = handler;
        };

        proxy.emit = function (event, data) {
            if (this.callbacks[event]) {
                this.callbacks[event](data);
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
        }
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
        }

        this.stopHeartbeat();
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

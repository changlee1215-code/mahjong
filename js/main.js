/**
 * main.js
 * Mahjong Game Controller & UI Integration.
 */

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');

    let game = null;
    let sceneManager = null;
    let isTopView = false;
    let pendingPlayerReactions = null;
    let isRiichiSelectMode = false;

    // UI Element References
    const roundNameText = document.getElementById('round-name-text');
    const wallRemainText = document.getElementById('wall-remain-text');
    const riichiSticksText = document.getElementById('riichi-sticks-text');
    const doraContainer = document.getElementById('dora-container');

    const playerTags = [
        document.getElementById('tag-player-0'),
        document.getElementById('tag-player-1'),
        document.getElementById('tag-player-2'),
        document.getElementById('tag-player-3')
    ];

    const windTexts = [
        document.getElementById('wind-p0'),
        document.getElementById('wind-p1'),
        document.getElementById('wind-p2'),
        document.getElementById('wind-p3')
    ];

    const pointTexts = [
        document.getElementById('points-p0'),
        document.getElementById('points-p1'),
        document.getElementById('points-p2'),
        document.getElementById('points-p3')
    ];

    // Buttons
    const btnTsumo = document.getElementById('btn-tsumo');
    const btnRiichi = document.getElementById('btn-riichi');
    const btnKyuushu = document.getElementById('btn-kyuushu');
    const btnRon = document.getElementById('btn-ron');
    const btnPon = document.getElementById('btn-pon');
    const btnChi = document.getElementById('btn-chi');
    const btnKan = document.getElementById('btn-kan');
    const btnPass = document.getElementById('btn-pass');
    const btnCancelAction = document.getElementById('btn-cancel-action');
    const btnToggleCamera = document.getElementById('btn-toggle-camera');
    const btnFuroToggle = document.getElementById('btn-furo-toggle');
    let isFuroEnabled = true;
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    const currentModeTag = document.getElementById('current-mode-tag');
    const modalModeSelect = document.getElementById('modal-mode-select');
    const viewModeMain = document.getElementById('view-mode-main');
    const viewTutorialStages = document.getElementById('view-tutorial-stages');
    const btnSelectTonpuu = document.getElementById('btn-select-tonpuu');
    const btnSelectHanchan = document.getElementById('btn-select-hanchan');
    const btnSelectTutorial = document.getElementById('btn-select-tutorial');
    const btnTutorialBack = document.getElementById('btn-tutorial-back');
    const pillTimerUnlimited = document.getElementById('pill-timer-unlimited');
    const pillTimerStandard = document.getElementById('pill-timer-standard');
    const tutorialHud = document.getElementById('tutorial-hud');
    const tutHudStageBadge = document.getElementById('tut-hud-stage-badge');
    const tutHudBody = document.getElementById('tut-hud-body');
    const btnTutToggle = document.getElementById('btn-tut-toggle');
    const btnTutExit = document.getElementById('btn-tut-exit');
    const btnTutNext = document.getElementById('btn-tut-next');
    const btnTutPrev = document.getElementById('btn-tut-prev');
    let currentTutorialStage = 1;
    let isTutorialHudCollapsed = false;
    let stage1Step = 0; // 0: 234m (슌츠 1), 1: 678p (슌츠 2), 2: 333s (코츠 1), 3: 56s (타츠), 4: 99p (머리), 5: 1z (리치 선언 실습)
    window.setTutorialStage1Step = function (step) {
        stage1Step = Math.max(0, Math.min(5, step));
        if (stage1Step < 5 && isRiichiSelectMode) {
            isRiichiSelectMode = false;
            if (sceneManager && sceneManager.clearRiichiSelectionMode) {
                sceneManager.clearRiichiSelectionMode();
            }
            if (btnCancelAction) btnCancelAction.style.display = 'none';
            if (btnRiichi) btnRiichi.style.display = 'block';
        }
        updateTutorialHUD();
    };
    window.nextStage1Step = function () {
        if (stage1Step < 5) {
            stage1Step++;
            updateTutorialHUD();
        }
    };
    window.prevStage1Step = function () {
        if (stage1Step > 0) {
            stage1Step--;
            if (isRiichiSelectMode) {
                isRiichiSelectMode = false;
                if (sceneManager && sceneManager.clearRiichiSelectionMode) {
                    sceneManager.clearRiichiSelectionMode();
                }
                if (btnCancelAction) btnCancelAction.style.display = 'none';
                if (btnRiichi) btnRiichi.style.display = 'block';
            }
            updateTutorialHUD();
        }
    };
    let stage5SubStep = 'push'; // 'push' (배째고 리치 체험) vs 'defense' (시간 되돌리기 후 현물 수비)

    // Modals
    const modalTutDealIn = document.getElementById('modal-tut-deal-in');
    const btnTutRewind = document.getElementById('btn-tut-rewind');
    const modalWin = document.getElementById('modal-win');
    const winModalTitle = document.getElementById('win-modal-title');
    const winModalSub = document.getElementById('win-modal-sub');
    const winTilesPreview = document.getElementById('win-tiles-preview');
    const winYakuList = document.getElementById('win-yaku-list');
    const winScoreTitle = document.getElementById('win-score-title');
    const winTotalScore = document.getElementById('win-total-score');
    const winPaymentDesc = document.getElementById('win-payment-desc');
    const btnNextRound = document.getElementById('btn-next-round');

    const modalDraw = document.getElementById('modal-draw');
    const drawModalTitle = document.getElementById('draw-modal-title');
    const drawModalSub = document.getElementById('draw-modal-sub');
    const drawTenpaiList = document.getElementById('draw-tenpai-list');
    const btnDrawNext = document.getElementById('btn-draw-next');

    const modalGameOver = document.getElementById('modal-gameover');
    const gameOverReason = document.getElementById('gameover-reason');
    const gameOverRankings = document.getElementById('gameover-rankings');
    const btnRestartGame = document.getElementById('btn-restart-game');

    const modalChiPicker = document.getElementById('modal-chi-picker');
    const chiOptionsCards = document.getElementById('chi-options-cards');
    const btnChiCancel = document.getElementById('btn-chi-cancel');

    const modalKanPicker = document.getElementById('modal-kan-picker');
    const kanOptionsCards = document.getElementById('kan-options-cards');
    const btnKanCancel = document.getElementById('btn-kan-cancel');

    let riichiAutoDiscardTimer = null;

    // Turn & Reaction Timer Elements (5s Base + 30s Bank)
    const turnTimerHud = document.getElementById('turn-timer-hud');
    const timerBaseText = document.getElementById('timer-base-text');
    const timerBankText = document.getElementById('timer-bank-text');
    const timerPhaseBadge = document.getElementById('timer-phase-badge');
    const timerBarFill = document.getElementById('timer-bar-fill');

    let actionTimerInterval = null;
    let timerBaseMs = 5000;
    let currentTimerType = 'discard';

    function stopTurnTimer() {
        if (actionTimerInterval) {
            clearInterval(actionTimerInterval);
            actionTimerInterval = null;
        }
        if (turnTimerHud) {
            turnTimerHud.style.display = 'none';
            turnTimerHud.classList.remove('bank-active', 'urgent');
        }
    }

    function onActionTimerTimeout() {
        stopTurnTimer();
        if (modalChiPicker) modalChiPicker.style.display = 'none';
        if (modalKanPicker) modalKanPicker.style.display = 'none';
        isRiichiSelectMode = false;
        if (typeof sceneManager !== 'undefined' && sceneManager.clearRiichiSelectionMode) {
            sceneManager.clearRiichiSelectionMode();
        }
        hideAllActions();
        if (game && typeof game.forceTimeoutAction === 'function') {
            game.forceTimeoutAction(0);
        }
    }

    function startTurnTimer(type = 'discard') {
        stopTurnTimer();
        if (!game || game.tutorialScenario) return;
        if (game.config && game.config.timerMode === 'unlimited') return;
        const player = game.players && game.players[0];
        if (!player) return;
        if (player.bankTimeMs == null) player.bankTimeMs = 30000;

        currentTimerType = type;
        timerBaseMs = 5000;

        function updateTimerUI() {
            if (!turnTimerHud) return;
            const bankSec = Math.ceil(player.bankTimeMs / 1000);
            if (timerBankText) timerBankText.textContent = bankSec;

            if (timerBaseMs > 0) {
                turnTimerHud.classList.remove('bank-active', 'urgent');
                const baseSec = Math.ceil(timerBaseMs / 1000);
                if (timerBaseText) timerBaseText.textContent = baseSec;
                if (timerPhaseBadge) timerPhaseBadge.textContent = '기본';
                if (timerBarFill) {
                    timerBarFill.style.width = `${(timerBaseMs / 5000) * 100}%`;
                }
            } else {
                turnTimerHud.classList.add('bank-active');
                if (player.bankTimeMs <= 5000) {
                    turnTimerHud.classList.add('urgent');
                } else {
                    turnTimerHud.classList.remove('urgent');
                }
                if (timerBaseText) timerBaseText.textContent = '0';
                if (timerPhaseBadge) timerPhaseBadge.textContent = '장고';
                if (timerBarFill) {
                    timerBarFill.style.width = `${(player.bankTimeMs / 30000) * 100}%`;
                }
            }
        }

        updateTimerUI();
        turnTimerHud.style.display = 'flex';

        actionTimerInterval = setInterval(() => {
            if (timerBaseMs > 0) {
                timerBaseMs = Math.max(0, timerBaseMs - 100);
            } else {
                player.bankTimeMs = Math.max(0, player.bankTimeMs - 100);
            }
            updateTimerUI();

            if (timerBaseMs <= 0 && player.bankTimeMs <= 0) {
                onActionTimerTimeout();
            }
        }, 100);
    }

    // Hide all player action buttons
    function hideAllActions() {
        stopTurnTimer();
        if (riichiAutoDiscardTimer) {
            clearTimeout(riichiAutoDiscardTimer);
            riichiAutoDiscardTimer = null;
        }
        if (modalChiPicker) modalChiPicker.style.display = 'none';
        if (modalKanPicker) modalKanPicker.style.display = 'none';
        btnTsumo.style.display = 'none';
        btnTsumo.classList.remove('btn-rinshan-tsumo');
        btnTsumo.textContent = '쯔모';
        btnRiichi.style.display = 'none';
        if (btnKyuushu) {
            btnKyuushu.style.display = 'none';
            btnKyuushu.textContent = '구종구패';
        }
        btnRon.style.display = 'none';
        btnPon.style.display = 'none';
        btnChi.style.display = 'none';
        btnKan.style.display = 'none';
        btnKan.textContent = '깡';
        btnPass.style.display = 'none';
        if (btnCancelAction) btnCancelAction.style.display = 'none';
        pendingPlayerReactions = null;
        isRiichiSelectMode = false;
        if (typeof sceneManager !== 'undefined' && sceneManager.clearRiichiSelectionMode) {
            sceneManager.clearRiichiSelectionMode();
        }
        if (typeof onPlayerTileHoverOut !== 'undefined') {
            onPlayerTileHoverOut();
        }
    }

    // Initialize 3D Scene
    sceneManager = new Mahjong3D.SceneManager(container, (handIndex) => {
        onPlayerTileClicked(handIndex);
    }, (handIndex) => {
        onPlayerTileHovered(handIndex);
    }, () => {
        onPlayerTileHoverOut();
    });
    window.sceneManager = sceneManager;

    // Initialize Game Logic
    game = new MahjongLogic.MahjongGame({
        startingPoints: 25000,
        returnPoints: 30000,
        isHanchan: true, // Default to Hanchan (East + South rounds)
        useAkaDora: true
    });
    window.game = game;

    const ANNOUNCE_DELAY_MS = 1000;
    game.announcePending = false;
    function wrapAnnounced(methodName, describe) {
        const original = game[methodName].bind(game);
        game[methodName] = function (...args) {
            const spec = describe(args);
            const isWinDeclare = (methodName === 'declareWin');
            if (!spec) {
                if (game.announcePending || (game.isWinPending && !isWinDeclare)) {
                    return; // Block actions while announcement or win is pending!
                }
                return original(...args);
            }
            if (game.announcePending || (game.isWinPending && !isWinDeclare)) {
                return;
            }
            game.announcePending = true;
            if (isWinDeclare) {
                game.isWinPending = true;
                game.state = 'ROUND_OVER';
            }
            if (typeof MahjongAudio !== 'undefined' && spec.sound && MahjongAudio[spec.sound]) { MahjongAudio[spec.sound](); }
            window.showBigMessage(spec.playerId, spec.text);
            setTimeout(() => { 
                game.announcePending = false; 
                try { 
                    original(...args); 
                } catch(e) { 
                    alert('Error in ' + methodName + ':\n' + e.stack); 
                    throw e; 
                } 
            }, ANNOUNCE_DELAY_MS);
        };
    }
    wrapAnnounced('discardTile', ([playerIdx, , isRiichiDeclare]) => {
        if (!isRiichiDeclare) return null;
        const isChasing = game.players.some((p, idx) => idx !== playerIdx && p.isRiichi);
        return { playerId: playerIdx, text: isChasing ? '추격 리치!' : '리치!', sound: 'playRiichi' };
    });
    wrapAnnounced('executePon', ([playerIdx]) => ({ playerId: playerIdx, text: '퐁!', sound: 'playPon' }));
    wrapAnnounced('executeChi', ([playerIdx]) => ({ playerId: playerIdx, text: '치!', sound: 'playChi' }));
    wrapAnnounced('executeDaiminkan', ([playerIdx]) => ({ playerId: playerIdx, text: '깡!', sound: 'playKan' }));
    wrapAnnounced('declareWin', ([winnerIdx, , isTsumo, loserIdx]) => {
        return { playerId: winnerIdx, text: isTsumo ? '쯔모!' : '론!', sound: 'playWin' };
    });
    wrapAnnounced('declareKyuushukyuuhai', ([playerIdx]) => ({ playerId: playerIdx, text: '구종구패!', sound: 'playDraw' }));


    let lastPlayerDiscardHandIndex = null;


    
    function getWaitTileYakuInfo(player, remainingHand, waitTileCode, isRiichiMode) {
        const scoreParams = {
            handTiles: [...remainingHand, waitTileCode],
            melds: player.melds,
            winningTile: waitTileCode,
            isTsumo: false,
            isRiichi: player.isRiichi || isRiichiMode,
            seatWind: player.wind || player.seatWind,
            roundWind: game.roundWind,
            doraIndicators: [], 
            uraDoraIndicators: [],
            isDealer: (player.wind === '1z') || (game.dealerIdx === game.players.indexOf(player)),
            honba: game.honba
        };

        const ronResult = MahjongScoring.calculateScore({ ...scoreParams, isTsumo: false });
        const tsumoResult = MahjongScoring.calculateScore({ 
            ...scoreParams, 
            isTsumo: true,
            isIppatsu: (player.isRiichi || isRiichiMode)
        });

        const filterDora = (yakuList) => {
            if (!yakuList) return [];
            return yakuList.filter(y => !y.name.includes('도라') && !y.name.includes('뒷도라') && !y.name.includes('적도라'));
        };

        let guaranteedYaku = [];
        if (ronResult.success) {
            if (ronResult.yakumanList && ronResult.yakumanList.length > 0) {
                guaranteedYaku = ronResult.yakumanList.map(name => ({ name, isYakuman: true }));
            } else {
                guaranteedYaku = filterDora(ronResult.yakuList);
            }
        }

        let probabilisticYaku = [];
        if (tsumoResult.success) {
            let tsumoList = [];
            if (tsumoResult.yakumanList && tsumoResult.yakumanList.length > 0) {
                tsumoList = tsumoResult.yakumanList.map(name => ({ name, isYakuman: true }));
            } else {
                tsumoList = filterDora(tsumoResult.yakuList);
            }
            
            const guaranteedNames = guaranteedYaku.map(y => y.name);
            probabilisticYaku = tsumoList.filter(y => !guaranteedNames.includes(y.name));
        }

        let guaranteedHan = 0;
        let yakumanCount = 0;
        for (const y of guaranteedYaku) {
            if (y.isYakuman) yakumanCount += 1;
            else guaranteedHan += y.han || 0;
        }

        return {
            guaranteed: guaranteedYaku,
            probabilistic: probabilisticYaku,
            hasNoYaku: !ronResult.success && !tsumoResult.success,
            guaranteedHan,
            yakumanCount
        };
    }

    function formatYakuDisplayName(name) {
        if (!name) return '';
        const match = name.match(/\(([^)]+)\)/);
        if (match) {
            const inside = match[1];
            if (!/[가-힣]/.test(inside)) {
                return name.replace(/\s*\([^)]+\)/, '').trim();
            }
        }
        return name;
    }

    function getVisibleTileCount(tileCode) {
        const baseCode = tileCode.replace('_aka', '');
        let count = 0;
        
        // Check discards
        for (const p of game.players) {
            for (const d of p.discards) {
                if ((d.tile.code || d.tile).replace('_aka', '') === baseCode) count++;
            }
            // Check melds
            for (const m of p.melds) {
                for (const t of m.tiles) {
                    if ((t.code || t).replace('_aka', '') === baseCode) count++;
                }
            }
        }
        
        // Check face-up doras
        for (let i = 0; i < game.activeDoraCount; i++) {
            if (game.doraIndicators[i]) {
                if (game.doraIndicators[i].replace('_aka', '') === baseCode) count++;
            }
        }
        
        // Check player's own hand (they can see their own tiles)
        for (const t of game.players[0].hand) {
            if ((t.code || t).replace('_aka', '') === baseCode) count++;
        }
        
        return count;
    }

    function onPlayerTileHovered(handIndex) {
        if (game && game.isFuroAnimating) return;
        if (typeof MahjongAudio !== 'undefined') MahjongAudio.playTileHover();
        const player = game.players[0];
        const tenpaiInfo = player.tenpaiDiscards.find(cand => cand.discardIndex === handIndex);
        
        // Show wait HUD on hover if in Riichi mode OR if it's a valid Tenpai discard
        if (!isRiichiSelectMode && !tenpaiInfo) return;
        
        const hoverHud = document.getElementById('hover-waits-hud');
        const hoverList = document.getElementById('hover-waits-list');
        if (!hoverHud || !hoverList) return;
        
        if (!tenpaiInfo) {
            hoverHud.style.display = 'none';
            return;
        }
        
        hoverList.innerHTML = '';
        const uniqueWaits = [...new Set(tenpaiInfo.waitingTiles)];
        
        for (const w of uniqueWaits) {
            const baseCode = w.replace('_aka', '');
            const visible = getVisibleTileCount(baseCode);
            let remaining = 4 - visible;
            if (remaining < 0) remaining = 0;
            
            const itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.flexDirection = 'column';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.margin = '0 5px';
            
            const canvas = MahjongTileRenderer.getTileTextureCanvas(w, false);
            const preview = document.createElement('canvas');
            preview.className = 'dora-preview-canvas';
            preview.width = canvas.width;
            preview.height = canvas.height;
            const ctx = preview.getContext('2d');
            ctx.drawImage(canvas, 0, 0);
            
            const textSpan = document.createElement('span');
            textSpan.style.color = '#fff';
            textSpan.style.fontSize = '14px';
            textSpan.style.marginTop = '4px';
            textSpan.style.fontWeight = 'bold';
            textSpan.style.textShadow = '1px 1px 2px #000';
            textSpan.textContent = remaining + '장';
            
            if (remaining === 0) {
                preview.style.opacity = '0.5';
                textSpan.style.color = '#ff6b6b';
            }
            
            itemDiv.appendChild(preview);
            itemDiv.appendChild(textSpan);

            // Add Yaku Info
            const remainingHand = [...player.hand];
            remainingHand.splice(handIndex, 1);
            const yakuInfo = getWaitTileYakuInfo(player, remainingHand, w, isRiichiSelectMode);
            
            const yakuContainer = document.createElement('div');
            yakuContainer.style.display = 'flex';
            yakuContainer.style.flexDirection = 'column';
            yakuContainer.style.alignItems = 'center';
            yakuContainer.style.marginTop = '5px';
            yakuContainer.style.fontSize = '11px'; yakuContainer.style.textAlign = 'center';
            yakuContainer.style.lineHeight = '1.2';
            yakuContainer.style.textShadow = '1px 1px 2px #000';

            if (yakuInfo.hasNoYaku) {
                const noYakuSpan = document.createElement('span');
                noYakuSpan.style.color = '#ff6b6b';
                noYakuSpan.textContent = '\uC5ED \uC5C6\uC74C';
                yakuContainer.appendChild(noYakuSpan);
            } else {
                if (yakuInfo.guaranteed.length > 0) {
                    const gSpan = document.createElement('span');
                    gSpan.style.color = '#ffd700'; // Gold for guaranteed
                    let hanStr = yakuInfo.yakumanCount > 0 ? (yakuInfo.yakumanCount > 1 ? '\uB354\uBE14 \uC5ED\uB9CC' : '\uC5ED\uB9CC') : `${yakuInfo.guaranteedHan}\uD310`;
                    gSpan.innerHTML = `[\uD655\uC815] (${hanStr})<br/>${yakuInfo.guaranteed.map(y => formatYakuDisplayName(y.name)).join(', ')}`;
                    yakuContainer.appendChild(gSpan);
                }
                if (yakuInfo.probabilistic.length > 0) {
                    const pSpan = document.createElement('span');
                    pSpan.style.color = '#a0e8af'; // Light green for probabilistic
                    pSpan.innerHTML = `[확률]<br/>${yakuInfo.probabilistic.map(y => formatYakuDisplayName(y.name)).join(', ')}`;
                    yakuContainer.appendChild(pSpan);
                }
            }
            
            itemDiv.appendChild(yakuContainer);

            hoverList.appendChild(itemDiv);
        }
        
        hoverHud.style.display = 'flex';
    }

    function onPlayerTileHoverOut() {
        const hoverHud = document.getElementById('hover-waits-hud');
        if (hoverHud) hoverHud.style.display = 'none';
    }

    // Handle Player Hand Tile Click

    function onPlayerTileClicked(handIndex) {
        if (game && game.isFuroAnimating) {
            console.warn("Cannot discard: Furo animation in progress.");
            return;
        }
        if (typeof MahjongAudio !== 'undefined') MahjongAudio.playTileClick();
        console.log("onPlayerTileClicked called:", handIndex, "Current turn:", game.currentTurn, "Game state:", game.state);
        if (game.currentTurn !== 0 || game.state !== 'AWAIT_DISCARD') {
            console.warn("Cannot discard: Not player's turn or not AWAIT_DISCARD state.");
            return;
        }

        const player = game.players[0];
        if (handIndex < 0 || handIndex >= player.hand.length) return;

        // If player already in Riichi, must discard drawn tile (last tile)
        if (player.isRiichi && handIndex !== player.hand.length - 1) {
            window.showBigMessage(0, '리치 중에는 쯔모한 패만 버릴 수 있습니다.');
            return;
        }

        // Kuikae prevention: cannot discard the tile just called for Pon/Chi or connected suji this turn
        const clickedCode = (player.hand[handIndex].code || player.hand[handIndex]).replace('_aka', '');
        if (player.forbiddenDiscards && player.forbiddenDiscards.includes(clickedCode)) {
            window.showBigMessage(0, '쿠이카에 금지: 방금 후로한 패나 연결된 스지 패는 바로 버릴 수 없습니다');
            return;
        }

        // Tutorial guidance: enforce recommended discard so student follows the lesson sequence
        if (game && game.tutorialScenario) {
            if (currentTutorialStage === 1 && stage1Step < 5) {
                window.showBigMessage(0, '우측 상단의 [다음 설명 ▶]을 눌러 몸통과 머리 구조를 먼저 확인해 보세요!');
                return;
            }
            if (currentTutorialStage === 1 && stage1Step === 5 && !isRiichiSelectMode) {
                window.showBigMessage(0, '먼저 화면 중앙의 [리치 선언] 버튼을 클릭해 주세요!');
                return;
            }
            const targetTileCode = getCurrentTutorialTargetTile();
            const isMatch = Array.isArray(targetTileCode)
                ? targetTileCode.includes(clickedCode)
                : (targetTileCode && clickedCode === targetTileCode);
            if (targetTileCode && !isMatch) {
                if (currentTutorialStage === 5 && stage5SubStep === 'push') {
                    window.showBigMessage(0, `튜토리얼 안내: '배째고 리치' 체험을 위해 [ 2만 ] 또는 [ 5만 ]을 먼저 버려보세요!`);
                    return;
                } else if (currentTutorialStage === 5 && stage5SubStep === 'defense') {
                    window.showBigMessage(0, `튜토리얼 안내: 방금 쏘였던 위험패 대신, 100% 안전한 [ 3통 ]을 버려보세요!`);
                    return;
                }
                const targetName = Array.isArray(targetTileCode)
                    ? targetTileCode.map(t => MahjongTileRenderer.getTileKoreanName(t, false)).join(' 또는 ')
                    : MahjongTileRenderer.getTileKoreanName(targetTileCode, false);
                window.showBigMessage(0, `튜토리얼 안내: 추천 타패인 [ ${targetName} ]를 먼저 버려보세요!`);
                return;
            }
        }

        lastPlayerDiscardHandIndex = handIndex;

        // If Riichi Select Mode is on
        if (isRiichiSelectMode) {
            // Verify if this discard leads to Tenpai
            const isTenpaiDiscard = player.tenpaiDiscards.some(cand => cand.discardIndex === handIndex);
            if (!isTenpaiDiscard) {
                alert('리치를 걸 수 있는 텐파이 대기패가 아닙니다.');
                return;
            }
            hideAllActions();
            game.discardTile(0, handIndex, true);
            return;
        }

        hideAllActions();
        game.discardTile(0, handIndex, false);
    }
    window.onPlayerTileClicked = onPlayerTileClicked;

    // Audio activation on first user interaction
    window.addEventListener('click', () => {
        MahjongAudio.initContext();
    }, { once: true });

    // Update Dora Indicators UI
    function updateDoraUI(doraList) {
        doraContainer.innerHTML = '';
        for (const dora of doraList) {
            const canvas = MahjongTileRenderer.getTileTextureCanvas(dora, false);
            const preview = document.createElement('canvas');
            preview.className = 'dora-preview-canvas';
            preview.width = canvas.width;
            preview.height = canvas.height;
            const ctx = preview.getContext('2d');
            ctx.drawImage(canvas, 0, 0);
            doraContainer.appendChild(preview);
        }
    }

    // Update Player Badges (Points, Winds, Turn)
    function updatePlayerStatusUI() {
        const windsKorean = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' };
        for (let i = 0; i < 4; i++) {
            const p = game.players[i];
            windTexts[i].textContent = windsKorean[p.wind] || '동';
            pointTexts[i].textContent = p.points.toLocaleString();

            if (game.currentTurn === i) {
                playerTags[i].classList.add('active-turn');
            } else {
                playerTags[i].classList.remove('active-turn');
            }

            if (p.isRiichi) {
                playerTags[i].classList.add('is-riichi');
            } else {
                playerTags[i].classList.remove('is-riichi');
            }

            playerTags[i].classList.toggle('is-dealer', game.dealerIdx === i);
        }

        const roundWindName = windsKorean[game.roundWind] || '동';
        roundNameText.textContent = `${roundWindName} ${game.roundNum}국 ${game.honba}본장`;
        wallRemainText.textContent = (typeof game.getRemainingTileCount === 'function')
            ? game.getRemainingTileCount()
            : game.wall.length;
        riichiSticksText.textContent = `${game.riichiSticks} (${(game.riichiSticks * 1000).toLocaleString()}점)`;

        // Update 3D Table Center Digital Display
        if (typeof sceneManager !== 'undefined' && sceneManager && sceneManager.updateCenterDisplay) {
            sceneManager.updateCenterDisplay(game);
        }
    }


    function renderWaitsToDOM(player, remainingHand, waits, container, isRiichiMode = false) {
    if (!waits || waits.length === 0 || !container) return;
    
    container.innerHTML = '';
    const visibleCounts = {};
    function countTile(tile) {
        if (!tile) return;
        const c = tile.code || tile;
        visibleCounts[c] = (visibleCounts[c] || 0) + 1;
    }

    for (const t of game.players[0].hand) countTile(t);
    for (const p of game.players) {
        for (const d of p.discards) countTile(d.tile);
        for (const m of p.melds) {
            for (const t of m.tiles) countTile(t);
        }
    }
    if (game.doraIndicators) {
        for (const d of game.doraIndicators) countTile(d);
    }

    const uniqueWaits = [...new Set(waits)];
    for (const w of uniqueWaits) {
        const item = document.createElement('div');
        item.className = 'riichi-wait-item';

        const canvas = MahjongTileRenderer.getTileTextureCanvas(w, false);
        const preview = document.createElement('canvas');
        preview.className = 'riichi-wait-canvas';
        preview.width = canvas.width;
        preview.height = canvas.height;
        preview.getContext('2d').drawImage(canvas, 0, 0);

        const info = document.createElement('div');
        info.className = 'riichi-wait-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'riichi-wait-name';
        nameSpan.textContent = MahjongTileRenderer.getTileKoreanName(w, false);

        const visible = visibleCounts[w] || 0;
        const remaining = Math.max(0, 4 - visible);

        const countSpan = document.createElement('span');
        countSpan.className = `riichi-wait-count ${remaining > 0 ? 'has-remain' : 'no-remain'}`;
        countSpan.textContent = `\uC794\uC5EC ${remaining}\uAC1C`;

        info.appendChild(nameSpan);
        info.appendChild(countSpan);
        item.appendChild(preview);
        item.appendChild(info);

        const yakuContainer = document.createElement('div');
        yakuContainer.className = 'riichi-wait-yaku';
        yakuContainer.style.fontSize = '11px';
        yakuContainer.style.marginTop = '4px';
        yakuContainer.style.color = '#fff';

        if (typeof getWaitTileYakuInfo !== 'undefined') {
            const yakuInfo = getWaitTileYakuInfo(player, remainingHand, w, isRiichiMode || player.isRiichi);
            
            let guaranteedHan = 0;
            let yakumanCount = 0;
            for (const y of yakuInfo.guaranteed) {
                if (y.isYakuman) yakumanCount += 1;
                else guaranteedHan += y.han || 0;
            }

            if (yakuInfo.guaranteed.length > 0) {
                const gSpan = document.createElement('span');
                gSpan.style.color = '#ffeb3b';
                gSpan.style.display = 'block';
                let hanStr = yakumanCount > 0 ? (yakumanCount > 1 ? '\uB354\uBE14 \uC5ED\uB9CC' : '\uC5ED\uB9CC') : `${guaranteedHan}\uD310`;
                gSpan.innerHTML = `[\uD655\uC815] (${hanStr})<br/>${yakuInfo.guaranteed.map(y => formatYakuDisplayName(y.name)).join(', ')}`;
                yakuContainer.appendChild(gSpan);
            }
            if (yakuInfo.probabilistic.length > 0) {
                const pSpan = document.createElement('span');
                pSpan.style.color = '#81c784';
                pSpan.style.display = 'block';
                pSpan.innerHTML = `[\uD655\uB960]<br/>${yakuInfo.probabilistic.map(y => formatYakuDisplayName(y.name)).join(', ')}`;
                yakuContainer.appendChild(pSpan);
            }
            if (yakuInfo.hasNoYaku && yakuInfo.guaranteed.length === 0 && yakuInfo.probabilistic.length === 0) {
                const nSpan = document.createElement('span');
                nSpan.style.color = '#e57373';
                nSpan.style.display = 'block';
                nSpan.innerHTML = `[\uBBF8\uD655\uC815] \uC5ED \uC5C6\uC74C`;
                yakuContainer.appendChild(nSpan);
            }
        }
        item.appendChild(yakuContainer);
        container.appendChild(item);
    }
}
// Riichi Waiting Tiles HUD
 
    function updateRiichiWaitsHUD() {
        const player = game.players[0];
        const riichiHud = document.getElementById('riichi-waits-hud');
        const riichiList = document.getElementById('riichi-waits-list');
        if (!riichiHud || !riichiList) return;

        // If not in Riichi, the HUD will automatically hide during the player's turn 
        // (since waitingTiles is empty when holding 14 tiles), but it will appear 
        // after discarding and during opponents' turns if they are in Tenpai!

        const waits = (player.riichiWaitingTiles && player.riichiWaitingTiles.length > 0)
            ? player.riichiWaitingTiles
            : player.waitingTiles;

        if (!waits || waits.length === 0) {
            riichiHud.style.display = 'none';
            return;
        }

        renderWaitsToDOM(player, player.hand, waits, riichiList, player.isRiichi);

        const isFuriten = MahjongLogic.checkFuriten(player);
        const titleSpan = riichiHud.querySelector('.riichi-title');
        if (titleSpan) {
            const baseTitle = player.isRiichi ? '리치 대기패' : '텐파이 대기패';
            if (isFuriten) {
                titleSpan.innerHTML = `${baseTitle} <span style="color:#ff5722; font-size:11px; font-weight:900; background:rgba(255,87,34,0.18); padding:2px 6px; border-radius:4px; border:1px solid #ff5722; margin-left:6px;">⚠️ 후리텐 (쯔모만 가능)</span>`;
            } else {
                titleSpan.textContent = baseTitle;
            }
        }

        riichiHud.style.display = 'flex';
    }

    // Game Event Listeners
    game.on('roundStart', (data) => {
        if (sceneManager && typeof sceneManager.clearDeadWall === 'function') {
            sceneManager.clearDeadWall();
        }
        updateDoraUI(data.doraIndicators);
        updatePlayerStatusUI();
        hideAllActions();
        const riichiHud = document.getElementById('riichi-waits-hud');
        if (riichiHud) riichiHud.style.display = 'none';
        if (sceneManager.latestDiscardMarker) {
            sceneManager.latestDiscardMarker.visible = false;
        }
        sceneManager.renderGameState(game);
        updateTutorialHUD();
    });

    game.on('turnStart', (data) => {
        updatePlayerStatusUI();
        updateRiichiWaitsHUD();

        // Render hand without the newly drawn 14th tile while it animates
        sceneManager.renderGameState(game, { skipDrawnTilePlayer: data.playerId });
        sceneManager.animateDrawTile(data.playerId, data.drawnTile, () => {
            sceneManager.renderGameState(game);
        }, game, data.isRinshan);

        if (data.playerId === 0) {
            hideAllActions();
            updateTutorialHUD();
            const player = game.players[0];
            
            // Auto-highlight Tenpai discards if already in Tenpai
            if (!player.isRiichi && player.tenpaiDiscards && player.tenpaiDiscards.length > 0) {
                const validIndices = player.tenpaiDiscards.map(d => d.discardIndex);
                sceneManager.setTenpaiAssistMode(validIndices);
            }

            if (data.kanOptions && data.kanOptions.length > 0 && !player.isRiichi) {
                if (data.kanOptions.length === 1) {
                    const opt = data.kanOptions[0];
                    const tileBase = (opt.tile.code || opt.tile).replace('_aka', '');
                    const tileName = MahjongTileRenderer.getTileKoreanName(tileBase, false);
                    const kanTypeLabel = opt.type === 'ankan' ? '안깡' : '가깡';
                    btnKan.textContent = `${kanTypeLabel} (${tileName})`;
                    btnKan.style.display = 'block';
                    btnKan.onclick = () => {
                        hideAllActions();
                        game.executeSelfKan(0, opt.tile, opt.type);
                    };
                } else {
                    btnKan.textContent = `깡 (${data.kanOptions.length}개 선택)`;
                    btnKan.style.display = 'block';
                    btnKan.onclick = () => {
                        showKanPicker(data.kanOptions);
                    };
                }
                if (btnCancelAction) {
                    btnCancelAction.style.display = 'block';
                    btnCancelAction.onclick = () => {
                        btnKan.style.display = 'none';
                        btnCancelAction.style.display = 'none';
                        if (modalKanPicker) modalKanPicker.style.display = 'none';
                    };
                }
            }
            if (player.isRiichi) {
                // Auto-discard if no Tsumo after animation
                if (riichiAutoDiscardTimer) {
                    clearTimeout(riichiAutoDiscardTimer);
                    riichiAutoDiscardTimer = null;
                }
                riichiAutoDiscardTimer = setTimeout(() => {
                    riichiAutoDiscardTimer = null;
                    if (game.state === 'AWAIT_DISCARD' && 
                        game.currentTurn === 0 && 
                        !game.announcePending && 
                        !game.isWinPending && 
                        btnTsumo.style.display !== 'block') {
                        game.discardTile(0, player.hand.length - 1, false);
                    }
                }, 1200);
            } else {
                // Check if player can declare Riichi
                const isMenzen = player.melds.every(m => m.type === 'ankan');
                const remTiles = (typeof game.getRemainingTileCount === 'function')
                    ? game.getRemainingTileCount()
                    : game.wall.length;
                if (isMenzen && player.points >= 1000 && remTiles >= 4) {
                    if (player.tenpaiDiscards && player.tenpaiDiscards.length > 0) {
                        if (currentTutorialStage === 5 && stage5SubStep === 'defense') {
                            btnRiichi.style.display = 'none';
                        } else {
                            btnRiichi.style.display = 'block';
                        }
                    }
                }
            }

            // Start discard turn timer if not in tutorial and not in auto-discard Riichi
            if (!game.tutorialScenario && !player.isRiichi) {
                startTurnTimer('discard');
            }
        }
    });

    game.on('canTsumo', (data) => {
        if (game.currentTurn === 0) {
            updateTutorialHUD();
            if (riichiAutoDiscardTimer) {
                clearTimeout(riichiAutoDiscardTimer);
                riichiAutoDiscardTimer = null;
            }
            btnTsumo.style.display = 'block';
            if (!game.tutorialScenario) {
                startTurnTimer('discard');
            }
            if (data && data.isRinshan) {
                btnTsumo.classList.add('btn-rinshan-tsumo');
                btnTsumo.textContent = '🌸 영상개화 쯔모!';
            } else {
                btnTsumo.classList.remove('btn-rinshan-tsumo');
                btnTsumo.textContent = '쯔모';
            }
            btnTsumo.onclick = () => {
                if (riichiAutoDiscardTimer) {
                    clearTimeout(riichiAutoDiscardTimer);
                    riichiAutoDiscardTimer = null;
                }
                btnTsumo.classList.remove('btn-rinshan-tsumo');
                btnTsumo.textContent = '쯔모';
                const player = game.players[0];
                const winningTile = (data && data.winningTile) || player.hand[player.hand.length - 1];
                hideAllActions();
                game.declareWin(0, winningTile, true);
            };
        }
    });

    game.on('canKyuushukyuuhai', (data) => {
        if (data.playerId === 0 && btnKyuushu) {
            btnKyuushu.style.display = 'block';
            btnKyuushu.textContent = `구종구패 (${data.kinds}종)`;
            if (data.kinds >= 10) {
                btnKyuushu.title = `요구패 ${data.kinds}종 보유: 유국을 선언하거나, 버튼을 누르지 않고 타패하여 국사무쌍(역만)에 도전할 수 있습니다.`;
            } else {
                btnKyuushu.title = `요구패 9종 보유: 유국을 선언하여 안전하게 패를 다시 시작할 수 있습니다.`;
            }
            btnKyuushu.onclick = () => {
                hideAllActions();
                game.declareKyuushukyuuhai(0);
            };
        }
    });


game.on('tileDiscarded', (data) => {
        updatePlayerStatusUI();
        updateRiichiWaitsHUD();

        if (data.playerId === 0) {
            if (sceneManager && sceneManager.clearTutorialTargetTile) {
                sceneManager.clearTutorialTargetTile();
            }
        }

        if (data.isRiichi) {
//             MahjongAudio.playRiichi();
//             window.showBigMessage(data.playerId, '리치!');
        }

        const discardIdx = game.players[data.playerId].discards.length - 1;
        const fromHandIdx = (data.playerId === 0 && lastPlayerDiscardHandIndex != null)
            ? lastPlayerDiscardHandIndex
            : data.fromHandIndex;
        lastPlayerDiscardHandIndex = null;

        // Render discards skipping the newly discarded tile while it animates across the table
        sceneManager.renderGameState(game, { skipLastDiscardPlayer: data.playerId });
        sceneManager.animateDiscardTile(
            data.playerId,
            data.tile,
            fromHandIdx,
            discardIdx,
            data.isRiichi,
            () => {
                sceneManager.renderGameState(game);
            },
            game.players[data.playerId].discards
        );
    });

    // Player Reaction UI (Ron, Pon, Chi, Pass)
    game.on('playerCanReact', (data) => {
        hideAllActions();
        pendingPlayerReactions = data.reactions;
        updateTutorialHUD();

        const ronAction = data.reactions.find(r => r.type === 'ron');
        const ponAction = data.reactions.find(r => r.type === 'pon');
        const chiAction = data.reactions.find(r => r.type === 'chi');
        const kanAction = data.reactions.find(r => r.type === 'kan');

        // If Furo is disabled, and there is no Ron action, auto-pass
        if (!isFuroEnabled && !ronAction) {
            pendingPlayerReactions = null;
            setTimeout(() => game.advanceTurn(), 300); // slight delay for visual consistency
            return;
        }

        if (game.tutorialScenario && currentTutorialStage === 2 && !ronAction) {
            window.showBigMessage(0, '울기 찬스! 지금은 멘젠 조패 실습이므로 [ 패스 ]를 눌러주세요.');
        }
        if (game.tutorialScenario && currentTutorialStage === 5 && !ronAction) {
            window.showBigMessage(0, '상대 리치 발생! 수비력을 유지하기 위해 울지 말고 [ 패스 ]를 눌러주세요.');
        }

        if (!game.tutorialScenario) {
            startTurnTimer('reaction');
        }

        if (ronAction) {
            btnRon.style.display = 'block';
            btnRon.onclick = () => {
                if (riichiAutoDiscardTimer) {
                    clearTimeout(riichiAutoDiscardTimer);
                    riichiAutoDiscardTimer = null;
                }
                hideAllActions();
                game.declareWin(0, data.discardedTile, false, data.discarderIdx);
            };
        }

        if (ponAction) {
            btnPon.style.display = 'block';
            btnPon.onclick = () => {
                if (game.tutorialScenario && currentTutorialStage === 2) {
                    window.showBigMessage(0, '지금은 멘젠 조패 실습입니다. [ 패스 ]를 눌러주세요! (울기는 3장에서 배웁니다)');
                    return;
                }
                if (game.tutorialScenario && currentTutorialStage === 5) {
                    window.showBigMessage(0, '상대 리치 시에는 수비력을 위해 울지 않습니다. [ 패스 ]를 눌러주세요!');
                    return;
                }
                hideAllActions();
                game.executePon(0);
            };
        }

        if (chiAction) {
            btnChi.style.display = 'block';
            btnChi.onclick = () => {
                if (game.tutorialScenario && currentTutorialStage === 2) {
                    window.showBigMessage(0, '지금은 멘젠 조패 실습입니다. [ 패스 ]를 눌러주세요! (울기는 3장에서 배웁니다)');
                    return;
                }
                if (game.tutorialScenario && currentTutorialStage === 5) {
                    window.showBigMessage(0, '상대 리치 시에는 수비력을 위해 울지 않습니다. [ 패스 ]를 눌러주세요!');
                    return;
                }
                if (chiAction.options.length === 1) {
                    hideAllActions();
                    game.executeChi(0, chiAction.options[0]);
                } else {
                    // Show Chi picker modal
                    showChiPicker(chiAction.options, data.discardedTile);
                }
            };
        }

        if (kanAction) {
            btnKan.textContent = '깡 (대명깡)';
            btnKan.style.display = 'block';
            btnKan.onclick = () => {
                if (game.tutorialScenario && currentTutorialStage === 2) {
                    window.showBigMessage(0, '지금은 멘젠 조패 실습입니다. [ 패스 ]를 눌러주세요! (울기는 3장에서 배웁니다)');
                    return;
                }
                if (game.tutorialScenario && currentTutorialStage === 5) {
                    window.showBigMessage(0, '상대 리치 시에는 수비력을 위해 울지 않습니다. [ 패스 ]를 눌러주세요!');
                    return;
                }
                hideAllActions();
                game.executeDaiminkan(0);
            };
        }

        btnPass.style.display = 'block';
        btnPass.onclick = () => {
            pendingPlayerReactions = null;
            hideAllActions();
            game.passReaction(0);
            updateRiichiWaitsHUD();
            updateTutorialHUD();
        };
    });

    function showChiPicker(options, discardedTile) {
        chiOptionsCards.innerHTML = '';
        modalChiPicker.style.display = 'flex';

        for (const opt of options) {
            const card = document.createElement('div');
            card.className = 'chi-option-card';

            const fullSet = MahjongLogic.sortTiles([
                { code: opt[0] },
                { code: opt[1] },
                discardedTile
            ]);

            for (const t of fullSet) {
                const cv = MahjongTileRenderer.getTileTextureCanvas(t.code, t.isAka);
                const p = document.createElement('canvas');
                p.width = cv.width;
                p.height = cv.height;
                p.getContext('2d').drawImage(cv, 0, 0);
                card.appendChild(p);
            }

            card.onclick = () => {
                modalChiPicker.style.display = 'none';
                hideAllActions();
                game.executeChi(0, opt);
            };

            chiOptionsCards.appendChild(card);
        }

        btnChiCancel.onclick = () => {
            modalChiPicker.style.display = 'none';
        };
    }

    function showKanPicker(options) {
        if (!kanOptionsCards || !modalKanPicker) return;
        kanOptionsCards.innerHTML = '';
        modalKanPicker.style.display = 'flex';

        const player = game.players[0];

        for (const opt of options) {
            const card = document.createElement('div');
            card.className = 'kan-option-card';

            const header = document.createElement('div');
            header.className = 'kan-option-header';

            const badge = document.createElement('span');
            badge.className = `kan-badge ${opt.type === 'ankan' ? 'badge-ankan' : 'badge-kakan'}`;
            badge.textContent = opt.type === 'ankan' ? '안깡 (暗槓)' : '가깡 (加槓)';

            const tileBase = (opt.tile.code || opt.tile).replace('_aka', '');
            const tileName = MahjongTileRenderer.getTileKoreanName(tileBase, false);

            const title = document.createElement('span');
            title.className = 'kan-title';
            title.textContent = tileName;

            header.appendChild(badge);
            header.appendChild(title);
            card.appendChild(header);

            // Tiles row
            const tilesRow = document.createElement('div');
            tilesRow.className = 'kan-tiles-row';

            let tilesToRender = [];
            if (opt.type === 'ankan') {
                for (const t of player.hand) {
                    const c = (t.code || t).replace('_aka', '');
                    if (c === tileBase) {
                        tilesToRender.push(t);
                    }
                }
            } else {
                const ponMeld = player.melds.find(m => m.type === 'pon' && (m.tile).replace('_aka', '') === tileBase);
                if (ponMeld) {
                    tilesToRender.push(...ponMeld.tiles);
                }
                tilesToRender.push(opt.tile);
            }

            for (const t of tilesToRender) {
                const code = t.code || t;
                const isAka = !!t.isAka || (typeof code === 'string' && code.includes('_aka'));
                const canvas = MahjongTileRenderer.getTileTextureCanvas(code, isAka);
                const preview = document.createElement('canvas');
                preview.width = canvas.width;
                preview.height = canvas.height;
                const ctx = preview.getContext('2d');
                ctx.drawImage(canvas, 0, 0);
                tilesRow.appendChild(preview);
            }

            card.appendChild(tilesRow);

            card.onclick = () => {
                modalKanPicker.style.display = 'none';
                hideAllActions();
                game.executeSelfKan(0, opt.tile, opt.type);
            };

            kanOptionsCards.appendChild(card);
        }

        if (btnKanCancel) {
            btnKanCancel.onclick = () => {
                modalKanPicker.style.display = 'none';
            };
        }
    }

    game.on('kandoraFlipped', (data) => {
        if (sceneManager && sceneManager.animateKandoraFlip) {
            sceneManager.animateKandoraFlip(data.flippedIndex, () => {
                updateDoraUI(data.doraIndicators);
            });
        } else {
            updateDoraUI(data.doraIndicators);
        }
    });

    game.on('meldFormed', (data) => {
        game.isFuroAnimating = true;
        updatePlayerStatusUI();
        updateRiichiWaitsHUD();
        
        if (typeof sceneManager.animateFuro === 'function') {
            sceneManager.animateFuro(game, data.playerId, data.meldType, data.meldTiles, () => {
                game.isFuroAnimating = false;
                sceneManager.renderGameState(game);
                updatePlayerStatusUI();
                updateRiichiWaitsHUD();
                updateTutorialHUD();
            }, data);
        } else {
            game.isFuroAnimating = false;
            sceneManager.renderGameState(game);
            updateTutorialHUD();
        }
    });

    // Win Modal Display (Detailed Yaku and Scores)
    game.on('roundWon', (data) => {
        const { winnerIdx, winnerName, loserIdx, loserName, isTsumo, winningTile, scoreRes } = data;

        // Stage 5 Deal-in & Rewind Teaching Interception:
        if (game.tutorialScenario && currentTutorialStage === 5 && winnerIdx === 3 && loserIdx === 0) {
            updatePlayerStatusUI();
            sceneManager.renderGameState(game);
            sceneManager.animateWinReveal(3, true, 1, () => {
                const overlay = document.getElementById('big-message-overlay');
                if (overlay) overlay.style.display = 'none';
                if (modalTutDealIn) {
                    const winTile = winningTile ? (winningTile.code || winningTile).replace('_aka', '') : '5m';
                    const tileKr = MahjongTileRenderer.getTileKoreanName(winTile, false);
                    const subEl = modalTutDealIn.querySelector('.modal-sub');
                    if (subEl) {
                        subEl.textContent = `상가 AI의 2-5만 양면 대기에 걸려 [ ${tileKr} ]으로 '론!'을 쏘였습니다!`;
                    }
                    modalTutDealIn.style.display = 'flex';
                }
            }, game);
            return;
        }

        updatePlayerStatusUI();
        sceneManager.renderGameState(game);

        if (game.tutorialScenario && currentTutorialStage === 5 && winnerIdx === 3 && loserIdx === 1) {
            winModalTitle.textContent = '🏆 튜토리얼 전체 수료 완료! (방총 완벽 회피)';
            winModalSub.innerHTML = '<span style="color:#60a5fa; font-weight:bold;">보셨나요? 내가 방금 버리려 했던 위험패(5만)를 하가 AI가 버렸다가 8,000점을 쏘였습니다!</span>';
        } else {
            winModalTitle.textContent = isTsumo ? `${winnerName} 쯔모 화료!` : `${winnerName} 론 화료!`;
            const winTileCode = winningTile ? (winningTile.code || winningTile) : '';
            const winTileIsAka = winningTile ? !!winningTile.isAka : false;
            winModalSub.textContent = isTsumo
                ? `${winnerName}님이 스스로 패를 쯔모하여 화료했습니다.`
                : `${loserName}님의 방총 (${MahjongTileRenderer.getTileKoreanName(winTileCode, winTileIsAka)})`;
        }

        const winner = game.players[winnerIdx];
        
        // Calculate Dora Tiles
        const doraTiles = (game.doraIndicators || []).map(ind => MahjongScoring.getDoraTile(ind));
        const uraTiles = winner.isRiichi ? (game.uraDoraIndicators || []).map(ind => MahjongScoring.getDoraTile(ind)) : [];

        const checkDoraSparkle = (t) => {
            const code = t.code || t;
            return t.isAka || doraTiles.includes(code) || uraTiles.includes(code);
        };

        const renderCanvasTile = (t, container) => {
            const code = t.code || t;
            const cv = MahjongTileRenderer.getTileTextureCanvas(code, t.isAka);
            const p = document.createElement('canvas');
            p.width = cv.width;
            p.height = cv.height;
            p.getContext('2d').drawImage(cv, 0, 0);
            if (checkDoraSparkle(t)) {
                p.classList.add('dora-sparkle');
            }
            container.appendChild(p);
        };

        // Render winning hand preview: Separate Tenpai hand tiles and Winning tile (Tsumo / Ron)
        winTilesPreview.innerHTML = '';
        winTilesPreview.style.display = 'flex';
        winTilesPreview.style.alignItems = 'flex-end';
        winTilesPreview.style.gap = '8px';
        winTilesPreview.style.flexWrap = 'wrap';
        winTilesPreview.style.justifyContent = 'center';

        // Separate Tenpai Hand and Winning Tile
        const tenpaiTiles = [...winner.hand];
        let agariTile = winningTile;

        if (isTsumo && winningTile) {
            const winCode = (winningTile.code || winningTile);
            const isAka = !!winningTile.isAka;

            let idx = tenpaiTiles.findIndex(t => t === winningTile);
            if (idx === -1) {
                idx = tenpaiTiles.findIndex(t => (t.code || t) === winCode && !!t.isAka === isAka);
            }
            if (idx === -1) {
                idx = tenpaiTiles.findIndex(t => (t.code || t) === winCode);
            }
            if (idx !== -1) {
                agariTile = tenpaiTiles.splice(idx, 1)[0];
            }
        }

        const sortedTenpai = MahjongLogic.sortTiles(tenpaiTiles);

        // 1. Tenpai Hand (대기 중이던 손패)
        const tenpaiDiv = document.createElement('div');
        tenpaiDiv.style.display = 'flex';
        tenpaiDiv.style.flexDirection = 'column';
        tenpaiDiv.style.alignItems = 'center';

        const tenpaiLabel = document.createElement('div');
        tenpaiLabel.style.fontSize = '11px';
        tenpaiLabel.style.fontWeight = 'bold';
        tenpaiLabel.style.color = 'rgba(255, 255, 255, 0.7)';
        tenpaiLabel.style.marginBottom = '4px';
        tenpaiLabel.textContent = '대기 손패 (텐파이)';
        tenpaiDiv.appendChild(tenpaiLabel);

        const tenpaiTilesRow = document.createElement('div');
        tenpaiTilesRow.style.display = 'flex';
        tenpaiTilesRow.style.gap = '1px';
        for (const t of sortedTenpai) {
            renderCanvasTile(t, tenpaiTilesRow);
        }
        tenpaiDiv.appendChild(tenpaiTilesRow);
        winTilesPreview.appendChild(tenpaiDiv);

        // 2. Winning Tile (화료패: 쯔모 또는 론 분리)
        if (agariTile) {
            const agariDiv = document.createElement('div');
            agariDiv.style.display = 'flex';
            agariDiv.style.flexDirection = 'column';
            agariDiv.style.alignItems = 'center';
            agariDiv.style.marginLeft = '16px';

            const agariBadge = document.createElement('div');
            agariBadge.style.fontSize = '11px';
            agariBadge.style.fontWeight = 'bold';
            agariBadge.style.padding = '2px 8px';
            agariBadge.style.borderRadius = '4px';
            agariBadge.style.marginBottom = '4px';
            agariBadge.style.letterSpacing = '1px';

            if (isTsumo) {
                agariBadge.textContent = '쯔모';
                agariBadge.style.background = 'linear-gradient(135deg, #ffd700, #ff9800)';
                agariBadge.style.color = '#111';
                agariBadge.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.7)';
            } else {
                agariBadge.textContent = '론';
                agariBadge.style.background = 'linear-gradient(135deg, #ff5252, #d50000)';
                agariBadge.style.color = '#fff';
                agariBadge.style.boxShadow = '0 0 10px rgba(255, 82, 82, 0.7)';
            }
            agariDiv.appendChild(agariBadge);

            const agariTileRow = document.createElement('div');
            agariTileRow.style.display = 'flex';
            agariTileRow.style.borderRadius = '4px';
            agariTileRow.style.boxShadow = isTsumo ? '0 0 12px rgba(255, 215, 0, 0.7)' : '0 0 12px rgba(255, 82, 82, 0.7)';
            renderCanvasTile(agariTile, agariTileRow);
            agariDiv.appendChild(agariTileRow);

            winTilesPreview.appendChild(agariDiv);
        }

        // 3. Melds (후로 패)
        if (winner.melds && winner.melds.length > 0) {
            for (const m of winner.melds) {
                const meldDiv = document.createElement('div');
                meldDiv.style.display = 'flex';
                meldDiv.style.flexDirection = 'column';
                meldDiv.style.alignItems = 'center';
                meldDiv.style.marginLeft = '14px';

                const meldBadge = document.createElement('div');
                meldBadge.style.fontSize = '10px';
                meldBadge.style.fontWeight = 'bold';
                meldBadge.style.padding = '2px 6px';
                meldBadge.style.borderRadius = '4px';
                meldBadge.style.marginBottom = '4px';
                meldBadge.style.background = 'rgba(255, 255, 255, 0.15)';
                meldBadge.style.color = '#eee';
                const typeNames = { chi: '치', pon: '퐁', kan: '대명깡', kakan: '가깡', ankan: '안깡' };
                meldBadge.textContent = typeNames[m.type] || '후로';
                meldDiv.appendChild(meldBadge);

                const meldTilesRow = document.createElement('div');
                meldTilesRow.style.display = 'flex';
                meldTilesRow.style.gap = '1px';
                for (const mt of m.tiles) {
                    renderCanvasTile(mt, meldTilesRow);
                }
                meldDiv.appendChild(meldTilesRow);

                winTilesPreview.appendChild(meldDiv);
            }
        }

        // 4. Render Dora Indicators Preview
        const winDoraPreview = document.getElementById('win-dora-preview');
        if (winDoraPreview) {
            winDoraPreview.innerHTML = '';
            
            // Regular Dora
            const doraRow = document.createElement('div');
            doraRow.className = 'dora-row';
            const dLabel = document.createElement('div');
            dLabel.className = 'dora-row-label';
            dLabel.textContent = '도라 표시패';
            doraRow.appendChild(dLabel);
            for (const ind of (game.doraIndicators || [])) {
                const cv = MahjongTileRenderer.getTileTextureCanvas(ind, false);
                const p = document.createElement('canvas');
                p.width = cv.width; p.height = cv.height;
                p.getContext('2d').drawImage(cv, 0, 0);
                doraRow.appendChild(p);
            }
            winDoraPreview.appendChild(doraRow);
            
            // Uradora (only if Riichi)
            if (winner.isRiichi) {
                const uraRow = document.createElement('div');
                uraRow.className = 'dora-row';
                const uLabel = document.createElement('div');
                uLabel.className = 'dora-row-label';
                uLabel.textContent = '뒷도라 표시패';
                uraRow.appendChild(uLabel);
                for (const ind of (game.uraDoraIndicators || [])) {
                    const cv = MahjongTileRenderer.getTileTextureCanvas(ind, false);
                    const p = document.createElement('canvas');
                    p.width = cv.width; p.height = cv.height;
                    p.getContext('2d').drawImage(cv, 0, 0);
                    uraRow.appendChild(p);
                }
                winDoraPreview.appendChild(uraRow);
            }
        }

        // Render Yaku List
        winYakuList.innerHTML = '';

        if (scoreRes.yakumanList && scoreRes.yakumanList.length > 0) {
            for (const yk of scoreRes.yakumanList) {
                const row = document.createElement('div');
                row.className = 'yaku-row';
                row.innerHTML = `<span class="yaku-name">${formatYakuDisplayName(yk)}</span><span class="yaku-han" style="color:#ffca28;">역만</span>`;
                winYakuList.appendChild(row);
            }
        } else {
            // Normal Yaku
            for (const y of scoreRes.yakuList) {
                const row = document.createElement('div');
                row.className = 'yaku-row';
                row.innerHTML = `<span class="yaku-name">${formatYakuDisplayName(y.name)}</span><span class="yaku-han">${y.han}판</span>`;
                winYakuList.appendChild(row);
            }

            // Dora bonuses
            if (scoreRes.doraInfo.dora > 0) {
                const row = document.createElement('div');
                row.className = 'yaku-row';
                row.innerHTML = `<span class="yaku-name">도라</span><span class="yaku-han">${scoreRes.doraInfo.dora}판</span>`;
                winYakuList.appendChild(row);
            }
            if (scoreRes.doraInfo.uradora > 0) {
                const row = document.createElement('div');
                row.className = 'yaku-row';
                row.innerHTML = `<span class="yaku-name">우라도라</span><span class="yaku-han">${scoreRes.doraInfo.uradora}판</span>`;
                winYakuList.appendChild(row);
            }
            if (scoreRes.doraInfo.aka > 0) {
                const row = document.createElement('div');
                row.className = 'yaku-row';
                row.innerHTML = `<span class="yaku-name">적도라</span><span class="yaku-han">${scoreRes.doraInfo.aka}판</span>`;
                winYakuList.appendChild(row);
            }
        }

        // Score summary
        winScoreTitle.textContent = scoreRes.title;
        winTotalScore.textContent = `${scoreRes.totalScore.toLocaleString()} 점`;
        winPaymentDesc.textContent = scoreRes.paymentDesc;

        const delayAfterAnim = winner.isRiichi ? 2500 : 1200;
        sceneManager.animateWinReveal(winnerIdx, winner.isRiichi, game.activeDoraCount || 1, () => {
            setTimeout(() => {
                if (scoreRes.yakumanList && scoreRes.yakumanList.length > 0) {
                    const overlay = document.getElementById('yakuman-anim-overlay');
                    const subtext = document.getElementById('yakuman-anim-subtext');
                    subtext.textContent = scoreRes.yakumanList.map(formatYakuDisplayName).join(' / ');
                    overlay.style.display = 'flex';
                    
                    // Trigger reflow
                    void overlay.offsetWidth;
                    overlay.classList.add('active');
                    
                    setTimeout(() => {
                        overlay.classList.remove('active');
                        setTimeout(() => {
                            overlay.style.display = 'none';
                            if (game.tutorialScenario) {
                                btnNextRound.textContent = currentTutorialStage < TUTORIAL_STAGES.length ? `다음 단계 (${currentTutorialStage + 1}장) 진행 ▶` : '튜토리얼 전체 수료 완료 🏆';
                            } else {
                                btnNextRound.textContent = '다음 대국 진행';
                            }
                            modalWin.style.display = 'flex';
                        }, 600);
                    }, 3000);
                } else {
                    let tutSummaryEl = document.getElementById('win-tut-summary');
                    if (game.tutorialScenario && currentTutorialStage === 5 && winnerIdx === 3 && loserIdx === 1) {
                        if (!tutSummaryEl) {
                            tutSummaryEl = document.createElement('div');
                            tutSummaryEl.id = 'win-tut-summary';
                            btnNextRound.parentNode.insertBefore(tutSummaryEl, btnNextRound);
                        }
                        tutSummaryEl.className = 'tut-analysis-box';
                        tutSummaryEl.style.cssText = 'margin-top: 16px; margin-bottom: 20px; text-align: left; background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.4); color: #dcfce7; line-height: 1.65; font-size: 0.95rem;';
                        tutSummaryEl.innerHTML = `
                            <div style="font-weight: 800; color: #4ade80; font-size: 1.05rem; margin-bottom: 8px;">🛡️ 마와시우치(패를 돌리면서 버티기) 수비 대성공!</div>
                            • 무작정 맞불을 놓는 것보다 한 수 내어주며(패를 돌리면서: <strong>마와시우치</strong>) 상가의 현물 <strong>[ 3통 ]</strong>으로 안전하게 버텨낸 덕분에 8,000점 방총을 완벽하게 모면했습니다.<br>
                            • 반면 위험패(5만)를 버린 하가 AI는 8,000점을 직격으로 쏘였습니다!<br><br>
                            <div style="color: #60a5fa; font-weight: 800;">🎓 마지막 관문: 실전 모의 대국으로 이동합니다!</div>
                            하단의 <strong>[ 다음 단계 (6장 실전 모의) 진행 ▶ ]</strong> 버튼을 눌러 지금까지 배운 모든 기술을 총동원해 자유롭게 승리해 보세요! (오직 나만 화료할 수 있는 특별 룰 적용)
                        `;
                        tutSummaryEl.style.display = 'block';
                        btnNextRound.textContent = '다음 단계 (6장 실전 모의) 진행 ▶';
                    } else if (game.tutorialScenario && currentTutorialStage === 6 && winnerIdx === 0) {
                        if (!tutSummaryEl) {
                            tutSummaryEl = document.createElement('div');
                            tutSummaryEl.id = 'win-tut-summary';
                            btnNextRound.parentNode.insertBefore(tutSummaryEl, btnNextRound);
                        }
                        tutSummaryEl.className = 'tut-analysis-box';
                        tutSummaryEl.style.cssText = 'margin-top: 16px; margin-bottom: 20px; text-align: left; background: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.45); color: #fef08a; line-height: 1.65; font-size: 0.95rem;';
                        tutSummaryEl.innerHTML = `
                            <div style="font-weight: 800; color: #fde047; font-size: 1.15rem; margin-bottom: 8px;">🏆 튜토리얼 6개 전 과정 수료 축하합니다! 🎓</div>
                            • 실전 모의 대국에서 멋지게 나만의 손패를 조패하고 승리(화료)를 달성하셨습니다!<br>
                            • <strong>1장 손패구조</strong>부터 <strong>2장 조패</strong>, <strong>3장 울기(후로)</strong>, <strong>4장 역 없음 탈출</strong>, <strong>5장 안전패 수비</strong>, 그리고 <strong>6장 실전 화료</strong>까지 모든 기본기를 완벽하게 정복했습니다.<br><br>
                            <div style="color: #86efac; font-weight: 800;">🚀 이제 진짜 마작의 세계(동풍전 / 반장전)에서 실력을 마음껏 발휘해 보세요!</div>
                        `;
                        tutSummaryEl.style.display = 'block';
                        btnNextRound.textContent = '튜토리얼 완료 (대국 모드 선택) 🏆';
                    } else if (tutSummaryEl) {
                        tutSummaryEl.style.display = 'none';
                    }

                    if (game.tutorialScenario) {
                        if (currentTutorialStage === 5 && winnerIdx === 3 && loserIdx === 1) {
                            btnNextRound.textContent = '다음 단계 (6장 실전 모의) 진행 ▶';
                        } else if (currentTutorialStage === 6 && winnerIdx === 0) {
                            btnNextRound.textContent = '튜토리얼 완료 (대국 모드 선택) 🏆';
                        } else {
                            btnNextRound.textContent = currentTutorialStage < TUTORIAL_STAGES.length ? `다음 단계 (${currentTutorialStage + 1}장) 진행 ▶` : '튜토리얼 완료 🏆';
                        }
                    } else {
                        btnNextRound.textContent = '다음 대국 진행';
                    }
                    modalWin.style.display = 'flex';
                }
            }, delayAfterAnim);
        }, game);
    });

    // Exhaustive Draw Display (황패유국 - 노텐 벌금 시각화)
    game.on('exhaustiveDraw', (data) => {
        if (typeof MahjongAudio !== 'undefined') MahjongAudio.playDraw();
        updatePlayerStatusUI();
        sceneManager.renderGameState(game);

        if (drawModalTitle) drawModalTitle.textContent = '황패 유국 (荒牌流局)';
        if (drawModalSub) drawModalSub.textContent = '패산이 모두 소진되어 국이 종료되었습니다.';

        drawTenpaiList.innerHTML = '';

        // 1. Noten Bappu Settlement Summary Banner
        const summaryBanner = document.createElement('div');
        summaryBanner.className = 'noten-summary-banner';
        
        let descText = '';
        if (data.tenpaiCount === 0) {
            descText = '전원 노텐: 점수 이동 없음 (±0점)';
        } else if (data.tenpaiCount === 4) {
            descText = '전원 텐파이: 점수 이동 없음 (±0점)';
        } else if (data.tenpaiCount === 1) {
            descText = '1인 텐파이 (+3,000점) ⬅️ 3인 노텐 (각 -1,000점 지불)';
        } else if (data.tenpaiCount === 2) {
            descText = '2인 텐파이 (각 +1,500점) ⬅️ 2인 노텐 (각 -1,500점 지불)';
        } else if (data.tenpaiCount === 3) {
            descText = '3인 텐파이 (각 +1,000점) ⬅️ 1인 노텐 (-3,000점 지불)';
        }
        
        summaryBanner.innerHTML = `
            <div class="noten-summary-title">⚖️ 노텐 벌금 (3,000점) 정산</div>
            <div class="noten-summary-desc">${descText}</div>
        `;
        drawTenpaiList.appendChild(summaryBanner);

        // Wind names mapping
        const windNames = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' };
        const formatTileName = (code) => {
            if (!code) return '';
            const clean = (code.code || code).replace('_aka', '');
            const num = clean[0];
            const suit = clean[1];
            if (suit === 'm') return `${num}만`;
            if (suit === 'p') return `${num}통`;
            if (suit === 's') return `${num}삭`;
            if (suit === 'z') {
                const zMap = { '1': '동', '2': '남', '3': '서', '4': '북', '5': '백', '6': '발', '7': '중' };
                return zMap[num] || clean;
            }
            return clean;
        };

        // 2. 4 Players Settlement Cards
        const playerList = document.createElement('div');
        playerList.className = 'noten-player-list';

        for (const st of data.tenpaiStatus) {
            const card = document.createElement('div');
            card.className = `noten-player-card ${st.isTenpai ? 'card-tenpai' : 'card-noten'}`;

            const windLabel = windNames[st.wind] || '남';
            const dealerBadge = st.isDealer ? '<span class="noten-dealer-tag">오야</span>' : '';
            const statusBadge = st.isTenpai
                ? '<span class="status-badge badge-tenpai">텐파이</span>'
                : '<span class="status-badge badge-noten">노텐</span>';

            let waitsHtml = '';
            if (st.isTenpai && st.waitingTiles && st.waitingTiles.length > 0) {
                const formattedWaits = st.waitingTiles.map(w => formatTileName(w)).join(', ');
                waitsHtml = `<span class="noten-waits-tag" title="대기패">대기: ${formattedWaits}</span>`;
            }

            let deltaClass = 'delta-zero';
            let deltaStr = '±0점';
            if (st.delta > 0) {
                deltaClass = 'delta-plus';
                deltaStr = `▲ +${st.delta.toLocaleString()}점`;
            } else if (st.delta < 0) {
                deltaClass = 'delta-minus';
                deltaStr = `▼ ${st.delta.toLocaleString()}점`;
            }

            const displayName = st.baseName || (st.name ? st.name.replace(/\s*\([^)]*\)/g, '') : `플레이어 ${st.playerId}`);
            card.innerHTML = `
                <div class="noten-player-left">
                    <span class="noten-wind-tag">${windLabel}</span>
                    <span class="noten-player-name">${displayName}${dealerBadge}</span>
                    ${statusBadge}
                    ${waitsHtml}
                </div>
                <div class="noten-player-right">
                    <div class="delta-text ${deltaClass}">${deltaStr}</div>
                    <div class="score-transition">${(st.oldPoints || 0).toLocaleString()} ➡️ <strong>${(st.newPoints || 0).toLocaleString()}점</strong></div>
                </div>
            `;
            playerList.appendChild(card);
        }
        drawTenpaiList.appendChild(playerList);

        // 3. Renchan / Dealer Progression Banner
        const renchanBanner = document.createElement('div');
        renchanBanner.className = 'noten-renchan-banner';
        if (data.dealerIsTenpai) {
            renchanBanner.innerHTML = `🔁 <strong>오야 텐파이 (연장)</strong>: 친이 유지되며 다음 국 본장이 증가합니다.`;
        } else {
            renchanBanner.innerHTML = `➡️ <strong>오야 노텐 (친 이동)</strong>: 다음 플레이어에게 친이 넘어가며 본장이 리셋됩니다.`;
        }
        drawTenpaiList.appendChild(renchanBanner);

        modalDraw.style.display = 'flex';
    });

    // Nagashi Mangan Display (나가시만간)
    game.on('nagashiMangan', (data) => {
        if (typeof MahjongAudio !== 'undefined') MahjongAudio.playWin(true, false);
        updatePlayerStatusUI();
        sceneManager.renderGameState(game);

        if (drawModalTitle) drawModalTitle.textContent = '나가시 만관 (流し満貫)';
        if (drawModalSub) drawModalSub.textContent = '모든 버림패가 요구패(1/9/자패)이며, 타가에게 울리지 않았습니다.';

        drawTenpaiList.innerHTML = '';
        for (const ach of data.achievers) {
            const row = document.createElement('div');
            row.className = 'yaku-row';
            const dealerTag = ach.isDealer ? ' (오야)' : '';
            const displayName = ach.baseName || (ach.name ? ach.name.replace(/\s*\([^)]*\)/g, '') : `플레이어 ${ach.playerId}`);
            row.innerHTML = `<span class="yaku-name" style="color:#ffd54f; font-weight:800;">🏆 ${displayName}${dealerTag}</span><span style="color:#81c784; font-weight:800;">만관 쯔모 화료 (+${ach.totalGain.toLocaleString()}점)</span>`;
            drawTenpaiList.appendChild(row);
        }

        modalDraw.style.display = 'flex';
    });

    // Abortive Draw Display (도중유국: 구종구패, 사풍연타, 사가리치, 사간산란, 삼가화)
    game.on('abortiveDraw', (data) => {
        if (typeof MahjongAudio !== 'undefined') MahjongAudio.playDraw();
        updatePlayerStatusUI();
        sceneManager.renderGameState(game);

        if (drawModalTitle) drawModalTitle.textContent = `도중 유국 (途中流局) - ${data.reason}`;
        if (drawModalSub) drawModalSub.textContent = data.details || '도중 유국 규정으로 국이 종료되었습니다. (오야 연장, 공탁 리치봉 유지)';

        drawTenpaiList.innerHTML = '';
        const renchanRow = document.createElement('div');
        renchanRow.className = 'yaku-row';
        renchanRow.innerHTML = `<span class="yaku-name">연장 규정</span><span style="color:#64b5f6; font-weight:800;">오야 연장 / ${data.honba + 1}본장</span>`;
        drawTenpaiList.appendChild(renchanRow);

        const stickRow = document.createElement('div');
        stickRow.className = 'yaku-row';
        stickRow.innerHTML = `<span class="yaku-name">공탁 리치봉</span><span style="color:#ffd54f; font-weight:800;">${data.riichiSticks}개 (${data.riichiSticks * 1000}점) 이월</span>`;
        drawTenpaiList.appendChild(stickRow);

        modalDraw.style.display = 'flex';
    });

    // Tutorial Genbutsu Defense Success (Stage 5: Watch P1 Deal-in)
    game.on('tutorialGenbutsuSuccess', () => {
        updatePlayerStatusUI();
        updateRiichiWaitsHUD();
        sceneManager.renderGameState(game);
        window.showBigMessage(0, '🛡️ 방총 회피 성공! 하가 AI 차례 관전');
        if (tutHudStageBadge) tutHudStageBadge.textContent = "제 5 장: 마와시우치 수비 성공 ➡️ 하가 차례 관전";
        if (tutHudBody) {
            tutHudBody.innerHTML = 
                "<div class='tut-target-pill' style='background:linear-gradient(135deg, #16a34a, #15803d); border-color:#86efac;'>🛡️ 3통 현물 타패로 방총을 완벽하게 회피했습니다!</div><br>" +
                "좋아요! 무작정 공격하는 것보단 한 수 내어주며(패를 돌리면서: <strong>마와시우치</strong>) 버티는 것도 훌륭한 방법입니다.<br><br>" +
                "<div class='tut-caution-box' style='background:rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; color:#dbeafe;'>" +
                "👀 <strong>하가 AI(오른쪽)의 차례를 지켜보세요!</strong><br>" +
                "내가 버리지 않고 아껴두었던 그 위험패를 하가 AI가 뽑아 버립니다. 과연 어떤 일이 벌어질까요?" +
                "</div>";
        }
    });

    // Stage 5 Deal-in Rewind Button (시간 되돌리기 ⏪)
    if (btnTutRewind) {
        btnTutRewind.onclick = () => {
            if (modalTutDealIn) modalTutDealIn.style.display = 'none';
            if (typeof MahjongAudio !== 'undefined') MahjongAudio.playTileClick();

            isRiichiSelectMode = false;
            hideAllActions();

            // Execute time rewind in engine
            game.rewindStage5ToDefense();
            stage5SubStep = 'defense';

            // Re-render table & update UI
            updatePlayerStatusUI();
            updateRiichiWaitsHUD();
            sceneManager.renderGameState(game);

            window.showBigMessage(0, '⏳ 시간을 되돌렸습니다! 이번엔 3통을 버려보세요');
            updateTutorialHUD();
        };
    }

    // Game Over Display
    game.on('gameOver', (data) => {
        gameOverReason.textContent = data.reason;
        gameOverRankings.innerHTML = '';

        for (const r of data.ranking) {
            const row = document.createElement('div');
            row.className = 'yaku-row';
            const medal = ['🥇 1위', '🥈 2위', '🥉 3위', '4위'][r.rank - 1] || `${r.rank}위`;
            const displayName = r.baseName || (r.name ? r.name.replace(/\s*\([^)]*\)/g, '') : `플레이어 ${r.id}`);
            row.innerHTML = `<span class="yaku-name">${medal}: ${displayName}</span><span class="yaku-han">${r.points.toLocaleString()}점</span>`;
            gameOverRankings.appendChild(row);
        }

        // modalGameOver.style.display = 'flex';
    });

    // Button Click Bindings
    btnNextRound.onclick = () => {
        modalWin.style.display = 'none';
        if (game.tutorialScenario) {
            if (currentTutorialStage < TUTORIAL_STAGES.length) {
                showTutorialStage(currentTutorialStage + 1);
            } else {
                if (tutorialHud) tutorialHud.style.display = 'none';
                if (typeof sceneManager.clearTutorialTargetTile === 'function') {
                    sceneManager.clearTutorialTargetTile();
                }
                if (modalModeSelect) {
                    if (viewModeMain) viewModeMain.style.display = 'block';
                    if (viewTutorialStages) viewTutorialStages.style.display = 'none';
                    modalModeSelect.style.display = 'flex';
                }
            }
            return;
        }
        if (game.state !== 'GAME_OVER') {
            game.startRound();
        } else {
            document.getElementById('modal-gameover').style.display = 'flex';
        }
    };

    btnDrawNext.onclick = () => {
        modalDraw.style.display = 'none';
        if (game.state !== 'GAME_OVER') {
            game.startRound();
        } else {
            document.getElementById('modal-gameover').style.display = 'flex';
        }
    };

    btnRestartGame.onclick = () => {
        modalGameOver.style.display = 'none';
        if (modalModeSelect) {
            if (viewModeMain) viewModeMain.style.display = 'block';
            if (viewTutorialStages) viewTutorialStages.style.display = 'none';
            modalModeSelect.style.display = 'flex';
        } else {
            game.startNewGame();
        }
    };

    btnRiichi.onclick = () => {
        if (currentTutorialStage === 1 && stage1Step < 5) {
            stage1Step = 5;
            updateTutorialHUD();
        }
        isRiichiSelectMode = true;
        btnRiichi.style.display = 'none';
        const btnTsumo = document.getElementById('btn-tsumo');
        const tsumoWasVisible = btnTsumo.style.display === 'block';
        btnTsumo.style.display = 'none';
        const btnKan = document.getElementById('btn-kan');
        const kanWasVisible = btnKan.style.display === 'block';
        btnKan.style.display = 'none';
        
        const player = game.players[0];
        const validIndices = player.tenpaiDiscards.map(d => d.discardIndex);
        sceneManager.setRiichiSelectionMode(validIndices);
        
        if (btnCancelAction) {
            btnCancelAction.style.display = 'block';
            btnCancelAction.onclick = () => {
                isRiichiSelectMode = false;
                sceneManager.clearRiichiSelectionMode();
                btnCancelAction.style.display = 'none';
                btnRiichi.style.display = 'block';
                if (tsumoWasVisible) btnTsumo.style.display = 'block';
                if (kanWasVisible) btnKan.style.display = 'block';
                onPlayerTileHoverOut();
            };
        }
    };

    // Sound toggle
    btnToggleSound.onclick = () => {
        Mahjong3D.Audio.isMuted = !Mahjong3D.Audio.isMuted;
        if (Mahjong3D.Audio.isMuted) {
            btnToggleSound.textContent = '🔇 소리 꺼짐';
        } else {
            btnToggleSound.textContent = '🔊 소리 켜짐';
            Mahjong3D.Audio.initContext();
        }
    };

    // Tutorial Stage 1 Step-by-Step Hand Structure & Riichi Data
    const TUTORIAL_STAGE_1_STEPS = [
        {
            step: 1,
            title: "제 1 장: 기본 손패 구조와 리치 (1단계: 몸통 ① - 만수패 슌츠)",
            targetTile: ['2m', '3m', '4m'],
            targetTileName: "2만-3만-4만 [몸통 ①: 슌츠]",
            desc: "<div class='tut-target-pill'>🔍 손패 확인: <strong>[ 2만 - 3만 - 4만 ]</strong><div style='font-size:0.92rem; font-weight:600; color:#ffecb3; margin-top:3px;'>(첫 번째 완성 몸통: 슌츠)</div></div><br>" +
                  "마작의 기본 승리 형태는 <strong>4개의 몸통(각 3장) + 1개의 머리(2장) = 총 14장</strong>입니다.<br><br>" +
                  "테이블 위 손패에서 금빛으로 발광하며 위로 솟아오른 <strong>[ 2만 - 3만 - 4만 ]</strong>을 확인해 보세요!<br><br>" +
                  "💡 <strong>슌츠(順子 - 숫자의 순서):</strong><br>" +
                  "같은 종류의 숫자패 3장이 차례대로 이어진 형태를 <strong>'슌츠(順子)'</strong>라고 부릅니다.<br>" +
                  "현재 2-3-4만이 순서대로 예쁘게 모여 <strong>첫 번째 몸통(3장)</strong>을 이미 완벽하게 완성하고 있습니다! ✅<br><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성된 몸통: <strong>1개</strong> / 4개<br>" +
                  "• 형태: [ 2-3-4만 ] (슌츠)<br>" +
                  "</div><br>" +
                  "우측 상단(또는 아래)의 <strong>[ 다음 설명 ▶ ]</strong>을 눌러 두 번째 몸통을 확인해 보세요!" +
                  "<div style='display:flex; justify-content:flex-end; margin-top:14px;'>" +
                  "<button onclick='window.nextStage1Step()' class='modal-btn btn-highlight' style='padding:6px 16px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; cursor:pointer;'>다음 설명 (2/6) ▶</button>" +
                  "</div>",
            tip: "💡 마작에서 1-2-3, 4-5-6처럼 연속된 세 숫자를 모은 몸통을 '슌츠(順子)'라고 부릅니다."
        },
        {
            step: 2,
            title: "제 1 장: 기본 손패 구조와 리치 (2단계: 몸통 ② - 통수패 슌츠)",
            targetTile: ['6p', '7p', '8p'],
            targetTileName: "6통-7통-8통 [몸통 ②: 슌츠]",
            desc: "<div class='tut-target-pill'>🔍 손패 확인: <strong>[ 6통 - 7통 - 8통 ]</strong><div style='font-size:0.92rem; font-weight:600; color:#ffecb3; margin-top:3px;'>(두 번째 완성 몸통: 슌츠)</div></div><br>" +
                  "이번에는 손패 가운데에서 금빛으로 솟아오른 <strong>[ 6통 - 7통 - 8통 ]</strong>을 확인해 보세요!<br><br>" +
                  "통수패(동그라미 모양 패) 3장이 6, 7, 8 순서대로 가지런히 이어져 있습니다.<br>" +
                  "이것 역시 훌륭한 슌츠로, <strong>두 번째 몸통(3장)</strong>이 완성되어 있습니다! ✅<br><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성된 몸통: <strong>2개</strong> / 4개<br>" +
                  "• 형태: [ 234만 ], [ 678통 ] (모두 슌츠)<br>" +
                  "</div><br>" +
                  "<strong>[ 다음 설명 ▶ ]</strong>을 눌러 세 번째 몸통을 확인해 보세요!" +
                  "<div style='display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:8px;'>" +
                  "<button onclick='window.prevStage1Step()' class='modal-btn' style='padding:6px 14px; font-size:0.88rem; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); cursor:pointer;'>◀ 이전 설명</button>" +
                  "<button onclick='window.nextStage1Step()' class='modal-btn btn-highlight' style='padding:6px 16px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; cursor:pointer;'>다음 설명 (3/6) ▶</button>" +
                  "</div>",
            tip: "💡 만수패, 통수패, 삭수패 어디서든 3개의 숫자가 연속되면 슌츠 몸통이 됩니다."
        },
        {
            step: 3,
            title: "제 1 장: 기본 손패 구조와 리치 (3단계: 몸통 ③ - 삭수패 코츠)",
            targetTile: ['3s'],
            targetTileName: "3삭-3삭-3삭 [몸통 ③: 코츠]",
            desc: "<div class='tut-target-pill'>🔍 손패 확인: <strong>[ 3삭 - 3삭 - 3삭 ]</strong><div style='font-size:0.92rem; font-weight:600; color:#ffecb3; margin-top:3px;'>(세 번째 완성 몸통: 코츠)</div></div><br>" +
                  "이번에는 손패에서 금빛으로 솟아오른 <strong>[ 3삭 3장 ]</strong>을 확인해 보세요!<br><br>" +
                  "💡 <strong>코츠(刻子 - 똑같은 패 3장):</strong><br>" +
                  "몸통은 숫자가 이어지는 슌츠뿐만 아니라, 이렇게 <strong>완전히 똑같은 패 3장을 모아도 하나의 몸통</strong>이 됩니다!<br>" +
                  "이를 <strong>'코츠(刻子)'</strong>라고 부르며, 이제 몸통 3세트가 완성되었습니다! ✅<br><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성된 몸통: <strong>3개</strong> / 4개<br>" +
                  "• 형태: [ 234만 (슌츠) ], [ 678통 (슌츠) ], [ 333삭 (코츠) ]<br>" +
                  "</div><br>" +
                  "<strong>[ 다음 설명 ▶ ]</strong>을 눌러 '완성되려는 몸통 후보'를 확인해 보세요!" +
                  "<div style='display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:8px;'>" +
                  "<button onclick='window.prevStage1Step()' class='modal-btn' style='padding:6px 14px; font-size:0.88rem; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); cursor:pointer;'>◀ 이전 설명</button>" +
                  "<button onclick='window.nextStage1Step()' class='modal-btn btn-highlight' style='padding:6px 16px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; cursor:pointer;'>다음 설명 (4/6) ▶</button>" +
                  "</div>",
            tip: "💡 똑같은 패 3장을 모은 몸통을 '코츠(刻子)'라고 부릅니다. 수패뿐만 아니라 자패(동·남·서·북·백·발·중)도 3장을 모으면 코츠가 됩니다."
        },
        {
            step: 4,
            title: "제 1 장: 기본 손패 구조와 리치 (4단계: 완성되려는 몸통 - 5-6삭 양면 타츠)",
            targetTile: ['5s', '6s'],
            targetTileName: "5삭-6삭 [완성되려는 몸통: 타츠 / 텐파이 대기]",
            desc: "<div class='tut-target-pill'>🔍 손패 확인: <strong>[ 5삭 - 6삭 ]</strong><div style='font-size:0.92rem; font-weight:600; color:#ffecb3; margin-top:3px;'>(완성 직전의 몸통 후보: 양면 타츠)</div></div><br>" +
                  "이번에는 금빛으로 솟아오른 <strong>[ 5삭 - 6삭 ]</strong> 2장을 주목해 보세요!<br><br>" +
                  "💡 <strong>타츠(搭子 - 완성 직전의 2장):</strong><br>" +
                  "1장만 더 들어오면 몸통(3장)이 되는 2장 짝을 <strong>'타츠(搭子)'</strong>라고 부릅니다.<br>" +
                  "5-6삭 양옆으로 <strong>[ 4삭 ]</strong>이 들어오면 `4-5-6삭`, <strong>[ 7삭 ]</strong>이 들어오면 `5-6-7삭`으로 <strong>마지막 4번째 몸통이 완성</strong>됩니다!<br><br>" +
                  "🔥 <strong>텐파이 (Tenpai - 聽牌):</strong><br>" +
                  "이렇게 딱 1장만 더 들어오면 승리(4몸통 1머리 완성)하는 상태를 마작에서 <strong>'텐파이'</strong>라고 부릅니다!<br><br>" +
                  "<strong>[ 다음 설명 ▶ ]</strong>을 눌러 마지막 핵심 요소인 '머리'를 확인해 보세요!" +
                  "<div style='display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:8px;'>" +
                  "<button onclick='window.prevStage1Step()' class='modal-btn' style='padding:6px 14px; font-size:0.88rem; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); cursor:pointer;'>◀ 이전 설명</button>" +
                  "<button onclick='window.nextStage1Step()' class='modal-btn btn-highlight' style='padding:6px 16px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; cursor:pointer;'>다음 설명 (5/6) ▶</button>" +
                  "</div>",
            tip: "💡 양쪽으로 2종류의 패를 기다리는 형태(4삭 또는 7삭)를 '양면(료멘) 대기'라고 부르며, 가장 유리한 대기 형태입니다."
        },
        {
            step: 5,
            title: "제 1 장: 기본 손패 구조와 리치 (5단계: 머리 - 9통 또이츠)",
            targetTile: ['9p'],
            targetTileName: "9통-9통 [머리: 또이츠 (작두)]",
            desc: "<div class='tut-target-pill'>🔍 손패 확인: <strong>[ 9통 - 9통 ]</strong><div style='font-size:0.92rem; font-weight:600; color:#ffecb3; margin-top:3px;'>(승리의 필수 조건: 머리 / 또이츠)</div></div><br>" +
                  "이번에는 금빛으로 솟아오른 <strong>[ 9통 2장 ]</strong>을 확인해 보세요!<br><br>" +
                  "💡 <strong>머리(작두 / 또이츠: 対子):</strong><br>" +
                  "마작의 손패는 4개의 몸통(3×4=12장)만으로는 완성되지 않습니다.<br>" +
                  "반드시 <strong>완전히 똑같은 패 2장의 짝(머리/작두)</strong>이 있어야 비로소 14장 승리 형태가 성립합니다! ✅<br><br>" +
                  "🔍 <strong>내 14장 손패 종합 요약:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 몸통 1: <strong>[ 2-3-4만 ]</strong> (슌츠 완성 ✅)<br>" +
                  "• 몸통 2: <strong>[ 6-7-8통 ]</strong> (슌츠 완성 ✅)<br>" +
                  "• 몸통 3: <strong>[ 3-3-3삭 ]</strong> (코츠 완성 ✅)<br>" +
                  "• 완성되려는 몸통 4: <strong>[ 5-6삭 ]</strong> (4삭·7삭 대기 🎯)<br>" +
                  "• 머리(작두): <strong>[ 9-9통 ]</strong> (또이츠 완성 ✅)<br>" +
                  "• 잉여 외톨이 패: <strong>[ 동 (1z) ]</strong> (혼자 겉도는 자패 ❌)<br>" +
                  "</div><br>" +
                  "모든 구조가 완벽히 파악되었습니다! 이제 <strong>[ 다음 실습 ▶ ]</strong>을 눌러 리치 선언 실전에 돌입해 보세요!" +
                  "<div style='display:flex; justify-content:space-between; align-items:center; margin-top:14px; gap:8px;'>" +
                  "<button onclick='window.prevStage1Step()' class='modal-btn' style='padding:6px 14px; font-size:0.88rem; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); cursor:pointer;'>◀ 이전 설명</button>" +
                  "<button onclick='window.nextStage1Step()' class='modal-btn btn-highlight' style='padding:6px 16px; font-size:0.88rem; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); border:none; cursor:pointer;'>실전 리치 조작 (6/6) ▶</button>" +
                  "</div>",
            tip: "💡 4개의 몸통과 1개의 머리가 모여야 비로소 마작의 승리 형태(4몸통 1머리 = 총 14장)가 완성됩니다."
        },
        {
            step: 6,
            title: "제 1 장: 가장 강력한 무기 - 리치(立直)와 화료 (6단계: 실전! 리치 선언 & 동 타패)",
            targetTile: '1z',
            targetTileName: "동 (1z) [리치 선언 타패]",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #f59e0b, #ef4444); border-color:#fbbf24;'>🎯 실전 조작: <strong>[리치 선언]</strong> 클릭 후 <strong>[ 동 (1z) ]</strong> 타패!</div><br>" +
                  "이제 마작의 가장 강력한 무기인 <strong>[ 리치(立直) ]</strong>를 선언할 차례입니다!<br><br>" +
                  "남의 패를 울지 않은 깨끗한 멘젠 상태에서 <strong>1장만 더 들어오면 승리하는 상태(텐파이)</strong>가 되었을 때 1,000점 점봉을 걸고 승부를 띄우는 초강력 기술입니다.<br><br>" +
                  "👉 <strong>어떻게 조작해야 할까요?</strong><br>" +
                  "1️⃣ 화면 중앙의 <strong>[리치 선언]</strong> 버튼을 먼저 클릭하세요.<br>" +
                  "2️⃣ 손패 맨 오른쪽에 빛나고 있는 고립 자패 <strong>[ 동 (1z) ]</strong>을 클릭하여 버리세요!<br><br>" +
                  "1,000점 리치봉이 중앙에 공탁되며, 다음 턴에 <strong>상대(하가 AI)가 버린 4삭으로 짜릿한 [론(ロン) 화료]</strong>를 거머쥐게 됩니다!" +
                  "<div style='display:flex; justify-content:flex-start; margin-top:14px;'>" +
                  "<button onclick='window.prevStage1Step()' class='modal-btn' style='padding:6px 14px; font-size:0.88rem; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); cursor:pointer;'>◀ 이전 손패 구조 보기</button>" +
                  "</div>",
            tip: "💡 리치를 걸고 화료하면 숨겨진 '뒷도라(우라도라)'를 확인할 수 있어 판수와 점수가 대폭 상승합니다."
        }
    ];

    // Tutorial Stage 2 Step-by-Step Progressive Hand Building Data
    const TUTORIAL_STAGE_2_STEPS = [
        {
            step: 1,
            title: "제 2 장: 리치를 향한 조패 (1단계: 배패 분석 & 외톨이 자패 정리)",
            targetTile: "4z",
            targetTileName: "북 (4z)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 북 (4z) ]</strong></div><br>" +
                  "마작의 기본 승리 형태는 <strong>4개의 몸통(슌츠/코츠) + 1개의 머리(2장) = 총 14장</strong>입니다.<br><br>" +
                  "🔍 <strong>현재 내 첫 배패(14장) 분석:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• <strong>1-2-3만</strong>: 순서대로 3장 모인 슌츠(몸통) 1세트 완성 ✅<br>" +
                  "• <strong>백-백 (5z)</strong>: 똑같은 패 2장의 머리(또이츠) 1세트 완성 ✅<br>" +
                  "• <strong>4-5통</strong>: 3통이나 6통이 들어오면 몸통이 되는 양면 타츠<br>" +
                  "• <strong>7-8삭</strong>: 6삭이나 9삭이 들어오면 몸통이 되는 양면 타츠<br>" +
                  "• <strong>4-5삭</strong>: 3삭이나 6삭이 들어오면 몸통이 되는 양면 타츠<br>" +
                  "</div><br>" +
                  "👉 <strong>왜 [ 북(4z) ]을 가장 먼저 버려야 할까요?</strong><br>" +
                  "현재 손패에는 앞으로 몸통으로 발전할 수 있는 2장 짝(타츠)들이 이미 충분히 갖추어져 있습니다.<br>" +
                  "반면 <strong>[ 북(4z) ]</strong>은 1장뿐인 글자패(자패)로, 숫자 순서(슌츠)를 만들 수 없어 발전 가치가 전혀 없는 <strong>완전한 외톨이(고립패)</strong>입니다.<br>" +
                  "마작 조패의 정석대로 쓸모없는 외톨이 자패 <strong>[ 북(4z) ]</strong>부터 버려 손패를 깔끔하게 정돈해 봅시다!" +
                  "<div class='tut-caution-box'>⚠️ <strong>실전 주의:</strong> 지금은 내 패를 완성하기 위해 가장 불필요한 패부터 과감하게 버리지만, 실전에서 상대가 [리치]를 선언했거나 패를 크게 울었다면 무조건 버리다 론을 당할 수 있습니다! (수비법은 5장에서 배웁니다)</div>",
            tip: "💡 <strong>마작 조패의 제1원칙:</strong> 짝이 맞지 않는 고립된 자패(동·남·서·북·백·발·중)부터 1순목에 가장 먼저 버리는 것이 기본 정석입니다."
        },
        {
            step: 2,
            title: "제 2 장: 리치를 향한 조패 (2단계: 6통 쯔모! 슌츠 완성 & 외톨이 수패 정리)",
            targetTile: "1p",
            targetTileName: "1통 (1p)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 1통 (1p) ]</strong></div><br>" +
                  "🎉 <strong>새로 들어온 [ 6통 ]을 확인하세요!</strong><br>" +
                  "방금 쯔모한 `6통`이 기존의 `4-5통`과 결합하여 <strong>`4-5-6통` 슌츠(몸통)가 완성되었습니다! ✅</strong><br><br>" +
                  "🔍 <strong>현재 내 손패 상태:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성된 몸통 2개: [ 1-2-3만 ], [ 4-5-6통 ] ✅<br>" +
                  "• 완성된 머리 1개: [ 백-백 ] ✅<br>" +
                  "• 몸통 후보 2개: [ 7-8삭 ], [ 4-5삭 ]<br>" +
                  "</div><br>" +
                  "👉 <strong>왜 [ 1통(1p) ]을 버려야 할까요?</strong><br>" +
                  "`4-5-6통`이 완성되었으므로, 이제 혼자 덩그러니 남은 <strong>[ 1통(1p) ]</strong>은 연결될 가망이 없는 잉여패입니다.<br>" +
                  "1통을 버려 남은 삭수패(7-8삭, 4-5삭)가 발전할 수 있도록 손패를 한 걸음 전진시킵시다!" +
                  "<div class='tut-caution-box'>⚠️ <strong>실전 주의:</strong> 1이나 9는 자패 다음으로 비교적 안전한 편이지만, 실전에서는 항상 상대방의 버림패를 확인하며 버리는 것이 안전합니다.</div>" +
                  "<div class='tut-caution-box' style='background:rgba(3, 169, 244, 0.12); border-left: 4px solid #03a9f4; color:#e1f5fe; margin-top:10px;'>" +
                  "📢 <strong>[주의] 도중에 울기(후로) 찬스가 나와도 지금은 [ 패스 ]하세요!</strong><br>" +
                  "1통을 버린 직후, 상가(왼쪽 AI)가 6삭을 버리며 화면에 <strong>[ 치 ]</strong> 버튼이 활성화될 수 있습니다.<br>" +
                  "하지만 2장은 남의 패를 울지 않는 순수한 <strong>'멘젠(門前) 조패'</strong>를 배우는 단계입니다! 지금 패를 울어버리면 멘젠이 깨져 리치를 걸 수 없게 됩니다.<br>" +
                  "<strong>지금은 절대 울지 말고 [ 패스 ] 버튼을 눌러 넘어가 주세요.</strong><br>" +
                  "상대방의 버림패를 가져와 전광석화처럼 손패를 완성하는 울기(치·퐁·깡) 기술은 바로 다음 <strong>제 3 장</strong>에서 원리부터 사용법까지 완벽하게 알려드립니다!" +
                  "</div>",
            tip: "💡 남의 패를 울지 않고 내 힘으로만 손패를 완성하는 상태를 '멘젠'이라 하며, 멘젠이어야만 강력한 '리치'를 선언할 수 있습니다."
        },
        {
            step: 3,
            title: "제 2 장: 리치를 향한 조패 (3단계: 9삭 쯔모! 텐파이(Tenpai) 도달)",
            targetTile: "9m",
            targetTileName: "9만 (9m)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 9만 (9m) ]</strong></div><br>" +
                  "🔥 <strong>또 하나의 몸통이 완성되었습니다!</strong><br>" +
                  "새로 들어온 `9삭` 덕분에 <strong>`7-8-9삭` 슌츠가 완성되었습니다! ✅</strong><br><br>" +
                  "🔍 <strong>승리 직전! 텐파이(Tenpai - 聽牌) 도달:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성된 몸통 3개: [ 123만 ], [ 456통 ], [ 789삭 ] ✅<br>" +
                  "• 완성된 머리 1개: [ 백-백 ] ✅<br>" +
                  "• 마지막 대기: [ 4-5삭 ] ➡️ <strong>3삭 또는 6삭</strong>만 들어오면 화료 완성!<br>" +
                  "</div><br>" +
                  "👉 <strong>왜 [ 9만(9m) ]을 버려야 할까요?</strong><br>" +
                  "손패에 남은 마지막 외톨이 패인 <strong>[ 9만(9m) ]</strong>을 버리면, 승리까지 딱 1장 남은 <strong>텐파이</strong>가 확정됩니다!",
            tip: "💡 1장만 더 들어오면 승리하는 상태를 '텐파이'라고 부르며, 텐파이가 되어야 비로소 화료(승리)를 노릴 수 있습니다."
        },
        {
            step: 4,
            title: "제 2 장: 리치를 향한 조패 (4단계: 승리의 순간 - 쯔모 화료!)",
            targetTile: null,
            targetTileName: "화면 중앙의 [ 쯔모 ] 버튼 클릭!",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #f59e0b, #ef4444); border-color:#fbbf24;'>🏆 승리 선언: 화면 중앙의 <strong>[ 쯔모 ]</strong> 버튼을 클릭하세요!</div><br>" +
                  "🎊 <strong>원하던 대기패 [ 3삭 ]을 내 손으로 직접 뽑았습니다!</strong><br><br>" +
                  "🔍 <strong>최종 완성된 14장 손패 (4몸통 1머리):</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 몸통 1: 1-2-3만 (슌츠)<br>" +
                  "• 몸통 2: 4-5-6통 (슌츠)<br>" +
                  "• 몸통 3: 7-8-9삭 (슌츠)<br>" +
                  "• 몸통 4: <strong>3-4-5삭 (방금 3삭으로 완성된 슌츠!)</strong><br>" +
                  "• 머리: 백-백 (또이츠)<br>" +
                  "</div><br>" +
                  "내가 뽑은 패로 4몸통 1머리를 직접 완성하여 승리하는 것을 <strong>[ 쯔모(ツモ) ]</strong>라고 합니다.<br>" +
                  "지금 바로 <strong>[ 쯔모 ]</strong> 버튼을 눌러 승리를 달성해 보세요!",
            tip: "💡 내가 직접 뽑아 이기면 '쯔모', 상대방의 버림패로 이기면 '론'이라고 부릅니다."
        }
    ];

    // Tutorial Stage 3 Step-by-Step Data (Furo & Kuikae & Ron)
    const TUTORIAL_STAGE_3_STEPS = [
        {
            step: 1,
            title: "제 3 장: 울기(후로)와 역패 (1단계: 고립패 1통 정리 & 중 퐁 준비)",
            targetTile: "1p",
            targetTileName: "1통 (1p)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 1통 (1p) ]</strong></div><br>" +
                  "상대방의 버림패를 가져와 전광석화처럼 손패를 완성하는 기술을 <strong>울기(후로 - 鳴き/副露)</strong>라고 합니다.<br><br>" +
                  "🔍 <strong>현재 내 손패 분석:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• <strong>중(7z) 2장 보유</strong>: 3장을 모으면 울어도 1판 역이 인정되는 삼원패(역패)!<br>" +
                  "• <strong>2-3-4만, 5-6-7통</strong>: 슌츠(몸통) 2세트 완성 ✅<br>" +
                  "• <strong>8-8삭</strong>: 머리(또이츠) 1세트 완성 ✅<br>" +
                  "• <strong>4-5삭</strong>: 3삭 또는 6삭을 기다리는 양면 타츠<br>" +
                  "• <strong>1통, 9삭</strong>: 잉여 외톨이 패<br>" +
                  "</div><br>" +
                  "👉 <strong>어떻게 조작해야 할까요?</strong><br>" +
                  "1️⃣ 먼저 가장 불필요한 고립 수패 <strong>[ 1통(1p) ]</strong>을 버리세요.<br>" +
                  "2️⃣ 바로 다음 차례에 하가 AI가 버리는 <strong>[중(7z)]</strong>으로 화면에 나타날 <strong>[ 퐁 ]</strong> 버튼을 눌러보세요!",
            tip: "💡 삼원패(백·발·중)나 자신의 자리 바람패(자풍), 판의 바람패(장풍)는 울어서 3장을 완성해도 1판의 역이 사라지지 않는 초보자의 가장 든든한 무기입니다."
        },
        {
            step: 2,
            title: "제 3 장: 울기(후로)와 역패 (2단계: 중 퐁 성공! 쿠이카에 주의 & 9삭 타패)",
            targetTile: "9s",
            targetTileName: "9삭 (9s)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 9삭 (9s) ]</strong></div><br>" +
                  "⚡ <strong>전광석화! [ 퐁 ]으로 중(中) 3세트 완성!</strong><br>" +
                  "상대방이 버린 패로 <strong>`중-중-중`</strong> 코츠를 완성했습니다. 이제 <strong>역패 1판이 확정</strong>되었습니다! ✅<br><br>" +
                  "🔍 <strong>현재 텐파이 상태:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성 몸통 3세트: [ 234만 ], [ 567통 ], [ 중 퐁(7z) ] ✅<br>" +
                  "• 완성 머리 1세트: [ 8-8삭 ] ✅<br>" +
                  "• 마지막 대기: [ 4-5삭 ] ➡️ <strong>3삭 또는 6삭</strong> 대기!<br>" +
                  "</div><br>" +
                  "👉 <strong>왜 [ 9삭(9s) ]을 버려야 할까요?</strong><br>" +
                  "8삭 머리와 4-5삭 대기를 유지하기 위해 불필요한 <strong>[ 9삭(9s) ]</strong>을 버려 텐파이를 굳히세요!<br>" +
                  "<div class='tut-caution-box' style='background:rgba(255, 87, 34, 0.12); border-left: 4px solid #ff7043; color:#ffccbc; margin-top:10px;'>" +
                  "⚠️ <strong>마작의 필수 후로 룰 - '쿠이카에(喰い替え) 금지':</strong><br>" +
                  "방금 상대로부터 <strong>[중(7z)]</strong>을 울어온 직후에는, 그 턴에 손패에 남아있는 <strong>[중]</strong>을 곧바로 버리는 행위가 공식 룰상 엄격히 금지됩니다 (현물 쿠이카에 금지).<br>" +
                  "또한 치를 칠 때도 순서의 반대쪽 연결패를 바로 버릴 수 없습니다 (예: 2-3만으로 1만을 치하고 4만을 버리는 스지 쿠이카에 금지).<br>" +
                  "따라서 울기 직후에는 가져온 패와 상관없는 고립 잉여패인 <strong>[ 9삭(9s) ]</strong>을 버려야 합니다!" +
                  "</div>",
            tip: "💡 쿠이카에(喰い替え)는 울기를 이용해 턴 소모 없이 손패를 손쉽게 바꾸는 치팅을 방지하기 위한 마작의 기본 공식 규칙입니다."
        },
        {
            step: 3,
            title: "제 3 장: 울기(후로)와 역패 (3단계: 승리의 순간 - 론 화료!)",
            targetTile: null,
            targetTileName: "화면 중앙의 [ 론 ] 버튼 클릭!",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #f59e0b, #ef4444); border-color:#fbbf24;'>🏆 승리 선언: 화면 중앙의 <strong>[ 론 ]</strong> 버튼을 클릭하세요!</div><br>" +
                  "🎉 <strong>대면 AI가 우리가 기다리던 [ 3삭 ]을 방출했습니다!</strong><br><br>" +
                  "🔍 <strong>최종 완성된 손패 (울기 속공 완성):</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 완성 몸통 4개: [ 234만 ], [ 567통 ], [ 345삭(론 완성!) ], [ 중 퐁(7z) ]<br>" +
                  "• 완성 머리 1개: [ 8-8삭 ]<br>" +
                  "• 적용된 역: <strong>역패: 중 (1판, 1,000점)</strong><br>" +
                  "</div><br>" +
                  "울기(후로)를 하면 비록 리치를 걸 수 없어 점수는 낮아지지만, <strong>누구보다 빠르게 먼저 화료하여 상대의 공격을 원천 차단</strong>하는 강력한 속공 무기가 됩니다!<br>" +
                  "지금 바로 <strong>[ 론 ]</strong> 버튼을 눌러 승리를 거머쥐어 보세요!",
            tip: "💡 울어서 손패가 열린 상태(후로)라도 '역패'나 '탕야오' 같은 확정 역이 1개 이상 있다면 당당하게 론/쯔모로 화료할 수 있습니다."
        }
    ];

    // Tutorial Stage 4 Step-by-Step Data (No Yaku Trap & Tanyao Detour)
    const TUTORIAL_STAGE_4_STEPS = [
        {
            step: 1,
            title: "제 4 장: 초보자 최대 함정 ⚠️ - '역 없음(No Yaku)' 탈출 (1단계: 고립 1통 정리 & 함정 예고)",
            targetTile: "1p",
            targetTileName: "1통 (1p)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 1통 (1p) ]</strong></div><br>" +
                  "상대의 패를 울어서(치) 2세트나 완성했습니다. 패가 빨라져서 금방 이길 것 같죠?<br>" +
                  "하지만 마작 초보자 100명 중 99명이 통곡하는 <strong>치명적인 함정</strong>이 도사리고 있습니다!<br><br>" +
                  "🔍 <strong>현재 내 손패 분석:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• <strong>후로(치) 2세트</strong>: [ 2-3-4만 ], [ 6-7-8삭 ] (공개 완료 ✅)<br>" +
                  "• <strong>3-3삭</strong>: 머리(또이츠) 1세트 완성 ✅<br>" +
                  "• <strong>7-8-9만</strong>: 슌츠(몸통) 1세트 완성 ✅<br>" +
                  "• <strong>4-5통</strong>: 3통 또는 6통을 기다리는 양면 타츠<br>" +
                  "• <strong>1통</strong>: 혼자 남은 고립 1·9패<br>" +
                  "</div><br>" +
                  "👉 <strong>왜 [ 1통(1p) ]을 버려야 할까요?</strong><br>" +
                  "1️⃣ 4-5통 대기를 살리기 위해 먼저 고립패인 <strong>[ 1통(1p) ]</strong>을 타패하여 텐파이를 만드세요.<br>" +
                  "2️⃣ <strong>주의!</strong> 1통을 버리면 4몸통 1머리가 완성되어 3통/6통 텐파이가 되지만, <strong>다음 순간 상대가 3통을 버릴 때 일어나는 기이한 현상</strong>을 똑똑히 지켜보세요!",
            tip: "💡 울기(후로)를 하면 멘젠이 깨져서 '리치'를 걸 수 없습니다. 역(Yaku)이 없으면 텐파이라도 이길 수 없습니다."
        },
        {
            step: 2,
            title: "제 4 장: '역 없음' 탈출 (2단계: ⚠️ 역 없음 실체 확인! ➡️ 6만 연결 & 9만 타패)",
            targetTile: "9m",
            targetTileName: "9만 (9m)",
            desc: "<div class='tut-target-pill'>🎯 버려야 할 추천 타패: <strong>[ 9만 (9m) ]</strong></div><br>" +
                  "<div class='tut-caution-box' style='background:rgba(239, 68, 68, 0.18); border-left: 4px solid #ef4444; color:#fca5a5; font-size:1.02rem; padding:12px; margin-bottom:12px;'>" +
                  "⚠️ <strong>보셨나요?! 상대(AI)가 대기패인 [ 3통 ]을 버렸는데도 [ 론 ] 버튼이 뜨지 않았습니다!</strong><br>" +
                  "4몸통 1머리를 다 모았는데 왜 화료가 안 될까요? 버그일까요?<br>" +
                  "바로 손패에 1·9패인 <strong>[ 9만 (7-8-9만) ]</strong>이 포함되어 있어 <strong>아무런 공식 '역(役)'이 없는 '역 없음(No Yaku)'</strong> 상태이기 때문입니다!<br>" +
                  "(울어서 리치 불가, 멘젠쯔모 불가, 역패 없음, 9만 때문에 탕야오 불가 = 역 0개!)" +
                  "</div>" +
                  "⭐ <strong>초보자 구원투수 - 탕야오(斷幺九)로 우회(방향 전환)하기:</strong><br>" +
                  "방금 내 손으로 <strong>[ 6만 ]</strong>을 쯔모했습니다!<br>" +
                  "기존 7-8만과 연결하면 <strong>`6-7-8만`</strong>이라는 완벽한 탕야오 슌츠(2~8)가 완성됩니다.<br><br>" +
                  "👉 <strong>어떻게 조작해야 할까요?</strong><br>" +
                  "탕야오를 방해하는 유일한 원흉인 끝패 <strong>[ 9만(9m) ]</strong>을 과감히 버리세요!<br>" +
                  "9만을 버리는 순간, 모든 패가 2~8로만 이루어진 <strong>'순수 탕야오 텐파이'</strong>로 다시 태어납니다!",
            tip: "💡 세트가 이미 완성되었다고 미련을 갖지 마세요! 역이 없는 완성 세트는 과감히 깨부수고 역이 있는 방향(탕야오)으로 우회해야 승리할 수 있습니다."
        },
        {
            step: 3,
            title: "제 4 장: '역 없음' 탈출 (3단계: 탕야오 론 화료! 승리의 탈출)",
            targetTile: null,
            targetTileName: "화면 중앙의 [ 론 ] 버튼 클릭!",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #f59e0b, #ef4444); border-color:#fbbf24;'>🏆 승리 선언: 화면 중앙의 <strong>[ 론 ]</strong> 버튼을 클릭하세요!</div><br>" +
                  "🎉 <strong>보세요! 하가 AI가 [ 6통 ]을 버리자마자 이번엔 [ 론 ] 버튼이 당당하게 나타났습니다!</strong><br><br>" +
                  "🔍 <strong>최종 완성된 순수 탕야오 손패 (모든 패가 2~8!):</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 후로 세트 1: [ 2-3-4만 ] (치 ✅)<br>" +
                  "• 후로 세트 2: [ 6-7-8삭 ] (치 ✅)<br>" +
                  "• 손패 세트 3: [ 6-7-8만 ] (9만을 버리고 우회 완성! ✅)<br>" +
                  "• 손패 세트 4: <strong>[ 4-5-6통 ] (방금 6통 론으로 완성! ✅)</strong><br>" +
                  "• 손패 머리: [ 3-3삭 ] (또이츠 ✅)<br>" +
                  "• 적용된 확정 역: <strong>탕야오(斷幺九) - 1판 (1,000점)</strong><br>" +
                  "</div><br>" +
                  "초보 시절 누구나 겪는 <strong>'화료 버튼이 안 뜨는 역 없음의 공포'</strong>를 극복하고, 현명한 우회 조패로 첫 탕야오 승리를 쟁취하셨습니다!<br>" +
                  "지금 바로 <strong>[ 론 ]</strong> 버튼을 눌러 승리를 확정하세요!",
            tip: "💡 후로(울기)를 할 때는 처음부터 1·9·자패를 배제하고 2~8로만 손패를 채우는 '탕야오'를 염두에 두는 것이 마작의 기본기입니다."
        }
    ];

    // Tutorial Stage 5 Step-by-Step Data (Defense & Furiten Safe Tile)
    const TUTORIAL_STAGE_5_STEPS = [
        {
            step: 1,
            title: "제 5 장: 수비의 첫걸음 - 후리텐과 안전패 (1단계: 평범한 배패 정리)",
            targetTile: "1z",
            targetTileName: "동 (1z) [고립 자패]",
            desc: "<div class='tut-target-pill'>🎯 1순 버려야 할 추천 타패: <strong>[ 동 (1z) ]</strong></div><br>" +
                  "대국 초반(1순)에는 아직 상대의 위협이 없으므로, 쓸모없는 고립 자패 <strong>[ 동 (1z) ]</strong>를 버려 평범하게 조패를 진행합니다.<br><br>" +
                  "🔍 <strong>현재 내 손패 분석:</strong><br>" +
                  "<div class='tut-analysis-box'>" +
                  "• 2-3-4-5만, 6-7-8통, 7-8-9삭, 3-3통, 5삭<br>" +
                  "• 동 (1z) (혼자 겉도는 쓸모없는 고립 자패 ❌)<br>" +
                  "</div><br>" +
                  "👉 손패의 <strong>[ 동 (1z) ]</strong>을 클릭하여 버리세요. 1순 대국이 평범하게 진행됩니다.<br><br>" +
                  "<div class='tut-caution-box' style='background:rgba(2, 136, 209, 0.12); border-left: 4px solid #0288d1; color:#e0f2fe;'>" +
                  "🛡️ <strong>이번 장의 핵심 원칙: 후로(울기) 금지와 손패 매수 보존</strong><br>" +
                  "제 5 장은 상대의 리치 공격에 맞서 실점을 막는 <strong>'수비'</strong>를 배우는 장입니다.<br>" +
                  "상대가 공격해 올 때 패를 울면(후로) 손패 매수가 줄어들어 방어력이 급격히 떨어지므로, <strong>이번 장에서는 패를 울지 않고 13장 멘젠을 온전히 지키며 수비하는 법</strong>을 실습합니다." +
                  "</div>",
            tip: "💡 수비의 대원칙: 상대가 리치했을 때는 아무리 치·퐁 찬스가 와도 절대 패를 울지(후로) 않습니다. 패를 울면 손패가 줄어들어 수비할 안전패가 고갈되기 때문입니다."
        },
        {
            step: 2,
            title: "제 5 장: 수비의 첫걸음 - 후리텐과 안전패 (2단계: 🚨 유혹의 순간 - \"나도 텐파이! 맞불 리치?\")",
            targetTile: ["2m", "5m"],
            targetTileName: "2만 또는 5만 [맞불 리치 / 배째기 타패]",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #ef4444, #b91c1c); border-color:#fca5a5;'>🚨 상가 AI 리치 선언! 하지만 나도 텐파이! ➡️ <strong>[ 2만 ] 또는 [ 5만 ] 타패</strong></div><br>" +
                  "🚨 <strong>상가(왼쪽 AI)가 3통을 버리며 기습 리치를 선언했습니다!</strong><br>" +
                  "상대의 리치패인 3통으로 인해 울기(퐁) 찬스가 왔지만, <strong>수비력을 지키기 위해 울지 않고 [패스]</strong>를 누른 뒤 6삭을 쯔모했습니다.<br>" +
                  "그런데 내 손패를 보니... [ 2만 ] 또는 [ 5만 ] 중 어느 것을 버려도 4삭·7삭을 기다리는 훌륭한 <strong>텐파이</strong> 상태입니다!<br><br>" +
                  "😈 <strong>초보자가 가장 많이 빠지는 유혹:</strong><br>" +
                  "<em>'나도 텐파이니까 쫄지 말고 [ 2만 ]이나 [ 5만 ]을 내고 [리치] 걸어서 맞불을 놓자!'</em><br><br>" +
                  "👉 <strong>[ 2만 ]</strong> 또는 <strong>[ 5만 ]</strong> 중 마음에 드는 패를 당당하게 버려보세요!<br>" +
                  "(리치 선언을 켜고 버려도 좋고, 그냥 버려도 좋습니다.)<br>" +
                  "수비를 무시하고 무작정 공격만 고집하면 어떤 무시무시한 비극이 일어나는지 직접 체험해 봅시다!",
            tip: "💡 상대가 리치했을 때 내 패만 믿고 위험패를 마구 내지르는 것을 '배째기' 또는 '오시(전진)'라고 부릅니다. 또한 이때 울기(후로)를 하면 손패가 줄어들어 방어력이 0이 되므로 절대 울지 않아야 합니다."
        },
        {
            step: 3,
            title: "제 5 장: 수비의 첫걸음 - 후리텐과 안전패 (3단계: 🛡️ 시간 되돌리기 후 - 현물 3통 타패로 완벽 수비)",
            targetTile: "3p",
            targetTileName: "3통 (3p) [100% 현물 안전패 (마와시우치)]",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #0288d1, #0277bd); border-color:#4fc3f7;'>🛡️ 100% 안전패 현물 타패: <strong>[ 3통 (3p) ]</strong></div><br>" +
                  "방금 전 위험패를 버렸다가 상대의 2-5만 양면 대기에 걸려 론(방총)을 맞았습니다!<br>" +
                  "비록 내 패가 텐파이라도, 상대가 먼저 리치를 걸었을 때는 <strong>공격을 한 수 늦추며 버티는 '마와시우치(돌려치기 수비)'</strong>가 최선의 전략입니다.<br><br>" +
                  "🛡️ <strong>후로를 하지 않고 손패를 지켜낸 보상:</strong><br>" +
                  "우리가 앞서 3통을 울지(후로) 않고 손패에 13장을 온전히 남겨두었기 때문에, 손패 안에 상가의 현물 안전패인 <strong>[ 3통(3p) ]</strong>을 쥐고 있을 수 있었습니다!<br><br>" +
                  "🛡️ <strong>100% 안전패 (현물: 現物)의 원리:</strong><br>" +
                  "상가(왼쪽 AI)의 버림패(바닥)를 보세요! 방금 리치 선언패로 버려진 <strong>[ 3통(3p) ]</strong>이 누워 있습니다.<br>" +
                  "마작의 철칙인 <strong>'후리텐(振聴)' 규칙</strong>에 따라, <strong>상대는 자기가 이미 버렸던 패로는 절대 론을 할 수 없습니다!</strong><br><br>" +
                  "👉 손패에서 안전한 <strong>[ 3통(3p) ]</strong>을 찾아 버리세요!<br>" +
                  "상대의 리치 공격을 안전하게 피하며 다음 차례를 지켜볼 수 있습니다.",
            tip: "💡 무작정 공격하는 것보다 한 수 내어주며(패를 돌리면서: 마와시우치) 버티는 것도 훌륭한 방법입니다. 현물을 버리는 것이 수비의 제1원칙입니다."
        },
        {
            step: 4,
            title: "제 5 장: 수비 성공! - 하가 AI의 차례 관전",
            targetTile: null,
            targetTileName: "하가 AI의 차례 지켜보기",
            desc: "<div class='tut-target-pill' style='background:linear-gradient(135deg, #10b981, #059669); border-color:#34d399;'>🛡️ 수비 성공! 하가 AI 차례 관전</div><br>" +
                  "🛡️ <strong>3통 현물 타패로 방총을 완벽하게 회피했습니다!</strong><br><br>" +
                  "좋아요! 무작정 공격하는 것보단 한 수 내어주며(패를 돌리면서: <strong>마와시우치</strong>) 버티는 것도 훌륭한 방법입니다.<br><br>" +
                  "<div class='tut-caution-box' style='background:rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; color:#dbeafe;'>" +
                  "👀 <strong>하가 AI(오른쪽)의 차례를 지켜보세요!</strong><br>" +
                  "내가 버리지 않고 아껴두었던 그 위험패를 하가 AI가 뽑아 버립니다. 과연 어떤 일이 벌어질까요?" +
                  "</div>",
            tip: "💡 상대의 리치에 맞서 현물 수비로 위기를 넘기면, 다른 상대가 대신 쏘여주거나 안전하게 국을 넘길 수 있습니다."
        }
    ];

    // Tutorial stage information data with fixed seed & detailed discard recommendations
    const TUTORIAL_STAGES = [
        {
            stage: 1,
            title: "제 1 장: 기본 손패 구조와 리치(立直) 화료",
            shortTitle: "1장 손패구조와 리치",
            targetTileName: "몸통 3개 ➡️ 타츠 ➡️ 머리 ➡️ [리치 선언]",
            desc: TUTORIAL_STAGE_1_STEPS[0].desc,
            tip: TUTORIAL_STAGE_1_STEPS[0].tip
        },
        {
            stage: 2,
            title: "제 2 장: 리치를 향한 조패 - 기본 배패에서 4몸통 1머리 만들기",
            shortTitle: "2장 조패와 쯔모",
            targetTileName: "북 (4z) ➡️ 1통 ➡️ 9만",
            desc: TUTORIAL_STAGE_2_STEPS[0].desc,
            tip: TUTORIAL_STAGE_2_STEPS[0].tip
        },
        {
            stage: 3,
            title: "제 3 장: 울기(후로 - 치·퐁·깡)와 역패",
            shortTitle: "3장 울기와 역패",
            targetTileName: "1통 ➡️ 퐁 후 9삭 ➡️ [론]",
            desc: TUTORIAL_STAGE_3_STEPS[0].desc,
            tip: TUTORIAL_STAGE_3_STEPS[0].tip
        },
        {
            stage: 4,
            title: "제 4 장: 초보자 최대 함정 ⚠️ - '역 없음' 탈출",
            shortTitle: "4장 역 없음 탈출",
            targetTileName: "1통 ➡️ 9만 ➡️ [론]",
            desc: TUTORIAL_STAGE_4_STEPS[0].desc,
            tip: TUTORIAL_STAGE_4_STEPS[0].tip
        },
        {
            stage: 5,
            title: "제 5 장: 수비의 첫걸음 - 후리텐과 안전패",
            shortTitle: "5장 수비와 후리텐",
            targetTileName: "1순: 동 (1z) ➡️ 2순: 2만/5만 (배째기) ➡️ 3통 (마와시우치)",
            desc: TUTORIAL_STAGE_5_STEPS[0].desc,
            tip: TUTORIAL_STAGE_5_STEPS[0].tip
        },
        {
            stage: 6,
            title: "제 6 장: 실전 모의 대국 (플레이어 화료 특별 룰)",
            shortTitle: "6장 실전 모의 대국",
            targetTileName: "자유 조패 ➡️ 텐파이 ➡️ [리치 / 화료]",
            desc: "실전과 동일한 환경에서 지금까지 배운 모든 기술을 총동원해 자유롭게 대국을 펼쳐보세요!<br>• <strong>특별 연습 룰</strong>: 오직 <strong>플레이어(나)만 화료</strong>할 수 있습니다. (AI의 론/쯔모 차단)<br>• 1장~5장에서 배운 4몸통 1머리 조패, 멘젠 리치, 역패 울기, 탕야오 우회 등을 실전에서 자유롭게 연습해 보세요.",
            tip: "💡 AI에게 쏘일 걱정이 전혀 없습니다! 역(1판 이상)을 갖춘 4몸통 1머리를 완성하여 통쾌한 승리를 맛보세요."
        }
    ];

    function getCurrentTutorialTargetTile() {
        if (!game || !game.tutorialScenario) return null;
        const p0 = game.players[0];
        if (!p0 || !p0.hand) return null;
        const hCodes = p0.hand.map(t => (t.code || t).replace('_aka', ''));

        if (currentTutorialStage === 1) {
            const stepInfo = TUTORIAL_STAGE_1_STEPS[stage1Step];
            return stepInfo ? stepInfo.targetTile : '1z';
        } else if (currentTutorialStage === 2) {
            if (hCodes.includes('4z')) return '4z';
            if (hCodes.includes('1p')) return '1p';
            if (hCodes.includes('9m')) return '9m';
            return null;
        } else if (currentTutorialStage === 3) {
            if (hCodes.includes('1p')) return '1p';
            if (hCodes.includes('9s')) return '9s';
            return null;
        } else if (currentTutorialStage === 4) {
            if (hCodes.includes('1p')) return '1p';
            if (hCodes.includes('9m')) return '9m';
            return null;
        } else if (currentTutorialStage === 5) {
            if (hCodes.includes('1z')) return '1z';
            if (stage5SubStep === 'push') return ['2m', '5m'];
            if (hCodes.includes('3p')) return '3p';
            return null;
        }
        return null;
    }

    function updateTutorialHUD() {
        if (!game || !game.tutorialScenario || !tutorialHud || tutorialHud.style.display === 'none') return;

        // In Stage 2, if player receives a furo reaction chance (e.g. Chi on 6s), guide them to Pass
        if (currentTutorialStage === 2 && pendingPlayerReactions && pendingPlayerReactions.some(r => r.type === 'chi' || r.type === 'pon' || r.type === 'kan')) {
            if (tutHudStageBadge) tutHudStageBadge.textContent = "제 2 장: 울기(후로) 찬스 ➡️ [ 패스 ] 클릭!";
            if (tutHudBody) {
                tutHudBody.innerHTML = 
                    "<div class='tut-target-pill' style='background:linear-gradient(135deg, #0288d1, #0277bd); border-color:#4fc3f7;'>👉 화면 중앙의 <strong>[ 패스 ]</strong> 버튼을 클릭하세요!</div><br>" +
                    "상가(왼쪽 AI)가 버린 6삭으로 인해 내 손패와 연결되어 <strong>[ 치 ]</strong> 버튼이 활성화되었습니다.<br><br>" +
                    "<div class='tut-caution-box' style='background:rgba(3, 169, 244, 0.15); border-left: 4px solid #03a9f4; color:#e1f5fe;'>" +
                    "🚫 <strong>지금은 울기를 쓰지 마세요!</strong><br>" +
                    "제 2 장은 남의 도움 없이 내 힘으로만 손패를 완성하는 <strong>'멘젠(門前) 조패'</strong> 실습입니다.<br>" +
                    "지금 [ 치 ]를 누르면 멘젠이 깨져 1장에서 배웠던 강력한 무기인 <strong>리치</strong>를 걸 수 없게 됩니다.<br><br>" +
                    "상대방의 버림패를 가져와 전광석화처럼 손패를 만드는 <strong>울기(후로 - 치·퐁·깡)</strong> 기술은 바로 다음 <strong>제 3 장</strong>에서 상세하게 알려드리니, 지금은 꼭 <strong>[ 패스 ]</strong> 버튼을 눌러 넘어가 주세요!" +
                    "</div>" +
                    '<div class="tut-tip-box">💡 [ 패스 ]를 누르면 패를 울지 않고 다음 3순목 쯔모(9삭)로 정상 진행됩니다.</div>';
            }
            if (sceneManager && typeof sceneManager.clearTutorialTargetTile === 'function') {
                sceneManager.clearTutorialTargetTile();
            }
            return;
        }

        // In Stage 5, if player receives a furo reaction chance (e.g. Pon on 3p from Kamicha's Riichi discard), guide them to Pass
        if (currentTutorialStage === 5 && pendingPlayerReactions && pendingPlayerReactions.some(r => r.type === 'chi' || r.type === 'pon' || r.type === 'kan')) {
            if (tutHudStageBadge) tutHudStageBadge.textContent = "제 5 장: 울기(후로) 찬스 ➡️ [ 패스 ] 클릭!";
            if (tutHudBody) {
                tutHudBody.innerHTML = 
                    "<div class='tut-target-pill' style='background:linear-gradient(135deg, #0288d1, #0277bd); border-color:#4fc3f7;'>👉 화면 중앙의 <strong>[ 패스 ]</strong> 버튼을 클릭하세요!</div><br>" +
                    "상가(왼쪽 AI)가 리치를 걸며 버린 3통으로 인해 내 손패와 연결되어 <strong>[ 퐁 ]</strong> 버튼이 활성화되었습니다.<br><br>" +
                    "<div class='tut-caution-box' style='background:rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; color:#fee2e2;'>" +
                    "🚫 <strong>상대가 리치했을 때는 절대 울지 마세요! (수비의 대원칙)</strong><br>" +
                    "마작에서 상대가 리치를 선언했을 때 패를 울면(후로), 내 손패가 <strong>13장 ➡️ 10장 ➡️ 7장으로 급격히 줄어듭니다.</strong><br>" +
                    "손패 매수가 줄어들면, 나중에 상대의 론을 피할 <strong>안전패를 내어줄 수 있는 선택지(수비력)가 치명적으로 고갈</strong>됩니다!<br>" +
                    "또한 손패가 공개되어 멘젠이 깨지므로 리치를 걸 수도 없게 됩니다.<br><br>" +
                    "따라서 상대의 리치에 맞설 때는 <strong>패를 울지 않고 손패를 온전히 지키는 것</strong>이 절대적인 수비 철칙입니다.<br>" +
                    "지금은 꼭 <strong>[ 패스 ]</strong> 버튼을 눌러 손패 13장을 멘젠으로 안전하게 보존해 주세요!" +
                    "</div>" +
                    '<div class="tut-tip-box">💡 [ 패스 ]를 누르면 울기를 건너뛰고 나의 2순목 쯔모(6삭) 차례로 정상 진행됩니다.</div>';
            }
            if (sceneManager && typeof sceneManager.clearTutorialTargetTile === 'function') {
                sceneManager.clearTutorialTargetTile();
            }
            return;
        }

        let info = null;
        let targetCode = null;

        if (currentTutorialStage === 1) {
            info = TUTORIAL_STAGE_1_STEPS[stage1Step] || TUTORIAL_STAGE_1_STEPS[0];
            targetCode = info.targetTile;
        } else if (currentTutorialStage === 2) {
            const p0 = game.players[0];
            const hCodes = (p0 && p0.hand) ? p0.hand.map(t => (t.code || t).replace('_aka', '')) : [];

            let stepIndex = 0;
            if (hCodes.includes('4z')) {
                stepIndex = 0;
                targetCode = '4z';
            } else if (hCodes.includes('1p')) {
                stepIndex = 1;
                targetCode = '1p';
            } else if (hCodes.includes('9m')) {
                stepIndex = 2;
                targetCode = '9m';
            } else {
                stepIndex = 3;
                targetCode = null;
            }
            info = TUTORIAL_STAGE_2_STEPS[stepIndex];
        } else if (currentTutorialStage === 3) {
            const p0 = game.players[0];
            const hCodes = (p0 && p0.hand) ? p0.hand.map(t => (t.code || t).replace('_aka', '')) : [];

            let stepIndex = 0;
            if (hCodes.includes('1p')) {
                stepIndex = 0;
                targetCode = '1p';
            } else if (hCodes.includes('9s')) {
                stepIndex = 1;
                targetCode = '9s';
            } else {
                stepIndex = 2;
                targetCode = null;
            }
            info = TUTORIAL_STAGE_3_STEPS[stepIndex];
        } else if (currentTutorialStage === 4) {
            const p0 = game.players[0];
            const hCodes = (p0 && p0.hand) ? p0.hand.map(t => (t.code || t).replace('_aka', '')) : [];

            let stepIndex = 0;
            if (hCodes.includes('1p')) {
                stepIndex = 0;
                targetCode = '1p';
            } else if (hCodes.includes('9m')) {
                stepIndex = 1;
                targetCode = '9m';
            } else {
                stepIndex = 2;
                targetCode = null;
            }
            info = TUTORIAL_STAGE_4_STEPS[stepIndex];
        } else if (currentTutorialStage === 5) {
            const p0 = game.players[0];
            const hCodes = (p0 && p0.hand) ? p0.hand.map(t => (t.code || t).replace('_aka', '')) : [];

            let stepIndex = 0;
            if (hCodes.includes('1z')) {
                stepIndex = 0;
                targetCode = '1z';
            } else if (stage5SubStep === 'push') {
                stepIndex = 1;
                targetCode = ['2m', '5m'];
            } else if (hCodes.includes('3p')) {
                stepIndex = 2;
                targetCode = '3p';
            } else {
                stepIndex = 3;
                targetCode = null;
            }
            info = TUTORIAL_STAGE_5_STEPS[stepIndex];
        } else if (currentTutorialStage === 6) {
            const p0 = game.players[0];
            const isTenpai = p0 && p0.waitingTiles && p0.waitingTiles.length > 0;
            const waitsStr = isTenpai ? p0.waitingTiles.join(', ') : '';
            
            info = {
                title: "제 6 장: 실전 모의 대국 (플레이어 화료 특별 룰)",
                desc: `<div class="tut-step-desc">` +
                      `실전과 동일한 환경에서 AI들과 자유롭게 승부를 펼쳐보세요!<br>` +
                      `• <strong>튜토리얼 특별 룰</strong>: 오직 <strong>플레이어(나)만 화료</strong>할 수 있습니다. (AI의 론/쯔모 전면 차단)<br>` +
                      (isTenpai 
                        ? `• <span style="color: #4ade80; font-weight: 800;">🔥 현재 텐파이 상태입니다!</span> 대기패: <strong>[ ${waitsStr} ]</strong><br>대기패가 나오면 [론]을 누르거나, 직접 뽑으면 [쯔모]로 화료하세요!`
                        : `• 외톨이 자패나 불필요한 패를 정리하며 <strong>4몸통 1머리</strong>를 만들어 텐파이에 도달해 보세요.`) +
                      `</div>`,
                tip: isTenpai 
                    ? "💡 텐파이 상태입니다! 리치를 걸거나 상대의 버림패(론) 혹은 직접 쯔모하여 화료해 보세요."
                    : "💡 AI에게 방총당할 위험이 전혀 없습니다! 우측 상단의 <strong>[ 📖 역 사전 ]</strong>을 참고하여 원하는 역을 마음껏 완성해 보세요."
            };
            targetCode = null;
        } else {
            info = TUTORIAL_STAGES.find(s => s.stage === currentTutorialStage) || TUTORIAL_STAGES[0];
            targetCode = getCurrentTutorialTargetTile();
        }

        if (info) {
            if (tutHudStageBadge) tutHudStageBadge.textContent = info.title;
            if (tutHudBody) {
                tutHudBody.innerHTML = info.desc + '<div class="tut-tip-box">' + info.tip + '</div>';
            }
        }

        // Adjust HUD navigation buttons for Stage 1 sub-steps
        if (currentTutorialStage === 1) {
            if (btnTutPrev) {
                btnTutPrev.style.display = stage1Step > 0 ? 'block' : 'none';
                btnTutPrev.textContent = '◀ 이전 설명';
            }
            if (btnTutNext) {
                btnTutNext.textContent = stage1Step < 5 ? `다음 설명 (${stage1Step + 2}/6) ▶` : '다음 단계 (2장) ▶';
            }
        }

        // 3D visual target lift & emissive glow
        if (sceneManager && typeof sceneManager.setTutorialTargetTile === 'function') {
            if (targetCode && game.currentTurn === 0 && game.state === 'AWAIT_DISCARD') {
                sceneManager.setTutorialTargetTile(targetCode);
            } else {
                sceneManager.clearTutorialTargetTile();
            }
        }
    }

    function showTutorialStage(stageNum) {
        currentTutorialStage = stageNum;
        if (stageNum === 1) stage1Step = 0;
        if (stageNum === 5) stage5SubStep = 'push';
        const info = TUTORIAL_STAGES.find(s => s.stage === stageNum) || TUTORIAL_STAGES[0];

        if (modalModeSelect) modalModeSelect.style.display = 'none';
        if (tutorialHud) {
            isTutorialHudCollapsed = false;
            tutorialHud.classList.remove('collapsed');
            if (btnTutToggle) btnTutToggle.textContent = '접기 ▲';
            if (btnTutPrev) {
                btnTutPrev.style.display = (stageNum === 1 && stage1Step > 0) || stageNum > 1 ? 'block' : 'none';
            }
            if (btnTutNext) {
                if (stageNum === 1) {
                    btnTutNext.textContent = stage1Step < 5 ? `다음 설명 (${stage1Step + 2}/6) ▶` : '다음 단계 (2장) ▶';
                } else {
                    btnTutNext.textContent = stageNum < TUTORIAL_STAGES.length ? `다음 단계 (${stageNum + 1}장) ▶` : '튜토리얼 완료 🎉';
                }
            }
            tutorialHud.style.display = 'block';
        }
        if (currentModeTag) {
            currentModeTag.textContent = `⏱️ 튜토리얼 (${info.shortTitle})`;
        }

        // Initialize game session with FIXED SCENARIO for tutorial practice
        game.config.isHanchan = false;
        game.startTutorialScenario(stageNum);
        if (sceneManager && typeof sceneManager.renderGameState === 'function') {
            sceneManager.renderGameState(game);
        }
        updateTutorialHUD();
    }

    // Timer mode selection pill interaction (Mode Select Modal)
    if (pillTimerUnlimited && pillTimerStandard) {
        const radioUnlimited = pillTimerUnlimited.querySelector('input');
        const radioStandard = pillTimerStandard.querySelector('input');

        pillTimerUnlimited.onclick = () => {
            if (radioUnlimited) radioUnlimited.checked = true;
            pillTimerUnlimited.classList.add('active');
            pillTimerStandard.classList.remove('active');
        };

        pillTimerStandard.onclick = () => {
            if (radioStandard) radioStandard.checked = true;
            pillTimerStandard.classList.add('active');
            pillTimerUnlimited.classList.remove('active');
        };
    }

    // Mode selection and game launch
    function startGameWithMode(isHanchan) {
        if (tutorialHud) tutorialHud.style.display = 'none';
        game.config.isHanchan = isHanchan;

        // Read chosen timer mode (unlimited vs standard)
        const timerRadio = document.querySelector('input[name="main-timer-mode"]:checked');
        const timerMode = timerRadio ? timerRadio.value : 'unlimited';
        game.config.timerMode = timerMode;

        if (currentModeTag) {
            const timeLabel = timerMode === 'standard' ? '5초+30초' : '무제한';
            currentModeTag.textContent = `⏱️ ${isHanchan ? '반장전' : '동풍전'} · ${timeLabel}`;
        }
        if (modalModeSelect) {
            modalModeSelect.style.display = 'none';
        }
        game.startNewGame();
    }

    // Real-time Timer Mode Toggle via top bar (Single-Player Quality-of-Life)
    if (currentModeTag) {
        currentModeTag.onclick = () => {
            if (game.isMultiplayerGuest || (typeof MahjongMultiplayer !== 'undefined' && MahjongMultiplayer.activeGame)) {
                return; // Fixed in multiplayer
            }
            if (game.tutorialScenario) return;
            const newMode = (game.config.timerMode === 'standard') ? 'unlimited' : 'standard';
            game.config.timerMode = newMode;
            const isHanchan = !!game.config.isHanchan;
            const timeLabel = newMode === 'standard' ? '5초+30초' : '무제한';
            currentModeTag.textContent = `⏱️ ${isHanchan ? '반장전' : '동풍전'} · ${timeLabel}`;

            // Sync mode modal pills as well
            const radioUnlimited = pillTimerUnlimited ? pillTimerUnlimited.querySelector('input') : null;
            const radioStandard = pillTimerStandard ? pillTimerStandard.querySelector('input') : null;
            if (newMode === 'standard') {
                if (radioStandard) radioStandard.checked = true;
                if (pillTimerStandard) pillTimerStandard.classList.add('active');
                if (pillTimerUnlimited) pillTimerUnlimited.classList.remove('active');
                if (game.currentTurn === 0 && game.state === 'AWAIT_DISCARD' && !game.players[0].isRiichi) {
                    startTurnTimer('discard');
                }
            } else {
                if (radioUnlimited) radioUnlimited.checked = true;
                if (pillTimerUnlimited) pillTimerUnlimited.classList.add('active');
                if (pillTimerStandard) pillTimerStandard.classList.remove('active');
                stopTurnTimer();
            }
        };
    }

    if (btnSelectTonpuu) {
        btnSelectTonpuu.onclick = () => startGameWithMode(false);
    }
    if (btnSelectHanchan) {
        btnSelectHanchan.onclick = () => startGameWithMode(true);
    }

    // Tutorial tab switching
    if (btnSelectTutorial) {
        btnSelectTutorial.onclick = () => {
            if (viewModeMain) viewModeMain.style.display = 'none';
            if (viewTutorialStages) viewTutorialStages.style.display = 'block';
        };
    }
    if (btnTutorialBack) {
        btnTutorialBack.onclick = () => {
            if (viewTutorialStages) viewTutorialStages.style.display = 'none';
            if (viewModeMain) viewModeMain.style.display = 'block';
        };
    }

    // Tutorial stage cards
    document.querySelectorAll('.tutorial-stage-btn').forEach(btn => {
        btn.onclick = (e) => {
            const stage = parseInt(e.currentTarget.getAttribute('data-stage'), 10) || 1;
            showTutorialStage(stage);
        };
    });

    // Tutorial HUD controls
    if (btnTutExit) {
        btnTutExit.onclick = () => {
            if (tutorialHud) tutorialHud.style.display = 'none';
            if (modalModeSelect) {
                if (viewTutorialStages) viewTutorialStages.style.display = 'block';
                if (viewModeMain) viewModeMain.style.display = 'none';
                modalModeSelect.style.display = 'flex';
            }
        };
    }
    if (btnTutNext) {
        btnTutNext.onclick = () => {
            if (currentTutorialStage === 1 && stage1Step < 5) {
                stage1Step++;
                updateTutorialHUD();
                return;
            }
            if (currentTutorialStage < TUTORIAL_STAGES.length) {
                showTutorialStage(currentTutorialStage + 1);
            } else {
                if (tutorialHud) tutorialHud.style.display = 'none';
                if (modalModeSelect) {
                    if (viewModeMain) viewModeMain.style.display = 'block';
                    if (viewTutorialStages) viewTutorialStages.style.display = 'none';
                    modalModeSelect.style.display = 'flex';
                }
            }
        };
    }
    if (btnTutPrev) {
        btnTutPrev.onclick = () => {
            if (currentTutorialStage === 1 && stage1Step > 0) {
                stage1Step--;
                if (isRiichiSelectMode) {
                    isRiichiSelectMode = false;
                    if (sceneManager && sceneManager.clearRiichiSelectionMode) {
                        sceneManager.clearRiichiSelectionMode();
                    }
                    if (btnCancelAction) btnCancelAction.style.display = 'none';
                    if (btnRiichi) btnRiichi.style.display = 'block';
                }
                updateTutorialHUD();
                return;
            }
            if (currentTutorialStage > 1) {
                showTutorialStage(currentTutorialStage - 1);
            }
        };
    }
    if (btnTutToggle) {
        btnTutToggle.onclick = () => {
            isTutorialHudCollapsed = !isTutorialHudCollapsed;
            if (isTutorialHudCollapsed) {
                tutorialHud.classList.add('collapsed');
                btnTutToggle.textContent = '펼치기 ▼';
            } else {
                tutorialHud.classList.remove('collapsed');
                btnTutToggle.textContent = '접기 ▲';
            }
        };
    }

    // Camera view toggle
    btnFuroToggle.onclick = () => {
        isFuroEnabled = !isFuroEnabled;
        if (isFuroEnabled) {
            btnFuroToggle.textContent = '울기 ON';
            btnFuroToggle.style.backgroundColor = '#4CAF50'; // Green
        } else {
            btnFuroToggle.textContent = '울기 OFF';
            btnFuroToggle.style.backgroundColor = '#f44336'; // Red
            
            // If the action bar is currently showing and NO Ron is available, auto-pass immediately
            if (pendingPlayerReactions && pendingPlayerReactions.length > 0) {
                const ronAction = pendingPlayerReactions.find(r => r.type === 'ron');
                if (!ronAction) {
                    // It's just Chi/Pon/Kan, and we just turned Furo OFF
                    hideAllActions();
                    game.advanceTurn();
                }
            }
        }
    };

    // --- Camera View Presets & Hotkeys ---
    let currentCameraPreset = 0; // 0: Top View (Default), 1: Player View, 2: Hand Close-up View
    const cameraPresets = [
        { name: '탑뷰', apply: () => sceneManager.setTableView(true), btnText: '📷 [1] 탑뷰 (Space)' },
        { name: '플레이어 뷰', apply: () => sceneManager.setPlayerView(true), btnText: '📷 [2] 플레이어 뷰 (Space)' },
        { name: '손패 뷰', apply: () => sceneManager.setHandFocusView(true), btnText: '📷 [3] 손패 뷰 (Space)' }
    ];

    function applyCameraMode(modeIdx) {
        currentCameraPreset = (modeIdx + cameraPresets.length) % cameraPresets.length;
        const preset = cameraPresets[currentCameraPreset];
        preset.apply();
        if (btnToggleCamera) {
            btnToggleCamera.textContent = preset.btnText;
            btnToggleCamera.title = `현재: ${preset.name} (단축키: 1, 2, 3 또는 Space)`;
        }
    }

    if (btnToggleCamera) {
        btnToggleCamera.textContent = '📷 [1] 탑뷰 (Space)';
        btnToggleCamera.title = '단축키: 1 (탑뷰), 2 (플레이어 뷰), 3 (손패 뷰) 또는 Space';
        btnToggleCamera.onclick = () => {
            applyCameraMode(currentCameraPreset + 1);
        };
    }

    // Keyboard Shortcuts (Space, 1, 2, 3)
    window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            applyCameraMode(currentCameraPreset + 1);
        } else if (e.key === '1') {
            e.preventDefault();
            applyCameraMode(0);
        } else if (e.key === '2') {
            e.preventDefault();
            applyCameraMode(1);
        } else if (e.key === '3') {
            e.preventDefault();
            applyCameraMode(2);
        }
    });

    // Start Game: Wait for user mode selection from modal (or fallback if absent)
    if (!modalModeSelect) {
        game.startNewGame();
    }

    // =========================================================================
    // Online Multiplayer Controller & Lobby Wiring
    // =========================================================================
    const btnSelectOnline = document.getElementById('btn-select-online');
    const viewOnlineLobby = document.getElementById('view-online-lobby');
    const btnOnlineBack = document.getElementById('btn-online-back');
    const onlineEntryBox = document.getElementById('online-entry-box');
    const onlineRoomBox = document.getElementById('online-room-box');
    const inputNickname = document.getElementById('input-player-nickname');
    const btnCreateRoom = document.getElementById('btn-create-room');
    const inputRoomCode = document.getElementById('input-room-code');
    const btnJoinRoom = document.getElementById('btn-join-room');
    const onlineStatusMsg = document.getElementById('online-status-msg');
    const lobbyRoomCodeDisplay = document.getElementById('lobby-room-code-display');
    const btnCopyRoomCode = document.getElementById('btn-copy-room-code');
    const lobbySlotsContainer = document.getElementById('lobby-slots-container');
    const lobbyHostControls = document.getElementById('lobby-host-controls');
    const lobbyGuestControls = document.getElementById('lobby-guest-controls');
    const lobbyModeTonpuu = document.getElementById('lobby-mode-tonpuu');
    const lobbyModeHanchan = document.getElementById('lobby-mode-hanchan');
    const btnLobbyStart = document.getElementById('btn-lobby-start');
    const btnLobbyReady = document.getElementById('btn-lobby-ready');
    const btnLobbyLeave = document.getElementById('btn-lobby-leave');

    function renderLobbySlots(slots) {
        if (!lobbySlotsContainer) return;
        lobbySlotsContainer.innerHTML = '';
        const winds = ['동 (東)', '남 (南)', '서 (西)', '북 (北)'];

        for (let i = 0; i < 4; i++) {
            const slot = slots[i] || { seatIdx: i, type: 'ai', name: 'AI', ready: true };
            const card = document.createElement('div');
            card.className = 'slot-card';

            const isMe = (MahjongMultiplayer.isHost && i === 0) || 
                         (!MahjongMultiplayer.isHost && slot.peerId && MahjongMultiplayer.peer && slot.peerId === MahjongMultiplayer.peer.id);
            if (isMe) card.classList.add('is-me');
            if (slot.ready) card.classList.add('is-ready');

            // Wind badge
            const windSpan = document.createElement('span');
            windSpan.className = 'slot-wind-badge';
            windSpan.textContent = winds[i];
            card.appendChild(windSpan);

            // Name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'slot-name';
            nameSpan.textContent = slot.name + (isMe ? ' [나]' : '');
            card.appendChild(nameSpan);

            // Status Badge
            const statusSpan = document.createElement('span');
            statusSpan.className = 'slot-status-badge';
            if (slot.isHost) {
                statusSpan.classList.add('badge-host');
                statusSpan.textContent = '👑 방장';
            } else if (slot.type === 'human') {
                if (slot.ready) {
                    statusSpan.classList.add('badge-ready');
                    statusSpan.textContent = '✅ 준비 완료';
                } else {
                    statusSpan.classList.add('badge-waiting');
                    statusSpan.textContent = '⏳ 대기 중';
                }
            } else {
                statusSpan.classList.add('badge-ai');
                statusSpan.textContent = '🤖 AI 봇 (자동 참가)';
            }
            card.appendChild(statusSpan);

            // Kick button for host (only for human guests)
            if (MahjongMultiplayer.isHost && i !== 0 && slot.type === 'human') {
                const kickBtn = document.createElement('button');
                kickBtn.className = 'slot-btn-kick';
                kickBtn.textContent = '✕ 강퇴';
                kickBtn.onclick = () => MahjongMultiplayer.toggleSlotAI(i);
                card.appendChild(kickBtn);
            }

            lobbySlotsContainer.appendChild(card);
        }

        // Host start button state
        if (MahjongMultiplayer.isHost) {
            const canStart = MahjongMultiplayer.canStartGame();
            if (btnLobbyStart) {
                btnLobbyStart.disabled = !canStart;
                btnLobbyStart.style.opacity = canStart ? '1' : '0.5';
                btnLobbyStart.style.cursor = canStart ? 'pointer' : 'not-allowed';
            }
        } else {
            // Guest ready button appearance
            const mySlot = slots.find(s => s.peerId && MahjongMultiplayer.peer && s.peerId === MahjongMultiplayer.peer.id);
            if (mySlot && btnLobbyReady) {
                if (mySlot.ready) {
                    btnLobbyReady.textContent = '준비 완료 ✅ (취소하려면 클릭)';
                    btnLobbyReady.style.background = '#10b981';
                } else {
                    btnLobbyReady.textContent = '준비 하기 ⏳ (클릭하여 완료)';
                    btnLobbyReady.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                }
            }
        }
    }

    const wsServerStatusBadge = document.getElementById('ws-server-status-badge');
    const btnToggleWsConfig = document.getElementById('btn-toggle-ws-config');
    const wsConfigPanel = document.getElementById('ws-config-panel');
    const inputWsServerUrl = document.getElementById('input-ws-server-url');
    const btnSaveWsUrl = document.getElementById('btn-save-ws-url');
    const btnResetWsUrl = document.getElementById('btn-reset-ws-url');

    function refreshWsServerStatus() {
        if (!wsServerStatusBadge || typeof MahjongMultiplayer === 'undefined' || !MahjongMultiplayer.checkServerStatus) return;
        wsServerStatusBadge.textContent = '⏳ 매칭 서버 확인 중...';
        wsServerStatusBadge.style.color = '#cbd5e1';
        wsServerStatusBadge.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        MahjongMultiplayer.checkServerStatus((res) => {
            if (res.ok) {
                wsServerStatusBadge.textContent = `🟢 WebSocket 서버 연결됨 (${res.latencyMs}ms)`;
                wsServerStatusBadge.title = `연결 주소: ${res.url}`;
                wsServerStatusBadge.style.color = '#4ade80';
                wsServerStatusBadge.style.borderColor = 'rgba(74, 222, 128, 0.45)';
            } else {
                wsServerStatusBadge.textContent = '🔴 매칭 서버 연결 안 됨 (⚙️ 서버 설정 확인)';
                wsServerStatusBadge.title = `대상 주소: ${res.url} (${res.error || ''})`;
                wsServerStatusBadge.style.color = '#f87171';
                wsServerStatusBadge.style.borderColor = 'rgba(248, 113, 113, 0.45)';
            }
        });
    }

    if (btnToggleWsConfig && wsConfigPanel) {
        btnToggleWsConfig.onclick = () => {
            const isHidden = wsConfigPanel.style.display === 'none';
            wsConfigPanel.style.display = isHidden ? 'block' : 'none';
            if (isHidden && inputWsServerUrl) {
                inputWsServerUrl.value = MahjongMultiplayer.customWsUrl || '';
            }
        };
    }

    if (btnSaveWsUrl) {
        btnSaveWsUrl.onclick = () => {
            const val = inputWsServerUrl ? inputWsServerUrl.value.trim() : '';
            MahjongMultiplayer.setCustomWsUrl(val);
            refreshWsServerStatus();
            if (onlineStatusMsg) {
                onlineStatusMsg.textContent = `서버 주소가 설정되었습니다: ${MahjongMultiplayer.getWsUrl()}`;
            }
        };
    }

    if (btnResetWsUrl) {
        btnResetWsUrl.onclick = () => {
            if (inputWsServerUrl) inputWsServerUrl.value = '';
            MahjongMultiplayer.setCustomWsUrl('');
            refreshWsServerStatus();
            if (onlineStatusMsg) {
                onlineStatusMsg.textContent = `기본 매칭 서버 주소(${MahjongMultiplayer.getWsUrl()})로 초기화되었습니다.`;
            }
        };
    }

    if (btnSelectOnline) {
        btnSelectOnline.onclick = () => {
            if (viewModeMain) viewModeMain.style.display = 'none';
            if (viewTutorialStages) viewTutorialStages.style.display = 'none';
            if (viewOnlineLobby) viewOnlineLobby.style.display = 'block';
            if (onlineEntryBox) onlineEntryBox.style.display = 'block';
            if (onlineRoomBox) onlineRoomBox.style.display = 'none';
            if (onlineStatusMsg) onlineStatusMsg.textContent = '';
            refreshWsServerStatus();
        };
    }

    if (btnOnlineBack) {
        btnOnlineBack.onclick = () => {
            MahjongMultiplayer.leaveRoom();
            if (viewOnlineLobby) viewOnlineLobby.style.display = 'none';
            if (viewModeMain) viewModeMain.style.display = 'block';
        };
    }

    if (btnLobbyLeave) {
        btnLobbyLeave.onclick = () => {
            const banner = document.getElementById('lobby-notification-banner');
            if (banner) banner.style.display = 'none';
            MahjongMultiplayer.leaveRoom();
            if (onlineRoomBox) onlineRoomBox.style.display = 'none';
            if (onlineEntryBox) onlineEntryBox.style.display = 'block';
            if (onlineStatusMsg) onlineStatusMsg.textContent = '';
        };
    }

    if (btnCreateRoom) {
        btnCreateRoom.onclick = () => {
            const nick = inputNickname ? (inputNickname.value.trim() || '방장') : '방장';
            if (onlineStatusMsg) onlineStatusMsg.textContent = '방 코드 생성 중...';
            MahjongMultiplayer.createRoom(nick, (code) => {
                const banner = document.getElementById('lobby-notification-banner');
                if (banner) banner.style.display = 'none';
                if (onlineStatusMsg) onlineStatusMsg.textContent = '';
                if (onlineEntryBox) onlineEntryBox.style.display = 'none';
                if (onlineRoomBox) onlineRoomBox.style.display = 'block';
                if (lobbyHostControls) lobbyHostControls.style.display = 'flex';
                if (lobbyGuestControls) lobbyGuestControls.style.display = 'none';
                if (lobbyRoomCodeDisplay) lobbyRoomCodeDisplay.textContent = code;
                renderLobbySlots(MahjongMultiplayer.lobbySlots);
            });
        };
    }

    if (btnJoinRoom) {
        btnJoinRoom.onclick = () => {
            const code = inputRoomCode ? inputRoomCode.value.trim() : '';
            if (!code || code.length !== 4 || isNaN(code)) {
                alert('숫자 4자리 방 코드를 올바르게 입력해주세요.');
                return;
            }
            const nick = inputNickname ? (inputNickname.value.trim() || '참가자') : '참가자';
            if (onlineStatusMsg) onlineStatusMsg.textContent = `방 ${code}에 접속 중...`;
            MahjongMultiplayer.joinRoom(code, nick, (joinedCode) => {
                const banner = document.getElementById('lobby-notification-banner');
                if (banner) banner.style.display = 'none';
                if (onlineStatusMsg) onlineStatusMsg.textContent = '';
                if (onlineEntryBox) onlineEntryBox.style.display = 'none';
                if (onlineRoomBox) onlineRoomBox.style.display = 'block';
                if (lobbyHostControls) lobbyHostControls.style.display = 'none';
                if (lobbyGuestControls) lobbyGuestControls.style.display = 'flex';
                if (lobbyRoomCodeDisplay) lobbyRoomCodeDisplay.textContent = joinedCode;
                renderLobbySlots(MahjongMultiplayer.lobbySlots);
            }, (err) => {
                const errMsg = (err && err.message) ? err.message : '방 접속 실패. 코드를 다시 확인해주세요.';
                if (onlineStatusMsg) onlineStatusMsg.textContent = errMsg;
            });
        };
    }

    if (btnCopyRoomCode) {
        btnCopyRoomCode.onclick = () => {
            const code = lobbyRoomCodeDisplay ? lobbyRoomCodeDisplay.textContent : '';
            if (code && code !== '----') {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        const original = btnCopyRoomCode.textContent;
                        btnCopyRoomCode.textContent = '✅ 복사 완료!';
                        setTimeout(() => { btnCopyRoomCode.textContent = original; }, 1500);
                    }).catch(() => {
                        alert('방 코드: ' + code);
                    });
                } else {
                    alert('방 코드: ' + code);
                }
            }
        };
    }

    if (btnLobbyReady) {
        btnLobbyReady.onclick = () => {
            MahjongMultiplayer.toggleReady();
        };
    }

    // Host Mode: Start Game & Setting Controls
    const lobbyTimerStandard = document.getElementById('lobby-timer-standard');
    const lobbyTimerUnlimited = document.getElementById('lobby-timer-unlimited');

    function onLobbySettingChange() {
        if (!MahjongMultiplayer.isHost) return;
        const isHanchan = lobbyModeHanchan ? lobbyModeHanchan.checked : true;
        const timerMode = (lobbyTimerStandard && lobbyTimerStandard.checked) ? 'standard' : 'unlimited';
        MahjongMultiplayer.isHanchan = isHanchan;
        MahjongMultiplayer.timerMode = timerMode;
        MahjongMultiplayer.broadcastLobbyState();
    }

    if (lobbyModeTonpuu) lobbyModeTonpuu.onchange = onLobbySettingChange;
    if (lobbyModeHanchan) lobbyModeHanchan.onchange = onLobbySettingChange;
    if (lobbyTimerStandard) lobbyTimerStandard.onchange = onLobbySettingChange;
    if (lobbyTimerUnlimited) lobbyTimerUnlimited.onchange = onLobbySettingChange;

    if (btnLobbyStart) {
        btnLobbyStart.onclick = () => {
            if (!MahjongMultiplayer.canStartGame()) return;
            const isHanchan = lobbyModeHanchan ? lobbyModeHanchan.checked : true;
            const timerMode = (lobbyTimerStandard && lobbyTimerStandard.checked) ? 'standard' : 'unlimited';
            game.config.isHanchan = isHanchan;
            game.config.timerMode = timerMode;
            MahjongMultiplayer.isHanchan = isHanchan;
            MahjongMultiplayer.timerMode = timerMode;

            MahjongMultiplayer.setupHostGame(game);
            if (tutorialHud) tutorialHud.style.display = 'none';
            if (modalModeSelect) modalModeSelect.style.display = 'none';
            if (currentModeTag) {
                const timeLabel = timerMode === 'standard' ? '5초+30초' : '무제한';
                currentModeTag.textContent = `🌐 온라인 ${isHanchan ? '반장전' : '동풍전'} · ${timeLabel}`;
            }
            game.startNewGame();
        };
    }

    // Host Lobby State Synchronization
    MahjongMultiplayer.onLobbyUpdate = (data) => {
        if (lobbyRoomCodeDisplay) lobbyRoomCodeDisplay.textContent = data.roomCode;
        if (lobbyModeTonpuu && lobbyModeHanchan) {
            lobbyModeTonpuu.checked = !data.isHanchan;
            lobbyModeHanchan.checked = !!data.isHanchan;
        }
        if (lobbyTimerStandard && lobbyTimerUnlimited) {
            lobbyTimerStandard.checked = (data.timerMode !== 'unlimited');
            lobbyTimerUnlimited.checked = (data.timerMode === 'unlimited');
        }
        const guestModeText = document.getElementById('lobby-guest-mode-text');
        const guestTimerText = document.getElementById('lobby-guest-timer-text');
        if (guestModeText) guestModeText.textContent = data.isHanchan ? '반장전' : '동풍전';
        if (guestTimerText) guestTimerText.textContent = (data.timerMode === 'unlimited') ? '무제한' : '5초+30초 장고';
        renderLobbySlots(data.slots);
    };

    // Guest Mode: Game Start Event
    MahjongMultiplayer.onGameStart = (clientProxy, startMsg) => {
        if (tutorialHud) tutorialHud.style.display = 'none';
        if (modalModeSelect) modalModeSelect.style.display = 'none';

        // Connect client proxy directly to existing event listeners in main.js
        clientProxy.callbacks = game.callbacks;
        game = clientProxy;
        window.game = clientProxy;

        if (currentModeTag) {
            const isHanchan = !!game.config.isHanchan;
            const timerMode = game.config.timerMode;
            const timeLabel = timerMode === 'unlimited' ? '무제한' : '5초+30초';
            currentModeTag.textContent = `🌐 온라인 ${isHanchan ? '반장전' : '동풍전'} · ${timeLabel}`;
        }

        updatePlayerStatusUI();
        sceneManager.renderGameState(game);
    };

    let lobbyNoticeTimer = null;
    function showLobbyNotice(text, level = 'info') {
        const banner = document.getElementById('lobby-notification-banner');
        if (!banner) return;
        banner.textContent = text;
        banner.className = `lobby-notice-banner notice-${level}`;
        banner.style.display = 'block';

        if (lobbyNoticeTimer) clearTimeout(lobbyNoticeTimer);
        lobbyNoticeTimer = setTimeout(() => {
            banner.style.display = 'none';
        }, 4500);
    }

    MahjongMultiplayer.onLobbyNotice = (data) => {
        showLobbyNotice(data.text, data.level || 'info');
    };

    MahjongMultiplayer.onHostLeftLobby = (hostName, reason) => {
        if (onlineRoomBox) onlineRoomBox.style.display = 'none';
        if (onlineEntryBox) onlineEntryBox.style.display = 'block';
        const banner = document.getElementById('lobby-notification-banner');
        if (banner) banner.style.display = 'none';
        if (onlineStatusMsg) {
            const msg = (reason === 'kicked')
                ? '📢 방장에 의해 대기방에서 퇴장되었습니다.'
                : `📢 [${hostName || '방장'}] 님이 퇴장(연결 종료)하여 대기방이 해산되었습니다.`;
            onlineStatusMsg.innerHTML = `<span style="color: #f87171; font-weight: bold;">${msg}</span>`;
        }
    };

    MahjongMultiplayer.onKicked = () => {
        if (onlineRoomBox) onlineRoomBox.style.display = 'none';
        if (onlineEntryBox) onlineEntryBox.style.display = 'block';
        const banner = document.getElementById('lobby-notification-banner');
        if (banner) banner.style.display = 'none';
        if (onlineStatusMsg) {
            onlineStatusMsg.innerHTML = '<span style="color: #ef4444; font-weight: bold;">📢 방장에 의해 대기방에서 퇴장되었습니다.</span>';
        }
    };

    MahjongMultiplayer.onError = (err) => {
        if (onlineStatusMsg) onlineStatusMsg.textContent = '오류 발생: ' + (err.message || err);
    };

    function getPlayerDisplayName(playerId) {
        if (playerId === null || playerId === undefined) return '';
        const seatNames = ['나 (플레이어)', 'AI 하가', 'AI 대면', 'AI 상가'];
        const windsKorean = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' };
        const p = (game && game.players) ? game.players[playerId] : null;
        if (!p) {
            return seatNames[playerId] || `플레이어 ${playerId}`;
        }
        const curWind = (p.wind && windsKorean[p.wind]) ? windsKorean[p.wind] : '';
        const isDealer = (game && game.dealerIdx === playerId);
        const dealerBadge = isDealer ? ' · 오야' : '';
        const windInfo = curWind ? ` (${curWind}${dealerBadge})` : '';
        return `${seatNames[playerId] || p.baseName || '플레이어'}${windInfo}`;
    }

    let bigMsgTimer = null;
    function showBigMessage(playerId, text, durationMs = 2000) {
        const overlay = document.getElementById('big-message-overlay');
        const textEl = document.getElementById('big-message-text');
        if (overlay && textEl) {
            if (text && (text.length > 15 || text.includes('\n'))) {
                textEl.innerHTML = `<div class="big-msg-notice">${text.replace(/\n/g, '<br>')}</div>`;
            } else {
                const callerName = getPlayerDisplayName(playerId);
                textEl.innerHTML = `
                    ${callerName ? `<div class="big-msg-caller">${callerName}</div>` : ''}
                    <div class="big-msg-action">${text}</div>
                `;
            }
            overlay.style.display = 'block';
            textEl.style.animation = 'none';
            textEl.offsetHeight;
            const durSec = (durationMs / 1000).toFixed(1);
            textEl.style.animation = `popInAndOut ${durSec}s ease-in-out forwards`;
            if (bigMsgTimer) clearTimeout(bigMsgTimer);
            bigMsgTimer = setTimeout(() => { overlay.style.display = 'none'; }, durationMs);
        }
    }
    window.showBigMessage = showBigMessage;
    window.getPlayerDisplayName = getPlayerDisplayName;

});

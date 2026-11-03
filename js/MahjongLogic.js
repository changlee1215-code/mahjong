/**
 * MahjongLogic.js
 * Comprehensive Japanese Riichi Mahjong game rules, wall, dealing, turns,
 * tenpai checking, furiten handling, melds (Chi/Pon/Kan), and AI players.
 */

(function (global) {
    const MahjongLogic = {};

    // Generate full standard 136 tiles with exactly 1 Red Five each for 5m, 5p, 5s
    MahjongLogic.createWall = function (useAkaDora = true) {
        const wall = [];
        let idCounter = 1;

        // Suits: m, p, s (1~9)
        const suits = ['m', 'p', 's'];
        for (const s of suits) {
            for (let v = 1; v <= 9; v++) {
                for (let i = 0; i < 4; i++) {
                    // Exactly 1 Red Five each (5m: 1, 5p: 1, 5s: 1)
                    const isAka = useAkaDora && (v === 5 && i === 0);
                    wall.push({
                        id: idCounter++,
                        code: `${v}${s}`,
                        isAka: isAka
                    });
                }
            }
        }

        // Honors: 1z(East)~7z(Chun)
        for (let v = 1; v <= 7; v++) {
            for (let i = 0; i < 4; i++) {
                wall.push({
                    id: idCounter++,
                    code: `${v}z`,
                    isAka: false
                });
            }
        }

        // Fisher-Yates Shuffle
        for (let i = wall.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wall[i], wall[j]] = [wall[j], wall[i]];
        }

        return wall;
    };

    // Build custom wall placing exact ordered codes first, then filling with remaining shuffled tiles
    MahjongLogic.buildCustomWall = function (orderedCodes, useAkaDora = false) {
        const full = [];
        let idCounter = 1;
        const suits = ['m', 'p', 's'];
        for (const s of suits) {
            for (let v = 1; v <= 9; v++) {
                for (let i = 0; i < 4; i++) {
                    const isAka = useAkaDora && (v === 5 && i === 0);
                    full.push({ id: idCounter++, code: `${v}${s}`, isAka: isAka });
                }
            }
        }
        for (let v = 1; v <= 7; v++) {
            for (let i = 0; i < 4; i++) {
                full.push({ id: idCounter++, code: `${v}z`, isAka: false });
            }
        }

        const result = [];
        for (const code of orderedCodes) {
            const idx = full.findIndex(t => t.code === code);
            if (idx !== -1) {
                result.push(full.splice(idx, 1)[0]);
            }
        }

        // Shuffle remaining tiles
        for (let i = full.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [full[i], full[j]] = [full[j], full[i]];
        }

        return result.concat(full);
    };

    // Tutorial Scenario Preset Builder
    MahjongLogic.getTutorialScenarioPreset = function (stageNum) {
        const deadWallDefault = [
            '1p', '2p', '3p', '4p', // Rinshan 4
            '1m', '2m', '3m', '4m', '5m', // Dora indicators (idx 4 = active)
            '1s', '2s', '3s', '4s', '5s'  // Ura dora indicators
        ];

        if (stageNum === 1) {
            // Stage 1: Riichi and Ron Agari (텐파이와 리치 선언, 론 화료의 기초)
            const dead = [
                '1s', '1s', '2s', '2s',
                '1m', '5m', '6m', '7m', '8m', // dead[4] = 1m (dora indicator)
                '2s', '9s', '9s', '8s', '7s'  // dead[9] = 2s (uradora indicator -> 3s becomes uradora)
            ];
            const p0Hand = ['2m', '3m', '4m', '6p', '7p', '8p', '9p', '9p', '3s', '3s', '3s', '5s', '6s'];
            const p1Hand = ['4s', '1m', '1m', '1m', '5m', '6m', '7m', '8m', '9m', '9m', '1p', '2p', '3p'];
            const p2Hand = ['1p', '2p', '3p', '4p', '4p', '5p', '5p', '6p', '7p', '8p', '9s', '8s', '7s'];
            const p3Hand = ['2z', '2z', '3z', '3z', '4z', '4z', '5z', '5z', '6z', '6z', '7z', '7z', '1s'];
            const p0FirstDraw = '1z'; // Isolated honor to discard with Riichi!
            const p1Draw = '9s';

            return {
                stageNum: 1,
                wallPreset: [...dead, ...p0Hand, ...p1Hand, ...p2Hand, ...p3Hand, p0FirstDraw, p1Draw],
                recommendedDiscard: '1z',
                forcedDiscards: { 1: '4s' } // P1 discards 4s for Player's Ron!
            };
        } else if (stageNum === 2) {
            // Stage 2: 리치를 향한 조패 - 기본 배패에서 4몸통 1머리 완성하기 (쯔모 화료)
            const dead = [
                '1p', '2p', '3p', '4p',
                '9p', '2m', '3m', '4m', '5m',
                '1s', '2s', '3s', '4s', '5s'
            ];
            // Initial deal (13 tiles): 123m (슌츠 1), 5z5z (머리), 45p (타츠 1), 78s (타츠 2), 45s (타츠 3), 4z (고립 자패), 1p (고립 수패)
            const p0Hand = ['1m', '2m', '3m', '4p', '5p', '7s', '8s', '4s', '5s', '5z', '5z', '4z', '1p'];
            const p1Hand = ['1z', '1z', '2z', '2z', '3z', '3z', '6z', '6z', '7z', '7z', '6m', '7m', '8m'];
            const p2Hand = ['6m', '7m', '8m', '2p', '2p', '3p', '3p', '7p', '8p', '9p', '7p', '8p', '9p'];
            const p3Hand = ['1z', '2z', '3z', '4z', '4z', '1s', '1s', '2s', '2s', '6s', '6s', '6s', '8m'];

            const p0Draw1 = '9m'; // 14th tile on opening (고립 9만)
            const p1Draw1 = '1z';
            const p2Draw1 = '7p';
            const p3Draw1 = '6s';

            const p0Draw2 = '6p'; // Turn 2 draw (completes 456p)
            const p1Draw2 = '2z';
            const p2Draw2 = '8p';
            const p3Draw2 = '4z';

            const p0Draw3 = '9s'; // Turn 3 draw (completes 789s -> Tenpai)
            const p1Draw3 = '3z';
            const p2Draw3 = '9p';
            const p3Draw3 = '6m';

            const p0Draw4 = '3s'; // Turn 4 draw (completes 345s -> Tsumo!)

            return {
                stageNum: 2,
                wallPreset: [
                    ...dead,
                    ...p0Hand, ...p1Hand, ...p2Hand, ...p3Hand,
                    p0Draw1,
                    p1Draw1, p2Draw1, p3Draw1,
                    p0Draw2,
                    p1Draw2, p2Draw2, p3Draw2,
                    p0Draw3,
                    p1Draw3, p2Draw3, p3Draw3,
                    p0Draw4
                ],
                recommendedDiscard: '4z'
            };
        } else if (stageNum === 3) {
            // Stage 3: Furo (Pon) & Yakuhai with Kuikae rule & Ron completion
            const dead = [...deadWallDefault];
            dead[4] = '8p'; // dora indicator 8p -> 9p dora
            const p0Hand = ['7z', '7z', '2m', '3m', '4m', '5p', '6p', '7p', '4s', '5s', '8s', '8s', '9s'];
            const p1Hand = ['7z', '1z', '1z', '2z', '2z', '3z', '3z', '4z', '4z', '5z', '5z', '6z', '6z'];
            const p2Hand = ['3s', '1m', '2m', '4m', '5m', '7m', '8m', '1p', '2p', '4p', '5p', '7p', '8p'];
            const p3Hand = ['1s', '2s', '4s', '5s', '7s', '8s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];

            const p0FirstDraw = '1p'; // Player discards 1p
            const p1Draw1 = '1z';     // AI 1 discards 7z for Player to Pon
            const p1Draw2 = '2z';     // AI 1 discards safe honor after Pon
            const p2Draw = '2m';      // AI 2 discards 3s for Player's Ron!

            return {
                stageNum: 3,
                wallPreset: [
                    ...dead,
                    ...p0Hand, ...p1Hand, ...p2Hand, ...p3Hand,
                    p0FirstDraw, p1Draw1,
                    p1Draw2, p2Draw
                ],
                recommendedDiscard: '1p',
                postPonDiscard: '9s',
                forcedDiscards: { 1: '7z', 2: '3s' } // P1 discards 7z for Pon, P2 discards 3s for Ron!
            };
        } else if (stageNum === 4) {
            // Stage 4: Escape "No Yaku" (역 없음) Trap with Tanyao (후로 상태에서 탕야오 우회 조패)
            const dead = [
                '1z', '1z', '2z', '2z',
                '1m', '2m', '3m', '4m', '5m', // dead[4] = 1m (dora indicator -> 2m dora)
                '3z', '3z', '4z', '4z', '5z'
            ];
            // Pre-formed melds for Player 0 (2 Chis: 234m and 678s, called from Kamicha P3)
            const setupMeldsP0 = [
                {
                    type: 'chi',
                    tile: '2m',
                    tiles: [{ code: '2m', isAka: false }, { code: '3m', isAka: false }, { code: '4m', isAka: false }],
                    fromPlayer: 3
                },
                {
                    type: 'chi',
                    tile: '6s',
                    tiles: [{ code: '6s', isAka: false }, { code: '7s', isAka: false }, { code: '8s', isAka: false }],
                    fromPlayer: 3
                }
            ];
            // 7 dealt hand tiles for Player 0 (7 + 6 melded = 13 tiles before opening draw)
            const p0Hand = ['4p', '5p', '3s', '3s', '7m', '8m', '9m'];
            const p1Hand = ['1m', '2m', '4m', '5m', '8m', '9m', '2p', '4p', '7p', '8p', '9p', '1s', '9s'];
            const p2Hand = ['1m', '3m', '5m', '6m', '8m', '1p', '2p', '7p', '8p', '2s', '4s', '5s', '9s'];
            const p3Hand = ['1m', '2m', '3m', '5m', '7m', '1p', '3p', '7p', '9p', '1s', '2s', '4s', '5s'];

            const p0Draw1 = '1p'; // Opening 8th tile: isolated terminal 1p to discard
            const p1Draw1 = '3p'; // AI 1 discards 3p (player waiting on 3p, but NO YAKU -> cannot Ron!)
            const p2Draw1 = '5z'; // Safe honor
            const p3Draw1 = '6z'; // Safe honor

            const p0Draw2 = '6m'; // Turn 2: Player draws 6m, connects to 678m, discards 9m to complete Tanyao!
            const p1Draw2 = '6p'; // Turn 2: AI 1 discards 6p -> Player Ron with Tanyao!

            return {
                stageNum: 4,
                setupMeldsP0: setupMeldsP0,
                wallPreset: [
                    ...dead,
                    ...p0Hand, ...p1Hand, ...p2Hand, ...p3Hand,
                    p0Draw1, p1Draw1, p2Draw1, p3Draw1,
                    p0Draw2, p1Draw2
                ],
                recommendedDiscard: '1p',
                detourDiscard: '9m',
                forcedDiscards: {
                    1: ['3p', '6p'],
                    2: ['5z'],
                    3: ['6z']
                }
            };
        } else if (stageNum === 5) {
            // Stage 5: Defense & Furiten (Safe Genbutsu Discard & Push Deal-in Lesson)
            // 1순: 모두 평범하게 1장씩 버림 (P2 3z -> P3 9m -> P0 1z -> P1 2z)
            // 2순: P2 4z -> P3가 3통을 버리며 리치 선언! (2-5만 양면 대기, 탕야오+핑후+도라1+일발 = 5판 만관!)
            //      P0는 나도 텐파이라며 2만/5만을 버려 리치를 걸었다가 P3에게 론(방총)을 당해 만관(8,000점) 실점!
            //      시간 되돌리기(Rewind) 후, 상가의 현물인 3통을 버려 안전하게 방총 회피 성공!
            //      이후 하가 AI(P1)가 5만을 버려 P3에게 대신 8,000점 방총!
            const dead = [
                '7z', '7z', '5z', '5z',
                '7s', '4m', '5m', '6m', '7m', // dead[4] = 7s (dora indicator -> 8s dora, P3 holds 8s)
                '8s', '8s', '9s', '9s', '6z'
            ];
            const p0Hand = ['1z', '2m', '3m', '4m', '6p', '7p', '8p', '7s', '8s', '9s', '3p', '3p', '5s'];
            const p1Hand = ['1p', '2p', '4p', '5p', '6p', '7p', '8p', '9p', '1s', '2s', '3s', '4s', '4z'];
            const p2Hand = ['1p', '2p', '4p', '5p', '6p', '7p', '8p', '9p', '1s', '2s', '3s', '4s', '4z'];
            const p3Hand = ['3m', '4m', '6m', '7m', '8m', '2p', '3p', '4p', '6s', '7s', '8s', '3s', '3s'];

            // Live wall draws in turn order (Dealer P2 starts):
            const p2Draw1 = '3z'; // Turn 0: Dealer P2 opening 14th tile, discards 3z
            const p3Draw1 = '9m'; // Turn 1: P3 draws 9m, discards isolated 9m
            const p0Draw1 = '5m'; // Turn 2: P0 draws 5m, discards isolated 1z (평범한 1순 타패)
            const p1Draw1 = '2z'; // Turn 3: P1 draws and discards 2z
            const p2Draw2 = '4z'; // Turn 4: P2 draws and discards 4z
            const p3Draw2 = '3p'; // Turn 5: P3 draws 3p, declares Riichi with 3p (waiting on 2-5m)!
            const p0Draw2 = '6s'; // Turn 6: P0 draws 6s -> Tenpai! (Can push Riichi with 2m or 5m)
            const p1Draw2 = '5m'; // Turn 7: P1 draws 5m (the exact dangerous tile P0 avoided!)

            return {
                stageNum: 5,
                dealerIdx: 2,
                wallPreset: [
                    ...dead,
                    ...p0Hand, ...p1Hand, ...p2Hand, ...p3Hand,
                    p2Draw1, p3Draw1, p0Draw1, p1Draw1,
                    p2Draw2, p3Draw2, p0Draw2, p1Draw2
                ],
                recommendedDiscard: '1z',
                pushDiscard: ['2m', '5m'],
                defenseDiscard: '3p',
                forcedDiscards: {
                    1: ['2z', '5m'],
                    2: ['3z', '4z'],
                    3: ['9m', { tile: '3p', isRiichi: true }]
                }
            };
        } else if (stageNum === 6) {
            // Stage 6: Practical Game Simulation with Player-Only Win Rule (실전 모의 대국)
            // Real match conditions, AI plays and discards dynamically with Aka Dora.
            // Special tutorial rule: only Player 0 can declare win (playerOnlyWin: true)
            return {
                stageNum: 6,
                playerOnlyWin: true,
                allowAIFuro: true
            };
        }
        return null;
    };

    // Helper: Sort hand tiles
    MahjongLogic.sortTiles = function (tiles) {
        const suitOrder = { 'm': 0, 'p': 1, 's': 2, 'z': 3 };
        return [...tiles].sort((a, b) => {
            const codeA = a.code || a;
            const codeB = b.code || b;
            const suitA = codeA.slice(-1);
            const suitB = codeB.slice(-1);
            if (suitOrder[suitA] !== suitOrder[suitB]) {
                return suitOrder[suitA] - suitOrder[suitB];
            }
            const valA = parseInt(codeA[0], 10);
            const valB = parseInt(codeB[0], 10);
            if (valA !== valB) return valA - valB;
            // Place red fives nicely
            return (a.isAka ? 1 : 0) - (b.isAka ? 1 : 0);
        });
    };

    // Helper: Check if a tile is Terminal (1/9) or Honor (Z)
    MahjongLogic.isTerminalOrHonor = function (tileCode) {
        if (!tileCode) return false;
        const base = (tileCode.code || tileCode).replace('_aka', '');
        const val = parseInt(base[0], 10);
        const suit = base.slice(-1);
        if (suit === 'z') return true;
        if (val === 1 || val === 9) return true;
        return false;
    };

    // Calculate Shanten (distance to tenpai)
    // 0 = Tenpai, -1 = Agari (Win)
    MahjongLogic.calculateShanten = function (tileCodes13Or14, meldsCount = 0) {
        const counts = {};
        for (let c of tileCodes13Or14) {
            c = c.replace('_aka', '');
            counts[c] = (counts[c] || 0) + 1;
        }

        let minShanten = 8; // Max standard shanten

        if (meldsCount === 0) {
            // 1. Chiitoitsu Shanten
            let pairs = 0;
            let kinds = 0;
            for (const c in counts) {
                kinds++;
                if (counts[c] >= 2) pairs++;
            }
            const chiiShanten = 6 - pairs + Math.max(0, 7 - kinds);
            minShanten = Math.min(minShanten, chiiShanten);

            // 2. Kokushi Musou Shanten
            const kokushiTiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];
            let kokushiKinds = 0;
            let hasKokushiPair = false;
            for (const kt of kokushiTiles) {
                const cnt = counts[kt] || 0;
                if (cnt > 0) kokushiKinds++;
                if (cnt >= 2) hasKokushiPair = true;
            }
            const kokushiShanten = 13 - kokushiKinds - (hasKokushiPair ? 1 : 0);
            minShanten = Math.min(minShanten, kokushiShanten);
        }

        // 3. Standard Hand Shanten (Recursive backtrack)
        const unique = Object.keys(counts).sort();

        function searchStandard(cMap, sets, partialSets, pairs, idx) {
            if (idx >= unique.length) {
                // If more than required sets+partials, prune
                let usablePartial = partialSets;
                const requiredSets = 4 - meldsCount;
                if (sets + usablePartial > requiredSets) {
                    usablePartial = requiredSets - sets;
                }
                const shanten = 8 - ((sets + meldsCount) * 2) - usablePartial - pairs;
                if (shanten < minShanten) {
                    minShanten = shanten;
                }
                return;
            }

            const t = unique[idx];
            const cnt = cMap[t] || 0;

            if (cnt === 0) {
                searchStandard(cMap, sets, partialSets, pairs, idx + 1);
                return;
            }

            // Option 1: Treat as Koutsu (Triplet)
            if (cnt >= 3) {
                cMap[t] -= 3;
                searchStandard(cMap, sets + 1, partialSets, pairs, idx);
                cMap[t] += 3;
            }

            // Option 2: Treat as Pair (Atama)
            if (cnt >= 2 && pairs === 0) {
                cMap[t] -= 2;
                searchStandard(cMap, sets, partialSets, 1, idx);
                cMap[t] += 2;
            }

            // Option 3: Treat as Partial Pair (Taatsu: pair)
            if (cnt >= 2 && pairs > 0 && sets + partialSets < 4) {
                cMap[t] -= 2;
                searchStandard(cMap, sets, partialSets + 1, pairs, idx);
                cMap[t] += 2;
            }

            // Option 4: Treat as Shuntsu (Sequence)
            const type = t.slice(-1);
            const val = parseInt(t[0], 10);
            if (type !== 'z' && val <= 7) {
                const t2 = `${val + 1}${type}`;
                const t3 = `${val + 2}${type}`;
                if ((cMap[t2] || 0) > 0 && (cMap[t3] || 0) > 0) {
                    cMap[t]--;
                    cMap[t2]--;
                    cMap[t3]--;
                    searchStandard(cMap, sets + 1, partialSets, pairs, idx);
                    cMap[t]++;
                    cMap[t2]++;
                    cMap[t3]++;
                }
            }

            // Option 5: Treat as Partial Shuntsu (Taatsu: ryanmen/kanchan)
            if (type !== 'z' && sets + partialSets < 4) {
                // Adjacent (val, val+1)
                if (val <= 8) {
                    const t2 = `${val + 1}${type}`;
                    if ((cMap[t2] || 0) > 0) {
                        cMap[t]--;
                        cMap[t2]--;
                        searchStandard(cMap, sets, partialSets + 1, pairs, idx);
                        cMap[t]++;
                        cMap[t2]++;
                    }
                }
                // Split (val, val+2)
                if (val <= 7) {
                    const t3 = `${val + 2}${type}`;
                    if ((cMap[t3] || 0) > 0) {
                        cMap[t]--;
                        cMap[t3]--;
                        searchStandard(cMap, sets, partialSets + 1, pairs, idx);
                        cMap[t]++;
                        cMap[t3]++;
                    }
                }
            }

            // Option 6: Skip/isolate this tile
            searchStandard(cMap, sets, partialSets, pairs, idx + 1);
        }

        searchStandard({ ...counts }, 0, 0, 0, 0);
        return minShanten;
    };

    // Find all tiles that would complete a 13-tile hand into a winning hand (Wait tiles)
    MahjongLogic.getWaitingTiles = function (handTiles13, melds = []) {
        const allPossibleTiles = [];
        for (const s of ['m', 'p', 's']) {
            for (let v = 1; v <= 9; v++) allPossibleTiles.push(`${v}${s}`);
        }
        for (let v = 1; v <= 7; v++) allPossibleTiles.push(`${v}z`);

        const waiting = [];
        const baseCodes = handTiles13.map(t => (t.code || t).replace('_aka', ''));

        for (const candidate of allPossibleTiles) {
            // Check if candidate would complete hand to 0 shanten (agari)
            const test14 = [...baseCodes, candidate];
            const shanten = MahjongLogic.calculateShanten(test14, melds.length);
            if (shanten === -1) {
                waiting.push(candidate);
            }
        }

        return waiting;
    };

    // Find which tiles in 14-tile hand can be discarded to reach Tenpai
    MahjongLogic.getTenpaiDiscards = function (handTiles14, melds = []) {
        const candidates = [];
        const codes = handTiles14.map(t => (t.code || t).replace('_aka', ''));

        for (let i = 0; i < handTiles14.length; i++) {
            const discarded = handTiles14[i];
            const remaining = [...codes];
            remaining.splice(i, 1);

            const shanten = MahjongLogic.calculateShanten(remaining, melds.length);
            if (shanten === 0) {
                // It is Tenpai after this discard!
                const waits = MahjongLogic.getWaitingTiles(remaining, melds);
                candidates.push({
                    discardIndex: i,
                    tile: discarded,
                    waitingTiles: waits
                });
            }
        }

        return candidates;
    };

    // Check if player is Furiten
    MahjongLogic.checkFuriten = function (player) {
        if (!player.waitingTiles || player.waitingTiles.length === 0) {
            return false;
        }

        // 1. Discard river furiten: Did player discard any of their wait tiles?
        // Check both visible discards and called discards (all historical discards)
        const discardsSource = (player.allDiscards && player.allDiscards.length > 0) ? player.allDiscards : player.discards;
        const riverCodes = discardsSource.map(d => (d.code || d.tile?.code || d.tile || d).replace('_aka', ''));
        for (const wait of player.waitingTiles) {
            if (riverCodes.includes(wait.replace('_aka', ''))) {
                return true;
            }
        }

        // 2. Same-turn or riichi furiten flag
        if (player.isDoujunFuriten || player.isRiichiFuriten) {
            return true;
        }

        return false;
    };

    // Calculate Kuikae (喰い替え) forbidden discards for Pon and Chi
    MahjongLogic.getKuikaeForbiddenDiscards = function (tile, chiPair) {
        const tileCode = typeof tile === 'object' && tile !== null ? (tile.code || '') : (tile || '');
        const rawCode = tileCode.replace('_aka', '');
        if (!rawCode || rawCode.length < 2) return [];
        const val = parseInt(rawCode[0], 10);
        const suit = rawCode[1];
        if (isNaN(val) || suit === 'z') return [rawCode];

        const forbidden = [rawCode];
        if (chiPair && chiPair.length === 2) {
            const p1Code = typeof chiPair[0] === 'object' && chiPair[0] !== null ? (chiPair[0].code || '') : chiPair[0];
            const p2Code = typeof chiPair[1] === 'object' && chiPair[1] !== null ? (chiPair[1].code || '') : chiPair[1];
            const p1Val = parseInt(p1Code.replace('_aka', '')[0], 10);
            const p2Val = parseInt(p2Code.replace('_aka', '')[0], 10);
            if (!isNaN(p1Val) && !isNaN(p2Val)) {
                const vals = [val, p1Val, p2Val].sort((a, b) => a - b);
                const minVal = vals[0];
                const maxVal = vals[2];

                if (val === maxVal && minVal - 1 >= 1) {
                    forbidden.push(`${minVal - 1}${suit}`);
                } else if (val === minVal && maxVal + 1 <= 9) {
                    forbidden.push(`${maxVal + 1}${suit}`);
                }
            }
        }
        return forbidden;
    };

    // Game State Class
    class MahjongGame {
        constructor(config = {}) {
            this.config = {
                startingPoints: 25000,
                returnPoints: 30000,
                isHanchan: false, // Default Tonpuusen (East only)
                useAkaDora: true,
                timerMode: 'unlimited', // 'unlimited' or 'standard' (5s + 30s bank)
                ...config
            };

            this.players = [
                { id: 0, name: '플레이어 (동 · 오야)', baseName: '플레이어', isAI: false, points: this.config.startingPoints, wind: '1z', seatWind: '1z', hand: [], melds: [], discards: [], bankTimeMs: 30000 },
                { id: 1, name: 'AI 하가 (남)', baseName: 'AI 하가', isAI: true, points: this.config.startingPoints, wind: '2z', seatWind: '2z', hand: [], melds: [], discards: [], bankTimeMs: 30000 },
                { id: 2, name: 'AI 대면 (서)', baseName: 'AI 대면', isAI: true, points: this.config.startingPoints, wind: '3z', seatWind: '3z', hand: [], melds: [], discards: [], bankTimeMs: 30000 },
                { id: 3, name: 'AI 상가 (북)', baseName: 'AI 상가', isAI: true, points: this.config.startingPoints, wind: '4z', seatWind: '4z', hand: [], melds: [], discards: [], bankTimeMs: 30000 }
            ];

            this.roundWind = '1z'; // 1z: East, 2z: South
            this.roundNum = 1;     // 1 to 4
            this.honba = 0;        // Repeat counter
            this.riichiSticks = 0; // 1000pt sticks on table
            this.dealerIdx = 0;    // 0: Player, 1: AI 1, etc.
            this.currentTurn = 0;  // 0~3
            this.state = 'IDLE';   // IDLE, AWAIT_DISCARD, AWAIT_REACTION, ROUND_OVER, GAME_OVER

            this.wall = [];
            this.deadWall = [];
            this.rinshanTiles = [];
            this.doraIndicatorTiles = [];
            this.uraDoraIndicatorTiles = [];
            this.drawnRinshanCount = 0;
            this.doraIndicators = [];
            this.uraDoraIndicators = [];
            this.lastDiscard = null; // { playerId, tile, isRiichi }
            this.turnCount = 0;
            this.lastWinnerIdx = null;
            this.lastWinWasRiichi = false;
            this.callbacks = {};
        }

        on(event, handler) {
            if (!this.callbacks[event]) {
                this.callbacks[event] = [];
            } else if (typeof this.callbacks[event] === 'function') {
                this.callbacks[event] = [this.callbacks[event]];
            }
            this.callbacks[event].push(handler);
        }

        emit(event, data) {
            const cb = this.callbacks[event];
            if (Array.isArray(cb)) {
                for (const fn of cb) {
                    try {
                        fn(data);
                    } catch (e) {
                        console.error('[MahjongGame Event Error]', event, e);
                    }
                }
            } else if (typeof cb === 'function') {
                cb(data);
            }
        }

        // Start a brand new game
        startNewGame() {
            this.tutorialScenario = null;
            this.roundWind = '1z';
            this.roundNum = 1;
            this.honba = 0;
            this.riichiSticks = 0;
            this.dealerIdx = 0;
            for (const p of this.players) {
                p.points = this.config.startingPoints;
            }
            this.startRound();
        }

        // Start Tutorial Scenario with fixed seed & hands
        startTutorialScenario(stageNum) {
            this.tutorialScenario = MahjongLogic.getTutorialScenarioPreset(stageNum);
            this.roundWind = '1z';
            this.roundNum = 1;
            this.honba = 0;
            this.riichiSticks = 0;
            this.dealerIdx = (this.tutorialScenario && this.tutorialScenario.dealerIdx !== undefined) ? this.tutorialScenario.dealerIdx : 0;
            for (const p of this.players) {
                p.points = this.config.startingPoints;
            }
            this.startRound();
        }

        // Stage 5 Tutorial: Rewind state after experiencing deal-in (시간 되돌리기 ⏪)
        rewindStage5ToDefense() {
            const p0 = this.players[0];
            const p3 = this.players[3];

            // 1. Reset points: P0 restored to starting points, P3 paid 1000 for Riichi
            this.dealerIdx = 2;
            this.roundNum = 1;
            this.roundWind = '1z';
            p0.points = this.config.startingPoints;
            p3.points = this.config.startingPoints - 1000;
            for (let i = 1; i <= 2; i++) {
                this.players[i].points = this.config.startingPoints;
            }
            this.riichiSticks = 1;

            // 2. Clear P0 Riichi status
            p0.isRiichi = false;
            p0.isDoubleRiichi = false;
            p0.isIppatsu = false;
            p0.needsRiichiMarker = false;
            p0.waitingTiles = [];
            p0.riichiWaitingTiles = [];

            // 3. Remove 2m or 5m from P0 discards and restore to hand
            let restoredCode = '5m';
            if (p0.discards.length > 1) {
                const popped = p0.discards.pop();
                restoredCode = (popped && popped.tile ? (popped.tile.code || popped.tile) : '5m').replace('_aka', '');
            }
            if (p0.allDiscards && p0.allDiscards.length > 1) {
                p0.allDiscards.pop();
            }
            const hasRestored = p0.hand.some(t => (t.code || t).replace('_aka', '') === restoredCode);
            if (!hasRestored) {
                p0.hand.push({ id: 995, code: restoredCode, isAka: false });
                p0.hand = MahjongLogic.sortTiles(p0.hand);
            }

            // 4. Ensure P3 remains in Riichi with 2-5m wait
            p3.isRiichi = true;
            p3.waitingTiles = ['2m', '5m'];

            // 5. Reset game turn state to P0
            this.state = 'AWAIT_DISCARD';
            this.currentTurn = 0;
            this.isWinPending = false;
            this.lastWinnerIdx = null;
            this.lastWinWasRiichi = false;
            this.lastDiscard = { playerId: 3, tile: { code: '3p' }, isRiichi: true };
            this.updatePlayerTenpai(p0);

            this.emit('turnStart', {
                playerId: 0,
                drawnTile: { code: '6s' }
            });
        }

        // Start a new hand (Round)
        startRound() {
            this.turnCount = 0;
            this.lastDiscard = null;
            this.state = 'AWAIT_DISCARD';
            this.isWinPending = false;

            // Wind assignments based on dealer
            const winds = ['1z', '2z', '3z', '4z'];
            const windKorean = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' };
            const baseNames = ['플레이어', 'AI 하가', 'AI 대면', 'AI 상가'];
            for (let i = 0; i < 4; i++) {
                const pIdx = (this.dealerIdx + i) % 4;
                const wind = winds[i];
                this.players[pIdx].wind = wind;
                this.players[pIdx].seatWind = wind;
                const baseName = this.players[pIdx].customName || baseNames[pIdx];
                this.players[pIdx].baseName = baseName;
                const isDealer = (pIdx === this.dealerIdx);
                const dealerTag = isDealer ? ' · 오야' : '';
                this.players[pIdx].name = `${baseName} (${windKorean[wind]}${dealerTag})`;
                this.players[pIdx].hand = [];
                this.players[pIdx].melds = [];
                this.players[pIdx].discards = [];
                this.players[pIdx].allDiscards = [];
                this.players[pIdx].bankTimeMs = 30000;
                this.players[pIdx].isRiichi = false;
                this.players[pIdx].isDoubleRiichi = false;
                this.players[pIdx].isIppatsu = false;
                this.players[pIdx].isDoujunFuriten = false;
                this.players[pIdx].isRiichiFuriten = false;
                this.players[pIdx].needsRiichiMarker = false;
                this.players[pIdx].waitingTiles = [];
                this.players[pIdx].tenpaiDiscards = [];
                this.players[pIdx].riichiWaitingTiles = [];
                this.players[pIdx].hadDiscardCalled = false;
                this.players[pIdx].damatenReason = null;
                this.players[pIdx].damatenTurn = null;
                this.players[pIdx].prevWaitCount = 0;
            }

            // Create wall and dead wall (respecting useAkaDora config or tutorial scenario)
            let fullWall;
            if (this.tutorialScenario && this.tutorialScenario.wallPreset) {
                fullWall = MahjongLogic.buildCustomWall(this.tutorialScenario.wallPreset, false);
            } else {
                fullWall = MahjongLogic.createWall(this.config.useAkaDora !== false);
            }
            // 14 Dead Wall tiles (왕패):
            // 0..3: 4 Rinshan tiles (영상패)
            // 4..8: 5 Dora indicators (도라표시패)
            // 9..13: 5 Ura Dora indicators (뒷도라표시패)
            this.deadWall = fullWall.slice(0, 14);
            this.wall = fullWall.slice(14);
            this.rinshanTiles = fullWall.slice(0, 4);
            this.doraIndicatorTiles = fullWall.slice(4, 9);
            this.uraDoraIndicatorTiles = fullWall.slice(9, 14);
            this.drawnRinshanCount = 0;

            this.activeDoraCount = 1;
            this.doraIndicators = [this.doraIndicatorTiles[0].code];
            this.uraDoraIndicators = [this.uraDoraIndicatorTiles[0].code];
            this.lastWinnerIdx = null;
            this.lastWinWasRiichi = false;

            // Deal 13 tiles to each (or fewer if pre-formed melds are defined in tutorial)
            for (let i = 0; i < 4; i++) {
                const preMelds = (i === 0 && this.tutorialScenario && this.tutorialScenario.setupMeldsP0)
                    ? this.tutorialScenario.setupMeldsP0
                    : (this.tutorialScenario && this.tutorialScenario.setupMelds && this.tutorialScenario.setupMelds[i]) || [];
                const handCount = 13 - preMelds.length * 3;
                this.players[i].hand = this.wall.splice(0, handCount);
                this.players[i].hand = MahjongLogic.sortTiles(this.players[i].hand);
                if (preMelds.length > 0) {
                    this.players[i].melds = JSON.parse(JSON.stringify(preMelds));
                }
            }

            // Dealer draws 14th tile
            this.currentTurn = this.dealerIdx;
            const dealer = this.players[this.dealerIdx];
            const drawnTile = this.wall.shift();
            dealer.hand.push(drawnTile);

            this.updatePlayerTenpai(dealer);

            this.emit('roundStart', {
                roundWind: this.roundWind,
                roundNum: this.roundNum,
                honba: this.honba,
                riichiSticks: this.riichiSticks,
                dealerIdx: this.dealerIdx,
                doraIndicators: [...this.doraIndicators],
                wallRemaining: this.getRemainingTileCount(),
                deadWallData: this.getDeadWallData()
            });

            this.emit('turnStart', {
                playerId: this.dealerIdx,
                drawnTile: drawnTile,
                isDealerOpening: true
            });

            // Check Kyuushukyuuhai (구종구패) for dealer
            const kyuushu = this.checkKyuushukyuuhai(this.dealerIdx);
            if (kyuushu.eligible) {
                if (dealer.isAI) {
                    const yakuman = this.getYakumanAim(dealer);
                    if (!yakuman || yakuman.type !== 'kokushi' || kyuushu.kinds === 9) {
                        setTimeout(() => this.declareKyuushukyuuhai(this.dealerIdx), 600);
                        return;
                    }
                } else {
                    this.emit('canKyuushukyuuhai', {
                        playerId: this.dealerIdx,
                        kinds: kyuushu.kinds,
                        tiles: kyuushu.tiles
                    });
                }
            }

            // If dealer is AI, schedule AI discard
            if (dealer.isAI) {
                setTimeout(() => this.processAITurn(this.dealerIdx), 600);
            }
        }

        // Helper: Count total Kans formed across all players
        getTotalKanCount() {
            let count = 0;
            const playersWithKan = new Set();
            for (let i = 0; i < 4; i++) {
                for (const m of this.players[i].melds) {
                    if (m.type === 'kan' || m.type === 'ankan' || m.type === 'kakan') {
                        count++;
                        playersWithKan.add(i);
                    }
                }
            }
            return { count, distinctPlayers: playersWithKan.size };
        }

        // Check Kyuushukyuuhai (구종구패): 1st uninterrupted turn, 0 discards, no melds, >=9 unique yaochuu tiles
        checkKyuushukyuuhai(playerIdx) {
            const player = this.players[playerIdx];
            if (!player) return { eligible: false, kinds: 0, tiles: [] };

            if (player.discards.length > 0) return { eligible: false, kinds: 0, tiles: [] };
            if (this.players.some(p => p.melds.length > 0)) return { eligible: false, kinds: 0, tiles: [] };
            if (player.hand.length !== 14) return { eligible: false, kinds: 0, tiles: [] };

            const yaochuuSet = new Set();
            for (const t of player.hand) {
                const code = (t.code || t).replace('_aka', '');
                if (MahjongLogic.isTerminalOrHonor(code)) {
                    yaochuuSet.add(code);
                }
            }

            return {
                eligible: yaochuuSet.size >= 9,
                kinds: yaochuuSet.size,
                tiles: Array.from(yaochuuSet)
            };
        }

        declareKyuushukyuuhai(playerIdx) {
            const player = this.players[playerIdx];
            const info = this.checkKyuushukyuuhai(playerIdx);
            const count = info.kinds >= 9 ? info.kinds : 9;
            this.handleAbortiveDraw('구종구패 (九種九牌)', `${player.name} 선언 (요구패 ${count}종 보유)`);
        }

        // Check Suufonrenda (사풍연타): First uninterrupted 4 discards are identical wind tiles
        checkSuufonrenda() {
            if (this.turnCount !== 4) return false;
            if (this.players.some(p => p.melds.length > 0)) return false;
            if (!this.players.every(p => p.discards.length === 1)) return false;

            const winds = ['1z', '2z', '3z', '4z'];
            const firstCode = (this.players[0].discards[0].tile.code || this.players[0].discards[0].tile).replace('_aka', '');
            if (!winds.includes(firstCode)) return false;

            return this.players.every(p => {
                const code = (p.discards[0].tile.code || p.discards[0].tile).replace('_aka', '');
                return code === firstCode;
            });
        }

        // Check Suukariichi (사가리치): All 4 players declared riichi
        checkSuukariichi() {
            return this.players.every(p => p.isRiichi);
        }

        // Check Suukaikan (사간산란): 4 Kans formed by 2 or more distinct players
        checkSuukaikan() {
            const kanInfo = this.getTotalKanCount();
            return kanInfo.count === 4 && kanInfo.distinctPlayers >= 2;
        }

        // Handle Abortive Draw (도중유국)
        handleAbortiveDraw(reason, details = '') {
            this.state = 'ROUND_OVER';
            this.lastWinnerIdx = null;
            this.lastWinWasRiichi = false;

            this.emit('abortiveDraw', {
                reason,
                details,
                honba: this.honba,
                riichiSticks: this.riichiSticks,
                playerPoints: this.players.map(p => p.points)
            });

            // Renchan (dealer continues), honba increases by 1, Riichi sticks stay
            this.checkGameProgression(true, true);
        }

        getDeadWallData() {
            if (!this.deadWall || this.deadWall.length < 14) return null;
            return {
                rinshan: this.deadWall.slice(0, 4),
                rinshanTiles: this.deadWall.slice(0, 4),
                drawnRinshanCount: this.drawnRinshanCount || 0,
                doraIndicators: this.doraIndicatorTiles || this.deadWall.slice(4, 9),
                uraDoraIndicators: this.uraDoraIndicatorTiles || this.deadWall.slice(9, 14),
                activeDoraCount: this.activeDoraCount || 1
            };
        }

        getRemainingTileCount() {
            const wallLen = this.wall ? this.wall.length : 0;
            const rinshanDrawn = this.drawnRinshanCount || 0;
            return Math.max(0, wallLen - rinshanDrawn);
        }

        getSelfKanOptions(player) {
            const options = [];
            if (player.isRiichi || player.justCalledFuro) return options;
            if (this.deadWall && this.deadWall.length > 0 && this.getRemainingTileCount() <= 0) return options;
            if (this.getTotalKanCount().count >= 4) return options; // 5th Kan prohibited (사간산란 규칙)
            
            // Ankan
            const counts = {};
            for (const t of player.hand) {
                const c = (t.code || t).replace('_aka', '');
                counts[c] = (counts[c] || 0) + 1;
            }
            for (const [code, count] of Object.entries(counts)) {
                if (count === 4) options.push({ type: 'ankan', tile: code });
            }
            
            // Kakan
            for (const m of player.melds) {
                if (m.type === 'pon') {
                    for (const t of player.hand) {
                        const codeBase = (t.code || t).replace('_aka', '');
                        const meldBase = (m.tile).replace('_aka', '');
                        if (codeBase === meldBase) {
                            options.push({ type: 'kakan', tile: t.code || t }); // Use the actual tile from hand
                            break;
                        }
                    }
                }
            }
            return options;
        }

        // Draw tile for current player
        drawTile(playerIdx, fromDeadWall = false) {
            const player = this.players[playerIdx];
            player.justCalledFuro = false;
            // Clear temporary same-turn furiten on turn start
            player.isDoujunFuriten = false;

            if (!fromDeadWall && (!this.wall || this.wall.length === 0 || this.getRemainingTileCount() <= 0)) {
                this.handleExhaustiveDraw();
                return;
            }

            this.currentTurn = playerIdx;

            let drawn;
            if (fromDeadWall) {
                if (this.rinshanTiles && this.rinshanTiles.length > 0) {
                    drawn = this.rinshanTiles.shift();
                    this.drawnRinshanCount = (this.drawnRinshanCount || 0) + 1;
                    // Live wall tiles and dead wall 14-tile formation are preserved as-is.
                } else if (this.deadWall.length > 0) {
                    drawn = this.deadWall.shift();
                } else {
                    return;
                }
                player.isRinshan = true;
            } else {
                drawn = this.wall.shift();
                player.isRinshan = false;
            }
            player.hand.push(drawn);

            this.updatePlayerTenpai(player);
            this.state = 'AWAIT_DISCARD';

            const kanOptions = this.getSelfKanOptions(player);

            this.emit('turnStart', {
                playerId: playerIdx,
                drawnTile: drawn,
                wallRemaining: this.getRemainingTileCount(),
                isRinshan: fromDeadWall,
                kanOptions: kanOptions
            });

            // Check if player can Tsumo
            const tsumoScore = this.evaluateWin(playerIdx, drawn, true);
            if (tsumoScore && tsumoScore.success) {
                if (player.isAI) {
                    if (this.tutorialScenario && this.tutorialScenario.playerOnlyWin) {
                        // Suppress AI Tsumo in tutorial Stage 6 practical match simulation
                    } else {
                        // AI wins immediately
                        setTimeout(() => this.declareWin(playerIdx, drawn, true), 500);
                        return;
                    }
                } else {
                    this.emit('canTsumo', { playerId: playerIdx, tsumoScore, winningTile: drawn, isRinshan: fromDeadWall });
                }
            }

            // Check Kyuushukyuuhai (구종구패)
            const kyuushu = this.checkKyuushukyuuhai(playerIdx);
            if (kyuushu.eligible) {
                if (player.isAI) {
                    const yakuman = this.getYakumanAim(player);
                    if (!yakuman || yakuman.type !== 'kokushi' || kyuushu.kinds === 9) {
                        setTimeout(() => this.declareKyuushukyuuhai(playerIdx), 600);
                        return;
                    }
                } else {
                    this.emit('canKyuushukyuuhai', {
                        playerId: playerIdx,
                        kinds: kyuushu.kinds,
                        tiles: kyuushu.tiles
                    });
                }
            }

            // If AI, make discard
            if (player.isAI) {
                setTimeout(() => this.processAITurn(playerIdx), 600);
            }
        }

        // Player discards a tile
        discardTile(playerIdx, tileIndex, isRiichiDeclare = false) {
            if (this.state === 'ROUND_OVER' || this.state === 'GAME_OVER' || this.isWinPending) return;
            const player = this.players[playerIdx];
            player.forbiddenDiscards = null; // Reset Kuikae restriction on discard
            const discarded = player.hand.splice(tileIndex, 1)[0];
            player.hand = MahjongLogic.sortTiles(player.hand);
            player.isRinshan = false; // Reset after discard

            // Riichi handling
            if (isRiichiDeclare) {
                player.isRiichi = true;
                player.points -= 1000;
                this.riichiSticks++;
                player.isIppatsu = true;
                if (this.turnCount < 4 && this.players.every(p => p.melds.every(m => m.type === 'ankan'))) {
                    player.isDoubleRiichi = true;
                }
            } else {
                // If player was in Riichi with Ippatsu and now discards without winning on Tsumo, Ippatsu expires
                if (player.isIppatsu) {
                    player.isIppatsu = false;
                }
            }

            this.lastDiscard = {
                playerId: playerIdx,
                tile: discarded,
                isRiichi: isRiichiDeclare
            };

            let finalIsRiichi = isRiichiDeclare;
            if (player.needsRiichiMarker) {
                finalIsRiichi = true;
                player.needsRiichiMarker = false;
            }

            player.discards.push({
                tile: discarded,
                isRiichi: finalIsRiichi
            });
            player.allDiscards = player.allDiscards || [];
            player.allDiscards.push(discarded);

            this.updatePlayerTenpai(player);

            if (isRiichiDeclare) {
                player.riichiWaitingTiles = [...(player.waitingTiles || [])];
            }

            this.emit('tileDiscarded', {
                playerId: playerIdx,
                tile: discarded,
                fromHandIndex: tileIndex,
                isRiichi: isRiichiDeclare,
                riichiSticks: this.riichiSticks,
                playerPoints: player.points,
                waitingTiles: player.riichiWaitingTiles || player.waitingTiles
            });

            this.turnCount++;

            // Check 타가 반응 (Reaction: Ron, Pon, Kan, Chi)
            this.checkReactions(playerIdx, discarded);
        }

        // Check if any other player can Ron, Pon, Kan, or Chi
        checkReactions(discarderIdx, tile) {
            this.state = 'AWAIT_REACTION';

            const reactions = [];

            // Check Ron from 3 other players
            for (let i = 1; i <= 3; i++) {
                const targetIdx = (discarderIdx + i) % 4;
                const p = this.players[targetIdx];
                const baseTile = (tile.code || tile).replace('_aka', '');
                let isWait = p.waitingTiles && p.waitingTiles.length > 0
                    ? p.waitingTiles.some(w => w.replace('_aka', '') === baseTile)
                    : false;

                let winRes = null;
                // Fallback: If waitingTiles wasn't populated (e.g. mock/test hands), check evaluateWin
                if (!isWait && (!p.waitingTiles || p.waitingTiles.length === 0)) {
                    winRes = this.evaluateWin(targetIdx, tile, false);
                    if (winRes && winRes.success) {
                        isWait = true;
                    }
                }

                if (isWait) {
                    if (!winRes) {
                        winRes = this.evaluateWin(targetIdx, tile, false);
                    }
                    const isFuriten = MahjongLogic.checkFuriten(p);
                    if (winRes && winRes.success && !isFuriten) {
                        reactions.push({ type: 'ron', playerId: targetIdx, score: winRes });
                    } else {
                        // Player is waiting on this tile, but cannot Ron (either already furiten, or no yaku)
                        // Trigger same-turn furiten (and permanent furiten if in Riichi)
                        p.isDoujunFuriten = true;
                        if (p.isRiichi) {
                            p.isRiichiFuriten = true;
                        }
                    }
                }
            }

            // Check Pon / Daiminkan from any of other 3 players
            const totalKans = this.getTotalKanCount();
            const canKanByWall = (this.deadWall && this.deadWall.length > 0) ? this.getRemainingTileCount() > 0 : true;
            for (let i = 1; i <= 3; i++) {
                const targetIdx = (discarderIdx + i) % 4;
                const p = this.players[targetIdx];
                if (p.isRiichi) continue; // Riichi cannot meld
                const matches = p.hand.filter(t => t.code.replace('_aka', '') === (tile.code || tile).replace('_aka', ''));
                if (matches.length >= 2) {
                    reactions.push({ type: 'pon', playerId: targetIdx });
                }
                if (matches.length === 3 && totalKans.count < 4 && canKanByWall) {
                    reactions.push({ type: 'kan', playerId: targetIdx });
                }
            }

            // Check Chi: Only from Kamicha (player to the left, i.e., (discarderIdx + 1) % 4)
            const shimochaIdx = (discarderIdx + 1) % 4;
            const shimocha = this.players[shimochaIdx];
            const baseTileCode = (tile.code || tile).replace('_aka', '');
            if (!shimocha.isRiichi && !baseTileCode.endsWith('z')) {
                const val = parseInt(baseTileCode[0], 10);
                const s = baseTileCode.slice(-1);
                const hCodes = shimocha.hand.map(t => t.code.replace('_aka', ''));
                const chiOptions = [];

                // Helper to verify that calling Chi doesn't trap player with 0 legal non-Kuikae discards
                const isLegalChiOption = (pair) => {
                    const forbidden = MahjongLogic.getKuikaeForbiddenDiscards(baseTileCode, pair);
                    const simHand = [...hCodes];
                    for (const c of pair) {
                        const idx = simHand.indexOf(c);
                        if (idx !== -1) simHand.splice(idx, 1);
                    }
                    return simHand.some(c => !forbidden.includes(c));
                };

                // [val-2, val-1, val]
                if (val >= 3 && hCodes.includes(`${val - 2}${s}`) && hCodes.includes(`${val - 1}${s}`)) {
                    const pair = [`${val - 2}${s}`, `${val - 1}${s}`];
                    if (isLegalChiOption(pair)) chiOptions.push(pair);
                }
                // [val-1, val, val+1]
                if (val >= 2 && val <= 8 && hCodes.includes(`${val - 1}${s}`) && hCodes.includes(`${val + 1}${s}`)) {
                    const pair = [`${val - 1}${s}`, `${val + 1}${s}`];
                    if (isLegalChiOption(pair)) chiOptions.push(pair);
                }
                // [val, val+1, val+2]
                if (val <= 7 && hCodes.includes(`${val + 1}${s}`) && hCodes.includes(`${val + 2}${s}`)) {
                    const pair = [`${val + 1}${s}`, `${val + 2}${s}`];
                    if (isLegalChiOption(pair)) chiOptions.push(pair);
                }

                if (chiOptions.length > 0) {
                    reactions.push({ type: 'chi', playerId: shimochaIdx, options: chiOptions });
                }
            }

            // Check Sanchahou (삼가화: 3인 론 성립 시 도중유국)
            const ronReactions = reactions.filter(r => r.type === 'ron');
            if (ronReactions.length === 3) {
                this.pendingSanchahou = true;
                if (!ronReactions.some(r => r.playerId === 0)) {
                    // Player 0 is discarder, all 3 other players are AI declaring Ron -> Sanchahou!
                    this.handleAbortiveDraw('삼가화 (三家和)', '1타패에 3인 동시 론 선언');
                    return;
                }
            } else {
                this.pendingSanchahou = false;
            }

            // If multiplayer host, handle multi-human reactions
            if (this.isMultiplayerHost) {
                const humanReactions = reactions.filter(r => !this.players[r.playerId].isAI);
                if (humanReactions.length > 0) {
                    this.pendingMultiReactions = {
                        discarderIdx,
                        tile,
                        allReactions: reactions,
                        requiredPlayerIds: [...new Set(humanReactions.map(r => r.playerId))],
                        decisions: {}
                    };
                    for (let i = 0; i < 4; i++) {
                        if (this.players[i].isAI) {
                            const pReactions = reactions.filter(r => r.playerId === i);
                            if (pReactions.length > 0) {
                                const ron = pReactions.find(r => r.type === 'ron');
                                const kan = pReactions.find(r => r.type === 'kan');
                                const pon = pReactions.find(r => r.type === 'pon');
                                const chi = pReactions.find(r => r.type === 'chi');
                                if (ron) {
                                    this.pendingMultiReactions.decisions[i] = { type: 'ron' };
                                } else if (kan && this.shouldAIDaiminkan(i, tile)) {
                                    this.pendingMultiReactions.decisions[i] = { type: 'kan' };
                                } else if (pon && this.shouldAIPon(i, tile)) {
                                    this.pendingMultiReactions.decisions[i] = { type: 'pon' };
                                } else if (chi) {
                                    const best = this.shouldAIChi(i, tile, chi.options);
                                    if (best) this.pendingMultiReactions.decisions[i] = { type: 'chi', option: best };
                                    else this.pendingMultiReactions.decisions[i] = { type: 'pass' };
                                } else {
                                    this.pendingMultiReactions.decisions[i] = { type: 'pass' };
                                }
                            }
                        }
                    }
                    this.emit('multiPlayerCanReact', {
                        reactionsByPlayer: this.pendingMultiReactions.requiredPlayerIds.map(pId => ({
                            playerId: pId,
                            reactions: reactions.filter(r => r.playerId === pId),
                            discardedTile: tile,
                            discarderIdx
                        }))
                    });
                    return;
                }
            }

            // If player (id 0) can react, ask player!
            const playerReaction = reactions.find(r => r.playerId === 0 && !this.players[0].isAI);
            if (playerReaction) {
                this.emit('playerCanReact', {
                    reactions: reactions.filter(r => r.playerId === 0),
                    discardedTile: tile,
                    discarderIdx
                });
                return;
            }

            // AI Reactions
            // 1. Prioritize Ron
            const aiRon = reactions.find(r => r.type === 'ron' && this.players[r.playerId].isAI);
            if (aiRon && !(this.tutorialScenario && this.tutorialScenario.playerOnlyWin)) {
                setTimeout(() => this.declareWin(aiRon.playerId, tile, false, discarderIdx), 600);
                return;
            }

            // 2. AI Daiminkan (Kan)
            const aiKan = reactions.find(r => r.type === 'kan' && this.players[r.playerId].isAI);
            if (aiKan && (!this.tutorialScenario || this.tutorialScenario.allowAIFuro) && this.shouldAIDaiminkan(aiKan.playerId, tile)) {
                setTimeout(() => this.executeDaiminkan(aiKan.playerId), 600);
                return;
            }

            // 3. AI Pon (only if it completes/furthers a valid open Yaku)
            const aiPon = reactions.find(r => r.type === 'pon' && this.players[r.playerId].isAI);
            if (aiPon && (!this.tutorialScenario || this.tutorialScenario.allowAIFuro) && this.shouldAIPon(aiPon.playerId, tile)) {
                setTimeout(() => this.executePon(aiPon.playerId), 600);
                return;
            }

            // 4. AI Chi (only if it completes/furthers a valid open Yaku)
            const aiChi = reactions.find(r => r.type === 'chi' && this.players[r.playerId].isAI);
            if (aiChi && (!this.tutorialScenario || this.tutorialScenario.allowAIFuro)) {
                const bestOpt = this.shouldAIChi(aiChi.playerId, tile, aiChi.options);
                if (bestOpt) {
                    setTimeout(() => this.executeChi(aiChi.playerId, bestOpt), 600);
                    return;
                }
            }

            // Stage 5 tutorial: safe Genbutsu discard success -> notify UI and advance to P1!
            if (this.tutorialScenario && this.tutorialScenario.stageNum === 5 && discarderIdx === 0 && (tile.code || tile) === '3p') {
                this.emit('tutorialGenbutsuSuccess', { stageNum: 5, discardedTile: tile });
                this.advanceTurn();
                return;
            }

            // Otherwise advance to next player
            this.advanceTurn();
        }

        // Advance to next turn
        
        executeSelfKan(playerIdx, tileCode, type) {
            const player = this.players[playerIdx];
            if (type === 'kakan') {
                const preHandCount = player.hand.length;
                const idx = player.hand.findIndex(t => (t.code || t) === tileCode);
                if (idx !== -1) {
                    const tile = player.hand.splice(idx, 1)[0];
                    player.hand = MahjongLogic.sortTiles(player.hand);
                    
                    // Visually upgrade the meld immediately
                    const meld = player.melds.find(m => m.type === 'pon' && m.tile.replace('_aka', '') === tileCode.replace('_aka', ''));
                    if (meld) {
                        meld.type = 'kakan'; // Upgrade to kakan
                        meld.tiles.push(tile);
                        this.emit('meldFormed', {
                            playerId: playerIdx,
                            meldType: 'kakan',
                            meldTiles: meld.tiles,
                            removedIndices: [idx],
                            preHandCount: preHandCount
                        });
                    }
                    
                    // Check Chankan
                    const reactions = [];
                    for (let i = 1; i <= 3; i++) {
                        const targetIdx = (playerIdx + i) % 4;
                        const p = this.players[targetIdx];
                        const baseTile = (tile.code || tile).replace('_aka', '');
                        let isWait = p.waitingTiles && p.waitingTiles.length > 0
                            ? p.waitingTiles.some(w => w.replace('_aka', '') === baseTile)
                            : false;

                        p.isChankan = true;
                        let winRes = null;
                        if (!isWait && (!p.waitingTiles || p.waitingTiles.length === 0)) {
                            winRes = this.evaluateWin(targetIdx, tile, false);
                            if (winRes && winRes.success) {
                                isWait = true;
                            }
                        }

                        if (isWait) {
                            if (!winRes) {
                                winRes = this.evaluateWin(targetIdx, tile, false);
                            }
                            p.isChankan = false;
                            const isFuriten = MahjongLogic.checkFuriten(p);
                            if (winRes && winRes.success && !isFuriten) {
                                reactions.push({ type: 'ron', playerId: targetIdx, score: winRes, isChankan: true });
                            } else {
                                p.isDoujunFuriten = true;
                                if (p.isRiichi) p.isRiichiFuriten = true;
                            }
                        } else {
                            p.isChankan = false;
                        }
                    }
                    
                    if (reactions.length > 0) {
                        this.state = 'AWAIT_REACTION';
                        this.pendingKakan = { playerIdx, tileCode, tile };
                        this.lastDiscard = { playerId: playerIdx, tile: tile, isRiichi: false }; // Fake discard for Ron
                        
                        const playerReaction = reactions.find(r => r.playerId === 0);
                        if (playerReaction) {
                            setTimeout(() => {
                                this.emit('playerCanReact', { 
                                    discardedTile: tile, 
                                    discarderId: playerIdx, 
                                    reactions: reactions.filter(r => r.playerId === 0) 
                                });
                            }, 1000);
                            return;
                        }
                        
                        // AI Chankan Ron
                        const aiRon = reactions.find(r => r.type === 'ron' && this.players[r.playerId].isAI);
                        if (aiRon && !(this.tutorialScenario && this.tutorialScenario.playerOnlyWin)) {
                            this.players[aiRon.playerId].isChankan = true;
                            setTimeout(() => {
                                this.declareWin(aiRon.playerId, tile, false, playerIdx);
                            }, 1000);
                            return;
                        }
                    } else {
                        // Success Kakan
                        this.finishKan(playerIdx);
                    }
                }
            } else if (type === 'ankan') {
                // Remove 4 tiles
                const preHandCount = player.hand.length;
                const removedIndices = [];
                const targetBase = tileCode.replace('_aka', '');
                for (let i = 0; i < player.hand.length; i++) {
                    const baseH = (player.hand[i].code || player.hand[i]).replace('_aka', '');
                    if (baseH === targetBase) {
                        removedIndices.push(i);
                        if (removedIndices.length === 4) break;
                    }
                }
                const removed = [];
                for (let k = removedIndices.length - 1; k >= 0; k--) {
                    removed.unshift(player.hand.splice(removedIndices[k], 1)[0]);
                }
                player.hand = MahjongLogic.sortTiles(player.hand);
                player.melds.push({ type: 'ankan', tile: tileCode, tiles: removed });
                
                this.emit('meldFormed', {
                    playerId: playerIdx,
                    meldType: 'ankan',
                    meldTiles: removed,
                    removedIndices: removedIndices,
                    preHandCount: preHandCount
                });
                this.finishKan(playerIdx);
            }
        }
        
        finalizeKakan(playerIdx, tileCode, tileObj) {
            const player = this.players[playerIdx];
            const meld = player.melds.find(m => m.type === 'pon' && m.tile.replace('_aka', '') === tileCode.replace('_aka', ''));
            if (meld) {
                meld.type = 'kakan'; // Upgrade to kakan
                meld.tiles.push(tileObj);
                this.emit('meldFormed', { playerId: playerIdx, meldType: 'kakan', meldTiles: meld.tiles });
                this.finishKan(playerIdx);
            }
        }

        executeDaiminkan(playerIdx) {
            this.players[playerIdx].justCalledFuro = true;
            this.cancelIppatsu(); // Daiminkan cancels Ippatsu
            const player = this.players[playerIdx];
            const tile = this.lastDiscard.tile;

            // Remove from discarder's river
            const discarder = this.players[this.lastDiscard.playerId];
            if (discarder) {
                discarder.hadDiscardCalled = true;
                if (discarder.discards.length > 0) {
                    const popped = discarder.discards.pop();
                    if (popped.isRiichi) {
                        discarder.needsRiichiMarker = true;
                    }
                }
            }

            const preHandCount = player.hand.length;
            const removedIndices = [];
            const targetBase = (tile.code || tile).replace('_aka', '');
            for (let i = 0; i < player.hand.length; i++) {
                const baseH = (player.hand[i].code || player.hand[i]).replace('_aka', '');
                if (baseH === targetBase) {
                    removedIndices.push(i);
                    if (removedIndices.length === 3) break;
                }
            }

            const removed = [];
            for (let k = removedIndices.length - 1; k >= 0; k--) {
                removed.unshift(player.hand.splice(removedIndices[k], 1)[0]);
            }
            player.hand = MahjongLogic.sortTiles(player.hand);

            // Determine sideways position based on whom the tile was called from
            const diff = (this.lastDiscard.playerId - playerIdx + 4) % 4;
            let finalTiles = [];
            if (diff === 3) { // Kamicha (Left) -> index 2 (Rendered as Left)
                finalTiles = [removed[0], removed[1], tile, removed[2]];
            } else if (diff === 2) { // Toimen (Across) -> index 1
                finalTiles = [removed[0], tile, removed[1], removed[2]];
            } else { // Shimocha (Right) -> index 0 (Rendered as Right)
                finalTiles = [tile, ...removed];
            }

            player.melds.push({
                type: 'kan',
                tile: tile.code,
                tiles: finalTiles,
                fromPlayer: this.lastDiscard.playerId
            });

            this.emit('meldFormed', {
                playerId: playerIdx,
                meldType: 'kan',
                meldTiles: finalTiles,
                removedIndices: removedIndices,
                preHandCount: preHandCount
            });
            this.finishKan(playerIdx);
        }

        cancelIppatsu() {
            this.players.forEach(p => p.isIppatsu = false);
        }

        finishKan(playerIdx) {
            this.cancelIppatsu(); // Any Kan cancels Ippatsu
            
            // 1. Reveal new Kandora around 700ms (as meld arrives at destination)
            setTimeout(() => {
                const doraTiles = this.doraIndicatorTiles || (this.deadWall ? this.deadWall.slice(4, 9) : []);
                const uraTiles = this.uraDoraIndicatorTiles || (this.deadWall ? this.deadWall.slice(9, 14) : []);
                if (this.activeDoraCount < 5 && this.activeDoraCount < doraTiles.length) {
                    const newDoraTile = doraTiles[this.activeDoraCount];
                    const newUraDoraTile = uraTiles[this.activeDoraCount];
                    this.doraIndicators.push(newDoraTile.code);
                    this.uraDoraIndicators.push(newUraDoraTile.code);
                    const flippedIndex = this.activeDoraCount;
                    this.activeDoraCount++;

                    this.emit('kandoraFlipped', {
                        doraIndicators: [...this.doraIndicators],
                        uraDoraIndicators: [...this.uraDoraIndicators],
                        activeDoraCount: this.activeDoraCount,
                        flippedIndex: flippedIndex,
                        newDoraTile: newDoraTile.code
                    });
                }
            }, 700);
            
            // 2. Draw Rinshan tile around 1450ms (as meld settles and hand finishes repacking)
            setTimeout(() => {
                this.drawTile(playerIdx, true);
            }, 1450);
        }

        passReaction(playerIdx = 0) {
            const player = this.players[playerIdx];
            const reactionTile = this.pendingKakan ? this.pendingKakan.tile : (this.lastDiscard ? this.lastDiscard.tile : null);
            if (player && reactionTile) {
                const discTile = (reactionTile.code || reactionTile).replace('_aka', '');
                const isWaitingOnThis = player.waitingTiles && player.waitingTiles.some(w => w.replace('_aka', '') === discTile);
                if (isWaitingOnThis) {
                    player.isDoujunFuriten = true;
                    if (player.isRiichi) {
                        player.isRiichiFuriten = true;
                    }
                }
            }
            this.advanceTurn();
        }

        submitReactionDecision(playerIdx, decision) {
            if (!this.pendingMultiReactions) return;
            this.pendingMultiReactions.decisions[playerIdx] = decision;
            
            // Check if all required human players submitted
            const allSubmitted = this.pendingMultiReactions.requiredPlayerIds.every(id => !!this.pendingMultiReactions.decisions[id]);
            if (!allSubmitted) return;

            const { discarderIdx, tile, allReactions, decisions } = this.pendingMultiReactions;
            this.pendingMultiReactions = null;

            // 1. Check Ron
            const ronDecisions = Object.entries(decisions)
                .filter(([pId, d]) => d && d.type === 'ron')
                .map(([pId]) => parseInt(pId, 10));

            // Mark furiten for any players who could Ron but passed
            const eligibleRonPlayers = allReactions.filter(r => r.type === 'ron').map(r => r.playerId);
            for (const rId of eligibleRonPlayers) {
                if (!ronDecisions.includes(rId)) {
                    const p = this.players[rId];
                    if (p) {
                        p.isDoujunFuriten = true;
                        if (p.isRiichi) p.isRiichiFuriten = true;
                    }
                }
            }

            if (ronDecisions.length >= 3) {
                this.handleAbortiveDraw('삼가화 (三家和)', '1타패에 3인 동시 론 선언');
                return;
            }

            if (ronDecisions.length > 0) {
                // Atamahane (closest to discarder in turn order wins)
                ronDecisions.sort((a, b) => ((a - discarderIdx + 4) % 4) - ((b - discarderIdx + 4) % 4));
                const winnerIdx = ronDecisions[0];
                this.declareWin(winnerIdx, tile, false, discarderIdx);
                return;
            }

            // 2. Check Kan (Daiminkan)
            const kanEntry = Object.entries(decisions).find(([pId, d]) => d && d.type === 'kan');
            if (kanEntry) {
                const pId = parseInt(kanEntry[0], 10);
                this.executeDaiminkan(pId);
                return;
            }

            // 3. Check Pon
            const ponEntry = Object.entries(decisions).find(([pId, d]) => d && d.type === 'pon');
            if (ponEntry) {
                const pId = parseInt(ponEntry[0], 10);
                this.executePon(pId);
                return;
            }

            // 4. Check Chi
            const chiEntry = Object.entries(decisions).find(([pId, d]) => d && d.type === 'chi');
            if (chiEntry) {
                const pId = parseInt(chiEntry[0], 10);
                this.executeChi(pId, chiEntry[1].option || chiEntry[1].options);
                return;
            }

            // Everyone passed!
            this.advanceTurn();
        }

        forceTimeoutAction(playerIdx) {
            if (this.state === 'ROUND_OVER' || this.state === 'GAME_OVER' || this.isWinPending) return;
            const player = this.players[playerIdx];
            if (!player) return;

            if (this.state === 'AWAIT_DISCARD' && this.currentTurn === playerIdx) {
                // Auto Tsumogiri (discard last tile or rightmost legal non-forbidden tile)
                let targetIdx = player.hand.length - 1;
                if (player.forbiddenDiscards && player.forbiddenDiscards.length > 0) {
                    for (let i = player.hand.length - 1; i >= 0; i--) {
                        const code = (player.hand[i].code || player.hand[i]).replace('_aka', '');
                        if (!player.forbiddenDiscards.includes(code)) {
                            targetIdx = i;
                            break;
                        }
                    }
                }
                this.discardTile(playerIdx, targetIdx, false);
            } else if (this.state === 'AWAIT_REACTION') {
                if (this.isMultiplayerHost && this.pendingMultiReactions) {
                    this.submitReactionDecision(playerIdx, { type: 'pass' });
                } else {
                    this.passReaction(playerIdx);
                }
            }
        }

        advanceTurn() {
            this.pendingSanchahou = false;

            if (this.pendingKakan) {
                const pIdx = this.pendingKakan.playerIdx;
                this.pendingKakan = null;
                // Meld was already upgraded; just flip dora and draw rinshan
                this.finishKan(pIdx);
                return;
            }

            // Check Abortive Draws (도중유국)
            // 1. Suufonrenda (사풍연타: 4인 연속 동일 바람패 타패)
            if (this.checkSuufonrenda()) {
                this.handleAbortiveDraw('사풍연타 (四風連打)', '첫 순목 4인 연속 동일 바람패 타패');
                return;
            }

            // 2. Suukariichi (사가리치: 4인 전원 리치 성립)
            if (this.checkSuukariichi()) {
                this.handleAbortiveDraw('사가리치 (四家立直)', '4인 전원 리치 성립');
                return;
            }

            // 3. Suukaikan (사간산란: 2인 이상에 의한 4회 깡 성립)
            if (this.checkSuukaikan()) {
                this.handleAbortiveDraw('사간산란 (四槓散了)', '2인 이상에 의한 4회 깡 성립');
                return;
            }

            const nextIdx = (this.currentTurn + 1) % 4;
            setTimeout(() => {
                if (this.state !== 'ROUND_OVER' && this.state !== 'GAME_OVER') {
                    this.drawTile(nextIdx);
                }
            }, 320);
        }

        // Execute Pon
        executePon(playerIdx) {
            this.players[playerIdx].justCalledFuro = true;
            this.cancelIppatsu(); // Pon cancels Ippatsu
            const player = this.players[playerIdx];
            const tile = this.lastDiscard.tile;

            // Remove from discarder's river
            const discarder = this.players[this.lastDiscard.playerId];
            if (discarder) {
                discarder.hadDiscardCalled = true;
                if (discarder.discards.length > 0) {
                    const popped = discarder.discards.pop();
                    if (popped.isRiichi) {
                        discarder.needsRiichiMarker = true;
                    }
                }
            }

            // Remove 2 matching tiles from hand
            const preHandCount = player.hand.length;
            const removedIndices = [];
            const targetBase = (tile.code || tile).replace('_aka', '');
            for (let i = 0; i < player.hand.length; i++) {
                if (player.hand[i].code.replace('_aka', '') === targetBase) {
                    removedIndices.push(i);
                    if (removedIndices.length === 2) break;
                }
            }

            const removed = [];
            for (let k = removedIndices.length - 1; k >= 0; k--) {
                removed.unshift(player.hand.splice(removedIndices[k], 1)[0]);
            }

            // Determine sideways position based on whom the tile was called from
            const diff = (this.lastDiscard.playerId - playerIdx + 4) % 4;
            let finalTiles = [];
            if (diff === 3) { // Kamicha (Left) -> index 2 (Rendered as Left)
                finalTiles = [...removed, tile];
            } else if (diff === 2) { // Toimen (Across) -> index 1
                finalTiles = [removed[0], tile, removed[1]];
            } else { // Shimocha (Right) -> index 0 (Rendered as Right)
                finalTiles = [tile, ...removed];
            }

            // Create meld
            player.melds.push({
                type: 'pon',
                tile: tile.code,
                tiles: finalTiles,
                fromPlayer: this.lastDiscard.playerId
            });

            // Kuikae prevention: cannot discard the same tile called for Pon this turn
            player.forbiddenDiscards = MahjongLogic.getKuikaeForbiddenDiscards(tile);

            this.currentTurn = playerIdx;
            this.state = 'AWAIT_DISCARD';

            this.emit('meldFormed', {
                playerId: playerIdx,
                meldType: 'pon',
                meldTiles: finalTiles,
                removedIndices: removedIndices,
                preHandCount: preHandCount
            });

            if (player.isAI) {
                setTimeout(() => this.processAITurn(playerIdx), 2000);
            }
        }

        // Execute Chi
        executeChi(playerIdx, chiPair) {
            this.players[playerIdx].justCalledFuro = true;
            // STRICT VALIDATION: Chi can ONLY be performed on Kamicha's (Right/Previous player) discard
            if (this.lastDiscard.playerId !== (playerIdx + 3) % 4) {
                console.error(`Invalid Chi: Player ${playerIdx} attempted to Chi from Player ${this.lastDiscard.playerId}`);
                return;
            }

            this.cancelIppatsu(); // Chi cancels Ippatsu
            const player = this.players[playerIdx];
            const tile = this.lastDiscard.tile;

            // Remove from discarder's river
            const discarder = this.players[this.lastDiscard.playerId];
            if (discarder) {
                discarder.hadDiscardCalled = true;
                if (discarder.discards.length > 0) {
                    const popped = discarder.discards.pop();
                    if (popped.isRiichi) {
                        discarder.needsRiichiMarker = true;
                    }
                }
            }

            // Remove the 2 pair tiles
            const preHandCount = player.hand.length;
            const usedIndices = new Set();
            const removedIndices = [];
            for (const code of chiPair) {
                const targetBase = code.replace('_aka', '');
                const idx = player.hand.findIndex((t, i) => !usedIndices.has(i) && t.code.replace('_aka', '') === targetBase);
                if (idx !== -1) {
                    usedIndices.add(idx);
                    removedIndices.push(idx);
                }
            }
            removedIndices.sort((a, b) => a - b);

            const removed = [];
            for (let k = removedIndices.length - 1; k >= 0; k--) {
                removed.unshift(player.hand.splice(removedIndices[k], 1)[0]);
            }

            // Chi is always from Kamicha (Left), so the called tile must be at index 2 (Rendered on Left)
            const sortedHandTiles = MahjongLogic.sortTiles(removed);
            const finalTiles = [...sortedHandTiles, tile]; // Rendered on Left

            player.melds.push({
                type: 'chi',
                tile: tile.code, // Can be any tile from the meld, scoring will sort it
                tiles: finalTiles,
                fromPlayer: this.lastDiscard.playerId
            });

            // Kuikae prevention: cannot discard the same tile or suji tile called for Chi this turn
            player.forbiddenDiscards = MahjongLogic.getKuikaeForbiddenDiscards(tile, chiPair);

            this.currentTurn = playerIdx;
            this.state = 'AWAIT_DISCARD';

            this.emit('meldFormed', {
                playerId: playerIdx,
                meldType: 'chi',
                meldTiles: finalTiles,
                removedIndices: removedIndices,
                preHandCount: preHandCount
            });

            if (player.isAI) {
                setTimeout(() => this.processAITurn(playerIdx), 2000);
            }
        }

        // Update tenpai and waiting tiles
        updatePlayerTenpai(player) {
            const handCodes = player.hand.map(t => t.code);
            const is14 = (player.hand.length + player.melds.length * 3) === 14;

            if (is14) {
                player.tenpaiDiscards = MahjongLogic.getTenpaiDiscards(player.hand, player.melds);
                player.waitingTiles = [];
            } else {
                player.waitingTiles = MahjongLogic.getWaitingTiles(player.hand, player.melds);
            }
        }

        // Evaluate win (Ron / Tsumo)
        evaluateWin(playerIdx, winningTile, isTsumo) {
            const player = this.players[playerIdx];
            const isDealer = (playerIdx === this.dealerIdx);
            
            const totalCount = player.hand.length + (player.melds ? player.melds.length * 3 : 0);
            const evalHand = (totalCount >= 14) ? [...player.hand] : [...player.hand, winningTile];

            return MahjongScoring.calculateScore({
                handTiles: evalHand,
                melds: player.melds,
                winningTile: winningTile,
                isTsumo: isTsumo,
                isRiichi: player.isRiichi,
                isDoubleRiichi: player.isDoubleRiichi,
                isIppatsu: player.isIppatsu,
                isHaitei: isTsumo && this.getRemainingTileCount() === 0,
                isHoutei: !isTsumo && this.getRemainingTileCount() === 0,
                isRinshan: player.isRinshan || false,
                isChankan: player.isChankan || false,
                seatWind: player.wind,
                roundWind: this.roundWind,
                doraIndicators: this.doraIndicators,
                uraDoraIndicators: this.uraDoraIndicators,
                isDealer: isDealer,
                honba: this.honba
            });
        }

        // Declare Win
        declareWin(winnerIdx, winningTile, isTsumo, loserIdx = null) {
            if (this.tutorialScenario && this.tutorialScenario.playerOnlyWin && winnerIdx !== 0) {
                return; // Guard: only player can win in Stage 6
            }
            if (!isTsumo && this.pendingSanchahou) {
                this.pendingSanchahou = false;
                this.handleAbortiveDraw('삼가화 (三家和)', '1타패에 3인 동시 론 선언');
                return;
            }

            this.state = 'ROUND_OVER';
            this.isWinPending = true;
            const winner = this.players[winnerIdx];
            this.lastWinnerIdx = winnerIdx;
            this.lastWinWasRiichi = !!winner.isRiichi;
            const isDealer = (winnerIdx === this.dealerIdx);

            // Defensive: ensure winner.hand has 14 tiles equivalent for Tsumo
            if (isTsumo) {
                const totalCount = winner.hand.length + (winner.melds ? winner.melds.length * 3 : 0);
                if (totalCount < 14) {
                    winner.hand.push(winningTile);
                }
            }

            const rawScore = this.evaluateWin(winnerIdx, winningTile, isTsumo);
            const scoreRes = (rawScore && rawScore.success && rawScore.payments) ? rawScore : {
                success: true,
                totalScore: 1000,
                title: '화료',
                paymentDesc: '기본 화료',
                payments: { dealer: 500, nonDealer: 300, direct: 1000 },
                yakuList: [{ name: '기본 화료', han: 1 }],
                doraInfo: { dora: 0, uradora: 0, aka: 0 }
            };

            // Award Riichi sticks to winner
            winner.points += this.riichiSticks * 1000;
            const collectedRiichiSticks = this.riichiSticks;
            this.riichiSticks = 0;

            // Apply points
            if (isTsumo) {
                for (let i = 0; i < 4; i++) {
                    if (i === winnerIdx) continue;
                    const pay = (i === this.dealerIdx) ? scoreRes.payments.dealer : scoreRes.payments.nonDealer;
                    this.players[i].points -= pay;
                }
                winner.points += scoreRes.totalScore;
            } else {
                if (loserIdx !== null && this.players[loserIdx]) {
                    this.players[loserIdx].points -= scoreRes.totalScore;
                }
                winner.points += scoreRes.totalScore;
            }

            // Expose Uradora if Riichi
            const uradoras = winner.isRiichi ? [...this.uraDoraIndicators] : [];

            this.emit('roundWon', {
                winnerIdx,
                winnerName: winner.name,
                loserIdx,
                loserName: loserIdx !== null ? this.players[loserIdx].name : null,
                isTsumo,
                winningTile,
                scoreRes,
                collectedRiichiSticks,
                uradoras,
                playerPoints: this.players.map(p => p.points)
            });

            // Check game over (tobashi or ooras completed)
            this.checkGameProgression(winnerIdx === this.dealerIdx);
        }

        // Handle Exhaustive Draw (황패유국) & Nagashi Mangan (나가시만간)
        handleExhaustiveDraw() {
            this.state = 'ROUND_OVER';
            this.lastWinnerIdx = null;
            this.lastWinWasRiichi = false;

            // 1. Check Nagashi Mangan (나가시만간) for all 4 players
            const nagashiAchievers = [];
            for (let i = 0; i < 4; i++) {
                const p = this.players[i];
                if (p.discards.length > 0 && !p.hadDiscardCalled) {
                    const allYaochuu = p.discards.every(d => MahjongLogic.isTerminalOrHonor(d.tile));
                    if (allYaochuu) {
                        nagashiAchievers.push(i);
                    }
                }
            }

            if (nagashiAchievers.length > 0) {
                // Nagashi Mangan is treated as Mangan Tsumo
                // Standard Noten 3000-point penalty is EXEMPT!
                let dealerAchieved = false;
                const achieverDetails = [];

                const sticksBonus = this.riichiSticks * 1000;
                this.riichiSticks = 0;

                for (let idx = 0; idx < nagashiAchievers.length; idx++) {
                    const achIdx = nagashiAchievers[idx];
                    const p = this.players[achIdx];
                    const isDealer = (achIdx === this.dealerIdx);
                    if (isDealer) dealerAchieved = true;

                    let totalGain = 0;
                    if (isDealer) {
                        // Dealer Mangan Tsumo: 4000 from each player + 100 per honba from each
                        for (let j = 0; j < 4; j++) {
                            if (j === achIdx) continue;
                            const pay = 4000 + (this.honba * 100);
                            this.players[j].points -= pay;
                            totalGain += pay;
                        }
                    } else {
                        // Non-Dealer Mangan Tsumo: 4000 from dealer + 2000 from others + 100 per honba from each
                        for (let j = 0; j < 4; j++) {
                            if (j === achIdx) continue;
                            const base = (j === this.dealerIdx) ? 4000 : 2000;
                            const pay = base + (this.honba * 100);
                            this.players[j].points -= pay;
                            totalGain += pay;
                        }
                    }

                    if (idx === 0) {
                        totalGain += sticksBonus;
                    }
                    p.points += totalGain;

                    achieverDetails.push({
                        playerId: achIdx,
                        name: p.name,
                        isDealer,
                        totalGain
                    });
                }

                this.emit('nagashiMangan', {
                    achievers: achieverDetails,
                    honba: this.honba,
                    playerPoints: this.players.map(p => p.points)
                });

                this.checkGameProgression(dealerAchieved);
                return;
            }

            // 2. Standard Exhaustive Draw (황패유국)
            // Check Tenpai for all 4 players
            const tenpaiStatus = [];
            let tenpaiCount = 0;
            const oldPoints = this.players.map(p => p.points);

            for (let i = 0; i < 4; i++) {
                const p = this.players[i];
                const shanten = MahjongLogic.calculateShanten(p.hand.map(t => t.code), p.melds.length);
                const isTenpai = (shanten === 0);
                if (isTenpai) tenpaiCount++;
                tenpaiStatus.push({
                    playerId: i,
                    isTenpai,
                    name: p.name,
                    baseName: p.baseName || (i === 0 ? '플레이어' : (i === 1 ? 'AI 하가' : (i === 2 ? 'AI 대면' : 'AI 상가'))),
                    wind: p.wind,
                    isDealer: (i === this.dealerIdx),
                    oldPoints: oldPoints[i],
                    delta: 0,
                    newPoints: oldPoints[i],
                    waitingTiles: isTenpai ? (p.waitingTiles || []) : []
                });
            }

            // Distribute 3000 Tenpai points (노텐 벌금 / 밧푸)
            let receivePoints = 0;
            let payPoints = 0;
            if (tenpaiCount > 0 && tenpaiCount < 4) {
                receivePoints = 3000 / tenpaiCount;
                payPoints = 3000 / (4 - tenpaiCount);

                for (let i = 0; i < 4; i++) {
                    if (tenpaiStatus[i].isTenpai) {
                        this.players[i].points += receivePoints;
                        tenpaiStatus[i].delta = receivePoints;
                        tenpaiStatus[i].newPoints = this.players[i].points;
                    } else {
                        this.players[i].points -= payPoints;
                        tenpaiStatus[i].delta = -payPoints;
                        tenpaiStatus[i].newPoints = this.players[i].points;
                    }
                }
            }

            const dealerIsTenpai = tenpaiStatus[this.dealerIdx].isTenpai;

            this.emit('exhaustiveDraw', {
                tenpaiStatus,
                tenpaiCount,
                notenCount: 4 - tenpaiCount,
                receivePoints,
                payPoints,
                dealerIsTenpai,
                honba: this.honba,
                dealerIdx: this.dealerIdx,
                playerPoints: this.players.map(p => p.points)
            });

            // If dealer is tenpai -> Renchan (dealer stays), else dealer passes
            // Honba resets on dealer noten draw.
            this.checkGameProgression(dealerIsTenpai);
        }

        // Advance to next round or end game
        checkGameProgression(dealerContinues, isDraw = false) {
            // Check Bust (들통 / 토비)
            const bust = this.players.some(p => p.points < 0);
            if (bust) {
                this.endGame('들통 (마이너스 점수 발생으로 대국 종료)');
                return;
            }

            if (!dealerContinues) {
                // User's Rule: Reset honba to 0 on ANY dealer pass (non-dealer win OR dealer noten draw)
                this.honba = 0;
                
                this.dealerIdx = (this.dealerIdx + 1) % 4;
                this.roundNum++;
                if (this.roundNum > 4) {
                    if (!this.config.isHanchan) {
                        // End of Tonpuusen
                        this.endGame('동풍전 종료');
                        return;
                    } else {
                        // Hanchan: switch to South round
                        if (this.roundWind === '1z') {
                            this.roundWind = '2z';
                            this.roundNum = 1;
                        } else {
                            this.endGame('반장전 종료');
                            return;
                        }
                    }
                }
            } else {
                // User's Rule: Honba increases ONLY when dealer continues (win or tenpai draw)
                this.honba++;
            }
        }

        endGame(reason) {
            this.state = 'GAME_OVER';

            // Calculate final rankings and Uma/Oka
            const ranking = [...this.players]
                .sort((a, b) => b.points - a.points)
                .map((p, rank) => ({
                    rank: rank + 1,
                    id: p.id,
                    name: p.name,
                    baseName: p.baseName || (p.id === 0 ? '플레이어' : (p.id === 1 ? 'AI 하가' : (p.id === 2 ? 'AI 대면' : 'AI 상가'))),
                    points: p.points
                }));

            this.emit('gameOver', {
                reason,
                ranking
            });
        }

        // Detect if hand has an exceptionally strong foundation/direction for a Yakuman
        // Strictly prevents aiming from scratch ("맨땅에 역만 노리는 일 방지")
        getYakumanAim(player) {
            const hand = player.hand || [];
            const melds = player.melds || [];
            const isMenzen = melds.length === 0;
            const allTiles = [...hand, ...melds.flatMap(m => m.tiles)];

            const counts = {};
            for (const t of allTiles) {
                const c = (t.code || t).replace('_aka', '');
                counts[c] = (counts[c] || 0) + 1;
            }

            const handCounts = {};
            for (const t of hand) {
                const c = (t.code || t).replace('_aka', '');
                handCounts[c] = (handCounts[c] || 0) + 1;
            }

            // 1. Kokushi Musou (국사무쌍)
            // Requirements:
            // - Strictly Menzen (no melds)
            // - At least 10 UNIQUE yaochuu tiles (out of 13 types)
            if (isMenzen) {
                const kokushiTiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];
                let uniqueCount = 0;
                for (const kt of kokushiTiles) {
                    if ((counts[kt] || 0) > 0) uniqueCount++;
                }
                if (uniqueCount >= 10) {
                    return { type: 'kokushi' };
                }
            }

            // 2. Suuankou (사암각)
            // Requirements:
            // - Strictly Menzen (no melds)
            // - Already holds AT LEAST 3 concealed triplets (Sanankou) in hand!
            if (isMenzen) {
                let ankoCount = 0;
                for (const c in handCounts) {
                    if (handCounts[c] >= 3) ankoCount++;
                }
                if (ankoCount >= 3) {
                    return { type: 'suuankou' };
                }
            }

            // 3. Daisangen (대삼원)
            // Requirements:
            // - Total dragon tiles (5z, 6z, 7z) in hand + melds >= 6
            // - Dragon melds or pairs in hand: at least 2 types must be pair/triplet/meld (>= 2)
            // - And the 3rd type must have count >= 1 (or melded)
            const dragons = ['5z', '6z', '7z'];
            const dragonTotal = dragons.reduce((sum, d) => sum + (counts[d] || 0), 0);
            let dragonPairsOrTriplets = 0;
            let dragonKinds = 0;
            for (const d of dragons) {
                const cnt = counts[d] || 0;
                if (cnt > 0) dragonKinds++;
                if (cnt >= 2) dragonPairsOrTriplets++;
            }
            if (dragonTotal >= 6 && dragonPairsOrTriplets >= 2 && dragonKinds === 3) {
                return { type: 'daisangen' };
            }

            // 4. Shousuushii / Daisuushii (소사희 / 대사희)
            // Requirements:
            // - Total wind tiles (1z~4z) in hand + melds >= 8
            // - At least 3 types of winds must be pair/triplet/meld (>= 2)
            const winds = ['1z', '2z', '3z', '4z'];
            const windTotal = winds.reduce((sum, w) => sum + (counts[w] || 0), 0);
            let windPairsOrTriplets = 0;
            for (const w of winds) {
                if ((counts[w] || 0) >= 2) windPairsOrTriplets++;
            }
            if (windTotal >= 8 && windPairsOrTriplets >= 3) {
                return { type: 'suushii' };
            }

            // 5. Tsuuiisou (자일색)
            // Requirements:
            // - All melds must be honor melds (0 suited melds)
            // - Total honors (1z~7z) in hand + melds >= 10
            const honors = ['1z', '2z', '3z', '4z', '5z', '6z', '7z'];
            const honorTotal = honors.reduce((sum, h) => sum + (counts[h] || 0), 0);
            const hasSuitedMelds = melds.some(m => {
                const s = (m.tile || m.tiles[0].code).slice(-1);
                return s !== 'z';
            });
            if (!hasSuitedMelds && honorTotal >= 10) {
                return { type: 'tsuuiisou' };
            }

            // 6. Ryuuiisou (녹일색)
            // Requirements:
            // - Green tiles: 2s, 3s, 4s, 6s, 8s, 6z
            // - All melds must be purely green
            // - Total green tiles in hand + melds >= 10
            const greenTiles = ['2s', '3s', '4s', '6s', '8s', '6z'];
            const greenTotal = greenTiles.reduce((sum, g) => sum + (counts[g] || 0), 0);
            const hasNonGreenMelds = melds.some(m => {
                return m.tiles.some(t => !greenTiles.includes((t.code || t).replace('_aka', '')));
            });
            if (!hasNonGreenMelds && greenTotal >= 10) {
                return { type: 'ryuuiisou' };
            }

            return null;
        }

        // Detect if hand has clear potential/direction for Honitsu (혼일색) or Chinitsu (청일색)
        getFlushAim(player) {
            const allTiles = [...player.hand, ...(player.melds || []).flatMap(m => m.tiles)];
            const suits = { m: 0, p: 0, s: 0, z: 0 };
            for (const t of allTiles) {
                const c = (t.code || t).replace('_aka', '');
                const s = c.slice(-1);
                if (suits[s] !== undefined) suits[s]++;
            }

            const meldSuits = new Set();
            for (const m of (player.melds || [])) {
                for (const t of m.tiles) {
                    const s = (t.code || t).replace('_aka', '').slice(-1);
                    if (s !== 'z') meldSuits.add(s);
                }
            }
            if (meldSuits.size > 1) return null; // Melds already contain 2 different suit types

            const lockedSuit = meldSuits.size === 1 ? Array.from(meldSuits)[0] : null;

            for (const s of ['m', 'p', 's']) {
                if (lockedSuit && lockedSuit !== s) continue;

                const suitCount = suits[s];
                const honorCount = suits.z;
                const otherSuitsCount = (s === 'm' ? suits.p + suits.s : (s === 'p' ? suits.m + suits.s : suits.m + suits.p));

                // 1. Chinitsu Aim: pure suit >= 9 tiles, other suits <= 2, honors <= 1
                if (suitCount >= 9 && otherSuitsCount <= 2 && honorCount <= 1) {
                    return { type: 'chinitsu', suit: s };
                }

                // 2. Honitsu Aim: suit + honors >= 10 tiles, other suits <= 3, suit >= 6
                if (suitCount + honorCount >= 10 && otherSuitsCount <= 3 && suitCount >= 6) {
                    return { type: 'honitsu', suit: s };
                }
            }

            return null;
        }

        // Strategic AI Tenpai evaluation: Riichi, Damaten, Chasing Riichi, Improvement, or Fold
        evaluateAITenpaiDecision(aiIdx) {
            const ai = this.players[aiIdx];
            if (!ai.tenpaiDiscards || ai.tenpaiDiscards.length === 0) return null;

            const isMenzen = ai.melds.every(m => m.type === 'ankan');
            const canDeclareRiichi = isMenzen && ai.points >= 1000 && this.getRemainingTileCount() >= 4 && (!this.tutorialScenario || !!this.tutorialScenario.allowAIRiichi);

            const riichiOpponents = this.players.filter((p, pIdx) => pIdx !== aiIdx && p.isRiichi);
            const hasRiichiThreat = riichiOpponents.length > 0;

            // Filter valid discard candidates (excluding kuikae forbidden discards)
            const validCandidates = ai.tenpaiDiscards.filter(c => {
                const code = (c.tile.code || c.tile).replace('_aka', '');
                return !ai.forbiddenDiscards || !ai.forbiddenDiscards.includes(code);
            });
            if (validCandidates.length === 0) return null;

            // Collect Riichi opponent discards (Genbutsu - 100% safe)
            const genbutsuSet = new Set();
            if (hasRiichiThreat) {
                for (const opp of riichiOpponents) {
                    const src = (opp.allDiscards && opp.allDiscards.length > 0) ? opp.allDiscards : opp.discards;
                    for (const d of src) {
                        const c = (d.tile?.code || d.code || d.tile || d).replace('_aka', '');
                        genbutsuSet.add(c);
                    }
                }
            }

            // Helper: Evaluate candidate hand value on Ron without Riichi
            const evaluateCandidateValue = (cand) => {
                const discardCode = (cand.tile.code || cand.tile).replace('_aka', '');
                const simHand = [];
                let removed = false;
                for (const t of ai.hand) {
                    const code = (t.code || t).replace('_aka', '');
                    if (!removed && code === discardCode) {
                        removed = true;
                    } else {
                        simHand.push(t);
                    }
                }

                let bestScore = 0;
                let bestHan = 0;
                let hasYaku = false;
                let isYakuman = false;

                // Test waiting tiles to find hand value
                for (const waitCode of cand.waitingTiles) {
                    const sampleWinTile = { code: waitCode, id: -1, isAka: false };
                    try {
                        if (typeof MahjongScoring !== 'undefined' && MahjongScoring.calculateScore) {
                            const res = MahjongScoring.calculateScore({
                                handTiles: [...simHand, sampleWinTile],
                                melds: ai.melds,
                                winningTile: sampleWinTile,
                                isTsumo: false,
                                isRiichi: false,
                                seatWind: ai.wind || ai.seatWind,
                                roundWind: this.roundWind,
                                doraIndicators: this.doraIndicators,
                                uraDoraIndicators: [],
                                isDealer: aiIdx === this.dealerIdx,
                                honba: this.honba
                            });
                            if (res && res.success) {
                                hasYaku = true;
                                if (res.totalScore > bestScore) {
                                    bestScore = res.totalScore;
                                    bestHan = res.totalHan || 0;
                                }
                                if ((res.yakumanList && res.yakumanList.length > 0) || (res.totalHan >= 13)) {
                                    isYakuman = true;
                                }
                            }
                        }
                    } catch (e) {}
                }

                return { hasYaku, totalHan: bestHan, totalScore: bestScore, isYakuman };
            };

            // Score and prioritize candidates
            const scoredCandidates = validCandidates.map(cand => {
                const val = evaluateCandidateValue(cand);
                const code = (cand.tile.code || cand.tile).replace('_aka', '');
                const isGenbutsu = genbutsuSet.has(code);
                return {
                    cand,
                    ...val,
                    isGenbutsu,
                    waitCount: cand.waitingTiles.length
                };
            });

            // Pick the best discard candidate:
            // Under Riichi threat, prioritize tenpai discards that are Genbutsu (100% safe)
            let bestChoice = scoredCandidates[0];
            for (const sc of scoredCandidates) {
                if (hasRiichiThreat && sc.isGenbutsu && !bestChoice.isGenbutsu) {
                    bestChoice = sc;
                } else if (hasRiichiThreat && !sc.isGenbutsu && bestChoice.isGenbutsu) {
                    continue;
                } else if (sc.waitCount > bestChoice.waitCount) {
                    bestChoice = sc;
                } else if (sc.waitCount === bestChoice.waitCount && sc.totalScore > bestChoice.totalScore) {
                    bestChoice = sc;
                }
            }

            const { cand, hasYaku, totalHan, totalScore, isYakuman, waitCount, isGenbutsu } = bestChoice;
            const actualIdx = ai.hand.findIndex(t => t === cand.tile || (t.code || t) === (cand.tile.code || cand.tile));
            if (actualIdx === -1) return null;

            // Ineligible for Riichi (open hand, points < 1000, wall < 4)
            if (!canDeclareRiichi) {
                return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'ineligible_for_riichi' };
            }

            const turnsPlayed = ai.discards ? ai.discards.length : 0;
            const wasInDamaten = !!ai.damatenReason;

            // Context: South 3/4 1st place defense
            const isLateSouth = (this.roundWind === '2z' && this.roundNum >= 3);
            const sortedPlayers = [...this.players].sort((a, b) => b.points - a.points);
            const isTopWithLead = (sortedPlayers[0] === ai && (sortedPlayers[0].points - sortedPlayers[1].points >= 4000));

            // 1. Chasing Riichi situation (타가 선제 리치가 이미 걸린 경우)
            if (hasRiichiThreat) {
                // High Value hand against Riichi
                if (isYakuman || totalScore >= 7700 || totalHan >= 4) {
                    // 70% Damaten stealth Ron, 30% Chasing Riichi
                    if (Math.random() < 0.30) {
                        ai.damatenReason = null;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'chasing_riichi_high_value' };
                    } else {
                        ai.damatenReason = 'chasing_stealth_mangan';
                        ai.prevWaitCount = waitCount;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'chasing_stealth_mangan' };
                    }
                }

                // Good Wait (2+ waits, Ryanmen/Shanpon) against Riichi
                if (waitCount >= 2) {
                    // 65% declare Chasing Riichi (맞불 추격 리치), 35% Damaten to catch 3rd party discards
                    if (Math.random() < 0.65) {
                        ai.damatenReason = null;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'chasing_riichi_good_wait' };
                    } else {
                        ai.damatenReason = 'chasing_stealth_third_party';
                        ai.prevWaitCount = waitCount;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'chasing_damaten_good_wait' };
                    }
                }

                // Bad Wait (1 wait, Kanchan/Penchan/Tanki) against Riichi
                if (waitCount === 1) {
                    // If tenpai discard is Genbutsu, maintain Damaten safely
                    if (isGenbutsu) {
                        ai.damatenReason = 'bad_wait_safe_damaten';
                        ai.prevWaitCount = waitCount;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'bad_wait_genbutsu_damaten' };
                    }

                    // Dangerous discard with low value and bad wait: 75% fold (break tenpai and defend)
                    const doraCodes = this.doraIndicators ? this.doraIndicators.map(d => MahjongScoring.getDoraTile(d)) : [];
                    const aiDoraCount = ai.hand.filter(t => t.isAka || doraCodes.includes((t.code || t).replace('_aka', ''))).length;
                    if (!hasYaku && totalScore < 3900 && aiDoraCount < 2) {
                        if (Math.random() < 0.75) {
                            return null; // Fold! Let Step 2.8/3 pick a safe discard
                        }
                    }

                    // Push discard without Riichi
                    ai.damatenReason = 'bad_wait_push_damaten';
                    ai.prevWaitCount = waitCount;
                    return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'bad_wait_push_damaten' };
                }
            }

            // 2. Wait Improvement (테가와리 개량: 이전에 우형 1종 대기 다마텐 -> 이번에 2종 이상으로 발전!)
            if (wasInDamaten && ai.damatenReason && ai.damatenReason.includes('bad_wait') && waitCount >= 2) {
                // 85% declare Improvement Riichi! (15% stealth if high value)
                if (totalScore >= 7700 || isYakuman) {
                    ai.damatenReason = 'high_value_improved';
                    ai.prevWaitCount = waitCount;
                    return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'improved_damaten_high_value' };
                }
                ai.damatenReason = null;
                return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'improved_wait_riichi' };
            }

            // 3. South Round 1st Place Defense (오라스 1위 굳히기)
            if (isLateSouth && isTopWithLead && hasYaku) {
                if (Math.random() < 0.75) {
                    ai.damatenReason = 'lead_defense';
                    ai.prevWaitCount = waitCount;
                    return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'lead_defense_damaten' };
                } else {
                    ai.damatenReason = null;
                    return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'lead_defense_bold_riichi' };
                }
            }

            // 4. High Value Hands (만관 / 하네만 / 역만 - 야미우치 기습 론)
            if (hasYaku && (isYakuman || totalScore >= 7700 || totalHan >= 4)) {
                let damatenProb = 0.65;
                let damatenTag = 'mangan';
                if (isYakuman) {
                    damatenProb = 0.90;
                    damatenTag = 'yakuman';
                } else if (totalHan >= 6) {
                    damatenProb = 0.80;
                    damatenTag = 'haneman';
                }
                if (Math.random() < damatenProb) {
                    ai.damatenReason = `${damatenTag}_stealth`;
                    ai.prevWaitCount = waitCount;
                    return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: `${damatenTag}_damaten` };
                } else {
                    ai.damatenReason = null;
                    return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: `${damatenTag}_bold_riichi` };
                }
            }

            // 5. Bad Wait (1 wait: Kanchan / Penchan / Tanki) waiting for Ryanmen
            if (waitCount === 1) {
                if (turnsPlayed <= 8) {
                    if (hasYaku) {
                        // 75% Damaten waiting for improvement, 25% declare Riichi
                        if (Math.random() < 0.75) {
                            ai.damatenReason = 'bad_wait_transformation';
                            ai.prevWaitCount = waitCount;
                            return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'bad_wait_transformation' };
                        } else {
                            ai.damatenReason = null;
                            return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'bad_wait_bold_riichi' };
                        }
                    } else {
                        // No yaku without riichi
                        if (turnsPlayed <= 5) {
                            if (Math.random() < 0.60) {
                                ai.damatenReason = 'bad_wait_noyaku_early';
                                ai.prevWaitCount = waitCount;
                                return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'bad_wait_noyaku_early' };
                            } else {
                                ai.damatenReason = null;
                                return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'bad_wait_riichi_create_yaku' };
                            }
                        } else { // turnsPlayed 6~8
                            if (Math.random() < 0.30) {
                                ai.damatenReason = 'bad_wait_noyaku_mid';
                                ai.prevWaitCount = waitCount;
                                return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'bad_wait_noyaku_mid' };
                            } else {
                                ai.damatenReason = null;
                                return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'bad_wait_riichi_create_yaku' };
                            }
                        }
                    }
                } else {
                    // Late turns (9+): running out of time
                    if (hasYaku && Math.random() < 0.50) {
                        ai.damatenReason = 'bad_wait_late_damaten';
                        ai.prevWaitCount = waitCount;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'bad_wait_late_damaten' };
                    } else {
                        ai.damatenReason = null;
                        return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'bad_wait_late_riichi' };
                    }
                }
            }

            // 6. Good Wait Standard (2+ waits): 90% Riichi, 10% surprise stealth Damaten if has Yaku
            if (hasYaku && Math.random() < 0.10) {
                ai.damatenReason = 'surprise_damaten';
                ai.prevWaitCount = waitCount;
                return { action: 'discard', tileIndex: actualIdx, isRiichi: false, reason: 'surprise_damaten' };
            }

            // Default: Declare Riichi!
            ai.damatenReason = null;
            return { action: 'discard', tileIndex: actualIdx, isRiichi: true, reason: 'standard_riichi' };
        }

        // Han-based AI decision making (No Fu calculation during turns; strictly Han & Shanten based)
        processAITurn(aiIdx) {
            if (this.state !== 'AWAIT_DISCARD' || this.currentTurn !== aiIdx) return;
            const ai = this.players[aiIdx];
            // 0. Tutorial forced discard handling
            if (this.tutorialScenario && this.tutorialScenario.forcedDiscards && this.tutorialScenario.forcedDiscards[aiIdx] !== undefined) {
                const forced = this.tutorialScenario.forcedDiscards[aiIdx];
                if (Array.isArray(forced)) {
                    if (forced.length > 0) {
                        const nextItem = forced.shift();
                        const nextCode = (typeof nextItem === 'object' && nextItem !== null) ? nextItem.tile : nextItem;
                        const isRiichi = (typeof nextItem === 'object' && nextItem !== null) ? !!nextItem.isRiichi : false;
                        const fIdx = ai.hand.findIndex(t => (t.code || t) === nextCode);
                        if (fIdx !== -1) {
                            this.discardTile(aiIdx, fIdx, isRiichi);
                            return;
                        }
                    }
                } else {
                    const forcedCode = (typeof forced === 'object' && forced !== null) ? forced.tile : forced;
                    const isRiichi = (typeof forced === 'object' && forced !== null) ? !!forced.isRiichi : false;
                    const fIdx = ai.hand.findIndex(t => (t.code || t) === forcedCode);
                    if (fIdx !== -1) {
                        delete this.tutorialScenario.forcedDiscards[aiIdx];
                        this.discardTile(aiIdx, fIdx, isRiichi);
                        return;
                    }
                }
            }

            // 1. If in Riichi, discard drawn tile immediately (Tsumogiri)
            if (ai.isRiichi) {
                this.discardTile(aiIdx, ai.hand.length - 1);
                return;
            }

            // 1.5 Check if AI can declare Ankan or Kakan
            if (!this.tutorialScenario || this.tutorialScenario.allowAIFuro) {
                const kanOptions = this.getSelfKanOptions(ai);
                if (kanOptions.length > 0) {
                    const opt = kanOptions[0];
                    this.executeSelfKan(aiIdx, opt.tile, opt.type);
                    return;
                }
            }

            // Refresh tenpai discards for the CURRENT hand
            this.updatePlayerTenpai(ai);

            // 2. Tenpai handling: Strategic Riichi vs Damaten vs Chasing Riichi vs Oshihiki Fold
            if (ai.tenpaiDiscards && ai.tenpaiDiscards.length > 0) {
                const decision = this.evaluateAITenpaiDecision(aiIdx);
                if (decision) {
                    this.discardTile(aiIdx, decision.tileIndex, decision.isRiichi);
                    return;
                }
                // If decision returned null (e.g. threatened by opponent's Riichi with cheap/bad wait,
                // and chose to fold rather than push), clear damaten state and fall through to defense (step 2.8/3)!
                ai.damatenReason = null;
            }

            // 2.8. Defense against Opponents' Riichi (Human-like variance with 75% defense rate)
            const riichiOpponents = this.players.filter((p, pIdx) => pIdx !== aiIdx && p.isRiichi);
            const hasRiichiThreat = riichiOpponents.length > 0;

            const doraCodes = this.doraIndicators ? this.doraIndicators.map(d => MahjongScoring.getDoraTile(d)) : [];
            const aiDoraCount = ai.hand.filter(t => t.isAka || doraCodes.includes((t.code || t).replace('_aka', ''))).length;
            // Greed Push: If holding 2+ Dora, 40% chance to push greedily despite Riichi!
            const isGreedy = (aiDoraCount >= 2 && Math.random() < 0.40);
            // Defend with 75% probability if under threat and not being greedy (25% human-like lapse/risk)
            const isDefending = hasRiichiThreat && !isGreedy && (Math.random() < 0.75);

            // Collect safe tiles (Genbutsu: 100% safe in Riichi opponent's river)
            let riichiDiscards = new Set();
            if (hasRiichiThreat) {
                for (const opp of riichiOpponents) {
                    const src = (opp.allDiscards && opp.allDiscards.length > 0) ? opp.allDiscards : opp.discards;
                    for (const d of src) {
                        const dCode = (d.tile?.code || d.code || d.tile || d).replace('_aka', '');
                        riichiDiscards.add(dCode);
                    }
                }
            }

            // Visible tiles count across the entire table
            const visibleTileCounts = {};
            for (const p of this.players) {
                for (const d of p.discards) {
                    const c = (d.tile?.code || d.code || d.tile || d).replace('_aka', '');
                    visibleTileCounts[c] = (visibleTileCounts[c] || 0) + 1;
                }
                for (const m of p.melds) {
                    for (const t of m.tiles) {
                        const c = (t.code || t).replace('_aka', '');
                        visibleTileCounts[c] = (visibleTileCounts[c] || 0) + 1;
                    }
                }
            }
            if (this.doraIndicators) {
                for (const ind of this.doraIndicators) {
                    const c = ind.replace('_aka', '');
                    visibleTileCounts[c] = (visibleTileCounts[c] || 0) + 1;
                }
            }

            // 3. Han-based smart discard: minimize shanten, protect Dora, keep Yakuhai/Tanyao/Honitsu
            let bestDiscardIdx = ai.hand.length - 1;
            let minScore = 999999;

            const yakumanAim = this.getYakumanAim(ai);
            const flushAim = yakumanAim ? null : this.getFlushAim(ai);

            for (let i = 0; i < ai.hand.length; i++) {
                const tile = ai.hand[i];
                const code = (tile.code || tile).replace('_aka', '');

                // Kuikae prevention: cannot discard the tile just called for Pon this turn
                if (ai.forbiddenDiscards && ai.forbiddenDiscards.includes(code)) {
                    continue;
                }

                const testHand = ai.hand.map(t => t.code);
                testHand.splice(i, 1);
                const shanten = MahjongLogic.calculateShanten(testHand, ai.melds.length);

                // Base score from Shanten: 2000 per shanten step guarantees that reducing shanten
                // strictly overrides Dora preservation (400~500pts).
                let discardScore = shanten * 2000;

                // --- Defense adjustments against Riichi ---
                if (isDefending) {
                    // 1. Genbutsu (100% safe tile in Riichi player's river): strong priority to discard
                    if (riichiDiscards.has(code)) {
                        discardScore -= 3500;
                    }
                    // 2. Honors with 2 or more visible on table (very safe against ron)
                    else if (code.endsWith('z')) {
                        const seen = (visibleTileCounts[code] || 0) + ai.hand.filter(t => t.code.replace('_aka', '') === code).length;
                        if (seen >= 3) {
                            discardScore -= 2500;
                        } else if (seen === 2) {
                            discardScore -= 1200;
                        }
                    }
                    // 3. Suji (筋) estimation: if 4 is in river, 1 and 7 have reduced risk (can be trapped by kanchan/tanki!)
                    else {
                        const val = parseInt(code[0], 10);
                        const s = code.slice(-1);
                        let isSuji = false;
                        if (val === 1 && riichiDiscards.has(`4${s}`)) isSuji = true;
                        if (val === 9 && riichiDiscards.has(`6${s}`)) isSuji = true;
                        if (val === 2 && riichiDiscards.has(`5${s}`)) isSuji = true;
                        if (val === 8 && riichiDiscards.has(`5${s}`)) isSuji = true;
                        if (val === 3 && riichiDiscards.has(`6${s}`)) isSuji = true;
                        if (val === 7 && riichiDiscards.has(`4${s}`)) isSuji = true;

                        if (isSuji) {
                            discardScore -= 1000;
                        } else if (val >= 4 && val <= 6) {
                            discardScore += 800; // Dangerous unsugi middle tiles
                        }
                    }
                }

                // Yakuman aim handling: absolute priority over normal heuristics
                if (yakumanAim) {
                    if (yakumanAim.type === 'kokushi') {
                        const kokushiTiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];
                        const isYaochuu = kokushiTiles.includes(code);
                        if (!isYaochuu) {
                            // Middle suited tiles (2-8) MUST be discarded immediately!
                            discardScore -= 1200;
                        } else {
                            // Yaochuu: check if redundant duplicate
                            const sameCodeCount = ai.hand.filter(t => (t.code || t).replace('_aka', '') === code).length;
                            let otherPairs = 0;
                            for (const kt of kokushiTiles) {
                                if (kt !== code) {
                                    const cnt = ai.hand.filter(t => (t.code || t).replace('_aka', '') === kt).length;
                                    if (cnt >= 2) otherPairs++;
                                }
                            }
                            if (sameCodeCount >= 2 && otherPairs > 0) {
                                discardScore -= 200; // Redundant duplicate
                            } else {
                                discardScore += 1500; // Protect unique yaochuu or the sole pair
                            }
                        }
                    } else if (yakumanAim.type === 'suuankou') {
                        const countInHand = ai.hand.filter(t => (t.code || t).replace('_aka', '') === code).length;
                        if (countInHand >= 3) {
                            discardScore += 2000; // Strictly protect concealed triplets
                        }
                    } else if (yakumanAim.type === 'daisangen') {
                        const isDragon = (code === '5z' || code === '6z' || code === '7z');
                        if (isDragon) {
                            discardScore += 2000; // Strictly protect Dragons
                        } else {
                            discardScore -= 400; // Prefer discarding non-dragons
                        }
                    } else if (yakumanAim.type === 'suushii') {
                        const isWind = (code === '1z' || code === '2z' || code === '3z' || code === '4z');
                        if (isWind) {
                            discardScore += 1800; // Strictly protect Winds
                        } else {
                            discardScore -= 400; // Prefer discarding non-winds
                        }
                    } else if (yakumanAim.type === 'tsuuiisou') {
                        if (code.endsWith('z')) {
                            discardScore += 1800; // Strictly protect Honors
                        } else {
                            discardScore -= 800; // Strongly discard Suited tiles
                        }
                    } else if (yakumanAim.type === 'ryuuiisou') {
                        const greenTiles = ['2s', '3s', '4s', '6s', '8s', '6z'];
                        if (greenTiles.includes(code)) {
                            discardScore += 1800; // Strictly protect Green tiles
                        } else {
                            discardScore -= 800; // Strongly discard Non-green tiles
                        }
                    }
                }

                // Heavily protect Dora (giving up dora reduces Han!)
                if (tile.isAka) discardScore += 500;
                if (doraCodes.includes(code)) discardScore += 400;

                // Protect Yakuhai pairs (Dragons, Seat/Round wind)
                const isYakuhai = (code === '5z' || code === '6z' || code === '7z' || code === ai.wind || code === this.roundWind);
                const countOfTile = ai.hand.filter(t => t.code.replace('_aka', '') === code.replace('_aka', '')).length;
                if (isYakuhai && countOfTile >= 2) {
                    discardScore += 250;
                }

                // Honitsu / Chinitsu aim handling: discard off-suit tiles first!
                if (flushAim) {
                    const tileSuit = code.slice(-1);
                    if (tileSuit !== 'z' && tileSuit !== flushAim.suit) {
                        // Other suits MUST be discarded first! Heavily prioritize discarding other suits
                        discardScore -= 500;
                    } else if (flushAim.type === 'chinitsu' && tileSuit === 'z') {
                        // Chinitsu aims for pure suit, discard honors early
                        discardScore -= 300;
                    } else {
                        // Protect the target suit tiles and honors
                        discardScore += 600;
                    }
                }

                // Prefer discarding isolated guest winds (not seat, not round)
                if (code.endsWith('z') && countOfTile === 1 && !isYakuhai && (!flushAim || flushAim.type === 'chinitsu')) {
                    discardScore -= 80;
                }

                // Prefer discarding isolated terminals (1, 9 without 2, 8 neighbors)
                if ((code[0] === '1' || code[0] === '9') && countOfTile === 1 && (!flushAim || code.slice(-1) !== flushAim.suit)) {
                    const num = parseInt(code[0]);
                    const suit = code[1];
                    const neighbor = num === 1 ? `2${suit}` : `8${suit}`;
                    const hasNeighbor = ai.hand.some(t => t.code.replace('_aka', '') === neighbor.replace('_aka', ''));
                    if (!hasNeighbor) {
                        discardScore -= 40;
                    }
                }

                if (discardScore < minScore) {
                    minScore = discardScore;
                    bestDiscardIdx = i;
                }
            }

            this.discardTile(aiIdx, bestDiscardIdx, false);
        }

        // Conditional AI Pon: ONLY Pon if it furthers a valid open Yaku
        shouldAIPon(aiIdx, tile) {
            const player = this.players[aiIdx];
            const melds = player.melds || [];
            const isMenzen = melds.every(m => m.type === 'ankan');
            const code = (tile.code || tile).replace('_aka', '');
            const pairCount = player.hand.filter(t => t.code.replace('_aka', '') === code.replace('_aka', '')).length;

            if (pairCount < 2) return false;

            const isSuit = (code[1] !== 'z');
            const val = isSuit ? parseInt(code[0], 10) : 0;
            const suit = isSuit ? code[1] : '';
            const hCodes = player.hand.map(t => t.code.replace('_aka', ''));

            // -------------------------------------------------------------
            // Evaluate Dora Power ("속공 펀치" 타점 계산)
            // -------------------------------------------------------------
            const doraCodes = this.doraIndicators ? this.doraIndicators.map(d => MahjongScoring.getDoraTile(d)) : [];
            const isTileDora = tile.isAka || doraCodes.includes(code);
            const handDoraCount = player.hand.filter(t => t.isAka || doraCodes.includes(t.code.replace('_aka', ''))).length;
            const totalDora = handDoraCount + (isTileDora ? 1 : 0);

            // -------------------------------------------------------------
            // Evaluate Guaranteed Yaku (확정역 존재 여부)
            // -------------------------------------------------------------
            const isDragon = (code === '5z' || code === '6z' || code === '7z');
            const isSeatWind = (code === player.wind);
            const isRoundWind = (code === this.roundWind);
            const isYakuhaiTile = (isDragon || isSeatWind || isRoundWind);

            // -------------------------------------------------------------
            // Evaluate Yakuman Aim (역만 지향 여부)
            // -------------------------------------------------------------
            const yakumanAim = this.getYakumanAim(player);
            if (yakumanAim) {
                if (yakumanAim.type === 'kokushi' || yakumanAim.type === 'suuankou') {
                    return false; // Menzen Yakuman: 100% reject Pon!
                }
                if (yakumanAim.type === 'daisangen') {
                    if (code === '5z' || code === '6z' || code === '7z') {
                        return pairCount >= 2; // Always Pon Dragons!
                    }
                    return false; // Reject anything else
                }
                if (yakumanAim.type === 'suushii') {
                    if (code === '1z' || code === '2z' || code === '3z' || code === '4z') {
                        return pairCount >= 2; // Always Pon Winds!
                    }
                    return false;
                }
                if (yakumanAim.type === 'tsuuiisou') {
                    if (code.endsWith('z')) {
                        return pairCount >= 2; // Always Pon Honors!
                    }
                    return false;
                }
                if (yakumanAim.type === 'ryuuiisou') {
                    const greenTiles = ['2s', '3s', '4s', '6s', '8s', '6z'];
                    if (greenTiles.includes(code)) {
                        return pairCount >= 2;
                    }
                    return false;
                }
            }

            // Flush Aim Conflict Check: If aiming for flush, never Pon off-suit tiles
            const flushAim = this.getFlushAim(player);
            if (flushAim) {
                if (flushAim.type === 'chinitsu' && (!isSuit || suit !== flushAim.suit)) {
                    return false; // Chinitsu rejects all honors and off-suits
                }
                if (flushAim.type === 'honitsu' && isSuit && suit !== flushAim.suit) {
                    return false; // Honitsu rejects off-suits (honors allowed)
                }
            }

            // 1. Yakuhai Tile: Pon creates an immediate guaranteed 1-Han Yaku!
            // This is the #1 standard speed-up mechanic in Mahjong.
            if (isYakuhaiTile) {
                if (pairCount === 2) {
                    if (flushAim && flushAim.type === 'chinitsu') return false;
                    return true; // Always Pon Yakuhai pairs!
                }
                if (pairCount >= 3) return false; // Anko of Yakuhai cannot form sequence (reject Kuikae / keep Anko)
            }

            // Check if player already has an established open Yakuhai meld
            const hasYakuhaiMeld = melds.some(m => {
                const mCode = m.tile || (m.tiles[0] && m.tiles[0].code);
                return mCode === '5z' || mCode === '6z' || mCode === '7z' || mCode === player.wind || mCode === this.roundWind;
            });

            // Check if player holds another Yakuhai pair in hand (guaranteed Yaku in hand)
            const hasYakuhaiPairInHand = player.hand.some(t => {
                const c = t.code.replace('_aka', '');
                if (c === code) return false;
                const isY = (c === '5z' || c === '6z' || c === '7z' || c === player.wind || c === this.roundWind);
                return isY && player.hand.filter(x => x.code.replace('_aka', '') === c).length >= 2;
            });

            const hasConfirmedYaku = (hasYakuhaiMeld || hasYakuhaiPairInHand);

            // -------------------------------------------------------------
            // Rule A: Protection of Menzen Shapes (Iipeikou / Pinfu / Ryanmen)
            // -------------------------------------------------------------
            if (isSuit && pairCount === 2) {
                const hasBelow = (val >= 2 && hCodes.includes(`${val - 1}${suit}`));
                const hasAbove = (val <= 8 && hCodes.includes(`${val + 1}${suit}`));

                // High-value speed attack exception:
                // If this tile is a Dora (or total Dora >= 2) AND player has a confirmed Yaku,
                // the speed & heavy score (3900~8000pts) outweighs waiting for Menzen Pinfu/Iipeikou!
                const isDoraSpeedAttack = (isTileDora || totalDora >= 2) && (hasConfirmedYaku || (val >= 2 && val <= 8));

                // 1. Sandwich/Wing shapes like 1 2 2 3, 2 3 3 4, 3 4 4 5:
                if (hasBelow && hasAbove) {
                    if (!isDoraSpeedAttack || !hasConfirmedYaku) {
                        return false;
                    }
                }

                // 2. Pair attached to Ryanmen/Penchan like 2 2 3 or 1 2 2:
                if (isMenzen && (hasBelow || hasAbove)) {
                    if (!isDoraSpeedAttack && !flushAim) {
                        // Check Toitoi: only consider if hand has 4+ pairs/triplets
                        let pairs = 0;
                        const counts = {};
                        for (const c of hCodes) counts[c] = (counts[c] || 0) + 1;
                        for (const c in counts) if (counts[c] >= 2) pairs++;
                        if (pairs < 4) {
                            return false; // Protect Menzen sequence/Iipeikou potential!
                        }
                    }
                }
            }

            // -------------------------------------------------------------
            // Rule B: Handling 3 matching tiles in hand (Anko)
            // -------------------------------------------------------------
            if (pairCount >= 3) {
                if (!isSuit) return false;
                if (isMenzen) return false;

                const remainingHandCodes = [];
                let removedCount = 0;
                for (const t of player.hand) {
                    const c = t.code.replace('_aka', '');
                    if (c === code && removedCount < 2) {
                        removedCount++;
                    } else {
                        remainingHandCodes.push(c);
                    }
                }

                const hasSeq = (
                    (val >= 3 && remainingHandCodes.includes(`${val - 2}${suit}`) && remainingHandCodes.includes(`${val - 1}${suit}`)) ||
                    (val >= 2 && val <= 8 && remainingHandCodes.includes(`${val - 1}${suit}`) && remainingHandCodes.includes(`${val + 1}${suit}`)) ||
                    (val <= 7 && remainingHandCodes.includes(`${val + 1}${suit}`) && remainingHandCodes.includes(`${val + 2}${suit}`))
                );

                if (!hasSeq) {
                    return false;
                }
            }

            // -------------------------------------------------------------
            // Rule C: Valid Open Yaku Verification
            // -------------------------------------------------------------
            // 1. Already has an established Yakuhai meld or holds a Yakuhai pair in hand
            if (hasConfirmedYaku) {
                return true;
            }

            // 2. Tanyao (단요구): all 2~8 suits
            const isTanyaoTile = (isSuit && code[0] !== '1' && code[0] !== '9');
            if (isTanyaoTile) {
                const nonTanyaoCount = player.hand.filter(t => t.code[1] === 'z' || t.code[0] === '1' || t.code[0] === '9').length;
                if (nonTanyaoCount <= 1) { // 1 non-tanyao tile can be discarded right after Pon
                    if (!isMenzen) return true; // Already open: open Tanyao is fine

                    // In Menzen: allow Tanyao Pon if high Dora (speed attack punch: 2+ dora) or already at 1-shanten
                    const shanten = MahjongLogic.calculateShanten(player.hand.map(t => t.code), melds.length);
                    if (totalDora >= 2 || (shanten <= 1 && totalDora >= 1)) {
                        return true;
                    }
                }
            }

            // 3. Honitsu / Chinitsu (일색계 지향)
            if (flushAim) {
                const tileSuit = code.slice(-1);
                if (flushAim.type === 'chinitsu') {
                    if (tileSuit === flushAim.suit && pairCount === 2) {
                        return true;
                    }
                } else if (flushAim.type === 'honitsu') {
                    if ((tileSuit === flushAim.suit || tileSuit === 'z') && pairCount === 2) {
                        return true;
                    }
                }
            }

            // 4. Toitoi (또이또이 / 대대화): 4+ pairs/triplets in hand
            let pairs = 0;
            const counts = {};
            for (const t of player.hand) {
                const c = t.code.replace('_aka', '');
                counts[c] = (counts[c] || 0) + 1;
            }
            for (const c in counts) {
                if (counts[c] >= 2) pairs++;
            }
            if (pairs >= 4 && counts[code] >= 2) {
                return true;
            }

            // Otherwise: REJECT to keep Menzen and aim for Riichi / Pinfu / Iipeikou
            return false;
        }

        // Conditional AI Daiminkan: Strictly preserve concealed triplets (Anko) unless already open with good reason
        shouldAIDaiminkan(aiIdx, tile) {
            const player = this.players[aiIdx];
            const melds = player.melds || [];
            const code = (tile.code || tile).replace('_aka', '');

            // 1. If Menzen (no open melds), NEVER Daiminkan: keep Anko for Riichi, defense, Sanankou, or Ankan
            const isOpen = melds.some(m => m.type !== 'ankan');
            if (!isOpen) {
                return false;
            }

            const yakumanAim = this.getYakumanAim(player);
            if (yakumanAim) {
                if (yakumanAim.type === 'kokushi' || yakumanAim.type === 'suuankou') {
                    return false;
                }
                if (yakumanAim.type === 'daisangen') {
                    return (code === '5z' || code === '6z' || code === '7z');
                }
                if (yakumanAim.type === 'suushii') {
                    return (code === '1z' || code === '2z' || code === '3z' || code === '4z');
                }
                if (yakumanAim.type === 'tsuuiisou') {
                    return code.endsWith('z');
                }
                if (yakumanAim.type === 'ryuuiisou') {
                    return ['2s', '3s', '4s', '6s', '8s', '6z'].includes(code);
                }
            }

            const flushAim = this.getFlushAim(player);
            if (flushAim) {
                const s = code.slice(-1);
                if (flushAim.type === 'chinitsu' && s !== flushAim.suit) return false;
                if (flushAim.type === 'honitsu' && s !== flushAim.suit && s !== 'z') return false;
            }

            // 2. If already open, only Kan if it is Yakuhai (guaranteed han) or going for Toitoi
            const isDragon = (code === '5z' || code === '6z' || code === '7z');
            const isSeatWind = (code === player.wind);
            const isRoundWind = (code === this.roundWind);
            const isYakuhai = (isDragon || isSeatWind || isRoundWind);

            let pairs = 0;
            const counts = {};
            for (const t of player.hand) {
                const c = t.code.replace('_aka', '');
                counts[c] = (counts[c] || 0) + 1;
            }
            for (const c in counts) {
                if (counts[c] >= 2) pairs++;
            }
            const isToitoiAim = (pairs >= 2 && melds.every(m => m.type === 'pon' || m.type === 'kan' || m.type === 'kakan' || m.type === 'ankan'));

            if (isYakuhai || isToitoiAim) {
                return true;
            }

            return false;
        }

        // Conditional AI Chi: ONLY Chi if it furthers a valid open Yaku AND strictly advances shanten
        shouldAIChi(aiIdx, tile, chiOptions) {
            const player = this.players[aiIdx];
            if (!chiOptions || chiOptions.length === 0) return null;
            const melds = player.melds || [];
            const isMenzen = melds.every(m => m.type === 'ankan');
            const tileCode = (tile.code || tile).replace('_aka', '');

            // Current shanten before Chi
            const currentShanten = MahjongLogic.calculateShanten(player.hand.map(t => t.code), melds.length);

            // Kuikae & Shanten progression validator:
            // Ensures AI only calls Chi if it strictly advances shanten AND has a legal non-Kuikae discard!
            const isValidAndAdvancingChi = (opt) => {
                // If player already holds the complete sequence (opt[0] + opt[1] + tileCode) in hand,
                // calling Chi is completely redundant and leaves an unusable tile trapped under Kuikae!
                const handCodes = player.hand.map(t => (t.code || t).replace('_aka', ''));
                const opt0 = (opt[0].code || opt[0]).replace('_aka', '');
                const opt1 = (opt[1].code || opt[1]).replace('_aka', '');
                if (handCodes.includes(tileCode) && handCodes.includes(opt0) && handCodes.includes(opt1)) {
                    return false;
                }

                const forbidden = MahjongLogic.getKuikaeForbiddenDiscards(tileCode, opt);

                // Hand after removing the 2 tiles used in opt
                const simHand = [...handCodes];
                for (const c of [opt0, opt1]) {
                    const idx = simHand.indexOf(c);
                    if (idx !== -1) {
                        simHand.splice(idx, 1);
                    } else {
                        return false;
                    }
                }

                // If after Chi, all remaining hand tiles are forbidden discards, Chi is illegal
                const legalDiscards = simHand.filter(c => !forbidden.includes(c));
                if (legalDiscards.length === 0) return false;

                // Evaluate best post-Chi shanten across all legal discards
                let bestPostShanten = 999;
                const evaluated = new Set();
                for (let i = 0; i < simHand.length; i++) {
                    const discardCode = simHand[i];
                    if (forbidden.includes(discardCode)) continue;
                    if (evaluated.has(discardCode)) continue;
                    evaluated.add(discardCode);

                    const testHand = [...simHand];
                    testHand.splice(i, 1);
                    const sh = MahjongLogic.calculateShanten(testHand, melds.length + 1);
                    if (sh < bestPostShanten) {
                        bestPostShanten = sh;
                    }
                }

                // Chi must strictly reduce shanten to justify opening the hand!
                return bestPostShanten < currentShanten;
            };

            const yakumanAim = this.getYakumanAim(player);
            if (yakumanAim) {
                if (yakumanAim.type === 'ryuuiisou') {
                    const greenTiles = ['2s', '3s', '4s', '6s', '8s', '6z'];
                    if (greenTiles.includes(tileCode)) {
                        for (const opt of chiOptions) {
                            if (opt.every(c => greenTiles.includes((c.code || c).replace('_aka', '')))) {
                                if (isValidAndAdvancingChi(opt)) return opt;
                            }
                        }
                    }
                }
                return null; // All other Yakumans strictly reject Chi!
            }

            const hasYakuhaiMeld = melds.some(m => {
                const mCode = m.tile || (m.tiles[0] && m.tiles[0].code);
                return mCode === '5z' || mCode === '6z' || mCode === '7z' || mCode === player.wind || mCode === this.roundWind;
            });

            const hasYakuhaiPairInHand = player.hand.some(t => {
                const c = t.code.replace('_aka', '');
                const isY = (c === '5z' || c === '6z' || c === '7z' || c === player.wind || c === this.roundWind);
                return isY && player.hand.filter(x => x.code.replace('_aka', '') === c).length >= 2;
            });

            const hasConfirmedYaku = (hasYakuhaiMeld || hasYakuhaiPairInHand);

            const doraCodes = this.doraIndicators ? this.doraIndicators.map(d => MahjongScoring.getDoraTile(d)) : [];
            const isTileDora = tile.isAka || doraCodes.includes(tileCode);
            const handDoraCount = player.hand.filter(t => t.isAka || doraCodes.includes(t.code.replace('_aka', ''))).length;
            const totalDora = handDoraCount + (isTileDora ? 1 : 0);

            // Honitsu / Chinitsu Chi handling
            const flushAim = this.getFlushAim(player);
            if (flushAim) {
                const tileSuit = tileCode.slice(-1);
                if (tileSuit === flushAim.suit) {
                    for (const opt of chiOptions) {
                        const optSuit0 = (opt[0].code || opt[0]).replace('_aka', '').slice(-1);
                        const optSuit1 = (opt[1].code || opt[1]).replace('_aka', '').slice(-1);
                        if (optSuit0 === flushAim.suit && optSuit1 === flushAim.suit) {
                            if (isValidAndAdvancingChi(opt)) return opt;
                        }
                    }
                }
                return null;
            }

            // If in Menzen without confirmed Yakuhai, only Chi for Tanyao if high Dora speed attack (2+ dora)
            if (isMenzen && !hasConfirmedYaku) {
                const isTanyaoTile = (tileCode[1] !== 'z' && tileCode[0] !== '1' && tileCode[0] !== '9');
                const nonTanyaoCount = player.hand.filter(t => t.code[1] === 'z' || t.code[0] === '1' || t.code[0] === '9').length;
                if (!isTanyaoTile || nonTanyaoCount > 1) return null;

                if (totalDora < 2 && currentShanten > 1) {
                    return null; // Keep Menzen for Riichi / Pinfu / Iipeikou!
                }
            }

            const isTanyaoTile = (tileCode[1] !== 'z' && tileCode[0] !== '1' && tileCode[0] !== '9');
            const nonTanyaoCount = player.hand.filter(t => t.code[1] === 'z' || t.code[0] === '1' || t.code[0] === '9').length;
            const isTanyaoAim = isTanyaoTile && (nonTanyaoCount <= 1);

            if (hasConfirmedYaku || isTanyaoAim) {
                for (const opt of chiOptions) {
                    const opt0Code = (opt[0].code || opt[0]).replace('_aka', '');
                    const opt1Code = (opt[1].code || opt[1]).replace('_aka', '');
                    if (isTanyaoAim && !hasConfirmedYaku) {
                        if (opt0Code[0] === '1' || opt0Code[0] === '9' || opt1Code[0] === '1' || opt1Code[0] === '9') continue;
                    }
                    if (isValidAndAdvancingChi(opt)) {
                        return opt;
                    }
                }
            }

            return null;
        }
    }

    MahjongLogic.MahjongGame = MahjongGame;
    global.MahjongLogic = MahjongLogic;
})(window);

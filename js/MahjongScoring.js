/**
 * MahjongScoring.js
 * Comprehensive Korean Riichi Mahjong (KML standard) scoring and yaku engine.
 * Calculates yaku, fu, han, and final point distribution.
 */

(function (global) {
    const MahjongScoring = {};

    // Helper: Map dora indicator to next tile
    function getDoraTile(indicator) {
        const type = indicator.slice(-1);
        const val = parseInt(indicator[0], 10);
        if (type === 'm' || type === 'p' || type === 's') {
            const nextVal = (val % 9) + 1;
            return `${nextVal}${type}`;
        }
        if (type === 'z') {
            if (val >= 1 && val <= 4) {
                // East -> South -> West -> North -> East
                const nextVal = (val % 4) + 1;
                return `${nextVal}z`;
            }
            if (val >= 5 && val <= 7) {
                // White (5) -> Green (6) -> Red (7) -> White (5)
                const nextVal = val === 7 ? 5 : val + 1;
                return `${nextVal}z`;
            }
        }
        return indicator;
    }
    MahjongScoring.getDoraTile = getDoraTile;

    // Helper: Tile counts map
    function countTiles(tiles) {
        const counts = {};
        for (const t of tiles) {
            let code = t.code || t;
            code = code.replace('_aka', ''); // Strip aka to group correctly for shuntsu
            counts[code] = (counts[code] || 0) + 1;
        }
        return counts;
    }

    // Helper: Check if tile is terminal (1 or 9) or honor (z)
    function isYaochuu(tileCode) {
        const type = tileCode.slice(-1);
        const val = parseInt(tileCode[0], 10);
        return type === 'z' || val === 1 || val === 9;
    }

    function isTerminal(tileCode) {
        const type = tileCode.slice(-1);
        const val = parseInt(tileCode[0], 10);
        return (type === 'm' || type === 'p' || type === 's') && (val === 1 || val === 9);
    }

    function isHonor(tileCode) {
        return tileCode.endsWith('z');
    }

    function isGreen(tileCode) {
        return ['2s', '3s', '4s', '6s', '8s', '6z'].includes(tileCode);
    }

    // Find all valid standard decompositions: 4 sets (shuntsu/koutsu) + 1 pair
    function findStandardDecompositions(tiles14) {
        const counts = countTiles(tiles14);
        const uniqueTiles = Object.keys(counts).sort();
        const results = [];
        const requiredSets = Math.floor(tiles14.length / 3);

        function backtrack(cMap, sets, pair) {
            // Find first tile with count > 0
            let firstTile = null;
            for (const t of uniqueTiles) {
                if (cMap[t] > 0) {
                    firstTile = t;
                    break;
                }
            }

            if (!firstTile) {
                if (sets.length === requiredSets && pair) {
                    results.push({ sets: [...sets], pair });
                }
                return;
            }

            // Try pair if not set yet
            if (!pair && cMap[firstTile] >= 2) {
                cMap[firstTile] -= 2;
                backtrack(cMap, sets, firstTile);
                cMap[firstTile] += 2;
            }

            // Try Koutsu (Triplet)
            if (cMap[firstTile] >= 3) {
                cMap[firstTile] -= 3;
                sets.push({ type: 'koutsu', tile: firstTile, tiles: [firstTile, firstTile, firstTile] });
                backtrack(cMap, sets, pair);
                sets.pop();
                cMap[firstTile] += 3;
            }

            // Try Shuntsu (Sequence) - only for m, p, s
            const type = firstTile.slice(-1);
            const val = parseInt(firstTile[0], 10);
            if (type !== 'z' && val <= 7) {
                const t2 = `${val + 1}${type}`;
                const t3 = `${val + 2}${type}`;
                if ((cMap[t2] || 0) > 0 && (cMap[t3] || 0) > 0) {
                    cMap[firstTile]--;
                    cMap[t2]--;
                    cMap[t3]--;
                    sets.push({ type: 'shuntsu', tile: firstTile, tiles: [firstTile, t2, t3] });
                    backtrack(cMap, sets, pair);
                    sets.pop();
                    cMap[firstTile]++;
                    cMap[t2]++;
                    cMap[t3]++;
                }
            }
        }

        backtrack({ ...counts }, [], null);
        return results;
    }

    // Check Kokushi Musou (13 Orphans)
    function checkKokushi(tiles14) {
        const kokushiTiles = ['1m', '9m', '1p', '9p', '1s', '9s', '1z', '2z', '3z', '4z', '5z', '6z', '7z'];
        const counts = countTiles(tiles14);
        let pairFound = false;
        for (const t of kokushiTiles) {
            const c = counts[t] || 0;
            if (c === 0) return null;
            if (c === 2) {
                if (pairFound) return null;
                pairFound = true;
            } else if (c > 2) {
                return null;
            }
        }
        return pairFound ? { isKokushi: true } : null;
    }

    // Check Chiitoitsu (Seven Pairs)
    function checkChiitoitsu(tiles14) {
        const counts = countTiles(tiles14);
        const keys = Object.keys(counts);
        if (keys.length === 7 && keys.every(k => counts[k] === 2)) {
            return { isChiitoitsu: true, pairs: keys };
        }
        return null;
    }

    // Check Chuuren Poutou (Nine Gates)
    function checkChuuren(tiles14) {
        const suits = ['m', 'p', 's'];
        for (const s of suits) {
            const counts = {};
            let isSuit = true;
            for (const t of tiles14) {
                if (!t.endsWith(s)) {
                    isSuit = false;
                    break;
                }
                const v = parseInt(t[0], 10);
                counts[v] = (counts[v] || 0) + 1;
            }
            if (!isSuit) continue;

            // Pattern: 111 2345678 999 + any 1~9
            if ((counts[1] || 0) < 3 || (counts[9] || 0) < 3) continue;
            let ok = true;
            for (let v = 2; v <= 8; v++) {
                if ((counts[v] || 0) < 1) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                return { isChuuren: true, suit: s };
            }
        }
        return null;
    }

    /**
     * Score hand and check all Riichi Mahjong Yaku
     * @param {Object} params
     *   - handTiles: Array of Tile objects { code, isAka } (concealed part)
     *   - melds: Array of Melds { type: 'chi'|'pon'|'kan'|'ankan', tiles: [tileCodes] }
     *   - winningTile: { code, isAka }
     *   - isTsumo: boolean
     *   - isRiichi: boolean
     *   - isDoubleRiichi: boolean
     *   - isIppatsu: boolean
     *   - isHaitei: boolean (last tile of wall)
     *   - isHoutei: boolean (last discard)
     *   - isRinshan: boolean (dead wall draw after kan)
     *   - isChankan: boolean (robbed kan)
     *   - isTenhou: boolean (dealer opening tsumo)
     *   - isChiihou: boolean (non-dealer opening tsumo)
     *   - seatWind: '1z' | '2z' | '3z' | '4z'
     *   - roundWind: '1z' | '2z' | '3z' | '4z'
     *   - doraIndicators: Array of tileCodes
     *   - uraDoraIndicators: Array of tileCodes (if riichi)
     */
    MahjongScoring.calculateScore = function (params) {
        const {
            handTiles,
            melds = [],
            winningTile: rawWinningTile,
            isTsumo = false,
            isRiichi = false,
            isDoubleRiichi = false,
            isIppatsu = false,
            isHaitei = false,
            isHoutei = false,
            isRinshan = false,
            isChankan = false,
            isTenhou = false,
            isChiihou = false,
            seatWind = '1z',
            roundWind = '1z',
            doraIndicators = [],
            uraDoraIndicators = [],
            isDealer = false,
            honba = 0
        } = params;

        const winningTile = (rawWinningTile.code || rawWinningTile).replace('_aka', '');

        // Is Menzenchin (Concealed hand)
        const isMenzen = melds.every(m => m.type === 'ankan');

        // All 14 tile codes (strip aka for yaku evaluation)
        const allTileCodes = [...handTiles.map(t => (t.code || t).replace('_aka', ''))];
        for (const m of melds) {
            for (const c of m.tiles) {
                allTileCodes.push((c.code || c).replace('_aka', ''));
            }
        }

        // Count all tiles including aka
        let totalAkaCount = 0;
        for (const t of handTiles) {
            if (t.isAka) totalAkaCount++;
        }
        for (const m of melds) {
            for (const t of m.tiles) {
                if (t.isAka) totalAkaCount++;
            }
        }

        // Calculate Dora
        const doraTiles = doraIndicators.map(getDoraTile);
        const uraTiles = isRiichi ? uraDoraIndicators.map(getDoraTile) : [];

        let regularDoraCount = 0;
        let uraDoraCount = 0;

        for (const c of allTileCodes) {
            for (const dt of doraTiles) {
                if (c === dt) regularDoraCount++;
            }
            for (const ut of uraTiles) {
                if (c === ut) uraDoraCount++;
            }
        }

        // 1. Check Special Yakuman (Kokushi, Chuuren, Tenhou, Chiihou)
        if (isTenhou && isDealer) {
            return buildYakumanResult(['천화'], 1, isDealer, isTsumo, honba, regularDoraCount, uraDoraCount, totalAkaCount);
        }
        if (isChiihou && !isDealer) {
            return buildYakumanResult(['지화'], 1, isDealer, isTsumo, honba, regularDoraCount, uraDoraCount, totalAkaCount);
        }

        if (isMenzen) {
            const kokushi = checkKokushi(allTileCodes);
            if (kokushi) {
                // Kokushi 13-wait check: was winningTile the paired tile or single wait?
                // Hand without winningTile:
                const handWithoutWin = [...allTileCodes];
                handWithoutWin.splice(handWithoutWin.indexOf(winningTile), 1);
                const countsBefore = countTiles(handWithoutWin);
                const is13Wait = Object.keys(countsBefore).length === 13;
                const yakuName = is13Wait ? '국사무쌍 13면대기' : '국사무쌍';
                return buildYakumanResult([yakuName], is13Wait ? 2 : 1, isDealer, isTsumo, honba, regularDoraCount, uraDoraCount, totalAkaCount);
            }

            const chuuren = checkChuuren(allTileCodes);
            if (chuuren) {
                const handWithoutWin = [...allTileCodes];
                handWithoutWin.splice(handWithoutWin.indexOf(winningTile), 1);
                const counts = countTiles(handWithoutWin);
                const isPure9 = (counts[`1${chuuren.suit}`] === 3) && (counts[`9${chuuren.suit}`] === 3);
                const yakuName = isPure9 ? '순정 구련보등' : '구련보등';
                return buildYakumanResult([yakuName], isPure9 ? 2 : 1, isDealer, isTsumo, honba, regularDoraCount, uraDoraCount, totalAkaCount);
            }
        }

        // Check Chiitoitsu
        let chiitoitsuYaku = null;
        if (isMenzen) {
            const chii = checkChiitoitsu(allTileCodes);
            if (chii) {
                chiitoitsuYaku = evaluateChiitoitsu({
                    allTileCodes,
                    winningTile: winningTile,
                    isTsumo,
                    isRiichi,
                    isDoubleRiichi,
                    isIppatsu,
                    isHaitei,
                    isHoutei,
                    seatWind,
                    roundWind
                });
            }
        }

        // Find standard hand decompositions (4 melds + 1 pair)
        // Hand tiles 14 = concealed hand tiles (must decompose concealed hand into sets and pair)
        const concealedTileCodes = handTiles.map(t => t.code || t);
        const concealedDecomps = findStandardDecompositions(concealedTileCodes);

        const candidateResults = [];

        if (chiitoitsuYaku) {
            candidateResults.push(chiitoitsuYaku);
        }

        for (const decomp of concealedDecomps) {
            // Full 4 sets = melds + decomp.sets
            const fullSets = [...decomp.sets];
            for (const m of melds) {
                // Sort the tiles to ensure we have the lowest tile at index 0 for sequence matching
                const sortedTiles = MahjongLogic.sortTiles([...m.tiles]).map(t => (t.code || t).replace('_aka', ''));
                
                fullSets.push({
                    type: (m.type === 'kan' || m.type === 'ankan' || m.type === 'daiminkan' || m.type === 'kakan') ? 'kantsu' : (m.type === 'chi' ? 'shuntsu' : (m.type === 'pon' ? 'koutsu' : m.type)),
                    tile: sortedTiles[0],
                    tiles: sortedTiles,
                    isMeld: m.type !== 'ankan',
                    isAnkan: m.type === 'ankan'
                });
            }

            const res = evaluateStandardHand({
                sets: fullSets,
                pair: decomp.pair,
                allTileCodes,
                winningTile: winningTile,
                isMenzen,
                isTsumo,
                isRiichi,
                isDoubleRiichi,
                isIppatsu,
                isHaitei,
                isHoutei,
                isRinshan,
                isChankan,
                seatWind,
                roundWind
            });

            if (res) candidateResults.push(res);
        }

        if (candidateResults.length === 0) {
            return { success: false, reason: '화료 형태를 만족하지 않거나 역이 없습니다.' };
        }

        // Filter valid candidates that have at least 1 yaku (excluding dora)
        const validWithYaku = candidateResults.filter(r => r.yakuList.length > 0 || r.yakumanList.length > 0);
        if (validWithYaku.length === 0) {
            return { success: false, reason: '역 없음 (무역 화료 불가)' };
        }

        // Pick highest scoring combination
        let bestResult = null;
        let maxScore = -1;

        for (const candidate of validWithYaku) {
            const scoreObj = computeFinalPoints({
                yakuList: candidate.yakuList,
                yakumanList: candidate.yakumanList,
                yakumanMultiplier: candidate.yakumanMultiplier,
                fu: candidate.fu,
                isDealer,
                isTsumo,
                honba,
                regularDoraCount,
                uraDoraCount,
                totalAkaCount
            });

            if (scoreObj.totalScore > maxScore) {
                maxScore = scoreObj.totalScore;
                bestResult = { ...candidate, ...scoreObj };
            }
        }

        return { success: true, ...bestResult };
    };

    function buildYakumanResult(yakuNames, mult, isDealer, isTsumo, honba, regDora, uraDora, aka) {
        const scoreObj = computeFinalPoints({
            yakuList: [],
            yakumanList: yakuNames,
            yakumanMultiplier: mult,
            fu: 0,
            isDealer,
            isTsumo,
            honba,
            regularDoraCount: regDora,
            uraDoraCount: uraDora,
            totalAkaCount: aka
        });
        return {
            success: true,
            yakuList: [],
            yakumanList: yakuNames,
            yakumanMultiplier: mult,
            fu: 0,
            ...scoreObj
        };
    }

    // Evaluate Chiitoitsu
    function evaluateChiitoitsu(params) {
        const { allTileCodes, isTsumo, isRiichi, isDoubleRiichi, isIppatsu, isHaitei, isHoutei } = params;
        const yakuList = [];
        const yakumanList = [];

        // Yakuman checks for Chiitoitsu
        // Tsuuiisou (All Honors)
        if (allTileCodes.every(isHonor)) {
            yakumanList.push('자일색');
            return { yakuList: [], yakumanList, yakumanMultiplier: 1, fu: 25 };
        }

        // Ryuuiisou (All Green)
        if (allTileCodes.every(isGreen)) {
            yakumanList.push('녹일색');
            return { yakuList: [], yakumanList, yakumanMultiplier: 1, fu: 25 };
        }

        // Regular Yaku for Chiitoitsu
        yakuList.push({ name: '치또이츠', han: 2 });

        if (isDoubleRiichi) yakuList.push({ name: '더블 리치(ダブル立直)', han: 2 });
        else if (isRiichi) yakuList.push({ name: '리치(立直)', han: 1 });
        if (isIppatsu && (isRiichi || isDoubleRiichi)) yakuList.push({ name: '일발(一発)', han: 1 });
        if (isTsumo) yakuList.push({ name: '멘젠쯔모(門前清自摸和)', han: 1 });
        if (isHaitei) yakuList.push({ name: '해저로월', han: 1 });
        if (isHoutei) yakuList.push({ name: '하저로어', han: 1 });

        // Tanyao
        if (allTileCodes.every(t => !isYaochuu(t))) {
            yakuList.push({ name: '탕야오', han: 1 });
        }
        // Honroutou (All Terminals and Honors)
        if (allTileCodes.every(isYaochuu)) {
            yakuList.push({ name: '혼노두', han: 2 });
        }
        // Honitsu / Chinitsu
        const suits = new Set(allTileCodes.filter(t => !t.endsWith('z')).map(t => t.slice(-1)));
        const hasHonors = allTileCodes.some(t => t.endsWith('z'));
        if (suits.size === 1) {
            if (hasHonors) {
                yakuList.push({ name: '혼일색', han: 3 });
            } else {
                yakuList.push({ name: '청일색', han: 6 });
            }
        }

        return { yakuList, yakumanList, yakumanMultiplier: 0, fu: 25 };
    }

    // Evaluate standard 4 sets + 1 pair hand
    function evaluateStandardHand(params) {
        const {
            sets,
            pair,
            allTileCodes,
            winningTile,
            isMenzen,
            isTsumo,
            isRiichi,
            isDoubleRiichi,
            isIppatsu,
            isHaitei,
            isHoutei,
            isRinshan,
            isChankan,
            seatWind,
            roundWind
        } = params;

        const yakuList = [];
        const yakumanList = [];

        // 1. YAKUMAN CHECKS
        // (1) Tsuuiisou (All Honors)
        if (allTileCodes.every(isHonor)) {
            yakumanList.push('자일색');
        }
        // (2) Ryuuiisou (All Green)
        if (allTileCodes.every(isGreen)) {
            yakumanList.push('녹일색');
        }
        // (3) Chinroutou (All Terminals)
        if (allTileCodes.every(isTerminal)) {
            yakumanList.push('청노두');
        }
        // (4) Daisangen (Big Three Dragons)
        const dragons = ['5z', '6z', '7z'];
        const dragonKoutsu = sets.filter(s => (s.type === 'koutsu' || s.type === 'kantsu') && dragons.includes(s.tile));
        if (dragonKoutsu.length === 3) {
            yakumanList.push('대삼원');
        }
        // (5) Shousuushii / Daisuushii (Four Winds)
        const winds = ['1z', '2z', '3z', '4z'];
        const windKoutsu = sets.filter(s => (s.type === 'koutsu' || s.type === 'kantsu') && winds.includes(s.tile));
        if (windKoutsu.length === 4) {
            yakumanList.push('대사희'); // Double Yakuman in KML rules
            return { yakuList: [], yakumanList, yakumanMultiplier: 2, fu: 0 };
        } else if (windKoutsu.length === 3 && winds.includes(pair)) {
            yakumanList.push('소사희');
        }
        // (6) Suuankou (Four Concealed Triplets)
        if (isMenzen) {
            const ankouSets = sets.filter(s => (s.type === 'koutsu' || s.type === 'kantsu') && !s.isMeld);
            if (ankouSets.length === 4) {
                // Was it tanki wait? (Single wait on pair) — strip _aka for comparison
                const winCode = (winningTile || '').replace('_aka', '');
                const isTanki = pair === winCode;
                if (isTanki) {
                    yakumanList.push('사암각 단기 (스안커 단기)');
                    return { yakuList: [], yakumanList, yakumanMultiplier: 2, fu: 0 };
                } else if (isTsumo) {
                    yakumanList.push('사암각 (스안커)');
                }
            }
        }

        // (7) Suukantsu (Four Kans)
        const kantsuSets = sets.filter(s => s.type === 'kantsu');
        if (kantsuSets.length === 4) {
            yakumanList.push('사깡즈');
        }

        if (yakumanList.length > 0) {
            return { yakuList: [], yakumanList, yakumanMultiplier: yakumanList.length, fu: 0 };
        }

        // 2. NORMAL YAKU CHECKS

        // Riichi / Double Riichi
        if (isDoubleRiichi) yakuList.push({ name: '더블 리치(ダブル立直)', han: 2 });
        else if (isRiichi) yakuList.push({ name: '리치(立直)', han: 1 });
        if (isIppatsu && (isRiichi || isDoubleRiichi)) yakuList.push({ name: '일발(一発)', han: 1 });
        if (isMenzen && isTsumo) yakuList.push({ name: '멘젠쯔모(門前清自摸和)', han: 1 });
        if (isHaitei) yakuList.push({ name: '해저로월', han: 1 });
        if (isHoutei) yakuList.push({ name: '하저로어', han: 1 });
        if (isRinshan) yakuList.push({ name: '영상개화', han: 1 });
        if (isChankan) yakuList.push({ name: '창깡', han: 1 });

        // Tanyao (All Simples)
        if (allTileCodes.every(t => !isYaochuu(t))) {
            yakuList.push({ name: '탕야오', han: 1 });
        }

        // Yakuhai (Dragons, Seat Wind, Round Wind)
        if (dragonKoutsu.length === 1 || dragonKoutsu.length === 2) {
            for (const dk of dragonKoutsu) {
                const dName = dk.tile === '5z' ? '백(白)' : (dk.tile === '6z' ? '발(發)' : '중(中)');
                yakuList.push({ name: `역패: ${dName}`, han: 1 });
            }
        }
        const seatWindKoutsu = sets.find(s => (s.type === 'koutsu' || s.type === 'kantsu') && s.tile === seatWind);
        if (seatWindKoutsu) {
            const wName = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' }[seatWind];
            yakuList.push({ name: `자풍패: ${wName}`, han: 1 });
        }
        const roundWindKoutsu = sets.find(s => (s.type === 'koutsu' || s.type === 'kantsu') && s.tile === roundWind);
        if (roundWindKoutsu) {
            const wName = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' }[roundWind];
            // If seat wind == round wind (double wind)
            if (seatWind === roundWind) {
                yakuList.push({ name: `장풍패: ${wName}`, han: 1 });
            } else {
                yakuList.push({ name: `장풍패: ${wName}`, han: 1 });
            }
        }

        // Pinfu check
        // Requirements: Menzen, all 4 sets are shuntsu, pair is not a value honor, ryanmen wait
        let isPinfu = false;
        if (isMenzen && sets.every(s => s.type === 'shuntsu')) {
            const isPairYakuhai = pair === '5z' || pair === '6z' || pair === '7z' || pair === seatWind || pair === roundWind;
            if (!isPairYakuhai) {
                // Check if wait was ryanmen (two-sided)
                for (const s of sets) {
                    const type = s.tile.slice(-1);
                    const val = parseInt(s.tile[0], 10);
                    const winVal = parseInt(winningTile[0], 10);
                    if (s.tile.endsWith(type) && winningTile.endsWith(type)) {
                        // Sequence is val, val+1, val+2
                        // Two-sided wait: winVal == val (and val > 1) or winVal == val+2 (and val+2 < 9)
                        if ((winVal === val && !(val === 7 && winVal === 7)) || (winVal === val + 2 && !(val === 1 && winVal === 3))) {
                            isPinfu = true;
                            break;
                        }
                    }
                }
            }
        }
        if (isPinfu) {
            yakuList.push({ name: '핑후', han: 1 });
        }

        // Iipeiko (Pure Double Sequence) / Riyanpeiko (Two Pure Double Sequences)
        if (isMenzen) {
            const shuntsus = sets.filter(s => s.type === 'shuntsu').map(s => s.tile);
            const sCounts = countTiles(shuntsus);
            let pairsOfShuntsu = 0;
            for (const k of Object.keys(sCounts)) {
                if (sCounts[k] >= 2) pairsOfShuntsu += Math.floor(sCounts[k] / 2);
            }
            if (pairsOfShuntsu === 2) {
                yakuList.push({ name: '량페코', han: 3 });
            } else if (pairsOfShuntsu === 1) {
                yakuList.push({ name: '이페코', han: 1 });
            }
        }

        // Toitoi (All Triplets)
        const allKoutsu = sets.every(s => s.type === 'koutsu' || s.type === 'kantsu');
        if (allKoutsu) {
            yakuList.push({ name: '또이또이', han: 2 });
        }

        // Sanankou (Three Concealed Triplets)
        // Rule: On Ron, the triplet completed by the winning tile is NOT concealed (it's an open triplet).
        //       So we only count it if: (a) tsumo, OR (b) the winning tile completes the PAIR, not a triplet.
        {
            const winCode = (winningTile || '').replace('_aka', '');
            // Is the winning tile completing the pair (tanki wait)?
            const isTankiWin = !isTsumo && pair === winCode;
            // Count non-meld triplets
            const concealedKoutsu = sets.filter(s => (s.type === 'koutsu' || s.type === 'kantsu') && !s.isMeld);
            let ankouCount = concealedKoutsu.length;
            // On Ron, subtract 1 if the winning tile completes a triplet (not the pair)
            if (!isTsumo && !isTankiWin) {
                // Check if winning tile matches any concealed koutsu — that one is actually an open triplet on Ron
                const completedByRon = concealedKoutsu.find(s => s.tile === winCode);
                if (completedByRon) ankouCount--;
            }
            if (ankouCount === 3) {
                yakuList.push({ name: '삼암각 (산안커)', han: 2 });
            }
        }


        // Sankantsu (Three Kans)
        if (kantsuSets.length === 3) {
            yakuList.push({ name: '삼깡즈', han: 2 });
        }

        // Sanshoku Doukou (Three Colored Triplets)
        const koutsuTiles = sets.filter(s => s.type === 'koutsu' || s.type === 'kantsu').map(s => s.tile);
        for (let v = 1; v <= 9; v++) {
            if (koutsuTiles.includes(`${v}m`) && koutsuTiles.includes(`${v}p`) && koutsuTiles.includes(`${v}s`)) {
                yakuList.push({ name: '삼색동각', han: 2 });
                break;
            }
        }

        // Sanshoku Doujun (Three Colored Sequences)
        const shuntsuTiles = sets.filter(s => s.type === 'shuntsu').map(s => s.tile);
        for (let v = 1; v <= 7; v++) {
            if (shuntsuTiles.includes(`${v}m`) && shuntsuTiles.includes(`${v}p`) && shuntsuTiles.includes(`${v}s`)) {
                yakuList.push({ name: '삼색동순', han: isMenzen ? 2 : 1 });
                break;
            }
        }

        // Ittsu (Pure Straight: 123, 456, 789 in same suit)
        const suitGroups = { m: [], p: [], s: [] };
        for (const s of sets) {
            if (s.type === 'shuntsu') {
                const type = s.tile.slice(-1);
                const val = parseInt(s.tile[0], 10);
                if (suitGroups[type]) suitGroups[type].push(val);
            }
        }
        for (const [st, vals] of Object.entries(suitGroups)) {
            if (vals.includes(1) && vals.includes(4) && vals.includes(7)) {
                yakuList.push({ name: '일기통관', han: isMenzen ? 2 : 1 });
                break;
            }
        }

        // Chanta / Junchan / Honroutou
        const hasHonors = allTileCodes.some(isHonor);
        const allSetsHaveTerminalOrHonor = sets.every(s => s.tiles.some(isYaochuu)) && isYaochuu(pair);
        const allSetsHavePureTerminal = sets.every(s => s.tiles.some(isTerminal)) && isTerminal(pair);
        const hasAnyShuntsu = sets.some(s => s.type === 'shuntsu');

        if (allSetsHaveTerminalOrHonor) {
            if (!hasHonors && allSetsHavePureTerminal) {
                // Junchan
                yakuList.push({ name: '순전대요구 (준찬타)', han: isMenzen ? 3 : 2 });
            } else if (hasAnyShuntsu && hasHonors) {
                // Chanta
                yakuList.push({ name: '혼전대요구 (찬타)', han: isMenzen ? 2 : 1 });
            } else if (!hasAnyShuntsu && hasHonors) {
                // Honroutou
                yakuList.push({ name: '혼노두', han: 2 });
            }
        }

        // Shousangen (Small Three Dragons: 2 dragon sets + 1 dragon pair)
        if (dragonKoutsu.length === 2 && dragons.includes(pair)) {
            yakuList.push({ name: '소삼원', han: 2 });
        }

        // Honitsu / Chinitsu
        const activeSuits = new Set(allTileCodes.filter(t => !t.endsWith('z')).map(t => t.slice(-1)));
        if (activeSuits.size === 1) {
            if (hasHonors) {
                yakuList.push({ name: '혼일색', han: isMenzen ? 3 : 2 });
            } else {
                yakuList.push({ name: '청일색', han: isMenzen ? 6 : 5 });
            }
        }

        // Calculate Fu (부수)
        let fu = 20; // Base fu

        if (isPinfu) {
            fu = isTsumo ? 20 : 30; // Pinfu Tsumo is exactly 20 fu. Pinfu Ron is 30 fu.
        } else {
            // Base: 20, 멘젠 론일 경우 30부
            if (isMenzen && !isTsumo) {
                fu = 30;
            }

            // Tsumo +2
            if (isTsumo) fu += 2;

            // Wait fu: tanki (pair wait), kanchan (middle wait), penchan (edge wait)
            let waitFu = 0;
            if (pair === winningTile) {
                waitFu = 2; // Tanki
            } else {
                for (const s of sets) {
                    if (s.type === 'shuntsu') {
                        const type = s.tile.slice(-1);
                        const val = parseInt(s.tile[0], 10);
                        if (winningTile.endsWith(type)) {
                            const winVal = parseInt(winningTile[0], 10);
                            // Kanchan (e.g. 1 3 waiting for 2)
                            if (winVal === val + 1) {
                                waitFu = 2;
                                break;
                            }
                            // Penchan (1 2 waiting for 3, or 8 9 waiting for 7)
                            if ((val === 1 && winVal === 3) || (val === 7 && winVal === 7)) {
                                waitFu = 2;
                                break;
                            }
                        }
                    }
                }
            }
            fu += waitFu;

            // Pair fu: Seat wind, round wind, dragons = +2 (double wind = +4)
            if (pair === '5z' || pair === '6z' || pair === '7z') fu += 2;
            if (pair === seatWind) fu += 2;
            if (pair === roundWind) fu += 2;

            // Sets fu
            const winCodeFu = (winningTile || '').replace('_aka', '');
            const isTankiWinFu = pair === winCodeFu;
            
            for (const s of sets) {
                if (s.type === 'koutsu') {
                    const isYao = isYaochuu(s.tile);
                    let treatAsMeld = s.isMeld;
                    if (!isTsumo && !treatAsMeld && !isTankiWinFu && s.tile === winCodeFu) {
                        treatAsMeld = true; // Completed by Ron on Shanpon wait -> Open Triplet
                    }
                    if (treatAsMeld) {
                        fu += isYao ? 4 : 2;
                    } else {
                        fu += isYao ? 8 : 4;
                    }
                } else if (s.type === 'kantsu') {
                    const isYao = isYaochuu(s.tile);
                    if (s.isAnkan) {
                        fu += isYao ? 32 : 16;
                    } else {
                        fu += isYao ? 16 : 8;
                    }
                }
            }

            // Round up to nearest 10
            fu = Math.ceil(fu / 10) * 10;
        }

        return { yakuList, yakumanList, yakumanMultiplier: 0, fu };
    }

    // Compute Final Points, Rank, and payments
    function computeFinalPoints(params) {
        const {
            yakuList,
            yakumanList,
            yakumanMultiplier = 0,
            fu,
            isDealer,
            isTsumo,
            honba,
            regularDoraCount,
            uraDoraCount,
            totalAkaCount
        } = params;

        const honbaPointsRon = honba * 300;
        const honbaPointsTsumoEach = honba * 100;

        // Yakuman Handling
        if (yakumanList.length > 0) {
            const mult = Math.max(1, yakumanMultiplier);
            const baseYakuman = isDealer ? 48000 : 32000;
            const totalScore = (baseYakuman * mult) + honbaPointsRon;

            let paymentDesc = '';
            let payments = {};

            if (isTsumo) {
                if (isDealer) {
                    const each = (16000 * mult) + honbaPointsTsumoEach;
                    paymentDesc = `각 ${each.toLocaleString()}점 지불 (총 ${totalScore.toLocaleString()}점)`;
                    payments = { nonDealer: each, dealer: 0 };
                } else {
                    const dealerPay = (16000 * mult) + honbaPointsTsumoEach;
                    const nonDealerPay = (8000 * mult) + honbaPointsTsumoEach;
                    paymentDesc = `친 ${dealerPay.toLocaleString()}점, 자 ${nonDealerPay.toLocaleString()}점 지불`;
                    payments = { nonDealer: nonDealerPay, dealer: dealerPay };
                }
            } else {
                paymentDesc = `방총자 ${totalScore.toLocaleString()}점 지불`;
                payments = { ronPayer: totalScore };
            }

            return {
                title: mult > 1 ? `더블 역만 (${mult}배 역만)` : '역만',
                totalHan: mult * 13,
                fu: 0,
                totalScore,
                paymentDesc,
                payments,
                doraInfo: { dora: regularDoraCount, uradora: uraDoraCount, aka: totalAkaCount }
            };
        }

        // Calculate Total Han
        let totalHan = yakuList.reduce((acc, y) => acc + y.han, 0);

        // Add Dora as bonus han
        const doraBonus = regularDoraCount + uraDoraCount + totalAkaCount;
        totalHan += doraBonus;

        // Determine Mangan / Haneman / Baiman / Sanbaiman / Kazoe Yakuman
        let title = '';
        let basePoints = 0; // 'a' in mahjong formula: fu * 2^(han + 2)

        // Kiriage Mangan: 30 fu 4 han or 60 fu 3 han -> Mangan
        const isKiriageMangan = (totalHan === 4 && fu >= 30) || (totalHan === 3 && fu >= 60);

        if (totalHan >= 11) {
            title = '삼배만 (11판 이상)';
            basePoints = 6000;
        } else if (totalHan >= 8) {
            title = '배만 (8~10판)';
            basePoints = 4000;
        } else if (totalHan >= 6) {
            title = '하네만 (6~7판)';
            basePoints = 3000;
        } else if (totalHan === 5 || isKiriageMangan) {
            title = isKiriageMangan && totalHan < 5 ? '절상 만관 (만관)' : '만관 (5판)';
            basePoints = 2000;
        } else {
            // Normal hand: a = fu * 2^(han + 2)
            basePoints = fu * Math.pow(2, totalHan + 2);
            if (basePoints > 2000) {
                basePoints = 2000;
                title = '만관';
            }
        }

        // Round up to nearest 100 for score distribution
        let totalScore = 0;
        let paymentDesc = '';
        let payments = {};

        if (isTsumo) {
            if (isDealer) {
                // Dealer Tsumo: 3 players pay 2a
                const eachPay = Math.ceil((basePoints * 2) / 100) * 100 + honbaPointsTsumoEach;
                totalScore = eachPay * 3;
                paymentDesc = `각 ${eachPay.toLocaleString()}점 지불 (총 ${totalScore.toLocaleString()}점)`;
                payments = { nonDealer: eachPay, dealer: 0 };
            } else {
                // Non-dealer Tsumo: Dealer pays 2a, non-dealers pay 1a
                const dealerPay = Math.ceil((basePoints * 2) / 100) * 100 + honbaPointsTsumoEach;
                const nonDealerPay = Math.ceil(basePoints / 100) * 100 + honbaPointsTsumoEach;
                totalScore = dealerPay + nonDealerPay * 2;
                paymentDesc = `친 ${dealerPay.toLocaleString()}점, 자 ${nonDealerPay.toLocaleString()}점 지불 (총 ${totalScore.toLocaleString()}점)`;
                payments = { nonDealer: nonDealerPay, dealer: dealerPay };
            }
        } else {
            // Ron: Dealer gets 6a, Non-dealer gets 4a
            const ronBase = isDealer ? basePoints * 6 : basePoints * 4;
            totalScore = Math.ceil(ronBase / 100) * 100 + honbaPointsRon;
            paymentDesc = `방총자 ${totalScore.toLocaleString()}점 지불`;
            payments = { ronPayer: totalScore };
        }

        return {
            title: title || `${fu}부 ${totalHan}판`,
            totalHan,
            fu,
            totalScore,
            paymentDesc,
            payments,
            doraInfo: { dora: regularDoraCount, uradora: uraDoraCount, aka: totalAkaCount }
        };
    }

    global.MahjongScoring = MahjongScoring;
})(window);

const fs = require('fs');
const path = require('path');

const colors = { reset: '[0m', green: '[32m', red: '[31m', cyan: '[36m' };
console.log(colors.cyan + '==========================================' + colors.reset);
console.log('  Mahjong Game Comprehensive Test Suite');
console.log(colors.cyan + '==========================================' + colors.reset);

global.window = global;
eval(fs.readFileSync('js/MahjongScoring.js', 'utf8'));
eval(fs.readFileSync('js/MahjongLogic.js', 'utf8'));

let getWaitTileYakuInfo = null;
const mainJs = fs.readFileSync('js/main.js', 'utf8');
const funcMatch = mainJs.match(/function getWaitTileYakuInfo[\s\S]*?return \{\s*guaranteed:[\s\S]*?\};\s*\}/);
eval('global.getWaitTileYakuInfo = ' + funcMatch[0]);
getWaitTileYakuInfo = global.getWaitTileYakuInfo;

let passed = 0, failed = 0;
function assert(condition, testName) {
    if (condition) { console.log(colors.green + '  [PASS] ' + testName + colors.reset); passed++; }
    else { console.log(colors.red + '  [FAIL] ' + testName + colors.reset); failed++; }
}

try {
    const tenpaiHand = ['1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','2p','3p','4p'];
    assert(MahjongLogic.calculateShanten(tenpaiHand, 0) === 0, 'Tenpai hand shanten = 0');
    
    const oneShantenHand = ['1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','3p','4s','7s'];
    assert(MahjongLogic.calculateShanten(oneShantenHand, 0) === 1, '1-shanten hand shanten = 1');

    const pinfuParams = {
        handTiles: ['1m','2m','3m','4m','5m','6m','7m','8m','9m','2p','3p','4p','4p','1p'],
        melds: [], winningTile: '1p', isTsumo: false, seatWind: '1z', roundWind: '1z', doraIndicators: [], uraDoraIndicators: [], honba: 0
    };
    const resPinfu = MahjongScoring.calculateScore(pinfuParams);
    // Use length or specific properties to avoid encoding issues
    assert(resPinfu.success && resPinfu.totalHan === 3, 'Should detect 3 Han (Pinfu + Ikkituukan)');

    pinfuParams.isTsumo = true;
    const resTsumo = MahjongScoring.calculateScore(pinfuParams);
    assert(resTsumo.success && resTsumo.totalHan === 4, 'Should detect 4 Han (Pinfu + Ikkituukan + Menzen Tsumo)');

    const player = { hand: ['1m','2m','3m','4m','5m','6m','7m','8m','9m','1p','2p','3p','4p'], melds: [], isRiichi: false, seatWind: '1z' };
    global.game = { roundWind: '1z', dealerIdx: 0, players: [player, {}, {}, {}], honba: 0 };
    
    const info = getWaitTileYakuInfo(player, ['1m','2m','3m','4m','5m','6m','7m','8m','9m','2p','3p','4p','4p'], '1p', false);
    assert(info.guaranteedHan === 3, 'Guaranteed han should be 3 (Pinfu + Ikkituukan)');
    assert(info.probabilistic.length === 1, 'Probabilistic should have 1 yaku (Tsumo)');

    const infoRiichi = getWaitTileYakuInfo(player, ['1m','2m','3m','4m','5m','6m','7m','8m','9m','2p','3p','4p','4p'], '1p', true);
    assert(infoRiichi.guaranteedHan === 4, 'Riichi guaranteed han should be 4');
    assert(infoRiichi.probabilistic.length === 2, 'Riichi probabilistic should have 2 yaku (Tsumo, Ippatsu)');

} catch (e) {
    console.log(colors.red + '  [ERROR] ' + e.message + colors.reset);
    failed++;
}

if (failed === 0) console.log(colors.green + '  ALL TESTS PASSED! (' + passed + '/' + passed + ')' + colors.reset);
else console.log(colors.red + '  TESTS FAILED: ' + failed + ' failed.' + colors.reset);
process.exit(failed > 0 ? 1 : 0);


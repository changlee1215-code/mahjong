/**
 * MahjongYakuCatalog.js
 * Comprehensive In-game Riichi Mahjong Yaku Dictionary & Reference Catalog.
 * Clearly annotates Menzen-only vs Furo-compatible yaku, conditions, and examples.
 */

(function (global) {
    const MahjongYakuCatalog = {};

    const YAKU_LIST = [
        // ==========================================
        // 1-Han Yaku (1판 역)
        // ==========================================
        {
            id: 'riichi',
            name: '리치',
            hanja: '立直 (리치)',
            japanese: 'Riichi',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '멘젠 텐파이 상태에서 1,000점을 공탁하고 선언하는 마작의 상징적 공격 역',
            condition: '한 번도 울지 않은(멘젠) 텐파이 상태에서 자신의 버림패를 옆으로 눕혀 1,000점 리치봉을 걸고 선언합니다. 선언 후 손패 변경(쯔모기리)이 강제되지만, 우라도라 찬스와 일발 역을 노릴 수 있습니다.',
            examples: ['(멘젠 텐파이 시 선언 가능, 손패 불문)']
        },
        {
            id: 'ippatsu',
            name: '일발',
            hanja: '一発 (잇파츠)',
            japanese: 'Ippatsu',
            han: 1,
            hanText: '1판 (보너스)',
            hanCategory: 1,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '리치 선언 직후 타가의 울기 없이 1순 이내에 론 또는 쯔모로 즉시 화료',
            condition: '리치 선언 후 다음 자신의 쯔모 순번이 돌아와 패를 버리기 전까지 1순 이내에 화료하면 성립합니다. 단, 도중에 누군가 치·퐁·깡을 선언하면 일발 권리가 사라집니다.',
            examples: ['(리치 후 1순 이내 론 / 쯔모)']
        },
        {
            id: 'menzen_tsumo',
            name: '멘젠쯔모',
            hanja: '門前清自摸和 (멘젠친쯔모호)',
            japanese: 'Menzen Tsumo',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '한 번도 울지 않은 깨끗한 멘젠 상태에서 직접 패산에서 패를 뽑아 쯔모 화료',
            condition: '치·퐁·명깡 등 타가의 패를 일체 가져오지 않은 멘젠 상태에서, 자신의 쯔모패로 화료 형태(4몸통 1머리 또는 치또이/국사)를 완성합니다.',
            examples: ['(멘젠 상태에서 직접 쯔모)']
        },
        {
            id: 'tanyao',
            name: '탕야오',
            hanja: '斷幺九 (단요구 / 탕야오)',
            japanese: 'Tanyao',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '1·9 요구패와 자패를 완전히 배제하고 오직 2~8번 수패로만 구성한 빠른 속공 역',
            condition: '손패의 모든 몸통과 머리가 1과 9, 그리고 동·남·서·북·백·발·중을 포함하지 않고 2부터 8까지의 수패(만/통/삭)로만 완성되어야 합니다. 울어도 판수 감소 없이 1판이 인정됩니다(쿠이탕 허용).',
            examples: ['234만', '456통', '345삭', '678삭', '77통']
        },
        {
            id: 'pinfu',
            name: '핑후',
            hanja: '平和 (평화 / 핑후)',
            japanese: 'Pinfu',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '부수가 붙지 않는 가장 깔끔한 기본 역 (4슌츠 + 무역패 머리 + 양면 대기)',
            condition: '① 멘젠 한정, ② 4개의 몸통이 모두 연속된 숫자(슌츠), ③ 머리는 자풍/장풍/삼원패가 아닌 무역패, ④ 마지막 대기패가 양쪽으로 기다리는 양면 대기(예: 4-5를 쥐고 3-6 대기)여야 합니다.',
            examples: ['234만', '678만', '234통', '567삭', '33삭(머리)', '대기: 2-5만 양면']
        },
        {
            id: 'iipeikou',
            name: '이페코',
            hanja: '一盃口 (일배구 / 이페코)',
            japanese: 'Iipeikou',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '같은 종류, 같은 숫자로 이루어진 동일한 슌츠 2쌍을 손패 안에 모음',
            condition: '멘젠 상태에서 같은 무늬, 같은 숫자의 슌츠(예: 234통 234통)를 2조 완성합니다. 울면 무효가 됩니다.',
            examples: ['234통', '234통', '456만', '789삭', '88만(머리)']
        },
        {
            id: 'yakuhai_sangenhau',
            name: '역패: 삼원패 (백 · 발 · 중)',
            hanja: '役牌: 三元牌 (백·발·중)',
            japanese: 'Yakuhai (Dragons)',
            han: 1,
            hanText: '각 1판',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '삼원패인 백(白), 발(發), 중(中) 중 하나를 3장(코츠/깡츠) 모으면 무조건 1판 확정',
            condition: '백, 발, 중 중 어느 것이든 3장 모으면 즉시 1판 역이 생깁니다. 퐁을 하거나 깡을 해도 그대로 1판이 인정되므로 초보자에게 가장 유용한 속공 탈출 역입니다.',
            examples: ['중중중(퐁)', '234만', '567통', '789삭', '55만']
        },
        {
            id: 'yakuhai_wind',
            name: '역패: 바람패 (자풍패 / 장풍패)',
            hanja: '役牌: 風牌 (자풍 / 장풍)',
            japanese: 'Yakuhai (Winds)',
            han: 1,
            hanText: '각 1판 (중복 시 2판)',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '자신의 자리 바람(자풍) 또는 현재 판의 바람(장풍)을 3장 모으면 1판 확정',
            condition: '동풍전에서는 동(東)이 모든 사람의 장풍패이며, 자신의 자리에 해당하는 패(동/남/서/북)가 자풍패입니다. 자풍과 장풍이 겹치면(예: 동가의 동패) 2판(더블 동)이 됩니다. 울기(퐁) 허용!',
            examples: ['동동동(동가 퐁: 2판)', '123만', '456통', '789삭', '33통']
        },
        {
            id: 'rinshan',
            name: '영상개화',
            hanja: '嶺上開花 (영상개화)',
            japanese: 'Rinshan Kaihou',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '깡을 선언한 뒤 왕패의 영상패에서 뽑아온 보충패로 즉시 쯔모 화료',
            condition: '안깡, 가깡, 대명깡 불문하고 깡을 친 직후 영상패에서 쯔모해온 패가 자신의 화료패와 일치하면 성립합니다.',
            examples: ['(깡 선언 ➡️ 영상패 쯔모 화료)']
        },
        {
            id: 'chankan',
            name: '창깡',
            hanja: '槍槓 (창깡)',
            japanese: 'Chankan',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '상대가 이미 퐁해둔 패에 4번째 패를 붙여 가깡을 선언할 때 그 패를 빼앗아 론 화료',
            condition: '타가가 가깡(소명깡)을 시도하는 바로 그 순간에 론을 선언하여 창으로 꿰뚫듯 화료합니다. 상대의 깡은 불발 처리됩니다.',
            examples: ['(상대의 가깡 타패를 즉시 론)']
        },
        {
            id: 'haitei',
            name: '해저로월',
            hanja: '海底撈月 (해저로월 / 하이테이)',
            japanese: 'Haitei Raoyue',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '바다 밑의 달을 건지듯, 패산의 가장 마지막 14번째 패로 쯔모 화료',
            condition: '순패산의 가장 마지막 패를 뽑은 플레이어가 그 패로 쯔모 화료에 성공할 때 주어집니다.',
            examples: ['(패산 마지막 남은 1장 쯔모)']
        },
        {
            id: 'houtei',
            name: '하저로어',
            hanja: '河底撈魚 (하저로어 / 호테이)',
            japanese: 'Houtei Raoyui',
            han: 1,
            hanText: '1판',
            hanCategory: 1,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 1,
            isYakuman: false,
            summary: '강바닥의 물고기를 낚듯, 해당 국의 가장 마지막 버림패로 론 화료',
            condition: '패산이 소진된 후 마지막 순번에 플레이어가 버린 가장 마지막 버림패에 걸려 론 화료할 때 성립합니다.',
            examples: ['(마지막 순번 버림패 론)']
        },

        // ==========================================
        // 2-Han Yaku (2판 역)
        // ==========================================
        {
            id: 'double_riichi',
            name: '더블 리치',
            hanja: 'ダブル立直 (더블 리치)',
            japanese: 'Double Riichi',
            han: 2,
            hanText: '2판',
            hanCategory: 2,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '첫 순 배패를 받자마자 아무도 울지 않은 상태에서 첫 버림패로 즉시 리치 선언',
            condition: '순배패 14장을 받은 첫 번째 턴에 치·퐁·깡 없이 곧바로 리치를 선언하면 일반 리치(1판) 대신 2판으로 인정됩니다.',
            examples: ['(첫 순 즉시 리치 선언)']
        },
        {
            id: 'chiitoitsu',
            name: '치또이츠',
            hanja: '七対子 (칠대자 / 치또이츠)',
            japanese: 'Chiitoitsu',
            han: 2,
            hanText: '2판 (25부 고정)',
            hanCategory: 2,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '4몸통 1머리의 기본 틀을 깨고, 서로 다른 7종류의 머리(또이츠 7쌍)로 완성하는 특수 역',
            condition: '멘젠 한정이며, 서로 다른 종류의 패 7쌍(2장씩 7조 = 14장)을 모읍니다. 같은 패 4장을 2쌍으로 나누는 것은 불가능합니다. 항상 25부 2판으로 고정 계산됩니다.',
            examples: ['11만', '44만', '22통', '77통', '33삭', '99삭', '발발']
        },
        {
            id: 'sanshoku_doujun',
            name: '삼색동순',
            hanja: '三色同順 (삼색동순 / 산쇼쿠)',
            japanese: 'Sanshoku Doujun',
            han: 2,
            hanText: '멘젠 2판 / 후로 1판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: true,
            furoHan: 1,
            isYakuman: false,
            summary: '만수, 통수, 삭수 세 종류의 수패에서 완전히 동일한 숫자의 슌츠를 각 1조씩 완성',
            condition: '예를 들어 123만, 123통, 123삭처럼 3종류 수패에 걸쳐 같은 연속 숫자를 만듭니다. 울면 1판으로 감소(쿠이사게)합니다.',
            examples: ['234만', '234통', '234삭(치 허용)', '678통', '55삭(머리)']
        },
        {
            id: 'ittsu',
            name: '일기통관',
            hanja: '一気通貫 (일기통관 / 잇츠)',
            japanese: 'Ittsuu',
            han: 2,
            hanText: '멘젠 2판 / 후로 1판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: true,
            furoHan: 1,
            isYakuman: false,
            summary: '한 종류의 수패로 1-2-3, 4-5-6, 7-8-9 슌츠 3조를 모두 모아 1부터 9까지 관통',
            condition: '만/통/삭 중 한 수패로 123, 456, 789 슌츠를 모두 완성합니다. 울어도 인정되나 1판으로 감소합니다.',
            examples: ['123만', '456만', '789만(치 허용)', '345통', '88삭(머리)']
        },
        {
            id: 'chanta',
            name: '혼전대요구 (찬타)',
            hanja: '混全帯幺九 (혼전대요구 / 찬타)',
            japanese: 'Chanta',
            han: 2,
            hanText: '멘젠 2판 / 후로 1판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: true,
            furoHan: 1,
            isYakuman: false,
            summary: '4개의 모든 몸통과 머리에 반드시 1, 9, 또는 자패(요구패)가 1장 이상 포함된 형태',
            condition: '모든 슌츠/코츠 및 머리에 1·9 또는 자패가 포함되어야 합니다. 순수한 2~8번 수패만으로 이루어진 몸통이 단 하나라도 있으면 성립하지 않습니다. 울면 1판 감소합니다.',
            examples: ['123만', '789통', '999삭(퐁)', '동동동', '11통(머리)']
        },
        {
            id: 'toitoi',
            name: '또이또이',
            hanja: '対々和 (대대화 / 또이또이)',
            japanese: 'Toitoi',
            han: 2,
            hanText: '2판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 2,
            isYakuman: false,
            summary: '슌츠(연속 숫자) 없이 4개의 몸통 전체를 동일한 패 3장(코츠/깡츠)으로만 채운 형태',
            condition: '4몸통 1머리 중 4몸통이 전부 퐁 또는 안커로 모은 코츠여야 합니다. 적극적으로 퐁을 불러도 판수 감소 없이 2판이 그대로 인정됩니다.',
            examples: ['222만(퐁)', '555통(퐁)', '888삭', '남남남(퐁)', '44통(머리)']
        },
        {
            id: 'sanankou',
            name: '삼암각',
            hanja: '三暗刻 (삼암각 / 산안커)',
            japanese: 'San Ankou',
            han: 2,
            hanText: '2판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 2,
            isYakuman: false,
            summary: '남에게 울지 않고 순수하게 손패 안에서 직접 모아 완성한 안커(안깡 포함) 3조',
            condition: '울지 않고 손패 안에서 완성된 트리플 3조가 있어야 합니다. 론 화료 시 화료패로 완성된 트리플은 멘젠이라도 외부에 노출된 명커로 취급되므로 주의해야 합니다.',
            examples: ['333만(안커)', '777통(안커)', '444삭(안커)', '123삭(치 허용)', '99만']
        },
        {
            id: 'sanshoku_doukou',
            name: '삼색동각',
            hanja: '三色同刻 (삼색동각)',
            japanese: 'Sanshoku Doukou',
            han: 2,
            hanText: '2판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 2,
            isYakuman: false,
            summary: '만수, 통수, 삭수 세 종류의 수패에서 완전히 동일한 숫자의 코츠를 각 1조씩 완성',
            condition: '예를 들어 777만, 777통, 777삭처럼 세 수패에서 같은 숫자의 트리플을 모읍니다. 울기(퐁) 허용!',
            examples: ['555만(퐁)', '555통', '555삭', '123삭', '동동(머리)']
        },
        {
            id: 'sankantsu',
            name: '삼깡즈',
            hanja: '三槓子 (삼깡즈)',
            japanese: 'San Kantsu',
            han: 2,
            hanText: '2판',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 2,
            isYakuman: false,
            summary: '한 대국에서 한 플레이어가 혼자서 안깡이나 명깡을 3번 선언하여 완성',
            condition: '깡의 종류(안깡/대명깡/가깡)를 가리지 않고 혼자서 3개의 깡츠를 만들어 화료합니다.',
            examples: ['2222만(깡)', '8888통(깡)', '백백백백(깡)', '456삭', '33삭']
        },
        {
            id: 'shousangen',
            name: '소삼원',
            hanja: '小三元 (소삼원 / 쇼산겐)',
            japanese: 'Shousangen',
            han: 2,
            hanText: '2판 (실질 4판)',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 2,
            isYakuman: false,
            summary: '삼원패(백·발·중) 중 2종류를 코츠로 모으고, 나머지 1종류를 머리로 완성',
            condition: '백, 발, 중 중 2조를 코츠로, 1조를 머리로 만듭니다. 삼원패 2코츠 자체로 역패 2판이 붙기 때문에 소삼원 2판과 합쳐 실질적으로 최소 4판(만관급)이 보장됩니다. 울기 허용!',
            examples: ['백백백(퐁)', '발발발', '중중(머리)', '234만', '678삭']
        },
        {
            id: 'honroutou',
            name: '혼노두',
            hanja: '混老頭 (혼노두 / 혼로우토)',
            japanese: 'Honroutou',
            han: 2,
            hanText: '2판 (실질 4판)',
            hanCategory: 2,
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 2,
            isYakuman: false,
            summary: '손패의 모든 패가 오직 1·9 수패와 자패로만 구성된 형태 (슌츠 불가능)',
            condition: '2~8 수패가 1장도 없어야 하므로 또이또이(2판) 또는 치또이츠(2판)와 무조건 복합되어 실질 최소 4판이 됩니다. 울기 허용!',
            examples: ['111만(퐁)', '999통', '111삭', '남남남', '중중(머리)']
        },

        // ==========================================
        // 3-Han & 6-Han Yaku (3판 이상 고타점 역)
        // ==========================================
        {
            id: 'ryanpeikou',
            name: '량페코',
            hanja: '二盃口 (이배구 / 량페코)',
            japanese: 'Ryanpeikou',
            han: 3,
            hanText: '3판',
            hanCategory: 3,
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: false,
            summary: '이페코(동일한 슌츠 2쌍)를 2조 완성하여 손패 전체가 4개의 슌츠와 1머리로 구성된 고난도 역',
            condition: '멘젠 한정이며, 같은 무늬 같은 숫자의 슌츠가 2쌍씩 총 4조를 이룹니다. 형태상 치또이츠와 겹치지만 량페코(3판)가 우선 적용됩니다.',
            examples: ['234만', '234만', '567통', '567통', '88삭(머리)']
        },
        {
            id: 'junchan',
            name: '순전대요구 (준찬타)',
            hanja: '純全帯幺九 (순전대요구 / 준찬타)',
            japanese: 'Junchan',
            han: 3,
            hanText: '멘젠 3판 / 후로 2판',
            hanCategory: 3,
            isMenzenOnly: false,
            kuisagari: true,
            furoHan: 2,
            isYakuman: false,
            summary: '자패를 일체 쓰지 않고 순수한 1과 9 수패만으로 모든 몸통과 머리를 완성한 찬타의 상위 역',
            condition: '모든 몸통과 머리에 반드시 1 또는 9 수패가 포함되어야 하며, 자패가 1장이라도 섞이면 일반 찬타로 격하됩니다. 울면 2판으로 감소합니다.',
            examples: ['123만', '789만', '123통(치 허용)', '789삭', '99삭(머리)']
        },
        {
            id: 'honitsu',
            name: '혼일색',
            hanja: '混一色 (혼일색 / 혼이츠)',
            japanese: 'Honitsu',
            han: 3,
            hanText: '멘젠 3판 / 후로 2판',
            hanCategory: 3,
            isMenzenOnly: false,
            kuisagari: true,
            furoHan: 2,
            isYakuman: false,
            summary: '오직 한 종류의 수패(만/통/삭)와 자패(바람/삼원패)의 조합으로만 완성한 강력한 중거리포',
            condition: '손패의 모든 패가 단 하나의 수패 종류와 자패로만 채워집니다. 울어도 2판이 남고 역패가 함께 겹치기 쉬워 실전에서 가장 많이 쓰이는 고화력 역입니다.',
            examples: ['123만', '456만', '789만(치)', '백백백(퐁)', '동동(머리)']
        },
        {
            id: 'chinitsu',
            name: '청일색',
            hanja: '清一色 (청일색 / 친이츠)',
            japanese: 'Chinitsu',
            han: 6,
            hanText: '멘젠 6판 / 후로 5판',
            hanCategory: 6,
            isMenzenOnly: false,
            kuisagari: true,
            furoHan: 5,
            isYakuman: false,
            summary: '자패조차 일체 배제하고 오직 단 한 종류의 수패(만/통/삭)만으로 14장을 채운 궁극의 수패 역',
            condition: '손패 14장이 100% 동일한 수패로만 이루어져야 합니다. 멘젠 6판(하네만 확정), 울어도 5판(만관 확정)이라는 압도적인 화력을 자랑합니다.',
            examples: ['123삭', '234삭', '567삭(치)', '789삭', '99삭(머리)']
        },

        // ==========================================
        // Yakuman (역만 - 13판 상당 / 최고점)
        // ==========================================
        {
            id: 'kokushi',
            name: '국사무쌍',
            hanja: '国士無双 (국사무쌍 / 코쿠시)',
            japanese: 'Kokushi Musou',
            han: 13,
            hanText: '역만 (13면대기 시 더블역만)',
            hanCategory: 'yakuman',
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: true,
            summary: '4몸통 1머리를 무시하고 1·9·자패 13종을 모두 모은 마작 최고의 낭만 역만',
            condition: '멘젠 한정. 1만, 9만, 1통, 9통, 1삭, 9삭, 동, 남, 서, 북, 백, 발, 중 13종류를 각 1장씩 모으고 그 중 아무거나 1장을 머리로 채웁니다. 13종류를 다 모으고 마지막 1장을 기다리는 상태를 13면대기(더블 역만)라 부릅니다.',
            examples: ['1만 9만', '1통 9통', '1삭 9삭', '동 남 서 북', '백 발 중', '중(머리)']
        },
        {
            id: 'suuankou',
            name: '사암각',
            hanja: '四暗刻 (사암각 / 스안커)',
            japanese: 'Suuankou',
            han: 13,
            hanText: '역만 (단기대기 시 더블역만)',
            hanCategory: 'yakuman',
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: true,
            summary: '남에게 울지 않고 순수 쯔모와 손패로만 모은 4개의 안커(안깡 포함)',
            condition: '멘젠 한정. 샤보 대기에서 론을 하면 마지막 커츠가 명커 취급되어 삼암각 또이또이(4판)가 되므로, 반드시 쯔모로 완성해야 역만이 됩니다. 반면 이미 4안커가 완성되어 머리를 기다리는 단기 대기는 론으로도 역만이며 룰에 따라 더블 역만으로 인정됩니다.',
            examples: ['222만(안커)', '555통(안커)', '888삭(안커)', '동동동(안커)', '발발(머리)']
        },
        {
            id: 'daisangen',
            name: '대삼원',
            hanja: '大三元 (대삼원 / 다이산겐)',
            japanese: 'Daisangen',
            han: 13,
            hanText: '역만',
            hanCategory: 'yakuman',
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 13,
            isYakuman: true,
            summary: '삼원패인 백(白), 발(發), 중(中) 3종류를 모두 코츠/깡츠로 완성',
            condition: '백, 발, 중을 모두 3장씩 모아 3개의 몸통을 채웁니다. 퐁을 하거나 깡을 해도 역만이 성립합니다. (3번째 삼원패를 울려준 상대에게 책임지불: 파오 룰이 적용될 수 있습니다)',
            examples: ['백백백(퐁)', '발발발(퐁)', '중중중', '234만', '77통(머리)']
        },
        {
            id: 'tsuuiisou',
            name: '자일색',
            hanja: '字一色 (자일색 / 츠이소)',
            japanese: 'Tsuuiisou',
            han: 13,
            hanText: '역만',
            hanCategory: 'yakuman',
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 13,
            isYakuman: true,
            summary: '수패(숫자패)를 전혀 쓰지 않고 오직 자패(동남서북백발중)로만 14장을 채운 역만',
            condition: '손패의 모든 패가 오직 바람패와 삼원패로만 구성되어야 합니다. 울기 허용!',
            examples: ['동동동(퐁)', '남남남', '서서서(퐁)', '백백백', '발발(머리)']
        },
        {
            id: 'ryuuiisou',
            name: '녹일색',
            hanja: '緑一色 (녹일색 / 류이소)',
            japanese: 'Ryuuiisou',
            han: 13,
            hanText: '역만',
            hanCategory: 'yakuman',
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 13,
            isYakuman: true,
            summary: '오직 녹색(초록) 패인 2삭, 3삭, 4삭, 6삭, 8삭과 발(發)패만으로 완성한 아름다운 역만',
            condition: '붉은색 칠이 들어가지 않은 순수 초록색 패 6종류(2·3·4·6·8삭, 발)로만 구성합니다. 울기 허용!',
            examples: ['234삭(치)', '666삭', '888삭(퐁)', '발발발', '22삭(머리)']
        },
        {
            id: 'chinroutou',
            name: '청노두',
            hanja: '清老頭 (청노두 / 친로우토)',
            japanese: 'Chinroutou',
            han: 13,
            hanText: '역만',
            hanCategory: 'yakuman',
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 13,
            isYakuman: true,
            summary: '자패를 쓰지 않고 오직 1과 9로 된 수패의 코츠와 머리로만 14장을 채운 역만',
            condition: '1만, 9만, 1통, 9통, 1삭, 9삭의 트리플 4조와 페어 1조로 구성합니다. 울기 허용!',
            examples: ['111만(퐁)', '999만', '111통(퐁)', '999삭', '11삭(머리)']
        },
        {
            id: 'suushii',
            name: '소사희 · 대사희',
            hanja: '小四喜 · 大四喜 (사희패)',
            japanese: 'Suushii',
            han: 13,
            hanText: '소사희: 역만 / 대사희: 더블역만',
            hanCategory: 'yakuman',
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 13,
            isYakuman: true,
            summary: '바람패인 동(東), 남(南), 서(西), 북(北) 4종류를 모두 손패에 모은 바람의 제왕',
            condition: '동남서북 중 3종류를 코츠로, 1종류를 머리로 완성하면 소사희(역만). 4종류를 모두 코츠로 완성하면 대사희(더블 역만)가 됩니다. 울기 허용!',
            examples: ['동동동(퐁)', '남남남', '서서서(퐁)', '북북북', '55통(대사희)']
        },
        {
            id: 'suukantsu',
            name: '사깡즈',
            hanja: '四槓子 (사깡즈 / 스칸츠)',
            japanese: 'Suukantsu',
            han: 13,
            hanText: '역만',
            hanCategory: 'yakuman',
            isMenzenOnly: false,
            kuisagari: false,
            furoHan: 13,
            isYakuman: true,
            summary: '한 대국에서 한 플레이어가 혼자서 4번의 깡을 모두 성공시키고 단기 대기로 화료',
            condition: '혼자서 4번 깡을 치면 사가제깡 유국이 되지 않고 사깡즈 기회가 주어집니다. 4개의 깡츠가 완성되면 남은 손패는 단 1장이므로 무조건 단기 대기가 됩니다. 출현 확률이 가장 희귀한 역만 중 하나입니다.',
            examples: ['4개의 깡츠 + 단기 머리 화료']
        },
        {
            id: 'chuuren',
            name: '구련보등',
            hanja: '九蓮宝燈 (구련보등 / 츄렌포토)',
            japanese: 'Chuuren Poutou',
            han: 13,
            hanText: '역만 (순정 9면대기 시 더블역만)',
            hanCategory: 'yakuman',
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: true,
            summary: '한 종류의 수패로 1112345678999에 1~9 중 아무 패나 1장을 더해 완성하는 전설의 역만',
            condition: '멘젠 한정. 만/통/삭 중 한 무늬로 1이 3장, 9가 3장, 2부터 8까지 각 1장씩 있는 13장 기본형에서 1부터 9 중 어느 패가 들어와도 화료가 되는 9면대기를 [순정 구련보등(더블 역만)]이라 부릅니다.',
            examples: ['1112345678999만 + (1~9만)']
        },
        {
            id: 'tenhou',
            name: '천화 · 지화',
            hanja: '天和 · 地和 (텐호 / 치호)',
            japanese: 'Tenhou / Chiihou',
            han: 13,
            hanText: '역만',
            hanCategory: 'yakuman',
            isMenzenOnly: true,
            kuisagari: false,
            furoHan: null,
            isYakuman: true,
            summary: '배패를 받자마자 첫 쯔모로 하늘과 땅의 은총을 입어 즉시 완성되는 기적의 역만',
            condition: '천화(天和): 친(오야)이 배패 14장으로 곧바로 화료 형태가 완성된 경우. 지화(地和): 자(플레이어)가 타가의 울기 없이 자신의 첫 쯔모패로 화료한 경우 성립합니다.',
            examples: ['(첫 배패 또는 첫 쯔모 즉시 화료)']
        }
    ];

    MahjongYakuCatalog.LIST = YAKU_LIST;

    let currentFilter = 'all';
    let currentSearch = '';

    // Initialize DOM handlers & event listeners
    MahjongYakuCatalog.init = function () {
        const btnOpen = document.getElementById('btn-open-yaku-dict');
        const btnClose = document.getElementById('btn-close-yaku-dict');
        const modal = document.getElementById('modal-yaku-dict');
        const searchInput = document.getElementById('yaku-dict-search');
        const tabsContainer = document.getElementById('yaku-dict-tabs');

        if (!modal) return;

        // Open modal
        if (btnOpen) {
            btnOpen.addEventListener('click', () => {
                MahjongYakuCatalog.open();
            });
        }

        // Close modal
        if (btnClose) {
            btnClose.addEventListener('click', () => {
                MahjongYakuCatalog.close();
            });
        }

        // Close on ESC key or clicking background overlay
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                MahjongYakuCatalog.close();
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                MahjongYakuCatalog.close();
            }
        });

        // Tab selection
        if (tabsContainer) {
            tabsContainer.addEventListener('click', (e) => {
                const tabBtn = e.target.closest('.yaku-tab');
                if (!tabBtn) return;
                const filter = tabBtn.getAttribute('data-filter');
                if (!filter) return;

                tabsContainer.querySelectorAll('.yaku-tab').forEach(t => t.classList.remove('active'));
                tabBtn.classList.add('active');

                currentFilter = filter;
                MahjongYakuCatalog.render();
            });
        }

        // Search filtering
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = (e.target.value || '').trim().toLowerCase();
                MahjongYakuCatalog.render();
            });
        }

        // Initial count updates
        MahjongYakuCatalog.updateCounts();
    };

    MahjongYakuCatalog.open = function () {
        const modal = document.getElementById('modal-yaku-dict');
        if (modal) {
            modal.style.display = 'flex';
            MahjongYakuCatalog.render();
            const searchInput = document.getElementById('yaku-dict-search');
            if (searchInput) searchInput.focus();
        }
    };

    MahjongYakuCatalog.close = function () {
        const modal = document.getElementById('modal-yaku-dict');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    MahjongYakuCatalog.updateCounts = function () {
        const elAll = document.getElementById('count-all');
        const elMenzen = document.getElementById('count-menzen');
        const elFuro = document.getElementById('count-furo');
        const elYakuman = document.getElementById('count-yakuman');

        const countAll = YAKU_LIST.length;
        const countMenzen = YAKU_LIST.filter(y => y.isMenzenOnly).length;
        const countFuro = YAKU_LIST.filter(y => !y.isMenzenOnly && !y.isYakuman).length;
        const countYakuman = YAKU_LIST.filter(y => y.isYakuman).length;

        if (elAll) elAll.textContent = countAll;
        if (elMenzen) elMenzen.textContent = countMenzen;
        if (elFuro) elFuro.textContent = countFuro;
        if (elYakuman) elYakuman.textContent = countYakuman;
    };

    MahjongYakuCatalog.render = function () {
        const container = document.getElementById('yaku-dict-cards-container');
        if (!container) return;

        // Filter items
        const filtered = YAKU_LIST.filter(yaku => {
            // Category Tab Filter
            if (currentFilter === 'menzen' && !yaku.isMenzenOnly) return false;
            if (currentFilter === 'furo' && (yaku.isMenzenOnly || yaku.isYakuman)) return false;
            if (currentFilter === 'yakuman' && !yaku.isYakuman) return false;

            // Search Filter
            if (currentSearch) {
                const matchName = yaku.name.toLowerCase().includes(currentSearch);
                const matchHanja = yaku.hanja.toLowerCase().includes(currentSearch);
                const matchJp = yaku.japanese.toLowerCase().includes(currentSearch);
                const matchSummary = yaku.summary.toLowerCase().includes(currentSearch);
                const matchDesc = yaku.condition.toLowerCase().includes(currentSearch);
                const matchHan = String(yaku.han).includes(currentSearch) || yaku.hanText.toLowerCase().includes(currentSearch);
                if (!matchName && !matchHanja && !matchJp && !matchSummary && !matchDesc && !matchHan) {
                    return false;
                }
            }
            return true;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="yaku-empty-state">
                    <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
                    <div style="font-weight: bold; color: #f1f5f9; margin-bottom: 4px;">일치하는 역을 찾을 수 없습니다.</div>
                    <div style="font-size: 0.85rem; color: #64748b;">검색어를 확인하거나 필터 탭을 변경해 보세요.</div>
                </div>
            `;
            return;
        }

        let html = '';
        for (const yaku of filtered) {
            // Han badge class
            let hanBadgeClass = 'han-badge-1';
            if (yaku.isYakuman) {
                hanBadgeClass = 'han-badge-yakuman';
            } else if (yaku.hanCategory === 2) {
                hanBadgeClass = 'han-badge-2';
            } else if (yaku.hanCategory === 3) {
                hanBadgeClass = 'han-badge-3';
            } else if (yaku.hanCategory === 6) {
                hanBadgeClass = 'han-badge-6';
            }

            // Furo status badge
            let furoBadgeHtml = '';
            if (yaku.isMenzenOnly) {
                furoBadgeHtml = `<span class="yaku-furo-status-badge badge-menzen">🔒 멘젠 한정 (후로 시 화료 불가 ❌)</span>`;
            } else if (yaku.kuisagari) {
                furoBadgeHtml = `<span class="yaku-furo-status-badge badge-kuisagari">⚠️ 후로(울기) 시 1판 감소 (${yaku.furoHan}판)</span>`;
            } else if (yaku.isYakuman) {
                furoBadgeHtml = `<span class="yaku-furo-status-badge badge-furo">👑 최고위 역만 (울기 가능)</span>`;
            } else {
                furoBadgeHtml = `<span class="yaku-furo-status-badge badge-furo">⭕ 후로(울기) 가능 · 판수 유지</span>`;
            }

            // Examples pills
            let examplesHtml = '';
            if (yaku.examples && yaku.examples.length > 0) {
                examplesHtml = `
                    <div class="yaku-card-example">
                        <span class="yaku-example-label">예시:</span>
                        ${yaku.examples.map(ex => `<span class="yaku-example-pill">${ex}</span>`).join('')}
                    </div>
                `;
            }

            html += `
                <div class="yaku-card" data-id="${yaku.id}">
                    <div class="yaku-card-header">
                        <div class="yaku-card-title-group">
                            <div class="yaku-card-name">${yaku.name}</div>
                            <div class="yaku-card-hanja">${yaku.hanja} · ${yaku.japanese}</div>
                        </div>
                        <div class="yaku-card-han-badge ${hanBadgeClass}">${yaku.hanText}</div>
                    </div>
                    <div>${furoBadgeHtml}</div>
                    <div class="yaku-card-desc">
                        <div style="color: #f8fafc; font-weight: 600; margin-bottom: 3px;">• ${yaku.summary}</div>
                        <div style="font-size: 0.82rem; color: #94a3b8; line-height: 1.45;">${yaku.condition}</div>
                    </div>
                    ${examplesHtml}
                </div>
            `;
        }

        container.innerHTML = html;
    };

    global.MahjongYakuCatalog = MahjongYakuCatalog;

    // Auto-init on DOMContentLoaded
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', MahjongYakuCatalog.init);
        } else {
            MahjongYakuCatalog.init();
        }
    }
})(window);

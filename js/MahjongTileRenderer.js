/**
 * MahjongTileRenderer.js - Calligraphic Bold Brush Edition (서예 붓글씨 풍 고가시성 마작패)
 * Traditional Korean/East-Asian calligraphy brush stroke styling with extra heavy lines.
 * 100% original, copyright-free artwork optimized for distance clarity and tactile aesthetics.
 */

(function (global) {
    const MahjongTileRenderer = {};

    const WIDTH = 256;
    const HEIGHT = 384;
    const textureCache = {};

    // Base ivory tile canvas
    function createBaseCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');

        // Solid realistic off-white melamine/ivory tile face
        ctx.fillStyle = '#fdfbf7';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Very subtle edge darkening to simulate physical 3D bevel/wear, avoiding "card" look
        ctx.strokeStyle = '#f4eedd';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(2, 2, WIDTH - 4, HEIGHT - 4, 12);
        ctx.stroke();

        return { canvas, ctx };
    }

    // Realistic Engraved Paint Colors (Darker, matte colors mimicking physical paint)
    const C_RED = '#ab1919';       // Deep Crimson Red (engraved)
    const C_BLACK = '#141414';     // Dark Matte Black
    const C_GOLD = '#e5a800';      // Metallic Gold paint for Akadora

    // Realistic Pinzu Colors - Deep, rich Midnight Navy lacquer (진한 감청색/남청색)
    const C_PIN_DEEP = '#040d21';   // Deepest Midnight Blue Contour
    const C_PIN_MAIN = '#081c44';   // Solid Rich Navy Lacquer
    const C_PIN_LIGHT = '#0d2b63';  // Navy Inner Accent
    const C_PIN_CYAN = '#0a2352';

    // Realistic Souzu Colors - Rich, vibrant Forest Jade Green (짙은 비취빛 녹색)
    const C_SOU_DEEP = '#02180a';   // Deepest Lacquer Contour Green
    const C_SOU_MAIN = '#0a4f25';   // Heavy Rich Jade Green (thicker visual weight)
    const C_SOU_LIGHT = '#0e6630';  // Lush Emerald Green
    const C_SOU_LEAF = '#137d3c';
    const C_GREEN = '#0a4f25';      // Hatsu Green Ink (deep forest green)

    // Font stack prioritizing authentic East Asian Calligraphy & Brush strokes
    const BRUSH_FONT = '"Gungsuh", "GungsuhChe", "STKaiti", "KaiTi", "DFKai-SB", "Nanum Myeongjo", serif';

    // Helper: Draw Calligraphic Kanji with bold stroke outline for authentic brush ink weight
    function drawBrushKanji(ctx, text, x, y, fontSize, color, strokeExtra = 14) {
        ctx.save();
        ctx.font = `900 ${fontSize}px ${BRUSH_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.miterLimit = 2;

        // Heavy brush ink stroke outline
        ctx.lineWidth = strokeExtra;
        ctx.strokeStyle = color;
        ctx.strokeText(text, x, y);

        // Core fill
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        ctx.restore();
    }

    // High-visibility Calligraphic Pin (통수패 원형 - AMOS 정통 깊은 남청색 매화 문양)
    function drawBrushPin(ctx, x, y, r, innerCol, outerCol, isAkaCenter = false) {
        ctx.save();

        const mainNavy = isAkaCenter ? C_RED : C_PIN_MAIN;
        const deepNavy = isAkaCenter ? '#600000' : C_PIN_DEEP;

        // 1. Solid Heavy Lacquer Disc with bold dark contour
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = mainNavy;
        ctx.fill();
        ctx.strokeStyle = deepNavy;
        ctx.lineWidth = Math.max(3.0, r * 0.14);
        ctx.stroke();

        // 2. Crisp, fine concentric engraved groove ring (thin ivory ring, so the navy disc remains dominant)
        ctx.beginPath();
        ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
        ctx.strokeStyle = isAkaCenter ? '#ffebee' : '#f4eedd';
        ctx.lineWidth = Math.max(1.8, r * 0.08);
        ctx.stroke();

        // 3. Central Plum Blossom / Solar Ring (Deep navy ink hub)
        const petR = r * 0.44;
        ctx.beginPath();
        ctx.arc(x, y, petR, 0, Math.PI * 2);
        ctx.fillStyle = deepNavy;
        ctx.fill();

        // 4 Petal notches / radiant dots for authentic AMOS plum flower wheel
        const notchCount = 4;
        for (let i = 0; i < notchCount; i++) {
            const ang = (i * Math.PI * 2) / notchCount + Math.PI / 4;
            const nx = x + Math.cos(ang) * (r * 0.44);
            const ny = y + Math.sin(ang) * (r * 0.44);
            ctx.beginPath();
            ctx.arc(nx, ny, r * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = isAkaCenter ? '#ffebee' : '#f4eedd';
            ctx.fill();
        }

        // 4. Center Gold/Ruby/Navy Jewel
        ctx.beginPath();
        ctx.arc(x, y, r * 0.20, 0, Math.PI * 2);
        ctx.fillStyle = isAkaCenter ? C_GOLD : mainNavy;
        ctx.fill();
        ctx.strokeStyle = isAkaCenter ? '#ffffff' : deepNavy;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }

    // Heavy Brush 1-Pin: Grand Solar Chrysanthemum (Deep Rich Navy Theme)
    function drawBrush1Pin(ctx, cx, cy, r, isAka) {
        ctx.save();
        const mainColor = isAka ? C_RED : C_PIN_MAIN;
        const deepColor = isAka ? '#600000' : C_PIN_DEEP;

        // 16 Thick Petals (Deep Dark Navy)
        const petals = 16;
        for (let i = 0; i < petals; i++) {
            const angle = (i * Math.PI * 2) / petals;
            const px = cx + Math.cos(angle) * (r * 0.88);
            const py = cy + Math.sin(angle) * (r * 0.88);
            ctx.beginPath();
            ctx.arc(px, py, r * 0.22, 0, Math.PI * 2);
            ctx.fillStyle = mainColor;
            ctx.fill();

            // Dark contour for maximum definition
            ctx.strokeStyle = deepColor;
            ctx.lineWidth = 3.0;
            ctx.stroke();
        }

        // Ivory separating groove
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.74, 0, Math.PI * 2);
        ctx.fillStyle = '#fdfbf7';
        ctx.fill();
        ctx.strokeStyle = deepColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Main disc with heavy dark border
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = mainColor;
        ctx.fill();
        ctx.strokeStyle = deepColor;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 8 Radiating ivory engraved rays
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const ang = (i * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * (r * 0.32), cy + Math.sin(ang) * (r * 0.32));
            ctx.lineTo(cx + Math.cos(ang) * (r * 0.62), cy + Math.sin(ang) * (r * 0.62));
            ctx.stroke();
        }

        // Inner disc
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = deepColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Center sapphire/gold jewel
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = isAka ? C_GOLD : '#12397e';
        ctx.fill();
        ctx.strokeStyle = isAka ? '#ffffff' : C_GOLD;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.restore();
    }

    // Heavy Calligraphic Bamboo (삭수패 대나무 - 굵고 진한 고밀도 비취빛 라인)
    function drawBrushBamboo(ctx, x, y, w, h, col, hasRedCenter = false, angle = 0) {
        ctx.save();
        ctx.translate(x, y);
        if (angle !== 0) ctx.rotate(angle);

        const hw = w / 2;
        const hh = h / 2;

        // Dark calligraphy ink outline for deep contrast (thick 4.5px stroke)
        ctx.strokeStyle = C_SOU_DEEP;
        ctx.lineWidth = 4.5;
        ctx.fillStyle = col;

        // Top joint segment (slightly curved cylinder segment)
        ctx.beginPath();
        ctx.roundRect(-hw, -hh, w, hh * 0.92, 5);
        ctx.fill();
        ctx.stroke();

        // Bottom joint segment
        ctx.beginPath();
        ctx.roundRect(-hw, hh * 0.08, w, hh * 0.92, 5);
        ctx.fill();
        ctx.stroke();

        // Center bamboo node (Deep forest green or Red if aka/accent)
        ctx.fillStyle = hasRedCenter ? C_RED : C_SOU_DEEP;
        ctx.beginPath();
        ctx.ellipse(0, 0, hw * 1.25, hh * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hasRedCenter ? '#2b0000' : '#02180a';
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // Subtle vertical bamboo stem grain / groove (fine dark line down the center for authentic carved groove)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, -hh * 0.88);
        ctx.lineTo(0, -hh * 0.12);
        ctx.moveTo(0, hh * 0.16);
        ctx.lineTo(0, hh * 0.88);
        ctx.stroke();

        // End caps (slight curved rim at top and bottom ends for physical presence)
        ctx.strokeStyle = C_SOU_DEEP;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, -hh + 3, hw * 0.85, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, hh - 3, hw * 0.85, 3, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Masterpiece 1-Sou: Calligraphic Oriental Peacock/Phoenix with Bold Green Lines
    function drawBrush1Sou(ctx, cx, cy, isAka) {
        ctx.save();
        const bodyCol = isAka ? C_RED : C_SOU_MAIN;
        const wingCol = isAka ? '#b71c1c' : C_SOU_LIGHT;
        const crestCol = isAka ? C_GOLD : C_SOU_MAIN;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // Perch tree branch
        ctx.fillStyle = '#4e342e';
        ctx.strokeStyle = '#271202';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.roundRect(cx - 82, cy + 96, 164, 22, 11);
        ctx.fill();
        ctx.stroke();

        // 7 Symmetrical Fan Tail Feathers with rich, extra-bold green ink outlines
        for (let i = -3; i <= 3; i++) {
            ctx.save();
            ctx.translate(cx, cy + 24);
            ctx.rotate((i * Math.PI) / 12);

            ctx.fillStyle = isAka ? '#c62828' : (Math.abs(i) % 2 === 0 ? C_SOU_MAIN : C_SOU_LIGHT);
            ctx.strokeStyle = C_SOU_DEEP;
            ctx.lineWidth = 5.0;
            ctx.beginPath();
            ctx.ellipse(0, -68, 17, 56, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Feather eye spot (Gold and Green)
            ctx.fillStyle = C_GOLD;
            ctx.beginPath();
            ctx.arc(0, -96, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = isAka ? C_RED : C_SOU_MAIN;
            ctx.beginPath();
            ctx.arc(0, -96, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Main body with thick stroke
        ctx.fillStyle = bodyCol;
        ctx.strokeStyle = C_SOU_DEEP;
        ctx.lineWidth = 6.0;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 32, 44, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dynamic wings in lush emerald green
        ctx.fillStyle = wingCol;
        ctx.strokeStyle = C_SOU_DEEP;
        ctx.lineWidth = 5.0;

        // Left wing
        ctx.beginPath();
        ctx.moveTo(cx - 28, cy + 8);
        ctx.quadraticCurveTo(cx - 76, cy - 10, cx - 55, cy + 70);
        ctx.quadraticCurveTo(cx - 25, cy + 50, cx - 22, cy + 24);
        ctx.fill();
        ctx.stroke();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(cx + 28, cy + 8);
        ctx.quadraticCurveTo(cx + 76, cy - 10, cx + 55, cy + 70);
        ctx.quadraticCurveTo(cx + 25, cy + 50, cx + 22, cy + 24);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = bodyCol;
        ctx.strokeStyle = C_SOU_DEEP;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.arc(cx, cy - 44, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Beak
        ctx.fillStyle = C_GOLD;
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy - 44);
        ctx.lineTo(cx - 46, cy - 38);
        ctx.lineTo(cx - 22, cy - 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx - 10, cy - 48, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx - 11, cy - 48, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 3 Crown Crest feathers with bold ink contours
        ctx.fillStyle = crestCol;
        ctx.strokeStyle = isAka ? '#4a0000' : C_SOU_DEEP;
        ctx.lineWidth = 4.5;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.ellipse(cx + i * 20, cy - 78, 11, 24, (i * Math.PI) / 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    // Corner Index Helper (Clear bold digits)
    function drawCornerIndex(ctx, text, col = '#666666') {
        ctx.save();
        ctx.fillStyle = col;
        ctx.font = '900 48px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, 14, 14);

        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, WIDTH - 14, HEIGHT - 14);
        ctx.restore();
    }

    // Generate Calligraphic Bold Tile Texture
    MahjongTileRenderer.getTileTextureCanvas = function (tileCode, isAka = false) {
        const cacheKey = `brush_${tileCode}_${isAka ? 'aka' : 'norm'}`;
        if (textureCache[cacheKey]) {
            return textureCache[cacheKey];
        }

        const { canvas, ctx } = createBaseCanvas();
        const type = tileCode.slice(-1);
        const val = parseInt(tileCode[0], 10);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 1. Manzu (萬子: 1m~9m) - Heavy Calligraphy Brush Strokes (붓글씨)
        if (type === 'm') {
            const kanjiNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
            const numText = kanjiNumbers[val];

            // All normal numbers (1~9) are strictly JET BLACK; only Aka 5m is RED
            const topColor = isAka ? C_RED : C_BLACK;
            const manColor = isAka ? C_RED : C_RED;

            // Heavy Calligraphic Number (붓글씨 상단 숫자)
            drawBrushKanji(ctx, numText, WIDTH / 2, 130, 144, topColor, 15);

            // Heavy Calligraphic '萬' (붓글씨 하단 만)
            drawBrushKanji(ctx, '萬', WIDTH / 2, 268, 120, manColor, 13);

            // Akadora Golden Jewel
            if (isAka) {
                ctx.fillStyle = C_GOLD;
                ctx.beginPath();
                ctx.arc(WIDTH / 2, 196, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            drawCornerIndex(ctx, `${val}m`, isAka ? C_RED : '#555555');
        }

        // 2. Pinzu (筒子: 1p~9p) - Deep Midnight Navy Palette (진한 감청색 계열)
        else if (type === 'p') {
            const cx = WIDTH / 2;
            const cy = HEIGHT / 2;
            const cBlue = isAka ? C_RED : C_PIN_MAIN;
            const cDeep = isAka ? C_RED : C_PIN_DEEP;
            const cLight = isAka ? C_RED : C_PIN_LIGHT;

            if (val === 1) {
                drawBrush1Pin(ctx, cx, cy, 110, isAka);
            } else if (val === 2) {
                drawBrushPin(ctx, cx, 114, 44, cDeep, cBlue);
                drawBrushPin(ctx, cx, 270, 44, cBlue, cDeep);
            } else if (val === 3) {
                drawBrushPin(ctx, cx - 62, 105, 36, cDeep, cBlue);
                drawBrushPin(ctx, cx, cy, 36, cLight, cBlue);
                drawBrushPin(ctx, cx + 62, 279, 36, cBlue, cDeep);
            } else if (val === 4) {
                drawBrushPin(ctx, cx - 58, 115, 36, cDeep, cBlue);
                drawBrushPin(ctx, cx + 58, 115, 36, cBlue, cDeep);
                drawBrushPin(ctx, cx - 58, 269, 36, cBlue, cDeep);
                drawBrushPin(ctx, cx + 58, 269, 36, cDeep, cBlue);
            } else if (val === 5) {
                if (isAka) {
                    drawBrushPin(ctx, cx - 60, 108, 32, '#b71c1c', C_RED);
                    drawBrushPin(ctx, cx + 60, 108, 32, C_RED, '#b71c1c');
                    drawBrushPin(ctx, cx, cy, 38, C_RED, C_RED, true);
                    drawBrushPin(ctx, cx - 60, 276, 32, C_RED, '#b71c1c');
                    drawBrushPin(ctx, cx + 60, 276, 32, '#b71c1c', C_RED);
                } else {
                    drawBrushPin(ctx, cx - 60, 108, 32, cDeep, cBlue);
                    drawBrushPin(ctx, cx + 60, 108, 32, cBlue, cDeep);
                    drawBrushPin(ctx, cx, cy, 38, cDeep, cBlue, false);
                    drawBrushPin(ctx, cx - 60, 276, 32, cBlue, cDeep);
                    drawBrushPin(ctx, cx + 60, 276, 32, cDeep, cBlue);
                }
            } else if (val === 6) {
                const ys = [98, 192, 286];
                for (let y of ys) {
                    drawBrushPin(ctx, cx - 58, y, 32, cDeep, cBlue);
                    drawBrushPin(ctx, cx + 58, y, 32, cBlue, cDeep);
                }
            } else if (val === 7) {
                drawBrushPin(ctx, cx - 66, 90, 28, cLight, cBlue);
                drawBrushPin(ctx, cx, 114, 28, cDeep, cBlue);
                drawBrushPin(ctx, cx + 66, 138, 28, cLight, cBlue);
                drawBrushPin(ctx, cx - 58, 226, 29, cDeep, cBlue);
                drawBrushPin(ctx, cx + 58, 226, 29, cBlue, cDeep);
                drawBrushPin(ctx, cx - 58, 308, 29, cBlue, cDeep);
                drawBrushPin(ctx, cx + 58, 308, 29, cDeep, cBlue);
            } else if (val === 8) {
                const ys = [84, 156, 228, 300];
                for (let y of ys) {
                    drawBrushPin(ctx, cx - 58, y, 28, cDeep, cBlue);
                    drawBrushPin(ctx, cx + 58, y, 28, cBlue, cDeep);
                }
            } else if (val === 9) {
                const xs = [cx - 66, cx, cx + 66];
                const ys = [104, 192, 280];
                for (let r = 0; r < 3; r++) {
                    const rowColor = (r === 1) ? cLight : cBlue;
                    for (let c = 0; c < 3; c++) {
                        drawBrushPin(ctx, xs[c], ys[r], 28, cDeep, rowColor);
                    }
                }
            }

            drawCornerIndex(ctx, `${val}p`, isAka ? C_RED : C_PIN_MAIN);
        }

        // 3. Souzu (索子: 1s~9s) - Rich Vibrant Forest Jade Green (굵은 초록선 계열)
        else if (type === 's') {
            const cx = WIDTH / 2;
            const cy = HEIGHT / 2;
            const colMain = isAka ? C_RED : C_SOU_MAIN;
            const colLight = isAka ? C_RED : C_SOU_LIGHT;

            if (val === 1) {
                drawBrush1Sou(ctx, cx, cy, isAka);
            } else if (val === 2) {
                drawBrushBamboo(ctx, cx, 116, 54, 94, colMain);
                drawBrushBamboo(ctx, cx, 268, 54, 94, colLight);
            } else if (val === 3) {
                drawBrushBamboo(ctx, cx, 114, 46, 88, colMain);
                drawBrushBamboo(ctx, cx - 62, 266, 46, 88, colMain);
                drawBrushBamboo(ctx, cx + 62, 266, 46, 88, colLight);
            } else if (val === 4) {
                drawBrushBamboo(ctx, cx - 62, 116, 44, 88, colMain);
                drawBrushBamboo(ctx, cx + 62, 116, 44, 88, colLight);
                drawBrushBamboo(ctx, cx - 62, 268, 44, 88, colLight);
                drawBrushBamboo(ctx, cx + 62, 268, 44, 88, colMain);
            } else if (val === 5) {
                if (isAka) {
                    // Aka 5s: all 5 bamboos are vivid RED
                    drawBrushBamboo(ctx, cx - 64, 114, 42, 84, C_RED, false);
                    drawBrushBamboo(ctx, cx + 64, 114, 42, 84, '#c62828', false);
                    drawBrushBamboo(ctx, cx, cy, 48, 88, C_RED, true);
                    drawBrushBamboo(ctx, cx - 64, 270, 42, 84, '#c62828', false);
                    drawBrushBamboo(ctx, cx + 64, 270, 42, 84, C_RED, false);
                } else {
                    // Normal 5s: all 5 bamboos are lush GREEN with green nodes
                    drawBrushBamboo(ctx, cx - 64, 114, 42, 84, colMain, false);
                    drawBrushBamboo(ctx, cx + 64, 114, 42, 84, colLight, false);
                    drawBrushBamboo(ctx, cx, cy, 48, 88, colMain, false);
                    drawBrushBamboo(ctx, cx - 64, 270, 42, 84, colLight, false);
                    drawBrushBamboo(ctx, cx + 64, 270, 42, 84, colMain, false);
                }
            } else if (val === 6) {
                const ys = [116, 268];
                for (let y of ys) {
                    drawBrushBamboo(ctx, cx - 70, y, 42, 86, colMain);
                    drawBrushBamboo(ctx, cx, y, 42, 86, colLight);
                    drawBrushBamboo(ctx, cx + 70, y, 42, 86, colMain);
                }
            } else if (val === 7) {
                // Standard Japanese 7s: 2 angled on top, 2 middle, 3 bottom = 7 bamboos
                drawBrushBamboo(ctx, cx - 44, 88, 42, 80, isAka ? C_RED : colLight, false, -0.16);
                drawBrushBamboo(ctx, cx + 44, 88, 42, 80, isAka ? C_RED : colLight, false, 0.16);
                drawBrushBamboo(ctx, cx - 58, 190, 42, 78, colMain);
                drawBrushBamboo(ctx, cx + 58, 190, 42, 78, colMain);
                drawBrushBamboo(ctx, cx - 68, 292, 40, 78, colLight);
                drawBrushBamboo(ctx, cx, 292, 40, 78, colMain);
                drawBrushBamboo(ctx, cx + 68, 292, 40, 78, colLight);
            } else if (val === 8) {
                // 2 rows of 4 bamboos (thick green bars)
                drawBrushBamboo(ctx, cx - 75, 105, 36, 76, colMain);
                drawBrushBamboo(ctx, cx - 25, 105, 36, 76, colLight);
                drawBrushBamboo(ctx, cx + 25, 105, 36, 76, colLight);
                drawBrushBamboo(ctx, cx + 75, 105, 36, 76, colMain);

                drawBrushBamboo(ctx, cx - 75, 275, 36, 76, colLight);
                drawBrushBamboo(ctx, cx - 25, 275, 36, 76, colMain);
                drawBrushBamboo(ctx, cx + 25, 275, 36, 76, colMain);
                drawBrushBamboo(ctx, cx + 75, 275, 36, 76, colLight);
            } else if (val === 9) {
                const xs = [cx - 68, cx, cx + 68];
                const ys = [104, 192, 280];
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        const col = (c === 1) ? colLight : colMain;
                        drawBrushBamboo(ctx, xs[c], ys[r], 40, 80, col);
                    }
                }
            }

            drawCornerIndex(ctx, `${val}s`, isAka ? C_RED : C_SOU_MAIN);
        }

        // 4. Jihai (字牌: 東南西北 白發中) - Monumental Calligraphy Masterpieces (묵직한 해서 서예 필치)
        else if (type === 'z') {
            const honors = ['', '東', '南', '西', '北', '白', '發', '中'];
            const char = honors[val];

            if (val >= 1 && val <= 4) {
                // Winds (東, 南, 西, 北) - Deep Sumi Ink Brush
                drawBrushKanji(ctx, char, WIDTH / 2, HEIGHT / 2 + 10, 225, C_BLACK, 16);
            } else if (val === 5) {
                // Haku (白) - Heavy Royal Blue Calligraphic Frame
                ctx.strokeStyle = '#0d47a1';
                ctx.lineWidth = 20;
                ctx.beginPath();
                ctx.roundRect(36, 46, WIDTH - 72, HEIGHT - 92, 18);
                ctx.stroke();

                ctx.strokeStyle = '#64b5f6';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.roundRect(48, 58, WIDTH - 96, HEIGHT - 116, 12);
                ctx.stroke();
            } else if (val === 6) {
                // Hatsu (發) - Striking Pine Green Brush
                drawBrushKanji(ctx, '發', WIDTH / 2, HEIGHT / 2 + 10, 225, C_GREEN, 16);
            } else if (val === 7) {
                // Chun (中) - Heavy Vermilion Seal Red Brush
                drawBrushKanji(ctx, '中', WIDTH / 2, HEIGHT / 2 + 10, 225, C_RED, 18);
            }
        }

        textureCache[cacheKey] = canvas;
        return canvas;
    };

    MahjongTileRenderer.getTileKoreanName = function (tileCode, isAka = false) {
        if (!tileCode || typeof tileCode !== 'string') return '';
        const type = tileCode.slice(-1);
        const val = parseInt(tileCode[0], 10);
        let name = '';
        if (type === 'm') name = `${val}만`;
        else if (type === 'p') name = `${val}통`;
        else if (type === 's') name = `${val}삭`;
        else if (type === 'z') {
            const honors = ['', '동', '남', '서', '북', '백', '발', '중'];
            name = honors[val] || '';
        }
        return isAka ? `적 ${name}` : name;
    };

    global.MahjongTileRenderer = MahjongTileRenderer;
})(window);

/**
 * Mahjong3D.js
 * Three.js 3D Mahjong Table and Tile Renderer.
 * Renders textured 3D tiles, 4 walls, hands, discards, and animations.
 */

(function (global) {
    const Mahjong3D = {};

    // Standard tile dimensions in 3D units (scaled up for high-readability top-down view)
    const TILE_W = 1.9;
    const TILE_H = 2.6;
    const TILE_D = 1.2;

    // =========================================================================
    // Web Audio API Physical Acoustic Synthesizer (Realistic AMOS Mahjong Sound)
    // Procedural synthesis: 0ms latency, zero external file dependency, file:// compatible.
    // =========================================================================
    class MahjongAudioManager {
        constructor() {
            this.ctx = null;
            this.isMuted = false;
            this.masterGain = null;
            this.reverbNode = null;
            this.reverbGain = null;
        }

        initContext() {
            if (this.isMuted) return;
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    this.setupAudioGraph();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        setupAudioGraph() {
            if (!this.ctx) return;
            try {
                // Master Volume Node (0.85 volume headroom)
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);

                // Procedural Stereo Room Reverb (0.28s Studio Room IR)
                const rate = this.ctx.sampleRate;
                const length = Math.floor(rate * 0.28);
                const irBuffer = this.ctx.createBuffer(2, length, rate);
                const left = irBuffer.getChannelData(0);
                const right = irBuffer.getChannelData(1);

                for (let i = 0; i < length; i++) {
                    const t = i / rate;
                    const decay = Math.exp(-t / 0.075);
                    // Slight stereo decorrelation for wide natural room space
                    left[i] = (Math.random() * 2 - 1) * decay * (1.0 - t * 1.5);
                    right[i] = (Math.random() * 2 - 1) * decay * (1.0 - t * 1.5);
                }

                this.reverbNode = this.ctx.createConvolver();
                this.reverbNode.buffer = irBuffer;

                const reverbFilter = this.ctx.createBiquadFilter();
                reverbFilter.type = 'lowpass';
                reverbFilter.frequency.value = 3600; // Dampen high flutter

                this.reverbGain = this.ctx.createGain();
                this.reverbGain.gain.setValueAtTime(0.20, this.ctx.currentTime); // 20% wet

                this.reverbNode.connect(reverbFilter);
                reverbFilter.connect(this.reverbGain);
                this.reverbGain.connect(this.masterGain);
            } catch (e) {
                console.warn('Audio graph setup notice:', e);
            }
        }

        // Helper to route sound through both direct output and subtle room reverb
        routeOutput(node, reverbSend = 0.3) {
            if (!this.ctx) return;
            try {
                // Direct Dry output
                if (this.masterGain) {
                    node.connect(this.masterGain);
                } else {
                    node.connect(this.ctx.destination);
                }

                // Reverb Send
                if (this.reverbNode && reverbSend > 0) {
                    const sendGain = this.ctx.createGain();
                    sendGain.gain.setValueAtTime(reverbSend, this.ctx.currentTime);
                    node.connect(sendGain);
                    sendGain.connect(this.reverbNode);
                }
            } catch (e) {}
        }

        // ---------------------------------------------------------------------
        // 1. Physical Tile Discard ("탁!" - AMOS 16g Urea-Resin on Velvet Felt)
        // ---------------------------------------------------------------------
        playTileDiscard(isStrong = false) {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // Micro-variations in pitch and volume so no two discards sound robotic
                const pitch = 0.95 + Math.random() * 0.10;
                const vol = (0.92 + Math.random() * 0.16) * (isStrong ? 1.4 : 1.0);

                // Layer A: Sharp Melamine Transient Click (딱!)
                const oscClick = this.ctx.createOscillator();
                const gainClick = this.ctx.createGain();
                oscClick.type = 'sine';
                oscClick.frequency.setValueAtTime(2900 * pitch, now);
                oscClick.frequency.exponentialRampToValueAtTime(750, now + 0.012);

                gainClick.gain.setValueAtTime(0.32 * vol, now);
                gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

                oscClick.connect(gainClick);
                this.routeOutput(gainClick, 0.25);
                oscClick.start(now);
                oscClick.stop(now + 0.015);

                // Layer B: Surface Impact Noise Burst (micro-second high crack)
                const noiseLen = Math.floor(this.ctx.sampleRate * 0.016);
                const noiseBuf = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
                const nData = noiseBuf.getChannelData(0);
                for (let i = 0; i < noiseLen; i++) {
                    nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.003));
                }
                const noiseSrc = this.ctx.createBufferSource();
                noiseSrc.buffer = noiseBuf;

                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 3400 * pitch;
                noiseFilter.Q.value = 3.2;

                const gainNoise = this.ctx.createGain();
                gainNoise.gain.setValueAtTime(0.24 * vol, now);
                gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.016);

                noiseSrc.connect(noiseFilter);
                noiseFilter.connect(gainNoise);
                this.routeOutput(gainNoise, 0.2);
                noiseSrc.start(now);
                noiseSrc.stop(now + 0.016);

                // Layer C: Melamine Resin Body Ring (도자기/고밀도 수지 고유 공명음)
                const resModes = [1240 * pitch, 2180 * pitch];
                const resGains = [0.18 * vol, 0.12 * vol];
                resModes.forEach((freq, idx) => {
                    const oscRes = this.ctx.createOscillator();
                    const gainRes = this.ctx.createGain();
                    oscRes.type = 'sine';
                    oscRes.frequency.setValueAtTime(freq, now);

                    gainRes.gain.setValueAtTime(resGains[idx], now);
                    gainRes.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

                    oscRes.connect(gainRes);
                    this.routeOutput(gainRes, 0.35);
                    oscRes.start(now);
                    oscRes.stop(now + 0.04);
                });

                // Layer D: Table & Dense Velvet Felt Thud (16g 묵직한 하판 타격 저음)
                const oscThump = this.ctx.createOscillator();
                const gainThump = this.ctx.createGain();
                oscThump.type = 'sine';
                const startFreq = isStrong ? 185 * pitch : 165 * pitch;
                const endFreq = isStrong ? 42 : 52;
                const thumpDur = isStrong ? 0.065 : 0.048;

                oscThump.frequency.setValueAtTime(startFreq, now);
                oscThump.frequency.exponentialRampToValueAtTime(endFreq, now + thumpDur);

                const thumpFilter = this.ctx.createBiquadFilter();
                thumpFilter.type = 'lowpass';
                thumpFilter.frequency.value = 280;

                gainThump.gain.setValueAtTime((isStrong ? 0.52 : 0.40) * vol, now);
                gainThump.gain.exponentialRampToValueAtTime(0.001, now + thumpDur);

                oscThump.connect(thumpFilter);
                thumpFilter.connect(gainThump);
                this.routeOutput(gainThump, 0.15);
                oscThump.start(now);
                oscThump.stop(now + thumpDur);
            } catch (e) {}
        }

        // ---------------------------------------------------------------------
        // 2. Physical Tile Draw ("슥-착" - Velvet Felt Slide & Pickup)
        // ---------------------------------------------------------------------
        playTileDraw() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // Friction noise: tile sliding across dense felt
                const slideDur = 0.065;
                const bufLen = Math.floor(this.ctx.sampleRate * slideDur);
                const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < bufLen; i++) {
                    const progress = i / bufLen;
                    const env = Math.sin(progress * Math.PI);
                    data[i] = (Math.random() * 2 - 1) * env;
                }

                const noise = this.ctx.createBufferSource();
                noise.buffer = buf;

                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1600, now);
                filter.frequency.exponentialRampToValueAtTime(850, now + slideDur);
                filter.Q.value = 2.0;

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + slideDur);

                noise.connect(filter);
                filter.connect(gain);
                this.routeOutput(gain, 0.2);
                noise.start(now);
                noise.stop(now + slideDur);

                // Subtle ceramic pickup tap (착)
                const tapOsc = this.ctx.createOscillator();
                const tapGain = this.ctx.createGain();
                tapOsc.type = 'sine';
                tapOsc.frequency.setValueAtTime(840, now + 0.02);
                tapGain.gain.setValueAtTime(0.06, now + 0.02);
                tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

                tapOsc.connect(tapGain);
                this.routeOutput(tapGain, 0.25);
                tapOsc.start(now + 0.02);
                tapOsc.stop(now + 0.04);
            } catch (e) {}
        }

        // ---------------------------------------------------------------------
        // 3. Furo Calls (치 / 퐁 / 깡)
        // ---------------------------------------------------------------------
        // Chi: Two hand tiles smoothly aligning with called tile (착-탁)
        playChi() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                this.playTileClickAt(now, 1400, 0.16);
                this.playTileClickAt(now + 0.042, 1180, 0.22, true);
            } catch (e) {}
        }

        // Pon: Rapid authoritative double-snap against the called tile (타-딱!)
        playPon() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                this.playTileClickAt(now, 1550, 0.18);
                this.playTileClickAt(now + 0.050, 1120, 0.32, true);
            } catch (e) {}
        }

        // Kan: Grand 4-tile cascading clatter & heavy table thud (차라랑-탁!)
        playKan() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                this.playTileClickAt(now, 1680, 0.18);
                this.playTileClickAt(now + 0.038, 1420, 0.22);
                this.playTileClickAt(now + 0.088, 1080, 0.38, true);
            } catch (e) {}
        }

        // Backward compatibility
        playFuro(type = 'pon') {
            if (type === 'chi') this.playChi();
            else if (type === 'kan' || type === 'ankan' || type === 'kakan') this.playKan();
            else this.playPon();
        }

        // Internal helper: Tile impact clack at specific timestamp
        playTileClickAt(time, freq, volume, withThud = false) {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.45, time + 0.025);

            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.028);

            osc.connect(gain);
            this.routeOutput(gain, 0.3);
            osc.start(time);
            osc.stop(time + 0.03);

            if (withThud) {
                const thudOsc = this.ctx.createOscillator();
                const thudGain = this.ctx.createGain();
                thudOsc.type = 'sine';
                thudOsc.frequency.setValueAtTime(150, time);
                thudOsc.frequency.exponentialRampToValueAtTime(50, time + 0.04);
                thudGain.gain.setValueAtTime(volume * 1.1, time);
                thudGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

                thudOsc.connect(thudGain);
                this.routeOutput(thudGain, 0.2);
                thudOsc.start(time);
                thudOsc.stop(time + 0.042);
            }
        }

        // ---------------------------------------------------------------------
        // 4. Riichi Declaration & Tenbou Clink (리치 선언 & 1000점봉 탁음)
        // ---------------------------------------------------------------------
        playRiichi() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // 1. Dramatic whoosh / tension rise
                const whooshLen = Math.floor(this.ctx.sampleRate * 0.18);
                const whooshBuf = this.ctx.createBuffer(1, whooshLen, this.ctx.sampleRate);
                const wData = whooshBuf.getChannelData(0);
                for (let i = 0; i < whooshLen; i++) {
                    const t = i / whooshLen;
                    wData[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI);
                }
                const whooshSrc = this.ctx.createBufferSource();
                whooshSrc.buffer = whooshBuf;
                const whooshFilter = this.ctx.createBiquadFilter();
                whooshFilter.type = 'bandpass';
                whooshFilter.frequency.setValueAtTime(400, now);
                whooshFilter.frequency.exponentialRampToValueAtTime(2200, now + 0.16);
                whooshFilter.Q.value = 2.0;

                const whooshGain = this.ctx.createGain();
                whooshGain.gain.setValueAtTime(0.18, now);
                whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

                whooshSrc.connect(whooshFilter);
                whooshFilter.connect(whooshGain);
                this.routeOutput(whooshGain, 0.4);
                whooshSrc.start(now);
                whooshSrc.stop(now + 0.18);

                // 2. Iconic 1,000pt bone stick landing (맑고 청명한 점봉 착음 챙-탁!)
                const stickTime = now + 0.12;
                const frequencies = [2480, 3720]; // Acrylic / bone dual resonance
                frequencies.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, stickTime);

                    gain.gain.setValueAtTime(idx === 0 ? 0.22 : 0.14, stickTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, stickTime + 0.24);

                    osc.connect(gain);
                    this.routeOutput(gain, 0.45);
                    osc.start(stickTime);
                    osc.stop(stickTime + 0.25);
                });

                // Felt tap under the stick
                const tapOsc = this.ctx.createOscillator();
                const tapGain = this.ctx.createGain();
                tapOsc.type = 'sine';
                tapOsc.frequency.setValueAtTime(210, stickTime);
                tapOsc.frequency.exponentialRampToValueAtTime(70, stickTime + 0.035);
                tapGain.gain.setValueAtTime(0.18, stickTime);
                tapGain.gain.exponentialRampToValueAtTime(0.001, stickTime + 0.035);
                tapOsc.connect(tapGain);
                this.routeOutput(tapGain, 0.2);
                tapOsc.start(stickTime);
                tapOsc.stop(stickTime + 0.038);
            } catch (e) {}
        }

        // Tension-building cinematic drone for Riichi declaration
        playRiichiTension() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // Deep cinematic sub-pulse
                const lowOsc = this.ctx.createOscillator();
                const lowGain = this.ctx.createGain();
                lowOsc.type = 'sine';
                lowOsc.frequency.setValueAtTime(80, now);
                lowOsc.frequency.exponentialRampToValueAtTime(28, now + 1.8);

                lowGain.gain.setValueAtTime(0, now);
                lowGain.gain.linearRampToValueAtTime(0.45, now + 0.08);
                lowGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

                lowOsc.connect(lowGain);
                this.routeOutput(lowGain, 0.4);
                lowOsc.start(now);
                lowOsc.stop(now + 2.2);

                // High ethereal shimmer
                const highOsc = this.ctx.createOscillator();
                const highGain = this.ctx.createGain();
                highOsc.type = 'sine';
                highOsc.frequency.setValueAtTime(1108.73, now); // C#6
                highOsc.frequency.linearRampToValueAtTime(1046.50, now + 1.8);

                highGain.gain.setValueAtTime(0, now);
                highGain.gain.linearRampToValueAtTime(0.06, now + 0.15);
                highGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

                highOsc.connect(highGain);
                this.routeOutput(highGain, 0.6);
                highOsc.start(now);
                highOsc.stop(now + 1.8);
            } catch (e) {}
        }

        // ---------------------------------------------------------------------
        // 5. Win / Agari (화료: 론 / 쯔모 / 역만)
        // ---------------------------------------------------------------------
        playWin(isTsumo = false, isYakuman = false) {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // 1. Heavy Winning Tile Slam (중후한 화료패 젖힘 타패음)
                this.playTileDiscard(true);

                // 2. Elegant, radiant Japanese Pentatonic celebration chime
                // Pentatonic harmony: D5, F#5, A5, D6, F#6 (587.33, 739.99, 880.00, 1174.66, 1479.98)
                const chord = [587.33, 739.99, 880.00, 1174.66, 1479.98];
                const stagger = isYakuman ? 0.09 : 0.07;
                const decayTime = isYakuman ? 2.8 : 2.0;

                chord.forEach((freq, i) => {
                    const startTime = now + 0.06 + i * stagger;

                    // Dual oscillator for rich, warm chorused crystal timbre
                    [-2, 2].forEach(detune => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();

                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, startTime);
                        osc.detune.setValueAtTime(detune, startTime);

                        gain.gain.setValueAtTime(0, startTime);
                        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.015);
                        gain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

                        osc.connect(gain);
                        this.routeOutput(gain, 0.55);
                        osc.start(startTime);
                        osc.stop(startTime + decayTime);
                    });
                });

                // Extra sub-rumble for Yakuman
                if (isYakuman) {
                    const subOsc = this.ctx.createOscillator();
                    const subGain = this.ctx.createGain();
                    subOsc.type = 'sine';
                    subOsc.frequency.setValueAtTime(110, now + 0.1);
                    subOsc.frequency.exponentialRampToValueAtTime(35, now + 1.2);
                    subGain.gain.setValueAtTime(0.35, now + 0.1);
                    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
                    subOsc.connect(subGain);
                    this.routeOutput(subGain, 0.3);
                    subOsc.start(now + 0.1);
                    subOsc.stop(now + 1.5);
                }
            } catch (e) {}
        }

        // ---------------------------------------------------------------------
        // 6. Draw / Ryuukyoku (유국: 도중유국 및 황패유국)
        // ---------------------------------------------------------------------
        playDraw() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // Solemn, serene bronze singing bowl / temple bell tone
                const harmonics = [216, 432, 648];
                const gains = [0.22, 0.12, 0.06];

                harmonics.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now);

                    gain.gain.setValueAtTime(0, now);
                    gain.gain.linearRampToValueAtTime(gains[idx], now + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

                    osc.connect(gain);
                    this.routeOutput(gain, 0.6);
                    osc.start(now);
                    osc.stop(now + 2.5);
                });
            } catch (e) {}
        }

        // ---------------------------------------------------------------------
        // 7. Micro Tactile Interactions (패 호버 / 클릭)
        // ---------------------------------------------------------------------
        playTileHover() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1750, now);
                gain.gain.setValueAtTime(0.025, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

                osc.connect(gain);
                this.routeOutput(gain, 0.1);
                osc.start(now);
                osc.stop(now + 0.013);
            } catch (e) {}
        }

        playTileClick() {
            if (this.isMuted) return;
            try {
                this.initContext();
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1150, now);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

                osc.connect(gain);
                this.routeOutput(gain, 0.15);
                osc.start(now);
                osc.stop(now + 0.02);
            } catch (e) {}
        }
    }

    const MahjongAudio = new MahjongAudioManager();
    global.MahjongAudio = MahjongAudio;
    Mahjong3D.Audio = MahjongAudio;

    class SceneManager {
        constructor(containerElement, onTileClick, onTileHover, onTileHoverOut) {
            this.container = containerElement;
            this.onTileClick = onTileClick;
            this.onTileHover = onTileHover;
            this.onTileHoverOut = onTileHoverOut;

            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();

            // Materials cache
            this.tileMaterials = {};
            this.hoveredTile = null;

            // Objects mapping
            this.playerHandMeshes = [];
            this.aiHandMeshes = [[], [], []];
            this.discardMeshes = [[], [], [], []];
            this.meldMeshes = [[], [], [], []];
            this.wallMeshes = [];
            this.doraMeshes = [];
            this.doraIndicatorMeshes = [];
            this.uradoraIndicatorMeshes = [];
            this.rinshanMeshes = [];
            this.activeDoraMeshes = [];
            this.activeUradoraMeshes = [];
            this.deadWallMeshesInitialized = false;
            this.riichiStickMeshes = [];

            // Central Table Display Console
            this.centerDisplayMesh = null;
            this.centerDisplayCanvas = null;
            this.centerDisplayCtx = null;
            this.centerDisplayTexture = null;
            this.centerDisplayLedBars = [];

            // Active 3D Animations & Highlights
            this.animations = [];
            this.latestDiscardMarker = null;

            this.init();
        }

        init() {
            const width = this.container.clientWidth || window.innerWidth;
            const height = this.container.clientHeight || window.innerHeight;

            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x101418);

            // Camera: Top-Down perspective view by default
            this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
            this.setTableView(false);

            // WebGL Renderer with Physically Based Rendering (PBR)
            if (THREE.ColorManagement) THREE.ColorManagement.enabled = true;
            this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.05;
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFShadowMap;
            this.container.appendChild(this.renderer.domElement);

            // Lighting
            this.setupLighting();

            // Build Mahjong Table
            this.createTable();

            // Events - Bind to window to never miss clicks
            window.addEventListener('resize', () => this.onResize());
            window.addEventListener('mousemove', (e) => this.onMouseMove(e));
            window.addEventListener('click', (e) => this.onClick(e));
            this.setupCameraControls();

            // Animation Loop
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        // --- Orbit camera (spherical coords around a target) ---
        // Right-drag: rotate / Wheel: zoom / Middle-drag or Shift+Right-drag: pan
        applyCamera() {
            const c = this.camCtrl;
            const sinP = Math.sin(c.phi);
            this.camera.position.set(
                c.target.x + c.radius * sinP * Math.sin(c.theta),
                c.target.y + c.radius * Math.cos(c.phi),
                c.target.z + c.radius * sinP * Math.cos(c.theta)
            );
            this.camera.lookAt(c.target);
        }

        setCameraPreset(target, radius, theta, phi) {
            this.camCtrl = this.camCtrl || { target: new THREE.Vector3() };
            this.camCtrl.target.copy(target);
            this.camCtrl.radius = radius;
            this.camCtrl.theta = theta;
            this.camCtrl.phi = phi;
            this.applyCamera();
        }

        setupCameraControls() {
            const el = this.renderer.domElement;
            const c = this.camCtrl;
            const MIN_R = 18, MAX_R = 140;
            const MIN_PHI = 0.05, MAX_PHI = Math.PI / 2 - 0.03; // never go below the table
            let dragMode = null; // 'rotate' | 'pan'
            let lastX = 0, lastY = 0;

            el.addEventListener('contextmenu', (e) => e.preventDefault());

            el.addEventListener('mousedown', (e) => {
                if (e.button === 2 && !e.shiftKey) dragMode = 'rotate';
                else if (e.button === 1 || (e.button === 2 && e.shiftKey)) dragMode = 'pan';
                else return;
                e.preventDefault();
                lastX = e.clientX; lastY = e.clientY;
                this.isCameraDragging = true;
                el.style.cursor = dragMode === 'rotate' ? 'grabbing' : 'move';
                // Drop hover state while the camera moves
                if (this.hoveredTile) {
                    this.hoveredTile.position.y = this.getTileDefaultY(this.hoveredTile);
                    this.hoveredTile = null;
                    this.highlightMatchingTiles(null);
                    if (this.onTileHoverOut) this.onTileHoverOut();
                }
            });

            window.addEventListener('mousemove', (e) => {
                if (!dragMode) return;
                const dx = e.clientX - lastX, dy = e.clientY - lastY;
                lastX = e.clientX; lastY = e.clientY;
                const cc = this.camCtrl;
                if (dragMode === 'rotate') {
                    cc.theta -= dx * 0.006;
                    cc.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, cc.phi - dy * 0.006));
                } else {
                    // Pan along the camera's right / forward-on-ground axes
                    const k = cc.radius * 0.0015;
                    const right = new THREE.Vector3(Math.cos(cc.theta), 0, -Math.sin(cc.theta));
                    const fwd = new THREE.Vector3(-Math.sin(cc.theta), 0, -Math.cos(cc.theta));
                    cc.target.addScaledVector(right, -dx * k);
                    cc.target.addScaledVector(fwd, dy * k);
                    cc.target.x = Math.max(-30, Math.min(30, cc.target.x));
                    cc.target.z = Math.max(-30, Math.min(30, cc.target.z));
                }
                this.applyCamera();
            });

            window.addEventListener('mouseup', () => {
                if (!dragMode) return;
                dragMode = null;
                this.isCameraDragging = false;
                el.style.cursor = 'default';
            });

            el.addEventListener('wheel', (e) => {
                e.preventDefault();
                const cc = this.camCtrl;
                cc.radius = Math.min(MAX_R, Math.max(MIN_R, cc.radius * (1 + Math.sign(e.deltaY) * 0.08)));
                this.applyCamera();
            }, { passive: false });
        }

        animateCameraTo(target, radius, theta, phi, duration = 300) {
            if (!this.camCtrl) return;
            const startTarget = this.camCtrl.target.clone();
            const startRadius = this.camCtrl.radius;
            const startTheta = this.camCtrl.theta;
            const startPhi = this.camCtrl.phi;
            const startTime = performance.now();

            if (this._camAnimId) {
                cancelAnimationFrame(this._camAnimId);
                this._camAnimId = null;
            }

            const step = () => {
                const now = performance.now();
                const progress = Math.min((now - startTime) / duration, 1);
                // Ease out cubic
                const t = 1 - Math.pow(1 - progress, 3);

                this.camCtrl.target.lerpVectors(startTarget, target, t);
                this.camCtrl.radius = startRadius + (radius - startRadius) * t;
                this.camCtrl.theta = startTheta + (theta - startTheta) * t;
                this.camCtrl.phi = startPhi + (phi - startPhi) * t;
                this.applyCamera();

                if (progress < 1) {
                    this._camAnimId = requestAnimationFrame(step);
                } else {
                    this._camAnimId = null;
                }
            };
            this._camAnimId = requestAnimationFrame(step);
        }

        setTableView(smooth = false) {
            // Full Table Top-Down View:
            // Perfectly frames all 4 players' hands (배패), melds (후로패), discard rivers, and center console!
            const target = new THREE.Vector3(0, -0.5, -1.0);
            const radius = 84;
            const theta = 0;
            const phi = 0.48; // ~62.5° elevation angle: perfectly frames North hand, South hand, and all 4 players' melds
            this._camMode = 0;
            if (smooth && this.camCtrl) {
                this.animateCameraTo(target, radius, theta, phi);
            } else {
                this.setCameraPreset(target, radius, theta, phi);
            }
        }

        setPlayerView(smooth = true) {
            // First-person elevated perspective
            const target = new THREE.Vector3(0, -1.0, 5.0);
            const radius = 54;
            const theta = 0;
            const phi = 0.66;
            this._camMode = 1;
            if (smooth && this.camCtrl) {
                this.animateCameraTo(target, radius, theta, phi);
            } else {
                this.setCameraPreset(target, radius, theta, phi);
            }
        }

        setHandFocusView(smooth = true) {
            // Hand Close-up View:
            // Zoomed right into the player's hand for detailed tile inspection
            const target = new THREE.Vector3(0, 0.5, 23.0);
            const radius = 32;
            const theta = 0;
            const phi = 0.72;
            this._camMode = 2;
            if (smooth && this.camCtrl) {
                this.animateCameraTo(target, radius, theta, phi);
            } else {
                this.setCameraPreset(target, radius, theta, phi);
            }
        }

        setTopView(smooth = true) {
            this.setTableView(smooth);
        }

        toggleCamera() {
            this._camMode = ((this._camMode || 0) + 1) % 3;
            if (this._camMode === 0) this.setTableView(true);
            else if (this._camMode === 1) this.setPlayerView(true);
            else this.setHandFocusView(true);
            return this._camMode;
        }

        setupLighting() {
            // Soft diffuse reflections without harsh specular hot-spots
            const envMap = this.getTileEnvMap();
            if (envMap) {
                this.scene.environment = envMap;
                this.scene.environmentIntensity = 0.15; // Greatly reduced IBL white glare
            }

            // Balanced soft ambient base illumination for high contrast readability
            const ambient = new THREE.AmbientLight(0xfff8ee, 0.68 * Math.PI);
            this.scene.add(ambient);

            // Overhead key light angled from North to eliminate direct camera specular glare
            const sunLight = new THREE.DirectionalLight(0xfffaed, 0.48 * Math.PI);
            sunLight.position.set(0, 52, -26);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 2048;
            sunLight.shadow.mapSize.height = 2048;
            sunLight.shadow.camera.near = 10;
            sunLight.shadow.camera.far = 100;
            sunLight.shadow.camera.left = -36;
            sunLight.shadow.camera.right = 36;
            sunLight.shadow.camera.top = 36;
            sunLight.shadow.camera.bottom = -36;
            sunLight.shadow.bias = -0.0006;
            this.scene.add(sunLight);

            // Soft opposite fill light
            const fillLight = new THREE.DirectionalLight(0xdde8ff, 0.25 * Math.PI);
            fillLight.position.set(12, 42, 22);
            this.scene.add(fillLight);
        }

        // Procedural woven felt normal map for micro-fiber cloth scattering
        createFeltNormalTexture() {
            const size = 128;
            const cv = document.createElement('canvas');
            cv.width = cv.height = size;
            const ctx = cv.getContext('2d');
            const img = ctx.createImageData(size, size);
            const d = img.data;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    const i = (y * size + x) * 4;
                    const weave = Math.sin((x + y) * 2.2) * Math.cos((x - y) * 2.2);
                    const noise = (Math.random() - 0.5) * 0.45;
                    const dx = (Math.sin(x * 1.6) * 0.25 + weave * 0.4 + noise) * 36;
                    const dy = (Math.cos(y * 1.6) * 0.25 + weave * 0.4 + noise) * 36;
                    d[i] = Math.max(0, Math.min(255, 128 + dx));     // R
                    d[i + 1] = Math.max(0, Math.min(255, 128 + dy)); // G
                    d[i + 2] = 255;                                  // B
                    d[i + 3] = 255;
                }
            }
            ctx.putImageData(img, 0, 0);
            const tex = new THREE.CanvasTexture(cv);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(36, 36);
            return tex;
        }

        // Procedural felt diffuse canvas texture with subtle fiber flecks
        createFeltTexture() {
            const size = 256;
            const cv = document.createElement('canvas');
            cv.width = cv.height = size;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#145524';
            ctx.fillRect(0, 0, size, size);
            for (let i = 0; i < 3000; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const rad = Math.random() * 1.6 + 0.4;
                const alpha = Math.random() * 0.08 + 0.02;
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(34, 110, 52, ${alpha})` : `rgba(12, 58, 22, ${alpha})`;
                ctx.beginPath();
                ctx.arc(x, y, rad, 0, Math.PI * 2);
                ctx.fill();
            }
            const tex = new THREE.CanvasTexture(cv);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(16, 16);
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        }

        // Procedural dark walnut/mahogany wood texture with authentic lacquer sheen
        createWoodTexture() {
            const w = 512, h = 128;
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#26140e';
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x++) {
                const wave = Math.sin(x * 0.04) * 0.5 + Math.sin(x * 0.12) * 0.25;
                const band = Math.sin((x * 0.15) + wave * 4);
                const v = Math.floor(28 + band * 14 + (Math.random() - 0.5) * 8);
                const r = Math.max(22, Math.min(60, Math.floor(v * 1.4)));
                const g = Math.max(12, Math.min(35, Math.floor(v * 0.72)));
                const b = Math.max(6, Math.min(24, Math.floor(v * 0.45)));
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, 0, 1, h);
            }
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, 'rgba(0,0,0,0.3)');
            grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
            grad.addColorStop(1, 'rgba(0,0,0,0.35)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            const tex = new THREE.CanvasTexture(cv);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 1);
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        }

        createTable() {
            const tableGroup = new THREE.Group();

            // 1. Table Felt Mat (Rich Emerald Green Velvet with woven fiber normal map and physical sheen)
            const tableSize = 64;
            const matGeo = new THREE.BoxGeometry(tableSize, 0.6, tableSize);
            const feltTex = this.createFeltTexture();
            const feltNormal = this.createFeltNormalTexture();
            const matMat = new THREE.MeshPhysicalMaterial({
                map: feltTex,
                normalMap: feltNormal,
                normalScale: new THREE.Vector2(0.42, 0.42),
                color: 0x165a27,
                roughness: 0.90,
                metalness: 0.01,
                sheen: 0.65,
                sheenColor: 0x36a64f,
                sheenRoughness: 0.55
            });
            const mat = new THREE.Mesh(matGeo, matMat);
            mat.position.y = -0.3;
            mat.receiveShadow = true;
            tableGroup.add(mat);

            // 2. Table Wooden Border (Luxury Beveled Walnut with high-gloss lacquer)
            const woodTex = this.createWoodTexture();
            const woodMat = new THREE.MeshPhysicalMaterial({
                map: woodTex,
                color: 0x48291c,
                roughness: 0.32,
                clearcoat: 0.85,
                clearcoatRoughness: 0.12,
                metalness: 0.04
            });

            const borderThickness = 3.2;
            const borderHeight = 1.5;

            const makeBorderGeo = (w, h, d) => {
                if (THREE.RoundedBoxGeometry) return new THREE.RoundedBoxGeometry(w, h, d, 2, 0.32);
                return new THREE.BoxGeometry(w, h, d);
            };

            const bGeoX = makeBorderGeo(tableSize + borderThickness * 2, borderHeight, borderThickness);
            const bGeoZ = makeBorderGeo(borderThickness, borderHeight, tableSize);

            // 4 borders
            const bNorth = new THREE.Mesh(bGeoX, woodMat);
            bNorth.position.set(0, 0.25, -(tableSize / 2 + borderThickness / 2));
            bNorth.castShadow = true;
            bNorth.receiveShadow = true;
            tableGroup.add(bNorth);

            const bSouth = new THREE.Mesh(bGeoX, woodMat);
            bSouth.position.set(0, 0.25, (tableSize / 2 + borderThickness / 2));
            bSouth.castShadow = true;
            bSouth.receiveShadow = true;
            tableGroup.add(bSouth);

            const bWest = new THREE.Mesh(bGeoZ, woodMat);
            bWest.position.set(-(tableSize / 2 + borderThickness / 2), 0.25, 0);
            bWest.castShadow = true;
            bWest.receiveShadow = true;
            tableGroup.add(bWest);

            const bEast = new THREE.Mesh(bGeoZ, woodMat);
            bEast.position.set((tableSize / 2 + borderThickness / 2), 0.25, 0);
            bEast.castShadow = true;
            bEast.receiveShadow = true;
            tableGroup.add(bEast); // [CRUCIAL FIX] Added East border for right player seat!

            // 4 Corner Joint Caps (Luxury brushed dark metallic plates with gold coaster ring accents)
            const cornerSize = borderThickness * 1.15;
            const cornerCapGeo = THREE.RoundedBoxGeometry
                ? new THREE.RoundedBoxGeometry(cornerSize, 0.22, cornerSize, 2, 0.2)
                : new THREE.BoxGeometry(cornerSize, 0.22, cornerSize);
            const cornerCapMat = new THREE.MeshPhysicalMaterial({
                color: 0x1c1714,
                roughness: 0.35,
                metalness: 0.75,
                clearcoat: 0.5
            });
            const coasterRingGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.04, 24);
            const coasterRingMat = new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                metalness: 0.85,
                roughness: 0.28
            });

            const cornerPositions = [
                { x: -(tableSize / 2 + borderThickness / 2), z: -(tableSize / 2 + borderThickness / 2) },
                { x:  (tableSize / 2 + borderThickness / 2), z: -(tableSize / 2 + borderThickness / 2) },
                { x: -(tableSize / 2 + borderThickness / 2), z:  (tableSize / 2 + borderThickness / 2) },
                { x:  (tableSize / 2 + borderThickness / 2), z:  (tableSize / 2 + borderThickness / 2) }
            ];

            cornerPositions.forEach(cPos => {
                const cornerMesh = new THREE.Mesh(cornerCapGeo, cornerCapMat);
                cornerMesh.position.set(cPos.x, 1.02, cPos.z);
                cornerMesh.receiveShadow = true;
                tableGroup.add(cornerMesh);

                const ringMesh = new THREE.Mesh(coasterRingGeo, coasterRingMat);
                ringMesh.position.set(cPos.x, 1.14, cPos.z);
                tableGroup.add(ringMesh);
            });

            // 4 Player Seat Tenbo Trays (전동작탁 4방향 점봉 수납함 & 다이스 리프트 버튼)
            const trayW = 22.0;
            const trayD = 1.8;
            const trayH = 0.12;
            const trayHousingGeoX = THREE.RoundedBoxGeometry
                ? new THREE.RoundedBoxGeometry(trayW, trayH, trayD, 2, 0.1)
                : new THREE.BoxGeometry(trayW, trayH, trayD);
            const trayHousingGeoZ = THREE.RoundedBoxGeometry
                ? new THREE.RoundedBoxGeometry(trayD, trayH, trayW, 2, 0.1)
                : new THREE.BoxGeometry(trayD, trayH, trayW);
            const trayMat = new THREE.MeshPhysicalMaterial({
                color: 0x141a22,
                roughness: 0.42,
                metalness: 0.70,
                clearcoat: 0.35
            });
            const diceBtnGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.10, 16);
            const diceBtnMat = new THREE.MeshStandardMaterial({
                color: 0xd4af37,
                metalness: 0.88,
                roughness: 0.22
            });

            // Miniature tenbo point sticks in 4 denominations (10k, 5k, 1k, 100)
            const stickMiniGeo = new THREE.BoxGeometry(3.6, 0.08, 0.24);
            const stickMats = [
                new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }), // 10,000pt
                new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 }), // 5,000pt
                new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }), // 1,000pt
                new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })  // 100pt
            ];

            const trayConfigs = [
                { x: 0, z: (tableSize / 2 + borderThickness / 2), isX: true },  // South (나 / Player 0)
                { x: (tableSize / 2 + borderThickness / 2), z: 0, isX: false }, // East  (하가 / 내 오른쪽 플레이어)
                { x: 0, z: -(tableSize / 2 + borderThickness / 2), isX: true }, // North (대면 / Player 2)
                { x: -(tableSize / 2 + borderThickness / 2), z: 0, isX: false } // West  (상가 / Player 3)
            ];

            trayConfigs.forEach(cfg => {
                const trayMesh = new THREE.Mesh(cfg.isX ? trayHousingGeoX : trayHousingGeoZ, trayMat);
                trayMesh.position.set(cfg.x, 1.01, cfg.z);
                trayMesh.receiveShadow = true;
                tableGroup.add(trayMesh);

                // Center Dice / Lift Button
                const btn = new THREE.Mesh(diceBtnGeo, diceBtnMat);
                btn.position.set(cfg.x, 1.08, cfg.z);
                tableGroup.add(btn);

                // Decorative miniature tenbo sticks in 4 slots
                const slotOffsets = [-7.5, -3.2, 3.2, 7.5];
                slotOffsets.forEach((off, idx) => {
                    const stick = new THREE.Mesh(stickMiniGeo, stickMats[idx]);
                    if (cfg.isX) {
                        stick.position.set(cfg.x + off, 1.07, cfg.z);
                    } else {
                        stick.position.set(cfg.x, 1.07, cfg.z + off);
                        stick.rotation.y = Math.PI / 2;
                    }
                    tableGroup.add(stick);
                });
            });

            // 3. Center Compass & Digital Game Display Console
            this.buildCenterConsole(tableGroup);

            this.scene.add(tableGroup);
        }

        // =========================================================================
        // Central Table Display Console (전동작탁 중앙 디지털 대국정보 디스플레이)
        // Displays: Round & Honba (몇국 몇본장), Remaining Tiles (남은패), Pot (공탁금), 4-way Winds & Turn LEDs
        // =========================================================================
        buildCenterConsole(tableGroup) {
            // A. Outer Beveled Gold Trim
            const goldRingGeo = THREE.RoundedBoxGeometry 
                ? new THREE.RoundedBoxGeometry(12.4, 0.04, 12.4, 2, 0.15)
                : new THREE.BoxGeometry(12.4, 0.04, 12.4);
            const goldMat = new THREE.MeshPhysicalMaterial({
                color: 0xd4af37,
                metalness: 0.86,
                roughness: 0.28,
                clearcoat: 0.35,
                clearcoatRoughness: 0.25
            });
            const goldRing = new THREE.Mesh(goldRingGeo, goldMat);
            goldRing.position.y = 0.02;
            goldRing.receiveShadow = true;
            tableGroup.add(goldRing);

            // B. Dark Titanium Metallic Console Housing (Low profile base)
            const housingGeo = THREE.RoundedBoxGeometry 
                ? new THREE.RoundedBoxGeometry(11.8, 0.04, 11.8, 2, 0.15)
                : new THREE.BoxGeometry(11.8, 0.04, 11.8);
            const housingMat = new THREE.MeshPhysicalMaterial({
                color: 0x141a22,
                metalness: 0.82,
                roughness: 0.40,
                clearcoat: 0.25,
                clearcoatRoughness: 0.2
            });
            const housing = new THREE.Mesh(housingGeo, housingMat);
            housing.position.y = 0.03;
            housing.receiveShadow = true;
            tableGroup.add(housing);

            // C. Screen Bezel (Matte carbon frame)
            const bezelGeo = new THREE.BoxGeometry(11.0, 0.03, 11.0);
            const bezelMat = new THREE.MeshStandardMaterial({
                color: 0x080b0f,
                roughness: 0.85
            });
            const bezel = new THREE.Mesh(bezelGeo, bezelMat);
            bezel.position.y = 0.045;
            bezel.receiveShadow = true;
            tableGroup.add(bezel);

            // D. High-Res Canvas & Texture for Display (1024x1024 Retina)
            this.centerDisplayCanvas = document.createElement('canvas');
            this.centerDisplayCanvas.width = 1024;
            this.centerDisplayCanvas.height = 1024;
            this.centerDisplayCtx = this.centerDisplayCanvas.getContext('2d');

            this.centerDisplayTexture = new THREE.CanvasTexture(this.centerDisplayCanvas);
            this.centerDisplayTexture.colorSpace = THREE.SRGBColorSpace;
            const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 4;
            this.centerDisplayTexture.anisotropy = maxAniso;
            this.centerDisplayTexture.minFilter = THREE.LinearMipmapLinearFilter;
            this.centerDisplayTexture.magFilter = THREE.LinearFilter;

            // E. Digital OLED Display Screen Mesh
            // Uses MeshBasicMaterial so canvas graphics ALWAYS render with 100% vibrant, self-lit brilliance regardless of scene lighting/shadows!
            const screenGeo = new THREE.PlaneGeometry(10.5, 10.5);
            const screenMat = new THREE.MeshBasicMaterial({
                map: this.centerDisplayTexture,
                side: THREE.DoubleSide
            });
            const screen = new THREE.Mesh(screenGeo, screenMat);
            screen.rotation.x = -Math.PI / 2;
            screen.position.set(0, 0.08, 0); // Solidly elevated above housing and bezel
            screen.renderOrder = 2;
            tableGroup.add(screen);
            this.centerDisplayMesh = screen;

            // F. 4-Way LED Turn Indicators (3D Light Bars on Console Edges)
            this.centerDisplayLedBars = [];
            const ledConfigs = [
                { x: 0, z: 5.58, rotY: 0, w: 6.4, d: 0.18 },              // South (Player 0)
                { x: 5.58, z: 0, rotY: Math.PI / 2, w: 6.4, d: 0.18 },   // East (AI 1)
                { x: 0, z: -5.58, rotY: 0, w: 6.4, d: 0.18 },             // North (AI 2)
                { x: -5.58, z: 0, rotY: Math.PI / 2, w: 6.4, d: 0.18 }    // West (AI 3)
            ];

            for (let i = 0; i < 4; i++) {
                const cfg = ledConfigs[i];
                const ledGeo = new THREE.BoxGeometry(cfg.w, 0.03, cfg.d);
                const ledMat = new THREE.MeshBasicMaterial({
                    color: 0x1e293b
                });
                const ledMesh = new THREE.Mesh(ledGeo, ledMat);
                ledMesh.position.set(cfg.x, 0.085, cfg.z);
                ledMesh.rotation.y = cfg.rotY;
                tableGroup.add(ledMesh);
                this.centerDisplayLedBars.push(ledMesh);
            }

            // Initial render with default state
            this.renderCenterDisplayCanvas(null);
            this.centerDisplayTexture.needsUpdate = true;
        }

        // Helper: Draw round rectangle with cross-browser compatibility
        drawDisplayRoundRect(ctx, x, y, w, h, r) {
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, r);
                return;
            }
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        }

        // Helper: Draw miniature 1,000pt riichi stick icon
        drawMiniRiichiStick(ctx, x, y, w, h) {
            ctx.save();
            this.drawDisplayRoundRect(ctx, x, y, w, h, h / 2);
            ctx.fillStyle = '#f8fafc';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Central Ruby Red Dot
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.28, 0, Math.PI * 2);
            ctx.fillStyle = '#dc2626';
            ctx.shadowColor = 'rgba(220, 38, 38, 0.8)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.restore();
        }

        // Render Canvas Graphics for Central Digital Table Display (1024x1024)
        renderCenterDisplayCanvas(data) {
            const ctx = this.centerDisplayCtx;
            if (!ctx) return;

            const W = 1024, H = 1024;
            ctx.clearRect(0, 0, W, H);

            // Safe data extraction
            const roundWind = data ? (data.roundWind || '1z') : '1z';
            const roundNum = data ? (data.roundNum || 1) : 1;
            const honba = data ? (data.honba || 0) : 0;
            const remainingTiles = data ? (data.remainingTiles != null ? data.remainingTiles : 70) : 70;
            const riichiSticks = data ? (data.riichiSticks || 0) : 0;
            const currentTurn = data ? (data.currentTurn != null ? data.currentTurn : 0) : 0;
            const players = (data && data.players && data.players.length >= 4) ? data.players : [
                { wind: '1z', points: 25000, isRiichi: false, name: '플레이어' },
                { wind: '2z', points: 25000, isRiichi: false, name: 'AI 하가' },
                { wind: '3z', points: 25000, isRiichi: false, name: 'AI 대면' },
                { wind: '4z', points: 25000, isRiichi: false, name: 'AI 상가' }
            ];

            const windKorean = { '1z': '동', '2z': '남', '3z': '서', '4z': '북' };
            const windHanja = { '1z': '東', '2z': '南', '3z': '西', '4z': '北' };

            // 1. Deep Obsidian / Carbon Radial Background
            const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 620);
            bgGrad.addColorStop(0, '#0d1522'); // Slate 900
            bgGrad.addColorStop(0.65, '#060a12');
            bgGrad.addColorStop(1, '#020408');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // Subtle Cyber Grid Lines
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
            ctx.lineWidth = 1;
            const gridSize = 40;
            for (let x = 0; x <= W; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
            }
            for (let y = 0; y <= H; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
            }
            ctx.restore();

            // Outer Metallic & Cyber Accent Borders
            ctx.save();
            this.drawDisplayRoundRect(ctx, 20, 20, W - 40, H - 40, 22);
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)'; // Brushed Gold
            ctx.lineWidth = 4;
            ctx.stroke();

            this.drawDisplayRoundRect(ctx, 30, 30, W - 60, H - 60, 18);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'; // Cyan accent
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Corner Cyber Accents
            const corners = [
                [40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]
            ];
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            for (const [cx, cy] of corners) {
                const dx = cx < W / 2 ? 1 : -1;
                const dy = cy < H / 2 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(cx, cy + dy * 22);
                ctx.lineTo(cx, cy);
                ctx.lineTo(cx + dx * 22, cy);
                ctx.stroke();
            }
            ctx.restore();

            // ---------------------------------------------------------------------
            // 2. Peripheral 4-Way Player Tags & Active Turn Indicators
            // ---------------------------------------------------------------------
            // A) South (Player 0 / 나) - Bottom
            const p0 = players[0] || {};
            const isTurn0 = (currentTurn === 0);
            ctx.save();
            const sBoxX = 210, sBoxY = 918, sBoxW = 604, sBoxH = 76;
            this.drawDisplayRoundRect(ctx, sBoxX, sBoxY, sBoxW, sBoxH, 14);
            ctx.fillStyle = isTurn0 ? 'rgba(16, 185, 129, 0.28)' : 'rgba(15, 23, 42, 0.85)';
            ctx.fill();
            ctx.strokeStyle = isTurn0 ? '#10b981' : (p0.isRiichi ? '#ef4444' : 'rgba(148, 163, 184, 0.45)');
            ctx.lineWidth = isTurn0 ? 3.5 : 2;
            if (isTurn0) { ctx.shadowColor = 'rgba(16, 185, 129, 0.9)'; ctx.shadowBlur = 14; }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Player 0 Content
            ctx.fillStyle = '#fbbf24';
            ctx.font = '900 32px "Pretendard", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`[ ${windHanja[p0.wind] || '東'} ]`, sBoxX + 16, sBoxY + 49);

            ctx.fillStyle = isTurn0 ? '#34d399' : '#ffffff';
            ctx.font = 'bold 30px "Pretendard", sans-serif';
            ctx.fillText('나 (플레이어)', sBoxX + 88, sBoxY + 48);

            if (p0.isRiichi) {
                this.drawDisplayRoundRect(ctx, sBoxX + 265, sBoxY + 18, 105, 40, 8);
                ctx.fillStyle = '#dc2626';
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 22px "Pretendard", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚡RIICHI', sBoxX + 317, sBoxY + 46);
            }

            ctx.fillStyle = '#f8fafc';
            ctx.font = '900 36px "Consolas", "Pretendard", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${(p0.points || 0).toLocaleString()} 점`, sBoxX + sBoxW - 18, sBoxY + 50);
            ctx.restore();

            // B) North (AI 2 / 대면) - Top
            const p2 = players[2] || {};
            const isTurn2 = (currentTurn === 2);
            ctx.save();
            const nBoxX = 210, nBoxY = 30, nBoxW = 604, nBoxH = 76;
            this.drawDisplayRoundRect(ctx, nBoxX, nBoxY, nBoxW, nBoxH, 14);
            ctx.fillStyle = isTurn2 ? 'rgba(6, 182, 212, 0.28)' : 'rgba(15, 23, 42, 0.85)';
            ctx.fill();
            ctx.strokeStyle = isTurn2 ? '#06b6d4' : (p2.isRiichi ? '#ef4444' : 'rgba(148, 163, 184, 0.45)');
            ctx.lineWidth = isTurn2 ? 3.5 : 2;
            if (isTurn2) { ctx.shadowColor = 'rgba(6, 182, 212, 0.9)'; ctx.shadowBlur = 14; }
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fbbf24';
            ctx.font = '900 32px "Pretendard", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`[ ${windHanja[p2.wind] || '西'} ]`, nBoxX + 16, nBoxY + 49);

            ctx.fillStyle = isTurn2 ? '#38bdf8' : '#ffffff';
            ctx.font = 'bold 30px "Pretendard", sans-serif';
            ctx.fillText('AI 대면', nBoxX + 88, nBoxY + 48);

            if (p2.isRiichi) {
                this.drawDisplayRoundRect(ctx, nBoxX + 220, nBoxY + 18, 105, 40, 8);
                ctx.fillStyle = '#dc2626';
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 22px "Pretendard", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚡RIICHI', nBoxX + 272, nBoxY + 46);
            }

            ctx.fillStyle = '#f8fafc';
            ctx.font = '900 36px "Consolas", "Pretendard", monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${(p2.points || 0).toLocaleString()} 점`, nBoxX + nBoxW - 18, nBoxY + 50);
            ctx.restore();

            // C) West (AI 3 / 상가) - Left
            const p3 = players[3] || {};
            const isTurn3 = (currentTurn === 3);
            ctx.save();
            const wBoxX = 24, wBoxY = 360, wBoxW = 150, wBoxH = 295;
            this.drawDisplayRoundRect(ctx, wBoxX, wBoxY, wBoxW, wBoxH, 14);
            ctx.fillStyle = isTurn3 ? 'rgba(6, 182, 212, 0.28)' : 'rgba(15, 23, 42, 0.85)';
            ctx.fill();
            ctx.strokeStyle = isTurn3 ? '#06b6d4' : (p3.isRiichi ? '#ef4444' : 'rgba(148, 163, 184, 0.45)');
            ctx.lineWidth = isTurn3 ? 3.5 : 2;
            if (isTurn3) { ctx.shadowColor = 'rgba(6, 182, 212, 0.9)'; ctx.shadowBlur = 14; }
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fbbf24';
            ctx.font = '900 38px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`[ ${windHanja[p3.wind] || '北'} ]`, wBoxX + wBoxW / 2, wBoxY + 48);

            ctx.fillStyle = isTurn3 ? '#38bdf8' : '#ffffff';
            ctx.font = 'bold 26px "Pretendard", sans-serif';
            ctx.fillText('AI 상가', wBoxX + wBoxW / 2, wBoxY + 92);

            if (p3.isRiichi) {
                this.drawDisplayRoundRect(ctx, wBoxX + 24, wBoxY + 115, 102, 36, 8);
                ctx.fillStyle = '#dc2626';
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 20px "Pretendard", sans-serif';
                ctx.fillText('RIICHI', wBoxX + wBoxW / 2, wBoxY + 140);
            }

            ctx.fillStyle = '#f8fafc';
            ctx.font = '900 32px "Consolas", "Pretendard", monospace';
            ctx.fillText(`${(p3.points || 0).toLocaleString()}`, wBoxX + wBoxW / 2, wBoxY + 205);
            ctx.font = 'bold 22px "Pretendard", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('점', wBoxX + wBoxW / 2, wBoxY + 240);
            ctx.restore();

            // D) East (AI 1 / 하가) - Right
            const p1 = players[1] || {};
            const isTurn1 = (currentTurn === 1);
            ctx.save();
            const eBoxX = W - 174, eBoxY = 360, eBoxW = 150, eBoxH = 295;
            this.drawDisplayRoundRect(ctx, eBoxX, eBoxY, eBoxW, eBoxH, 14);
            ctx.fillStyle = isTurn1 ? 'rgba(6, 182, 212, 0.28)' : 'rgba(15, 23, 42, 0.85)';
            ctx.fill();
            ctx.strokeStyle = isTurn1 ? '#06b6d4' : (p1.isRiichi ? '#ef4444' : 'rgba(148, 163, 184, 0.45)');
            ctx.lineWidth = isTurn1 ? 3.5 : 2;
            if (isTurn1) { ctx.shadowColor = 'rgba(6, 182, 212, 0.9)'; ctx.shadowBlur = 14; }
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fbbf24';
            ctx.font = '900 38px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`[ ${windHanja[p1.wind] || '南'} ]`, eBoxX + eBoxW / 2, eBoxY + 48);

            ctx.fillStyle = isTurn1 ? '#38bdf8' : '#ffffff';
            ctx.font = 'bold 26px "Pretendard", sans-serif';
            ctx.fillText('AI 하가', eBoxX + eBoxW / 2, eBoxY + 92);

            if (p1.isRiichi) {
                this.drawDisplayRoundRect(ctx, eBoxX + 24, eBoxY + 115, 102, 36, 8);
                ctx.fillStyle = '#dc2626';
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 20px "Pretendard", sans-serif';
                ctx.fillText('RIICHI', eBoxX + eBoxW / 2, eBoxY + 140);
            }

            ctx.fillStyle = '#f8fafc';
            ctx.font = '900 32px "Consolas", "Pretendard", monospace';
            ctx.fillText(`${(p1.points || 0).toLocaleString()}`, eBoxX + eBoxW / 2, eBoxY + 205);
            ctx.font = 'bold 22px "Pretendard", sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('점', eBoxX + eBoxW / 2, eBoxY + 240);
            ctx.restore();

            // ---------------------------------------------------------------------
            // 3. Central Core Display Panel (3 Prominent, Unmistakable Sections)
            // ---------------------------------------------------------------------
            const coreX = 195, coreW = 634;

            // =====================================================================
            // [SECTION 1: 진행 대국 국 / 본장 (Round & Honba)]
            // =====================================================================
            const s1Y = 125, s1H = 175;
            ctx.save();
            this.drawDisplayRoundRect(ctx, coreX, s1Y, coreW, s1H, 18);
            const s1Grad = ctx.createLinearGradient(coreX, s1Y, coreX, s1Y + s1H);
            s1Grad.addColorStop(0, 'rgba(18, 26, 42, 0.98)');
            s1Grad.addColorStop(1, 'rgba(10, 14, 24, 0.98)');
            ctx.fillStyle = s1Grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)'; // Glowing Gold Border
            ctx.lineWidth = 3.5;
            ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Section 1 Header Banner Capsule (Unmistakable Korean title)
            const s1BadgeW = 280, s1BadgeH = 34;
            this.drawDisplayRoundRect(ctx, W / 2 - s1BadgeW / 2, s1Y + 14, s1BadgeW, s1BadgeH, 17);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
            ctx.fill();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fbbf24';
            ctx.font = '900 20px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🚩 대 국 진 행 (ROUND)', W / 2, s1Y + 38);

            // Sub-label for Round
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 20px "Pretendard", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('현재 국', coreX + 36, s1Y + 78);

            // Main Round Text: "동 1국"
            const roundWindName = windKorean[roundWind] || '동';
            const roundText = `${roundWindName} ${roundNum}국`;

            ctx.font = '900 84px "Pretendard", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(255, 215, 0, 0.85)';
            ctx.shadowBlur = 16;
            ctx.fillText(roundText, coreX + 32, s1Y + 152);
            ctx.shadowBlur = 0;

            // Honba Capsule Badge: "0 본장"
            const badgeW = 200, badgeH = 74;
            const badgeX = coreX + coreW - badgeW - 28, badgeY = s1Y + 70;
            this.drawDisplayRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 20);
            ctx.fillStyle = 'rgba(234, 88, 12, 0.35)';
            ctx.fill();
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3;
            ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fdba74';
            ctx.font = 'bold 18px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('연장', badgeX + badgeW / 2, badgeY + 26);

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 44px "Pretendard", sans-serif';
            ctx.fillText(`${honba} 본장`, badgeX + badgeW / 2, badgeY + 63);

            // Honba Stick Indicator Dots (연장봉 표시등)
            const dotCount = Math.min(honba, 8);
            if (dotCount > 0) {
                ctx.fillStyle = '#fbbf24';
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 6;
                const dotStartX = badgeX + badgeW / 2 - ((dotCount - 1) * 14) / 2;
                for (let d = 0; d < dotCount; d++) {
                    ctx.beginPath();
                    ctx.arc(dotStartX + d * 14, badgeY + badgeH + 12, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.shadowBlur = 0;
            }
            ctx.restore();

            // =====================================================================
            // [SECTION 2: 패산 남은 패 (TILES REMAINING)] - The Giant Digital Center
            // =====================================================================
            const s2Y = 316, s2H = 295;
            ctx.save();
            this.drawDisplayRoundRect(ctx, coreX, s2Y, coreW, s2H, 18);
            const s2Grad = ctx.createLinearGradient(coreX, s2Y, coreX, s2Y + s2H);
            s2Grad.addColorStop(0, 'rgba(8, 18, 30, 0.98)');
            s2Grad.addColorStop(1, 'rgba(4, 10, 20, 0.98)');
            ctx.fillStyle = s2Grad;
            ctx.fill();

            // Dynamic color based on remaining wall count
            let remainColor = '#22d3ee'; // bright neon cyan
            let remainGlow = 'rgba(34, 211, 238, 0.9)';
            let remainStatus = '패산 여유 있음';
            if (remainingTiles < 10) {
                remainColor = '#ef4444'; // critical red
                remainGlow = 'rgba(239, 68, 68, 0.95)';
                remainStatus = '🚨 해저 유국 임박 (종국)';
            } else if (remainingTiles < 20) {
                remainColor = '#fbbf24'; // warning amber
                remainGlow = 'rgba(251, 191, 36, 0.9)';
                remainStatus = '⚡ 후반전 진행 중 (20장 미만)';
            }

            ctx.strokeStyle = remainColor;
            ctx.lineWidth = 3.5;
            ctx.shadowColor = remainGlow;
            ctx.shadowBlur = 16;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Header Banner Capsule (Unmistakable Korean Title!)
            const s2BadgeW = 380, s2BadgeH = 38;
            this.drawDisplayRoundRect(ctx, W / 2 - s2BadgeW / 2, s2Y + 16, s2BadgeW, s2BadgeH, 19);
            ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
            ctx.fill();
            ctx.strokeStyle = remainColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#67e8f9';
            ctx.font = '900 24px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🀄 패 산 남 은 패 (잔여패)', W / 2, s2Y + 43);

            // Giant Digital Wall Counter Number + Unit
            ctx.font = '900 170px "Consolas", "Pretendard", monospace';
            ctx.fillStyle = remainColor;
            ctx.shadowColor = remainGlow;
            ctx.shadowBlur = 30;
            ctx.textAlign = 'center';
            ctx.fillText(String(remainingTiles), W / 2 - 50, s2Y + 192);
            ctx.shadowBlur = 0;

            // Unit Label: "장 남음"
            ctx.font = '900 44px "Pretendard", sans-serif';
            ctx.fillStyle = '#a5f3fc';
            ctx.textAlign = 'left';
            ctx.fillText('장 남음', W / 2 + 55, s2Y + 185);

            // Sub-status text
            ctx.font = 'bold 22px "Pretendard", sans-serif';
            ctx.fillStyle = (remainingTiles < 10) ? '#f87171' : (remainingTiles < 20 ? '#fde047' : '#94a3b8');
            ctx.textAlign = 'center';
            ctx.fillText(remainStatus, W / 2, s2Y + 230);

            // Wall Remaining Progress Gauge Bar (max 70 in standard 4-player game)
            const gaugeX = coreX + 44, gaugeY = s2Y + 248, gaugeW = coreW - 88, gaugeH = 16;
            this.drawDisplayRoundRect(ctx, gaugeX, gaugeY, gaugeW, gaugeH, 8);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.fill();

            const fillRatio = Math.max(0, Math.min(1, remainingTiles / 70));
            if (fillRatio > 0) {
                this.drawDisplayRoundRect(ctx, gaugeX, gaugeY, Math.max(16, gaugeW * fillRatio), gaugeH, 8);
                ctx.fillStyle = remainColor;
                ctx.shadowColor = remainGlow;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Gauge scale text
            ctx.font = 'bold 18px "Pretendard", sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'left';
            ctx.fillText('0 장 (해저)', gaugeX, gaugeY + gaugeH + 20);
            ctx.textAlign = 'right';
            ctx.fillText('70 장 (풀패산)', gaugeX + gaugeW, gaugeY + gaugeH + 20);
            ctx.restore();

            // =====================================================================
            // [SECTION 3: 리치 공탁금 (Riichi Pot / Deposit)]
            // =====================================================================
            const s3Y = 627, s3H = 195;
            ctx.save();
            this.drawDisplayRoundRect(ctx, coreX, s3Y, coreW, s3H, 18);
            const s3Grad = ctx.createLinearGradient(coreX, s3Y, coreX, s3Y + s3H);
            s3Grad.addColorStop(0, 'rgba(24, 28, 44, 0.98)');
            s3Grad.addColorStop(1, 'rgba(12, 16, 28, 0.98)');
            ctx.fillStyle = s3Grad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.90)'; // Luxury Gold
            ctx.lineWidth = 3.5;
            ctx.shadowColor = 'rgba(234, 179, 8, 0.5)';
            ctx.shadowBlur = 14;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Header Banner Capsule (Unmistakable Korean Title!)
            const s3BadgeW = 360, s3BadgeH = 38;
            this.drawDisplayRoundRect(ctx, W / 2 - s3BadgeW / 2, s3Y + 16, s3BadgeW, s3BadgeH, 19);
            ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
            ctx.fill();
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.font = '900 24px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('💰 리 치 공 탁 금 (POT)', W / 2, s3Y + 43);

            // Pot Points: "1,000 점" or "0 점"
            const potPoints = riichiSticks * 1000;
            const potText = `${potPoints.toLocaleString()} 점`;

            ctx.font = '900 82px "Pretendard", monospace';
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = 'rgba(234, 179, 8, 0.85)';
            ctx.shadowBlur = 20;
            ctx.textAlign = 'center';
            ctx.fillText(potText, W / 2 - 55, s3Y + 130);
            ctx.shadowBlur = 0;

            // Riichi Stick Miniature Icon + Count Badge
            const stickX = W / 2 + 130, stickY = s3Y + 92;
            this.drawMiniRiichiStick(ctx, stickX, stickY, 96, 26);

            ctx.fillStyle = '#ffffff';
            ctx.font = '900 42px "Pretendard", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`× ${riichiSticks}`, stickX + 108, stickY + 23);

            // Sub-caption
            ctx.fillStyle = '#cbd5e1';
            ctx.font = 'bold 22px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`공탁 리치봉 ${riichiSticks}개 적립 중 (${potPoints.toLocaleString()}점 화료자 획득)`, W / 2, s3Y + 172);
            ctx.restore();

            // ---------------------------------------------------------------------
            // 4. Console Bottom Footer (Status)
            // ---------------------------------------------------------------------
            ctx.save();
            ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
            ctx.font = 'bold 22px "Pretendard", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🀄 전동작탁 전자식 대국현황판 · KML 표준 룰북', W / 2, 882);
            ctx.restore();
        }

        // Update 3D Light Bars on Console Edges
        updateCenterDisplayLeds(currentTurn) {
            if (!this.centerDisplayLedBars || this.centerDisplayLedBars.length < 4) return;
            for (let i = 0; i < 4; i++) {
                const bar = this.centerDisplayLedBars[i];
                if (!bar || !bar.material) continue;
                if (i === currentTurn) {
                    const isPlayer = (i === 0);
                    const colorHex = isPlayer ? 0x10b981 : 0x06b6d4; // Green for player, Cyan for AI
                    if (bar.material.color && bar.material.color.setHex) bar.material.color.setHex(colorHex);
                    if (bar.material.emissive && bar.material.emissive.setHex) bar.material.emissive.setHex(colorHex);
                    bar.material.emissiveIntensity = 1.8;
                } else {
                    if (bar.material.color && bar.material.color.setHex) bar.material.color.setHex(0x1e293b);
                    if (bar.material.emissive && bar.material.emissive.setHex) bar.material.emissive.setHex(0x000000);
                    bar.material.emissiveIntensity = 0;
                }
            }
        }

        // Public API: Update Central Table Display from Game State
        updateCenterDisplay(game) {
            if (!this.centerDisplayCanvas || !this.centerDisplayTexture) return;

            if (!game) {
                this.renderCenterDisplayCanvas(null);
                this.centerDisplayTexture.needsUpdate = true;
                this.updateCenterDisplayLeds(0);
                return;
            }

            const data = {
                roundWind: game.roundWind || '1z',
                roundNum: game.roundNum || 1,
                honba: game.honba || 0,
                remainingTiles: (typeof game.getRemainingTileCount === 'function')
                    ? game.getRemainingTileCount()
                    : ((game.wall && game.wall.length != null) ? game.wall.length : 70),
                riichiSticks: game.riichiSticks || 0,
                currentTurn: game.currentTurn != null ? game.currentTurn : 0,
                players: (game.players || []).map(p => ({
                    wind: p.wind || p.seatWind || '1z',
                    points: p.points != null ? p.points : 25000,
                    isRiichi: !!p.isRiichi,
                    name: p.name || ''
                }))
            };

            this.renderCenterDisplayCanvas(data);
            this.centerDisplayTexture.needsUpdate = true;
            this.updateCenterDisplayLeds(data.currentTurn);
        }

        // Procedural studio environment used for PBR specular reflections
        getTileEnvMap() {
            if (this._tileEnv !== undefined) return this._tileEnv;
            this._tileEnv = null;
            try {
                if (this.renderer && THREE.PMREMGenerator && THREE.RoomEnvironment) {
                    const pmrem = new THREE.PMREMGenerator(this.renderer);
                    const room = new THREE.RoomEnvironment();
                    this._tileEnv = pmrem.fromScene(room, 0.04).texture;
                    if (room.dispose) room.dispose();
                    pmrem.dispose();
                }
            } catch (e) {
                console.warn('Tile environment map unavailable:', e);
                this._tileEnv = null;
            }
            return this._tileEnv;
        }

        // Side face texture: ivory (front ~64% of depth) -> hairline bond seam -> amber yellow back layer.
        makeTileSideTexture(horizontal, a, b, maxAniso) {
            const IVORY = '#fbf7ee';
            const YELLOW = '#f2a81e';
            const SEAM_BOND = '#8c5a08'; // Hairline micro-bond seam between urea and yellow resin layers
            const FRONT_RATIO = 0.64;
            const cv = document.createElement('canvas');
            cv.width = horizontal ? 256 : 8;
            cv.height = horizontal ? 8 : 256;
            const ctx = cv.getContext('2d');
            const grad = horizontal ? ctx.createLinearGradient(0, 0, 256, 0) : ctx.createLinearGradient(0, 0, 0, 256);
            const sOf = (t) => (t - a) / b;
            const stops = [
                [sOf(0), IVORY],
                [sOf(FRONT_RATIO - 0.015), IVORY],
                [sOf(FRONT_RATIO - 0.003), SEAM_BOND],
                [sOf(FRONT_RATIO + 0.006), YELLOW],
                [sOf(1), YELLOW]
            ].sort((p, q) => p[0] - q[0]);
            for (const [s, col] of stops) grad.addColorStop(Math.min(1, Math.max(0, s)), col);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, cv.width, cv.height);
            const tex = new THREE.CanvasTexture(cv);
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.anisotropy = maxAniso;
            tex.colorSpace = THREE.SRGBColorSpace;
            return tex;
        }

        // Grayscale height map from the face art: printed strokes become engraved grooves.
        makeTileEngraveTexture(srcCanvas, maxAniso) {
            const w = srcCanvas.width, h = srcCanvas.height;
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const ctx = cv.getContext('2d');
            ctx.drawImage(srcCanvas, 0, 0);
            const img = ctx.getImageData(0, 0, w, h);
            const d = img.data;
            for (let i = 0; i < d.length; i += 4) {
                const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                const v = Math.max(0, Math.min(255, (lum - 70) * (255 / 170)));
                d[i] = d[i + 1] = d[i + 2] = v;
            }
            ctx.putImageData(img, 0, 0);
            // Soften slightly so grooves have beveled walls instead of aliased steps
            const soft = document.createElement('canvas');
            soft.width = w; soft.height = h;
            const sctx = soft.getContext('2d');
            sctx.filter = 'blur(1.2px)';
            sctx.drawImage(cv, 0, 0);
            const tex = new THREE.CanvasTexture(soft);
            tex.anisotropy = maxAniso;
            return tex;
        }

        // Shared materials for all tiles (sides, back). Face materials are per tile code.
        getTileMaterialKit() {
            if (this._tileKit) return this._tileKit;
            const maxAniso = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 4;
            const envMap = this.getTileEnvMap();
            const mk = (opts) => new THREE.MeshPhysicalMaterial(Object.assign({
                metalness: 0.0,
                envMap: envMap,
                envMapIntensity: 0.45
            }, opts));

            // BoxGeometry/RoundedBoxGeometry UV layout (depth runs front->back along):
            // +X: u (t=u), -X: u reversed (t=1-u), +Y: v (t=v), -Y: v reversed (t=1-v).
            // Canvas rows are flipped (row 0 = v 1), so vertical faces invert once more.
            const sides = [
                mk({ map: this.makeTileSideTexture(true, 0, 1, maxAniso) }),   // +X
                mk({ map: this.makeTileSideTexture(true, 1, -1, maxAniso) }),  // -X
                mk({ map: this.makeTileSideTexture(false, 1, -1, maxAniso) }), // +Y
                mk({ map: this.makeTileSideTexture(false, 0, 1, maxAniso) })   // -Y
            ];
            for (const m of sides) {
                m.roughness = 0.26;
                m.clearcoat = 0.92;
                m.clearcoatRoughness = 0.08;
            }

            // Subtle molded-plastic grain for the back layer
            const nc = document.createElement('canvas');
            nc.width = nc.height = 128;
            const nctx = nc.getContext('2d');
            const nimg = nctx.createImageData(128, 128);
            for (let i = 0; i < nimg.data.length; i += 4) {
                const v = 155 + Math.random() * 95;
                nimg.data[i] = nimg.data[i + 1] = nimg.data[i + 2] = v;
                nimg.data[i + 3] = 255;
            }
            nctx.putImageData(nimg, 0, 0);
            const grain = new THREE.CanvasTexture(nc);
            grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
            grain.repeat.set(3, 4);
            grain.anisotropy = maxAniso;

            // Official M-League Taiyo Giken AMOS signature warm golden yellow
            const back = mk({
                color: 0xf2a81e,
                roughness: 0.35,
                clearcoat: 0.55,
                clearcoatRoughness: 0.14,
                bumpMap: grain,
                bumpScale: 0.08
            });

            this._tileKit = { sides, back, maxAniso, mk };
            return this._tileKit;
        }

        // Get 6-sided materials for a 3D tile
        getTileMaterials(tileCode, isAka = false) {
            const cacheKey = `${tileCode}_${isAka ? 'aka' : 'normal'}`;
            if (this.tileMaterials[cacheKey]) {
                return this.tileMaterials[cacheKey];
            }

            const kit = this.getTileMaterialKit();

            // Generate Canvas texture for front face
            const canvas = MahjongTileRenderer.getTileTextureCanvas(tileCode, isAka);
            const frontTex = new THREE.CanvasTexture(canvas);
            frontTex.anisotropy = kit.maxAniso;
            frontTex.colorSpace = THREE.SRGBColorSpace;
            const engrave = this.makeTileEngraveTexture(canvas, kit.maxAniso);

            // Melamine ivory face: crisp matte surface eliminating harsh specular glare
            const frontMat = kit.mk({
                map: frontTex,
                bumpMap: engrave,
                bumpScale: 0.35,
                roughness: 0.44,
                clearcoat: 0.20,
                clearcoatRoughness: 0.35,
                envMapIntensity: 0.12
            });

            // BoxGeometry faces: [+X, -X, +Y, -Y, +Z (Front), -Z (Back)]
            const mats = [
                kit.sides[0], // +X right
                kit.sides[1], // -X left
                kit.sides[2], // +Y top
                kit.sides[3], // -Y bottom
                frontMat,     // +Z front
                kit.back      // -Z back
            ];

            this.tileMaterials[cacheKey] = mats;
            return mats;
        }

        // Helper to generate a realistic rounded tile geometry without breaking UVs
        createRoundedTileGeometry() {
            if (this._roundedGeo) return this._roundedGeo;

            // Preferred: smooth beveled edges (same 6 material groups / face UV layout as BoxGeometry)
            if (THREE.RoundedBoxGeometry) {
                this._roundedGeo = new THREE.RoundedBoxGeometry(TILE_W, TILE_H, TILE_D, 4, 0.09);
                return this._roundedGeo;
            }

            const r = 0.08; // Corner radius
            const segments = 4;
            const geo = new THREE.BoxGeometry(TILE_W, TILE_H, TILE_D, segments, segments, segments);
            const pos = geo.attributes.position;
            
            const hw = TILE_W / 2 - r;
            const hh = TILE_H / 2 - r;
            const hd = TILE_D / 2 - r;

            for (let i = 0; i < pos.count; i++) {
                let x = pos.getX(i);
                let y = pos.getY(i);
                let z = pos.getZ(i);

                let ix = Math.max(-hw, Math.min(hw, x));
                let iy = Math.max(-hh, Math.min(hh, y));
                let iz = Math.max(-hd, Math.min(hd, z));

                let dx = x - ix;
                let dy = y - iy;
                let dz = z - iz;

                let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (dist > 0) {
                    dx = (dx / dist) * r;
                    dy = (dy / dist) * r;
                    dz = (dz / dist) * r;
                    pos.setXYZ(i, ix + dx, iy + dy, iz + dz);
                }
            }
            geo.computeVertexNormals();
            this._roundedGeo = geo;
            return geo;
        }

        // Create a concealed tile mesh (all ivory with M-League yellow back facing player)
        createConcealedTileMesh() {
            if (!this.concealedMaterials) {
                const kit = this.getTileMaterialKit();
                this.concealedMaterials = [
                    kit.sides[0], // +X
                    kit.sides[1], // -X
                    kit.sides[2], // +Y
                    kit.sides[3], // -Y
                    kit.back,     // +Z
                    kit.back      // -Z
                ];
            }

            const geo = this.createRoundedTileGeometry();
            const mesh = new THREE.Mesh(geo, this.concealedMaterials);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            return mesh;
        }

        // Create a single 3D tile mesh
        createTileMesh(tileCode, isAka = false) {
            const geo = this.createRoundedTileGeometry();
            const mats = this.getTileMaterials(tileCode, isAka);
            const mesh = new THREE.Mesh(geo, mats);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData = { tileCode, isAka };
            return mesh;
        }

        // Render full game state onto 3D scene
        
        checkOverlaps() {
            // ??Mesh)??간의 물리??충돌(겹침)??검?하???버??구
            const meshes = [];
            
            // Collect all tile meshes from dynamic group (hands, discards, walls, etc.)
            this.scene.traverse((child) => {
                if (child.isMesh && child.geometry && child.userData && (child.userData.tileCode || child.userData.tile)) {
                    meshes.push(child);
                }
            });

            if (meshes.length < 2) return;

            let overlapFound = false;
            let overlapCount = 0;

            // Simple O(N^2) AABB bounding box collision check
            for (let i = 0; i < meshes.length; i++) {
                const box1 = new THREE.Box3().setFromObject(meshes[i]);
                // ?간???차 ?용 (?수???산?로 ?한 미세 겹침 방?)
                box1.expandByScalar(-0.05);

                for (let j = i + 1; j < meshes.length; j++) {
                    const box2 = new THREE.Box3().setFromObject(meshes[j]);
                    box2.expandByScalar(-0.05);

                    if (box1.intersectsBox(box2)) {
                        overlapFound = true;
                        overlapCount++;
                        console.error(`[버그 감?] ??겹침 발생!`, {
                            tile1: meshes[i].userData.tileCode || meshes[i].userData.tile,
                            pos1: meshes[i].position,
                            tile2: meshes[j].userData.tileCode || meshes[j].userData.tile,
                            pos2: meshes[j].position
                        });
                        
                        // 겹친 ?? ?각?으?붉게 ?시 (?버그용)
                        if (meshes[i].material.color) meshes[i].material.color.setHex(0xff0000);
                        if (meshes[j].material.color) meshes[j].material.color.setHex(0xff0000);
                    }
                }
            }

            if (overlapFound) {
                console.warn(`?${overlapCount}건의 ??겹침??감??었?니?? ?더?좌표(배치 로직)????세??`);
            }
        }

        renderGameState(game, options = {}) {
            this.lastGame = game;
            this.clearDynamicObjects();
            this.updateDoraHighlights(game);
            this.updateCenterDisplay(game);

            const skipDrawnTilePlayer = options.skipDrawnTilePlayer != null ? options.skipDrawnTilePlayer : null;
            const skipLastDiscardPlayer = options.skipLastDiscardPlayer != null ? options.skipLastDiscardPlayer : null;

            // 1. Render Live Walls (4 sides inside table at z/x = ±13.8)
            this.renderWalls(game.wall.length);

            // 2. Render 14-tile Dead Wall (왕패: 4 Rinshan tiles + 5 Dora/Uradora stacks)
            const deadWallData = (game.getDeadWallData && typeof game.getDeadWallData === 'function')
                ? game.getDeadWallData()
                : null;
            const showUra = (game.state === 'ROUND_OVER' && !!game.lastWinWasRiichi);
            this.renderDeadWall(deadWallData, game.doraIndicators, game.uraDoraIndicators, showUra);

            // 3. Render Riichi Sticks on table (Dedicated zone in front of each Riichi player's river)
            this.renderRiichiSticks(game.riichiSticks, game.players);

            // 4. Render Player's Hand (South)
            this.renderPlayerHand(game.players[0], skipDrawnTilePlayer === 0);

            // 5. Render AI Hands (1: East/Right, 2: North/Across, 3: West/Left)
            this.renderAIHand(game.players[1], 1, skipDrawnTilePlayer === 1); // Right
            this.renderAIHand(game.players[2], 2, skipDrawnTilePlayer === 2); // Across
            this.renderAIHand(game.players[3], 3, skipDrawnTilePlayer === 3); // Left

            // 6. Render Discards for all 4 players
            for (let i = 0; i < 4; i++) {
                this.renderDiscards(game.players[i].discards, i, skipLastDiscardPlayer === i);
            }

            // 7. Render Melds for all 4 players
            for (let i = 0; i < 4; i++) {
                this.renderMelds(game.players[i].melds, i);
            }

            // [디버그] 배치 후 모든 패의 겹침 판정 수행
            // this.checkOverlaps();
        }

                
        setRiichiSelectionMode(validIndices) {
            this.riichiSelectionIndices = validIndices;
            this.applyRiichiSelectionVisuals();
            
            // "Lights Out" theatrical effect: darken the entire room/table
            if (this.ambientLight) this.ambientLight.intensity = 0.25;
            if (this.sunLight) this.sunLight.intensity = 0.15;
        }

        applyRiichiSelectionVisuals() {
            if (!this.riichiSelectionIndices) return;
            for (let i = 0; i < this.playerHandMeshes.length; i++) {
                const mesh = this.playerHandMeshes[i];
                if (!mesh || mesh.userData.isMarker) continue;
                // NOTE: markers are stored in playerHandMeshes too, so the array index
                // does NOT match the hand index. Always use userData.handIndex.
                if (this.riichiSelectionIndices.includes(mesh.userData.handIndex)) {
                    mesh.position.y = mesh.userData.originalY + 0.3; // Lift up slightly
                    
                    // Make the valid tiles glow in the dark
                    const origMats = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                    const glowingMats = origMats.map(mat => {
                        const m = mat.clone();
                        m.emissive.setHex(0x555555); // Glow
                        return m;
                    });
                    mesh.material = glowingMats;
                } else {
                    mesh.position.y = mesh.userData.originalY;
                    // Keep non-selectable tiles normal material (they will naturally darken due to lights out)
                    mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                }
            }
        }

        clearRiichiSelectionMode() {
            this.riichiSelectionIndices = null;
            
            // Restore normal lighting
            if (this.ambientLight) this.ambientLight.intensity = 0.92;
            if (this.sunLight) this.sunLight.intensity = 0.45;

            for (let i = 0; i < this.playerHandMeshes.length; i++) {
                const mesh = this.playerHandMeshes[i];
                if (!mesh || mesh.userData.isMarker) continue;
                mesh.position.y = mesh.userData.originalY;
                mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
            }

            // Riichi selection is over; fall back to the regular tenpai assist (if any)
            if (this.tenpaiAssistIndices) this.applyTenpaiAssistVisuals();
        }

        setTenpaiAssistMode(validIndices) {
            this.tenpaiAssistIndices = validIndices;
            this.applyTenpaiAssistVisuals();
        }

        applyTenpaiAssistVisuals() {
            if (!this.tenpaiAssistIndices || this.riichiSelectionIndices) return; // Riichi overrides
            for (let i = 0; i < this.playerHandMeshes.length; i++) {
                const mesh = this.playerHandMeshes[i];
                if (!mesh || mesh.userData.isMarker) continue;
                if (this.tenpaiAssistIndices.includes(mesh.userData.handIndex)) {
                    mesh.position.y = mesh.userData.originalY + 0.15; // Lift up slightly for assist
                    mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                } else {
                    mesh.position.y = mesh.userData.originalY;
                    mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                }
            }
        }

        setTutorialTargetTile(tileCode) {
            this.tutorialTargetTile = tileCode;
            this.applyTutorialTargetVisuals();
        }

        clearTutorialTargetTile() {
            this.tutorialTargetTile = null;
            if (!this.playerHandMeshes) return;
            for (let i = 0; i < this.playerHandMeshes.length; i++) {
                const mesh = this.playerHandMeshes[i];
                if (!mesh || mesh.userData.isMarker) continue;
                if (this.riichiSelectionIndices && this.riichiSelectionIndices.includes(mesh.userData.handIndex)) {
                    mesh.position.y = mesh.userData.originalY + 0.25;
                } else if (this.tenpaiAssistIndices && this.tenpaiAssistIndices.includes(mesh.userData.handIndex)) {
                    mesh.position.y = mesh.userData.originalY + 0.15;
                } else {
                    mesh.position.y = mesh.userData.originalY;
                }
                mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
            }
        }

        getTileDefaultY(mesh) {
            if (!mesh || mesh.userData.isMarker) return 0;
            const targetList = Array.isArray(this.tutorialTargetTile)
                ? this.tutorialTargetTile.map(t => (t || '').replace('_aka', ''))
                : (this.tutorialTargetTile ? [(this.tutorialTargetTile || '').replace('_aka', '')] : []);
            const code = (mesh.userData.tileCode || '').replace('_aka', '');
            if (targetList.length > 0 && targetList.includes(code)) {
                return mesh.userData.originalY + 0.35;
            }
            if (this.riichiSelectionIndices && this.riichiSelectionIndices.includes(mesh.userData.handIndex)) {
                return mesh.userData.originalY + 0.25;
            }
            if (!this.tutorialTargetTile && this.tenpaiAssistIndices && this.tenpaiAssistIndices.includes(mesh.userData.handIndex)) {
                return mesh.userData.originalY + 0.15;
            }
            return mesh.userData.originalY;
        }

        applyTutorialTargetVisuals() {
            if (!this.playerHandMeshes) return;
            const targetList = Array.isArray(this.tutorialTargetTile)
                ? this.tutorialTargetTile.map(t => (t || '').replace('_aka', ''))
                : (this.tutorialTargetTile ? [(this.tutorialTargetTile || '').replace('_aka', '')] : []);
            for (let i = 0; i < this.playerHandMeshes.length; i++) {
                const mesh = this.playerHandMeshes[i];
                if (!mesh || mesh.userData.isMarker) continue;
                const code = (mesh.userData.tileCode || '').replace('_aka', '');
                if (targetList.length > 0 && targetList.includes(code)) {
                    mesh.position.y = mesh.userData.originalY + 0.35; // Lift up prominently
                    const origMats = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                    const glowingMats = origMats.map(mat => {
                        const m = mat.clone();
                        if (m.emissive) {
                            m.emissive.setHex(0x775500); // Warm gold emissive highlight
                            m.emissiveIntensity = 0.85;
                        }
                        return m;
                    });
                    mesh.material = glowingMats;
                } else {
                    // Always rollback material and position for tiles not in current target
                    if (this.riichiSelectionIndices && this.riichiSelectionIndices.includes(mesh.userData.handIndex)) {
                        mesh.position.y = mesh.userData.originalY + 0.25;
                    } else if (!this.tutorialTargetTile && this.tenpaiAssistIndices && this.tenpaiAssistIndices.includes(mesh.userData.handIndex)) {
                        mesh.position.y = mesh.userData.originalY + 0.15;
                    } else {
                        mesh.position.y = mesh.userData.originalY;
                    }
                    mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                }
            }
        }

        // Remove the floating tenpai markers (they are bound to a specific hand layout,
        // so they must disappear as soon as the layout changes, e.g. when a tile is picked).
        clearTenpaiMarkers() {
            this.playerHandMeshes = this.playerHandMeshes.filter(m => {
                if (m && m.userData && m.userData.isMarker) {
                    this.scene.remove(m);
                    if (m.geometry) m.geometry.dispose();
                    if (m.material) m.material.dispose();
                    return false;
                }
                return true;
            });
        }

        clearTenpaiAssistMode() {
            this.tenpaiAssistIndices = null;
            if (!this.riichiSelectionIndices) {
                for (let i = 0; i < this.playerHandMeshes.length; i++) {
                    const mesh = this.playerHandMeshes[i];
                    if (!mesh || mesh.userData.isMarker) continue;
                    mesh.position.y = mesh.userData.originalY;
                    mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                }
            }
        }

        highlightMatchingTiles(tileCode) {
            // First, restore all currently highlighted meshes
            if (this.currentlyHighlightedMeshes) {
                for (const mesh of this.currentlyHighlightedMeshes) {
                    if (mesh && mesh.userData && mesh.userData.tileCode) {
                        mesh.material = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                    }
                }
                this.currentlyHighlightedMeshes = [];
            }
            if (!tileCode && this.riichiSelectionIndices) {
                this.applyRiichiSelectionVisuals();
            } else if (!tileCode && this.tenpaiAssistIndices) {
                this.applyTenpaiAssistVisuals();
            }

            if (tileCode) {
                const targetBase = tileCode.replace('_aka', '');
                this.currentlyHighlightedMeshes = [];
                
                // Collect all meshes that are publicly revealed on the table
                const publicMeshes = [
                    ...this.discardMeshes[0], ...this.discardMeshes[1], ...this.discardMeshes[2], ...this.discardMeshes[3],
                    ...this.meldMeshes[0], ...this.meldMeshes[1], ...this.meldMeshes[2], ...this.meldMeshes[3]
                ];
                
                // For doras, only pick face-up doras to prevent cheating
                if (this.doraMeshes) {
                    for (const dMesh of this.doraMeshes) {
                        // In Mahjong3D, face up dora indicators have rotation.x close to -Math.PI / 2
                        if (Math.abs(dMesh.rotation.x - (-Math.PI / 2)) < 0.1) {
                            publicMeshes.push(dMesh);
                        }
                    }
                }

                for (const mesh of publicMeshes) {
                    if (mesh && mesh.userData && mesh.userData.tileCode) {
                        const key = mesh.userData.tileCode;
                        const isMatch = (key === targetBase || key === targetBase + '_aka');
                        
                        if (isMatch) {
                            // Clone materials so we don't affect other tiles of the same type in the hand
                            const origMats = this.getTileMaterials(mesh.userData.tileCode, mesh.userData.isAka);
                            const clonedMats = origMats.map(m => m.clone());
                            
                            // Dimming effect on the matching tiles (?영처리)
                            for (let i = 0; i < 6; i++) {
                                clonedMats[i].color.setHex(0x666666); 
                            }
                            
                            mesh.material = clonedMats;
                            this.currentlyHighlightedMeshes.push(mesh);
                        }
                    }
                }
            }
        }

        
        updateDoraHighlights(game) {
            if (typeof MahjongScoring === 'undefined' || !MahjongScoring.getDoraTile) return;

            // 1. Reset all tiles' emissive color
            for (const key in this.tileMaterials) {
                const mats = this.tileMaterials[key];
                if (mats && mats[4]) {
                    mats[4].emissive.setHex(0x000000); // Reset front face glow
                }
            }

            // 2. Identify active Doras
            const activeDorakinds = [];
            for (let i = 0; i < game.activeDoraCount; i++) {
                if (game.doraIndicators[i]) {
                    const doraTile = MahjongScoring.getDoraTile(game.doraIndicators[i]);
                    activeDorakinds.push(doraTile);
                    activeDorakinds.push(doraTile + '_aka'); // Red fives are also Doras!
                }
                if (game.state === 'ROUND_OVER' && game.uraDoraIndicators[i]) {
                    const uraDoraTile = MahjongScoring.getDoraTile(game.uraDoraIndicators[i]);
                    activeDorakinds.push(uraDoraTile);
                    activeDorakinds.push(uraDoraTile + '_aka');
                }
            }

            // 3. Apply golden emissive glow to Dora materials
            this.activeDoraMaterials = [];
            for (const key of activeDorakinds) {
                if (this.tileMaterials[key] && this.tileMaterials[key][4]) {
                    const mat = this.tileMaterials[key][4];
                    mat.emissive.setHex(0xffaa00); // Bright golden glow
                    mat.emissiveIntensity = 0.6;
                    this.activeDoraMaterials.push(mat);
                }
            }
        }

        clearDynamicObjects() {
            const toRemove = [
                ...this.playerHandMeshes,
                ...this.aiHandMeshes[0],
                ...this.aiHandMeshes[1],
                ...this.aiHandMeshes[2],
                ...this.discardMeshes[0],
                ...this.discardMeshes[1],
                ...this.discardMeshes[2],
                ...this.discardMeshes[3],
                ...this.meldMeshes[0],
                ...this.meldMeshes[1],
                ...this.meldMeshes[2],
                ...this.meldMeshes[3],
                ...this.wallMeshes,
                ...this.riichiStickMeshes
            ];

            for (const m of toRemove) {
                this.scene.remove(m);
            }

            this.playerHandMeshes = [];
            this.aiHandMeshes = [[], [], []];
            this.discardMeshes = [[], [], [], []];
            this.meldMeshes = [[], [], [], []];
            this.wallMeshes = [];
            this.riichiStickMeshes = [];
            this.animations = [];
        }

        clearDeadWall() {
            if (this.doraMeshes && this.doraMeshes.length > 0) {
                for (const m of this.doraMeshes) {
                    this.scene.remove(m);
                    if (m.geometry) m.geometry.dispose();
                }
            }
            this.doraMeshes = [];
            this.doraIndicatorMeshes = [];
            this.uradoraIndicatorMeshes = [];
            this.rinshanMeshes = [];
            this.activeDoraMeshes = [];
            this.activeUradoraMeshes = [];
            this.deadWallMeshesInitialized = false;
        }

        getLiveWallSlots() {
            if (this._liveWallSlots) return this._liveWallSlots;
            const stacks = [];
            const stackGap = 0.05;
            const tW = TILE_W + stackGap;
            const WALL_DIST = 21.2; // Pushed outward from 17.5 to 21.2 so 3+ discard rows never overlap with the wall!
            for (let i = 1; i >= -8; i--) stacks.push({ x: i * tW, z: -WALL_DIST, isHorizontal: true });
            for (let i = -8; i <= 8; i++) stacks.push({ x: -WALL_DIST, z: i * tW, isHorizontal: false });
            for (let i = -8; i <= 8; i++) stacks.push({ x: i * tW, z: WALL_DIST, isHorizontal: true });
            for (let i = 8; i >= -8; i--) stacks.push({ x: WALL_DIST, z: i * tW, isHorizontal: false });
            
            const tileSlots = [];
            for (const st of stacks) {
                for (let level = 1; level >= 0; level--) {
                    tileSlots.push({
                        x: st.x,
                        y: level * (TILE_D + 0.02) + TILE_D / 2,
                        z: st.z,
                        isHorizontal: st.isHorizontal
                    });
                }
            }
            this._liveWallSlots = tileSlots;
            return tileSlots;
        }

        // Render 4-sided inner live walls (Pushed forward towards center at ±14.0)
        renderWalls(remainingTiles) {
            const tileSlots = this.getLiveWallSlots();
            const startIdx = Math.max(0, tileSlots.length - remainingTiles);
            
            for (let i = startIdx; i < tileSlots.length; i++) {
                const slot = tileSlots[i];
                const tile = this.createTileMesh('1m', false); // Back-facing so texture doesn't matter
                tile.rotation.set(Math.PI / 2, 0, 0);
                if (!slot.isHorizontal) {
                    tile.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                }
                tile.position.set(slot.x, slot.y, slot.z);
                this.scene.add(tile);
                this.wallMeshes.push(tile);
            }
        }

        // Render 14-tile Dead Wall (왕패: 4 Rinshan tiles + 5 Dora stacks with Uradora underneath)
        // Positioned alongside the North live wall, clearly separated by a break gap and slight forward offset.
        // Persistent lifecycle: tiles are instantiated once per round and updated in-place without recreation or flickering.
        renderDeadWall(deadWallData, doraList, uraList, showUra = false) {
            const stackGap = 0.05;
            // Matches i=2 to i=8 on North wall. i=2 means x = 2 * (TILE_W + 0.05)
            const startX = 2 * (TILE_W + stackGap);
            const wallZ = -21.2; // Perfectly aligned with North live wall (-21.2)

            if (deadWallData && deadWallData.rinshan && deadWallData.doraIndicators && deadWallData.uraDoraIndicators) {
                const activeDoraCount = deadWallData.activeDoraCount || 1;
                const drawnRinshanCount = deadWallData.drawnRinshanCount || 0;

                // 1. Initial creation for the round (or if mesh count mismatch)
                if (!this.deadWallMeshesInitialized || !this.doraMeshes || this.doraMeshes.length !== 14) {
                    this.clearDeadWall();

                    this.rinshanMeshes = [];
                    this.uradoraIndicatorMeshes = [];
                    this.doraIndicatorMeshes = [];
                    this.activeDoraMeshes = [];
                    this.activeUradoraMeshes = [];

                    // Stacks 0 & 1: 4 Rinshan tiles (영상패) - 2 stacks of 2 tiles, face down
                    // Indexing:
                    // idx 0: Stack 0 Top
                    // idx 1: Stack 0 Bottom
                    // idx 2: Stack 1 Top
                    // idx 3: Stack 1 Bottom
                    for (let s = 0; s < 2; s++) {
                        const posX = startX + s * (TILE_W + stackGap);
                        const topIdx = s * 2;
                        const botIdx = s * 2 + 1;

                        // Bottom Rinshan tile
                        const bottomRinshan = deadWallData.rinshan[botIdx] || deadWallData.rinshan[0];
                        const bMesh = this.createTileMesh(bottomRinshan.code || bottomRinshan, bottomRinshan.isAka || false);
                        bMesh.rotation.set(Math.PI / 2, 0, 0); // Face down
                        bMesh.position.set(posX, TILE_D / 2, wallZ);
                        bMesh.visible = (botIdx >= drawnRinshanCount);
                        this.scene.add(bMesh);
                        this.doraMeshes.push(bMesh);
                        this.rinshanMeshes[botIdx] = bMesh;

                        // Top Rinshan tile
                        const topRinshan = deadWallData.rinshan[topIdx] || deadWallData.rinshan[1];
                        const tMesh = this.createTileMesh(topRinshan.code || topRinshan, topRinshan.isAka || false);
                        tMesh.rotation.set(Math.PI / 2, 0, 0); // Face down
                        tMesh.position.set(posX, TILE_D * 1.5 + 0.02, wallZ);
                        tMesh.visible = (topIdx >= drawnRinshanCount);
                        this.scene.add(tMesh);
                        this.doraMeshes.push(tMesh);
                        this.rinshanMeshes[topIdx] = tMesh;
                    }

                    // Stacks 2 to 6: 5 Dora & Uradora stacks (도라표시패 & 뒷도라표시패)
                    for (let d = 0; d < 5; d++) {
                        const s = d + 2;
                        const posX = startX + s * (TILE_W + stackGap);

                        // Bottom: Uradora indicator (뒷도라)
                        const uraTile = deadWallData.uraDoraIndicators[d];
                        const uMesh = this.createTileMesh(uraTile.code || uraTile, uraTile.isAka || false);
                        uMesh.rotation.set(showUra && (d < activeDoraCount) ? -Math.PI / 2 : Math.PI / 2, 0, 0);
                        uMesh.position.set(posX, TILE_D / 2, wallZ);
                        this.scene.add(uMesh);
                        this.doraMeshes.push(uMesh);
                        this.uradoraIndicatorMeshes[d] = uMesh;
                        if (d < activeDoraCount) {
                            this.activeUradoraMeshes.push(uMesh);
                        }

                        // Top: Dora indicator (도라표시패)
                        const doraTile = deadWallData.doraIndicators[d];
                        const isDoraRevealed = (d < activeDoraCount);
                        const dMesh = this.createTileMesh(doraTile.code || doraTile, doraTile.isAka || false);
                        dMesh.rotation.set(isDoraRevealed ? -Math.PI / 2 : Math.PI / 2, 0, 0);
                        dMesh.position.set(posX, TILE_D * 1.5 + 0.02, wallZ);
                        this.scene.add(dMesh);
                        this.doraMeshes.push(dMesh);
                        this.doraIndicatorMeshes[d] = dMesh;
                        if (isDoraRevealed) {
                            this.activeDoraMeshes.push(dMesh);
                        }
                    }

                    this.deadWallMeshesInitialized = true;
                } else {
                    // 2. In-place update: zero recreation, 100% position & rotation stability!
                    this.activeDoraMeshes = [];
                    this.activeUradoraMeshes = [];

                    // In-place Rinshan visibility update (Rinshan tiles decrease when drawn)
                    for (let i = 0; i < 4; i++) {
                        const rMesh = this.rinshanMeshes[i];
                        if (rMesh) {
                            rMesh.visible = (i >= drawnRinshanCount);
                        }
                    }

                    // In-place Dora indicator rotation & active list update
                    for (let d = 0; d < 5; d++) {
                        const dMesh = this.doraIndicatorMeshes[d];
                        if (!dMesh) continue;
                        const isDoraRevealed = (d < activeDoraCount);

                        // If tile is in mid-flip animation, DO NOT override its animation transform!
                        if (!dMesh.userData || !dMesh.userData.isFlipping) {
                            dMesh.rotation.set(isDoraRevealed ? -Math.PI / 2 : Math.PI / 2, 0, 0);
                        }
                        if (isDoraRevealed) {
                            this.activeDoraMeshes.push(dMesh);
                        }
                    }

                    // In-place Uradora indicator rotation & active list update
                    for (let d = 0; d < 5; d++) {
                        const uMesh = this.uradoraIndicatorMeshes[d];
                        if (!uMesh) continue;
                        const isUraRevealed = (showUra && d < activeDoraCount);
                        uMesh.rotation.set(isUraRevealed ? -Math.PI / 2 : Math.PI / 2, 0, 0);
                        if (d < activeDoraCount) {
                            this.activeUradoraMeshes.push(uMesh);
                        }
                    }
                }
            } else {
                // Fallback rendering
                this.clearDeadWall();
                const dList = doraList || ['1m'];
                const uList = uraList || ['1m'];
                const count = Math.min(dList.length, 5);

                for (let d = 0; d < 5; d++) {
                    const s = d + 2;
                    const posX = startX + s * (TILE_W + stackGap);

                    const uMesh = this.createTileMesh(uList[d] || '1m', false);
                    uMesh.rotation.set(showUra ? -Math.PI / 2 : Math.PI / 2, 0, 0);
                    uMesh.position.set(posX, TILE_D / 2, wallZ);
                    this.scene.add(uMesh);
                    this.doraMeshes.push(uMesh);

                    const dMesh = this.createTileMesh(dList[d] || '1m', false);
                    dMesh.rotation.set(d < count ? -Math.PI / 2 : Math.PI / 2, 0, 0);
                    dMesh.position.set(posX, TILE_D * 1.5 + 0.02, wallZ);
                    this.scene.add(dMesh);
                    this.doraMeshes.push(dMesh);
                    this.doraIndicatorMeshes.push(dMesh);

                    if (d < count) {
                        this.activeDoraMeshes.push(dMesh);
                        this.activeUradoraMeshes.push(uMesh);
                    }
                }
            }
        }

        // Render 3D Riichi Sticks on table
        // Dedicated, clear placement in front of each player's discard river (at r=7.0),
        // completely clear of the console (r=6.2) and discard tiles (r=8.8) so they NEVER get obscured!
        renderRiichiSticks(count, players = null) {
            for (const s of this.riichiStickMeshes) {
                this.scene.remove(s);
                if (s.geometry) s.geometry.dispose();
            }
            this.riichiStickMeshes = [];

            if (count <= 0 && (!players || !players.some(p => p.isRiichi))) return;

            const stickGeo = (THREE.RoundedBoxGeometry)
                ? new THREE.RoundedBoxGeometry(5.6, 0.24, 0.42, 2, 0.08)
                : new THREE.BoxGeometry(5.6, 0.24, 0.42);
            const stickMat = new THREE.MeshStandardMaterial({
                color: 0xf8fafc,
                roughness: 0.28
            });
            const redDotGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16);
            const redDotMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });

            const createStick = () => {
                const stick = new THREE.Mesh(stickGeo, stickMat);
                stick.castShadow = true;
                const redDot = new THREE.Mesh(redDotGeo, redDotMat);
                redDot.position.set(0, 0.125, 0);
                stick.add(redDot);
                return stick;
            };

            const riichiPositions = [
                { x: 0, z: 7.0, rotY: 0 },             // Player 0 (South)
                { x: 7.0, z: 0, rotY: Math.PI / 2 },  // AI 1 (East)
                { x: 0, z: -7.0, rotY: 0 },            // AI 2 (North)
                { x: -7.0, z: 0, rotY: Math.PI / 2 }  // AI 3 (West)
            ];

            let activeRiichiCount = 0;
            if (players && players.length >= 4) {
                for (let i = 0; i < 4; i++) {
                    if (players[i].isRiichi) {
                        activeRiichiCount++;
                        const pos = riichiPositions[i];
                        const stick = createStick();
                        stick.position.set(pos.x, 0.12, pos.z);
                        stick.rotation.y = pos.rotY;
                        this.scene.add(stick);
                        this.riichiStickMeshes.push(stick);
                    }
                }
            }

            // Carryover pot sticks (unclaimed from previous draws/rounds)
            // Placed in the South tray at z=5.8, stacked cleanly without blocking anything
            const carryover = Math.max(0, count - activeRiichiCount);
            for (let i = 0; i < Math.min(carryover, 5); i++) {
                const stick = createStick();
                stick.position.set(0, 0.08 + i * 0.14, 5.8);
                this.scene.add(stick);
                this.riichiStickMeshes.push(stick);
            }
        }


        // Render Player's Hand
        renderPlayerHand(player, skipLast = false) {
            const totalCount = player.hand.length;
            const renderCount = skipLast ? totalCount - 1 : totalCount;
            // tenpaiDiscards describes discard candidates of a 14-tile (3n+2) hand only.
            // Once a tile has been discarded the hand is re-laid-out, so stale markers must not be drawn.
            const isDiscardPhase = (totalCount % 3 === 2) && !skipLast && !player.isRiichi;
            const tenpaiIndices = (isDiscardPhase && player.tenpaiDiscards) ? player.tenpaiDiscards.map(d => d.discardIndex) : [];

            if (totalCount % 3 !== 2) {
                // Not a discard phase: drop any stale assist state bound to the old layout
                this.tenpaiAssistIndices = null;
            }

            for (let i = 0; i < renderCount; i++) {
                const t = player.hand[i];
                const mesh = this.createTileMesh(t.code || t, t.isAka);
                const tf = this.getPlayerHandTileTransform(i, totalCount);
                mesh.position.copy(tf.position);
                mesh.rotation.copy(tf.rotation);
                mesh.userData.handIndex = i;
                mesh.userData.originalY = tf.position.y;
                if (this.activeDorakinds && this.activeDorakinds.includes(t.code || t)) {
                    const auraGeo = new THREE.BoxGeometry(TILE_W + 0.35, TILE_H + 0.35, TILE_D + 0.35);
                    const auraMat = new THREE.MeshBasicMaterial({
                        color: 0xffcc00,
                        transparent: true,
                        opacity: 0.25,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false
                    });
                    const aura = new THREE.Mesh(auraGeo, auraMat);
                    mesh.add(aura);
                }

                if (tenpaiIndices.includes(i)) {
                    // Display a hovering marker above the tile instead of changing tile color
                    const markerGeo = new THREE.ConeGeometry(0.25, 0.5, 4);
                    const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
                    const marker = new THREE.Mesh(markerGeo, markerMat);
                    
                    marker.position.copy(tf.position);
                    marker.position.y += TILE_H / 2 + 0.8;
                    marker.rotation.x = Math.PI; // point downwards
                    
                    // Add a tiny floating animation data
                    marker.userData = { isMarker: true, startY: marker.position.y };
                    
                    this.scene.add(marker);
                    this.playerHandMeshes.push(marker); // piggyback on hand meshes for cleanup
                }

                this.scene.add(mesh);
                this.playerHandMeshes.push(mesh);
            }

            // Fresh meshes were just created: re-apply whichever selection visuals are still active
            if (this.riichiSelectionIndices) {
                this.applyRiichiSelectionVisuals();
            } else if (this.tenpaiAssistIndices) {
                this.applyTenpaiAssistVisuals();
            }
            if (this.tutorialTargetTile) {
                this.applyTutorialTargetVisuals();
            }
        }


        // Render AI Hands
        renderAIHand(player, aiPosition, skipLast = false) {
            const totalCount = player.hand.length;
            const renderCount = skipLast ? totalCount - 1 : totalCount;

            for (let i = 0; i < renderCount; i++) {
                const mesh = this.createConcealedTileMesh();
                const tf = this.getAIHandTileTransform(aiPosition, i, totalCount);
                mesh.position.copy(tf.position);
                mesh.rotation.copy(tf.rotation);
                this.scene.add(mesh);
                this.aiHandMeshes[aiPosition - 1].push(mesh);
            }
        }



        // Helper: Compute player hand tile slot transform
        // Hand tiles always start from the fixed LEFT edge and pack rightward.
        // With fewer tiles after furo, they naturally leave space for right-side melds.
        getPlayerHandTileTransform(index, totalCount = 14) {
            const MAX_COUNT = 14;
            const fullWidth = MAX_COUNT * (TILE_W + 0.08);
            const startX = -fullWidth / 2; // always fixed left edge
            const gap = (index === totalCount - 1 && totalCount % 3 === 2) ? 0.35 : 0;
            const x = startX + index * (TILE_W + 0.08) + gap;
            const y = 0.88; // Smoothly seated on table mat for top-down view
            const z = 24.8; // Comfortably behind South wall (at z=21.2) with clean spacing
            return {
                position: new THREE.Vector3(x, y, z),
                rotation: new THREE.Euler(-1.05, 0, 0, 'YXZ') // Tilted back by ~60° so front face points directly into top-down camera!
            };
        }

        // Helper: Compute AI hand tile slot transform
        // Tiles always start from the player's own LEFT edge and pack toward their RIGHT (meld) side.
        // offsetDist goes from ?fullWidth/2 (index 0) upward, representing a left-to-right sweep.
        // Each player's "left" axis mapping:
        //   AI1 (East,  faces west/left):  left = +Z ??position.z = ?offsetDist (so index 0 = most +Z)
        //   AI2 (North, faces south/down):  left = +X ??position.x = ?offsetDist (so index 0 = most +X)
        //   AI3 (West,  faces east/right): left = ?Z ??position.z =  offsetDist (so index 0 = most ?Z)
        getAIHandTileTransform(aiPosition, index, totalCount = 14) {
            const MAX_COUNT = 14;
            const fullWidth = MAX_COUNT * (TILE_W + 0.08);
            const startOffset = -fullWidth / 2; // index 0 starts here, going +
            const gap = (index === totalCount - 1 && totalCount % 3 === 2) ? 0.35 : 0;
            const offsetDist = startOffset + index * (TILE_W + 0.08) + gap;
            const y = TILE_H / 2 + 0.05;

            if (aiPosition === 1) {
                // East / Shimocha ??faces west. Their LEFT = +Z (south), RIGHT = ?Z (north, melds at z=??4)
                // index 0 should be at max +Z (their left), going toward ?Z (meld side)
                return {
                    position: new THREE.Vector3(26.0, y, -offsetDist),
                    rotation: new THREE.Euler(-0.15, Math.PI / 2, 0, 'YXZ')
                };
            } else if (aiPosition === 2) {
                // North / Toimen ??faces south. Their LEFT = +X (east), RIGHT = ?X (west, melds at x=??4)
                // index 0 should be at max +X (their left), going toward ?X (meld side)
                return {
                    position: new THREE.Vector3(-offsetDist, y, -26.0),
                    rotation: new THREE.Euler(-0.15, Math.PI, 0, 'YXZ')
                };
            } else {
                // West / Kamicha (aiPosition === 3) ??faces east. Their LEFT = ?Z (north), RIGHT = +Z (south, melds at z=+24)
                // index 0 should be at most ?Z (their left), going toward +Z (meld side)
                return {
                    position: new THREE.Vector3(-26.0, y, offsetDist),
                    rotation: new THREE.Euler(-0.15, -Math.PI / 2, 0, 'YXZ')
                };
            }
        }


        // Helper: General hand tile transform by player index
        getHandTileTransform(playerIdx, index, totalCount = 14) {
            if (playerIdx === 0) {
                return this.getPlayerHandTileTransform(index, totalCount);
            }
            return this.getAIHandTileTransform(playerIdx, index, totalCount);
        }



        // Helper: Compute origin position for a drawn tile from the live wall
        getWallOriginTransform(remainingTiles) {
            const tileSlots = this.getLiveWallSlots();
            // The tile being drawn is the one right BEFORE the remaining ones
            // Example: If remaining is 69, we draw from index (122 - 70) = 52.
            const drawIdx = Math.max(0, tileSlots.length - remainingTiles - 1);
            const slot = tileSlots[drawIdx] || tileSlots[0];
            
            const pos = new THREE.Vector3(slot.x, slot.y, slot.z);
            const rot = new THREE.Euler(Math.PI / 2, 0, 0, 'YXZ');
            if (!slot.isHorizontal) {
                // If it's a vertical wall (East/West), it's rotated
                rot.set(Math.PI / 2, Math.PI / 2, 0, 'YXZ');
            }
            return {
                position: pos,
                rotation: rot
            };
        }

        // Helper: Compute 3D spawn transform for Dead Wall (Rinshan) tiles (영상패 위치)
        getRinshanTransform(rinshanIdx = 0) {
            const stackGap = 0.05;
            const startX = 2 * (TILE_W + stackGap);
            const wallZ = -21.2;
            const safeIdx = Math.max(0, Math.min(3, rinshanIdx));
            const s = Math.floor(safeIdx / 2); // Stack 0 or 1
            const isTop = (safeIdx % 2 === 0);
            const posX = startX + s * (TILE_W + stackGap);
            const posY = isTop ? (TILE_D * 1.5 + 0.02) : (TILE_D / 2);
            return {
                position: new THREE.Vector3(posX, posY, wallZ),
                rotation: new THREE.Euler(Math.PI / 2, 0, 0, 'YXZ')
            };
        }

        // Animate smooth 3D flip for newly revealed Kandora indicator in the Dead Wall
        animateKandoraFlip(flippedIndex, onComplete) {
            if (!this.doraIndicatorMeshes || !this.doraIndicatorMeshes[flippedIndex]) {
                if (onComplete) onComplete();
                return;
            }
            const mesh = this.doraIndicatorMeshes[flippedIndex];
            mesh.userData.isFlipping = true;
            if (typeof MahjongAudio !== 'undefined' && MahjongAudio.playTileClick) {
                MahjongAudio.playTileClick();
            }

            const startPos = mesh.position.clone();
            const startRot = mesh.rotation.clone();
            const targetPos = mesh.position.clone();
            const targetRot = new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ');

            this.animations.push({
                mesh: mesh,
                keepMesh: true,
                startTime: performance.now(),
                duration: 350,
                startPos: startPos,
                targetPos: targetPos,
                startRot: startRot,
                targetRot: targetRot,
                arcHeight: 0.35, // Natural, tactile tile flip arc
                onComplete: () => {
                    mesh.rotation.set(-Math.PI / 2, 0, 0);
                    mesh.position.copy(targetPos);
                    mesh.userData.isFlipping = false;
                    if (this.lastGame) {
                        this.updateDoraHighlights(this.lastGame);
                    }
                    if (typeof MahjongAudio !== 'undefined' && MahjongAudio.playTileClick) {
                        MahjongAudio.playTileClick();
                    }
                    if (onComplete) onComplete();
                }
            });
        }

        // Helper: Compute discard river tile slot transform
                getDiscardTransform(playerIdx, discardIndex, isRiichi = false, discardsArray = null) {
            const cols = 6;
            // Pushed outward to start at r=8.8, completely leaving a dedicated Riichi stick zone at r=7.0
            const configs = [
                { startX: -5.05, startZ: 8.8, rotY: 0 },             // Player 0 (South)
                { startX: 8.8, startZ: 5.05, rotY: -Math.PI / 2 },  // AI 1 (East)
                { startX: 5.05, startZ: -8.8, rotY: Math.PI },      // AI 2 (North)
                { startX: -8.8, startZ: -5.05, rotY: Math.PI / 2 }  // AI 3 (West)
            ];

            const conf = configs[playerIdx];
            const col = discardIndex % cols;
            const row = Math.floor(discardIndex / cols);

            // Calculate dynamic offset based on previous tiles in this row
            let rowOffset = 0;
            const gap = 0.12; // Adjusted visual gap

            if (discardsArray && discardsArray.length > 0) {
                const rowStartIdx = row * cols;
                for (let j = rowStartIdx; j < discardIndex; j++) {
                    const t = discardsArray[j];
                    if (t) {
                        rowOffset += (t.isRiichi ? TILE_H : TILE_W) + gap;
                    }
                }
            } else {
                rowOffset = col * (TILE_W + gap);
            }

            const currentWidth = isRiichi ? TILE_H : TILE_W;
            const centerOffset = rowOffset + (currentWidth / 2) - (TILE_W / 2);

            let posX = 0, posZ = 0;

            if (playerIdx === 0) {
                posX = conf.startX + centerOffset;
                posZ = conf.startZ + row * (TILE_H + 0.15);
            } else if (playerIdx === 1) {
                posX = conf.startX + row * (TILE_H + 0.15);
                posZ = conf.startZ - centerOffset;
            } else if (playerIdx === 2) {
                posX = conf.startX - centerOffset;
                posZ = conf.startZ - row * (TILE_H + 0.15);
            } else if (playerIdx === 3) {
                posX = conf.startX - row * (TILE_H + 0.15);
                posZ = conf.startZ + centerOffset;
            }

            return {
                position: new THREE.Vector3(posX, TILE_D / 2 + 0.02, posZ),
                rotation: new THREE.Euler(-Math.PI / 2, 0, conf.rotY + (isRiichi ? Math.PI / 2 : 0))
            };
        }

        // Render Discards
        renderDiscards(discards, playerIdx, skipLast = false) {
            const total = skipLast ? discards.length - 1 : discards.length;
            for (let i = 0; i < total; i++) {
                const item = discards[i];
                if (!item) continue;
                const tile = item.tile || item;
                const isRiichiTile = !!item.isRiichi;

                const mesh = this.createTileMesh(tile.code || tile, tile.isAka || false);
                const tf = this.getDiscardTransform(playerIdx, i, isRiichiTile, discards);

                mesh.position.copy(tf.position);
                mesh.rotation.copy(tf.rotation);

                this.scene.add(mesh);
                this.discardMeshes[playerIdx].push(mesh);
            }
        }

        // Helper: Compute total width occupied by a player's melds
        // Render Melds (Placed on player's LEFT side from their perspective)
        renderMelds(melds, playerIdx) {
            if (!melds || melds.length === 0) return;

            // Right-side base positions for each player (their own right edge) - original placement
            const configs = [
                { startX: 27.0, startZ: 26.0, dirX: -1, dirZ: 0, rotY: 0 },             // Player 0 (South) - right side
                { startX: 26.0, startZ: -27.0, dirX: 0, dirZ: 1, rotY: -Math.PI / 2 }, // AI 1 (East)      - right side
                { startX: -27.0, startZ: -26.0, dirX: 1, dirZ: 0, rotY: Math.PI },     // AI 2 (North)     - right side
                { startX: -26.0, startZ: 27.0, dirX: 0, dirZ: -1, rotY: Math.PI / 2 }  // AI 3 (West)      - right side
            ];
            const conf = configs[playerIdx];

            let meldOffset = 0;
            for (const m of melds) {
                // Determine sideways index based on whom the tile was called from
                const diff = (m.fromPlayer !== undefined && m.fromPlayer !== playerIdx) ? (m.fromPlayer - playerIdx + 4) % 4 : 0;
                let sidewaysIndex = -1;
                let sideRotOffset = Math.PI / 2; // Default sideways rotation (Top points Left)

                if (m.type !== 'ankan') {
                    if (diff === 3) { sidewaysIndex = (m.type === 'kakan' || m.type === 'kan' || m.type === 'daiminkan') && m.tiles.length >= 3 ? 2 : m.tiles.length - 1; sideRotOffset = Math.PI / 2; }
                    if (diff === 2) { sidewaysIndex = 1; sideRotOffset = Math.PI / 2; }
                    if (diff === 1) { sidewaysIndex = 0; sideRotOffset = -Math.PI / 2; }
                }
                
                let localOffset = meldOffset;
                let sidewaysCenterOffset = 0; // Capture this for Kakan

                for (let i = 0; i < m.tiles.length; i++) {
                    const t = m.tiles[i];
                    
                    const isKakanStacked = (m.type === 'kakan' && i === 3);
                    const isSideways = (i === sidewaysIndex || isKakanStacked);
                    
                    const mesh = (m.type === 'ankan' && (i === 0 || i === m.tiles.length - 1)) 
                                  ? this.createConcealedTileMesh() 
                                  : this.createTileMesh(t.code || t, t.isAka);
                    
                    const currentWidth = isSideways ? TILE_H : TILE_W;
                    
                    let centerOffset = localOffset + (currentWidth / 2);
                    
                    if (i === sidewaysIndex) {
                        sidewaysCenterOffset = centerOffset;
                    }

                    // If Kakan stacked tile, it goes next to the sideways tile (forming 'ㅗ' shape)
                    if (isKakanStacked) {
                        centerOffset = sidewaysCenterOffset; 
                    }
                    
                    let posX = conf.startX + conf.dirX * centerOffset;
                    let posZ = conf.startZ + conf.dirZ * centerOffset;
                    let posY = (TILE_D / 2 + 0.05); // Flat on the table
                    
                    // The vector pointing towards the center of the table
                    const protX = -conf.dirZ;
                    const protZ = conf.dirX;
                    
                    // The vector pointing towards the player (opposite of center)
                    const playerX = conf.dirZ;
                    const playerZ = -conf.dirX;

                    // 1. All sideways tiles must align their bottom edge with the upright tiles
                    if (isSideways && !isKakanStacked) {
                        const shiftBottom = (TILE_H - TILE_W) / 2;
                        posX += playerX * shiftBottom;
                        posZ += playerZ * shiftBottom;
                    }
                    
                    // 2. The 4th Kakan tile is placed adjacent to the 1st sideways tile, towards the center
                    if (isKakanStacked) {
                        // First, apply the same bottom-alignment shift so it starts at the 1st tile's position
                        const shiftBottom = (TILE_H - TILE_W) / 2;
                        posX += playerX * shiftBottom;
                        posZ += playerZ * shiftBottom;
                        
                        // Then, shift it towards the center by exactly one tile width + small gap
                        posX += protX * (TILE_W + 0.05);
                        posZ += protZ * (TILE_W + 0.05);
                    }
                    
                    mesh.position.set(posX, posY, posZ);
                    
                    if (m.type === 'ankan' && (i === 0 || i === m.tiles.length - 1)) {
                        mesh.rotation.set(Math.PI / 2, 0, conf.rotY, 'YXZ');
                    } else {
                        const finalRotZ = conf.rotY + (isSideways ? sideRotOffset : 0);
                        mesh.rotation.set(-Math.PI / 2, 0, finalRotZ, 'XYZ');
                    }

                    this.scene.add(mesh);
                    this.meldMeshes[playerIdx].push(mesh);
                    
                    if (!isKakanStacked) {
                        localOffset += currentWidth + 0.05;
                    }
                }
                meldOffset = localOffset + 0.2;
            }
        }

        // Highlight marker over the latest discarded tile
        highlightLatestDiscard(pos, rotY) {
            if (!this.latestDiscardMarker) {
                const group = new THREE.Group();

                // 1. Subtle glowing rectangular rim around the tile
                const rimGeo = new THREE.BoxGeometry(TILE_W + 0.16, 0.08, TILE_H + 0.16);
                const rimMat = new THREE.MeshBasicMaterial({
                    color: 0xffaa00,
                    transparent: true,
                    opacity: 0.55,
                    wireframe: true
                });
                const rim = new THREE.Mesh(rimGeo, rimMat);
                rim.position.y = 0.02;
                group.add(rim);

                // 2. Glowing indicator diamond hovering above tile
                const diamondGeo = new THREE.OctahedronGeometry(0.3, 0);
                const diamondMat = new THREE.MeshStandardMaterial({
                    color: 0xffcc00,
                    emissive: 0xff8800,
                    emissiveIntensity: 0.8,
                    roughness: 0.2
                });
                const diamond = new THREE.Mesh(diamondGeo, diamondMat);
                diamond.position.y = 0.85;
                diamond.name = 'diamond';
                group.add(diamond);

                this.latestDiscardMarker = group;
                this.scene.add(this.latestDiscardMarker);
            }

            this.latestDiscardMarker.position.set(pos.x, pos.y, pos.z);
            this.latestDiscardMarker.rotation.y = rotY;
            this.latestDiscardMarker.userData.baseY = pos.y;
            this.latestDiscardMarker.visible = true;
        }

        // Animate tile drawing from wall into player/AI hand (Dynamically adapts to Furo count and Rinshan draws)
        animateDrawTile(playerIdx, tile, onComplete, gameRef = null, isRinshan = false) {
            MahjongAudio.playTileDraw();

            const isPlayer = (playerIdx === 0);
            const mesh = isPlayer
                ? this.createTileMesh(tile.code || tile, tile.isAka || false)
                : this.createConcealedTileMesh();

            const game = gameRef || this.lastGame || window.game;
            const player = (game && game.players) ? game.players[playerIdx] : null;

            // Dynamically calculate actual hand length taking Furo (melds) into account:
            // 0 melds: 14 tiles (slot index 13)
            // 1 meld:  11 tiles (slot index 10)
            // 2 melds:  8 tiles (slot index 7)
            // 3 melds:  5 tiles (slot index 4)
            // 4 melds:  2 tiles (slot index 1)
            const meldCount = (player && player.melds) ? player.melds.length : 0;
            const totalCount = (player && player.hand && player.hand.length > 0)
                ? player.hand.length
                : Math.max(2, 14 - meldCount * 3);
            const targetSlotIdx = totalCount - 1;

            const remainingTiles = (game && game.wall) ? game.wall.length : 70;
            const rinshanIdx = Math.max(0, (game && game.drawnRinshanCount != null ? game.drawnRinshanCount - 1 : 0));
            const origin = isRinshan
                ? this.getRinshanTransform(rinshanIdx)
                : this.getWallOriginTransform(remainingTiles);
            const target = this.getHandTileTransform(playerIdx, targetSlotIdx, totalCount);

            mesh.position.copy(origin.position);
            mesh.rotation.copy(origin.rotation);
            this.scene.add(mesh);

            // Motion variations based on travel distance and Furo state:
            // As melds increase, the destination shifts leftward across the table.
            const dist = origin.position.distanceTo(target.position);
            const arcHeight = isRinshan ? 3.4 : Math.max(1.6, Math.min(2.5, 1.5 + dist * 0.035 + meldCount * 0.12));
            const duration = isRinshan ? 380 : Math.round(240 + meldCount * 12); // Majestic flight for Rinshan draw

            this.animations.push({
                mesh: mesh,
                startTime: performance.now(),
                duration: duration,
                startPos: origin.position.clone(),
                targetPos: target.position.clone(),
                startRot: origin.rotation.clone(),
                targetRot: target.rotation.clone(),
                arcHeight: arcHeight,
                onComplete: () => {
                    if (onComplete) onComplete();
                }
            });
        }

        // Animate tile discarding from hand to discard river (Dynamically adapts to Furo count)
        animateDiscardTile(playerIdx, tile, fromIndex, discardIndex, isRiichi, onComplete, discardsArray) {
            const mesh = this.createTileMesh(tile.code || tile, tile.isAka || false);

            const game = this.lastGame || window.game;
            const player = (game && game.players) ? game.players[playerIdx] : null;
            const meldCount = (player && player.melds) ? player.melds.length : 0;
            // The tile has just been removed from hand, so hand size before discarding was (hand.length + 1)
            const preDiscardCount = (player && player.hand)
                ? (player.hand.length + 1)
                : Math.max(2, 14 - meldCount * 3);
            const handSlotIdx = (fromIndex != null && fromIndex >= 0)
                ? fromIndex
                : (preDiscardCount - 1);

            const origin = this.getHandTileTransform(playerIdx, handSlotIdx, preDiscardCount);
            const target = this.getDiscardTransform(playerIdx, discardIndex, isRiichi, discardsArray);

            mesh.position.copy(origin.position);
            mesh.rotation.copy(origin.rotation);
            this.scene.add(mesh);

            this.animations.push({
                mesh: mesh,
                startTime: performance.now(),
                duration: 280,
                startPos: origin.position.clone(),
                targetPos: target.position.clone(),
                startRot: origin.rotation.clone(),
                targetRot: target.rotation.clone(),
                arcHeight: 2.6,
                onComplete: () => {
                    MahjongAudio.playTileDiscard(isRiichi);
                    this.highlightLatestDiscard(target.position, target.rotation.z);
                    if (onComplete) onComplete();
                }
            });
        }


        // Update active 3D animations frame by frame
        updateAnimations(time) {
            if (this.animations.length === 0) return;
            const now = (typeof time === 'number' && time > 0) ? time : performance.now();

            for (let i = this.animations.length - 1; i >= 0; i--) {
                const anim = this.animations[i];
                const elapsed = now - anim.startTime;
                const rawT = Math.min(Math.max(elapsed / anim.duration, 0), 1);

                // Ease out cubic
                const t = 1 - Math.pow(1 - rawT, 3);

                // Lerp position
                anim.mesh.position.lerpVectors(anim.startPos, anim.targetPos, t);
                // Parabolic Y arc
                const arcY = Math.sin(rawT * Math.PI) * (anim.arcHeight || 0);
                anim.mesh.position.y += arcY;

                // Lerp rotation
                anim.mesh.rotation.x = anim.startRot.x + (anim.targetRot.x - anim.startRot.x) * t;
                anim.mesh.rotation.y = anim.startRot.y + (anim.targetRot.y - anim.startRot.y) * t;
                anim.mesh.rotation.z = anim.startRot.z + (anim.targetRot.z - anim.startRot.z) * t;

                if (rawT >= 1) {
                    if (!anim.keepMesh) {
                        this.scene.remove(anim.mesh);
                    }
                    this.animations.splice(i, 1);
                    if (anim.onComplete) {
                        anim.onComplete();
                    }
                }
            }
        }

        // Animate win reveal: Lay winner hand flat and reveal Ura Doras
        animateWinReveal(winnerIdx, isRiichi, activeDoraCount, onComplete, gameRef) {
            let activeAnimations = 0;
            let hasCalledComplete = false;
            const checkComplete = () => {
                activeAnimations--;
                if (activeAnimations <= 0 && onComplete && !hasCalledComplete) {
                    hasCalledComplete = true;
                    onComplete();
                }
            };

            // Safety fallback: ensure onComplete always fires even under dropped frames or tab blur
            if (onComplete) {
                setTimeout(() => {
                    if (!hasCalledComplete) {
                        hasCalledComplete = true;
                        onComplete();
                    }
                }, 3500);
            }

            // 1. Reveal Hand (Lay flat)
            let handMeshes = winnerIdx === 0 ? this.playerHandMeshes : this.aiHandMeshes[winnerIdx - 1];
            
            // If it's an AI, we must swap the concealed meshes for the real textured meshes
            if (winnerIdx !== 0 && gameRef && gameRef.players[winnerIdx]) {
                const aiPlayer = gameRef.players[winnerIdx];
                const realMeshes = [];
                for (let i = 0; i < handMeshes.length; i++) {
                    const oldMesh = handMeshes[i];
                    const t = aiPlayer.hand[i];
                    
                    const newMesh = this.createTileMesh(t.code, t.isAka);
                    newMesh.position.copy(oldMesh.position);
                    newMesh.rotation.copy(oldMesh.rotation);
                    
                    this.scene.remove(oldMesh);
                    this.scene.add(newMesh);
                    realMeshes.push(newMesh);
                }
                handMeshes = realMeshes;
                this.aiHandMeshes[winnerIdx - 1] = realMeshes; // Update reference
            }

            for (let i = 0; i < handMeshes.length; i++) {
                const mesh = handMeshes[i];
                activeAnimations++;
                this.animations.push({
                    mesh: mesh,
                    keepMesh: true,
                    startTime: performance.now() + i * 40, // Stagger effect
                    duration: 400,
                    startPos: mesh.position.clone(),
                    targetPos: new THREE.Vector3(mesh.position.x, TILE_D / 2 + 0.05, mesh.position.z),
                    startRot: mesh.rotation.clone(),
                    targetRot: new THREE.Euler(-Math.PI / 2, mesh.rotation.y, mesh.rotation.z),
                    arcHeight: 0.5,
                    onComplete: checkComplete
                });
            }

            // 2. Fly Dora & Ura Dora next to hand (Only when Riichi: checking Uradora!)
            if (isRiichi && this.activeDoraMeshes && this.activeDoraMeshes.length > 0) {
                const total = this.activeDoraMeshes.length;
                const DORA_STEP = 1.95;
                const URA_OFFSET = 2.7;
                const ANCHOR_DIST = 18.2;

                const getDoraTransform = (wIdx, idx) => {
                    const outwardOffset = (total - 1 - idx) * DORA_STEP;
                    switch (wIdx) {
                        case 0: // South (User) - Hand left edge at x=-14.81. Anchored at x=-18.2, expands left (-X)
                            return {
                                tX: -ANCHOR_DIST - outwardOffset,
                                tZ: 23.5,
                                uX: -ANCHOR_DIST - outwardOffset,
                                uZ: 23.5 + URA_OFFSET,
                                rotY: 0
                            };
                        case 1: // East (AI 1) - Hand left edge at z=+14.81. Anchored at z=+18.2, expands south (+Z)
                            return {
                                tX: 24.7,
                                tZ: ANCHOR_DIST + outwardOffset,
                                uX: 24.7 + URA_OFFSET,
                                uZ: ANCHOR_DIST + outwardOffset,
                                rotY: -Math.PI / 2
                            };
                        case 2: // North (AI 2) - Hand left edge at x=+14.81. Anchored at x=+18.2, expands east (+X)
                            return {
                                tX: ANCHOR_DIST + outwardOffset,
                                tZ: -24.7,
                                uX: ANCHOR_DIST + outwardOffset,
                                uZ: -24.7 - URA_OFFSET,
                                rotY: Math.PI
                            };
                        case 3: // West (AI 3) - Hand left edge at z=-14.81. Anchored at z=-18.2, expands north (-Z)
                            return {
                                tX: -24.7,
                                tZ: -ANCHOR_DIST - outwardOffset,
                                uX: -24.7 - URA_OFFSET,
                                uZ: -ANCHOR_DIST - outwardOffset,
                                rotY: Math.PI / 2
                            };
                        default:
                            return {
                                tX: -ANCHOR_DIST - outwardOffset,
                                tZ: 23.5,
                                uX: -ANCHOR_DIST - outwardOffset,
                                uZ: 23.5 + URA_OFFSET,
                                rotY: 0
                            };
                    }
                };

                const animateTile = (mesh, targetX, targetZ, rotY, delay, duration, height) => {
                    if (!mesh) return;
                    activeAnimations++;
                    const targetRot = new THREE.Euler(-Math.PI / 2, 0, rotY, 'YXZ');
                    this.animations.push({
                        mesh: mesh,
                        keepMesh: true,
                        startTime: performance.now() + delay,
                        duration: duration,
                        startPos: mesh.position.clone(),
                        targetPos: new THREE.Vector3(targetX, 0.5, targetZ),
                        startRot: mesh.rotation.clone(),
                        targetRot: targetRot,
                        arcHeight: height,
                        onComplete: checkComplete
                    });
                };

                for (let idx = 0; idx < total; idx++) {
                    const trans = getDoraTransform(winnerIdx, idx);
                    
                    // Fly Dora (Top row)
                    const dMesh = this.activeDoraMeshes[idx];
                    animateTile(dMesh, trans.tX, trans.tZ, trans.rotY, idx * 250, 700, 5.0);

                    // Fly Uradora (Bottom row) if Riichi
                    if (isRiichi && this.activeUradoraMeshes && this.activeUradoraMeshes[idx]) {
                        const uMesh = this.activeUradoraMeshes[idx];
                        animateTile(uMesh, trans.uX, trans.uZ, trans.rotY, (idx * 250) + 150, 700, 6.0);
                    }
                }
            }

            if (activeAnimations === 0 && onComplete && !hasCalledComplete) {
                hasCalledComplete = true;
                onComplete();
            }
        }

        // Flash tiles that match ura dora ??called 1s after win reveal finishes
        flashUradoraMatches(winnerIdx, uraDoraIndicators, gameRef) {
            if (!uraDoraIndicators || uraDoraIndicators.length === 0) return;
            if (typeof MahjongScoring === 'undefined' || !MahjongScoring.getDoraTile) return;

            // Build set of actual ura dora tile codes
            const uraCodes = new Set();
            for (const ind of uraDoraIndicators) {
                const actual = MahjongScoring.getDoraTile(ind);
                uraCodes.add(actual);
                uraCodes.add(actual + '_aka');
            }

            // Collect meshes to flash: hand meshes + meld meshes of winner
            const toFlash = [];
            const handMeshes = winnerIdx === 0 ? this.playerHandMeshes : this.aiHandMeshes[winnerIdx - 1];
            for (const m of (handMeshes || [])) {
                if (m.userData && uraCodes.has(m.userData.tileCode)) toFlash.push(m);
            }
            for (const m of (this.meldMeshes[winnerIdx] || [])) {
                if (m.userData && uraCodes.has(m.userData.tileCode)) toFlash.push(m);
            }

            if (toFlash.length === 0) return;

            // Flash animation: pulse gold emissive 3 times
            const FLASH_COUNT = 3;
            const FLASH_INTERVAL = 300; // ms per half-cycle
            let tick = 0;

            const doFlash = () => {
                const isOn = (tick % 2 === 0);
                for (const mesh of toFlash) {
                    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    for (const mat of mats) {
                        if (mat && mat.emissive) {
                            mat.emissive.setHex(isOn ? 0xffaa00 : 0x000000);
                            mat.emissiveIntensity = isOn ? 1.2 : 0;
                        }
                    }
                }
                tick++;
                if (tick < FLASH_COUNT * 2) {
                    setTimeout(doFlash, FLASH_INTERVAL);
                } else {
                    // Leave emissive on a subtle gold at the end
                    for (const mesh of toFlash) {
                        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                        for (const mat of mats) {
                            if (mat && mat.emissive) {
                                mat.emissive.setHex(0x554000);
                                mat.emissiveIntensity = 0.8;
                            }
                        }
                    }
                }
            };
            doFlash();
        }

        // Mouse hover interaction: Lift hovered player tile
        onMouseMove(e) {
            if (this.isCameraDragging) return;
            if (this.animations.length > 0) return;

            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Temporarily lower the hovered tile to its original Y for accurate raycasting
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Filter out markers from intersection
            const testMeshes = this.playerHandMeshes.filter(m => !m.userData.isMarker);
            const intersects = this.raycaster.intersectObjects(testMeshes);

                        if (intersects.length > 0) {
                const target = intersects[0].object;
                if (this.hoveredTile !== target) {
                    if (this.hoveredTile) {
                        this.hoveredTile.position.y = this.getTileDefaultY(this.hoveredTile);
                    }
                    this.hoveredTile = target;
                    this.container.style.cursor = 'pointer';

                    this.highlightMatchingTiles(target.userData.tileCode);

                    if (this.onTileHover) {
                        this.onTileHover(target.userData.handIndex, e.clientX, e.clientY);
                    }
                }
                this.hoveredTile.position.y = this.hoveredTile.userData.originalY + 0.6;
            } else {
                if (this.hoveredTile) {
                    this.hoveredTile.position.y = this.getTileDefaultY(this.hoveredTile);
                    this.hoveredTile = null;
                    this.container.style.cursor = 'default';

                    this.highlightMatchingTiles(null);

                    if (this.onTileHoverOut) {
                        this.onTileHoverOut();
                    }
                }
            }
        }

        // Mouse click interaction: direct raycasting on click coordinates
        onClick(e) {
            if (e && e.target && this.renderer && e.target !== this.renderer.domElement) return;
            if (this.animations.length > 0) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const clickRaycaster = new THREE.Raycaster();
            clickRaycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), this.camera);
            const testMeshes = this.playerHandMeshes.filter(m => !m.userData.isMarker);
            const intersects = clickRaycaster.intersectObjects(testMeshes);

            if (intersects.length > 0 && this.onTileClick) {
                const target = intersects[0].object;
                const handIdx = target.userData.handIndex;
                this.onTileClick(handIdx);
            } else if (this.hoveredTile && this.onTileClick) {
                // Fallback to hovered tile
                const handIdx = this.hoveredTile.userData.handIndex;
                this.onTileClick(handIdx);
            }
        }

        onResize() {
            const width = this.container.clientWidth || window.innerWidth;
            const height = this.container.clientHeight || window.innerHeight;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }

        // Animate Furo (Chi, Pon, Kan, Kakan)
        // 1. Hand tiles corresponding to Furo start standing at their exact hand slot positions.
        // 2. They tilt forward and lay flat on the mat directly in front of those slots.
        // 3. The remaining hand tiles maintain their gaps ("이빨 빠진 배치").
        // 4. Laid tiles and called tile move into the right-side Furo meld position.
        // 5. Once meld is formed, remaining hand tiles slide leftward to pack into a neat solid row.
        animateFuro(game, playerId, meldType, meldTiles, onComplete, furoInfo) {
            // 1. Render the game state to generate the final meshes
            this.renderGameState(game);

            const player = game.players[playerId];
            const currentHandCount = player.hand.length;
            let removedIndices = (furoInfo && Array.isArray(furoInfo.removedIndices)) ? [...furoInfo.removedIndices] : null;
            let preHandCount = (furoInfo && typeof furoInfo.preHandCount === 'number') ? furoInfo.preHandCount : null;

            if (!preHandCount) {
                const numFromHand = (meldType === 'ankan') ? 4 : ((meldType === 'kan' || meldType === 'daiminkan') ? 3 : (meldType === 'kakan' ? 1 : 2));
                preHandCount = currentHandCount + numFromHand;
            }
            if (!removedIndices || removedIndices.length === 0) {
                removedIndices = [];
                const numFromHand = (meldType === 'ankan') ? 4 : ((meldType === 'kan' || meldType === 'daiminkan') ? 3 : (meldType === 'kakan' ? 1 : 2));
                const mid = Math.max(0, Math.floor((preHandCount - numFromHand) / 2));
                for (let k = 0; k < numFromHand; k++) removedIndices.push(mid + k);
            }

            // Calculate remaining slot indices in the hand (gapped arrangement)
            const remainingSlots = [];
            for (let s = 0; s < preHandCount; s++) {
                if (!removedIndices.includes(s)) {
                    remainingSlots.push(s);
                }
            }

            // Reposition remaining hand meshes at their original gapped slots immediately (frame 0)
            const handMeshes = (playerId === 0)
                ? this.playerHandMeshes.filter(m => m && !m.userData.isMarker)
                : (this.aiHandMeshes[playerId - 1] || []);

            for (let j = 0; j < handMeshes.length; j++) {
                const slot = (j < remainingSlots.length) ? remainingSlots[j] : j;
                const tf = this.getHandTileTransform(playerId, slot, preHandCount);
                handMeshes[j].position.copy(tf.position);
                handMeshes[j].rotation.copy(tf.rotation);
                handMeshes[j].userData.originalY = tf.position.y;
            }

            // 2. Locate the meld in the player's melds
            let meshStartIndex = 0;
            let targetMeld = null;
            let numTilesToAnimate = meldTiles.length;

            for (let i = 0; i < player.melds.length; i++) {
                const m = player.melds[i];
                if (m.tiles === meldTiles || m.tiles.map(t => t.code || t).join() === meldTiles.map(t => t.code || t).join()) {
                    targetMeld = m;
                    break;
                }
                meshStartIndex += m.tiles.length;
            }

            if (!targetMeld || !this.meldMeshes[playerId]) {
                if (onComplete) onComplete();
                return;
            }

            if (meldType === 'kakan') {
                numTilesToAnimate = 1;
                meshStartIndex += 3; // Only animate the 4th tile
            }

            const meshesToAnimate = this.meldMeshes[playerId].slice(meshStartIndex, meshStartIndex + numTilesToAnimate);
            if (!meshesToAnimate || meshesToAnimate.length === 0) {
                if (onComplete) onComplete();
                return;
            }

            // Determine sideways index (which tile is the called tile from discard)
            const diff = (targetMeld.fromPlayer !== undefined && targetMeld.fromPlayer !== playerId)
                ? (targetMeld.fromPlayer - playerId + 4) % 4 : 0;
            let sidewaysIndex = -1;
            if (targetMeld.type !== 'ankan' && meldType !== 'kakan') {
                if (diff === 3) {
                    sidewaysIndex = (targetMeld.type === 'kan' || targetMeld.type === 'daiminkan') && targetMeld.tiles.length >= 3 ? 2 : targetMeld.tiles.length - 1;
                } else if (diff === 2) {
                    sidewaysIndex = 1;
                } else if (diff === 1) {
                    sidewaysIndex = 0;
                }
            }

            const configs = [
                { startX: 27.0, startZ: 26.0, dirX: -1, dirZ: 0, rotY: 0 },             // Player 0 (South)
                { startX: 26.0, startZ: -27.0, dirX: 0, dirZ: 1, rotY: -Math.PI / 2 }, // AI 1 (East)
                { startX: -27.0, startZ: -26.0, dirX: 1, dirZ: 0, rotY: Math.PI },     // AI 2 (North)
                { startX: -26.0, startZ: 27.0, dirX: 0, dirZ: -1, rotY: Math.PI / 2 }  // AI 3 (West)
            ];
            const conf = configs[playerId];

            // Direction vectors towards table center
            const fwdX = -conf.dirZ;
            const fwdZ = conf.dirX;

            const flatPosY = TILE_D / 2 + 0.05;
            const flatRot = new THREE.Euler(-Math.PI / 2, 0, conf.rotY, 'XYZ');

            // Separate hand meshes from called mesh
            const handTileInfos = [];
            let calledTileInfo = null;

            for (let i = 0; i < meshesToAnimate.length; i++) {
                const mesh = meshesToAnimate[i];
                const finalPos = mesh.position.clone();
                const finalRot = mesh.rotation.clone();

                if (i === sidewaysIndex) {
                    // This is the called tile from discard
                    let calledStartPos = new THREE.Vector3(0, flatPosY, 0);
                    let calledStartRot = new THREE.Euler(-Math.PI / 2, 0, 0);

                    if (targetMeld.fromPlayer !== undefined && game.players[targetMeld.fromPlayer]) {
                        const fromP = targetMeld.fromPlayer;
                        const discardsArr = game.players[fromP].discards || [];
                        const lastDiscardIdx = discardsArr.length;
                        const discardTf = this.getDiscardTransform(fromP, lastDiscardIdx, false, discardsArr);
                        if (discardTf) {
                            calledStartPos = discardTf.position.clone();
                            calledStartRot = discardTf.rotation.clone();
                        }
                    }

                    calledTileInfo = {
                        mesh,
                        calledStartPos,
                        calledStartRot,
                        finalPos,
                        finalRot
                    };
                } else {
                    handTileInfos.push({
                        mesh,
                        finalPos,
                        finalRot
                    });
                }
            }

            // Set up exact in-place start positions and in-front-of-slot flat positions
            handTileInfos.forEach((info, k) => {
                const origSlot = (k < removedIndices.length) ? removedIndices[k] : k;
                const slotTf = this.getHandTileTransform(playerId, origSlot, preHandCount);

                // 1. Exact standing transform in the caller's hand slot
                info.startPos = slotTf.position.clone();
                info.standingRot = slotTf.rotation.clone();

                // 2. Laid flat on mat directly in front of that exact slot
                info.flatPos = new THREE.Vector3(
                    slotTf.position.x + fwdX * 1.6,
                    flatPosY,
                    slotTf.position.z + fwdZ * 1.6
                );
                info.flatRot = flatRot.clone();

                // Stand upright in the hand at frame 0
                info.mesh.position.copy(info.startPos);
                info.mesh.rotation.copy(info.standingRot);
                info.mesh.scale.set(1, 1, 1);
            });

            // Position called tile at river if present
            if (calledTileInfo) {
                calledTileInfo.mesh.position.copy(calledTileInfo.calledStartPos);
                calledTileInfo.mesh.rotation.copy(calledTileInfo.calledStartRot);
                calledTileInfo.mesh.scale.set(1, 1, 1);
            }

            // Hand Repack Animation: smoothly slides remaining hand tiles leftward to form a single solid block
            const startHandRepack = () => {
                let movingCount = 0;
                let repackCompleted = 0;

                const checkRepackDone = () => {
                    repackCompleted++;
                    if (repackCompleted >= movingCount) {
                        if (typeof MahjongAudio !== 'undefined' && MahjongAudio.playTileClick) {
                            MahjongAudio.playTileClick();
                        }
                        if (onComplete) onComplete();
                    }
                };

                const REPACK_DUR = 360;
                const now = performance.now();

                for (let j = 0; j < handMeshes.length; j++) {
                    const m = handMeshes[j];
                    const targetTf = this.getHandTileTransform(playerId, j, handMeshes.length);
                    const curPos = m.position.clone();
                    const curRot = m.rotation.clone();

                    const dist = curPos.distanceTo(targetTf.position);
                    if (dist > 0.05) {
                        movingCount++;
                        this.animations.push({
                            mesh: m,
                            keepMesh: true,
                            startTime: now,
                            duration: REPACK_DUR,
                            startPos: curPos,
                            targetPos: targetTf.position.clone(),
                            startRot: curRot,
                            targetRot: targetTf.rotation.clone(),
                            arcHeight: 0.02,
                            onComplete: checkRepackDone
                        });
                    } else {
                        m.position.copy(targetTf.position);
                        m.rotation.copy(targetTf.rotation);
                        m.userData.originalY = targetTf.position.y;
                    }
                }

                if (movingCount === 0) {
                    if (onComplete) onComplete();
                }
            };

            // If no hand tiles to animate, exit cleanly
            if (handTileInfos.length === 0) {
                if (onComplete) onComplete();
                return;
            }

            // --- PHYSICAL 3-STAGE REFINED FURO SEQUENCE ---
            // Stage 1 (0ms ~ 300ms): Tilt forward from hand slot and lay flat on mat directly in front of the slot
            // Stage 2 (300ms ~ 540ms): 240ms dwell with click sound while hand maintains gap
            // Stage 3 (540ms ~ 1020ms): Slide laid tiles + arc called tile into right-side Furo meld slot
            // Stage 4 (1020ms ~ 1380ms): Hand tiles smoothly slide leftward into a single solid block
            let phase1Done = 0;
            const STAND_DELAY = 60;
            const DUR_TILT = 300;
            const PRESENTATION_DWELL = 240;

            const startPhase2 = () => {
                if (typeof MahjongAudio !== 'undefined' && MahjongAudio.playTileDraw) {
                    MahjongAudio.playTileDraw();
                }

                const totalAnims = handTileInfos.length + (calledTileInfo ? 1 : 0);
                let completed = 0;
                const checkFinalDone = () => {
                    completed++;
                    if (completed >= totalAnims) {
                        if (typeof MahjongAudio !== 'undefined' && MahjongAudio.playTileDiscard) {
                            MahjongAudio.playTileDiscard();
                        }
                        // All meld tiles arrived in the meld slot -> slide remaining hand tiles leftward to close the gap!
                        startHandRepack();
                    }
                };

                const DUR_SLIDE = 480;
                const STAGGER = 60;
                const now = performance.now();

                // 1. Lift and arc laid hand tiles over standing hand tiles into right-side meld position
                handTileInfos.forEach((info, idx) => {
                    this.animations.push({
                        mesh: info.mesh,
                        keepMesh: true,
                        startTime: now + (idx * STAGGER),
                        duration: DUR_SLIDE,
                        startPos: info.flatPos.clone(),
                        targetPos: info.finalPos.clone(),
                        startRot: info.flatRot.clone(),
                        targetRot: info.finalRot.clone(),
                        arcHeight: 2.8,
                        onComplete: checkFinalDone
                    });
                });

                // 2. Arc called tile from river to sideways meld position
                if (calledTileInfo) {
                    this.animations.push({
                        mesh: calledTileInfo.mesh,
                        keepMesh: true,
                        startTime: now + (handTileInfos.length * STAGGER),
                        duration: DUR_SLIDE + 40,
                        startPos: calledTileInfo.calledStartPos.clone(),
                        targetPos: calledTileInfo.finalPos.clone(),
                        startRot: calledTileInfo.calledStartRot.clone(),
                        targetRot: calledTileInfo.finalRot.clone(),
                        arcHeight: 1.8,
                        onComplete: checkFinalDone
                    });
                }
            };

            const onPhase1Complete = () => {
                phase1Done++;
                if (phase1Done >= handTileInfos.length) {
                    if (typeof MahjongAudio !== 'undefined' && MahjongAudio.playTileClick) {
                        MahjongAudio.playTileClick();
                    }
                    setTimeout(() => {
                        startPhase2();
                    }, PRESENTATION_DWELL);
                }
            };

            // Phase 1: Tilt tiles forward from their exact hand slots to lay flat on the mat in front of their slots
            handTileInfos.forEach((info) => {
                this.animations.push({
                    mesh: info.mesh,
                    keepMesh: true,
                    startTime: performance.now() + STAND_DELAY,
                    duration: DUR_TILT,
                    startPos: info.startPos.clone(),
                    targetPos: info.flatPos.clone(),
                    startRot: info.standingRot.clone(),
                    targetRot: info.flatRot.clone(),
                    arcHeight: 0.35,
                    onComplete: onPhase1Complete
                });
            });
        }


        animate(time = 0) {
            requestAnimationFrame(this.animate);
            this.updateAnimations(time);
            
            // Float Tenpai Markers
            if (this.playerHandMeshes) {
                for (const m of this.playerHandMeshes) {
                    if (m.userData && m.userData.isMarker) {
                        m.position.y = m.userData.startY + Math.sin(time * 0.005) * 0.15;
                        m.rotation.y += 0.02;
                    }
                }
            }

            if (this.latestDiscardMarker && this.latestDiscardMarker.visible) {
                const diamond = this.latestDiscardMarker.getObjectByName('diamond');
                if (diamond) {
                    diamond.rotation.y += 0.03;
                    const baseY = this.latestDiscardMarker.userData.baseY || 0;
                    this.latestDiscardMarker.position.y = baseY + Math.sin(time * 0.005) * 0.08;
                }
            }

            // Pulse Dora Glow
            if (this.activeDoraMaterials) {
                const pulse = 0.5 + Math.sin(time * 0.003) * 0.3; // 0.2 ~ 0.8
                for (const mat of this.activeDoraMaterials) {
                    mat.emissiveIntensity = pulse;
                }
            }

            this.renderer.render(this.scene, this.camera);
        }
    }

    Mahjong3D.SceneManager = SceneManager;
    global.Mahjong3D = Mahjong3D;
})(window);

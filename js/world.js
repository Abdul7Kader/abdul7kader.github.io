// Die begehbare Welt: Karte, Figuren, Kamera, Steuerung, Wegfindung und Rendering.
(function () {
    const CV = window.CV;
    const W = 2600, H = 1800;
    const TAU = Math.PI * 2;

    // Chronologische Stationen meines Lebenslaufs (Gebäude). base = Unterkante, depth = Tiefe am Boden.
    const STATION_DEFS = [
        { id: 'arrival', emoji: '✈️', style: 'airport', x: 160, base: 1470, w: 360, depth: 120, height: 96 },
        { id: 'school', emoji: '🎓', style: 'school', x: 330, base: 760, w: 380, depth: 130, height: 120 },
        { id: 'career', emoji: '🏢', style: 'career', x: 900, base: 560, w: 360, depth: 110, height: 190 },
        { id: 'lab', emoji: '💻', style: 'lab', x: 1500, base: 620, w: 320, depth: 120, height: 116 },
        { id: 'projects', emoji: '🏗️', style: 'construction', x: 1500, base: 1400, w: 320, depth: 120, height: 86 },
        { id: 'lake', emoji: '🏄', style: 'boathouse', x: 1900, base: 1420, w: 240, depth: 90, height: 80 },
        { id: 'finale', emoji: '🏆', style: 'finale', x: 2060, base: 470, w: 340, depth: 120, height: 146 }
    ];

    const ROADS = [
        [[340, 1500], [340, 1560], [770, 1560], [770, 1420]],
        [[770, 1420], [1010, 1420], [1250, 1080]],
        [[1120, 950], [520, 950], [520, 780]],
        [[1250, 820], [1250, 690], [1080, 690], [1080, 580]],
        [[1250, 690], [1660, 690], [1660, 640]],
        [[1380, 950], [1440, 950], [1440, 1490], [1660, 1490], [1660, 1420]],
        [[1660, 1490], [2020, 1490], [2020, 1440]],
        [[1660, 690], [1960, 690], [1960, 545], [2230, 545], [2230, 490]],
        [[2020, 1490], [2300, 1490], [2420, 1300], [2470, 1180]]
    ];
    const ROAD_W = 62;
    const PLAZA = { x: 1250, y: 950, r: 138 };
    const FOUNTAIN = { x: 1250, y: 950, r: 54 };
    const LAKE = { x: 2260, y: 1000, rx: 235, ry: 170 };
    const HILL = { x: 2230, y: 410, rx: 380, ry: 220 };
    const RUNWAY = { x: 90, y: 1612, w: 940, h: 74 };
    const SPAWN = { x: 340, y: 1565 };

    // Leistung: Diese Werte bestimmen, wie viel Rechenzeit die Welt braucht.
    const PERF = {
        MAX_DPR: 1.5,          // höchste Pixeldichte der Welt (Retina-Bildschirme rechnen sonst die 4-fache Fläche)
        MIN_DPR: 1,            // so weit wird bei Überlast automatisch heruntergeregelt
        DPR_STEP: 0.25,
        IDLE_FPS: 15,          // Bildrate, wenn sich nichts Wichtiges bewegt (Bewohner, Wolken, Wasser)
        ATTRACT_FPS: 30,       // Bildrate der Vorschau hinter dem Startbildschirm
        SLOW_GAP_MS: 26,       // gemessener Bildabstand, ab dem die Welt als überlastet gilt
        ADAPT_FRAMES: 90,      // so viele bewegte Bilder werden gemittelt, bevor heruntergeregelt wird
        WAKE_MS: 400,          // nach einer Eingabe so lange mit voller Bildrate zeichnen
        GROUND_RES_DESKTOP: 1.25, // Auflösung der vorgerenderten Bodenebene (Pixel pro Welteinheit)
        GROUND_RES_TOUCH: 1,
        GROUND_TILE: 256,      // Bodenkachel in Welteinheiten; Kacheln liegen in Bildschirm-Auflösung vor
        GROUND_TILE_MAX: 56,   // höchstens so viele Kacheln im Speicher (älteste werden verworfen)
        COVER_BLUR_PX: 6       // Unschärfe der angehaltenen Welt hinter Dialogen (einmal berechnet)
    };
    // Wie oft das zwischengespeicherte Bild eines Gebäudes neu gezeichnet wird (Sekunden; 0 = nur einmal).
    // Nur kleine Details (Blinklichter, Uhr, Fahnen) bewegen sich – dafür reichen wenige Bilder pro Sekunde.
    const BUILDING_REFRESH = { airport: 0.25, school: 1, career: 0.5, lab: 0.2, construction: 0, boathouse: 0, finale: 0.25 };

    const World = CV.World = {
        W, H, stations: [], paused: true, attract: true,
        onEnterStation: null, onCollect: null, onFirstMove: null
    };

    let canvas, ctx, dpr = 1, vw = 0, vh = 0, zoom = 1;
    const cam = { x: 400, y: 900 };
    let time = 0, last = 0;
    let ground = null;
    const trees = [], props = [], npcs = [], ducks = [], tokens = [], particles = [], clouds = [], birds = [];
    let player, robot;
    const keys = {};
    let joy = null;          // Touch-Joystick
    let nearStation = null;  // Station in Türnähe
    let suppressStation = null;
    let hoverStation = null;
    let firstMoveDone = false;
    let plane = { t: -1, next: 6 };
    let covered = false, frozen = false, lastDraw = 0, wakeUntil = 0, camMoving = false, liveParticles = 0;
    let dprCap = PERF.MAX_DPR, gapEma = 0, busyFrames = 0, prevTs = 0;
    let groundRes = 1, RS = 1;   // RS = Render-Maßstab (Bildschirmpixel pro Welteinheit)

    // ------------------------------------------------------------------ Hilfen
    function rr(c, x, y, w, h, r) {
        c.beginPath();
        if (c.roundRect) c.roundRect(x, y, w, h, r);
        else {
            c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
            c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
        }
    }
    function ellipse(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
    function distSeg(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const t = CV.clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }
    function distRoad(x, y) {
        let m = Infinity;
        for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) m = Math.min(m, distSeg(x, y, r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]));
        return m;
    }
    function inLake(x, y, pad = 0) {
        const dx = (x - LAKE.x) / (LAKE.rx + pad), dy = (y - LAKE.y) / (LAKE.ry + pad);
        return dx * dx + dy * dy < 1;
    }
    function stationRect(s) { return { x: s.x, y: s.base - s.depth, w: s.w, h: s.depth }; }

    // ------------------------------------------------------------------ Kollision
    function blocked(x, y, r = 13) {
        if (x < r + 16 || y < r + 16 || x > W - r - 16 || y > H - r - 16) return true;
        for (const s of World.stations) {
            const b = stationRect(s);
            if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r * 0.4) return true;
        }
        if (CV.dist(x, y, FOUNTAIN.x, FOUNTAIN.y) < FOUNTAIN.r + r) return true;
        if (inLake(x, y, -14 + r)) return true;
        for (const t of trees) {
            if (Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 40 && CV.dist(x, y, t.x, t.y) < t.trunk + r) return true;
        }
        for (const p of props) if (p.solid && CV.dist(x, y, p.x, p.y) < p.solid + r) return true;
        return false;
    }

    // ------------------------------------------------------------------ Wegfindung (A*)
    const CELL = 20, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
    let grid = null;
    function buildGrid() {
        grid = new Uint8Array(GW * GH);
        for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
            grid[gy * GW + gx] = blocked(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 15) ? 1 : 0;
        }
    }
    function nearestFree(gx, gy) {
        for (let rad = 0; rad < 12; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
            const x = gx + dx, y = gy + dy;
            if (x >= 0 && y >= 0 && x < GW && y < GH && !grid[y * GW + x]) return [x, y];
        }
        return null;
    }
    function lineFree(ax, ay, bx, by) {
        const d = CV.dist(ax, ay, bx, by), n = Math.ceil(d / 8);
        for (let i = 1; i <= n; i++) if (blocked(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, 14)) return false;
        return true;
    }
    function findPath(sx, sy, tx, ty) {
        let s = nearestFree(Math.floor(sx / CELL), Math.floor(sy / CELL));
        let t = nearestFree(Math.floor(tx / CELL), Math.floor(ty / CELL));
        if (!s || !t) return null;
        const N = GW * GH, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
        const start = s[1] * GW + s[0], goal = t[1] * GW + t[0];
        const heap = [];
        const push = (i, f) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
        const pop = () => { const top = heap[0], end = heap.pop(); if (heap.length) { heap[0] = end; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break;[heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
        const hfun = (i) => { const dx = Math.abs(i % GW - t[0]), dy = Math.abs(((i / GW) | 0) - t[1]); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
        g[start] = 0; push(start, hfun(start));
        let found = false, iter = 0;
        while (heap.length && iter++ < 40000) {
            const [, cur] = pop();
            if (cur === goal) { found = true; break; }
            if (closed[cur]) continue;
            closed[cur] = 1;
            const cx = cur % GW, cy = (cur / GW) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = cx + dx, ny = cy + dy;
                if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
                const ni = ny * GW + nx;
                if (grid[ni] || closed[ni]) continue;
                if (dx && dy && (grid[cy * GW + nx] || grid[ny * GW + cx])) continue;
                const ng = g[cur] + (dx && dy ? Math.SQRT2 : 1);
                if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; push(ni, ng + hfun(ni)); }
            }
        }
        if (!found) return null;
        const pts = [];
        for (let i = goal; i !== -1; i = came[i]) pts.push([(i % GW) * CELL + CELL / 2, ((i / GW) | 0) * CELL + CELL / 2]);
        pts.reverse();
        pts[pts.length - 1] = blocked(tx, ty, 13) ? pts[pts.length - 1] : [tx, ty];
        // Glätten: überflüssige Zwischenpunkte entfernen
        const out = [];
        let ax = sx, ay = sy, i = 0;
        while (i < pts.length) {
            let j = pts.length - 1;
            while (j > i && !lineFree(ax, ay, pts[j][0], pts[j][1])) j--;
            out.push(pts[j]); ax = pts[j][0]; ay = pts[j][1]; i = j + 1;
        }
        return out;
    }

    // ------------------------------------------------------------------ Aufbau
    function buildWorld() {
        const st = CV.data.stations || {};
        World.stations = STATION_DEFS.map(d => Object.assign({}, d, {
            title: (st[d.id] && st[d.id].title) || d.id,
            door: { x: d.x + d.w / 2, y: d.base + 30 }
        }));

        const rnd = CV.rng(20141031);
        const okForTree = (x, y, pad) => {
            if (distRoad(x, y) < ROAD_W / 2 + pad) return false;
            if (CV.dist(x, y, PLAZA.x, PLAZA.y) < PLAZA.r + pad + 10) return false;
            if (inLake(x, y, pad + 26)) return false;
            if (x > RUNWAY.x - pad && x < RUNWAY.x + RUNWAY.w + pad && y > RUNWAY.y - pad && y < RUNWAY.y + RUNWAY.h + pad + 20) return false;
            for (const s of World.stations) {
                const top = s.base - s.height - s.depth - 30;
                if (x > s.x - pad - 10 && x < s.x + s.w + pad + 10 && y > top && y < s.base + pad + 60) return false;
            }
            if (CV.dist(x, y, SPAWN.x, SPAWN.y) < 70) return false;
            for (const t of trees) if (CV.dist(x, y, t.x, t.y) < 46) return false;
            return true;
        };
        const addTree = (x, y, kind) => {
            const size = 0.8 + rnd() * 0.5;
            trees.push({ x, y, size, trunk: 11 * size, kind: kind || (rnd() < 0.28 ? 'pine' : 'round'), hue: rnd(), phase: rnd() * TAU });
        };
        // Waldrand
        for (let x = 20; x < W; x += 58) {
            [[x + rnd() * 20, 30 + rnd() * 20], [x + rnd() * 20, H - 40 - rnd() * 16]].forEach(([tx, ty]) => { if (okForTree(tx, ty, 10)) addTree(tx, ty); });
        }
        for (let y = 80; y < H - 60; y += 60) {
            [[26 + rnd() * 20, y + rnd() * 20], [W - 30 - rnd() * 20, y + rnd() * 20]].forEach(([tx, ty]) => { if (okForTree(tx, ty, 10)) addTree(tx, ty); });
        }
        for (let i = 0; i < 900 && trees.length < 260; i++) {
            const x = 60 + rnd() * (W - 120), y = 80 + rnd() * (H - 140);
            if (okForTree(x, y, 34)) addTree(x, y);
        }

        // Laternen entlang der Wege
        ROADS.forEach((r, ri) => {
            for (let i = 0; i < r.length - 1; i++) {
                const [ax, ay] = r[i], [bx, by] = r[i + 1];
                const len = Math.hypot(bx - ax, by - ay), n = Math.floor(len / 240);
                for (let k = 1; k <= n; k++) {
                    const t = k / (n + 1), nx = -(by - ay) / len, ny = (bx - ax) / len, side = (k + ri) % 2 ? 1 : -1;
                    const px = ax + (bx - ax) * t + nx * side * (ROAD_W / 2 + 12), py = ay + (by - ay) * t + ny * side * (ROAD_W / 2 + 12);
                    if (!World.stations.some(s => px > s.x - 20 && px < s.x + s.w + 20 && py > s.base - s.depth - 20 && py < s.base + 50)) {
                        props.push({ type: 'lamp', x: px, y: py, solid: 5 });
                    }
                }
            }
        });
        props.push({ type: 'sign', x: PLAZA.x + 112, y: PLAZA.y + 110, solid: 8 });
        props.push({ type: 'bench', x: PLAZA.x - 100, y: PLAZA.y - 116 });
        props.push({ type: 'bench', x: PLAZA.x + 100, y: PLAZA.y - 116 });
        props.push({ type: 'fountain', x: FOUNTAIN.x, y: FOUNTAIN.y + 30 });
        props.push({ type: 'plane', x: 860, y: 1650 });
        props.push({ type: 'dock', x: 2190, y: 1150 });

        // Bewohner mit kleinen Fakten
        const looks = [
            { skin: '#f1c27d', hair: '#e2b04a', jacket: '#e76f51', pants: '#3d405b', shirt: '#fff' },
            { skin: '#8d5524', hair: '#1b1b1b', jacket: '#2a9d8f', pants: '#264653', shirt: '#fff' },
            { skin: '#ffdbac', hair: '#7b3f00', jacket: '#9b5de5', pants: '#22223b', shirt: '#fff' },
            { skin: '#c68642', hair: '#2b2b2b', jacket: '#f4a261', pants: '#3a5a40', shirt: '#fff' },
            { skin: '#e0ac69', hair: '#b5651d', jacket: '#457b9d', pants: '#1d3557', shirt: '#fff' }
        ];
        [[1150, 1080], [1330, 640], [960, 1500], [1880, 1300], [600, 1000]].forEach(([x, y], i) => {
            npcs.push({ x, y, home: { x, y }, tx: x, ty: y, look: looks[i % looks.length], dir: 'down', walk: 0, moving: false, wait: 1 + i, fact: i, talkUntil: 0, cooldown: 0, id: 'npc' + i });
        });

        for (let i = 0; i < 3; i++) ducks.push({ a: i * 2.1, r: 0.55 + i * 0.12, speed: 0.06 + i * 0.015 });
        for (let i = 0; i < 6; i++) clouds.push({ x: rnd() * W, y: rnd() * H, rx: 160 + rnd() * 160, ry: 70 + rnd() * 60, v: 6 + rnd() * 8 });

        // Skill-Sterne entlang der Wege
        const labels = CV.derived.skillTokens.slice(0, 24);
        const segs = [];
        let total = 0;
        ROADS.forEach(r => { for (let i = 0; i < r.length - 1; i++) { const len = CV.dist(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]); segs.push({ a: r[i], b: r[i + 1], len, at: total }); total += len; } });
        const got = CV.store.get('tokens', []);
        labels.forEach((label, i) => {
            let pos = (i + 0.5) / labels.length * total;
            for (let tries = 0; tries < 12; tries++) {
                const seg = segs.find(s => pos >= s.at && pos <= s.at + s.len) || segs[segs.length - 1];
                const t = (pos - seg.at) / seg.len;
                const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t, y = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
                const nearDoor = World.stations.some(s => CV.dist(x, y, s.door.x, s.door.y) < 90);
                if (!nearDoor && !blocked(x, y, 8) && CV.dist(x, y, SPAWN.x, SPAWN.y) > 60) {
                    tokens.push({ x, y, label, got: got.includes(label), phase: i });
                    break;
                }
                pos = (pos + 37) % total;
            }
        });

        player = { x: SPAWN.x, y: SPAWN.y, dir: 'up', walk: 0, moving: false, path: null, pendingStation: null, look: { skin: '#e2b08c', hair: '#2e211a', jacket: '#1d2741', pants: '#262b38', shirt: '#fbfbfb', beard: '#3d2c22', glasses: true, hero: true }, speed: 235, stuck: 0 };
        robot = { x: SPAWN.x - 40, y: SPAWN.y + 10, talkUntil: 0, text: '' };
        World.player = player;
        World.robot = robot;
    }

    function buildGround() {
        const g = document.createElement('canvas');
        groundRes = CV.isTouch ? PERF.GROUND_RES_TOUCH : PERF.GROUND_RES_DESKTOP;
        g.width = Math.round(W * groundRes); g.height = Math.round(H * groundRes);
        const c = g.getContext('2d');
        c.scale(groundRes, groundRes);
        const rnd = CV.rng(77);
        c.fillStyle = '#8cce6c';
        c.fillRect(0, 0, W, H);
        for (let i = 0; i < 160; i++) {
            const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 200;
            const grad = c.createRadialGradient(x, y, 0, x, y, r);
            const col = rnd() < 0.5 ? '120,190,90' : '160,215,120';
            grad.addColorStop(0, `rgba(${col},0.35)`);
            grad.addColorStop(1, `rgba(${col},0)`);
            c.fillStyle = grad;
            c.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // Hügel unter dem Finale
        const hg = c.createRadialGradient(HILL.x, HILL.y + 40, 20, HILL.x, HILL.y, HILL.rx);
        hg.addColorStop(0, 'rgba(200,236,150,0.95)');
        hg.addColorStop(0.7, 'rgba(170,222,128,0.6)');
        hg.addColorStop(1, 'rgba(150,210,110,0)');
        c.fillStyle = hg;
        ellipse(c, HILL.x, HILL.y, HILL.rx, HILL.ry); c.fill();
        // Hügelkante (Schatten unten)
        c.strokeStyle = 'rgba(70,120,50,0.18)'; c.lineWidth = 10;
        c.beginPath(); c.ellipse(HILL.x, HILL.y + 6, HILL.rx * 0.82, HILL.ry * 0.78, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
        // Sprenkel
        for (let i = 0; i < 9000; i++) {
            c.fillStyle = rnd() < 0.5 ? 'rgba(90,160,70,0.35)' : 'rgba(190,235,150,0.35)';
            c.fillRect(rnd() * W, rnd() * H, 2, 2);
        }
        // Grasbüschel
        c.lineWidth = 2; c.lineCap = 'round';
        for (let i = 0; i < 1700; i++) {
            const x = rnd() * W, y = rnd() * H;
            c.strokeStyle = rnd() < 0.5 ? '#6db455' : '#79c060';
            c.beginPath(); c.moveTo(x - 4, y - 7); c.lineTo(x, y); c.lineTo(x + 4, y - 8); c.moveTo(x, y); c.lineTo(x + 1, y - 10); c.stroke();
        }
        // Blumen
        const fcols = ['#ffffff', '#ffd23f', '#ff6b9a', '#b388ff', '#ff8c42'];
        for (let i = 0; i < 650; i++) {
            const x = rnd() * W, y = rnd() * H, col = fcols[Math.floor(rnd() * fcols.length)];
            c.fillStyle = col;
            for (let k = 0; k < 4; k++) { ellipse(c, x + Math.cos(k * 1.57) * 2.4, y + Math.sin(k * 1.57) * 2.4, 2.1, 2.1); c.fill(); }
            c.fillStyle = '#ffcf33'; ellipse(c, x, y, 1.4, 1.4); c.fill();
        }
        // Unbewegliche Teile der Welt: einmal hier zeichnen statt in jedem Bild
        // Landebahn
        c.fillStyle = '#5b6170'; rr(c, RUNWAY.x, RUNWAY.y, RUNWAY.w, RUNWAY.h, 8); c.fill();
        c.fillStyle = '#ffffff';
        for (let x = RUNWAY.x + 30; x < RUNWAY.x + RUNWAY.w - 30; x += 60) c.fillRect(x, RUNWAY.y + RUNWAY.h / 2 - 2, 32, 4);
        for (let i = 0; i < 6; i++) { c.fillRect(RUNWAY.x + 10, RUNWAY.y + 8 + i * 10, 18, 5); }

        // Wege
        c.lineCap = 'round'; c.lineJoin = 'round';
        c.strokeStyle = '#c4ab7b'; c.lineWidth = ROAD_W + 8;
        ROADS.forEach(r => { c.beginPath(); c.moveTo(r[0][0], r[0][1]); r.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.stroke(); });
        c.fillStyle = '#c4ab7b'; ellipse(c, PLAZA.x, PLAZA.y, PLAZA.r + 4, PLAZA.r + 4); c.fill();
        c.strokeStyle = '#ead9ae'; c.lineWidth = ROAD_W;
        ROADS.forEach(r => { c.beginPath(); c.moveTo(r[0][0], r[0][1]); r.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.stroke(); });
        c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 4; c.setLineDash([2, 22]);
        ROADS.forEach(r => { c.beginPath(); c.moveTo(r[0][0], r[0][1]); r.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.stroke(); });
        c.setLineDash([]);
        // Platz
        c.fillStyle = '#e6dfcf'; ellipse(c, PLAZA.x, PLAZA.y, PLAZA.r, PLAZA.r); c.fill();
        c.strokeStyle = '#d2c7b0'; c.lineWidth = 2;
        for (let r = 30; r < PLAZA.r; r += 26) { ellipse(c, PLAZA.x, PLAZA.y, r, r); c.stroke(); }

        // See
        c.fillStyle = '#e8d8a4'; ellipse(c, LAKE.x, LAKE.y, LAKE.rx + 16, LAKE.ry + 14); c.fill();
        const lg = c.createRadialGradient(LAKE.x, LAKE.y, 20, LAKE.x, LAKE.y, LAKE.rx);
        lg.addColorStop(0, '#2f8fc4'); lg.addColorStop(1, '#5cc0e6');
        c.fillStyle = lg; ellipse(c, LAKE.x, LAKE.y, LAKE.rx, LAKE.ry); c.fill();
        return g;
    }

    // ------------------------------------------------------------------ Größen & Kamera
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, dprCap);
        vw = window.innerWidth; vh = window.innerHeight;
        canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
        canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
        zoom = CV.clamp(Math.sqrt(vw * vh) / 1000, 0.55, 1.12);
        RS = dpr * zoom;
        frozen = false;
        World.wake();
    }
    function viewW() { return vw / zoom; }
    function viewH() { return vh / zoom; }
    function clampCam(x, y) {
        const w = viewW(), h = viewH();
        return {
            x: w >= W ? (W - w) / 2 : CV.clamp(x, 0, W - w),
            y: h >= H ? (H - h) / 2 : CV.clamp(y, 0, H - h)
        };
    }
    World.worldToScreen = (x, y) => ({ x: (x - cam.x) * zoom, y: (y - cam.y) * zoom });
    World.screenToWorld = (x, y) => ({ x: x / zoom + cam.x, y: y / zoom + cam.y });

    // ------------------------------------------------------------------ Eingabe
    function setupInput() {
        window.addEventListener('keydown', (e) => {
            if (World.paused) return;
            World.wake();
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            keys[k] = true;
            if ((k === 'e' || k === 'Enter' || k === ' ') && nearStation) {
                World.enter(nearStation);
            }
        });
        window.addEventListener('keyup', (e) => {
            const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            keys[k] = false;
        });
        window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

        const joyEl = CV.$('#joystick'), knob = CV.$('#joystick-knob');
        let down = null;
        canvas.addEventListener('pointerdown', (e) => {
            if (World.paused) return;
            CV.audio.unlock();
            down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, type: e.pointerType, drag: false };
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
        });
        canvas.addEventListener('pointermove', (e) => {
            if (!down || down.id !== e.pointerId) {
                if (e.pointerType === 'mouse') {
                    const p = World.screenToWorld(e.clientX, e.clientY);
                    const h = stationAt(p.x, p.y);
                    if (h !== hoverStation) World.wake();
                    hoverStation = h;
                    canvas.style.cursor = hoverStation ? 'pointer' : 'default';
                }
                return;
            }
            const dx = e.clientX - down.x, dy = e.clientY - down.y;
            if (!down.drag && Math.hypot(dx, dy) > 14 && down.type !== 'mouse') {
                down.drag = true;
                joy = { x: 0, y: 0 };
                joyEl.style.left = down.x + 'px'; joyEl.style.top = down.y + 'px';
                joyEl.classList.remove('hidden');
                player.path = null; player.pendingStation = null;
            }
            if (down.drag) {
                const len = Math.hypot(dx, dy), m = Math.min(len, 52);
                joy.x = len ? dx / len * (m / 52) : 0;
                joy.y = len ? dy / len * (m / 52) : 0;
                knob.style.transform = `translate(${joy.x * 40}px, ${joy.y * 40}px)`;
            }
        });
        const end = (e) => {
            if (!down || down.id !== e.pointerId) return;
            if (!down.drag && !World.paused) tapAt(e.clientX, e.clientY);
            down = null; joy = null;
            joyEl.classList.add('hidden');
            knob.style.transform = '';
        };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
    }

    function stationAt(x, y) {
        for (const s of World.stations) {
            const top = s.base - s.height - s.depth - (s.style === 'career' ? 70 : 20) - 40;
            if (x > s.x - 10 && x < s.x + s.w + 10 && y > top && y < s.base + 40) return s;
        }
        return null;
    }

    function tapAt(sx, sy) {
        const p = World.screenToWorld(sx, sy);
        const s = stationAt(p.x, p.y);
        if (s) { World.walkToStation(s.id); return; }
        markFirstMove();
        const path = findPath(player.x, player.y, p.x, p.y);
        if (path) {
            player.path = path; player.pendingStation = null;
            spawnRing(p.x, p.y);
        }
    }

    function markFirstMove() {
        if (!firstMoveDone) { firstMoveDone = true; World.onFirstMove && World.onFirstMove(); }
    }

    World.walkToStation = function (id) {
        const s = World.stations.find(st => st.id === id);
        if (!s) return;
        markFirstMove();
        if (CV.dist(player.x, player.y, s.door.x, s.door.y) < 60) { World.enter(s); return; }
        const path = findPath(player.x, player.y, s.door.x, s.door.y + 6);
        if (path) {
            player.path = path; player.pendingStation = s.id;
            spawnRing(s.door.x, s.door.y);
        }
    };

    World.enter = function (s) {
        if (World.paused) return;
        player.path = null; player.pendingStation = null;
        for (const k in keys) keys[k] = false;
        suppressStation = s.id;
        if (World.isLocked && World.isLocked(s.id)) { World.onLocked && World.onLocked(s.id); return; }
        World.onEnterStation && World.onEnterStation(s.id);
    };

    World.teleportTo = function (id) {
        const s = World.stations.find(st => st.id === id);
        if (!s) return;
        player.x = s.door.x; player.y = s.door.y + 20;
        suppressStation = s.id;
    };

    // ------------------------------------------------------------------ Partikel & Effekte
    function spawn(p) { if (particles.length < 600) particles.push(p); }
    function spawnRing(x, y) { spawn({ type: 'ring', x, y, life: 0, max: 0.6 }); }
    World.confetti = function (x, y, n = 80) {
        const cols = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
        for (let i = 0; i < n; i++) {
            const a = Math.random() * TAU, v = 120 + Math.random() * 260;
            spawn({ type: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 220, g: 420, life: 0, max: 1.6 + Math.random(), col: cols[i % cols.length], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
        }
    };
    World.confettiOnPlayer = (n) => World.confetti(player.x, player.y - 60, n);

    // ------------------------------------------------------------------ Update
    function update(dt) {
        time += dt;
        const G = CV.game;

        // Kamera im Vorschau-Modus langsam schwenken
        if (World.attract) {
            const tx = W / 2 + Math.cos(time * 0.08) * 700 - viewW() / 2;
            const ty = H / 2 + Math.sin(time * 0.11) * 360 - viewH() / 2;
            const c = clampCam(tx, ty);
            cam.x = CV.lerp(cam.x, c.x, Math.min(1, dt * 0.8));
            cam.y = CV.lerp(cam.y, c.y, Math.min(1, dt * 0.8));
        }

        // Spieler
        let mx = 0, my = 0;
        if (!World.paused) {
            if (keys.w || keys.ArrowUp) my -= 1;
            if (keys.s || keys.ArrowDown) my += 1;
            if (keys.a || keys.ArrowLeft) mx -= 1;
            if (keys.d || keys.ArrowRight) mx += 1;
            if (joy) { mx = joy.x; my = joy.y; }
        }
        if (mx || my) { player.path = null; player.pendingStation = null; markFirstMove(); }
        if (!World.paused && player.path && player.path.length) {
            const [tx, ty] = player.path[0];
            const dx = tx - player.x, dy = ty - player.y, d = Math.hypot(dx, dy);
            if (d < 6) player.path.shift();
            else { mx = dx / d; my = dy / d; }
            if (!player.path.length) {
                player.path = null;
                if (player.pendingStation) {
                    const s = World.stations.find(st => st.id === player.pendingStation);
                    player.pendingStation = null;
                    player.dir = 'up';
                    if (s) World.enter(s);
                }
            }
        }
        const len = Math.hypot(mx, my);
        player.moving = len > 0.05;
        if (player.moving) {
            const sp = player.speed * dt * Math.min(1, len);
            const nx = mx / len, ny = my / len;
            const ox = player.x, oy = player.y;
            if (!blocked(player.x + nx * sp, player.y, 13)) player.x += nx * sp;
            if (!blocked(player.x, player.y + ny * sp, 13)) player.y += ny * sp;
            const moved = Math.hypot(player.x - ox, player.y - oy);
            if (player.path && moved < sp * 0.2) { if (++player.stuck > 40) { player.path = null; player.pendingStation = null; player.stuck = 0; } }
            else player.stuck = 0;
            player.walk += dt * 13;
            if (Math.abs(nx) > Math.abs(ny)) player.dir = nx > 0 ? 'right' : 'left';
            else player.dir = ny > 0 ? 'down' : 'up';
            if (Math.random() < dt * 9) spawn({ type: 'dust', x: player.x + (Math.random() - 0.5) * 10, y: player.y, vx: -nx * 20, vy: -8, life: 0, max: 0.5 });
        } else player.walk = 0;

        // Kamera folgt
        if (!World.attract) {
            const c = clampCam(player.x - viewW() / 2, player.y - 40 - viewH() / 2);
            const k = Math.min(1, dt * 5);
            cam.x = CV.lerp(cam.x, c.x, k); cam.y = CV.lerp(cam.y, c.y, k);
            camMoving = Math.abs(cam.x - c.x) + Math.abs(cam.y - c.y) > 0.5;
        }

        // Roboter-Begleiter
        const rtx = player.x + (player.dir === 'left' ? 38 : -38), rty = player.y + 14;
        robot.x = CV.lerp(robot.x, rtx, Math.min(1, dt * 3));
        robot.y = CV.lerp(robot.y, rty, Math.min(1, dt * 3));

        // Stationen in Reichweite
        nearStation = null;
        for (const s of World.stations) {
            if (CV.dist(player.x, player.y, s.door.x, s.door.y) < 62) { nearStation = s; break; }
        }
        if (!nearStation) suppressStation = null;
        else if (!World.paused && suppressStation !== nearStation.id && !player.path) {
            const auto = World.canAutoEnter ? World.canAutoEnter(nearStation.id) : true;
            if (auto) World.enter(nearStation);
            else if (World.isLocked && World.isLocked(nearStation.id)) { suppressStation = nearStation.id; World.onLocked && World.onLocked(nearStation.id); }
        }
        World.nearStation = nearStation;

        // Sterne einsammeln
        if (!World.paused) for (const t of tokens) {
            if (!t.got && CV.dist(player.x, player.y - 10, t.x, t.y) < 34) {
                t.got = true;
                for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; spawn({ type: 'spark', x: t.x, y: t.y - 14, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0, max: 0.5 }); }
                spawn({ type: 'text', x: t.x, y: t.y - 30, text: '+ ' + t.label, life: 0, max: 1.3 });
                World.onCollect && World.onCollect(t.label, tokens.filter(x => x.got).map(x => x.label), tokens.length);
            }
        }

        // Bewohner
        for (const n of npcs) {
            const d = CV.dist(n.x, n.y, player.x, player.y);
            if (d < 95 && !World.paused) {
                n.moving = false;
                n.dir = Math.abs(player.x - n.x) > Math.abs(player.y - n.y) ? (player.x > n.x ? 'right' : 'left') : (player.y > n.y ? 'down' : 'up');
                if (n.cooldown <= 0) {
                    const facts = CV.data.facts || [];
                    if (facts.length) {
                        World.say(n, facts[n.fact % facts.length], 4500);
                        n.fact += npcs.length;
                    }
                    n.cooldown = 9;
                }
            } else {
                n.wait -= dt;
                if (n.wait <= 0 && !n.moving) {
                    for (let k = 0; k < 8; k++) {
                        const a = Math.random() * TAU, r = 30 + Math.random() * 90;
                        const tx = n.home.x + Math.cos(a) * r, ty = n.home.y + Math.sin(a) * r;
                        if (!blocked(tx, ty, 14)) { n.tx = tx; n.ty = ty; n.moving = true; break; }
                    }
                    n.wait = 2 + Math.random() * 4;
                }
                if (n.moving) {
                    const dx = n.tx - n.x, dy = n.ty - n.y, dd = Math.hypot(dx, dy);
                    if (dd < 3) n.moving = false;
                    else {
                        const sp = 55 * dt;
                        const nx2 = n.x + dx / dd * sp, ny2 = n.y + dy / dd * sp;
                        if (blocked(nx2, ny2, 12)) n.moving = false; else { n.x = nx2; n.y = ny2; }
                        n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                    }
                }
            }
            n.cooldown -= dt;
            if (n.moving) n.walk += dt * 9; else n.walk = 0;
        }

        // Umgebung
        for (const d of ducks) d.a += d.speed * dt;
        for (const cl of clouds) { cl.x += cl.v * dt; if (cl.x - cl.rx > W) cl.x = -cl.rx; }
        if (Math.random() < dt * 0.05 && birds.length < 2) {
            const y = 200 + Math.random() * (H - 400);
            birds.push({ x: -80, y, v: 110 + Math.random() * 40, n: 3 + Math.floor(Math.random() * 3) });
        }
        for (let i = birds.length - 1; i >= 0; i--) { birds[i].x += birds[i].v * dt; birds[i].y -= dt * 8; if (birds[i].x > W + 100) birds.splice(i, 1); }
        plane.next -= dt;
        if (plane.t < 0 && plane.next <= 0) { plane.t = 0; }
        if (plane.t >= 0) { plane.t += dt; if (plane.t > 9) { plane.t = -1; plane.next = 26 + Math.random() * 10; } }
        if (Math.random() < dt * 14) {
            const a = Math.random() * TAU;
            spawn({ type: 'drop', x: FOUNTAIN.x + Math.cos(a) * 4, y: FOUNTAIN.y - 38, vx: Math.cos(a) * (30 + Math.random() * 30), vy: -140 - Math.random() * 60, g: 420, life: 0, max: 0.9, floor: FOUNTAIN.y + 6 + Math.sin(a) * 18 });
        }
        const fin = World.stations.find(s => s.id === 'finale');
        if (G && G.allVisited && G.allVisited() && Math.random() < dt * 6) {
            spawn({ type: 'spark', x: fin.x + Math.random() * fin.w, y: fin.base - Math.random() * (fin.height + fin.depth), vx: 0, vy: -30, life: 0, max: 1 });
        }

        liveParticles = 0;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life += dt;
            if (p.life > p.max) { particles[i] = particles[particles.length - 1]; particles.pop(); continue; }
            if (p.type !== 'drop') liveParticles++;
            if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
            if (p.g) p.vy += p.g * dt;
            if (p.type === 'confetti') { p.vx *= 0.985; p.rot += p.vr * dt; if (p.vy > 90) p.vy = 90; }
            if (p.type === 'drop' && p.y > p.floor && p.vy > 0) { particles[i] = particles[particles.length - 1]; particles.pop(); }
        }

        updateBubbles();
    }

    // ------------------------------------------------------------------ Sprechblasen (DOM)
    const bubbles = new Map();
    World.say = function (ent, text, ms = 3500) {
        let b = bubbles.get(ent);
        if (!b) {
            const el = document.createElement('div');
            el.className = 'bubble';
            CV.$('#bubbles').appendChild(el);
            b = { el };
            bubbles.set(ent, b);
        }
        b.el.textContent = text;
        b.until = time + ms / 1000;
        b.el.classList.add('show');
    };
    World.sayRobot = (text, ms) => World.say(robot, text, ms);
    function updateBubbles() {
        bubbles.forEach((b, ent) => {
            if (time > b.until) { b.el.classList.remove('show'); return; }
            const off = ent === robot ? 70 : 74;
            const s = World.worldToScreen(ent.x, ent.y - off);
            b.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
        });
    }

    // ------------------------------------------------------------------ Zeichnen: Figuren
    function drawPerson(c, x, y, o) {
        const L = o.look, mv = o.moving, t = o.walk;
        const swing = mv ? Math.sin(t) * 4 : 0;
        const bob = mv ? Math.abs(Math.sin(t)) * 1.6 : Math.sin(time * 2 + x) * 0.4;
        c.fillStyle = 'rgba(25,45,20,0.25)'; ellipse(c, x, y, 14, 5); c.fill();
        const yb = y - bob;
        const side = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0;
        // Beine
        c.fillStyle = L.pants;
        const lh = 14 + swing * 0.5, rh = 14 - swing * 0.5;
        rr(c, x - 7, yb - 15, 6, lh, 2); c.fill();
        rr(c, x + 1, yb - 15, 6, rh, 2); c.fill();
        c.fillStyle = '#1b1b1f';
        rr(c, x - 8, yb - 15 + lh - 3, 8, 4, 2); c.fill();
        rr(c, x, yb - 15 + rh - 3, 8, 4, 2); c.fill();
        // Arme hinten
        c.fillStyle = L.jacket;
        rr(c, x - 15, yb - 34 + swing * 0.5, 6, 16, 3); c.fill();
        rr(c, x + 9, yb - 34 - swing * 0.5, 6, 16, 3); c.fill();
        c.fillStyle = L.skin;
        ellipse(c, x - 12, yb - 17 + swing * 0.5, 3, 3); c.fill();
        ellipse(c, x + 12, yb - 17 - swing * 0.5, 3, 3); c.fill();
        // Oberkörper
        c.fillStyle = L.jacket;
        rr(c, x - 11, yb - 37, 22, 24, 7); c.fill();
        if (o.dir !== 'up') {
            c.fillStyle = L.shirt;
            c.beginPath(); c.moveTo(x - 5 + side * 2, yb - 37); c.lineTo(x + 5 + side * 2, yb - 37); c.lineTo(x + side * 2, yb - 26); c.closePath(); c.fill();
        }
        // Revers und Hemdkragen (Spielfigur)
        if (L.hero && o.dir !== 'up') {
            c.fillStyle = '#2c3a5e';
            c.beginPath(); c.moveTo(x - 6 + side * 2, yb - 37); c.lineTo(x - 1 + side * 2, yb - 26); c.lineTo(x - 9 + side * 2, yb - 31); c.closePath(); c.fill();
            c.beginPath(); c.moveTo(x + 6 + side * 2, yb - 37); c.lineTo(x + 1 + side * 2, yb - 26); c.lineTo(x + 9 + side * 2, yb - 31); c.closePath(); c.fill();
            c.fillStyle = '#ffffff';
            c.beginPath(); c.moveTo(x - 5 + side * 2, yb - 38); c.lineTo(x + side * 2, yb - 34); c.lineTo(x - 2 + side * 2, yb - 39); c.closePath(); c.fill();
            c.beginPath(); c.moveTo(x + 5 + side * 2, yb - 38); c.lineTo(x + side * 2, yb - 34); c.lineTo(x + 2 + side * 2, yb - 39); c.closePath(); c.fill();
        }
        // Kopf
        const hx = x + side * 1.5, hy = yb - 50;
        c.fillStyle = L.skin;
        ellipse(c, hx, hy, 13.5, 13.5); c.fill();
        // Haare
        c.fillStyle = L.hair;
        if (o.dir === 'up') { ellipse(c, hx, hy - 1, 13.8, 13); c.fill(); }
        else {
            c.beginPath(); c.arc(hx, hy - 1, 14, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
            rr(c, hx - 14, hy - 6, 4, 7, 2); c.fill();
            rr(c, hx + 10, hy - 6, 4, 7, 2); c.fill();
            if (L.hero) { // Haare mit Volumen, seitlich gekämmt
                c.beginPath(); c.ellipse(hx + 2 + side * 2, hy - 12, 12, 6, -0.15, 0, TAU); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(hx + 4 + side * 2, hy - 14, 6, 2, -0.2, 0, TAU); c.fill();
            }
        }
        if (o.dir !== 'up') {
            const fx = hx + side * 4;
            if (L.beard) {
                c.fillStyle = L.beard;
                c.globalAlpha = 0.85;
                c.beginPath(); c.arc(fx, hy - 1, 12.6, 0.12 * Math.PI, 0.88 * Math.PI); c.lineTo(fx - 9, hy + 3); c.quadraticCurveTo(fx, hy + 1, fx + 9, hy + 3); c.closePath(); c.fill();
                c.globalAlpha = 1;
            }
            // Augen: von vorn symmetrisch, seitlich als Dreiviertel-Ansicht – immer zwei Augen.
            // near = Auge zur Kamera hin (größer), far = Auge am Gesichtsrand (schmaler).
            const eyes = side === 0
                ? [{ x: fx - 4.6, rx: 1.9, ry: 2.2 }, { x: fx + 4.6, rx: 1.9, ry: 2.2 }]
                : [{ x: fx - side * 2.4, rx: 1.9, ry: 2.2, near: true }, { x: fx + side * 5, rx: 1.4, ry: 2.1 }];
            const ey = hy - 2;
            if (L.hero) { // Augenbrauen
                c.strokeStyle = L.hair; c.lineWidth = 1.8; c.lineCap = 'round';
                c.beginPath();
                eyes.forEach(e => { const w = e.rx * 1.6; c.moveTo(e.x - w, ey - 5.2); c.lineTo(e.x + w, ey - 5.6); });
                c.stroke();
            }
            const blink = (Math.sin(time * 1.3 + x) > 0.985) ? 0.25 : 1;
            eyes.forEach(e => {
                c.fillStyle = '#1c1c1c'; ellipse(c, e.x, ey, e.rx, e.ry * blink); c.fill();
                if (blink === 1) { c.fillStyle = 'rgba(255,255,255,0.9)'; ellipse(c, e.x + 0.6, ey - 0.8, 0.6, 0.6); c.fill(); }
            });
            if (L.glasses) {
                c.strokeStyle = '#26262b'; c.lineWidth = 1.3;
                eyes.forEach(e => { ellipse(c, e.x, ey, e.rx + 2.1, 3.4); c.stroke(); });
                const [a, b] = eyes[0].x < eyes[1].x ? eyes : [eyes[1], eyes[0]];
                c.beginPath(); c.moveTo(a.x + a.rx + 2.1, ey - 0.4); c.lineTo(b.x - b.rx - 2.1, ey - 0.4); c.stroke();
                if (side !== 0) { // Bügel zum sichtbaren Ohr
                    const n = eyes[0];
                    c.beginPath(); c.moveTo(n.x - side * (n.rx + 2.1), ey - 0.6); c.lineTo(hx - side * 10, ey - 1.6); c.stroke();
                }
            }
            // Lächeln
            c.strokeStyle = L.beard ? '#fff' : '#6b3b2a'; c.lineWidth = 1.4;
            c.beginPath(); c.arc(fx + side * 1.2, hy + 3, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
        }
    }

    function drawRobot(c, x, y) {
        const h = 36 + Math.sin(time * 3) * 4;
        c.fillStyle = 'rgba(25,45,20,0.18)'; ellipse(c, x, y, 9, 3.5); c.fill();
        const by = y - h;
        // Antrieb
        c.fillStyle = 'rgba(120,220,255,' + (0.35 + Math.sin(time * 20) * 0.15) + ')';
        ellipse(c, x, by + 12, 5, 3); c.fill();
        c.fillStyle = '#ffffff'; c.strokeStyle = '#c6d2e1'; c.lineWidth = 1.5;
        rr(c, x - 12, by - 10, 24, 20, 8); c.fill(); c.stroke();
        c.fillStyle = '#1b2a4a'; rr(c, x - 9, by - 6, 18, 9, 4); c.fill();
        const blink = Math.sin(time * 1.7) > 0.97 ? 0.3 : 1;
        c.fillStyle = '#4cf0ff';
        rr(c, x - 6, by - 4, 4, 5 * blink, 1.5); c.fill();
        rr(c, x + 2, by - 4, 4, 5 * blink, 1.5); c.fill();
        c.strokeStyle = '#9aa9bd'; c.beginPath(); c.moveTo(x, by - 10); c.lineTo(x, by - 17); c.stroke();
        c.fillStyle = Math.sin(time * 4) > 0 ? '#ff8a3d' : '#ffc24d'; ellipse(c, x, by - 18, 2.6, 2.6); c.fill();
    }

    // Baum zeichnen (ohne Wind) – wird nur für die Sprite-Vorlagen benutzt
    const TREE_SPRITE_SIZE = 1.3;                       // Bezugsgröße für den Umriss TREE_BOX
    const TREE_BOX = { x0: -48, y0: -130, x1: 48, y1: 16 };
    function paintTree(c, x, y, s, kind, hue) {
        c.fillStyle = 'rgba(25,55,20,0.24)'; ellipse(c, x + 8 * s, y + 2, 26 * s, 9 * s); c.fill();
        c.fillStyle = '#7a5235'; rr(c, x - 5 * s, y - 24 * s, 10 * s, 26 * s, 3); c.fill();
        if (kind === 'pine') {
            const cols = ['#2f7d4a', '#3a9158', '#47a465'];
            for (let i = 0; i < 3; i++) {
                const ty = y - 22 * s - i * 20 * s, w = (34 - i * 8) * s;
                c.fillStyle = cols[i];
                c.beginPath(); c.moveTo(x - w, ty); c.lineTo(x + w, ty); c.lineTo(x, ty - 34 * s); c.closePath(); c.fill();
            }
        } else {
            const g = hue < 0.33 ? ['#3f8f45', '#55a957', '#73c26a'] : hue < 0.66 ? ['#468f3e', '#5fa84a', '#80c45e'] : ['#3b8a55', '#4fa36a', '#6dbb80'];
            c.fillStyle = g[0]; ellipse(c, x, y - 44 * s, 30 * s, 26 * s); c.fill();
            c.fillStyle = g[1]; ellipse(c, x - 8 * s, y - 52 * s, 22 * s, 20 * s); c.fill();
            ellipse(c, x + 11 * s, y - 48 * s, 18 * s, 17 * s); c.fill();
            c.fillStyle = g[2]; ellipse(c, x - 6 * s, y - 60 * s, 13 * s, 10 * s); c.fill();
            if (hue > 0.82) { c.fillStyle = '#ff5d5d'; [[-12, -40], [8, -55], [14, -38], [-2, -48]].forEach(([dx, dy]) => { ellipse(c, x + dx * s, y + dy * s, 3, 3); c.fill(); }); }
        }
    }
    // Nur wenige Vorlagen (Art × Farbton), jeder Baum benutzt eine davon
    const treeVariant = (t) => t.kind === 'pine' ? 'pine' : t.hue > 0.82 ? 'fruit' : t.hue < 0.33 ? 'r0' : t.hue < 0.66 ? 'r1' : 'r2';
    const TREE_HUE = { pine: 0, fruit: 0.9, r0: 0.1, r1: 0.5, r2: 0.7 };
    // Größen werden auf Stufen gerundet, damit jede Vorlage 1:1 kopiert werden kann (ohne Umrechnen der Pixel)
    const TREE_SIZE_STEP = 0.1;
    function drawTree(c, t) {
        const v = treeVariant(t);
        const size = Math.round(t.size / TREE_SIZE_STEP) * TREE_SIZE_STEP;
        const k = size / TREE_SPRITE_SIZE;
        const sp = sprite(`tree:${v}:${size.toFixed(1)}`, TREE_BOX.x0 * k, TREE_BOX.y0 * k, TREE_BOX.x1 * k, TREE_BOX.y1 * k,
            (cc) => paintTree(cc, 0, 0, size, v === 'pine' ? 'pine' : 'round', TREE_HUE[v]));
        blit(c, sp, t.x, t.y);
    }

    // ------------------------------------------------------------------ Zeichnen: Gebäude
    function windows(c, x, y, w, h, cols, rows, col, lit) {
        const gx = w / cols, gy = h / rows;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
            const wx = x + i * gx + gx * 0.18, wy = y + j * gy + gy * 0.18, ww = gx * 0.64, wh = gy * 0.64;
            c.fillStyle = col; rr(c, wx, wy, ww, wh, 2); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(wx + 2, wy + 2, ww * 0.3, wh - 4);
            if (lit && ((i * 7 + j * 3 + Math.floor(time * 0.5)) % 9 === 0)) { c.fillStyle = 'rgba(255,230,140,0.55)'; rr(c, wx, wy, ww, wh, 2); c.fill(); }
        }
    }
    function door(c, cx, base, col, w = 34, h = 44) {
        c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(cx - w / 2 - 6, base - 4, w + 12, 6);
        c.fillStyle = col; rr(c, cx - w / 2, base - h, w, h, [10, 10, 2, 2]); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, cx - w / 2 + 4, base - h + 5, w / 2 - 6, h - 10, 6); c.fill();
        c.fillStyle = '#ffd36b'; ellipse(c, cx + w / 2 - 7, base - h / 2, 2.4, 2.4); c.fill();
    }
    function box(c, s, wall, roof, opts = {}) {
        const yT = s.base - s.height, yR = yT - s.depth;
        c.fillStyle = 'rgba(25,50,20,0.22)';
        rr(c, s.x + 12, s.base - s.depth * 0.3, s.w + 10, s.depth * 0.3 + 14, 12); c.fill();
        const g = c.createLinearGradient(0, yT, 0, s.base);
        g.addColorStop(0, wall[0]); g.addColorStop(1, wall[1]);
        c.fillStyle = g; c.fillRect(s.x, yT, s.w, s.height);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(s.x, s.base - 8, s.w, 8);
        if (!opts.noRoof) {
            c.fillStyle = roof[0]; rr(c, s.x - 8, yR, s.w + 16, s.depth + 4, 6); c.fill();
            c.fillStyle = roof[1]; c.fillRect(s.x - 8, yT - 6, s.w + 16, 12);
            c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(s.x - 4, yR + 4, s.w + 8, 5);
            c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(s.x, yT + 6, s.w, 6);
        }
        return { yT, yR };
    }
    function signText(c, text, x, y, size, col = '#fff', weight = 700) {
        c.font = `${weight} ${size}px Outfit, system-ui, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = col; c.fillText(text, x, y);
    }

    // Kran der Projekt-Baustelle: einziges Gebäudeteil mit flüssiger Bewegung, deshalb in jedem Bild gezeichnet
    function drawCrane(c, s) {
        const yT = s.base - s.height, yR = yT - s.depth;
        // Kran
        const mx = s.x + s.w - 40, top = yR - 150;
        c.strokeStyle = '#f2b705'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(mx - 8, s.base - 30); c.lineTo(mx - 8, top); c.moveTo(mx + 8, s.base - 30); c.lineTo(mx + 8, top); c.stroke();
        c.lineWidth = 2;
        for (let y = s.base - 30; y > top; y -= 18) { c.beginPath(); c.moveTo(mx - 8, y); c.lineTo(mx + 8, y - 18); c.stroke(); }
        // Ausleger: fest an der Mastspitze, fährt teleskopartig aus und ein (nie kürzer als 110).
        const jy = top - 4, BASE = 110;
        const len = CV.reducedMotion ? 160 : 150 + Math.sin(time * 0.35) * 40;
        // Gegenausleger mit Gegengewicht
        c.strokeStyle = '#f2b705'; c.lineWidth = 6; c.lineCap = 'butt';
        c.beginPath(); c.moveTo(mx, jy); c.lineTo(mx + 56, jy); c.stroke();
        c.fillStyle = '#6b7280'; rr(c, mx + 34, jy + 3, 22, 16, 2); c.fill();
        // Grundteil (Gitter) + ausfahrbares Teil (etwas schmaler, liegt darin)
        c.strokeStyle = '#f2b705'; c.lineWidth = 7;
        c.beginPath(); c.moveTo(mx, jy); c.lineTo(mx - BASE, jy); c.stroke();
        c.strokeStyle = '#c99400'; c.lineWidth = 1.2;
        for (let k = 0; k < BASE - 8; k += 12) { c.beginPath(); c.moveTo(mx - k, jy - 3); c.lineTo(mx - k - 12, jy + 3); c.stroke(); }
        c.strokeStyle = '#ffd23f'; c.lineWidth = 4.5;
        c.beginPath(); c.moveTo(mx - BASE + 14, jy); c.lineTo(mx - len, jy); c.stroke();
        c.fillStyle = '#c99400'; c.fillRect(mx - len - 3, jy - 4, 5, 8);
        // Abspannseile von der Turmspitze
        c.strokeStyle = 'rgba(60,60,60,0.55)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(mx, jy - 34); c.lineTo(mx - BASE * 0.95, jy - 2); c.moveTo(mx, jy - 34); c.lineTo(mx + 50, jy - 2); c.stroke();
        c.strokeStyle = '#f2b705'; c.lineWidth = 3; c.beginPath(); c.moveTo(mx, jy); c.lineTo(mx, jy - 36); c.stroke();
        c.fillStyle = '#555'; rr(c, mx - 12, top - 22, 24, 18, 3); c.fill();
        c.fillStyle = '#9fd4f5'; rr(c, mx - 9, top - 19, 10, 8, 2); c.fill();
        // Laufkatze fährt auf dem Ausleger mit, Seil hängt senkrecht
        const hx = mx - len + 12 + (len - 40) * (0.15 + 0.1 * Math.sin(time * 0.6)), hy = jy + 4;
        c.fillStyle = '#374151'; rr(c, hx - 7, jy + 1, 14, 6, 2); c.fill();
        const drop = 64 + Math.sin(time * 0.9) * 8;
        c.strokeStyle = '#444'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy + drop); c.stroke();
        c.fillStyle = '#ff8a3d'; rr(c, hx - 16, hy + drop, 32, 16, 3); c.fill();
    }

    const DRAW = {
        airport(c, s) {
            const { yT, yR } = box(c, s, ['#f3f6fa', '#d7dee8'], ['#8ea2b8', '#6c8097']);
            const gl = c.createLinearGradient(0, yT + 18, 0, yT + 62);
            gl.addColorStop(0, '#7fc8f0'); gl.addColorStop(1, '#3f8fc7');
            c.fillStyle = gl; rr(c, s.x + 14, yT + 18, s.w - 28, 42, 4); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
            for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(s.x + 14 + i * (s.w - 28) / 10, yT + 18); c.lineTo(s.x + 14 + i * (s.w - 28) / 10, yT + 60); c.stroke(); }
            door(c, s.x + s.w / 2, s.base, '#2f5d8a', 44, 40);
            c.fillStyle = '#6c8097'; c.fillRect(s.x + 40, yR + 20, 34, 22); c.fillRect(s.x + 90, yR + 30, 24, 16);
            // Tower
            const tx = s.x + s.w - 64;
            c.fillStyle = '#e8edf3'; c.fillRect(tx, yR - 120, 30, 150);
            c.fillStyle = '#c9d3df'; c.fillRect(tx + 20, yR - 120, 10, 150);
            c.fillStyle = '#2b4c6f'; rr(c, tx - 12, yR - 150, 54, 32, 6); c.fill();
            c.fillStyle = '#86d4ff'; rr(c, tx - 8, yR - 145, 46, 20, 4); c.fill();
            c.fillStyle = '#ff4d4d'; ellipse(c, tx + 15, yR - 158, 4, 4); c.fill();
            if (Math.sin(time * 4) > 0) { c.fillStyle = 'rgba(255,80,80,0.35)'; ellipse(c, tx + 15, yR - 158, 10, 10); c.fill(); }
            c.fillStyle = '#2f5d8a'; rr(c, s.x + 60, yT - 2, 140, 20, 6); c.fill();
            signText(c, 'ANKUNFT · 2014', s.x + 130, yT + 8, 11);
            // Windsack
            c.strokeStyle = '#777'; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x - 20, s.base); c.lineTo(s.x - 20, s.base - 60); c.stroke();
            c.fillStyle = '#ff7a2f'; const wv = Math.sin(time * 3) * 3;
            c.beginPath(); c.moveTo(s.x - 20, s.base - 60); c.lineTo(s.x + 6, s.base - 56 + wv); c.lineTo(s.x + 6, s.base - 48 + wv); c.lineTo(s.x - 20, s.base - 50); c.fill();
        },
        school(c, s) {
            const { yT, yR } = box(c, s, ['#f4ece0', '#e2d5c1'], ['#b5523b', '#94402c']);
            windows(c, s.x + 14, yT + 18, 120, 70, 3, 2, '#86c3e6');
            windows(c, s.x + s.w - 134, yT + 18, 120, 70, 3, 2, '#86c3e6');
            const cx = s.x + s.w / 2;
            c.fillStyle = '#ffffff';
            for (let i = -2; i <= 1; i++) c.fillRect(cx + i * 26 + 6, yT + 30, 10, s.height - 38);
            c.fillStyle = '#efe6d8'; c.beginPath(); c.moveTo(cx - 70, yT + 30); c.lineTo(cx + 70, yT + 30); c.lineTo(cx, yT - 4); c.closePath(); c.fill();
            c.strokeStyle = '#cbbba3'; c.lineWidth = 2; c.stroke();
            door(c, cx, s.base, '#6b3d2a', 36, 46);
            // Uhrturm
            c.fillStyle = '#efe6d8'; c.fillRect(cx - 32, yR - 70, 64, 90);
            c.fillStyle = '#b5523b'; c.beginPath(); c.moveTo(cx - 40, yR - 70); c.lineTo(cx + 40, yR - 70); c.lineTo(cx, yR - 112); c.closePath(); c.fill();
            c.fillStyle = '#fff'; ellipse(c, cx, yR - 36, 20, 20); c.fill();
            c.strokeStyle = '#333'; c.lineWidth = 2; ellipse(c, cx, yR - 36, 20, 20); c.stroke();
            const now = new Date(), hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * TAU - Math.PI / 2, mA = now.getMinutes() / 60 * TAU - Math.PI / 2;
            c.beginPath(); c.moveTo(cx, yR - 36); c.lineTo(cx + Math.cos(hA) * 10, yR - 36 + Math.sin(hA) * 10); c.stroke();
            c.beginPath(); c.moveTo(cx, yR - 36); c.lineTo(cx + Math.cos(mA) * 15, yR - 36 + Math.sin(mA) * 15); c.stroke();
            c.strokeStyle = '#666'; c.beginPath(); c.moveTo(cx, yR - 112); c.lineTo(cx, yR - 146); c.stroke();
            c.fillStyle = '#2a9d8f'; const fw = Math.sin(time * 4) * 3;
            c.beginPath(); c.moveTo(cx, yR - 146); c.quadraticCurveTo(cx + 14, yR - 146 + fw, cx + 28, yR - 142); c.lineTo(cx + 28, yR - 128); c.quadraticCurveTo(cx + 14, yR - 132 + fw, cx, yR - 130); c.fill();
        },
        career(c, s) {
            const towers = [[0, 110, 190], [118, 124, 250], [250, 110, 160]];
            c.fillStyle = 'rgba(25,50,20,0.22)'; rr(c, s.x + 12, s.base - 30, s.w + 10, 44, 12); c.fill();
            towers.forEach(([ox, tw, th], i) => {
                const x = s.x + ox, yT = s.base - th, yR = yT - s.depth;
                const g = c.createLinearGradient(x, 0, x + tw, 0);
                g.addColorStop(0, i === 1 ? '#4b7fc0' : '#5b8fcc'); g.addColorStop(1, i === 1 ? '#2f5d99' : '#3f6fae');
                c.fillStyle = g; c.fillRect(x, yT, tw, th);
                windows(c, x + 6, yT + 8, tw - 12, th - 30, 4, Math.floor(th / 26), 'rgba(170,215,255,0.85)', true);
                c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(x + tw * 0.2, yT); c.lineTo(x + tw * 0.45, yT); c.lineTo(x + tw * 0.1, yT + th * 0.6); c.lineTo(x, yT + th * 0.6); c.closePath(); c.fill();
                c.fillStyle = i === 1 ? '#1f3f6a' : '#2a4d7d'; rr(c, x - 4, yR, tw + 8, s.depth, 5); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x, yR + 4, tw, 4);
                c.fillStyle = '#16304f'; c.fillRect(x - 4, yT - 6, tw + 8, 8);
                if (i === 1) { c.strokeStyle = '#ccc'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + tw / 2, yR); c.lineTo(x + tw / 2, yR - 34); c.stroke(); c.fillStyle = Math.sin(time * 3) > 0 ? '#ff4d4d' : '#992222'; ellipse(c, x + tw / 2, yR - 36, 3.5, 3.5); c.fill(); }
            });
            c.fillStyle = '#e9eef5'; c.fillRect(s.x + 100, s.base - 50, 160, 50);
            c.fillStyle = '#1f3f6a'; c.fillRect(s.x + 96, s.base - 56, 168, 10);
            door(c, s.x + s.w / 2, s.base, '#2a4d7d', 50, 38);
            signText(c, 'BUSINESS', s.x + s.w / 2, s.base - 51, 8);
        },
        lab(c, s) {
            const { yT, yR } = box(c, s, ['#fbfdff', '#e4ecf3'], ['#2c3e50', '#1d2b38']);
            c.fillStyle = '#2ec4b6'; c.fillRect(s.x, yT + 6, s.w, 6);
            for (let i = 0; i < 6; i++) {
                const wx = s.x + 16 + i * 50; if (Math.abs(wx + 20 - (s.x + s.w / 2)) < 30) continue;
                c.fillStyle = '#1b2a3a'; rr(c, wx, yT + 26, 40, 46, 4); c.fill();
                for (let k = 0; k < 4; k++) {
                    const on = Math.sin(time * (2 + k) + i * 1.7 + k) > 0.2;
                    c.fillStyle = on ? (k % 2 ? '#4cf0a0' : '#4cd0ff') : '#2d4357';
                    c.fillRect(wx + 6 + k * 8, yT + 34 + (k % 2) * 12, 5, 3);
                }
                c.fillStyle = 'rgba(76,240,255,0.25)'; c.fillRect(wx + 4, yT + 56, 32, 10);
            }
            door(c, s.x + s.w / 2, s.base, '#2ec4b6', 38, 46);
            // Neon-Schild
            const glow = 0.6 + Math.sin(time * 3) * 0.2;
            c.save(); c.shadowColor = '#2ef0e0'; c.shadowBlur = 16 * glow;
            c.fillStyle = '#132232'; rr(c, s.x + s.w / 2 - 50, yT - 26, 100, 30, 8); c.fill();
            signText(c, '</> DEV', s.x + s.w / 2, yT - 11, 15, `rgba(90,255,235,${0.75 + glow * 0.25})`, 800);
            c.restore();
            // Satellitenschüssel
            const dx = s.x + 60, dy = yR + 30, a = Math.sin(time * 0.6) * 0.3;
            c.fillStyle = '#8796a8'; c.fillRect(dx - 3, dy - 10, 6, 18);
            c.save(); c.translate(dx, dy - 16); c.rotate(-0.5 + a);
            c.fillStyle = '#e6edf5'; c.beginPath(); c.ellipse(0, 0, 22, 10, 0, 0, Math.PI); c.fill();
            c.strokeStyle = '#8796a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -16); c.stroke();
            c.restore();
            c.fillStyle = '#56687c'; c.fillRect(s.x + s.w - 90, yR + 26, 50, 30); c.fillStyle = '#9fb2c6';
            for (let i = 0; i < 4; i++) c.fillRect(s.x + s.w - 86 + i * 12, yR + 30, 8, 22);
        },
        construction(c, s) {
            const yT = s.base - s.height, yR = yT - s.depth;
            c.fillStyle = 'rgba(25,50,20,0.22)'; rr(c, s.x + 12, s.base - 30, s.w + 10, 44, 12); c.fill();
            c.fillStyle = '#c9b48a'; rr(c, s.x - 10, yR + 20, s.w + 20, s.depth + s.height - 10, 10); c.fill();
            c.fillStyle = '#b9b2a6'; c.fillRect(s.x, yT + 20, s.w * 0.62, s.height - 20);
            c.fillStyle = '#a9a196'; c.fillRect(s.x, yT + 20, s.w * 0.62, 8);
            windows(c, s.x + 10, yT + 32, s.w * 0.62 - 20, 30, 4, 1, '#55606b');
            // Gerüst
            c.strokeStyle = '#c76b1f'; c.lineWidth = 3;
            for (let i = 0; i <= 5; i++) { const x = s.x + i * s.w * 0.62 / 5; c.beginPath(); c.moveTo(x, s.base); c.lineTo(x, yT - 30); c.stroke(); }
            for (let j = 0; j < 3; j++) { const y = yT - 30 + j * 40; c.beginPath(); c.moveTo(s.x, y); c.lineTo(s.x + s.w * 0.62, y); c.stroke(); }
            c.fillStyle = '#8a6a43'; c.fillRect(s.x - 4, yT - 34, s.w * 0.62 + 8, 6);
            // Materialstapel
            const cols = ['#ff8a3d', '#2ec4b6', '#ffca3a', '#6a4c93'];
            for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; rr(c, s.x + s.w * 0.68 + (i % 2) * 44, s.base - 22 - Math.floor(i / 2) * 20, 40, 18, 3); c.fill(); }
            // Hütchen
            [[s.x + 40, s.base + 16], [s.x + 120, s.base + 18], [s.x + 200, s.base + 14]].forEach(([x, y]) => {
                c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y); c.lineTo(x, y - 18); c.closePath(); c.fill();
                c.fillStyle = '#fff'; c.fillRect(x - 4, y - 10, 8, 3);
            });
            c.fillStyle = '#ffca3a'; rr(c, s.x + s.w / 2 - 70, s.base - 30, 72, 22, 4); c.fill();
            c.strokeStyle = '#222'; c.lineWidth = 2; rr(c, s.x + s.w / 2 - 70, s.base - 30, 72, 22, 4); c.stroke();
            signText(c, 'PROJEKTE', s.x + s.w / 2 - 34, s.base - 19, 10, '#222', 800);
        },
        boathouse(c, s) {
            const yT = s.base - s.height, yR = yT - s.depth;
            c.fillStyle = 'rgba(25,50,20,0.22)'; rr(c, s.x + 12, s.base - 30, s.w + 10, 44, 12); c.fill();
            c.fillStyle = '#b8814f'; c.fillRect(s.x, yT, s.w, s.height);
            c.strokeStyle = 'rgba(90,50,20,0.35)'; c.lineWidth = 2;
            for (let y = yT + 10; y < s.base; y += 12) { c.beginPath(); c.moveTo(s.x, y); c.lineTo(s.x + s.w, y); c.stroke(); }
            c.fillStyle = '#6b4a2f'; c.beginPath(); c.moveTo(s.x - 14, yT + 4); c.lineTo(s.x + s.w + 14, yT + 4); c.lineTo(s.x + s.w - 30, yR); c.lineTo(s.x + 30, yR); c.closePath(); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(s.x + 30, yR, s.w - 60, 6);
            door(c, s.x + s.w / 2, s.base, '#5a3b22', 50, 48);
            windows(c, s.x + 16, yT + 16, 60, 30, 2, 1, '#9ad6ee');
            // SUP-Boards
            ['#2ec4b6', '#ff8a3d', '#ffca3a'].forEach((col, i) => {
                c.save(); c.translate(s.x + s.w - 60 + i * 16, s.base - 34); c.rotate(0.12);
                c.fillStyle = col; ellipse(c, 0, 0, 6, 34); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-1, -28, 2, 56);
                c.restore();
            });
            c.strokeStyle = '#e63946'; c.lineWidth = 6; ellipse(c, s.x + 100, yT + 30, 12, 12); c.stroke();
            c.strokeStyle = '#fff'; c.lineWidth = 6; c.setLineDash([6, 7]); ellipse(c, s.x + 100, yT + 30, 12, 12); c.stroke(); c.setLineDash([]);
        },
        finale(c, s) {
            const { yT, yR } = box(c, s, ['#fffaf0', '#f1e6cf'], ['#f4f6f8', '#d7dde4']);
            const pulse = 0.5 + Math.sin(time * 2) * 0.5;
            const gl = c.createLinearGradient(s.x, yT, s.x + s.w, s.base);
            gl.addColorStop(0, '#a8dcf5'); gl.addColorStop(0.5, '#d9f1ff'); gl.addColorStop(1, '#7fc0e6');
            c.fillStyle = gl; rr(c, s.x + 20, yT + 20, s.w - 40, s.height - 34, 6); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
            for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(s.x + 20 + i * (s.w - 40) / 8, yT + 20); c.lineTo(s.x + 20 + i * (s.w - 40) / 8, s.base - 14); c.stroke(); }
            c.beginPath(); c.moveTo(s.x + 20, yT + 64); c.lineTo(s.x + s.w - 20, yT + 64); c.stroke();
            // Teppich
            c.fillStyle = '#d62839'; c.beginPath(); c.moveTo(s.x + s.w / 2 - 20, s.base); c.lineTo(s.x + s.w / 2 + 20, s.base); c.lineTo(s.x + s.w / 2 + 30, s.base + 46); c.lineTo(s.x + s.w / 2 - 30, s.base + 46); c.closePath(); c.fill();
            door(c, s.x + s.w / 2, s.base, '#d4a017', 44, 50);
            // Schild mit Firmenname
            const firm = (CV.game && CV.game.firm) || '';
            const label = firm ? firm : 'Ihr Unternehmen?';
            c.font = '800 18px Outfit, system-ui, sans-serif';
            const tw = Math.max(150, c.measureText(label).width + 40);
            c.save(); c.shadowColor = 'rgba(255,200,60,' + (0.4 + pulse * 0.5) + ')'; c.shadowBlur = 20;
            c.fillStyle = '#1b2a4a'; rr(c, s.x + s.w / 2 - tw / 2, yR - 6, tw, 36, 10); c.fill();
            c.restore();
            signText(c, label, s.x + s.w / 2, yR + 12, 18, '#ffd36b', 800);
            // Flaggen
            [s.x + 10, s.x + s.w - 10].forEach((fx, i) => {
                c.strokeStyle = '#777'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, s.base + 30); c.lineTo(fx, yR - 40); c.stroke();
                const w = Math.sin(time * 4 + i) * 3;
                c.fillStyle = i ? '#2ec4b6' : '#ff8a3d';
                c.beginPath(); c.moveTo(fx, yR - 40); c.quadraticCurveTo(fx + 15, yR - 40 + w, fx + 30, yR - 36); c.lineTo(fx + 30, yR - 22); c.quadraticCurveTo(fx + 15, yR - 26 + w, fx, yR - 24); c.fill();
            });
        }
    };

    const PROP_BOX = { lamp: [-9, -68, 13, 6], bench: [-32, -22, 32, 8], sign: [-48, -84, 48, 6], dock: [-24, -72, 24, 42] };
    function drawProp(c, p) {
        const box = PROP_BOX[p.type];
        if (box) {
            const sp = sprite('prop:' + p.type, box[0], box[1], box[2], box[3], (cc) => paintProp(cc, { type: p.type, x: 0, y: 0 }));
            blit(c, sp, p.x, p.y);
            return;
        }
        paintProp(c, p);
    }
    function paintProp(c, p) {
        if (p.type === 'lamp') {
            c.fillStyle = 'rgba(25,50,20,0.2)'; ellipse(c, p.x + 4, p.y + 2, 8, 3); c.fill();
            c.fillStyle = '#3d4a5c'; c.fillRect(p.x - 2, p.y - 56, 4, 56);
            c.fillStyle = '#2b3646'; rr(c, p.x - 7, p.y - 66, 14, 12, 4); c.fill();
            c.fillStyle = '#ffe9a8'; rr(c, p.x - 4, p.y - 63, 8, 7, 2); c.fill();
        } else if (p.type === 'bench') {
            c.fillStyle = 'rgba(25,50,20,0.2)'; ellipse(c, p.x, p.y + 2, 30, 5); c.fill();
            c.fillStyle = '#8a5a35'; rr(c, p.x - 28, p.y - 20, 56, 8, 2); c.fill(); rr(c, p.x - 28, p.y - 10, 56, 6, 2); c.fill();
            c.fillStyle = '#4a4a4a'; c.fillRect(p.x - 24, p.y - 6, 4, 8); c.fillRect(p.x + 20, p.y - 6, 4, 8);
        } else if (p.type === 'sign') {
            c.fillStyle = '#7a5235'; c.fillRect(p.x - 3, p.y - 70, 6, 72);
            const arrows = [['→ Stationen', -6, '#2ec4b6'], ['Start ←', 14, '#ff8a3d']];
            arrows.forEach(([t, dy, col], i) => {
                c.save(); c.translate(p.x, p.y - 60 + dy * 1.4); c.rotate(i ? 0.06 : -0.05);
                c.fillStyle = col; rr(c, -40, -9, 80, 18, 4); c.fill();
                signText(c, t, 0, 0, 10, '#fff', 800);
                c.restore();
            });
        } else if (p.type === 'fountain') {
            const x = FOUNTAIN.x, y = FOUNTAIN.y;
            c.fillStyle = '#b8b1a3'; ellipse(c, x, y + 4, FOUNTAIN.r + 6, (FOUNTAIN.r + 6) * 0.62); c.fill();
            c.fillStyle = '#d9d3c5'; ellipse(c, x, y, FOUNTAIN.r + 4, (FOUNTAIN.r + 4) * 0.6); c.fill();
            c.fillStyle = '#5ec3e6'; ellipse(c, x, y, FOUNTAIN.r - 6, (FOUNTAIN.r - 6) * 0.58); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
            for (let i = 0; i < 2; i++) { const r = ((time * 18 + i * 22) % 44) + 4; c.globalAlpha = 1 - r / 48; ellipse(c, x, y, r, r * 0.58); c.stroke(); }
            c.globalAlpha = 1;
            c.fillStyle = '#d9d3c5'; c.fillRect(x - 6, y - 36, 12, 36);
            c.fillStyle = '#c9c2b2'; ellipse(c, x, y - 36, 14, 6); c.fill();
        } else if (p.type === 'plane') {
            if (plane.t >= 0) return;
            drawPlane(c, p.x, p.y, 1, 0);
        } else if (p.type === 'dock') {
            c.fillStyle = '#9b6b40'; c.fillRect(p.x - 18, p.y - 70, 36, 110);
            c.strokeStyle = 'rgba(70,40,15,0.5)'; c.lineWidth = 2;
            for (let y = p.y - 66; y < p.y + 40; y += 10) { c.beginPath(); c.moveTo(p.x - 18, y); c.lineTo(p.x + 18, y); c.stroke(); }
            c.fillStyle = '#6b4a2f'; c.fillRect(p.x - 22, p.y - 70, 6, 14); c.fillRect(p.x + 16, p.y - 70, 6, 14);
        }
    }
    function drawPlane(c, x, y, sc, lift) {
        c.fillStyle = 'rgba(20,30,20,' + (0.25 - lift * 0.15) + ')';
        ellipse(c, x + lift * 60, y + 6 + lift * 40, 60 * sc, 10 * sc); c.fill();
        c.save(); c.translate(x, y - lift * 60); c.scale(sc, sc);
        c.fillStyle = '#ffffff'; rr(c, -60, -12, 120, 22, 11); c.fill();
        c.fillStyle = '#2f5d8a'; c.fillRect(-50, -2, 100, 4);
        c.fillStyle = '#dfe7ef'; c.beginPath(); c.moveTo(-10, 0); c.lineTo(20, 0); c.lineTo(-6, 34); c.lineTo(-24, 34); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(-10, -4); c.lineTo(20, -4); c.lineTo(-6, -30); c.lineTo(-24, -30); c.closePath(); c.fill();
        c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(-60, -10); c.lineTo(-44, -10); c.lineTo(-56, -34); c.lineTo(-66, -34); c.closePath(); c.fill();
        c.fillStyle = '#7fc8f0'; for (let i = 0; i < 7; i++) { ellipse(c, -30 + i * 10, -5, 2.6, 2.6); c.fill(); }
        c.fillStyle = '#1b2a4a'; ellipse(c, 52, -4, 6, 5); c.fill();
        c.restore();
    }

    // ------------------------------------------------------------------ Sprite-Cache
    // Unbewegliche Dinge werden einmal in ein kleines Bild gezeichnet und danach nur noch kopiert.
    // Die Bilder haben genau die Bildschirm-Auflösung (RS); ändert sich die, wird der Cache geleert.
    const sprites = new Map();
    let spriteRS = 0;
    function sprite(key, x0, y0, x1, y1, paint) {
        if (spriteRS !== RS) { sprites.clear(); for (const s of World.stations) s.sprite = null; spriteRS = RS; }
        let sp = sprites.get(key);
        if (!sp) {
            sp = { cv: document.createElement('canvas'), x0, y0, w: x1 - x0, h: y1 - y0 };
            sp.cv.width = Math.max(1, Math.ceil(sp.w * RS)); sp.cv.height = Math.max(1, Math.ceil(sp.h * RS));
            const c = sp.cv.getContext('2d');
            c.setTransform(RS, 0, 0, RS, -x0 * RS, -y0 * RS);
            paint(c);
            sprites.set(key, sp);
        }
        return sp;
    }
    // Sprite an (x, y) kopieren – auf ganze Bildschirmpixel gerundet, damit der Browser nicht filtern muss
    function blit(c, sp, x, y) {
        c.drawImage(sp.cv, Math.round((x + sp.x0) * RS) / RS, Math.round((y + sp.y0) * RS) / RS, sp.cv.width / RS, sp.cv.height / RS);
    }
    // Gebäude: eigenes Bild je Station, das nur selten neu gezeichnet wird (BUILDING_REFRESH)
    // Rand um jedes Gebäude (Welteinheiten): links/rechts neben s.x…s.x+w, oben über dem Dach (yR), unten unter s.base.
    // Möglichst knapp, weil auch durchsichtige Pixel beim Kopieren Rechenzeit kosten.
    const BUILDING_PAD = {
        airport: { left: 28, right: 12, top: 186, bottom: 18 },      // Tower mit Blinklicht, Windsack links
        school: { left: 12, right: 26, top: 158, bottom: 18 },       // Uhrturm mit Fahne
        career: { left: 6, right: 26, top: 118, bottom: 18 },        // mittlerer Turm + Antenne
        lab: { left: 12, right: 26, top: 34, bottom: 18 },           // Satellitenschüssel, Neon-Leuchten
        construction: { left: 14, right: 26, top: 14, bottom: 24 },  // Kran wird separat gezeichnet
        boathouse: { left: 18, right: 26, top: 14, bottom: 18 },
        finale: { left: 70, right: 70, top: 48, bottom: 52 }         // langer Firmenname, Fahnen, Teppich
    };
    function buildingSprite(s) {
        if (spriteRS !== RS) sprite('_', 0, 0, 1, 1, () => {});   // Cache auf aktuelle Auflösung bringen
        const key = s.style === 'finale' ? ((CV.game && CV.game.firm) || '') : '';
        const every = BUILDING_REFRESH[s.style] || 0;
        let e = s.sprite;
        if (!e) {
            const pad = BUILDING_PAD[s.style];
            const x0 = s.x - pad.left, y0 = s.base - s.height - s.depth - pad.top;
            const w = s.w + pad.left + pad.right, h = s.height + s.depth + pad.top + pad.bottom;
            const cv = document.createElement('canvas');
            cv.width = Math.ceil(w * RS); cv.height = Math.ceil(h * RS);
            e = s.sprite = { cv, x0, y0, w, h, t: -1e9, key: null };
        }
        if (e.key !== key || e.t < -1e8 || (every && time - e.t >= every)) {
            const c = e.cv.getContext('2d');
            c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, e.cv.width, e.cv.height);
            c.setTransform(RS, 0, 0, RS, -e.x0 * RS, -e.y0 * RS);
            DRAW[s.style](c, s);
            e.t = time; e.key = key;
        }
        return e;
    }
    function drawBuilding(c, s, alpha) {
        const e = buildingSprite(s);
        if (alpha < 1) c.globalAlpha = alpha;
        blit(c, { cv: e.cv, x0: e.x0, y0: e.y0 }, 0, 0);
        if (s.style === 'construction') drawCrane(c, s);
        if (alpha < 1) c.globalAlpha = 1;
    }
    // Beschriftung (Pille mit Text, optional mit Leuchten) als Sprite
    function labelSprite(text, fs, bg, fg, glow, weight = 700) {
        const key = `label:${text}|${fs}|${bg}|${fg}|${glow}|${weight}`;
        if (spriteRS === RS && sprites.has(key)) return sprites.get(key);
        ctx.font = `${weight} ${fs}px Outfit, system-ui, sans-serif`;
        const tw = ctx.measureText(text).width + fs * 1.4, th = fs * 2, pad = glow ? 22 : 2;
        return sprite(key, -tw / 2 - pad, -th / 2 - pad, tw / 2 + pad, th / 2 + pad, (c) => {
            if (glow) { c.shadowColor = 'rgba(255,160,40,0.9)'; c.shadowBlur = 18 * RS; }
            c.fillStyle = bg; rr(c, -tw / 2, -th / 2, tw, th, th / 2); c.fill();
            c.shadowBlur = 0;
            signText(c, text, 0, 1, fs, fg, weight);
        });
    }
    function textSprite(text, fs, col, weight) {
        const key = `text:${text}|${fs}|${col}|${weight}`;
        if (spriteRS === RS && sprites.has(key)) return sprites.get(key);
        ctx.font = `${weight} ${fs}px Outfit, system-ui, sans-serif`;
        const w = ctx.measureText(text).width + 4;
        return sprite(key, -w / 2, -fs, w / 2, fs, (c) => signText(c, text, 0, 0, fs, col, weight));
    }
    const STAR_BOX = 18;
    function starSprite() {
        return sprite('star', -STAR_BOX, -STAR_BOX, STAR_BOX, STAR_BOX, (c) => {
            c.fillStyle = 'rgba(255,220,80,0.3)'; ellipse(c, 0, 0, 16, 16); c.fill();
            c.fillStyle = '#ffcd3c'; c.strokeStyle = '#e09b00'; c.lineWidth = 1.5;
            c.beginPath();
            for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.6 : 11, a = i / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
            c.closePath(); c.fill(); c.stroke();
        });
    }
    const CLOUD_R = 100;
    function cloudSprite() {
        return sprite('cloud', -CLOUD_R, -CLOUD_R, CLOUD_R, CLOUD_R, (c) => {
            const cg = c.createRadialGradient(0, 0, 0, 0, 0, CLOUD_R);
            cg.addColorStop(0, 'rgba(20,40,60,0.07)'); cg.addColorStop(0.6, 'rgba(20,40,60,0.04)'); cg.addColorStop(1, 'rgba(20,40,60,0)');
            c.fillStyle = cg; ellipse(c, 0, 0, CLOUD_R, CLOUD_R); c.fill();
        });
    }

    // Boden in Kacheln: jede Kachel wird einmal aus der Bodenebene in Bildschirm-Auflösung erzeugt
    // und danach nur 1:1 kopiert – das Skalieren des ganzen Bildschirms in jedem Bild entfällt.
    const groundTiles = new Map();
    let tilesRS = 0;
    function groundTile(tx, ty) {
        if (tilesRS !== RS) { groundTiles.clear(); tilesRS = RS; }
        const key = tx + ',' + ty;
        let t = groundTiles.get(key);
        if (t) { groundTiles.delete(key); groundTiles.set(key, t); return t; }   // als zuletzt benutzt markieren
        const T = PERF.GROUND_TILE, x0 = tx * T, y0 = ty * T, w = Math.min(T, W - x0), h = Math.min(T, H - y0);
        const px0 = Math.round(x0 * RS), py0 = Math.round(y0 * RS), px1 = Math.round((x0 + w) * RS), py1 = Math.round((y0 + h) * RS);
        const cv = document.createElement('canvas');
        cv.width = px1 - px0; cv.height = py1 - py0;
        const g = cv.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(ground, x0 * groundRes, y0 * groundRes, w * groundRes, h * groundRes, 0, 0, cv.width, cv.height);
        t = { cv, px0, py0 };
        groundTiles.set(key, t);
        if (groundTiles.size > PERF.GROUND_TILE_MAX) groundTiles.delete(groundTiles.keys().next().value);
        return t;
    }
    function drawGround(c) {
        const T = PERF.GROUND_TILE;
        const tx0 = Math.max(0, Math.floor(cam.x / T)), ty0 = Math.max(0, Math.floor(cam.y / T));
        const tx1 = Math.min(Math.ceil(W / T) - 1, Math.floor((cam.x + viewW()) / T)), ty1 = Math.min(Math.ceil(H / T) - 1, Math.floor((cam.y + viewH()) / T));
        // in Gerätepixeln zeichnen: exakt ausgerichtet, ohne Filter
        c.save();
        c.setTransform(1, 0, 0, 1, -Math.round(cam.x * RS), -Math.round(cam.y * RS));
        for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
            const t = groundTile(tx, ty);
            c.drawImage(t.cv, t.px0, t.py0);
        }
        c.restore();
    }

    // ------------------------------------------------------------------ Render
    function render() {
        const c = ctx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = '#4f8a45'; c.fillRect(0, 0, canvas.width, canvas.height);
        c.setTransform(RS, 0, 0, RS, -Math.round(cam.x * RS), -Math.round(cam.y * RS));
        const vx0 = cam.x - 80, vy0 = cam.y - 80, vx1 = cam.x + viewW() + 80, vy1 = cam.y + viewH() + 260;

        drawGround(c);

        // See: Wellen (Ufer und Wasserfläche liegen in der Bodenebene)
        c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
            const a = i * 0.7 + 1, rx = LAKE.rx * (0.25 + (i % 4) * 0.17), ry = LAKE.ry * (0.25 + (i % 3) * 0.2);
            const wx = LAKE.x + Math.cos(a) * rx, wy = LAKE.y + Math.sin(a) * ry + Math.sin(time + i) * 3;
            c.beginPath(); c.moveTo(wx - 12, wy); c.quadraticCurveTo(wx - 6, wy - 4, wx, wy); c.quadraticCurveTo(wx + 6, wy + 4, wx + 12, wy); c.stroke();
        }
        for (const d of ducks) {
            const x = LAKE.x + Math.cos(d.a) * LAKE.rx * d.r, y = LAKE.y + Math.sin(d.a) * LAKE.ry * d.r;
            const dir = -Math.sin(d.a) > 0 ? 1 : -1;
            c.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(c, x, y + 4, 14, 4); c.fill();
            c.fillStyle = '#ffd23f'; ellipse(c, x, y, 10, 6); c.fill();
            ellipse(c, x + dir * 8, y - 6, 5, 5); c.fill();
            c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(x + dir * 12, y - 6); c.lineTo(x + dir * 17, y - 5); c.lineTo(x + dir * 12, y - 3); c.fill();
            c.fillStyle = '#222'; ellipse(c, x + dir * 9, y - 7, 1, 1); c.fill();
        }
        // SUP-Paddler auf dem See
        {
            const a = time * 0.12, x = LAKE.x + Math.cos(a) * LAKE.rx * 0.45, y = LAKE.y + Math.sin(a) * LAKE.ry * 0.45;
            c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
            c.fillStyle = '#ff8a3d'; ellipse(c, 0, 0, 30, 7); c.fill();
            c.restore();
            c.fillStyle = '#2ec4b6'; ellipse(c, x, y - 10, 5, 8); c.fill();
            c.fillStyle = '#e0ac69'; ellipse(c, x, y - 20, 4.5, 4.5); c.fill();
        }

        // Ziel-Markierung (nächste Station)
        const nextId = CV.game && CV.game.nextId && CV.game.nextId();
        const next = World.stations.find(s => s.id === nextId);
        if (next && !World.attract) {
            const p = (time * 1.2) % 1;
            c.strokeStyle = `rgba(255,170,60,${1 - p})`; c.lineWidth = 4;
            ellipse(c, next.door.x, next.door.y - 4, 22 + p * 34, (22 + p * 34) * 0.45); c.stroke();
        }

        // Sterne
        for (const t of tokens) {
            if (t.got || t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
            const b = Math.sin(time * 3 + t.phase) * 4;
            c.fillStyle = 'rgba(25,50,20,0.18)'; ellipse(c, t.x, t.y + 2, 9, 3); c.fill();
            blit(c, starSprite(), t.x, t.y - 16 + b);
            blit(c, textSprite(t.label, Math.round(10 / Math.max(zoom, 0.8) * 10) / 10, 'rgba(40,60,30,0.75)', 700), t.x, t.y + 12);
        }

        // Tiefensortierte Objekte
        const list = [];
        for (const s of World.stations) {
            const top = s.base - s.height - s.depth - (s.style === 'career' ? 110 : s.style === 'school' ? 140 : 60);
            const hides = player.y < s.base + 4 && player.y > top && player.x > s.x - 24 && player.x < s.x + s.w + 24;
            if (hides) s.fade = Math.min(1, (s.fade || 0) + 0.12); else s.fade = Math.max(0, (s.fade || 0) - 0.08);
            const a = 1 - (s.fade || 0) * 0.62;
            list.push({ y: s.base, d: () => drawBuilding(c, s, a), x0: s.x - BUILDING_PAD[s.style].left - 200, x1: s.x + s.w + BUILDING_PAD[s.style].right });
        }
        for (const t of trees) if (t.x > vx0 && t.x < vx1 && t.y > vy0 && t.y < vy1) list.push({ y: t.y, d: () => drawTree(c, t) });
        for (const p of props) if (p.x > vx0 - 100 && p.x < vx1 + 100 && p.y > vy0 && p.y < vy1) list.push({ y: p.y, d: () => drawProp(c, p) });
        for (const n of npcs) if (n.x > vx0 && n.x < vx1) list.push({ y: n.y, d: () => drawPerson(c, n.x, n.y, n) });
        list.push({ y: player.y, d: () => {
            const pr = (time * 0.9) % 1;
            c.strokeStyle = `rgba(255,138,61,${0.55 * (1 - pr)})`; c.lineWidth = 2.5;
            ellipse(c, player.x, player.y, 16 + pr * 16, (16 + pr * 16) * 0.42); c.stroke();
            drawPerson(c, player.x, player.y, player);
        } });
        list.push({ y: robot.y, d: () => drawRobot(c, robot.x, robot.y) });
        list.sort((a, b) => a.y - b.y);
        for (const it of list) { if (it.x0 !== undefined && (it.x1 < vx0 || it.x0 > vx1)) continue; it.d(); }

        // Startendes Flugzeug
        if (plane.t >= 0) {
            const t = plane.t, x = RUNWAY.x + 80 + Math.min(t, 4) ** 2 * 32 + Math.max(0, t - 4) * 260;
            const lift = Math.max(0, (t - 3.2) / 2.5);
            drawPlane(c, x, RUNWAY.y + RUNWAY.h / 2, 1 + lift * 0.4, Math.min(lift, 3));
        }

        // Partikel
        for (const p of particles) {
            const k = p.life / p.max;
            if (p.type === 'dust') { c.fillStyle = `rgba(200,180,140,${0.5 * (1 - k)})`; ellipse(c, p.x, p.y, 3 + k * 6, 2 + k * 3); c.fill(); }
            else if (p.type === 'spark') { c.fillStyle = `rgba(255,210,60,${1 - k})`; ellipse(c, p.x, p.y, 3 * (1 - k) + 1, 3 * (1 - k) + 1); c.fill(); }
            else if (p.type === 'ring') { c.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; c.lineWidth = 3; ellipse(c, p.x, p.y, 8 + k * 26, (8 + k * 26) * 0.45); c.stroke(); }
            else if (p.type === 'drop') { c.fillStyle = 'rgba(180,230,255,0.85)'; ellipse(c, p.x, p.y, 2, 2.6); c.fill(); }
            else if (p.type === 'text') { c.globalAlpha = 1 - k; signText(c, p.text, p.x, p.y - k * 40, 15 / Math.max(zoom, 0.8), '#e08a00', 800); c.globalAlpha = 1; }
            else if (p.type === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, (1 - k) * 2); c.fillStyle = p.col; c.fillRect(-4, -2.5, 8, 5); c.restore(); }
        }

        // Wolkenschatten & Vögel
        for (const cl of clouds) {
            if (cl.x + cl.rx < vx0 || cl.x - cl.rx > vx1) continue;
            const cs = cloudSprite();
            c.drawImage(cs.cv, cl.x - cl.rx, cl.y - cl.ry, cl.rx * 2, cl.ry * 2);
        }
        c.strokeStyle = '#2b2b33'; c.lineWidth = 2;
        for (const b of birds) for (let i = 0; i < b.n; i++) {
            const x = b.x - i * 18, y = b.y + (i % 2) * 10 + i * 4, f = Math.sin(time * 10 + i) * 4;
            c.beginPath(); c.moveTo(x - 7, y - f); c.quadraticCurveTo(x - 3, y - 3, x, y); c.quadraticCurveTo(x + 3, y - 3, x + 7, y - f); c.stroke();
        }

        // Beschriftungen
        const fs = 13 / Math.max(zoom, 0.75);
        for (const s of World.stations) {
            const visited = CV.game && CV.game.visited && CV.game.visited.has(s.id);
            const isNext = next && next.id === s.id;
            const topY = s.base - s.height - s.depth - (s.style === 'career' ? 100 : s.style === 'airport' ? 30 : s.style === 'school' ? 136 : s.style === 'construction' ? 60 : 34) - (isNext ? Math.abs(Math.sin(time * 3)) * 8 : 0);
            const locked = World.isLocked && World.isLocked(s.id);
            const label = locked ? `🔒 ${s.title}` : `${s.emoji} ${s.title}${visited ? '  ✓' : ''}`;
            const bg = locked ? 'rgba(90,98,120,0.92)' : visited ? 'rgba(34,139,94,0.94)' : isNext ? 'rgba(255,138,61,0.96)' : 'rgba(27,42,74,0.9)';
            const ls = labelSprite(label, Math.round(fs * 10) / 10, bg, '#fff', isNext || hoverStation === s);
            blit(c, ls, s.x + s.w / 2, topY);
        }

        // Interaktionshinweis
        if (nearStation && !World.paused) {
            const s = nearStation, y = s.door.y - 90 + Math.sin(time * 5) * 4;
            const lockedNow = World.isLocked && World.isLocked(s.id);
            const txt = lockedNow ? '🔒 Noch gesperrt' : CV.isTouch ? '„Betreten“ antippen' : 'E / Enter · Betreten';
            c.font = `800 ${fs}px Outfit, system-ui, sans-serif`;
            const tw = c.measureText(txt).width + fs * 1.6;
            c.fillStyle = '#ffffff'; rr(c, s.door.x - tw / 2, y - fs, tw, fs * 2, 8); c.fill();
            signText(c, txt, s.door.x, y + 1, fs, '#1b2a4a', 800);
        }

        // Pfeil am Bildschirmrand zur nächsten Station
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (next && !World.attract && !World.paused) {
            const sp = World.worldToScreen(next.door.x, next.door.y - 40);
            const m = 56;
            if (sp.x < m || sp.y < m + 40 || sp.x > vw - m || sp.y > vh - m) {
                const cx = vw / 2, cy = vh / 2, dx = sp.x - cx, dy = sp.y - cy;
                const k = Math.min((vw / 2 - m) / Math.abs(dx || 1), (vh / 2 - m) / Math.abs(dy || 1));
                const ax = cx + dx * k, ay = cy + dy * k, ang = Math.atan2(dy, dx);
                c.save(); c.translate(ax, ay);
                c.fillStyle = 'rgba(255,138,61,0.95)'; ellipse(c, 0, 0, 24, 24); c.fill();
                c.strokeStyle = '#fff'; c.lineWidth = 3; ellipse(c, 0, 0, 24, 24); c.stroke();
                c.font = '20px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(next.emoji, 0, 1);
                c.rotate(ang); c.fillStyle = '#ff8a3d';
                c.beginPath(); c.moveTo(34 + Math.sin(time * 6) * 3, 0); c.lineTo(24, -9); c.lineTo(24, 9); c.closePath(); c.fill();
                c.restore();
            }
        }
    }

    // Eine Bildrate je Lage: verdeckt → gar nicht zeichnen, Vorschau → 30, Leerlauf → 20, Bewegung → 60 Bilder/s.
    function busy(ts) {
        return player.moving || !!player.path || !!joy || liveParticles > 0 || camMoving || ts < wakeUntil;
    }
    function frame(ts) {
        requestAnimationFrame(frame);
        if (covered) {                       // Dialog offen: ein letztes Bild, dann Pause
            if (!frozen) { draw(ts, 0); blurFrozenFrame(); frozen = true; }
            last = ts; prevTs = 0;
            return;
        }
        const moving = busy(ts);
        const fps = World.attract ? PERF.ATTRACT_FPS : moving ? 0 : PERF.IDLE_FPS;
        if (fps && ts - lastDraw < 1000 / fps - 2) return;
        if (moving && !World.attract) adapt(ts); else prevTs = 0;
        const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
        last = ts;
        draw(ts, dt);
    }
    // Das letzte Bild einmal weichzeichnen (statt einer CSS-Unschärfe, die der Browser ständig neu rechnet)
    function blurFrozenFrame() {
        if (!('filter' in ctx)) return;            // ältere Browser: ohne Unschärfe
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = `blur(${PERF.COVER_BLUR_PX * dpr}px) saturate(1.1)`;
        ctx.drawImage(canvas, 0, 0);
        ctx.restore();
    }
    function draw(ts, dt) {
        lastDraw = ts;
        World.frames++;
        update(dt);
        render();
        if (World.onFrame) World.onFrame(ts);
    }
    // Läuft die Welt trotz Bewegung dauerhaft unter ~38 Bildern/s, wird die Auflösung schrittweise gesenkt.
    function adapt(ts) {
        if (prevTs) {
            gapEma = gapEma ? gapEma * 0.95 + (ts - prevTs) * 0.05 : ts - prevTs;
            if (++busyFrames > PERF.ADAPT_FRAMES && gapEma > PERF.SLOW_GAP_MS && dprCap > PERF.MIN_DPR) {
                dprCap = Math.max(PERF.MIN_DPR, dprCap - PERF.DPR_STEP);
                busyFrames = 0; gapEma = 0;
                resize();
            }
        }
        prevTs = ts;
    }
    World.frames = 0;
    // Von der Oberfläche gemeldet: Ist die Welt von einem Dialog verdeckt?
    World.setCovered = function (v) { covered = !!v; if (!covered) { frozen = false; World.wake(); } };
    World.wake = function (ms = PERF.WAKE_MS) { wakeUntil = performance.now() + ms; };

    World.init = function (cnv) {
        canvas = cnv;
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        buildWorld();
        ground = buildGround();
        World.ground = ground;
        buildGrid();
        setupInput();
        cam.x = clampCam(W / 2 - viewW() / 2, 0).x; cam.y = clampCam(0, H / 2 - viewH() / 2).y;
        requestAnimationFrame((ts) => { last = ts; frame(ts); });
    };
    World.begin = function () {
        World.attract = false;
        World.paused = false;
    };
    World.view = () => ({ x: cam.x, y: cam.y, w: viewW(), h: viewH() });
    World.walkToPoint = function (x, y) {
        if (World.paused) return;
        const s = stationAt(x, y);
        if (s) { World.walkToStation(s.id); return; }
        markFirstMove();
        const path = findPath(player.x, player.y, x, y);
        if (path) { player.path = path; player.pendingStation = null; spawnRing(x, y); }
    };
    World.tokenList = () => tokens.map(t => ({ x: t.x, y: t.y, got: t.got }));
    World.tokenCount = () => tokens.length;
    World.tokensGot = () => tokens.filter(t => t.got).map(t => t.label);
    World.debug = { findPath, blocked, cam, drawPerson, get zoom() { return zoom; }, get dpr() { return dpr; }, get spriteCount() { return sprites.size; }, buildingCanvas: (id) => buildingSprite(World.stations.find(s => s.id === id)).cv, perf: PERF, setDprCap: (v) => { dprCap = v; resize(); } };
})();

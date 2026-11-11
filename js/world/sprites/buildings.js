// Gebäude der Stationen. Jedes Gebäude besteht aus
//   paint(c, s, info) – unbewegliche Teile, wird einmal in ein Bild gezeichnet (Sprite-Cache),
//   anim(c, s, time)  – kleine bewegte Details (Blinklichter, Fahnen, Uhr, Kran), in jedem Bild gezeichnet,
//   pad               – Rand um das Gebäude (links/rechts neben s.x…s.x+w, oben über dem Dach, unten unter s.base).
// s = Station aus config/layout.js; yT = Oberkante der Fassade, yR = hintere Dachkante.
import { TAU } from '../../core/math.js';
import { rr, ellipse, signText, FONT } from '../draw.js';

const SHADOW = 'rgba(25,50,20,0.22)';
const top = (s) => { const yT = s.base - s.height; return { yT, yR: yT - s.depth }; };

/** Fensterraster */
function windows(c, x, y, w, h, cols, rows, col) {
    const gx = w / cols, gy = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const wx = x + i * gx + gx * 0.18, wy = y + j * gy + gy * 0.18, ww = gx * 0.64, wh = gy * 0.64;
        c.fillStyle = col; rr(c, wx, wy, ww, wh, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(wx + 2, wy + 2, ww * 0.3, wh - 4);
    }
}
/** Beleuchtete Fenster (wechselndes Muster) – nur die Lichter, als Überlagerung */
function windowLights(c, x, y, w, h, cols, rows, time, col = 'rgba(255,230,140,0.55)') {
    const gx = w / cols, gy = h / rows, phase = Math.floor(time * 0.5);
    c.fillStyle = col;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 3 + phase) % 9 !== 0) continue;
        rr(c, x + i * gx + gx * 0.18, y + j * gy + gy * 0.18, gx * 0.64, gy * 0.64, 2); c.fill();
    }
}
function door(c, cx, base, col, w = 34, h = 44) {
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(cx - w / 2 - 6, base - 4, w + 12, 6);
    c.fillStyle = col; rr(c, cx - w / 2, base - h, w, h, [10, 10, 2, 2]); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, cx - w / 2 + 4, base - h + 5, w / 2 - 6, h - 10, 6); c.fill();
    c.fillStyle = '#ffd36b'; ellipse(c, cx + w / 2 - 7, base - h / 2, 2.4, 2.4); c.fill();
}
/** Quader: Fassade mit Verlauf, Dach von oben */
function box(c, s, wall, roof, { noRoof = false } = {}) {
    const { yT, yR } = top(s);
    c.fillStyle = SHADOW; rr(c, s.x + 12, s.base - s.depth * 0.3, s.w + 10, s.depth * 0.3 + 14, 12); c.fill();
    const g = c.createLinearGradient(0, yT, 0, s.base);
    g.addColorStop(0, wall[0]); g.addColorStop(1, wall[1]);
    c.fillStyle = g; c.fillRect(s.x, yT, s.w, s.height);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(s.x, s.base - 8, s.w, 8);
    if (!noRoof) {
        c.fillStyle = roof[0]; rr(c, s.x - 8, yR, s.w + 16, s.depth + 4, 6); c.fill();
        c.fillStyle = roof[1]; c.fillRect(s.x - 8, yT - 6, s.w + 16, 12);
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(s.x - 4, yR + 4, s.w + 8, 5);
        c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(s.x, yT + 6, s.w, 6);
    }
    return { yT, yR };
}
const blink = (time, speed) => Math.sin(time * speed) > 0;

// ------------------------------------------------------------------ Flughafen (Ankunft & Reisen)
const AIRPORT = { wall: ['#f3f6fa', '#d7dee8'], roof: ['#8ea2b8', '#6c8097'], glass: ['#7fc8f0', '#3f8fc7'], door: '#2f5d8a', tower: '#e8edf3', towerShade: '#c9d3df', cab: '#2b4c6f', cabGlass: '#86d4ff', light: '#ff4d4d', lightGlow: 'rgba(255,80,80,0.35)', sign: '#2f5d8a', pole: '#777', sock: '#ff7a2f' };
const TOWER_FROM_RIGHT = 64;
const airport = {
    pad: { left: 28, right: 12, top: 186, bottom: 18 },
    paint(c, s, info) {
        const P = AIRPORT, { yT, yR } = box(c, s, P.wall, P.roof);
        const gl = c.createLinearGradient(0, yT + 18, 0, yT + 62);
        gl.addColorStop(0, P.glass[0]); gl.addColorStop(1, P.glass[1]);
        c.fillStyle = gl; rr(c, s.x + 14, yT + 18, s.w - 28, 42, 4); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
        for (let i = 1; i < 10; i++) { const x = s.x + 14 + i * (s.w - 28) / 10; c.beginPath(); c.moveTo(x, yT + 18); c.lineTo(x, yT + 60); c.stroke(); }
        door(c, s.x + s.w / 2, s.base, P.door, 44, 40);
        c.fillStyle = P.roof[1]; c.fillRect(s.x + 40, yR + 20, 34, 22); c.fillRect(s.x + 90, yR + 30, 24, 16);
        const tx = s.x + s.w - TOWER_FROM_RIGHT;
        c.fillStyle = P.tower; c.fillRect(tx, yR - 120, 30, 150);
        c.fillStyle = P.towerShade; c.fillRect(tx + 20, yR - 120, 10, 150);
        c.fillStyle = P.cab; rr(c, tx - 12, yR - 150, 54, 32, 6); c.fill();
        c.fillStyle = P.cabGlass; rr(c, tx - 8, yR - 145, 46, 20, 4); c.fill();
        c.fillStyle = P.light; ellipse(c, tx + 15, yR - 158, 4, 4); c.fill();
        c.fillStyle = P.sign; rr(c, s.x + 60, yT - 2, 140, 20, 6); c.fill();
        signText(c, info.t('world.signs.arrival'), s.x + 130, yT + 8, 11);
        c.strokeStyle = P.pole; c.lineWidth = 2; c.beginPath(); c.moveTo(s.x - 20, s.base); c.lineTo(s.x - 20, s.base - 60); c.stroke();
    },
    anim(c, s, time) {
        const P = AIRPORT, { yR } = top(s), tx = s.x + s.w - TOWER_FROM_RIGHT;
        if (blink(time, 4)) { c.fillStyle = P.lightGlow; ellipse(c, tx + 15, yR - 158, 10, 10); c.fill(); }
        const wv = Math.sin(time * 3) * 3;   // Windsack
        c.fillStyle = P.sock;
        c.beginPath(); c.moveTo(s.x - 20, s.base - 60); c.lineTo(s.x + 6, s.base - 56 + wv); c.lineTo(s.x + 6, s.base - 48 + wv); c.lineTo(s.x - 20, s.base - 50); c.fill();
    },
    animBox: (s) => { const { yR } = top(s); return [s.x - 22, yR - 170, s.x + s.w, s.base]; }
};

// ------------------------------------------------------------------ Campus (Bildungsweg)
const SCHOOL = { wall: ['#f4ece0', '#e2d5c1'], roof: ['#b5523b', '#94402c'], window: '#86c3e6', column: '#ffffff', gable: '#efe6d8', gableLine: '#cbbba3', door: '#6b3d2a', clock: '#fff', hands: '#333', pole: '#666', flag: '#2a9d8f' };
const CLOCK_DY = 36, CLOCK_R = 20;
const school = {
    pad: { left: 12, right: 26, top: 158, bottom: 18 },
    paint(c, s) {
        const P = SCHOOL, { yT, yR } = box(c, s, P.wall, P.roof);
        windows(c, s.x + 14, yT + 18, 120, 70, 3, 2, P.window);
        windows(c, s.x + s.w - 134, yT + 18, 120, 70, 3, 2, P.window);
        const cx = s.x + s.w / 2;
        c.fillStyle = P.column;
        for (let i = -2; i <= 1; i++) c.fillRect(cx + i * 26 + 6, yT + 30, 10, s.height - 38);
        c.fillStyle = P.gable; c.beginPath(); c.moveTo(cx - 70, yT + 30); c.lineTo(cx + 70, yT + 30); c.lineTo(cx, yT - 4); c.closePath(); c.fill();
        c.strokeStyle = P.gableLine; c.lineWidth = 2; c.stroke();
        door(c, cx, s.base, P.door, 36, 46);
        c.fillStyle = P.gable; c.fillRect(cx - 32, yR - 70, 64, 90);   // Uhrturm
        c.fillStyle = P.roof[0]; c.beginPath(); c.moveTo(cx - 40, yR - 70); c.lineTo(cx + 40, yR - 70); c.lineTo(cx, yR - 112); c.closePath(); c.fill();
        c.fillStyle = P.clock; ellipse(c, cx, yR - CLOCK_DY, CLOCK_R, CLOCK_R); c.fill();
        c.strokeStyle = P.hands; c.lineWidth = 2; ellipse(c, cx, yR - CLOCK_DY, CLOCK_R, CLOCK_R); c.stroke();
        c.strokeStyle = P.pole; c.beginPath(); c.moveTo(cx, yR - 112); c.lineTo(cx, yR - 146); c.stroke();
    },
    anim(c, s, time) {
        const P = SCHOOL, { yR } = top(s), cx = s.x + s.w / 2, cy = yR - CLOCK_DY;
        const now = new Date();
        const hA = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * TAU - Math.PI / 2, mA = now.getMinutes() / 60 * TAU - Math.PI / 2;
        c.strokeStyle = P.hands; c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(hA) * 10, cy + Math.sin(hA) * 10); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(mA) * 15, cy + Math.sin(mA) * 15); c.stroke();
        const fw = Math.sin(time * 4) * 3;   // Fahne
        c.fillStyle = P.flag;
        c.beginPath(); c.moveTo(cx, yR - 146); c.quadraticCurveTo(cx + 14, yR - 146 + fw, cx + 28, yR - 142); c.lineTo(cx + 28, yR - 128); c.quadraticCurveTo(cx + 14, yR - 132 + fw, cx, yR - 130); c.fill();
    },
    animBox: (s) => { const { yR } = top(s), cx = s.x + s.w / 2; return [cx - 22, yR - 152, cx + 32, yR - 14]; }
};

// ------------------------------------------------------------------ Business-Viertel (drei Türme)
const CAREER = { glassSide: ['#5b8fcc', '#3f6fae'], glassMain: ['#4b7fc0', '#2f5d99'], window: 'rgba(170,215,255,0.85)', roofSide: '#2a4d7d', roofMain: '#1f3f6a', cornice: '#16304f', lobby: '#e9eef5', lobbyRoof: '#1f3f6a', door: '#2a4d7d', antenna: '#ccc', lightOn: '#ff4d4d', lightOff: '#992222' };
const TOWERS = [[0, 110, 190], [118, 124, 250], [250, 110, 160]];   // [Abstand von links, Breite, Höhe]
const towerWindows = (s, [ox, tw, th]) => [s.x + ox + 6, s.base - th + 8, tw - 12, th - 30, 4, Math.floor(th / 26)];
const career = {
    pad: { left: 6, right: 26, top: 118, bottom: 18 },
    paint(c, s, info) {
        const P = CAREER;
        c.fillStyle = SHADOW; rr(c, s.x + 12, s.base - 30, s.w + 10, 44, 12); c.fill();
        TOWERS.forEach(([ox, tw, th], i) => {
            const x = s.x + ox, yT = s.base - th, yR = yT - s.depth, main = i === 1;
            const g = c.createLinearGradient(x, 0, x + tw, 0);
            const cols = main ? P.glassMain : P.glassSide;
            g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
            c.fillStyle = g; c.fillRect(x, yT, tw, th);
            const [wx, wy, ww, wh, wc, wr] = towerWindows(s, TOWERS[i]);
            windows(c, wx, wy, ww, wh, wc, wr, P.window);
            c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(x + tw * 0.2, yT); c.lineTo(x + tw * 0.45, yT); c.lineTo(x + tw * 0.1, yT + th * 0.6); c.lineTo(x, yT + th * 0.6); c.closePath(); c.fill();
            c.fillStyle = main ? P.roofMain : P.roofSide; rr(c, x - 4, yR, tw + 8, s.depth, 5); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x, yR + 4, tw, 4);
            c.fillStyle = P.cornice; c.fillRect(x - 4, yT - 6, tw + 8, 8);
            if (main) { c.strokeStyle = P.antenna; c.lineWidth = 2; c.beginPath(); c.moveTo(x + tw / 2, yR); c.lineTo(x + tw / 2, yR - 34); c.stroke(); }
        });
        c.fillStyle = P.lobby; c.fillRect(s.x + 100, s.base - 50, 160, 50);
        c.fillStyle = P.lobbyRoof; c.fillRect(s.x + 96, s.base - 56, 168, 10);
        door(c, s.x + s.w / 2, s.base, P.door, 50, 38);
        signText(c, info.t('world.signs.career'), s.x + s.w / 2, s.base - 51, 8);
    },
    anim(c, s, time) {
        const P = CAREER;
        TOWERS.forEach((tower, i) => windowLights(c, ...towerWindows(s, tower), time + i));
        const [ox, tw, th] = TOWERS[1], x = s.x + ox, yR = s.base - th - s.depth;
        c.fillStyle = blink(time, 3) ? P.lightOn : P.lightOff; ellipse(c, x + tw / 2, yR - 36, 3.5, 3.5); c.fill();
    },
    animBox: (s) => [s.x, s.base - 250 - s.depth - 42, s.x + s.w, s.base - 30]
};

// ------------------------------------------------------------------ Tech-Lab
const LAB = { wall: ['#fbfdff', '#e4ecf3'], roof: ['#2c3e50', '#1d2b38'], stripe: '#2ec4b6', screen: '#1b2a3a', ledA: '#4cf0a0', ledB: '#4cd0ff', ledOff: '#2d4357', screenGlow: 'rgba(76,240,255,0.25)', door: '#2ec4b6', signBg: '#132232', neon: '#2ef0e0', neonText: 'rgba(90,255,235,0.95)', dishPole: '#8796a8', dish: '#e6edf5', vent: '#56687c', ventSlat: '#9fb2c6' };
const LAB_SCREENS = 6, LAB_LEDS = 4;
const labScreenX = (s, i) => s.x + 16 + i * 50;
const labSkipsScreen = (s, i) => Math.abs(labScreenX(s, i) + 20 - (s.x + s.w / 2)) < 30;   // Platz für die Tür
const lab = {
    pad: { left: 12, right: 26, top: 34, bottom: 18 },
    paint(c, s, info) {
        const P = LAB, { yT, yR } = box(c, s, P.wall, P.roof);
        c.fillStyle = P.stripe; c.fillRect(s.x, yT + 6, s.w, 6);
        for (let i = 0; i < LAB_SCREENS; i++) {
            if (labSkipsScreen(s, i)) continue;
            const wx = labScreenX(s, i);
            c.fillStyle = P.screen; rr(c, wx, yT + 26, 40, 46, 4); c.fill();
            c.fillStyle = P.screenGlow; c.fillRect(wx + 4, yT + 56, 32, 10);
        }
        door(c, s.x + s.w / 2, s.base, P.door, 38, 46);
        // Neon-Schild mit Leuchten (einmal vorgerendert statt shadowBlur in jedem Bild)
        c.save(); c.shadowColor = P.neon; c.shadowBlur = 12;
        c.fillStyle = P.signBg; rr(c, s.x + s.w / 2 - 50, yT - 26, 100, 30, 8); c.fill();
        c.restore();
        signText(c, info.t('world.signs.lab'), s.x + s.w / 2, yT - 11, 15, P.neonText, 800);
        c.fillStyle = P.dishPole; c.fillRect(s.x + 57, yR + 20, 6, 18);
        c.fillStyle = P.vent; c.fillRect(s.x + s.w - 90, yR + 26, 50, 30);
        c.fillStyle = P.ventSlat; for (let i = 0; i < 4; i++) c.fillRect(s.x + s.w - 86 + i * 12, yR + 30, 8, 22);
    },
    anim(c, s, time) {
        const P = LAB, { yT, yR } = top(s);
        for (let i = 0; i < LAB_SCREENS; i++) {
            if (labSkipsScreen(s, i)) continue;
            const wx = labScreenX(s, i);
            for (let k = 0; k < LAB_LEDS; k++) {
                const on = Math.sin(time * (2 + k) + i * 1.7 + k) > 0.2;
                c.fillStyle = on ? (k % 2 ? P.ledA : P.ledB) : P.ledOff;
                c.fillRect(wx + 6 + k * 8, yT + 34 + (k % 2) * 12, 5, 3);
            }
        }
        const dx = s.x + 60, dy = yR + 30, a = Math.sin(time * 0.6) * 0.3;   // Satellitenschüssel
        c.save(); c.translate(dx, dy - 16); c.rotate(-0.5 + a);
        c.fillStyle = P.dish; c.beginPath(); c.ellipse(0, 0, 22, 10, 0, 0, Math.PI); c.fill();
        c.strokeStyle = P.dishPole; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 2); c.lineTo(0, -16); c.stroke();
        c.restore();
    },
    animBox: (s) => { const { yT, yR } = top(s); return [s.x + 30, yR - 6, s.x + s.w - 10, yT + 72]; }
};

// ------------------------------------------------------------------ Projekt-Baustelle (Kran bewegt sich)
const SITE = { sand: '#c9b48a', concrete: '#b9b2a6', concreteTop: '#a9a196', window: '#55606b', scaffold: '#c76b1f', plank: '#8a6a43', crates: ['#ff8a3d', '#2ec4b6', '#ffca3a', '#6a4c93'], cone: '#ff7a1a', sign: '#ffca3a', signText: '#222', crane: '#f2b705', craneDark: '#c99400', craneLight: '#ffd23f', counterweight: '#6b7280', cab: '#555', cabGlass: '#9fd4f5', cable: '#444', trolley: '#374151', load: '#ff8a3d', stays: 'rgba(60,60,60,0.55)' };
const BUILT_SHARE = 0.62;                  // Anteil des Grundstücks mit Rohbau
const CRANE = { fromRight: 40, height: 150, jibBase: 110, jibMin: 110, jibMax: 190, jibStatic: 160, counter: 56, stayHeight: 34 };
const construction = {
    pad: { left: 14, right: 26, top: 14, bottom: 24 },
    paint(c, s, info) {
        const P = SITE, { yT, yR } = top(s), bw = s.w * BUILT_SHARE;
        c.fillStyle = SHADOW; rr(c, s.x + 12, s.base - 30, s.w + 10, 44, 12); c.fill();
        c.fillStyle = P.sand; rr(c, s.x - 10, yR + 20, s.w + 20, s.depth + s.height - 10, 10); c.fill();
        c.fillStyle = P.concrete; c.fillRect(s.x, yT + 20, bw, s.height - 20);
        c.fillStyle = P.concreteTop; c.fillRect(s.x, yT + 20, bw, 8);
        windows(c, s.x + 10, yT + 32, bw - 20, 30, 4, 1, P.window);
        c.strokeStyle = P.scaffold; c.lineWidth = 3;
        for (let i = 0; i <= 5; i++) { const x = s.x + i * bw / 5; c.beginPath(); c.moveTo(x, s.base); c.lineTo(x, yT - 30); c.stroke(); }
        for (let j = 0; j < 3; j++) { const y = yT - 30 + j * 40; c.beginPath(); c.moveTo(s.x, y); c.lineTo(s.x + bw, y); c.stroke(); }
        c.fillStyle = P.plank; c.fillRect(s.x - 4, yT - 34, bw + 8, 6);
        P.crates.forEach((col, i) => { c.fillStyle = col; rr(c, s.x + s.w * 0.68 + (i % 2) * 44, s.base - 22 - Math.floor(i / 2) * 20, 40, 18, 3); c.fill(); });
        [[s.x + 40, s.base + 16], [s.x + 120, s.base + 18], [s.x + 200, s.base + 14]].forEach(([x, y]) => {
            c.fillStyle = P.cone; c.beginPath(); c.moveTo(x - 7, y); c.lineTo(x + 7, y); c.lineTo(x, y - 18); c.closePath(); c.fill();
            c.fillStyle = '#fff'; c.fillRect(x - 4, y - 10, 8, 3);
        });
        c.fillStyle = P.sign; rr(c, s.x + s.w / 2 - 70, s.base - 30, 72, 22, 4); c.fill();
        c.strokeStyle = P.signText; c.lineWidth = 2; rr(c, s.x + s.w / 2 - 70, s.base - 30, 72, 22, 4); c.stroke();
        signText(c, info.t('world.signs.projects'), s.x + s.w / 2 - 34, s.base - 19, 10, P.signText, 800);
    },
    // Kran: Mast fest, Ausleger fährt teleskopartig aus und ein, Laufkatze und Haken hängen am Ausleger
    anim(c, s, time, reduced) {
        const P = SITE, C = CRANE, { yR } = top(s);
        const mx = s.x + s.w - C.fromRight, topY = yR - C.height, jy = topY - 4;
        c.strokeStyle = P.crane; c.lineWidth = 4;
        c.beginPath(); c.moveTo(mx - 8, s.base - 30); c.lineTo(mx - 8, topY); c.moveTo(mx + 8, s.base - 30); c.lineTo(mx + 8, topY); c.stroke();
        c.lineWidth = 2;
        for (let y = s.base - 30; y > topY; y -= 18) { c.beginPath(); c.moveTo(mx - 8, y); c.lineTo(mx + 8, y - 18); c.stroke(); }
        const len = reduced ? C.jibStatic : (C.jibMin + C.jibMax) / 2 + Math.sin(time * 0.35) * (C.jibMax - C.jibMin) / 2;
        c.lineCap = 'butt';
        c.strokeStyle = P.crane; c.lineWidth = 6; c.beginPath(); c.moveTo(mx, jy); c.lineTo(mx + C.counter, jy); c.stroke();
        c.fillStyle = P.counterweight; rr(c, mx + C.counter - 22, jy + 3, 22, 16, 2); c.fill();
        c.lineWidth = 7; c.beginPath(); c.moveTo(mx, jy); c.lineTo(mx - C.jibBase, jy); c.stroke();
        c.strokeStyle = P.craneDark; c.lineWidth = 1.2;
        for (let k = 0; k < C.jibBase - 8; k += 12) { c.beginPath(); c.moveTo(mx - k, jy - 3); c.lineTo(mx - k - 12, jy + 3); c.stroke(); }
        c.strokeStyle = P.craneLight; c.lineWidth = 4.5; c.beginPath(); c.moveTo(mx - C.jibBase + 14, jy); c.lineTo(mx - len, jy); c.stroke();
        c.fillStyle = P.craneDark; c.fillRect(mx - len - 3, jy - 4, 5, 8);
        c.strokeStyle = P.stays; c.lineWidth = 1;
        c.beginPath(); c.moveTo(mx, jy - C.stayHeight); c.lineTo(mx - C.jibBase * 0.95, jy - 2); c.moveTo(mx, jy - C.stayHeight); c.lineTo(mx + C.counter - 6, jy - 2); c.stroke();
        c.strokeStyle = P.crane; c.lineWidth = 3; c.beginPath(); c.moveTo(mx, jy); c.lineTo(mx, jy - C.stayHeight - 2); c.stroke();
        c.fillStyle = P.cab; rr(c, mx - 12, topY - 22, 24, 18, 3); c.fill();
        c.fillStyle = P.cabGlass; rr(c, mx - 9, topY - 19, 10, 8, 2); c.fill();
        const hx = mx - len + 12 + (len - 40) * (0.15 + 0.1 * Math.sin(time * 0.6)), hy = jy + 4;
        c.fillStyle = P.trolley; rr(c, hx - 7, jy + 1, 14, 6, 2); c.fill();
        const drop = 64 + Math.sin(time * 0.9) * 8;
        c.strokeStyle = P.cable; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy + drop); c.stroke();
        c.fillStyle = P.load; rr(c, hx - 16, hy + drop, 32, 16, 3); c.fill();
    },
    animBox: (s) => { const { yR } = top(s), mx = s.x + s.w - CRANE.fromRight; return [mx - CRANE.jibMax - 20, yR - CRANE.height - 44, mx + CRANE.counter + 6, s.base]; }
};

// ------------------------------------------------------------------ Bootshaus (Freizeit & Ehrenamt)
const BOATHOUSE = { wood: '#b8814f', plank: 'rgba(90,50,20,0.35)', roof: '#6b4a2f', door: '#5a3b22', window: '#9ad6ee', boards: ['#2ec4b6', '#ff8a3d', '#ffca3a'], buoy: '#e63946' };
const boathouse = {
    pad: { left: 18, right: 26, top: 14, bottom: 18 },
    paint(c, s) {
        const P = BOATHOUSE, { yT, yR } = top(s);
        c.fillStyle = SHADOW; rr(c, s.x + 12, s.base - 30, s.w + 10, 44, 12); c.fill();
        c.fillStyle = P.wood; c.fillRect(s.x, yT, s.w, s.height);
        c.strokeStyle = P.plank; c.lineWidth = 2;
        for (let y = yT + 10; y < s.base; y += 12) { c.beginPath(); c.moveTo(s.x, y); c.lineTo(s.x + s.w, y); c.stroke(); }
        c.fillStyle = P.roof; c.beginPath(); c.moveTo(s.x - 14, yT + 4); c.lineTo(s.x + s.w + 14, yT + 4); c.lineTo(s.x + s.w - 30, yR); c.lineTo(s.x + 30, yR); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(s.x + 30, yR, s.w - 60, 6);
        door(c, s.x + s.w / 2, s.base, P.door, 50, 48);
        windows(c, s.x + 16, yT + 16, 60, 30, 2, 1, P.window);
        P.boards.forEach((col, i) => {
            c.save(); c.translate(s.x + s.w - 60 + i * 16, s.base - 34); c.rotate(0.12);
            c.fillStyle = col; ellipse(c, 0, 0, 6, 34); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-1, -28, 2, 56);
            c.restore();
        });
        c.strokeStyle = P.buoy; c.lineWidth = 6; ellipse(c, s.x + 100, yT + 30, 12, 12); c.stroke();
        c.strokeStyle = '#fff'; c.setLineDash([6, 7]); ellipse(c, s.x + 100, yT + 30, 12, 12); c.stroke(); c.setLineDash([]);
    }
};

// ------------------------------------------------------------------ Finale („Ihr Unternehmen“)
const FINALE = { wall: ['#fffaf0', '#f1e6cf'], roof: ['#f4f6f8', '#d7dde4'], glass: ['#a8dcf5', '#d9f1ff', '#7fc0e6'], carpet: '#d62839', door: '#d4a017', signBg: '#1b2a4a', signText: '#ffd36b', signGlow: 'rgba(255,200,60,0.85)', pole: '#777', flags: ['#ff8a3d', '#2ec4b6'] };
const SIGN_MIN_W = 150, SIGN_H = 36, SIGN_FONT = 18;
const finaleSign = (c, s, label) => {
    c.font = `800 ${SIGN_FONT}px ${FONT}`;
    return Math.max(SIGN_MIN_W, c.measureText(label).width + 40);
};
const finale = {
    pad: { left: 70, right: 70, top: 48, bottom: 52 },
    paint(c, s, info) {
        const P = FINALE, { yT, yR } = box(c, s, P.wall, P.roof);
        const gl = c.createLinearGradient(s.x, yT, s.x + s.w, s.base);
        gl.addColorStop(0, P.glass[0]); gl.addColorStop(0.5, P.glass[1]); gl.addColorStop(1, P.glass[2]);
        c.fillStyle = gl; rr(c, s.x + 20, yT + 20, s.w - 40, s.height - 34, 6); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2;
        for (let i = 1; i < 8; i++) { const x = s.x + 20 + i * (s.w - 40) / 8; c.beginPath(); c.moveTo(x, yT + 20); c.lineTo(x, s.base - 14); c.stroke(); }
        c.beginPath(); c.moveTo(s.x + 20, yT + 64); c.lineTo(s.x + s.w - 20, yT + 64); c.stroke();
        c.fillStyle = P.carpet; c.beginPath(); c.moveTo(s.x + s.w / 2 - 20, s.base); c.lineTo(s.x + s.w / 2 + 20, s.base); c.lineTo(s.x + s.w / 2 + 30, s.base + 46); c.lineTo(s.x + s.w / 2 - 30, s.base + 46); c.closePath(); c.fill();
        door(c, s.x + s.w / 2, s.base, P.door, 44, 50);
        // Schild mit Firmenname (Leuchten einmal vorgerendert)
        const label = info.firm || info.t('world.signs.yourCompany');
        const tw = finaleSign(c, s, label);
        c.save(); c.shadowColor = P.signGlow; c.shadowBlur = 16;
        c.fillStyle = P.signBg; rr(c, s.x + s.w / 2 - tw / 2, yR - 6, tw, SIGN_H, 10); c.fill();
        c.restore();
        signText(c, label, s.x + s.w / 2, yR + 12, SIGN_FONT, P.signText, 800);
        [s.x + 10, s.x + s.w - 10].forEach(fx => { c.strokeStyle = P.pole; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, s.base + 30); c.lineTo(fx, yR - 40); c.stroke(); });
    },
    anim(c, s, time) {
        const P = FINALE, { yR } = top(s);
        [s.x + 10, s.x + s.w - 10].forEach((fx, i) => {
            const w = Math.sin(time * 4 + i) * 3;
            c.fillStyle = P.flags[i];
            c.beginPath(); c.moveTo(fx, yR - 40); c.quadraticCurveTo(fx + 15, yR - 40 + w, fx + 30, yR - 36); c.lineTo(fx + 30, yR - 22); c.quadraticCurveTo(fx + 15, yR - 26 + w, fx, yR - 24); c.fill();
        });
    },
    animBox: (s) => { const { yR } = top(s); return [s.x + 6, yR - 46, s.x + s.w + 24, yR - 18]; }
};

export const BUILDINGS = { airport, school, career, lab, construction, boathouse, finale };
export const buildingTop = top;

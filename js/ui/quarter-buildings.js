// Gebäude des Projekt-Viertels in der Draufsicht (2D von oben, mit schmaler Vorderfront wie in klassischen
// Rollenspielen). Jedes Grundstück ist PW × PH Einheiten groß; alle Zeichenfunktionen bekommen die linke obere
// Ecke (x, y) des Grundstücks.
//   draw   – fertiges Gebäude samt Hof (statisch, wird vorgerendert)
//   anim   – bewegte Kleinigkeiten (jedes Bild)
//   lights – Leuchtendes; wird nach der Nacht-Abdunklung gezeichnet und bleibt deshalb hell
//   site   – was schon vor dem Bau auf dem Grundstück steht (nur im Zustand „Fundament“)
//   foot   – Grundfläche (Kollision, Baugrube, Gerüst)
import { TAU } from '../core/math.js';
import { rr, ellipse as ell, FONT } from '../core/canvas.js';

export const PW = 320, PH = 250;

export function label(c, s, x, y, size, col, weight = 800, align = 'center') {
    c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y);
}
/** Auto von oben (Mitte x/y, Drehung a) */
export function car(c, x, y, a, body, sign) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -15, -7, 32, 17, 6); c.fill();
    c.fillStyle = body; rr(c, -16, -9, 32, 18, 6); c.fill();
    c.fillStyle = '#bfe3ff'; rr(c, 4, -7, 7, 14, 2); c.fill();     // Frontscheibe
    c.fillStyle = 'rgba(20,30,50,0.55)'; rr(c, -11, -7, 5, 14, 2); c.fill();
    if (sign) { c.fillStyle = '#fff'; rr(c, -5, -5, 9, 10, 2); c.fill(); label(c, 'L', -0.5, 0.5, 8, '#d00000', 900); }
    c.restore();
}
/** Mensch von oben (Kopf, Schultern) */
export function topPerson(c, x, y, col) {
    c.fillStyle = 'rgba(0,0,0,0.16)'; ell(c, x + 1.5, y + 2, 6, 4); c.fill();
    c.fillStyle = col; ell(c, x, y, 6, 4.2); c.fill();
    c.fillStyle = '#3a2a20'; ell(c, x, y - 0.5, 3, 3); c.fill();
}
function tree(c, x, y, r, col = '#3f9b4a') {
    c.fillStyle = 'rgba(0,0,0,0.16)'; ell(c, x + 4, y + 5, r, r * 0.85); c.fill();
    c.fillStyle = col; ell(c, x, y, r, r); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.16)'; ell(c, x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.45); c.fill();
}
function windowsRow(c, x, y, w, n, col) {
    const gap = w / n;
    for (let i = 0; i < n; i++) { c.fillStyle = col; rr(c, x + i * gap + gap * 0.2, y, gap * 0.6, 9, 2); c.fill(); }
}
/** Dach mit First (Satteldach von oben) */
function gableRoof(c, x, y, w, h, light, dark) {
    c.fillStyle = light; c.fillRect(x, y, w, h / 2);
    c.fillStyle = dark; c.fillRect(x, y + h / 2, w, h / 2);
    c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
    for (let xx = x + 10; xx < x + w; xx += 10) { c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + h); c.stroke(); }
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + h / 2 - 1.5, w, 3);
}
/** Vorderfront (sichtbarer Wandstreifen unter dem Dach) mit Fenstern und Tür */
function facade(c, x, y, w, h, wall, door, win) {
    c.fillStyle = wall; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x, y, w, 3);
    windowsRow(c, x + 6, y + 7, w / 2 - 26, 3, win);
    windowsRow(c, x + w / 2 + 20, y + 7, w / 2 - 26, 3, win);
    c.fillStyle = door; rr(c, x + w / 2 - 9, y + 5, 18, h - 5, [4, 4, 0, 0]); c.fill();
}
function roofSign(c, text, x, y, size, bg = '#1f2a44', col = '#ffd166') {
    c.font = `800 ${size}px ${FONT}`;
    const w = c.measureText(text).width + 16;
    c.fillStyle = bg; rr(c, x - w / 2, y - size * 0.85, w, size * 1.7, 5); c.fill();
    label(c, text, x, y + 0.5, size, col);
}
const glowAt = (c, x, y, r, col) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,220,140,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
};

export const BUILDINGS = {
    // Werkzeugverleih: Laden mit Markise, Werkzeugen im Hof und Parkplatz
    shop: {
        foot: { x: 40, y: 28, w: 230, h: 136 },
        draw(c, x, y, info) {
            const bx = x + 40, by = y + 28;
            gableRoof(c, bx, by, 230, 108, '#c4553a', '#a8442d');
            roofSign(c, info.t('projects.signs.shop'), bx + 115, by + 28, 11);
            c.fillStyle = '#ffffff'; for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#16a34a'; c.fillRect(bx + 8 + i * 21.4, by + 104, 21.4, 9); }
            facade(c, bx, by + 113, 230, 23, '#efe2cf', '#5b2e1c', '#9fd4f5');
            // Hof: Palette mit Leiter und Schubkarre, Werkzeugregal
            c.fillStyle = '#b08350'; rr(c, x + 34, y + 182, 46, 30, 3); c.fill();
            c.strokeStyle = '#9ca3af'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 40, y + 186); c.lineTo(x + 40, y + 208); c.moveTo(x + 52, y + 186); c.lineTo(x + 52, y + 208); c.stroke();
            c.lineWidth = 2; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + 40, y + 189 + k * 6); c.lineTo(x + 52, y + 189 + k * 6); c.stroke(); }
            c.fillStyle = '#16a34a'; rr(c, x + 60, y + 188, 14, 18, 4); c.fill();
            c.fillStyle = '#2b2f3a'; ell(c, x + 67, y + 210, 3, 3); c.fill();
            c.fillStyle = '#4b5563'; rr(c, x + 96, y + 182, 40, 10, 2); c.fill();
            ['#f59e0b', '#ef4444', '#3b82f6', '#9ca3af'].forEach((col, k) => { c.fillStyle = col; rr(c, x + 99 + k * 9, y + 184, 6, 6, 1); c.fill(); });
            // Parkplatz
            c.fillStyle = '#9aa3b2'; c.fillRect(x + 196, y + 178, 104, 52);
            c.strokeStyle = '#fff'; c.lineWidth = 1.5;
            for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + 200 + k * 32, y + 178); c.lineTo(x + 200 + k * 32, y + 202); c.stroke(); }
            car(c, x + 216, y + 192, Math.PI / 2, '#3b82f6');
            car(c, x + 280, y + 192, Math.PI / 2, '#f4f4f5');
        },
        lights(c, x, y) { glowAt(c, x + 155, y + 152, 46, 'rgba(255,214,120,0.38)'); }
    },
    // KI-Videos: Studio mit großem Bildschirm auf dem Dach und Sendemast
    studio: {
        foot: { x: 34, y: 30, w: 210, h: 134 },
        draw(c, x, y) {
            const bx = x + 34, by = y + 30;
            c.fillStyle = '#2a2f4f'; c.fillRect(bx, by, 210, 110);
            c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
            for (let xx = bx + 14; xx < bx + 210; xx += 14) { c.beginPath(); c.moveTo(xx, by); c.lineTo(xx, by + 110); c.stroke(); }
            c.fillStyle = '#0b1020'; rr(c, bx + 26, by + 14, 158, 70, 6); c.fill();
            [[bx + 14, by + 96], [bx + 196, by + 96]].forEach(([dx, dy]) => { c.fillStyle = '#d1d5db'; ell(c, dx, dy, 8, 8); c.fill(); c.fillStyle = '#9ca3af'; ell(c, dx, dy, 3, 3); c.fill(); });
            facade(c, bx, by + 110, 210, 24, '#353b63', '#1b1f36', '#7b5cff');
            // Sendemast mit Abspannseilen
            const mx = x + 282, my = y + 92;
            c.strokeStyle = 'rgba(200,205,215,0.8)'; c.lineWidth = 1;
            [[-26, -40], [26, -36], [0, 44]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + dx, my + dy); c.stroke(); });
            c.fillStyle = '#c0c6d4'; rr(c, mx - 7, my - 7, 14, 14, 2); c.fill();
            c.strokeStyle = '#8b93a5'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(mx - 7, my - 7); c.lineTo(mx + 7, my + 7); c.moveTo(mx + 7, my - 7); c.lineTo(mx - 7, my + 7); c.stroke();
            // Hof: Kamera-Stativ und Scheinwerfer für Außendrehs
            c.fillStyle = '#374151'; ell(c, x + 70, y + 198, 9, 9); c.fill();
            c.fillStyle = '#111827'; rr(c, x + 64, y + 192, 16, 10, 2); c.fill();
            c.fillStyle = '#fde68a'; ell(c, x + 110, y + 204, 7, 7); c.fill();
        },
        lights(c, x, y, t) {
            const bx = x + 60, by = y + 44;
            const g = c.createLinearGradient(bx, 0, bx + 158, 0); g.addColorStop(0, '#7b5cff'); g.addColorStop(1, '#ff4f6d');
            c.fillStyle = g; rr(c, bx + 4, by + 4, 150, 62, 4); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx + 70, by + 20); c.lineTo(bx + 92, by + 35); c.lineTo(bx + 70, by + 50); c.closePath(); c.fill();
            if (Math.sin(t * 4) > 0) { c.fillStyle = '#ff3b3b'; ell(c, bx + 146, by + 12, 4, 4); c.fill(); }
            const mx = x + 282, my = y + 92;   // Funkwellen
            c.strokeStyle = 'rgba(160,130,255,0.75)'; c.lineWidth = 1.6;
            for (let k = 0; k < 3; k++) { const r = 10 + ((t * 20 + k * 12) % 36); c.globalAlpha = Math.max(0, 1 - r / 46); ell(c, mx, my, r, r); c.stroke(); }
            c.globalAlpha = 1;
            c.fillStyle = '#ff4d4d'; ell(c, mx, my, 3, 3); c.fill();
        }
    },
    // Rustfall: Raffinerie in der Wüste
    refinery: {
        sand: true,
        foot: { x: 26, y: 22, w: 270, h: 150 },
        draw(c, x, y) {
            // Rohre
            c.strokeStyle = '#5a5f6b'; c.lineWidth = 6; c.lineCap = 'round';
            c.beginPath(); c.moveTo(x + 84, y + 74); c.lineTo(x + 166, y + 74); c.lineTo(x + 166, y + 140); c.lineTo(x + 250, y + 140);
            c.moveTo(x + 166, y + 74); c.lineTo(x + 236, y + 74); c.stroke();
            c.strokeStyle = '#7b818d'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(x + 84, y + 74); c.lineTo(x + 166, y + 74); c.stroke();
            // Tanks
            [[x + 80, y + 76, 40, '#c46a3a'], [x + 112, y + 146, 26, '#a85a32'], [x + 166, y + 56, 30, '#b5602f']].forEach(([tx, ty, r, col]) => {
                c.fillStyle = 'rgba(0,0,0,0.2)'; ell(c, tx + 5, ty + 6, r, r); c.fill();
                c.fillStyle = col; ell(c, tx, ty, r, r); c.fill();
                c.strokeStyle = '#d9824f'; c.lineWidth = 3; ell(c, tx, ty, r - 5, r - 5); c.stroke();
                c.fillStyle = 'rgba(0,0,0,0.22)'; ell(c, tx, ty, 6, 6); c.fill();
                c.strokeStyle = 'rgba(60,30,10,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(tx - r * 0.6, ty - r * 0.2); c.lineTo(tx + r * 0.3, ty + r * 0.5); c.stroke();
            });
            // Destillationsturm mit Plattformen
            const dx = x + 236, dy = y + 74;
            c.fillStyle = 'rgba(0,0,0,0.2)'; ell(c, dx + 6, dy + 7, 22, 22); c.fill();
            c.fillStyle = '#9c6644'; ell(c, dx, dy, 22, 22); c.fill();
            c.strokeStyle = '#6f4a32'; c.lineWidth = 2; [16, 10].forEach(r => { ell(c, dx, dy, r, r); c.stroke(); });
            c.fillStyle = '#4b5563'; c.fillRect(dx + 18, dy - 3, 14, 6);
            // Fackel-Schornstein
            c.fillStyle = '#8a8f99'; ell(c, x + 262, y + 146, 9, 9); c.fill();
            c.fillStyle = '#b5482b'; ell(c, x + 262, y + 146, 5, 5); c.fill();
            label(c, 'RUSTFALL', x + 196, y + 196, 13, '#7a3b12', 900);
            // Wrack eines Autos im Sand
            c.save(); c.translate(x + 60, y + 200); c.rotate(0.4);
            c.fillStyle = '#8b5a3c'; rr(c, -16, -9, 32, 18, 5); c.fill();
            c.fillStyle = '#5c3a26'; rr(c, -8, -6, 14, 12, 2); c.fill();
            c.restore();
        },
        lights(c, x, y, t) {
            const fl = 1 + Math.sin(t * 9) * 0.2 + Math.sin(t * 23) * 0.08;
            glowAt(c, x + 262, y + 146, 30 * fl, 'rgba(255,160,40,0.45)');
            c.fillStyle = '#ff9f1c'; ell(c, x + 262, y + 146, 7 * fl, 7 * fl); c.fill();
            c.fillStyle = '#ffd166'; ell(c, x + 262, y + 146, 3.5, 3.5); c.fill();
        }
    },
    // Ultranisator: Fußballstadion mit Tribünen und Flutlicht
    stadium: {
        foot: { x: 20, y: 16, w: 280, h: 166 },
        draw(c, x, y) {
            const cx = x + 160, cy = y + 99;
            c.fillStyle = 'rgba(0,0,0,0.2)'; ell(c, cx + 6, cy + 8, 140, 83); c.fill();
            c.fillStyle = '#4b5563'; ell(c, cx, cy, 140, 83); c.fill();
            c.strokeStyle = '#e63946'; c.lineWidth = 14; ell(c, cx, cy, 120, 68); c.stroke();
            c.strokeStyle = '#f1f5f9'; c.lineWidth = 2; ell(c, cx, cy, 129, 75); c.stroke();
            c.strokeStyle = '#b91c1c'; c.lineWidth = 6; ell(c, cx, cy, 108, 59); c.stroke();
            // Fans auf den Rängen (feste Plätze)
            const fans = ['#ffffff', '#ffd166', '#1d4ed8', '#111827'];
            for (let i = 0; i < 90; i++) {
                const a = (i / 90) * TAU, rr2 = 116 + (i % 3) * 4;
                c.fillStyle = fans[i % fans.length]; c.fillRect(cx + Math.cos(a) * rr2 - 1, cy + Math.sin(a) * rr2 * 0.57 - 1, 2.2, 2.2);
            }
            // Spielfeld
            const fx = cx - 84, fy = cy - 44, fw = 168, fh = 88;
            for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#3fae49' : '#38a043'; c.fillRect(fx + k * fw / 8, fy, fw / 8, fh); }
            c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 1.6;
            c.strokeRect(fx + 4, fy + 4, fw - 8, fh - 8);
            c.beginPath(); c.moveTo(cx, fy + 4); c.lineTo(cx, fy + fh - 4); c.stroke();
            ell(c, cx, cy, 13, 13); c.stroke();
            c.strokeRect(fx + 4, cy - 20, 22, 40); c.strokeRect(fx + fw - 26, cy - 20, 22, 40);
            c.fillStyle = '#fff'; c.fillRect(fx + 1, cy - 7, 3, 14); c.fillRect(fx + fw - 4, cy - 7, 3, 14);
            // Flutlichtmasten
            [[x + 34, y + 30], [x + 286, y + 30], [x + 34, y + 168], [x + 286, y + 168]].forEach(([mx, my]) => {
                c.fillStyle = '#9ca3af'; rr(c, mx - 6, my - 6, 12, 12, 2); c.fill();
                c.fillStyle = '#e5e7eb'; rr(c, mx - 4, my - 4, 8, 8, 1); c.fill();
            });
        },
        anim(c, x, y, t) {   // Ball rollt über das Feld
            const cx = x + 160 + Math.sin(t * 0.9) * 60, cy = y + 99 + Math.sin(t * 1.7) * 26;
            c.fillStyle = '#fff'; ell(c, cx, cy, 2.6, 2.6); c.fill();
        },
        lights(c, x, y, t, night) {
            if (!night) return;
            [[x + 34, y + 30], [x + 286, y + 30], [x + 34, y + 168], [x + 286, y + 168]].forEach(([mx, my]) => glowAt(c, mx, my, 70, 'rgba(255,250,210,0.32)'));
        }
    },
    // Rest-IQ: Restaurant mit Terrasse und Sonnenschirmen
    restaurant: {
        foot: { x: 30, y: 30, w: 180, h: 132 },
        draw(c, x, y) {
            const bx = x + 30, by = y + 30;
            gableRoof(c, bx, by, 180, 108, '#c2693a', '#a6552d');
            c.fillStyle = '#6b3a22'; rr(c, bx + 140, by + 14, 16, 16, 2); c.fill();   // Schornstein
            roofSign(c, 'REST-IQ', bx + 80, by + 30, 12);
            for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e63946'; c.fillRect(bx + 4 + i * 19.1, by + 104, 19.1, 8); }
            facade(c, bx, by + 110, 180, 22, '#f4e3c3', '#5a2e19', '#9fd4f5');
            // Terrasse
            c.fillStyle = '#c99a63'; rr(c, x + 220, y + 40, 86, 170, 6); c.fill();
            c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
            for (let yy = y + 50; yy < y + 210; yy += 10) { c.beginPath(); c.moveTo(x + 220, yy); c.lineTo(x + 306, yy); c.stroke(); }
            [[x + 246, y + 74], [x + 282, y + 112], [x + 246, y + 150], [x + 282, y + 186]].forEach(([tx, ty], k) => {
                c.fillStyle = '#f8fafc'; ell(c, tx, ty, 9, 9); c.fill();
                [[-13, 0], [13, 0], [0, -13], [0, 13]].forEach(([dx, dy]) => { c.fillStyle = '#7c4a2a'; ell(c, tx + dx, ty + dy, 3.5, 3.5); c.fill(); });
                if (k % 2 === 0) {   // Sonnenschirm
                    for (let s = 0; s < 8; s++) {
                        c.fillStyle = s % 2 ? '#ffffff' : '#e63946';
                        c.beginPath(); c.moveTo(tx, ty); c.arc(tx, ty, 17, s * TAU / 8, (s + 1) * TAU / 8); c.closePath(); c.fill();
                    }
                }
            });
            // Blumenbeete vor dem Eingang
            [[x + 60, y + 182], [x + 180, y + 182]].forEach(([fx, fy]) => {
                c.fillStyle = '#6b4226'; rr(c, fx - 22, fy - 7, 44, 14, 4); c.fill();
                ['#f472b6', '#facc15', '#fb7185', '#a78bfa'].forEach((col, k) => { c.fillStyle = col; ell(c, fx - 15 + k * 10, fy, 3.5, 3.5); c.fill(); });
            });
        },
        lights(c, x, y, t, night) {
            if (!night) return;
            [[x + 246, y + 74], [x + 282, y + 112], [x + 246, y + 150], [x + 282, y + 186]].forEach(([tx, ty]) => glowAt(c, tx, ty, 22, 'rgba(255,200,110,0.4)'));
            glowAt(c, x + 120, y + 152, 40, 'rgba(255,214,120,0.32)');
        }
    },
    // Drive Pluz: Fahrschule mit Übungsplatz, Hütchen und Fahrschulauto
    drivingschool: {
        foot: { x: 24, y: 28, w: 128, h: 116 },
        draw(c, x, y, info) {
            const bx = x + 24, by = y + 28;
            c.fillStyle = '#e5e7eb'; c.fillRect(bx, by, 128, 92);
            c.fillStyle = '#cbd5e1'; c.fillRect(bx, by, 128, 8);
            roofSign(c, info.t('projects.signs.drivingSchool'), bx + 64, by + 40, 10, '#1d4ed8', '#ffffff');
            facade(c, bx, by + 92, 128, 24, '#f8fafc', '#1e3a8a', '#9fd4f5');
            this.course(c, x, y, true);
        },
        /** Übungsplatz (beim fertigen Gebäude mit Markierungen, im Fundament-Zustand nur abgesteckt) */
        course(c, x, y, full) {
            if (full) {
                c.fillStyle = '#6b7280'; rr(c, x + 170, y + 20, 138, 196, 10); c.fill();
                c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.setLineDash([10, 8]);
                rr(c, x + 196, y + 46, 86, 144, 30); c.stroke(); c.setLineDash([]);
                c.strokeStyle = '#facc15'; c.lineWidth = 2; c.strokeRect(x + 178, y + 186, 40, 22);
            }
            [[x + 186, y + 34], [x + 292, y + 34], [x + 239, y + 118], [x + 186, y + 200], [x + 292, y + 200]].forEach(([cx, cy]) => {
                c.fillStyle = '#ff7a1a'; ell(c, cx, cy, 5, 5); c.fill();
                c.fillStyle = '#fff'; ell(c, cx, cy, 2, 2); c.fill();
            });
        },
        anim(c, x, y, t) {   // Fahrschulauto dreht Runden auf dem Übungsplatz
            const a = t * 0.6, cx = x + 239 + Math.cos(a) * 43, cy = y + 118 + Math.sin(a) * 72;
            car(c, cx, cy, Math.atan2(72 * Math.cos(a), -43 * Math.sin(a)), '#f8fafc', true);
        },
        site(c, x, y) {   // vor dem Bau: Übungsplatz abgesteckt, Fahrschulauto parkt schon
            this.course(c, x, y, false);
            car(c, x + 238, y + 196, 0, '#f8fafc', true);
        }
    }
};
// Altes Datenformat: „foundation“ stand für die Fahrschule im Fundament-Zustand
BUILDINGS.foundation = BUILDINGS.drivingschool;

/** Baustellen-Zustände (Grundfläche f in absoluten Koordinaten) */
export function excavation(c, f, t) {
    c.fillStyle = '#7a5c3e'; rr(c, f.x + 6, f.y + 6, f.w - 12, f.h - 12, 6); c.fill();
    c.fillStyle = '#8f7356'; rr(c, f.x + 14, f.y + 14, f.w - 28, f.h - 28, 4); c.fill();
    c.strokeStyle = 'rgba(55,65,81,0.75)'; c.lineWidth = 1.2;   // Bewehrungsgitter
    for (let xx = f.x + 22; xx < f.x + f.w - 18; xx += 12) { c.beginPath(); c.moveTo(xx, f.y + 18); c.lineTo(xx, f.y + f.h - 18); c.stroke(); }
    for (let yy = f.y + 22; yy < f.y + f.h - 18; yy += 12) { c.beginPath(); c.moveTo(f.x + 18, yy); c.lineTo(f.x + f.w - 18, yy); c.stroke(); }
    // Bagger von oben: Kette, Oberwagen, Ausleger mit Schaufel
    const bx = f.x + f.w - 30, by = f.y + f.h - 26, a = -2.4 + Math.sin(t * 1.2) * 0.35;
    c.fillStyle = '#374151'; rr(c, bx - 16, by - 14, 32, 7, 3); c.fill(); rr(c, bx - 16, by + 7, 32, 7, 3); c.fill();
    c.save(); c.translate(bx, by); c.rotate(a);
    c.fillStyle = '#f2b705'; rr(c, -12, -10, 24, 20, 4); c.fill();
    c.fillStyle = '#9fd4f5'; c.fillRect(2, -8, 7, 7);
    c.fillStyle = '#e0a800'; c.fillRect(10, -3, 30, 6);
    c.fillStyle = '#4b5563'; rr(c, 38, -6, 9, 12, 2); c.fill();
    c.restore();
}
export function scaffold(c, f, builtTop) {
    c.strokeStyle = '#d97706'; c.lineWidth = 2;
    c.strokeRect(f.x - 5, f.y - 5, f.w + 10, f.h + 10);
    // Gerüstbretter an der Baukante und an den Seiten des noch offenen Teils
    c.fillStyle = 'rgba(180,120,60,0.85)';
    if (builtTop > f.y) {
        c.fillRect(f.x - 4, builtTop - 3, f.w + 8, 6);
        c.fillRect(f.x - 9, f.y - 5, 6, builtTop - f.y + 5); c.fillRect(f.x + f.w + 3, f.y - 5, 6, builtTop - f.y + 5);
    }
    c.strokeStyle = 'rgba(217,119,6,0.5)'; c.lineWidth = 1;
    for (let yy = f.y + 10; yy < builtTop - 4; yy += 22) { c.beginPath(); c.moveTo(f.x - 9, yy); c.lineTo(f.x - 3, yy + 11); c.moveTo(f.x + f.w + 9, yy); c.lineTo(f.x + f.w + 3, yy + 11); c.stroke(); }
}
/** Turmdrehkran von oben: Mast, drehender Ausleger mit Laufkatze, Schatten */
export function crane(c, mx, my, t, len = 150) {
    const a = t * 0.22, ca = Math.cos(a), sa = Math.sin(a);
    const jib = (dx, dy, alpha) => {
        c.strokeStyle = `rgba(0,0,0,${alpha})`; c.lineWidth = 5;
        c.beginPath(); c.moveTo(mx + dx - ca * 40, my + dy - sa * 40); c.lineTo(mx + dx + ca * len, my + dy + sa * len); c.stroke();
    };
    jib(10, 14, 0.18);   // Schatten auf dem Boden
    c.fillStyle = '#f2b705'; rr(c, mx - 7, my - 7, 14, 14, 2); c.fill();
    c.strokeStyle = '#f2b705'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(mx - ca * 40, my - sa * 40); c.lineTo(mx + ca * len, my + sa * len); c.stroke();
    c.strokeStyle = '#b98900'; c.lineWidth = 1;
    for (let d = -36; d < len; d += 10) { c.beginPath(); c.moveTo(mx + ca * d - sa * 2.5, my + sa * d + ca * 2.5); c.lineTo(mx + ca * (d + 10) + sa * 2.5, my + sa * (d + 10) - ca * 2.5); c.stroke(); }
    c.fillStyle = '#6b7280'; c.save(); c.translate(mx - ca * 38, my - sa * 38); c.rotate(a); c.fillRect(-7, -6, 12, 12); c.restore();   // Gegengewicht
    const d = len * (0.55 + Math.sin(t * 0.7) * 0.3);
    c.fillStyle = '#374151'; c.save(); c.translate(mx + ca * d, my + sa * d); c.rotate(a); c.fillRect(-4, -4, 8, 8); c.restore();
    c.fillStyle = '#ff8a3d'; c.fillRect(mx + ca * d - 5, my + sa * d + 9, 10, 6);   // Last am Haken
    c.fillStyle = '#ef4444'; ell(c, mx + ca * len, my + sa * len, 2.4, 2.4); c.fill();
}
export function fence(c, f) {
    c.strokeStyle = '#f97316'; c.lineWidth = 2; c.setLineDash([6, 5]);
    c.strokeRect(f.x - 12, f.y - 12, f.w + 24, f.h + 24); c.setLineDash([]);
}
export { tree };

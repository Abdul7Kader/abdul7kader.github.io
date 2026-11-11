// Dekoration: Laternen, Bänke, Wegweiser, Steg, Brunnen und Flugzeug.
// Koordinaten relativ zum Fußpunkt (x, y).
import { rr, ellipse, signText } from '../draw.js';

const SHADOW = 'rgba(25,50,20,0.2)';
const LAMP = { post: '#3d4a5c', head: '#2b3646', light: '#ffe9a8' };
const BENCH = { wood: '#8a5a35', legs: '#4a4a4a' };
const SIGNPOST = { post: '#7a5235', stations: '#2ec4b6', start: '#ff8a3d', text: '#fff' };
const DOCK = { planks: '#9b6b40', gaps: 'rgba(70,40,15,0.5)', posts: '#6b4a2f' };

/** Umrisse relativ zum Fußpunkt [x0, y0, x1, y1] – für Sprite-Größe und Verdeckung */
export const PROP_BOX = { lamp: [-9, -68, 13, 6], bench: [-32, -22, 32, 8], sign: [-48, -84, 48, 6], dock: [-24, -72, 24, 42] };
/** Lichtpunkt der Laterne (für den Nachtmodus) relativ zum Fußpunkt */
export const LAMP_LIGHT = { dx: 0, dy: -60 };

export function paintProp(c, type, x, y, info) {
    if (type === 'lamp') {
        c.fillStyle = SHADOW; ellipse(c, x + 4, y + 2, 8, 3); c.fill();
        c.fillStyle = LAMP.post; c.fillRect(x - 2, y - 56, 4, 56);
        c.fillStyle = LAMP.head; rr(c, x - 7, y - 66, 14, 12, 4); c.fill();
        c.fillStyle = LAMP.light; rr(c, x - 4, y - 63, 8, 7, 2); c.fill();
    } else if (type === 'bench') {
        c.fillStyle = SHADOW; ellipse(c, x, y + 2, 30, 5); c.fill();
        c.fillStyle = BENCH.wood; rr(c, x - 28, y - 20, 56, 8, 2); c.fill(); rr(c, x - 28, y - 10, 56, 6, 2); c.fill();
        c.fillStyle = BENCH.legs; c.fillRect(x - 24, y - 6, 4, 8); c.fillRect(x + 20, y - 6, 4, 8);
    } else if (type === 'sign') {
        c.fillStyle = SIGNPOST.post; c.fillRect(x - 3, y - 70, 6, 72);
        [[info.t('world.signs.toStations'), -6, SIGNPOST.stations, -0.05], [info.t('world.signs.toStart'), 14, SIGNPOST.start, 0.06]].forEach(([text, dy, col, rot]) => {
            c.save(); c.translate(x, y - 60 + dy * 1.4); c.rotate(rot);
            c.fillStyle = col; rr(c, -40, -9, 80, 18, 4); c.fill();
            signText(c, text, 0, 0, 10, SIGNPOST.text, 800);
            c.restore();
        });
    } else if (type === 'dock') {
        c.fillStyle = DOCK.planks; c.fillRect(x - 18, y - 70, 36, 110);
        c.strokeStyle = DOCK.gaps; c.lineWidth = 2;
        for (let yy = y - 66; yy < y + 40; yy += 10) { c.beginPath(); c.moveTo(x - 18, yy); c.lineTo(x + 18, yy); c.stroke(); }
        c.fillStyle = DOCK.posts; c.fillRect(x - 22, y - 70, 6, 14); c.fillRect(x + 16, y - 70, 6, 14);
    }
}

// ------------------------------------------------------------------ Brunnen (Wasser bewegt sich)
const FOUNTAIN_COL = { rim: '#b8b1a3', basin: '#d9d3c5', water: '#5ec3e6', ripple: 'rgba(255,255,255,0.5)', top: '#c9c2b2' };
const RIPPLE_SPEED = 18, RIPPLE_SPAN = 44;
export function drawFountain(c, f, time) {
    const P = FOUNTAIN_COL, { x, y, r } = f;
    c.fillStyle = P.rim; ellipse(c, x, y + 4, r + 6, (r + 6) * 0.62); c.fill();
    c.fillStyle = P.basin; ellipse(c, x, y, r + 4, (r + 4) * 0.6); c.fill();
    c.fillStyle = P.water; ellipse(c, x, y, r - 6, (r - 6) * 0.58); c.fill();
    c.strokeStyle = P.ripple; c.lineWidth = 2;
    for (let i = 0; i < 2; i++) { const rr2 = ((time * RIPPLE_SPEED + i * 22) % RIPPLE_SPAN) + 4; c.globalAlpha = 1 - rr2 / (RIPPLE_SPAN + 4); ellipse(c, x, y, rr2, rr2 * 0.58); c.stroke(); }
    c.globalAlpha = 1;
    c.fillStyle = P.basin; c.fillRect(x - 6, y - 36, 12, 36);
    c.fillStyle = P.top; ellipse(c, x, y - 36, 14, 6); c.fill();
}

// ------------------------------------------------------------------ Flugzeug (parkt, startet ab und zu)
const PLANE = { body: '#ffffff', stripe: '#2f5d8a', wing: '#dfe7ef', tail: '#ff8a3d', windows: '#7fc8f0', cockpit: '#1b2a4a' };
export function drawPlane(c, x, y, scale, lift) {
    const P = PLANE;
    c.fillStyle = `rgba(20,30,20,${0.25 - lift * 0.15})`;
    ellipse(c, x + lift * 60, y + 6 + lift * 40, 60 * scale, 10 * scale); c.fill();
    c.save(); c.translate(x, y - lift * 60); c.scale(scale, scale);
    c.fillStyle = P.body; rr(c, -60, -12, 120, 22, 11); c.fill();
    c.fillStyle = P.stripe; c.fillRect(-50, -2, 100, 4);
    c.fillStyle = P.wing; c.beginPath(); c.moveTo(-10, 0); c.lineTo(20, 0); c.lineTo(-6, 34); c.lineTo(-24, 34); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-10, -4); c.lineTo(20, -4); c.lineTo(-6, -30); c.lineTo(-24, -30); c.closePath(); c.fill();
    c.fillStyle = P.tail; c.beginPath(); c.moveTo(-60, -10); c.lineTo(-44, -10); c.lineTo(-56, -34); c.lineTo(-66, -34); c.closePath(); c.fill();
    c.fillStyle = P.windows; for (let i = 0; i < 7; i++) { ellipse(c, -30 + i * 10, -5, 2.6, 2.6); c.fill(); }
    c.fillStyle = P.cockpit; ellipse(c, 52, -4, 6, 5); c.fill();
    c.restore();
}
export const PLANE_BOX = [-70, -36, 62, 36];

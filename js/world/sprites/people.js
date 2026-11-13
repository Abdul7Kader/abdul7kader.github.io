// Figuren: Bewohner, Spielfigur (Abdul mit Brille und Bart) und Roboter-Begleiter „Bit“.
// Von vorn symmetrisch, seitlich in Dreiviertel-Ansicht (immer zwei Augen), von hinten ohne Gesicht.
import { TAU } from '../../core/math.js';
import { rr, ellipse } from '../draw.js';

const SHADOW = 'rgba(25,45,20,0.25)';
const SHOE = '#1b1b1f', EYE = '#1c1c1c', EYE_SHINE = 'rgba(255,255,255,0.9)', GLASSES = '#26262b', MOUTH = '#6b3b2a', COLLAR = '#ffffff';
const HEAD_R = 13.5, HEAD_Y = 50;          // Kopf-Radius und Höhe über den Füßen
const STEP_SWING = 4, STEP_BOB = 1.6, IDLE_BOB = 0.4;
const BLINK_THRESHOLD = 0.985;              // seltenes Blinzeln

/** Person zeichnen. o = { look, dir: 'up'|'down'|'left'|'right', moving, walk }; time = Weltzeit in s */
export function drawPerson(c, x, y, o, time) {
    const L = o.look, mv = o.moving, t = o.walk;
    const swing = mv ? Math.sin(t) * STEP_SWING : 0;
    const bob = mv ? Math.abs(Math.sin(t)) * STEP_BOB : Math.sin(time * 2 + x) * IDLE_BOB;
    c.fillStyle = SHADOW; ellipse(c, x, y, 14, 5); c.fill();
    const yb = y - bob;
    const side = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0;
    // Beine und Schuhe
    c.fillStyle = L.pants;
    const lh = 14 + swing * 0.5, rh = 14 - swing * 0.5;
    rr(c, x - 7, yb - 15, 6, lh, 2); c.fill();
    rr(c, x + 1, yb - 15, 6, rh, 2); c.fill();
    c.fillStyle = SHOE;
    rr(c, x - 8, yb - 15 + lh - 3, 8, 4, 2); c.fill();
    rr(c, x, yb - 15 + rh - 3, 8, 4, 2); c.fill();
    // Arme und Hände
    c.fillStyle = L.jacket;
    rr(c, x - 15, yb - 34 + swing * 0.5, 6, 16, 3); c.fill();
    rr(c, x + 9, yb - 34 - swing * 0.5, 6, 16, 3); c.fill();
    c.fillStyle = L.skin;
    ellipse(c, x - 12, yb - 17 + swing * 0.5, 3, 3); c.fill();
    ellipse(c, x + 12, yb - 17 - swing * 0.5, 3, 3); c.fill();
    // Oberkörper
    c.fillStyle = L.jacket;
    rr(c, x - 11, yb - 37, 22, 24, 7); c.fill();
    const sx = side * 2;
    if (o.dir !== 'up') {
        c.fillStyle = L.shirt;
        c.beginPath(); c.moveTo(x - 5 + sx, yb - 37); c.lineTo(x + 5 + sx, yb - 37); c.lineTo(x + sx, yb - 26); c.closePath(); c.fill();
    }
    if (L.hero && o.dir !== 'up') {   // Revers und Hemdkragen der Spielfigur
        c.fillStyle = L.lapel;
        c.beginPath(); c.moveTo(x - 6 + sx, yb - 37); c.lineTo(x - 1 + sx, yb - 26); c.lineTo(x - 9 + sx, yb - 31); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(x + 6 + sx, yb - 37); c.lineTo(x + 1 + sx, yb - 26); c.lineTo(x + 9 + sx, yb - 31); c.closePath(); c.fill();
        c.fillStyle = COLLAR;
        c.beginPath(); c.moveTo(x - 5 + sx, yb - 38); c.lineTo(x + sx, yb - 34); c.lineTo(x - 2 + sx, yb - 39); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(x + 5 + sx, yb - 38); c.lineTo(x + sx, yb - 34); c.lineTo(x + 2 + sx, yb - 39); c.closePath(); c.fill();
    }
    // Kopf und Haare
    const hx = x + side * 1.5, hy = yb - HEAD_Y;
    c.fillStyle = L.skin; ellipse(c, hx, hy, HEAD_R, HEAD_R); c.fill();
    c.fillStyle = L.hair;
    if (o.dir === 'up') { ellipse(c, hx, hy - 1, 13.8, 13); c.fill(); return; }
    c.beginPath(); c.arc(hx, hy - 1, 14, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
    rr(c, hx - 14, hy - 6, 4, 7, 2); c.fill();
    rr(c, hx + 10, hy - 6, 4, 7, 2); c.fill();
    if (L.hero) {   // Haare mit Volumen, seitlich gekämmt
        c.beginPath(); c.ellipse(hx + 2 + sx, hy - 12, 12, 6, -0.15, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.ellipse(hx + 4 + sx, hy - 14, 6, 2, -0.2, 0, TAU); c.fill();
    }
    // Gesicht
    const fx = hx + side * 4;
    if (L.beard) {
        c.fillStyle = L.beard; c.globalAlpha = 0.85;
        c.beginPath(); c.arc(fx, hy - 1, 12.6, 0.12 * Math.PI, 0.88 * Math.PI); c.lineTo(fx - 9, hy + 3); c.quadraticCurveTo(fx, hy + 1, fx + 9, hy + 3); c.closePath(); c.fill();
        c.globalAlpha = 1;
    }
    // Augen: von vorn symmetrisch; seitlich ist das Auge zur Kamera größer, das am Gesichtsrand schmaler
    const eyes = side === 0
        ? [{ x: fx - 4.6, rx: 1.9, ry: 2.2 }, { x: fx + 4.6, rx: 1.9, ry: 2.2 }]
        : [{ x: fx - side * 2.4, rx: 1.9, ry: 2.2 }, { x: fx + side * 5, rx: 1.4, ry: 2.1 }];
    const ey = hy - 2;
    if (L.hero) {   // Augenbrauen
        c.strokeStyle = L.hair; c.lineWidth = 1.8; c.lineCap = 'round';
        c.beginPath();
        eyes.forEach(e => { const w = e.rx * 1.6; c.moveTo(e.x - w, ey - 5.2); c.lineTo(e.x + w, ey - 5.6); });
        c.stroke();
    }
    const lid = Math.sin(time * 1.3 + x) > BLINK_THRESHOLD ? 0.25 : 1;
    eyes.forEach(e => {
        c.fillStyle = EYE; ellipse(c, e.x, ey, e.rx, e.ry * lid); c.fill();
        if (lid === 1) { c.fillStyle = EYE_SHINE; ellipse(c, e.x + 0.6, ey - 0.8, 0.6, 0.6); c.fill(); }
    });
    if (L.glasses) {
        const LENS_PAD = 2.1;
        c.strokeStyle = GLASSES; c.lineWidth = 1.3;
        eyes.forEach(e => { ellipse(c, e.x, ey, e.rx + LENS_PAD, 3.4); c.stroke(); });
        const [a, b] = eyes[0].x < eyes[1].x ? eyes : [eyes[1], eyes[0]];
        c.beginPath(); c.moveTo(a.x + a.rx + LENS_PAD, ey - 0.4); c.lineTo(b.x - b.rx - LENS_PAD, ey - 0.4); c.stroke();
        if (side !== 0) {   // Bügel zum sichtbaren Ohr
            const n = eyes[0];
            c.beginPath(); c.moveTo(n.x - side * (n.rx + LENS_PAD), ey - 0.6); c.lineTo(hx - side * 10, ey - 1.6); c.stroke();
        }
    }
    c.strokeStyle = L.beard ? '#fff' : MOUTH; c.lineWidth = 1.4;
    c.beginPath(); c.arc(fx + side * 1.2, hy + 3, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
}
/** Umriss einer Person relativ zum Fußpunkt (für Verdeckung) */
export const PERSON_BOX = [-16, -66, 16, 6];

// ------------------------------------------------------------------ Roboter „Bit“
const ROBOT = { body: '#ffffff', bodyEdge: '#c6d2e1', visor: '#1b2a4a', eyes: '#4cf0ff', antenna: '#9aa9bd', lightA: '#ff8a3d', lightB: '#ffc24d', thrust: '120,220,255', shadow: 'rgba(25,45,20,0.18)' };
const HOVER_HEIGHT = 36, HOVER_AMPLITUDE = 4;
export function drawRobot(c, x, y, time, hop = 0, tilt = 0) {
    const P = ROBOT, by = y - (HOVER_HEIGHT + Math.sin(time * 3) * HOVER_AMPLITUDE) - hop;
    c.fillStyle = P.shadow; ellipse(c, x, y, 9, 3.5); c.fill();
    if (tilt) { c.save(); c.translate(x, by); c.rotate(tilt); c.translate(-x, -by); }
    c.fillStyle = `rgba(${P.thrust},${0.35 + Math.sin(time * 20) * 0.15})`; ellipse(c, x, by + 12, 5, 3); c.fill();
    c.fillStyle = P.body; c.strokeStyle = P.bodyEdge; c.lineWidth = 1.5;
    rr(c, x - 12, by - 10, 24, 20, 8); c.fill(); c.stroke();
    c.fillStyle = P.visor; rr(c, x - 9, by - 6, 18, 9, 4); c.fill();
    const lid = Math.sin(time * 1.7) > 0.97 ? 0.3 : 1;
    c.fillStyle = P.eyes;
    rr(c, x - 6, by - 4, 4, 5 * lid, 1.5); c.fill();
    rr(c, x + 2, by - 4, 4, 5 * lid, 1.5); c.fill();
    c.strokeStyle = P.antenna; c.beginPath(); c.moveTo(x, by - 10); c.lineTo(x, by - 17); c.stroke();
    c.fillStyle = Math.sin(time * 4) > 0 ? P.lightA : P.lightB; ellipse(c, x, by - 18, 2.6, 2.6); c.fill();
    if (tilt) c.restore();
}
export const ROBOT_BOX = [-13, -62, 13, 4];

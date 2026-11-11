// Zeichenhelfer für die Minispiele (logische Größe 600 × 420, wird auf die Canvas skaliert).
import { TAU } from '../core/math.js';

export const W = 600, H = 420;
export const FONT = 'Outfit, system-ui, sans-serif';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TEXT_OUTLINE = 'rgba(10,16,32,0.55)';

export function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
export function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
/** Text mit optionaler dunkler Kontur (stroke = Konturbreite) */
export function txt(c, s, x, y, size, col, align = 'center', weight = 800, stroke = 0) {
    c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
    if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = TEXT_OUTLINE; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
}
export function emo(c, s, x, y, size) { c.font = `${size}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(s, x, y); }
export function starPath(c, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
}
/** Text auf eine oder zwei Zeilen verteilen, damit er in maxW passt */
export function fitLabel(c, s, x, y, maxW, size, col) {
    c.font = `800 ${size}px ${FONT}`;
    if (c.measureText(s).width <= maxW || !s.includes(' ')) { txt(c, s, x, y, size, col); return; }
    const words = s.split(' ');
    let best = null;
    for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        const d = Math.max(c.measureText(a).width, c.measureText(b).width);
        if (!best || d < best.d) best = { d, a, b };
    }
    const fs = best.d > maxW ? size * maxW / best.d : size;
    txt(c, best.a, x, y - fs * 0.55, fs, col); txt(c, best.b, x, y + fs * 0.55, fs, col);
}

// Gemeinsame Zeichenhelfer für alle Canvas-Flächen (Welt, Minispiele, Projekt-Viertel, Finale).
import { TAU } from './math.js';

export const FONT = 'Outfit, system-ui, sans-serif';
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** Rechteck mit runden Ecken als Pfad (r: Zahl oder Liste wie bei roundRect) */
export function rr(c, x, y, w, h, r) {
    c.beginPath();
    if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
    const k = Array.isArray(r) ? r[0] : r;
    c.moveTo(x + k, y); c.arcTo(x + w, y, x + w, y + h, k); c.arcTo(x + w, y + h, x, y + h, k);
    c.arcTo(x, y + h, x, y, k); c.arcTo(x, y, x + w, y, k); c.closePath();
}

/** Ellipse als Pfad (optional gedreht) */
export function ellipse(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }

/** Stern als Pfad */
export function starPath(c, x, y, outer, inner, points = 5, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) { const r = i % 2 ? inner : outer, a = rot + i * Math.PI / points; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    c.closePath();
}

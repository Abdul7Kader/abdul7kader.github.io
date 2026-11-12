// Zeichenhelfer für die Minispiele (logische Größe 600 × 420, wird auf die Canvas skaliert).
import { FONT, EMOJI_FONT } from '../core/canvas.js';
export { FONT, rr, ellipse as ell, starPath } from '../core/canvas.js';

export const W = 600, H = 420;
const TEXT_OUTLINE = 'rgba(10,16,32,0.55)';

/** Text mit optionaler dunkler Kontur (stroke = Konturbreite) */
export function txt(c, s, x, y, size, col, align = 'center', weight = 800, stroke = 0) {
    c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
    if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = TEXT_OUTLINE; c.strokeText(s, x, y); }
    c.fillStyle = col; c.fillText(s, x, y);
}
export function emo(c, s, x, y, size) { c.font = `${size}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(s, x, y); }
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

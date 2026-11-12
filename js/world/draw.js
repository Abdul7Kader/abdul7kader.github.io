// Zeichenhelfer für die Welt (Canvas 2D). Grundformen kommen aus core/canvas.js.
import { FONT } from '../core/canvas.js';
export { FONT, EMOJI_FONT, rr, ellipse, starPath } from '../core/canvas.js';

/** Zentrierter Text */
export function signText(c, text, x, y, size, col = '#fff', weight = 700) {
    c.font = `${weight} ${size}px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = col; c.fillText(text, x, y);
}

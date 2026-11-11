// Minimap unten rechts: Stationen, sichtbarer Ausschnitt, Spielfigur. Klick = hinlaufen.
import { $ } from '../core/dom.js';
import { TAU } from '../core/math.js';
import { MINIMAP_SNAP } from '../config/layout.js';
import { MINIMAP, stationColors } from '../config/theme.js';
import { World } from '../world/world.js';
import { progress } from '../app/progress.js';
import { audio } from '../core/audio.js';

const MAX_DPR = 2, DOT_R = 9, PULSE_S = 1.2, PULSE_GROW = 10;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
let base = null;   // Boden verkleinert, einmal je Größe/Farbmodus

export const resetMinimap = () => { base = null; };

export function drawMinimap() {
    const cnv = $('#minimap-cnv');
    if (!cnv || $('#minimap').classList.contains('hidden') || !World.player) return;
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const cw = cnv.clientWidth, ch = cnv.clientHeight;
    if (!cw || !ch) return;                                   // ausgeblendet (z. B. auf dem Handy)
    if (cnv.width !== Math.round(cw * dpr)) { cnv.width = Math.round(cw * dpr); cnv.height = Math.round(ch * dpr); base = null; }
    const c = cnv.getContext('2d'), sx = cnv.width / World.W, sy = cnv.height / World.H;
    if (!base) {
        base = document.createElement('canvas');
        base.width = cnv.width; base.height = cnv.height;
        const b = base.getContext('2d');
        b.imageSmoothingQuality = 'high';
        b.drawImage(World.groundCanvas(), 0, 0, base.width, base.height);
        b.fillStyle = MINIMAP.veil; b.fillRect(0, 0, base.width, base.height);
    }
    c.drawImage(base, 0, 0);
    const next = progress.nextId(), t = performance.now() / 1000, r = DOT_R * dpr;
    c.font = `${11 * dpr}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const s of World.stations) {
        const x = (s.x + s.w / 2) * sx, y = (s.base - s.height / 2) * sy, got = progress.visited.has(s.id);
        if (s.id === next) {
            const k = (t % PULSE_S) / PULSE_S;
            c.strokeStyle = stationColors(s.id)[0]; c.lineWidth = 2 * dpr; c.globalAlpha = 1 - k;
            c.beginPath(); c.arc(x, y, r + k * PULSE_GROW * dpr, 0, TAU); c.stroke(); c.globalAlpha = 1;
        }
        c.fillStyle = got ? MINIMAP.visitedFill : stationColors(s.id)[0];
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.strokeStyle = got ? MINIMAP.visitedStroke : '#fff'; c.lineWidth = 1.6 * dpr; c.stroke();
        c.fillText(got ? '✅' : s.emoji, x, y + 0.5 * dpr);
    }
    const v = World.view();
    c.strokeStyle = MINIMAP.viewport; c.lineWidth = 1.5 * dpr;
    c.strokeRect(Math.max(1, v.x * sx), Math.max(1, v.y * sy), Math.min(cnv.width - 2, v.w * sx), Math.min(cnv.height - 2, v.h * sy));
    const p = World.player;
    c.fillStyle = MINIMAP.playerHalo; c.beginPath(); c.arc(p.x * sx, p.y * sy, (6 + Math.sin(t * 5) * 2) * dpr, 0, TAU); c.fill();
    c.fillStyle = MINIMAP.player; c.strokeStyle = '#fff'; c.lineWidth = 2 * dpr;
    c.beginPath(); c.arc(p.x * sx, p.y * sy, 4.5 * dpr, 0, TAU); c.fill(); c.stroke();
}

export function minimapClick(e) {
    const r = $('#minimap-cnv').getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * World.W, y = (e.clientY - r.top) / r.height * World.H;
    let best = null, bd = Infinity;
    for (const s of World.stations) { const d = Math.hypot(s.x + s.w / 2 - x, s.base - s.height / 2 - y); if (d < bd) { bd = d; best = s; } }
    audio.play('click');
    if (best && bd < MINIMAP_SNAP) World.walkToStation(best.id); else World.walkToPoint(x, y);
}

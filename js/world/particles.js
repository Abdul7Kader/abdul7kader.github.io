// Partikel der Welt: Staub beim Laufen, Funken, Ringe (Klickziel), Brunnentropfen, Konfetti, Text beim Einsammeln.
import { TAU } from '../core/math.js';
import { WORLD_PERF } from '../config/performance.js';
import { ellipse, signText } from './draw.js';
import { state } from './state.js';

const CONFETTI_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c'];
const CONFETTI = { minSpeed: 120, speedRange: 260, upward: 220, gravity: 420, maxFall: 90, drag: 0.985, life: 1.6 };
const RING_LIFE = 0.6;

export function spawn(p) { if (state.particles.length < WORLD_PERF.MAX_PARTICLES) state.particles.push(p); }
export const spawnRing = (x, y) => spawn({ type: 'ring', x, y, life: 0, max: RING_LIFE });

export function confetti(x, y, n = 80) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, v = CONFETTI.minSpeed + Math.random() * CONFETTI.speedRange;
        spawn({ type: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - CONFETTI.upward, g: CONFETTI.gravity, life: 0, max: CONFETTI.life + Math.random(),
            col: CONFETTI_COLORS[i % CONFETTI_COLORS.length], rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12 });
    }
}

/** Bewegt alle Partikel; gibt die Anzahl „wichtiger“ Partikel zurück (ohne Deko: Brunnentropfen, Glitzern) */
export function updateParticles(dt) {
    const ps = state.particles;
    let lively = 0;
    for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life += dt;
        const landed = p.type === 'drop' && p.y > p.floor && p.vy > 0;
        if (p.life > p.max || landed) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }   // ohne splice: Reihenfolge egal
        if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; }
        if (p.g) p.vy += p.g * dt;
        if (p.type === 'confetti') { p.vx *= CONFETTI.drag; p.rot += p.vr * dt; if (p.vy > CONFETTI.maxFall) p.vy = CONFETTI.maxFall; }
        if (p.type !== 'drop') lively++;
    }
    return lively;
}

export function drawParticles(c, zoom) {
    for (const p of state.particles) {
        const k = p.life / p.max;
        if (p.type === 'dust') { c.fillStyle = `rgba(200,180,140,${0.5 * (1 - k)})`; ellipse(c, p.x, p.y, 3 + k * 6, 2 + k * 3); c.fill(); }
        else if (p.type === 'spark') { c.fillStyle = `rgba(255,210,60,${1 - k})`; ellipse(c, p.x, p.y, 3 * (1 - k) + 1, 3 * (1 - k) + 1); c.fill(); }
        else if (p.type === 'ring') { c.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; c.lineWidth = 3; ellipse(c, p.x, p.y, 8 + k * 26, (8 + k * 26) * 0.45); c.stroke(); }
        else if (p.type === 'drop' && p.glint) { c.fillStyle = `rgba(255,210,60,${1 - k})`; ellipse(c, p.x, p.y, 3 * (1 - k) + 1, 3 * (1 - k) + 1); c.fill(); }
        else if (p.type === 'drop') { c.fillStyle = 'rgba(180,230,255,0.85)'; ellipse(c, p.x, p.y, 2, 2.6); c.fill(); }
        else if (p.type === 'text') { c.globalAlpha = 1 - k; signText(c, p.text, p.x, p.y - k * 40, 15 / Math.max(zoom, 0.8), '#e08a00', 800); c.globalAlpha = 1; }
        else if (p.type === 'confetti') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = Math.min(1, (1 - k) * 2); c.fillStyle = p.col; c.fillRect(-4, -2.5, 8, 5); c.restore(); }
    }
}

// Freizeit & Ehrenamt: „SUP-Slalom“ – das Board folgt Maus oder Finger; Felsen ausweichen, Sterne sammeln.
import { clamp, lerp, rand } from '../core/math.js';
import { t } from '../core/i18n.js';
import { isTouch } from '../core/env.js';
import { W, H, rr, ell, txt, starPath } from './draw.js';

const RIVER = { left: W / 2 - 190, right: W / 2 + 190 };
const LANES = [W / 2 - 125, W / 2, W / 2 + 125];
const SPEED = { start: 250, gain: 10, max: 460, idle: 110, catchUp: 1.2, crashFactor: 0.6 };
const ROW = { min: 0.55, max: 0.8, logChance: 0.2, logAfter: 2, rockChance: 0.55 };
const EXTRA = { duck: 0.08, ramp: 0.17, rampAfter: 3, star: 0.85 };
const JUMP_S = 0.85, INVULNERABLE_S = 1.1, BANK_ITEMS = 16, BANK_GAP = 60;
const BOARD_Y = H - 96, BOARD_FOLLOW = 13;

export default {
    id: 'lake', icon: '🏄', color: '#06b6d4', time: 15, stars: [7, 18, 32],
    controls: ['mouse', 'swipe', 'arrows'],
    make(g) {
        const p = { lane: 1, x: LANES[1], y: BOARD_Y, inv: 0, jump: 0, wob: 0, paddle: 0 };
        let speed = SPEED.start, scroll = 0, rowT = 0.6, objs = [];
        const banks = Array.from({ length: BANK_ITEMS }, (_, i) => ({ side: i % 2, y: i * BANK_GAP, s: rand(0.8, 1.3), off: rand(0, 40), kind: Math.random() < 0.7 ? 'tree' : 'rock' }));
        function spawnRow() {
            const free = Math.floor(Math.random() * 3);
            if (Math.random() < ROW.logChance && g.t > ROW.logAfter && free !== 1) {
                const startL = free === 0 ? 1 : 0;
                objs.push({ kind: 'log', x: (LANES[startL] + LANES[startL + 1]) / 2, y: -40, hw: 100, hh: 14 });
            } else {
                for (let l = 0; l < 3; l++) if (l !== free && Math.random() < ROW.rockChance) objs.push({ kind: 'rock', x: LANES[l] + rand(-10, 10), y: -40 - rand(0, 30), hw: 26, hh: 22 });
            }
            const q = Math.random();
            const kind = q < EXTRA.duck ? 'duck' : q < EXTRA.ramp && g.t > EXTRA.rampAfter ? 'ramp' : q < EXTRA.star ? 'star' : null;
            if (kind === 'star') for (let i = 0; i < 3; i++) objs.push({ kind, x: LANES[free], y: -40 - i * 46, hw: 18, hh: 18 });
            else if (kind) objs.push({ kind, x: LANES[free], y: -50, hw: kind === 'ramp' ? 40 : 20, hh: kind === 'ramp' ? 20 : 18 });
        }
        function setLane(l) {
            const nl = clamp(l, 0, 2);
            if (nl !== p.lane) { p.lane = nl; g.sfx('step'); g.burst(p.x, p.y + 20, 6, ['#e0fbff', '#fff'], 100, { grav: 0, life: 0.4, size: 4 }); }
        }
        // Board folgt dem Zeiger: nächstliegende Spur, die Bewegung dorthin ist weich
        function follow(x) {
            let best = 0;
            LANES.forEach((lx, i) => { if (Math.abs(x - lx) < Math.abs(x - LANES[best])) best = i; });
            setLane(best);
        }
        function collide(o) {
            if (o.kind === 'star') { o.done = true; g.hit(1, o.x, o.y - 26); g.sfx('coin'); g.burst(o.x, o.y, 10, ['#ffd166', '#fff'], 160, { shape: 'star', size: 5, grav: 0 }); }
            else if (o.kind === 'duck') { o.done = true; g.hit(4, o.x, o.y - 30, t('games.lake.duck'), '#ffd166'); g.sfx('bonus'); g.ring(o.x, o.y, '#ffd166', 40); g.burst(o.x, o.y, 20, ['#ffd166', '#ffb703', '#fff'], 240, { shape: 'star', size: 6, grav: 0 }); }
            else if (o.kind === 'ramp') { if (p.jump <= 0) { o.done = true; p.jump = JUMP_S; g.add(2, o.x, o.y - 40, t('games.lake.air'), '#7ee8fa'); g.sfx('whoosh'); } }
            else if (p.jump <= 0 && p.inv <= 0) {
                o.done = true; p.inv = INVULNERABLE_S; p.wob = 0.6; speed *= SPEED.crashFactor;
                g.miss(p.x, p.y - 50, t('games.lake.splash'));
                g.burst(p.x, p.y, 26, ['#bdefff', '#fff', '#7dd3fc'], 300, { grav: 600, size: 6 });
            }
        }
        function drawObject(c, o) {
            if (o.kind === 'rock') {
                if (o.done) c.globalAlpha = 0.5;
                c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, o.x, o.y + 6, o.hw + 6, o.hh); c.fill();
                c.fillStyle = '#6b7280'; ell(c, o.x, o.y, o.hw, o.hh * 0.9); c.fill();
                c.fillStyle = '#9ca3af'; ell(c, o.x - 6, o.y - 6, o.hw * 0.5, o.hh * 0.45); c.fill();
                c.globalAlpha = 1;
            } else if (o.kind === 'log') {
                c.fillStyle = 'rgba(255,255,255,0.45)'; rr(c, o.x - o.hw - 6, o.y - o.hh + 4, o.hw * 2 + 12, o.hh * 2 + 6, 14); c.fill();
                c.fillStyle = '#8b5a2b'; rr(c, o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2, 12); c.fill();
                c.fillStyle = '#a97142'; ell(c, o.x + o.hw - 8, o.y, 8, o.hh - 2); c.fill();
                c.strokeStyle = '#6b4220'; c.lineWidth = 2; for (let x = o.x - o.hw + 20; x < o.x + o.hw - 24; x += 30) { c.beginPath(); c.moveTo(x, o.y - 8); c.lineTo(x + 14, o.y - 8); c.stroke(); }
            } else if (o.kind === 'star') {
                const s = 1 + Math.sin(g.now * 6 + o.y * 0.05) * 0.1;
                c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, o.x, o.y + 4, 16, 8); c.fill();
                c.fillStyle = '#ffd166'; starPath(c, o.x, o.y, 14 * s, 6 * s); c.fill();
                c.strokeStyle = '#f59e0b'; c.lineWidth = 2; c.stroke();
            } else if (o.kind === 'duck') {
                const bob = Math.sin(g.now * 5) * 2;
                c.fillStyle = 'rgba(255,255,255,0.4)'; ell(c, o.x, o.y + 10, 24, 8); c.fill();
                c.fillStyle = '#ffd60a'; ell(c, o.x, o.y + bob, 18, 13); c.fill(); ell(c, o.x - 8, o.y - 12 + bob, 10, 10); c.fill();
                c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(o.x - 17, o.y - 12 + bob); c.lineTo(o.x - 26, o.y - 9 + bob); c.lineTo(o.x - 17, o.y - 6 + bob); c.fill();
                c.fillStyle = '#1b2a4a'; ell(c, o.x - 10, o.y - 14 + bob, 1.8, 1.8); c.fill();
            } else if (o.kind === 'ramp') {
                c.fillStyle = '#c08552'; rr(c, o.x - o.hw, o.y - o.hh, o.hw * 2, o.hh * 2, 6); c.fill();
                c.fillStyle = '#7ee8fa';
                for (let i = 0; i < 2; i++) { const yy = o.y + 4 - i * 12; c.beginPath(); c.moveTo(o.x - 14, yy + 6); c.lineTo(o.x, yy - 4); c.lineTo(o.x + 14, yy + 6); c.lineTo(o.x + 14, yy + 1); c.lineTo(o.x, yy - 9); c.lineTo(o.x - 14, yy + 1); c.closePath(); c.fill(); }
            }
        }
        function drawBoard(c) {
            const js = p.jump > 0 ? Math.sin((1 - p.jump / JUMP_S) * Math.PI) : 0, sc = 1 + js * 0.35;
            c.fillStyle = 'rgba(0,40,80,0.25)'; ell(c, p.x + js * 16, p.y + 6 + js * 18, 16, 44); c.fill();
            c.save(); c.translate(p.x, p.y - js * 20); c.scale(sc, sc);
            c.rotate((LANES[p.lane] - p.x) * -0.004 + (p.wob > 0 ? Math.sin(p.wob * 30) * 0.15 : 0));
            if (p.inv > 0 && Math.floor(p.inv * 12) % 2) c.globalAlpha = 0.5;
            c.fillStyle = '#fff'; ell(c, 0, 0, 15, 44); c.fill();
            c.fillStyle = '#ff8a3d'; ell(c, 0, 0, 5, 40); c.fill();
            const pa = Math.sin(p.paddle);
            c.strokeStyle = '#334155'; c.lineWidth = 3; c.beginPath(); c.moveTo(-22 * pa, -20); c.lineTo(22 * pa, 10); c.stroke();
            c.fillStyle = '#334155'; ell(c, 22 * pa, 12, 4, 8); c.fill();
            c.fillStyle = '#1b2a4a'; ell(c, 0, -2, 11, 9); c.fill();
            c.fillStyle = '#e0a979'; ell(c, 0, -10, 8, 8); c.fill();
            c.fillStyle = '#2b1d14'; ell(c, 0, -13, 8, 5); c.fill();
            c.restore(); c.globalAlpha = 1;
        }
        return {
            update(dt) {
                const live = g.state === 'play';
                if (live) speed = lerp(speed, Math.min(SPEED.max, SPEED.start + g.t * SPEED.gain), dt * SPEED.catchUp);
                const sp = live ? speed : SPEED.idle;
                scroll += sp * dt; p.paddle += dt * (live ? 5 : 2);
                for (const b of banks) { b.y += sp * dt; if (b.y > H + 60) { b.y -= BANK_ITEMS * BANK_GAP; b.kind = Math.random() < 0.7 ? 'tree' : 'rock'; b.off = rand(0, 40); } }
                if (!live) p.lane = 1 + Math.round(Math.sin(g.now * 0.8));
                p.x = lerp(p.x, LANES[p.lane], Math.min(1, dt * BOARD_FOLLOW));
                p.inv = Math.max(0, p.inv - dt); p.jump = Math.max(0, p.jump - dt); p.wob = Math.max(0, p.wob - dt);
                if (live) { rowT -= dt * sp / SPEED.start; if (rowT <= 0) { spawnRow(); rowT = rand(ROW.min, ROW.max); } }
                if (live && Math.random() < 0.7) g.burst(p.x + rand(-8, 8), p.y + 40, 1, ['rgba(255,255,255,0.8)'], 40, { dir: Math.PI / 2, spread: 0.8, grav: -40, life: 0.5, size: 4 });
                for (const o of objs) {
                    o.y += sp * dt;
                    if (live && !o.done && Math.abs(o.x - p.x) < o.hw + 14 && Math.abs(o.y - p.y) < o.hh + 26) collide(o);
                }
                objs = objs.filter(o => o.y < H + 80 && !(o.done && o.kind !== 'rock' && o.kind !== 'log'));
            },
            draw(c) {
                const { left: RL, right: RR } = RIVER;
                c.fillStyle = '#6fbf5a'; c.fillRect(0, 0, W, H);
                const water = c.createLinearGradient(RL, 0, RR, 0);
                water.addColorStop(0, '#38bdf8'); water.addColorStop(0.5, '#0ea5e9'); water.addColorStop(1, '#38bdf8');
                c.fillStyle = '#e8d3a8'; c.fillRect(RL - 14, 0, RR - RL + 28, H);
                c.fillStyle = water; c.fillRect(RL, 0, RR - RL, H);
                c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5; c.lineCap = 'round';
                for (let i = 0; i < 14; i++) {
                    const y = ((i * 47 + scroll) % (H + 40)) - 20, x = RL + 30 + ((i * 137) % (RR - RL - 60));
                    c.beginPath(); c.moveTo(x - 12, y); c.quadraticCurveTo(x, y - 6, x + 12, y); c.stroke();
                }
                c.strokeStyle = 'rgba(255,255,255,0.12)'; c.setLineDash([14, 18]); c.lineWidth = 2;
                [(LANES[0] + LANES[1]) / 2, (LANES[1] + LANES[2]) / 2].forEach(x => { c.beginPath(); c.moveTo(x, -20 + (scroll % 32)); c.lineTo(x, H); c.stroke(); });
                c.setLineDash([]);
                for (const b of banks) {
                    const x = b.side ? RR + 30 + b.off : RL - 30 - b.off;
                    if (b.kind === 'tree') { c.fillStyle = 'rgba(0,0,0,0.12)'; ell(c, x + 6, b.y + 8, 22 * b.s, 20 * b.s); c.fill(); c.fillStyle = '#3f9d4a'; ell(c, x, b.y, 22 * b.s, 22 * b.s); c.fill(); c.fillStyle = '#58b964'; ell(c, x - 5, b.y - 5, 12 * b.s, 12 * b.s); c.fill(); }
                    else { c.fillStyle = '#9aa5b1'; ell(c, x, b.y, 14 * b.s, 10 * b.s); c.fill(); }
                }
                for (const o of objs) drawObject(c, o);
                drawBoard(c);
                if (g.state === 'play' && g.t < 2.4) { c.globalAlpha = 1 - g.t / 2.4; txt(c, isTouch ? t('games.lake.hintTouch') : t('games.lake.hintMouse'), W / 2, 90, 17, '#fff', 'center', 800, 5); c.globalAlpha = 1; }
            },
            down(pp) { follow(pp.x); },
            move(pp) { follow(pp.x); },
            key(k, down, _g, rep) {
                if (!down || rep) return ['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k);
                if (k === 'ArrowLeft' || k === 'a' || k === 'A') { setLane(p.lane - 1); return true; }
                if (k === 'ArrowRight' || k === 'd' || k === 'D') { setLane(p.lane + 1); return true; }
            }
        };
    }
};

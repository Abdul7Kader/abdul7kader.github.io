// Business-Viertel: „Prompt-Fabrik“ – ein sicherer KI-Workflow in fünf Schritten.
// Sicher ausgeliefert wird nur, wenn der Mensch den Ablauf steuert: Anforderung klären, Plan prüfen,
// entwickeln (mit Unterstützung des KI-Agenten), selbst reviewen (Human in the Loop), testen. Die Schritte fahren übers Fließband –
// den Schritt antippen, dessen Platz gerade leuchtet. Störkarten („Ungeprüft übernehmen“) kosten die Combo.
import { TAU, lerp, easeOut, pick } from '../core/math.js';
import { t } from '../core/i18n.js';
import { W, H, rr, ell, txt, emo, fitLabel } from './draw.js';

const STEPS = [
    { k: 'requirement', ic: '🎯', col: '#7b5cff' }, { k: 'plan', ic: '🗺️', col: '#3a86ff' }, { k: 'code', ic: '🤖', col: '#0e9f9a' },
    { k: 'review', ic: '🧑‍💻', col: '#e08600' }, { k: 'tests', ic: '✅', col: '#16a34a' }
];
const TRAPS = [{ k: 'unchecked', ic: '⚠️', col: '#8b93a3', trap: true }, { k: 'unclear', ic: '❓', col: '#9aa1ad', trap: true }];
const N = STEPS.length;
const BELT_Y = 312, CARD = { w: 108, h: 60 };
const SLOT = { y: 150, w: 76, h: 58, x0: 176, gap: 6 };
const ROBOT = { x: 92, y: 150 };
const SPAWN = { first: 0.2, neededShare: 0.42, trapShare: 0.16, minGap: 0.5, startGap: 0.82, faster: 0.015 };
const SPEED = { start: 150, gain: 7, idle: 40 };
const SHIP_DELAY_MS = 260, SHIP_BONUS = 5;
const stepName = (s) => t(`games.career.steps.${s.k}`);
const slotX = (i) => SLOT.x0 + i * (SLOT.w + SLOT.gap) + SLOT.w / 2;

export default {
    id: 'career', icon: '🤖', color: '#7b5cff', time: 15, stars: [10, 24, 40],
    controls: ['click', 'tap'],
    resultParams: (g) => ({ n: g.shipped || 0 }),
    // Hintergrund mit Raster: unbewegt, einmal zeichnen
    bg(c) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#f1edff'); g.addColorStop(1, '#e2f3ff');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(123,92,255,0.07)'; c.lineWidth = 1;
        c.beginPath();
        for (let x = 0; x < W; x += 30) { c.moveTo(x, 0); c.lineTo(x, H); }
        for (let y = 0; y < H; y += 30) { c.moveTo(0, y); c.lineTo(W, y); }
        c.stroke();
    },
    make(g) {
        g.shipped = 0;
        let items = [], flying = [], filled = 0, spawnT = SPAWN.first, speed = SPEED.start, belt = 0, outputs = [], shipped = 0;
        const robo = { happy: 0, think: 0 };
        function spawn() {
            const need = STEPS[filled % N], r = Math.random();
            const kind = r < SPAWN.neededShare ? need : r < SPAWN.neededShare + SPAWN.trapShare ? pick(TRAPS) : pick(STEPS);
            items.push({ kind, x: W + CARD.w / 2 + 4, y: BELT_Y, shake: 0, wob: Math.random() * TAU });
        }
        function tap(it) {
            if (filled >= N) return;
            const need = STEPS[filled];
            if (it.kind !== need) {
                it.shake = 0.4;
                g.miss(it.x, it.y - 46, it.kind.trap ? t(`games.career.trapMsg.${it.kind.k}`) : t('games.career.firstNeed', { step: stepName(need) }));
                return;
            }
            it.dead = true;
            flying.push({ kind: it.kind, x: it.x, y: it.y, tx: slotX(filled), ty: SLOT.y, t: 0 });
            g.hit(1, it.x, it.y - 46, stepName(it.kind), '#fff');
            g.sfx('pop');
            filled++;
            if (filled === N) {
                shipped++; g.shipped = shipped;
                robo.think = 0.3;
                setTimeout(() => {
                    if (g.state !== 'play') return;
                    g.add(SHIP_BONUS, 100, 92, t('games.career.shipped'), '#ffd166');
                    g.sfx('bonus'); g.flash('#e9e3ff', 0.35);
                    g.burst(ROBOT.x, ROBOT.y, 26, ['#ffd166', '#b9a8ff', '#fff', '#7ee8fa'], 300, { shape: 'star', size: 6, grav: 120 });
                    robo.happy = 1.2;
                    outputs.push({ x: ROBOT.x, y: ROBOT.y, t: 0 });
                    filled = 0;
                }, SHIP_DELAY_MS);
            }
        }
        function card(c, kind, x, y, s = 1, alpha = 1) {
            const { w, h } = CARD;
            c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = alpha;
            c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -w / 2 + 2, -h / 2 + 5, w, h, 14); c.fill();
            c.fillStyle = kind.col; rr(c, -w / 2, -h / 2, w, h, 14); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.18)'; rr(c, -w / 2 + 4, -h / 2 + 4, w - 8, h / 2 - 4, 10); c.fill();
            emo(c, kind.ic, -w / 2 + 20, 0, 21);
            fitLabel(c, kind.trap ? t(`games.career.traps.${kind.k}`) : stepName(kind), 15, 1, w - 44, 13, '#fff');
            c.restore(); c.globalAlpha = 1;
        }
        function drawRobot(c) {
            const rx = ROBOT.x, ry = ROBOT.y + Math.sin(g.now * 3) * 4 - robo.happy * 6;
            c.strokeStyle = '#4b4f6b'; c.lineWidth = 4; c.beginPath(); c.moveTo(rx, ry - 50); c.lineTo(rx, ry - 66); c.stroke();
            c.fillStyle = robo.think > 0 || robo.happy > 0 ? '#ffd166' : '#ff6b8b'; ell(c, rx, ry - 70, 7, 7); c.fill();
            c.fillStyle = '#ffffff'; rr(c, rx - 56, ry - 50, 112, 92, 26); c.fill();
            c.strokeStyle = '#d6d9ec'; c.lineWidth = 3; c.stroke();
            c.fillStyle = '#1d2147'; rr(c, rx - 42, ry - 36, 84, 50, 16); c.fill();
            c.strokeStyle = '#7ee8fa'; c.fillStyle = '#7ee8fa'; c.lineWidth = 4; c.lineCap = 'round';
            if (robo.happy > 0) [-16, 16].forEach(dx => { c.beginPath(); c.arc(rx + dx, ry - 8, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); });
            else if (robo.think > 0) [-18, 0, 18].forEach((dx, i) => { ell(c, rx + dx, ry - 11 + Math.sin(g.now * 14 + i) * 3, 4, 4); c.fill(); });
            else { const lid = Math.sin(g.now * 1.7) > 0.96 ? 1.5 : 7; [-16, 16].forEach(dx => { ell(c, rx + dx, ry - 11, 6, lid); c.fill(); }); }
            c.fillStyle = '#7b5cff'; rr(c, rx - 30, ry + 22, 60, 10, 5); c.fill();
            txt(c, t('games.career.agent'), rx, ry + 58, 11, g.ink('#5b5f80'));
            for (const o of outputs) {   // Ergebnisse, die der Roboter „ausspuckt“
                const k = easeOut(o.t);
                c.save(); c.globalAlpha = 1 - Math.max(0, o.t - 0.8) / 0.4;
                c.translate(o.x + 10 + k * 60, o.y - 70 - k * 50); c.rotate(-0.2 + k * 0.2);
                c.fillStyle = '#fff'; rr(c, -42, -28, 84, 56, 10); c.fill();
                c.strokeStyle = '#16a34a'; c.lineWidth = 3; c.stroke();
                txt(c, '✓', -22, 0, 22, '#16a34a'); c.fillStyle = '#c9cde0';
                [-12, 0, 12].forEach(y => c.fillRect(-6, y - 2, 36 - Math.abs(y), 4));
                c.restore();
            }
        }
        function drawWorkflow(c) {
            c.fillStyle = '#ffffff'; rr(c, SLOT.x0 - 12, SLOT.y - 58, N * (SLOT.w + SLOT.gap) - SLOT.gap + 24, 108, 20); c.fill();
            c.strokeStyle = '#e1dcff'; c.lineWidth = 2; c.stroke();
            txt(c, t('games.career.workflow'), SLOT.x0, SLOT.y - 40, 11, '#7b5cff', 'left', 800);
            c.strokeStyle = '#d6d0f5'; c.lineWidth = 2;
            for (let i = 0; i < N - 1; i++) { const ax = slotX(i) + SLOT.w / 2, y = SLOT.y + 6; c.beginPath(); c.moveTo(ax, y); c.lineTo(ax + SLOT.gap, y); c.stroke(); }
            STEPS.forEach((p, i) => {
                const x = slotX(i), y = SLOT.y + 6, isNext = i === filled && g.state === 'play';
                if (i < filled) {
                    c.fillStyle = p.col; rr(c, x - SLOT.w / 2, y - SLOT.h / 2, SLOT.w, SLOT.h, 12); c.fill();
                    emo(c, p.ic, x, y - 12, 18); fitLabel(c, stepName(p), x, y + 14, SLOT.w - 8, 10.5, '#fff');
                    return;
                }
                const pulse = isNext ? 0.5 + Math.sin(g.now * 8) * 0.5 : 0;
                c.fillStyle = isNext ? p.col + '33' : '#f4f2fb'; rr(c, x - SLOT.w / 2, y - SLOT.h / 2, SLOT.w, SLOT.h, 12); c.fill();
                c.setLineDash([6, 5]); c.strokeStyle = p.col; c.lineWidth = isNext ? 3 + pulse * 2 : 2; c.globalAlpha = isNext ? 1 : 0.45;
                c.stroke(); c.setLineDash([]);
                emo(c, p.ic, x, y - 12, 18); fitLabel(c, stepName(p), x, y + 14, SLOT.w - 8, 10.5, p.col);
                c.globalAlpha = 1;
            });
        }
        return {
            update(dt) {
                const live = g.state === 'play';
                if (live) {
                    speed = SPEED.start + g.t * SPEED.gain;
                    spawnT -= dt;
                    if (spawnT <= 0) { spawn(); spawnT = Math.max(SPAWN.minGap, SPAWN.startGap - g.t * SPAWN.faster); }
                } else if (!items.length && g.state !== 'over') {
                    for (let i = 0; i < 5; i++) items.push({ kind: i % 2 ? pick(TRAPS) : STEPS[i], x: 70 + i * 120, y: BELT_Y, shake: 0, wob: 0 });
                }
                const sp = live ? speed : SPEED.idle;
                belt += sp * dt;
                for (const it of items) { it.x -= sp * dt; it.shake = Math.max(0, it.shake - dt); }
                items = items.filter(it => !it.dead && it.x > -CARD.w);
                if (!live && g.state !== 'over') for (const it of items) if (it.x < -CARD.w / 2 + 5) it.x += W + CARD.w;
                for (const f of flying) f.t += dt * 3.2;
                flying = flying.filter(f => f.t < 1);
                robo.happy = Math.max(0, robo.happy - dt); robo.think = Math.max(0, robo.think - dt);
                for (const o of outputs) o.t += dt;
                outputs = outputs.filter(o => o.t < 1.2);
            },
            draw(c) {
                drawRobot(c);
                drawWorkflow(c);
                c.fillStyle = '#3b3f5c'; rr(c, -10, BELT_Y - 10, W + 20, 56, 12); c.fill();   // Fließband
                c.fillStyle = '#4b5072';
                for (let x = -(belt % 34); x < W + 34; x += 34) c.fillRect(x, BELT_Y - 6, 16, 48);
                c.fillStyle = '#2b2e45'; for (let x = 20; x < W; x += 70) { ell(c, x, BELT_Y + 52, 12, 12); c.fill(); }
                for (const it of items) card(c, it.kind, it.x + (it.shake > 0 ? Math.sin(it.shake * 60) * 5 : 0), it.y + Math.sin(g.now * 4 + it.wob) * 1.5);
                for (const f of flying) {
                    const k = easeOut(f.t);
                    card(c, f.kind, lerp(f.x, f.tx, k), lerp(f.y, f.ty, k) - Math.sin(k * Math.PI) * 60, 1 - k * 0.2, 1 - k * 0.6);
                }
                if (g.state === 'play' && g.t < 2.6) { c.globalAlpha = 1 - g.t / 2.6; txt(c, t('games.career.hint'), W / 2, 392, 16, g.ink('#4b3fb0'), 'center', 800); c.globalAlpha = 1; }
            },
            down(p) {
                for (let i = items.length - 1; i >= 0; i--) {
                    const it = items[i];
                    if (Math.abs(p.x - it.x) < CARD.w / 2 + 6 && Math.abs(p.y - it.y) < CARD.h / 2 + 12) { tap(it); return; }
                }
            }
        };
    }
};

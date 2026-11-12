// Tech-Lab: „Ideen-Regen“ – mit dem Korb fallende Ideen fangen, Regenwolken ausweichen.
import { TAU, clamp, lerp, rand } from '../core/math.js';
import { t } from '../core/i18n.js';
import { W, H, rr, ell, txt, emo } from './draw.js';

const GOOD = [['💡', 1, 0.72], ['⭐', 2, 0.92], ['🏆', 5, 1]];   // [Bild, Punkte, Wahrscheinlichkeit kumuliert]
const SPAWN = { first: 0.4, badChance: 0.2, badAfter: 1, minGap: 0.3, startGap: 0.6, faster: 0.02 };
const FALL = { min: 150, max: 190, gain: 9 };
const BASKET = { w: 96, y: H - 58, follow: 16, keyStep: 60, catchAbove: 24, catchBelow: 10 };
const JACKPOT = 5;

export default {
    id: 'lab', icon: '💡', color: '#16a34a', time: 15, stars: [8, 20, 34],
    controls: ['mouse', 'tap', 'arrows'],
    bg(c) {   // Himmel, Sonne, Hügel und Wiese bewegen sich nicht
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#e6f7ff');
        c.fillStyle = sky; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,236,170,0.45)'; ell(c, 90, 80, 50, 50); c.fill();
        c.fillStyle = '#ffe28a'; ell(c, 90, 80, 30, 30); c.fill();
        c.fillStyle = '#a7dc8b'; ell(c, 140, H + 30, 260, 90); c.fill(); ell(c, 480, H + 40, 280, 100); c.fill();
        c.fillStyle = '#7cc46b'; c.fillRect(0, H - 26, W, 26);
    },
    make(g) {
        const bk = { x: W / 2, tx: W / 2, y: BASKET.y, w: BASKET.w, wob: 0, squash: 0, lean: 0 };
        let items = [], spawnT = SPAWN.first, keyL = false, keyR = false;
        function spawn() {
            const bad = g.t > SPAWN.badAfter && Math.random() < SPAWN.badChance;
            const r = Math.random(), kind = bad ? null : GOOD.find(k => r < k[2]);
            items.push({ x: rand(40, W - 40), y: -30, vy: rand(FALL.min, FALL.max) + g.t * FALL.gain, bad, ic: kind && kind[0], pts: kind && kind[1], rot: rand(-0.4, 0.4), ph: Math.random() * TAU });
        }
        function drawBasket(c) {
            c.save(); c.translate(bk.x, bk.y);
            c.rotate(bk.lean + (bk.wob > 0 ? Math.sin(bk.wob * 40) * 0.12 : 0));
            c.scale(1 + bk.squash * 0.08, 1 - bk.squash * 0.1);
            c.fillStyle = 'rgba(0,0,0,0.12)'; ell(c, 0, 34, bk.w / 2, 6); c.fill();
            c.fillStyle = '#c98b4f';
            c.beginPath(); c.moveTo(-bk.w / 2, -8); c.lineTo(bk.w / 2, -8); c.lineTo(bk.w / 2 - 12, 30); c.lineTo(-bk.w / 2 + 12, 30); c.closePath(); c.fill();
            c.strokeStyle = '#a86f3a'; c.lineWidth = 2;
            for (let y = 2; y < 30; y += 9) { c.beginPath(); c.moveTo(-bk.w / 2 + 4 + y * 0.3, y); c.lineTo(bk.w / 2 - 4 - y * 0.3, y); c.stroke(); }
            for (let x = -bk.w / 2 + 16; x < bk.w / 2 - 8; x += 14) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x * 0.8, 30); c.stroke(); }
            c.fillStyle = '#8a5a2b'; rr(c, -bk.w / 2 - 4, -14, bk.w + 8, 10, 5); c.fill();
            c.restore();
        }
        return {
            update(dt) {
                const live = g.state === 'play';
                if (live) {
                    if (keyL || keyR) bk.tx = bk.x + ((keyR ? 1 : 0) - (keyL ? 1 : 0)) * BASKET.keyStep;
                    spawnT -= dt;
                    if (spawnT <= 0) { spawn(); spawnT = Math.max(SPAWN.minGap, SPAWN.startGap - g.t * SPAWN.faster); }
                } else bk.tx = W / 2 + Math.sin(g.now * 1.3) * 140;
                bk.tx = clamp(bk.tx, bk.w / 2 + 8, W - bk.w / 2 - 8);
                const prev = bk.x;
                bk.x = lerp(bk.x, bk.tx, Math.min(1, dt * BASKET.follow));
                bk.lean = clamp((bk.x - prev) * 0.02, -0.25, 0.25);
                bk.wob = Math.max(0, bk.wob - dt); bk.squash = Math.max(0, bk.squash - dt * 5);
                for (const it of items) {
                    it.y += it.vy * dt; it.ph += dt * 3;
                    if (!live || it.done) continue;
                    if (it.y > bk.y - BASKET.catchAbove && it.y < bk.y + BASKET.catchBelow && Math.abs(it.x - bk.x) < bk.w / 2 + 6) {
                        it.done = true;
                        if (it.bad) {
                            bk.wob = 0.5; g.miss(bk.x, bk.y - 50, t('games.lab.rain'));
                            g.burst(it.x, it.y, 18, ['#9ad1ff', '#cfe8ff', '#7aa7d6'], 220, { size: 4, grav: 600 });
                        } else {
                            bk.squash = 1;
                            g.hit(it.pts, it.x, it.y - 30, it.pts >= JACKPOT ? t('games.lab.jackpot') : '', it.pts > 1 ? '#ffd166' : '#fff');
                            g.sfx(it.pts >= JACKPOT ? 'bonus' : 'coin');
                            g.burst(it.x, it.y, it.pts >= JACKPOT ? 26 : 10, ['#ffd166', '#fff', '#b9fbc0'], 200, { shape: 'star', size: 5, grav: 150 });
                        }
                    } else if (!it.bad && it.y > H + 20) { it.done = true; if (g.combo > 0) g.miss(it.x, H - 20, '', true); }
                }
                items = items.filter(it => !it.done && it.y < H + 40);
            },
            draw(c) {
                for (const it of items) {
                    const sw = Math.sin(it.ph) * 4;
                    if (it.bad) {
                        c.fillStyle = '#8a94a6';
                        ell(c, it.x + sw, it.y, 30, 15); c.fill(); ell(c, it.x - 10 + sw, it.y - 10, 17, 13); c.fill(); ell(c, it.x + 11 + sw, it.y - 12, 19, 15); c.fill();
                        c.strokeStyle = '#6aa8e8'; c.lineWidth = 2.5; c.lineCap = 'round';
                        for (let i = -1; i <= 1; i++) { const yy = it.y + 20 + ((g.now * 60 + i * 7) % 12); c.beginPath(); c.moveTo(it.x + i * 12 + sw, yy); c.lineTo(it.x + i * 12 - 3 + sw, yy + 7); c.stroke(); }
                    } else {
                        c.fillStyle = it.pts >= JACKPOT ? 'rgba(255,209,102,0.5)' : 'rgba(255,255,255,0.55)'; ell(c, it.x + sw, it.y, 22, 22); c.fill();
                        c.save(); c.translate(it.x + sw, it.y); c.rotate(it.rot + Math.sin(it.ph) * 0.15); emo(c, it.ic, 0, 0, it.pts >= JACKPOT ? 32 : 28); c.restore();
                    }
                }
                drawBasket(c);
                if (g.state === 'play' && g.t < 2.4) { c.globalAlpha = 1 - g.t / 2.4; txt(c, t('games.lab.hint'), W / 2, 90, 17, g.ink('#1b2a4a'), 'center', 800); c.globalAlpha = 1; }
            },
            down(p) { bk.tx = p.x; },
            move(p) { bk.tx = p.x; },
            key(k, down) {
                if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keyL = down; return true; }
                if (k === 'ArrowRight' || k === 'd' || k === 'D') { keyR = down; return true; }
            }
        };
    }
};

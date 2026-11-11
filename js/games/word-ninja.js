// Bildungsweg: „Wort-Ninja“ – durch fliegende Wörter in vier Sprachen wischen, Bomben meiden.
// Die Übersetzung erscheint in der Sprache der Seite (Deutsch oder Englisch).
import { distToSegment, rand, pick } from '../core/math.js';
import { t, lang } from '../core/i18n.js';
import { W, H, FONT, rr, ell, txt, starPath } from './draw.js';

// Inhalt des Spiels (keine Oberflächentexte): dieselben Wörter in vier Sprachen
const WORDS = [
    { de: 'Hallo', ar: 'مرحبا', en: 'Hello', fr: 'Bonjour' }, { de: 'Danke', ar: 'شكراً', en: 'Thanks', fr: 'Merci' },
    { de: 'Freund', ar: 'صديق', en: 'Friend', fr: 'Ami' }, { de: 'Arbeit', ar: 'عمل', en: 'Work', fr: 'Travail' },
    { de: 'Zukunft', ar: 'مستقبل', en: 'Future', fr: 'Avenir' }, { de: 'Erfolg', ar: 'نجاح', en: 'Success', fr: 'Succès' },
    { de: 'Team', ar: 'فريق', en: 'Team', fr: 'Équipe' }, { de: 'Lernen', ar: 'تعلّم', en: 'Learn', fr: 'Apprendre' },
    { de: 'Welt', ar: 'عالم', en: 'World', fr: 'Monde' }, { de: 'Familie', ar: 'عائلة', en: 'Family', fr: 'Famille' }
];
const LANG_TAG = { ar: ['AR', '#2a9d8f'], en: ['EN', '#3a86ff'], fr: ['FR', '#e63946'], de: ['DE', '#f4a300'] };
const BG_GLYPHS = ['A', 'ع', 'é', 'ß', 'Ω', 'ç', 'ä', 'ل'];
const PHYS = { gravity: 520, launchMin: 560, launchMax: 640, halfGravity: 900, halfLife: 1.2, trailLife: 0.16 };
const SPAWN = { first: 0.4, bombChance: 0.17, bombAfter: 1.5, minGap: 0.55, startGap: 1.05, faster: 0.025 };
const ITEM = { h: 40, bombW: 52, minW: 84, pad: 56 };
const STUN_S = 0.45, MULTI_SLICE = 3;

export default {
    id: 'school', icon: '🥷', color: '#7b5cff', time: 15, stars: [8, 20, 34],
    controls: ['swipe', 'hold'],
    bg(c) {
        const g = c.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#1d1b3a'); g.addColorStop(1, '#3b2667');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
    },
    make(g) {
        const home = lang() === 'en' ? 'en' : 'de';
        const foreign = Object.keys(LANG_TAG).filter(l => l !== home);
        let items = [], halves = [], trail = [], spawnT = SPAWN.first, swipeN = 0, swipeT = 0, stun = 0;
        const glyphs = Array.from({ length: 14 }, () => ({ x: rand(0, W), y: rand(0, H), s: pick(BG_GLYPHS), size: rand(26, 70), sp: rand(4, 12) }));
        function launch() {
            const x = rand(90, W - 90), bomb = g.t > SPAWN.bombAfter && Math.random() < SPAWN.bombChance;
            const it = { x, y: H + 30, vx: (W / 2 - x) * rand(0.25, 0.6) + rand(-40, 40), vy: -rand(PHYS.launchMin, PHYS.launchMax), rot: rand(-0.2, 0.2), vr: rand(-1.2, 1.2), bomb, h: ITEM.h };
            if (bomb) it.w = ITEM.bombW;
            else {
                const wd = pick(WORDS), l = Math.random() < 1 / 7 ? home : pick(foreign);
                it.word = wd[l]; it.home = wd[home]; it.lang = l;
                g.c.font = `800 19px ${FONT}`;
                it.w = Math.max(ITEM.minW, g.c.measureText(it.word).width + ITEM.pad);
            }
            items.push(it);
        }
        function sliceAt(it, dir) {
            it.dead = true;
            if (it.bomb) {
                g.miss(it.x, it.y - 34, t('games.school.boom')); g.flash('#fff', 0.7); g.shake(18); g.hitstop(90); g.sfx('boom');
                g.burst(it.x, it.y, 40, ['#ff8a3d', '#ffd166', '#333', '#ff5f6d'], 380, { size: 7 });
                stun = STUN_S; trail = [];
                return;
            }
            const col = LANG_TAG[it.lang][1], nx = Math.cos(dir + Math.PI / 2), ny = Math.sin(dir + Math.PI / 2);
            [-1, 1].forEach(s => halves.push({ ...it, side: s, vx: it.vx * 0.5 + nx * s * 140, vy: Math.min(it.vy, 0) * 0.3 + ny * s * 140 - 80, vr: s * rand(3, 6), life: 0 }));
            g.burst(it.x, it.y, 18, [col, '#fff', col], 300, { size: 6, grav: 700 });
            g.hit(1, it.x, it.y - 36, it.lang === home ? it.word : `${it.word} = ${it.home}`, '#fff');
            g.sfx('slice');
            swipeN++; swipeT = 0.35;
            if (swipeN === MULTI_SLICE) { g.add(3, it.x, it.y - 70, t('games.school.multi'), '#7ee8fa'); g.sfx('combo'); g.ring(it.x, it.y, '#7ee8fa', 60); }
        }
        const halfWidth = (it) => Math.max(0, it.w / 2 - it.h / 2);
        const within = (it, x, y, pad) => distToSegment(x, y, it.x - halfWidth(it), it.y, it.x + halfWidth(it), it.y) < it.h / 2 + pad;
        function swipe(ax, ay, bx, by) {
            if (stun > 0) return;
            const dir = Math.atan2(by - ay, bx - ax);
            for (const it of items) {
                if (it.dead) continue;
                const hw = halfWidth(it);
                const d = Math.min(distToSegment(it.x - hw, it.y, ax, ay, bx, by), distToSegment(it.x, it.y, ax, ay, bx, by), distToSegment(it.x + hw, it.y, ax, ay, bx, by));
                if (d < it.h / 2 + 6) sliceAt(it, dir);
            }
        }
        function drawItem(c, it, clipSide) {
            c.save(); c.translate(it.x, it.y); c.rotate(it.rot);
            if (clipSide) { c.beginPath(); c.rect(clipSide < 0 ? -it.w : 0, -it.h * 2, it.w, it.h * 4); c.clip(); }
            if (it.bomb) {
                c.fillStyle = 'rgba(255,90,90,0.22)'; ell(c, 0, 0, 34, 34); c.fill();
                c.fillStyle = '#1f2433'; ell(c, 0, 4, 21, 21); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, -7, -4, 6, 5); c.fill();
                c.fillStyle = '#4b5263'; rr(c, -6, -22, 12, 9, 2); c.fill();
                c.strokeStyle = '#a0763c'; c.lineWidth = 3; c.lineCap = 'round';
                c.beginPath(); c.moveTo(0, -22); c.quadraticCurveTo(6, -32, 14, -30); c.stroke();
                const sp = 5 + Math.sin(g.now * 30) * 2;
                c.fillStyle = '#ffd166'; starPath(c, 15, -31, sp, sp * 0.4, 6, g.now * 8); c.fill();
                c.fillStyle = '#ff6b35'; ell(c, 15, -31, 2.5, 2.5); c.fill();
            } else {
                const [tag, col] = LANG_TAG[it.lang];
                c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, -it.w / 2 + 2, -it.h / 2 + 5, it.w, it.h, it.h / 2); c.fill();
                c.fillStyle = '#fff'; rr(c, -it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); c.fill();
                c.fillStyle = col; rr(c, -it.w / 2 + 5, -it.h / 2 + 5, 30, it.h - 10, (it.h - 10) / 2); c.fill();
                txt(c, tag, -it.w / 2 + 20, 1, 11, '#fff');
                txt(c, it.word, 17, 1, 19, '#1d2433');
            }
            c.restore();
        }
        return {
            update(dt) {
                for (const b of glyphs) { b.y -= b.sp * dt; if (b.y < -60) { b.y = H + 60; b.x = rand(0, W); } }
                if (g.state !== 'over') {
                    spawnT -= dt;
                    if (spawnT <= 0) {
                        const n = 1 + (Math.random() < 0.5) + (g.t > 7 && Math.random() < 0.45);
                        for (let i = 0; i < n; i++) launch();
                        spawnT = Math.max(SPAWN.minGap, SPAWN.startGap - g.t * SPAWN.faster);
                    }
                }
                for (const it of items) {
                    it.vy += PHYS.gravity * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt * 0.3;
                    if (it.vy > 0 && it.y > H + 50 && !it.dead) {
                        it.dead = true;
                        if (!it.bomb && g.playing && g.combo > 0) g.miss(it.x, H - 30, t('games.school.missed'), true);
                    }
                }
                items = items.filter(it => !it.dead);
                for (const h of halves) { h.life += dt; h.vy += PHYS.halfGravity * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
                halves = halves.filter(h => h.life < PHYS.halfLife && h.y < H + 80);
                for (const p of trail) p.t += dt;
                trail = trail.filter(p => p.t < PHYS.trailLife);
                swipeT -= dt; if (swipeT <= 0) swipeN = 0;
                stun = Math.max(0, stun - dt);
            },
            draw(c) {
                for (const b of glyphs) txt(c, b.s, b.x, b.y, b.size, 'rgba(255,255,255,0.05)');
                for (const it of items) drawItem(c, it);
                for (const h of halves) { c.globalAlpha = Math.max(0, 1 - h.life / PHYS.halfLife); drawItem(c, h, h.side); c.globalAlpha = 1; }
                if (trail.length > 1) {
                    c.lineCap = 'round'; c.lineJoin = 'round';
                    for (let i = 1; i < trail.length; i++) {
                        const a = trail[i - 1], b = trail[i], f = 1 - b.t / PHYS.trailLife;
                        c.strokeStyle = stun > 0 ? `rgba(255,120,120,${f})` : `rgba(190,240,255,${f * 0.6})`; c.lineWidth = 12 * f;
                        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
                        c.strokeStyle = `rgba(255,255,255,${f})`; c.lineWidth = 5 * f;
                        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
                    }
                }
                if (g.state === 'play' && g.t < 2.5) { c.globalAlpha = 1 - g.t / 2.5; txt(c, t('games.school.hint'), W / 2, H - 40, 18, '#fff', 'center', 800, 5); c.globalAlpha = 1; }
            },
            down(p) {
                trail = [{ x: p.x, y: p.y, t: 0 }];
                if (stun > 0) return;
                for (const it of items) if (!it.dead && within(it, p.x, p.y, 4)) { sliceAt(it, -0.5); break; }
            },
            move(p) {
                if (!g.ptr.down) return;
                const lastP = trail[trail.length - 1];
                if (lastP && Math.hypot(p.x - lastP.x, p.y - lastP.y) > 3) swipe(lastP.x, lastP.y, p.x, p.y);
                trail.push({ x: p.x, y: p.y, t: 0 });
            },
            up() { swipeN = 0; }
        };
    }
};

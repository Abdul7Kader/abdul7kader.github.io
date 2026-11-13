// Ankunft & Reisen: „Stempel-Jet“ – Flugzeug steuern, Länder-Stempel einsammeln, Gewittern ausweichen.
import { TAU, clamp, rand, shuffle } from '../core/math.js';
import { t } from '../core/i18n.js';
import { W, H, rr, ell, txt } from './draw.js';

const PHYS = { startSpeed: 230, speedGain: 7, lift: -1150, gravity: 680, minVy: -330, maxVy: 370, top: 50, bottomGap: 74, bounce: 0.3, idleSpeed: 80 };
const SPAWN = { first: 0.9, min: 0.62, max: 0.95, stormChance: 0.24, stormAfter: 1.5, passChance: 0.31, trioChance: 0.45, trioGap: 64 };
const PLANE_X = 130, HIT = { stamp: 26, pass: 28, storm: 18 };
const SKY = ['#4aa3f0', '#a9dcff', '#e3f5ff'];
const HOME_COUNTRIES = /deutschland|syrien|germany|syria/i;   // Heimat zählt nicht als Reiseziel

export default {
    id: 'arrival', icon: '✈️', color: '#3a86ff', time: 15, stars: [6, 16, 30],
    controls: ['hold', 'space', 'tap'],
    // Himmel und Sonne bewegen sich nicht → einmal zeichnen
    moon: [W - 90, 80],   // nachts steht der Mond, wo tagsüber die Sonne ist
    bg(c) {
        const sky = c.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, SKY[0]); sky.addColorStop(0.7, SKY[1]); sky.addColorStop(1, SKY[2]);
        c.fillStyle = sky; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,236,170,0.35)'; ell(c, W - 90, 80, 54, 54); c.fill();
        c.fillStyle = '#ffe9a8'; ell(c, W - 90, 80, 32, 32); c.fill();
    },
    make(g, env) {
        const countries = shuffle(env.derived.countries.filter(n => !HOME_COUNTRIES.test(n)));
        let ci = 0, hold = false, spawnT = SPAWN.first, speed = PHYS.startSpeed, scroll = 0;
        const p = { x: PLANE_X, y: H / 2, vy: 0, inv: 0, spin: 0 };
        let items = [];
        const clouds = Array.from({ length: 8 }, (_, i) => ({ x: rand(0, W), y: rand(40, H - 150), s: rand(0.5, 1.2), far: i % 2 === 0 }));
        const hue = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
        function spawn() {
            const r = Math.random();
            if (r < SPAWN.stormChance && g.t > SPAWN.stormAfter) items.push({ kind: 'storm', x: W + 60, y: rand(80, H - 110), r: 32, ph: Math.random() * TAU });
            else if (r < SPAWN.passChance) items.push({ kind: 'pass', x: W + 40, y: rand(80, H - 120), r: 24 });
            else {
                const n = Math.random() < SPAWN.trioChance ? 3 : 1, y0 = rand(80, H - 120), dy = rand(-45, 45);
                for (let i = 0; i < n; i++) {
                    const name = countries.length ? countries[ci++ % countries.length] : t('games.arrival.world');
                    items.push({ kind: 'stamp', x: W + 40 + i * SPAWN.trioGap, y: clamp(y0 + dy * i, 70, H - 100), r: 26, name, h: hue(name), rot: rand(-0.3, 0.3) });
                }
            }
        }
        function drawPlane(c) {
            c.save(); c.translate(p.x, p.y);
            c.rotate(p.vy * 0.0013 + (p.spin > 0 ? (1 - p.spin / 0.7) * TAU : 0));
            if (p.inv > 0 && Math.floor(p.inv * 12) % 2) c.globalAlpha = 0.45;
            c.fillStyle = 'rgba(0,0,0,0.12)'; ell(c, 4, 26, 40, 5); c.fill();
            c.fillStyle = '#fff'; rr(c, -46, -11, 94, 22, 11); c.fill();
            c.fillStyle = '#3a86ff'; c.fillRect(-40, 1, 82, 4);
            c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(-46, -8); c.lineTo(-32, -8); c.lineTo(-42, -32); c.lineTo(-54, -32); c.closePath(); c.fill();
            c.fillStyle = '#d7e3f0'; c.beginPath(); c.moveTo(-10, 3); c.lineTo(14, 3); c.lineTo(-4, 26); c.lineTo(-22, 26); c.closePath(); c.fill();
            c.fillStyle = '#9ad1ff'; for (let i = 0; i < 6; i++) { ell(c, -24 + i * 9, -4, 2.6, 2.6); c.fill(); }
            c.fillStyle = '#1b2a4a'; rr(c, 34, -7, 10, 7, 3); c.fill();
            c.restore(); c.globalAlpha = 1;
        }
        const cloud = (c, cl, a) => {
            c.fillStyle = `rgba(255,255,255,${a})`;
            ell(c, cl.x, cl.y, 44 * cl.s, 17 * cl.s); c.fill();
            ell(c, cl.x + 20 * cl.s, cl.y - 11 * cl.s, 26 * cl.s, 16 * cl.s); c.fill();
            ell(c, cl.x - 18 * cl.s, cl.y - 6 * cl.s, 20 * cl.s, 13 * cl.s); c.fill();
        };
        const hills = (c, off, amp, base, col, f) => {   // Hügel mit Parallaxe
            c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
            for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, base - Math.sin((x + scroll * f) * 0.012 + off) * amp - Math.sin((x + scroll * f) * 0.031) * amp * 0.35);
            c.lineTo(W, H); c.fill();
        };
        return {
            update(dt) {
                const live = g.state === 'play', sp = live ? speed : PHYS.idleSpeed;
                scroll += sp * dt;
                for (const cl of clouds) { cl.x -= (cl.far ? 0.15 : 0.45) * sp * cl.s * dt; if (cl.x < -120) { cl.x = W + 100; cl.y = rand(40, H - 150); } }
                if (!live) { p.y = H / 2 + Math.sin(g.now * 2.2) * 14; p.vy = Math.cos(g.now * 2.2) * 30; }
                else {
                    speed = PHYS.startSpeed + g.t * PHYS.speedGain;
                    p.vy = clamp(p.vy + (hold ? PHYS.lift : PHYS.gravity) * dt, PHYS.minVy, PHYS.maxVy);
                    p.y += p.vy * dt;
                    if (p.y < PHYS.top) { p.y = PHYS.top; p.vy = Math.max(0, p.vy); }
                    if (p.y > H - PHYS.bottomGap) { p.y = H - PHYS.bottomGap; p.vy = -Math.abs(p.vy) * PHYS.bounce; }
                    spawnT -= dt;
                    if (spawnT <= 0) { spawn(); spawnT = rand(SPAWN.min, SPAWN.max); }
                    if (Math.random() < 0.6) g.burst(p.x - 46, p.y + 2, 1, ['rgba(255,255,255,0.85)'], 40, { dir: Math.PI, grav: -30, life: 0.5, size: hold ? 7 : 4 });
                }
                p.inv = Math.max(0, p.inv - dt); p.spin = Math.max(0, p.spin - dt);
                for (const it of items) {
                    it.x -= speed * dt;
                    if (!live || it.dead) continue;
                    const d = Math.hypot(it.x - p.x - 8, it.y - p.y);
                    if (it.kind === 'stamp' && d < it.r + HIT.stamp) {
                        it.dead = true; g.hit(1, it.x, it.y - 30, it.name); g.sfx('coin');
                        g.burst(it.x, it.y, 14, [`hsl(${it.h},80%,60%)`, '#ffe08a', '#fff'], 230, { shape: 'star', size: 6 });
                    } else if (it.kind === 'pass' && d < it.r + HIT.pass) {
                        it.dead = true; g.hit(5, it.x, it.y - 30, t('games.arrival.passport'), '#ffd166'); g.sfx('bonus'); g.flash('#ffe08a', 0.35);
                        g.burst(it.x, it.y, 34, ['#ffd166', '#ffb703', '#fff'], 320, { shape: 'star', size: 7 }); g.ring(it.x, it.y, '#ffd166', 50);
                    } else if (it.kind === 'storm' && d < it.r + HIT.storm && p.inv <= 0) {
                        it.zap = 0.35; p.inv = 1.3; p.spin = 0.7; p.vy = 160;
                        g.miss(p.x, p.y - 40, t('games.arrival.turbulence')); g.flash('#fff', 0.55); g.hitstop(60);
                    }
                    if (it.zap) it.zap = Math.max(0, it.zap - dt);
                }
                items = items.filter(it => !it.dead && it.x > -90);
            },
            draw(c) {
                const night = g.night();   // nachts dunklere Hügel und blassere Wolken
                clouds.forEach(cl => cl.far && cloud(c, cl, night ? 0.18 : 0.55));
                hills(c, 1, 26, H - 70, night ? '#4d6f4a' : '#9fd88a', 0.25);
                hills(c, 4, 18, H - 40, night ? '#3e6a3c' : '#6fbf5a', 0.6);
                clouds.forEach(cl => !cl.far && cloud(c, cl, night ? 0.3 : 0.9));
                for (const it of items) {
                    if (it.kind === 'stamp') {
                        c.save(); c.translate(it.x, it.y + Math.sin(g.now * 3 + it.x * 0.02) * 3); c.rotate(it.rot);
                        c.fillStyle = '#fff'; ell(c, 0, 0, it.r, it.r); c.fill();
                        c.strokeStyle = `hsl(${it.h},70%,45%)`; c.lineWidth = 3; c.setLineDash([5, 4]); ell(c, 0, 0, it.r - 4, it.r - 4); c.stroke(); c.setLineDash([]);
                        txt(c, it.name.slice(0, 2).toUpperCase(), 0, -3, 16, `hsl(${it.h},70%,40%)`);   // Stempel: Anfangsbuchstaben statt Flagge
                        txt(c, it.name.length > 10 ? it.name.slice(0, 9) + '.' : it.name, 0, 14, 8.5, `hsl(${it.h},70%,35%)`);
                        c.restore();
                    } else if (it.kind === 'pass') {
                        const s = 1 + Math.sin(g.now * 6) * 0.06;
                        c.save(); c.translate(it.x, it.y); c.scale(s, s);
                        c.fillStyle = 'rgba(255,209,102,0.35)'; ell(c, 0, 0, 36, 36); c.fill();
                        c.fillStyle = '#8c1c3a'; rr(c, -16, -21, 32, 42, 4); c.fill();
                        c.strokeStyle = '#ffd166'; c.lineWidth = 2; ell(c, 0, -3, 8, 8); c.stroke();
                        c.fillStyle = '#ffd166'; c.fillRect(-9, 10, 18, 2.5);
                        c.restore();
                    } else {
                        const fl = it.zap > 0 || Math.sin(g.now * 9 + it.ph) > 0.92;
                        c.fillStyle = fl ? '#7d8597' : '#5c6475';
                        ell(c, it.x, it.y, 40, 19); c.fill(); ell(c, it.x - 14, it.y - 13, 22, 16); c.fill(); ell(c, it.x + 14, it.y - 16, 25, 18); c.fill();
                        c.fillStyle = fl ? '#fff59d' : '#ffd166';
                        c.beginPath(); c.moveTo(it.x - 2, it.y + 8); c.lineTo(it.x + 10, it.y + 8); c.lineTo(it.x + 2, it.y + 22); c.lineTo(it.x + 12, it.y + 22); c.lineTo(it.x - 6, it.y + 44); c.lineTo(it.x - 1, it.y + 27); c.lineTo(it.x - 10, it.y + 27); c.closePath(); c.fill();
                    }
                }
                drawPlane(c);
                if (g.state === 'play' && g.t < 2.2) {
                    c.globalAlpha = 1 - g.t / 2.2;
                    txt(c, hold ? t('games.arrival.rising') : t('games.arrival.hint'), p.x + 70, p.y - 40, 16, '#fff', 'left', 800, 5);
                    c.globalAlpha = 1;
                }
            },
            down() { hold = true; },
            up() { hold = false; },
            key(k, down) { if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { hold = down; return true; } }
        };
    }
};

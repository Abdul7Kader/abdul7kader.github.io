// Gemeinsame Engine der Minispiele: Startkarte → Countdown → Spiel (Combo, Wackeln, Partikel) → Ergebnis mit Sternen.
// Alle Spiele sind fehlerverzeihend: kein „Game Over“, Fehler kosten nur die Combo.
//
// Ein Spiel beschreibt sich mit:
//   { id, icon, color, time (Sekunden, 0 = ohne Zeitlimit), stars: [1★, 2★, 3★] oder (g) => […],
//     controls: ['click', 'tap', …], hud?(g), bg?(c) (unbewegter Hintergrund, wird einmal gezeichnet),
//     make(g, env) → { update(dt), draw(c), down?(p), move?(p), up?(p), key?(k, down, g, repeat) } }
// env = { data, derived } – Inhalte des Lebenslaufs (Länder, Projekte, Kenntnisse …)
// Name, Ziel und Ergebnistext kommen aus dem Wörterbuch: games.<id>.name / .goal / .result
import { esc } from '../core/dom.js';
import { store } from '../core/store.js';
import { reducedMotion } from '../core/env.js';
import { theme } from '../core/theme.js';
import { on } from '../core/events.js';
import { TAU, easeOut, rand, pick } from '../core/math.js';
import { t } from '../core/i18n.js';
import { GAME_PERF } from '../config/performance.js';
import { W, H, FONT, rr, ell, txt, starPath } from './draw.js';

const CONTROL_ICONS = { hold: '🖱️', click: '🖱️', tap: '👆', swipe: '👆', space: '⌨️', arrows: '⌨️', mouse: '🖱️' };
const COMBO_STEP = 5, MAX_MULT = 3;             // alle 5 Treffer steigt der Multiplikator, höchstens ×3
const COUNTDOWN_STEP_S = 0.5, GO_S = 0.7;
const RESULT_DELAY_MS = 750, SCORE_COUNT_MS = 900;
const LAST_SECONDS = 3;
// Dunkelmodus: Hintergründe der Spiele werden einmal abgedunkelt (multiplizieren), Spielobjekte und Texte bleiben hell
const NIGHT_SHADE = 'rgb(118,132,190)';
// Nachthimmel: Sterne an festen Plätzen, Mond an der Stelle der Sonne (moon = [x, y] in Spielkoordinaten)
const NIGHT_SKY = { stars: 46, top: 0.62, moonR: 26, moonGlow: 52, moon: '#f6f1dc', glow: 'rgba(246,241,220,0.16)', crater: 'rgba(170,165,140,0.35)' };
function nightSky(c, moon) {
    if (theme() !== 'dark') return;
    c.save();
    for (let i = 0; i < NIGHT_SKY.stars; i++) {
        c.globalAlpha = 0.35 + (i % 5) * 0.12;
        c.fillStyle = '#fff'; c.fillRect((i * 131) % W, (i * 71) % (H * NIGHT_SKY.top), i % 7 ? 1.6 : 2.6, i % 7 ? 1.6 : 2.6);
    }
    c.globalAlpha = 1;
    if (moon) {
        const [x, y] = moon;
        c.fillStyle = NIGHT_SKY.glow; c.beginPath(); c.arc(x, y, NIGHT_SKY.moonGlow, 0, Math.PI * 2); c.fill();
        c.fillStyle = NIGHT_SKY.moon; c.beginPath(); c.arc(x, y, NIGHT_SKY.moonR, 0, Math.PI * 2); c.fill();
        c.fillStyle = NIGHT_SKY.crater;
        [[-8, -6, 5], [7, 4, 6], [-3, 10, 3.5]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(x + dx, y + dy, r, 0, Math.PI * 2); c.fill(); });
    }
    c.restore();
}

/** Nacht: Fläche abdunkeln (ohne Wirkung im hellen Modus) */
function nightShade(c, h = H) {
    if (theme() !== 'dark') return;
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = NIGHT_SHADE; c.fillRect(0, 0, W, h); c.restore();
}
const HUD_BG = 'rgba(10,18,36,0.55)';
const CONFETTI = ['#ffd166', '#ff8a3d', '#2ec4b6', '#fff', '#ff5f6d'];

/** Größe der Spielfläche: so breit wie möglich, aber ganz sichtbar */
/** Größtes Spielfeld im Seitenverhältnis W : H, das in die Bühne passt (die Bühne füllt beim Spielen den Dialog) */
const MIN_STAGE_H = 200;
function fitSize(stage) {
    const availW = stage.clientWidth || W, availH = Math.max(MIN_STAGE_H, stage.clientHeight || H);
    const cssW = Math.floor(Math.min(availW, availH * W / H));
    return { cssW, cssH: Math.round(cssW * H / W) };
}

/** Startet ein Spiel in stage; done(result) wird beim Klick auf „Weiter“ aufgerufen. Gibt eine Aufräum-Funktion zurück. */
export function mountGame(spec, stage, done, sfx = () => {}, env = {}) {
    const id = spec.id;
    stage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'arc';
    wrap.style.setProperty('--arc', spec.color);
    const cnv = document.createElement('canvas');
    cnv.className = 'arc-cnv';
    const ov = document.createElement('div');
    ov.className = 'arc-ov';
    wrap.append(cnv, ov);
    stage.appendChild(wrap);
    const c = cnv.getContext('2d');

    // Unbewegter Hintergrund in Canvas-Auflösung, einmal je Größe
    let k = 1, bg = null;
    function fit() {
        const { cssW, cssH } = fitSize(stage);
        const dpr = Math.min(GAME_PERF.MAX_DPR, window.devicePixelRatio || 1, GAME_PERF.MAX_BACKING_PX / cssW);
        cnv.width = Math.round(cssW * dpr); cnv.height = Math.round(cssH * dpr);
        cnv.style.width = cssW + 'px'; cnv.style.height = cssH + 'px';
        wrap.style.width = cssW + 'px'; wrap.style.height = cssH + 'px';
        k = dpr * cssW / W;
        bg = null;
        if (spec.bg) {
            bg = document.createElement('canvas'); bg.width = cnv.width; bg.height = cnv.height;
            const b = bg.getContext('2d'); b.setTransform(k, 0, 0, k, 0, 0); spec.bg(b); nightShade(b); if (spec.moon) nightSky(b, spec.moon);
        }
    }
    fit();
    window.addEventListener('resize', fit);

    const g = {
        W, H, c, state: 'ready', playing: false, t: 0, now: 0, left: spec.time || 0,
        score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, ptr: { x: W / 2, y: H / 2, down: false }, sfx
    };
    let game = null, parts = [], texts = [];
    let shakeM = 0, flashA = 0, flashC = '#fff', stopT = 0, countT = 0, goT = 0, lastCount = 0, lastTick = 0;
    let scoreBump = 0, comboBump = 0, alive = true, last = performance.now(), raf = 0, resultTimer = null;

    // ----------------------------------------------------- Werkzeuge für die Spiele
    g.nightShade = nightShade;
    g.nightSky = nightSky;
    g.night = () => theme() === 'dark';
    /** Schriftfarbe direkt auf dem Hintergrund: nachts hell statt dunkel */
    g.ink = (dayColor) => (theme() === 'dark' ? '#e7ebf7' : dayColor);
    g.mult = () => Math.min(MAX_MULT, 1 + Math.floor(g.combo / COMBO_STEP));
    g.pop = (x, y, s, col = '#fff', size = 22) => texts.push({ x, y, s, col, size, t: 0 });
    g.add = (pts, x, y, label, col = '#ffe08a') => { g.score += pts; scoreBump = 1; if (x != null) g.pop(x, y, (label ? label + '  ' : '') + '+' + pts, col); };
    g.hit = (pts, x, y, label, col) => {
        const before = g.mult();
        g.combo++; g.hits++; g.maxCombo = Math.max(g.maxCombo, g.combo);
        const m = g.mult();
        g.add(pts * m, x, y, label, col);
        if (m > before) { g.pop(W / 2, 96, t('games.combo', { m }), '#ffd166', 30); comboBump = 1; sfx('combo'); }
    };
    g.miss = (x, y, label, soft) => {
        if (g.combo >= COMBO_STEP) g.pop(W / 2, 96, t('games.comboLost'), '#ff9b9b', 20);
        g.combo = 0; g.misses++;
        if (!soft) { g.shake(10); sfx('bad'); }
        if (label && x != null) g.pop(x, y, label, '#ff8f8f', 20);
    };
    g.shake = (m) => { if (!reducedMotion) shakeM = Math.max(shakeM, m); };
    g.flash = (col, a = 0.4) => { flashC = col; flashA = a; };
    g.hitstop = (ms) => { stopT = Math.max(stopT, ms / 1000); };
    g.burst = (x, y, n, cols, sp = 240, o = {}) => {
        for (let i = 0; i < n && parts.length < GAME_PERF.MAX_PARTICLES; i++) {
            const a = o.dir != null ? o.dir + rand(-(o.spread || 0.6), o.spread || 0.6) : Math.random() * TAU;
            const v = sp * rand(0.35, 1);
            parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: (o.life || 0.7) * rand(0.6, 1.2), col: pick(cols),
                size: (o.size || 5) * rand(0.6, 1.3), grav: o.grav != null ? o.grav : 500, shape: o.shape || 'dot', rot: Math.random() * TAU, vr: rand(-8, 8) });
        }
    };
    g.ring = (x, y, col = '#fff', r = 40) => parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.45, col, size: r, grav: 0, shape: 'ring' });
    g.end = () => { if (g.state === 'play') finish(); };
    const offFinish = on('game:finish', () => g.end());   // nur für Tests: laufendes Spiel sofort beenden

    // ----------------------------------------------------- Start- und Ergebniskarte
    const best = () => store.get('best:' + id, 0);
    const controls = (spec.controls || []).map(key => `<span class="arc-key"><b>${CONTROL_ICONS[key] || ''}</b>${esc(t('games.controls.' + key))}</span>`).join('');
    function showIntro() {
        const b = best(), st = store.get('stars:' + id, 0);
        ov.className = 'arc-ov show';
        ov.innerHTML = `
            <div class="arc-card intro">
                <div class="arc-icon">${spec.icon}</div>
                <h3>${esc(t(`games.${id}.name`))}</h3>
                <p>${esc(t(`games.${id}.goal`))}</p>
                <div class="arc-keys">${controls}</div>
                <button class="arc-go" data-act="go"><span>▶</span> ${esc(t('games.play'))}</button>
                <small class="arc-meta">${spec.time ? esc(t('games.seconds', { n: spec.time })) : esc(t('games.noLimit'))} · ${b ? esc(t('games.best', { n: b })) + ' ' + '★'.repeat(st) : esc(t('games.noGameOver'))}</small>
            </div>`;
        ov.querySelector('[data-act="go"]').onclick = (e) => { e.stopPropagation(); start(); };
        ov.onclick = (e) => { if (e.target === ov) start(); };
    }
    function showResult(r) {
        ov.className = 'arc-ov show';
        ov.innerHTML = `
            <div class="arc-card result">
                <div class="arc-stars">${[0, 1, 2].map(i => `<i class="${i < r.stars ? 'on' : ''}" style="--d:${0.15 + i * 0.22}s">★</i>`).join('')}</div>
                <h3>${esc(t('games.praise.' + r.stars))}</h3>
                <div class="arc-score"><b data-to="${r.score}">0</b><span>${esc(t('games.points'))}</span></div>
                <div class="arc-best ${r.isBest ? 'new' : ''}">${r.isBest ? '🏆 ' + esc(t('games.newRecord')) : esc(t('games.bestShort', { n: r.best }))}${g.maxCombo >= COMBO_STEP ? ' · ' + esc(t('games.bestCombo', { n: g.maxCombo })) : ''}</div>
                <p class="arc-msg">${esc(r.text)}</p>
                <div class="arc-btns">
                    <button class="arc-again" data-act="again">↻ ${esc(t('games.again'))}</button>
                    <button class="arc-next" data-act="next">${esc(t('games.toFacts'))}</button>
                </div>
            </div>`;
        ov.onclick = null;
        ov.querySelector('[data-act="again"]').onclick = () => { sfx('click'); start(); };
        ov.querySelector('[data-act="next"]').onclick = () => { sfx('click'); done(r); };
        const el = ov.querySelector('[data-to]'), t0 = performance.now();
        const tick = () => {
            if (!el.isConnected) return;
            const f = Math.min(1, (performance.now() - t0) / SCORE_COUNT_MS);
            el.textContent = Math.round(r.score * easeOut(f));
            if (f < 1) requestAnimationFrame(tick);
        };
        tick();
        for (let i = 0; i < r.stars; i++) setTimeout(() => alive && sfx('star' + i), 150 + i * 220);
    }
    function start() {
        if (g.state !== 'ready' && g.state !== 'over') return;
        clearTimeout(resultTimer);
        ov.className = 'arc-ov'; ov.innerHTML = '';
        Object.assign(g, { state: 'count', playing: false, t: 0, left: spec.time || 0, score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0 });
        parts = []; texts = []; countT = 0; lastCount = 0; lastTick = 0; goT = 0;
        game = spec.make(g, env);
        sfx('click');
    }
    function finish() {
        g.state = 'over'; g.playing = false;
        const thresholds = typeof spec.stars === 'function' ? spec.stars(g) : spec.stars;
        const stars = thresholds.filter(x => g.score >= x).length;
        const prev = best(), isBest = g.score > prev && g.score > 0;
        if (isBest) store.set('best:' + id, g.score);
        store.set('stars:' + id, Math.max(stars, store.get('stars:' + id, 0)));
        sfx(stars >= 2 ? 'fanfare' : 'good');
        if (stars >= 2) g.burst(W / 2, H / 2, 70, CONFETTI, 420, { shape: 'sq', life: 1.4, grav: 380 });
        const r = { score: g.score, stars, best: Math.max(prev, g.score), isBest, maxCombo: g.maxCombo };
        r.text = t(`games.${id}.result`, spec.resultParams ? spec.resultParams(g) : { n: g.hits });
        resultTimer = setTimeout(() => alive && showResult(r), RESULT_DELAY_MS);
    }

    // ----------------------------------------------------- Eingabe
    const local = (e) => { const r = cnv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
    cnv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const p = local(e);
        g.ptr.x = p.x; g.ptr.y = p.y; g.ptr.down = true;
        try { cnv.setPointerCapture(e.pointerId); } catch (er) { /* nicht unterstützt */ }
        if (g.state === 'play' && game.down) game.down(p, g);
    });
    cnv.addEventListener('pointermove', (e) => { const p = local(e); g.ptr.x = p.x; g.ptr.y = p.y; if (g.state === 'play' && game.move) game.move(p, g); });
    const up = (e) => { if (!g.ptr.down) return; g.ptr.down = false; if (g.state === 'play' && game.up) game.up(local(e), g); };
    cnv.addEventListener('pointerup', up);
    cnv.addEventListener('pointercancel', up);
    const GAME_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    const kd = (e) => {
        if (e.target && /input|textarea/i.test(e.target.tagName)) return;
        if (g.state === 'ready' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); start(); return; }
        if (g.state === 'over') {
            if (!ov.querySelector('.result')) return;
            if (e.key === 'Enter') { e.preventDefault(); ov.querySelector('[data-act="next"]').click(); }
            else if (e.key === ' ' || e.key === 'r' || e.key === 'R') { e.preventDefault(); start(); }
            return;
        }
        if (g.state === 'play' && game.key && game.key(e.key, true, g, e.repeat)) e.preventDefault();
        else if (GAME_KEYS.includes(e.key)) e.preventDefault();
    };
    const ku = (e) => { if (g.state === 'play' && game.key) game.key(e.key, false, g, false); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // ----------------------------------------------------- Schleife
    function step(dt) {
        g.now += dt;
        if (stopT > 0) { stopT -= dt; return; }
        if (g.state === 'count') {
            countT += dt;
            const n = 3 - Math.floor(countT / COUNTDOWN_STEP_S);
            if (n !== lastCount && n > 0) { lastCount = n; sfx('count'); }
            if (countT >= 3 * COUNTDOWN_STEP_S) { g.state = 'play'; g.playing = true; goT = GO_S; sfx('go'); }
        } else if (g.state === 'play') {
            g.t += dt;
            if (spec.time) {
                g.left = Math.max(0, spec.time - g.t);
                const sec = Math.ceil(g.left);
                if (g.left <= LAST_SECONDS && sec !== lastTick && sec > 0) { lastTick = sec; sfx('tick'); }
                if (g.left <= 0) finish();
            }
        }
        goT = Math.max(0, goT - dt);
        game.update(dt, g);
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.life += dt;
            if (p.life >= p.max) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
            p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 1 - dt * 1.2;
        }
        for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.95) texts.splice(i, 1); }
        shakeM = Math.max(0, shakeM - dt * 45); flashA = Math.max(0, flashA - dt * 2.4);
        scoreBump = Math.max(0, scoreBump - dt * 5); comboBump = Math.max(0, comboBump - dt * 3);
    }
    function drawParts() {
        for (const p of parts) {
            const f = 1 - p.life / p.max;
            c.globalAlpha = Math.min(1, f * 1.5);
            if (p.shape === 'ring') { c.strokeStyle = p.col; c.lineWidth = 4 * f; ell(c, p.x, p.y, p.size * (1.4 - f), p.size * (1.4 - f)); c.stroke(); }
            else if (p.shape === 'sq') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); c.restore(); }
            else if (p.shape === 'star') { c.fillStyle = p.col; starPath(c, p.x, p.y, p.size, p.size * 0.45, 5, p.rot); c.fill(); }
            else { c.fillStyle = p.col; ell(c, p.x, p.y, p.size * (0.4 + 0.6 * f), p.size * (0.4 + 0.6 * f)); c.fill(); }
        }
        c.globalAlpha = 1;
    }
    function drawTexts() {
        for (const x of texts) {
            const s = x.t < 0.12 ? 0.5 + x.t / 0.12 * 0.7 : 1.2 - Math.min(0.2, (x.t - 0.12) * 1.5);
            c.globalAlpha = x.t > 0.6 ? 1 - (x.t - 0.6) / 0.35 : 1;
            c.save(); c.translate(x.x, x.y - easeOut(x.t / 0.95) * 42); c.scale(s, s);
            txt(c, x.s, 0, 0, x.size, x.col, 'center', 800, 5);
            c.restore();
        }
        c.globalAlpha = 1;
    }
    function drawHud() {
        c.fillStyle = HUD_BG; rr(c, 12, 12, 112, 40, 20); c.fill();
        c.fillStyle = '#ffd166'; starPath(c, 33, 32, 9, 4); c.fill();
        const b = 1 + scoreBump * 0.3;
        c.save(); c.translate(80, 33); c.scale(b, b); txt(c, String(g.score), 0, 0, 22, '#fff'); c.restore();
        const m = g.mult();
        if (m > 1) {
            const s = 1 + comboBump * 0.5 + Math.sin(g.now * 10) * 0.04;
            c.save(); c.translate(152, 32); c.scale(s, s);
            c.fillStyle = m === 2 ? '#ff8a3d' : '#ff3d6e'; rr(c, -22, -15, 44, 30, 15); c.fill();
            txt(c, '×' + m, 0, 1, 17, '#fff'); c.restore();
        }
        if (spec.time) {
            const frac = g.left / spec.time, low = g.left <= LAST_SECONDS + 0.2, y = 32;
            c.fillStyle = HUD_BG; rr(c, W - 112, 12, 100, 40, 20); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 4; ell(c, W - 88, y, 11, 11); c.stroke();
            c.strokeStyle = low ? '#ff5f6d' : '#2ec4b6';
            c.beginPath(); c.arc(W - 88, y, 11, -Math.PI / 2, -Math.PI / 2 + TAU * frac); c.stroke();
            const pulse = low ? 1 + Math.max(0, Math.sin(g.now * 12)) * 0.15 : 1;
            c.save(); c.translate(W - 48, y + 1); c.scale(pulse, pulse);
            txt(c, t('games.secondsShort', { n: Math.ceil(g.left) }), 0, 0, 20, low ? '#ff9aa2' : '#fff'); c.restore();
        } else if (spec.hud) {
            const label = spec.hud(g);
            c.font = `800 17px ${FONT}`;
            const w = c.measureText(label).width + 30;
            c.fillStyle = HUD_BG; rr(c, W - 12 - w, 12, w, 40, 20); c.fill();
            txt(c, label, W - 12 - w / 2, 33, 17, '#fff');
        }
    }
    function drawCount() {
        if (g.state === 'count') {
            const n = 3 - Math.floor(countT / COUNTDOWN_STEP_S), f = (countT % COUNTDOWN_STEP_S) / COUNTDOWN_STEP_S;
            c.fillStyle = `rgba(10,18,36,${0.35 * (1 - countT / (3 * COUNTDOWN_STEP_S)) + 0.1})`; c.fillRect(0, 0, W, H);
            c.save(); c.translate(W / 2, H / 2); const s = 1.7 - easeOut(f) * 0.7; c.scale(s, s);
            c.globalAlpha = 1 - Math.max(0, f - 0.7) / 0.3;
            txt(c, String(n), 0, 0, 96, '#fff', 'center', 800, 10);
            c.restore(); c.globalAlpha = 1;
        }
        if (goT > 0) {
            const f = 1 - goT / GO_S;
            c.save(); c.translate(W / 2, H / 2); const s = 0.6 + easeOut(f * 2) * 0.7; c.scale(s, s);
            c.globalAlpha = goT > 0.25 ? 1 : goT / 0.25;
            txt(c, t('games.go'), 0, 0, 84, '#ffd166', 'center', 800, 10);
            c.restore(); c.globalAlpha = 1;
        }
    }
    function render() {
        c.setTransform(1, 0, 0, 1, 0, 0);
        if (bg) c.drawImage(bg, 0, 0);
        c.setTransform(k, 0, 0, k, 0, 0);
        c.save();
        if (shakeM > 0.2) c.translate((Math.random() - 0.5) * shakeM, (Math.random() - 0.5) * shakeM);
        game.draw(c, g);
        drawParts(); drawTexts();
        c.restore();
        if (flashA > 0) { c.globalAlpha = flashA; c.fillStyle = flashC; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
        if (g.state === 'play' || g.state === 'count') drawHud();
        drawCount();
    }
    function frame(ts) {
        if (!alive) return;
        raf = requestAnimationFrame(frame);
        const active = g.state === 'play' || g.state === 'count' || parts.length > 0;
        if (!active && ts - last < GAME_PERF.IDLE_FRAME_MS) return;
        const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
        last = ts;
        step(dt);
        render();
    }

    game = spec.make(g, env);
    showIntro();
    raf = requestAnimationFrame(frame);

    return () => {
        alive = false;
        offFinish();
        cancelAnimationFrame(raf);
        clearTimeout(resultTimer);
        window.removeEventListener('resize', fit);
        window.removeEventListener('keydown', kd);
        window.removeEventListener('keyup', ku);
    };
}

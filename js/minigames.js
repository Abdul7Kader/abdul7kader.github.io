// Sechs Arcade-Minispiele (je ca. 20 Sekunden) auf einer gemeinsamen Engine:
// Startkarte → Countdown → Spiel mit Combo, Screenshake & Partikeln → Ergebnis mit Sternen und Bestwert.
// Alle Spiele sind fehlerverzeihend: Es gibt kein „Game Over“, Fehler kosten nur die Combo.
(function () {
    const CV = window.CV;
    const TAU = Math.PI * 2;
    const W = 600, H = 420;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const FONT = 'Outfit, system-ui, sans-serif';
    const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

    // ------------------------------------------------------------------ Zeichenhelfer
    function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
    function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
    function txt(c, s, x, y, size, col, align = 'center', weight = 800, stroke = 0) {
        c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
        if (stroke) { c.lineJoin = 'round'; c.lineWidth = stroke; c.strokeStyle = 'rgba(10,16,32,0.55)'; c.strokeText(s, x, y); }
        c.fillStyle = col; c.fillText(s, x, y);
    }
    function emo(c, s, x, y, size) { c.font = `${size}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(s, x, y); }
    function starPath(c, x, y, r1, r2, n = 5, rot = -Math.PI / 2) {
        c.beginPath();
        for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = rot + i * Math.PI / n; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        c.closePath();
    }
    function segDist(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
        let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }
    const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

    const CTRL = {
        hold: ['🖱️', 'Gedrückt halten'], click: ['🖱️', 'Klicken'], tap: ['👆', 'Tippen'], swipe: ['👆', 'Wischen'],
        space: ['⌨️', 'Leertaste'], arrows: ['⌨️', '← →'], mouse: ['🖱️', 'Maus bewegen'], keys: ['⌨️', 'Tasten 1–3']
    };

    // ------------------------------------------------------------------ Engine
    function arcade(id, spec) {
        return {
            id, name: spec.name, icon: spec.icon, goal: spec.goal, time: spec.time, color: spec.color,
            mount(stage, done, sfx) { return run(id, spec, stage, done, sfx || (() => {})); }
        };
    }

    function run(id, spec, stage, done, sfx) {
        stage.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'arc';
        wrap.style.setProperty('--arc', spec.color || '#ff8a3d');
        const cnv = document.createElement('canvas');
        cnv.className = 'arc-cnv';
        const ov = document.createElement('div');
        ov.className = 'arc-ov';
        wrap.append(cnv, ov);
        stage.appendChild(wrap);
        const c = cnv.getContext('2d');
        let k = 1;
        function fit() {
            const avail = stage.clientWidth || W;
            const small = window.innerWidth < 700;
            const maxH = Math.max(230, window.innerHeight - (small ? 170 : 290));
            const cssW = Math.floor(Math.min(avail, maxH * W / H, 860));
            const cssH = Math.round(cssW * H / W);
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            cnv.width = Math.round(cssW * dpr); cnv.height = Math.round(cssH * dpr);
            cnv.style.width = cssW + 'px'; cnv.style.height = cssH + 'px';
            wrap.style.width = cssW + 'px'; wrap.style.height = cssH + 'px';
            k = dpr * cssW / W;
        }
        fit();
        window.addEventListener('resize', fit);

        const g = {
            W, H, c, state: 'ready', playing: false, t: 0, now: 0, left: spec.time || 0,
            score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, ptr: { x: W / 2, y: H / 2, down: false },
            sfx: (n) => sfx(n)
        };
        let game = null, parts = [], texts = [];
        let shakeM = 0, flashA = 0, flashC = '#fff', stopT = 0, countT = 0, goT = 0, lastCount = 0, lastTick = 0;
        let scoreBump = 0, comboBump = 0, alive = true, last = performance.now(), raf = 0, resultTimer = null;

        g.mult = () => Math.min(3, 1 + Math.floor(g.combo / 5));
        g.pop = (x, y, s, col = '#fff', size = 22) => texts.push({ x, y, s, col, size, t: 0 });
        g.add = (pts, x, y, label, col = '#ffe08a') => {
            g.score += pts; scoreBump = 1;
            if (x != null) g.pop(x, y, (label ? label + '  ' : '') + '+' + pts, col);
        };
        g.hit = (pts, x, y, label, col) => {
            const before = g.mult();
            g.combo++; g.hits++; g.maxCombo = Math.max(g.maxCombo, g.combo);
            const m = g.mult();
            g.add(pts * m, x, y, label, col);
            if (m > before) { g.pop(W / 2, 96, `COMBO ×${m}`, '#ffd166', 30); comboBump = 1; sfx('combo'); }
        };
        g.miss = (x, y, label, soft) => {
            if (g.combo >= 5) g.pop(W / 2, 96, 'Combo verloren', '#ff9b9b', 20);
            g.combo = 0; g.misses++;
            if (!soft) { g.shake(10); sfx('bad'); }
            if (label && x != null) g.pop(x, y, label, '#ff8f8f', 20);
        };
        g.shake = (m) => { if (!CV.reducedMotion) shakeM = Math.max(shakeM, m); };
        g.flash = (col, a = 0.4) => { flashC = col; flashA = a; };
        g.hitstop = (ms) => { stopT = Math.max(stopT, ms / 1000); };
        g.burst = (x, y, n, cols, sp = 240, o = {}) => {
            for (let i = 0; i < n && parts.length < 500; i++) {
                const a = o.dir != null ? o.dir + rnd(-(o.spread || 0.6), o.spread || 0.6) : Math.random() * TAU;
                const v = sp * rnd(0.35, 1);
                parts.push({
                    x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: (o.life || 0.7) * rnd(0.6, 1.2),
                    col: pick(cols), size: (o.size || 5) * rnd(0.6, 1.3), grav: o.grav != null ? o.grav : 500,
                    shape: o.shape || 'dot', rot: Math.random() * TAU, vr: rnd(-8, 8)
                });
            }
        };
        g.ring = (x, y, col = '#fff', r = 40) => parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.45, col, size: r, grav: 0, shape: 'ring' });
        g.end = () => { if (g.state === 'play') finish(); };

        // --------------------------------------------------------- Overlays
        const best = () => CV.store.get('best:' + id, 0);
        const ctrlHtml = (spec.controls || []).map(k2 => {
            const cc = CTRL[k2]; return cc ? `<span class="arc-key"><b>${cc[0]}</b>${cc[1]}</span>` : '';
        }).join('');
        function showIntro() {
            const b = best(), st = CV.store.get('stars:' + id, 0);
            ov.className = 'arc-ov show';
            ov.innerHTML = `
                <div class="arc-card intro">
                    <div class="arc-icon">${spec.icon}</div>
                    <h3>${CV.esc(spec.name)}</h3>
                    <p>${CV.esc(spec.goal)}</p>
                    <div class="arc-keys">${ctrlHtml}</div>
                    <button class="arc-go" data-act="go"><span>▶</span> Spielen</button>
                    <small class="arc-meta">${spec.time ? `${spec.time} Sekunden` : 'ohne Zeitlimit'} · ${b ? `Bestwert ${b} ${'★'.repeat(st)}` : 'kein Game Over – nur Spaß'}</small>
                </div>`;
            ov.querySelector('[data-act="go"]').onclick = (e) => { e.stopPropagation(); start(); };
            ov.onclick = (e) => { if (e.target === ov) start(); };
        }
        function showResult(r) {
            ov.className = 'arc-ov show';
            const praise = ['Gut gemacht!', 'Stark!', 'Richtig stark!', 'Wahnsinn!'][r.stars];
            ov.innerHTML = `
                <div class="arc-card result">
                    <div class="arc-stars">${[0, 1, 2].map(i => `<i class="${i < r.stars ? 'on' : ''}" style="--d:${0.15 + i * 0.22}s">★</i>`).join('')}</div>
                    <h3>${praise}</h3>
                    <div class="arc-score"><b data-to="${r.score}">0</b><span>Punkte</span></div>
                    <div class="arc-best ${r.isBest ? 'new' : ''}">${r.isBest ? '🏆 Neuer Rekord!' : `Bestwert: ${r.best}`}${g.maxCombo >= 5 ? ` · beste Combo ${g.maxCombo}` : ''}</div>
                    <p class="arc-msg">${CV.esc(r.text)}</p>
                    <div class="arc-btns">
                        <button class="arc-again" data-act="again">↻ Nochmal</button>
                        <button class="arc-next" data-act="next">Weiter zu den Fakten →</button>
                    </div>
                </div>`;
            ov.onclick = null;
            ov.querySelector('[data-act="again"]').onclick = () => { sfx('click'); start(); };
            ov.querySelector('[data-act="next"]').onclick = () => { sfx('click'); done(r); };
            const el = ov.querySelector('[data-to]'), to = r.score, t0 = performance.now();
            const tick = () => {
                if (!el.isConnected) return;
                const f = Math.min(1, (performance.now() - t0) / 900);
                el.textContent = Math.round(to * ease(f));
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
            game = spec.make(g);
            sfx('click');
        }
        function finish() {
            g.state = 'over'; g.playing = false;
            const th = typeof spec.stars === 'function' ? spec.stars(g) : spec.stars;
            const stars = th.filter(t => g.score >= t).length;
            const prev = best();
            const isBest = g.score > prev && g.score > 0;
            if (isBest) CV.store.set('best:' + id, g.score);
            CV.store.set('stars:' + id, Math.max(stars, CV.store.get('stars:' + id, 0)));
            sfx(stars >= 2 ? 'fanfare' : 'good');
            if (stars >= 2) g.burst(W / 2, H / 2, 70, ['#ffd166', '#ff8a3d', '#2ec4b6', '#fff', '#ff5f6d'], 420, { shape: 'sq', life: 1.4, grav: 380 });
            const r = { score: g.score, stars, best: Math.max(prev, g.score), isBest, maxCombo: g.maxCombo };
            r.text = spec.result(g, stars);
            resultTimer = setTimeout(() => alive && showResult(r), 750);
        }

        // --------------------------------------------------------- Eingabe
        const local = (e) => { const r = cnv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
        const pd = (e) => {
            e.preventDefault();
            const p = local(e);
            g.ptr.x = p.x; g.ptr.y = p.y; g.ptr.down = true;
            try { cnv.setPointerCapture(e.pointerId); } catch (er) { /* egal */ }
            if (g.state === 'play' && game.down) game.down(p, g);
        };
        const pm = (e) => {
            const p = local(e);
            g.ptr.x = p.x; g.ptr.y = p.y;
            if (g.state === 'play' && game.move) game.move(p, g);
        };
        const pu = (e) => {
            if (!g.ptr.down) return;
            g.ptr.down = false;
            if (g.state === 'play' && game.up) game.up(local(e), g);
        };
        cnv.addEventListener('pointerdown', pd);
        cnv.addEventListener('pointermove', pm);
        cnv.addEventListener('pointerup', pu);
        cnv.addEventListener('pointercancel', pu);
        const GAMEKEYS = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
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
            else if (GAMEKEYS.includes(e.key)) e.preventDefault();
        };
        const ku = (e) => { if (g.state === 'play' && game.key) game.key(e.key, false, g, false); };
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);

        // --------------------------------------------------------- Schleife
        function step(dt) {
            g.now += dt;
            if (stopT > 0) { stopT -= dt; return; }
            if (g.state === 'count') {
                countT += dt;
                const n = 3 - Math.floor(countT / 0.5);
                if (n !== lastCount && n > 0) { lastCount = n; sfx('count'); }
                if (countT >= 1.5) { g.state = 'play'; g.playing = true; goT = 0.7; sfx('go'); }
            } else if (g.state === 'play') {
                g.t += dt;
                if (spec.time) {
                    g.left = Math.max(0, spec.time - g.t);
                    const sec = Math.ceil(g.left);
                    if (g.left <= 3 && sec !== lastTick && sec > 0) { lastTick = sec; sfx('tick'); }
                    if (g.left <= 0) finish();
                }
            }
            goT = Math.max(0, goT - dt);
            game.update(dt, g);
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.life += dt;
                if (p.life >= p.max) { parts.splice(i, 1); continue; }
                p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
                p.vx *= 1 - dt * 1.2;
            }
            for (let i = texts.length - 1; i >= 0; i--) { texts[i].t += dt; if (texts[i].t > 0.95) texts.splice(i, 1); }
            shakeM = Math.max(0, shakeM - dt * 45);
            flashA = Math.max(0, flashA - dt * 2.4);
            scoreBump = Math.max(0, scoreBump - dt * 5);
            comboBump = Math.max(0, comboBump - dt * 3);
        }
        function drawParts() {
            for (const p of parts) {
                const f = 1 - p.life / p.max;
                c.globalAlpha = Math.min(1, f * 1.5);
                if (p.shape === 'ring') {
                    c.strokeStyle = p.col; c.lineWidth = 4 * f; ell(c, p.x, p.y, p.size * (1.4 - f), p.size * (1.4 - f)); c.stroke();
                } else if (p.shape === 'sq') {
                    c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66); c.restore();
                } else if (p.shape === 'star') {
                    c.fillStyle = p.col; starPath(c, p.x, p.y, p.size, p.size * 0.45, 5, p.rot); c.fill();
                } else {
                    c.fillStyle = p.col; ell(c, p.x, p.y, p.size * (0.4 + 0.6 * f), p.size * (0.4 + 0.6 * f)); c.fill();
                }
            }
            c.globalAlpha = 1;
        }
        function drawTexts() {
            for (const t of texts) {
                const s = t.t < 0.12 ? 0.5 + t.t / 0.12 * 0.7 : 1.2 - Math.min(0.2, (t.t - 0.12) * 1.5);
                c.globalAlpha = t.t > 0.6 ? 1 - (t.t - 0.6) / 0.35 : 1;
                c.save(); c.translate(t.x, t.y - ease(t.t / 0.95) * 42); c.scale(s, s);
                txt(c, t.s, 0, 0, t.size, t.col, 'center', 800, 5);
                c.restore();
            }
            c.globalAlpha = 1;
        }
        function drawHud() {
            c.fillStyle = 'rgba(10,18,36,0.55)'; rr(c, 12, 12, 112, 40, 20); c.fill();
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
                const frac = g.left / spec.time, low = g.left <= 3.2;
                const x = W - 62, y = 32;
                c.fillStyle = 'rgba(10,18,36,0.55)'; rr(c, W - 112, 12, 100, 40, 20); c.fill();
                c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 4; ell(c, W - 88, y, 11, 11); c.stroke();
                c.strokeStyle = low ? '#ff5f6d' : '#2ec4b6';
                c.beginPath(); c.arc(W - 88, y, 11, -Math.PI / 2, -Math.PI / 2 + TAU * frac); c.stroke();
                const pulse = low ? 1 + Math.max(0, Math.sin(g.now * 12)) * 0.15 : 1;
                c.save(); c.translate(x + 14, y + 1); c.scale(pulse, pulse);
                txt(c, Math.ceil(g.left) + 's', 0, 0, 20, low ? '#ff9aa2' : '#fff'); c.restore();
            } else if (spec.hud) {
                const label = spec.hud(g);
                c.font = `800 17px ${FONT}`;
                const w = c.measureText(label).width + 30;
                c.fillStyle = 'rgba(10,18,36,0.55)'; rr(c, W - 12 - w, 12, w, 40, 20); c.fill();
                txt(c, label, W - 12 - w / 2, 33, 17, '#fff');
            }
        }
        function drawCount() {
            if (g.state === 'count') {
                const n = 3 - Math.floor(countT / 0.5), f = (countT % 0.5) / 0.5;
                c.fillStyle = `rgba(10,18,36,${0.35 * (1 - countT / 1.5) + 0.1})`; c.fillRect(0, 0, W, H);
                c.save(); c.translate(W / 2, H / 2); const s = 1.7 - ease(f) * 0.7; c.scale(s, s);
                c.globalAlpha = 1 - Math.max(0, f - 0.7) / 0.3;
                txt(c, String(n), 0, 0, 96, '#fff', 'center', 800, 10);
                c.restore(); c.globalAlpha = 1;
            }
            if (goT > 0) {
                const f = 1 - goT / 0.7;
                c.save(); c.translate(W / 2, H / 2); const s = 0.6 + ease(f * 2) * 0.7; c.scale(s, s);
                c.globalAlpha = goT > 0.25 ? 1 : goT / 0.25;
                txt(c, 'LOS!', 0, 0, 84, '#ffd166', 'center', 800, 10);
                c.restore(); c.globalAlpha = 1;
            }
        }
        function render() {
            c.setTransform(k, 0, 0, k, 0, 0);
            c.save();
            if (shakeM > 0.2) c.translate((Math.random() - 0.5) * shakeM, (Math.random() - 0.5) * shakeM);
            game.draw(c, g);
            drawParts();
            drawTexts();
            c.restore();
            if (flashA > 0) { c.globalAlpha = flashA; c.fillStyle = flashC; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
            if (g.state === 'play' || g.state === 'count') drawHud();
            drawCount();
        }
        function frame(ts) {
            if (!alive) return;
            const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
            last = ts;
            step(dt);
            render();
            raf = requestAnimationFrame(frame);
        }

        game = spec.make(g);
        showIntro();
        raf = requestAnimationFrame(frame);

        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            clearTimeout(resultTimer);
            window.removeEventListener('resize', fit);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
        };
    }

    const M = CV.Minigames = {};
    const D = () => CV.derived;
    const data = () => CV.data;

    // ================================================================== 1) Ankunft: Stempel-Jet
    M.arrival = arcade('arrival', {
        name: 'Stempel-Jet', icon: '✈️', color: '#3a86ff', time: 15, stars: [6, 16, 30],
        goal: 'Gedrückt halten = steigen, loslassen = sinken. Sammeln Sie Länder-Stempel ein!',
        controls: ['hold', 'space', 'tap'],
        result: (g) => `${g.hits} Stempel im Pass – gleich sehen Sie, wo ich wirklich überall war.`,
        make(g) {
            const countries = CV.shuffle(D().countries.filter(n => !/deutschland|syrien/i.test(n)));
            let ci = 0, hold = false, spawnT = 0.9, speed = 230, scroll = 0;
            const p = { x: 130, y: H / 2, vy: 0, inv: 0, spin: 0 };
            let items = [];
            const clouds = Array.from({ length: 8 }, (_, i) => ({ x: rnd(0, W), y: rnd(40, H - 150), s: rnd(0.5, 1.2), far: i % 2 === 0 }));
            const hue = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
            function spawn() {
                const r = Math.random();
                if (r < 0.24 && g.t > 1.5) items.push({ kind: 'storm', x: W + 60, y: rnd(80, H - 110), r: 32, ph: Math.random() * TAU });
                else if (r < 0.31) items.push({ kind: 'pass', x: W + 40, y: rnd(80, H - 120), r: 24 });
                else {
                    const n = Math.random() < 0.45 ? 3 : 1, y0 = rnd(80, H - 120), dy = rnd(-45, 45);
                    for (let i = 0; i < n; i++) {
                        const name = countries.length ? countries[ci++ % countries.length] : 'Welt';
                        items.push({ kind: 'stamp', x: W + 40 + i * 64, y: CV.clamp(y0 + dy * i, 70, H - 100), r: 26, name, flag: CV.flag(name), h: hue(name), rot: rnd(-0.3, 0.3) });
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
            return {
                update(dt) {
                    const live = g.state === 'play';
                    const sp = live ? speed : 80;
                    scroll += sp * dt;
                    for (const cl of clouds) { cl.x -= (cl.far ? 0.15 : 0.45) * sp * cl.s * dt; if (cl.x < -120) { cl.x = W + 100; cl.y = rnd(40, H - 150); } }
                    if (!live) { p.y = H / 2 + Math.sin(g.now * 2.2) * 14; p.vy = Math.cos(g.now * 2.2) * 30; }
                    else {
                        speed = 230 + g.t * 7;
                        p.vy += (hold ? -1150 : 680) * dt;
                        p.vy = CV.clamp(p.vy, -330, 370);
                        p.y += p.vy * dt;
                        if (p.y < 50) { p.y = 50; p.vy = Math.max(0, p.vy); }
                        if (p.y > H - 74) { p.y = H - 74; p.vy = -Math.abs(p.vy) * 0.3; }
                        spawnT -= dt;
                        if (spawnT <= 0) { spawn(); spawnT = rnd(0.62, 0.95); }
                        if (Math.random() < 0.6) g.burst(p.x - 46, p.y + 2, 1, ['rgba(255,255,255,0.85)'], 40, { dir: Math.PI, grav: -30, life: 0.5, size: hold ? 7 : 4 });
                    }
                    p.inv = Math.max(0, p.inv - dt); p.spin = Math.max(0, p.spin - dt);
                    for (const it of items) {
                        it.x -= speed * dt;
                        if (!live || it.dead) continue;
                        const d = Math.hypot(it.x - p.x - 8, it.y - p.y);
                        if (it.kind === 'stamp' && d < it.r + 26) {
                            it.dead = true; g.hit(1, it.x, it.y - 30, it.name); g.sfx('coin');
                            g.burst(it.x, it.y, 14, [`hsl(${it.h},80%,60%)`, '#ffe08a', '#fff'], 230, { shape: 'star', size: 6 });
                        } else if (it.kind === 'pass' && d < it.r + 28) {
                            it.dead = true; g.hit(5, it.x, it.y - 30, 'Reisepass!', '#ffd166'); g.sfx('bonus'); g.flash('#ffe08a', 0.35);
                            g.burst(it.x, it.y, 34, ['#ffd166', '#ffb703', '#fff'], 320, { shape: 'star', size: 7 }); g.ring(it.x, it.y, '#ffd166', 50);
                        } else if (it.kind === 'storm' && d < it.r + 18 && p.inv <= 0) {
                            it.zap = 0.35; p.inv = 1.3; p.spin = 0.7; p.vy = 160;
                            g.miss(p.x, p.y - 40, 'Turbulenz!'); g.flash('#fff', 0.55); g.hitstop(60);
                        }
                        if (it.zap) it.zap = Math.max(0, it.zap - dt);
                    }
                    items = items.filter(it => !it.dead && it.x > -90);
                },
                draw(c) {
                    const sky = c.createLinearGradient(0, 0, 0, H);
                    sky.addColorStop(0, '#4aa3f0'); sky.addColorStop(0.7, '#a9dcff'); sky.addColorStop(1, '#e3f5ff');
                    c.fillStyle = sky; c.fillRect(0, 0, W, H);
                    c.fillStyle = 'rgba(255,236,170,0.35)'; ell(c, W - 90, 80, 54, 54); c.fill();
                    c.fillStyle = '#ffe9a8'; ell(c, W - 90, 80, 32, 32); c.fill();
                    const cloud = (cl, a) => {
                        c.fillStyle = `rgba(255,255,255,${a})`;
                        ell(c, cl.x, cl.y, 44 * cl.s, 17 * cl.s); c.fill();
                        ell(c, cl.x + 20 * cl.s, cl.y - 11 * cl.s, 26 * cl.s, 16 * cl.s); c.fill();
                        ell(c, cl.x - 18 * cl.s, cl.y - 6 * cl.s, 20 * cl.s, 13 * cl.s); c.fill();
                    };
                    clouds.filter(cl => cl.far).forEach(cl => cloud(cl, 0.55));
                    // Hügel mit Parallaxe
                    const hills = (off, amp, base, col, f) => {
                        c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
                        for (let x = 0; x <= W + 10; x += 10) c.lineTo(x, base - Math.sin((x + scroll * f) * 0.012 + off) * amp - Math.sin((x + scroll * f) * 0.031) * amp * 0.35);
                        c.lineTo(W, H); c.fill();
                    };
                    hills(1, 26, H - 70, '#9fd88a', 0.25);
                    hills(4, 18, H - 40, '#6fbf5a', 0.6);
                    clouds.filter(cl => !cl.far).forEach(cl => cloud(cl, 0.9));
                    for (const it of items) {
                        if (it.kind === 'stamp') {
                            c.save(); c.translate(it.x, it.y + Math.sin(g.now * 3 + it.x * 0.02) * 3); c.rotate(it.rot);
                            c.fillStyle = '#fff'; ell(c, 0, 0, it.r, it.r); c.fill();
                            c.strokeStyle = `hsl(${it.h},70%,45%)`; c.lineWidth = 3; c.setLineDash([5, 4]); ell(c, 0, 0, it.r - 4, it.r - 4); c.stroke(); c.setLineDash([]);
                            if (it.flag) emo(c, it.flag, 0, -3, 22);
                            else txt(c, it.name.slice(0, 2).toUpperCase(), 0, -3, 16, `hsl(${it.h},70%,40%)`);
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
                        txt(c, hold ? '↑ steigen' : 'Halten = steigen', p.x + 70, p.y - 40, 16, '#fff', 'left', 800, 5);
                        c.globalAlpha = 1;
                    }
                },
                down() { hold = true; },
                up() { hold = false; },
                key(k, down) { if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { hold = down; return true; } }
            };
        }
    });

    // ================================================================== 2) Bildungsweg: Wort-Ninja
    const WORDS = [
        { de: 'Hallo', ar: 'مرحبا', en: 'Hello', fr: 'Bonjour' },
        { de: 'Danke', ar: 'شكراً', en: 'Thanks', fr: 'Merci' },
        { de: 'Freund', ar: 'صديق', en: 'Friend', fr: 'Ami' },
        { de: 'Arbeit', ar: 'عمل', en: 'Work', fr: 'Travail' },
        { de: 'Zukunft', ar: 'مستقبل', en: 'Future', fr: 'Avenir' },
        { de: 'Erfolg', ar: 'نجاح', en: 'Success', fr: 'Succès' },
        { de: 'Team', ar: 'فريق', en: 'Team', fr: 'Équipe' },
        { de: 'Lernen', ar: 'تعلّم', en: 'Learn', fr: 'Apprendre' },
        { de: 'Welt', ar: 'عالم', en: 'World', fr: 'Monde' },
        { de: 'Familie', ar: 'عائلة', en: 'Family', fr: 'Famille' }
    ];
    const LANG = { ar: ['AR', '#2a9d8f'], en: ['EN', '#3a86ff'], fr: ['FR', '#e63946'], de: ['DE', '#f4a300'] };
    M.school = arcade('school', {
        name: 'Wort-Ninja', icon: '🥷', color: '#7b5cff', time: 15, stars: [8, 20, 34],
        goal: 'Wischen Sie durch die fliegenden Wörter in vier Sprachen. Nur die Bomben 💣 nicht treffen!',
        controls: ['swipe', 'hold'],
        result: (g) => `${g.hits} Wörter zerlegt – ganz ohne Wörterbuch.`,
        make(g) {
            let items = [], halves = [], trail = [], spawnT = 0.4, swipeN = 0, swipeT = 0, stun = 0;
            const bg = Array.from({ length: 14 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: pick(['A', 'ع', 'é', 'ß', 'Ω', 'ç', 'ä', 'ل']), size: rnd(26, 70), sp: rnd(4, 12) }));
            function launch() {
                const x = rnd(90, W - 90);
                const bomb = g.t > 1.5 && Math.random() < 0.17;
                const it = { x, y: H + 30, vx: (W / 2 - x) * rnd(0.25, 0.6) + rnd(-40, 40), vy: -rnd(560, 640), rot: rnd(-0.2, 0.2), vr: rnd(-1.2, 1.2), bomb, h: 40 };
                if (bomb) { it.w = 52; }
                else {
                    const wd = pick(WORDS), lang = pick(['ar', 'en', 'fr', 'ar', 'en', 'fr', 'de']);
                    it.word = wd[lang]; it.de = wd.de; it.lang = lang;
                    g.c.font = `800 19px ${FONT}`;
                    it.w = Math.max(84, g.c.measureText(it.word).width + 56);
                }
                items.push(it);
            }
            function sliceAt(it, dir) {
                it.dead = true;
                if (it.bomb) {
                    g.miss(it.x, it.y - 34, 'Bumm!'); g.flash('#fff', 0.7); g.shake(18); g.hitstop(90); g.sfx('boom');
                    g.burst(it.x, it.y, 40, ['#ff8a3d', '#ffd166', '#333', '#ff5f6d'], 380, { size: 7 });
                    stun = 0.45; trail = [];
                    return;
                }
                const col = LANG[it.lang][1];
                const nx = Math.cos(dir + Math.PI / 2), ny = Math.sin(dir + Math.PI / 2);
                [-1, 1].forEach(s => halves.push(Object.assign({}, it, { side: s, vx: it.vx * 0.5 + nx * s * 140, vy: Math.min(it.vy, 0) * 0.3 + ny * s * 140 - 80, vr: s * rnd(3, 6), life: 0 })));
                g.burst(it.x, it.y, 18, [col, '#fff', col], 300, { size: 6, grav: 700 });
                g.hit(1, it.x, it.y - 36, it.lang === 'de' ? it.word : `${it.word} = ${it.de}`, '#fff');
                g.sfx('slice');
                swipeN++; swipeT = 0.35;
                if (swipeN === 3) { g.add(3, it.x, it.y - 70, 'Multi-Slice!', '#7ee8fa'); g.sfx('combo'); g.ring(it.x, it.y, '#7ee8fa', 60); }
            }
            function within(it, x, y, pad) {
                const hw = Math.max(0, it.w / 2 - it.h / 2);
                return segDist(x, y, it.x - hw, it.y, it.x + hw, it.y) < it.h / 2 + pad;
            }
            function swipe(ax, ay, bx, by) {
                if (stun > 0) return;
                const dir = Math.atan2(by - ay, bx - ax);
                for (const it of items) {
                    if (it.dead) continue;
                    const hw = Math.max(0, it.w / 2 - it.h / 2);
                    const d = Math.min(segDist(it.x - hw, it.y, ax, ay, bx, by), segDist(it.x, it.y, ax, ay, bx, by), segDist(it.x + hw, it.y, ax, ay, bx, by));
                    if (d < it.h / 2 + 6) sliceAt(it, dir);
                }
            }
            return {
                update(dt) {
                    for (const b of bg) { b.y -= b.sp * dt; if (b.y < -60) { b.y = H + 60; b.x = rnd(0, W); } }
                    if (g.state !== 'over') {
                        spawnT -= dt;
                        if (spawnT <= 0) {
                            const n = 1 + (Math.random() < 0.5) + (g.t > 7 && Math.random() < 0.45);
                            for (let i = 0; i < n; i++) launch();
                            spawnT = Math.max(0.55, 1.05 - g.t * 0.025);
                        }
                    }
                    for (const it of items) {
                        it.vy += 520 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt * 0.3;
                        if (it.vy > 0 && it.y > H + 50 && !it.dead) {
                            it.dead = true;
                            if (!it.bomb && g.playing && g.combo > 0) g.miss(it.x, H - 30, 'verpasst', true);
                        }
                    }
                    items = items.filter(it => !it.dead);
                    for (const h of halves) { h.life += dt; h.vy += 900 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; }
                    halves = halves.filter(h => h.life < 1.2 && h.y < H + 80);
                    for (const p of trail) p.t += dt;
                    trail = trail.filter(p => p.t < 0.16);
                    swipeT -= dt; if (swipeT <= 0) swipeN = 0;
                    stun = Math.max(0, stun - dt);
                },
                draw(c) {
                    const bgG = c.createLinearGradient(0, 0, W, H);
                    bgG.addColorStop(0, '#1d1b3a'); bgG.addColorStop(1, '#3b2667');
                    c.fillStyle = bgG; c.fillRect(0, 0, W, H);
                    for (const b of bg) txt(c, b.s, b.x, b.y, b.size, 'rgba(255,255,255,0.05)');
                    const drawItem = (it, clipSide) => {
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
                            const [tag, col] = LANG[it.lang];
                            c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, -it.w / 2 + 2, -it.h / 2 + 5, it.w, it.h, it.h / 2); c.fill();
                            c.fillStyle = '#fff'; rr(c, -it.w / 2, -it.h / 2, it.w, it.h, it.h / 2); c.fill();
                            c.fillStyle = col; rr(c, -it.w / 2 + 5, -it.h / 2 + 5, 30, it.h - 10, (it.h - 10) / 2); c.fill();
                            txt(c, tag, -it.w / 2 + 20, 1, 11, '#fff');
                            txt(c, it.word, 17, 1, 19, '#1d2433');
                        }
                        c.restore();
                    };
                    for (const it of items) drawItem(it);
                    for (const h of halves) { c.globalAlpha = Math.max(0, 1 - h.life / 1.2); drawItem(h, h.side); c.globalAlpha = 1; }
                    if (trail.length > 1) {
                        c.lineCap = 'round'; c.lineJoin = 'round';
                        for (let i = 1; i < trail.length; i++) {
                            const a = trail[i - 1], b = trail[i], f = 1 - b.t / 0.16;
                            c.strokeStyle = stun > 0 ? `rgba(255,120,120,${f})` : `rgba(190,240,255,${f * 0.6})`; c.lineWidth = 12 * f;
                            c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
                            c.strokeStyle = `rgba(255,255,255,${f})`; c.lineWidth = 5 * f;
                            c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
                        }
                    }
                    if (g.state === 'play' && g.t < 2.5) { c.globalAlpha = 1 - g.t / 2.5; txt(c, 'Durch die Wörter wischen!', W / 2, H - 40, 18, '#fff', 'center', 800, 5); c.globalAlpha = 1; }
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
    });

    // ================================================================== 4) Business: Prompt-Fabrik
    // Agentische Softwareentwicklung: Ein KI-Agent liefert nur dann sicher aus, wenn der Mensch den Ablauf steuert –
    // Anforderung klären, Plan prüfen, Code generieren lassen, selbst reviewen (Human in the Loop), testen.
    // Die Schritte fahren übers Fließband – den Schritt antippen, dessen Platz gerade leuchtet.
    const PIECES = [
        { k: 'anf', ic: '🎯', name: 'Anforderung', col: '#7b5cff' },
        { k: 'plan', ic: '🗺️', name: 'Plan prüfen', col: '#3a86ff' },
        { k: 'code', ic: '🤖', name: 'KI-Code', col: '#0e9f9a' },
        { k: 'hitl', ic: '🧑‍💻', name: 'Human in the Loop', col: '#e08600' },
        { k: 'test', ic: '✅', name: 'Tests & QS', col: '#16a34a' }
    ];
    const TRAPS = [
        { k: 'blind', ic: '⚠️', name: 'Ungeprüft übernehmen', col: '#8b93a3', msg: 'Nie ungeprüft!' },
        { k: 'vage', ic: '❓', name: 'Unklare Anforderung', col: '#9aa1ad', msg: 'Zu unklar!' }
    ];
    const NP = PIECES.length;
    M.career = arcade('career', {
        name: 'Prompt-Fabrik', icon: '🤖', color: '#7b5cff', time: 15, stars: [10, 24, 40],
        goal: 'Führen Sie den KI-Agenten sicher zur Auslieferung: Tippen Sie auf dem Fließband den Schritt an, dessen Platz gerade leuchtet. Ungeprüftes meiden!',
        controls: ['click', 'tap'],
        result: (g) => g.shipped ? `${g.shipped}× sicher ausgeliefert – mit Plan, Review und Tests.` : 'Plan, Review, Tests – erst dann wird ausgeliefert.',
        make(g) {
            const BELT_Y = 312, PW = 108, PH = 60;
            const SLOT_Y = 150, SLOT_W = 76, SLOT_H = 58, SLOT_X0 = 176, SLOT_GAP = 6;
            g.shipped = 0;
            // Text in eine oder zwei Zeilen setzen, damit lange Schritte („Human in the Loop“) passen
            function label(c, s, x, y, maxW, size, col) {
                c.font = `800 ${size}px ${FONT}`;
                if (c.measureText(s).width <= maxW || !s.includes(' ')) { txt(c, s, x, y, size, col); return; }
                const w = s.split(' '); let best = null;
                for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '); const d = Math.max(c.measureText(a).width, c.measureText(b).width); if (!best || d < best.d) best = { d, a, b }; }
                const fs = best.d > maxW ? size * maxW / best.d : size;
                txt(c, best.a, x, y - fs * 0.55, fs, col); txt(c, best.b, x, y + fs * 0.55, fs, col);
            }
            const slotX = (i) => SLOT_X0 + i * (SLOT_W + SLOT_GAP) + SLOT_W / 2;
            let items = [], flying = [], filled = 0, spawnT = 0.2, speed = 150, belt = 0, robo = { happy: 0, think: 0 }, outputs = [], done = 0;
            function spawn() {
                const need = PIECES[filled % NP];
                const r = Math.random();
                const kind = r < 0.42 ? need : r < 0.58 ? pick(TRAPS) : pick(PIECES);
                items.push({ kind, x: W + PW / 2 + 4, y: BELT_Y, shake: 0, wob: Math.random() * TAU });
            }
            function tap(it) {
                if (filled >= NP) return;
                const need = PIECES[filled];
                if (it.kind === need) {
                    it.dead = true;
                    flying.push({ kind: it.kind, x: it.x, y: it.y, tx: slotX(filled), ty: SLOT_Y, t: 0 });
                    g.hit(1, it.x, it.y - 46, it.kind.name, '#fff');
                    g.sfx('pop');
                    filled++;
                    if (filled === NP) {
                        done++; g.shipped = done;
                        setTimeout(() => {
                            if (g.state !== 'play') return;
                            g.add(5, 100, 92, 'Sicher ausgeliefert ✓', '#ffd166');
                            g.sfx('bonus'); g.flash('#e9e3ff', 0.35);
                            g.burst(92, 150, 26, ['#ffd166', '#b9a8ff', '#fff', '#7ee8fa'], 300, { shape: 'star', size: 6, grav: 120 });
                            robo.happy = 1.2;
                            outputs.push({ x: 92, y: 150, t: 0 });
                            filled = 0;
                        }, 260);
                        robo.think = 0.3;
                    }
                } else {
                    it.shake = 0.4;
                    g.miss(it.x, it.y - 46, it.kind.msg || `Erst ${need.name}!`);
                }
            }
            function card(c, kind, x, y, s = 1, alpha = 1) {
                c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha = alpha;
                c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -PW / 2 + 2, -PH / 2 + 5, PW, PH, 14); c.fill();
                c.fillStyle = kind.col; rr(c, -PW / 2, -PH / 2, PW, PH, 14); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.18)'; rr(c, -PW / 2 + 4, -PH / 2 + 4, PW - 8, PH / 2 - 4, 10); c.fill();
                emo(c, kind.ic, -PW / 2 + 20, 0, 21);
                label(c, kind.name, 15, 1, PW - 44, 13, '#fff');
                c.restore(); c.globalAlpha = 1;
            }
            return {
                update(dt) {
                    const live = g.state === 'play';
                    if (live) {
                        speed = 150 + g.t * 7;
                        spawnT -= dt;
                        if (spawnT <= 0) { spawn(); spawnT = Math.max(0.5, 0.82 - g.t * 0.015); }
                    } else if (!items.length && g.state !== 'over') { for (let i = 0; i < 5; i++) items.push({ kind: i % 2 ? pick(TRAPS) : PIECES[i], x: 70 + i * 120, y: BELT_Y, shake: 0, wob: 0 }); }
                    const sp = live ? speed : 40;
                    belt += sp * dt;
                    for (const it of items) { it.x -= sp * dt; it.shake = Math.max(0, it.shake - dt); }
                    items = items.filter(it => !it.dead && it.x > -PW);
                    if (!live && g.state !== 'over') for (const it of items) if (it.x < -PW / 2 + 5) it.x += W + PW;
                    for (const f of flying) f.t += dt * 3.2;
                    flying = flying.filter(f => f.t < 1);
                    robo.happy = Math.max(0, robo.happy - dt); robo.think = Math.max(0, robo.think - dt);
                    for (const o of outputs) o.t += dt;
                    outputs = outputs.filter(o => o.t < 1.2);
                },
                draw(c) {
                    const bg = c.createLinearGradient(0, 0, 0, H);
                    bg.addColorStop(0, '#f1edff'); bg.addColorStop(1, '#e2f3ff');
                    c.fillStyle = bg; c.fillRect(0, 0, W, H);
                    c.strokeStyle = 'rgba(123,92,255,0.07)'; c.lineWidth = 1;
                    for (let x = 0; x < W; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
                    for (let y = 0; y < H; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
                    // KI-Roboter
                    const rx = 92, ry = 150 + Math.sin(g.now * 3) * 4 - robo.happy * 6;
                    c.strokeStyle = '#4b4f6b'; c.lineWidth = 4; c.beginPath(); c.moveTo(rx, ry - 50); c.lineTo(rx, ry - 66); c.stroke();
                    c.fillStyle = robo.think > 0 || robo.happy > 0 ? '#ffd166' : '#ff6b8b'; ell(c, rx, ry - 70, 7, 7); c.fill();
                    c.fillStyle = '#ffffff'; rr(c, rx - 56, ry - 50, 112, 92, 26); c.fill();
                    c.strokeStyle = '#d6d9ec'; c.lineWidth = 3; c.stroke();
                    c.fillStyle = '#1d2147'; rr(c, rx - 42, ry - 36, 84, 50, 16); c.fill();
                    c.strokeStyle = '#7ee8fa'; c.fillStyle = '#7ee8fa'; c.lineWidth = 4; c.lineCap = 'round';
                    if (robo.happy > 0) { [-16, 16].forEach(dx => { c.beginPath(); c.arc(rx + dx, ry - 8, 8, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }); }
                    else if (robo.think > 0) { [-18, 0, 18].forEach((dx, i) => { ell(c, rx + dx, ry - 11 + Math.sin(g.now * 14 + i) * 3, 4, 4); c.fill(); }); }
                    else { const bl = Math.sin(g.now * 1.7) > 0.96 ? 1.5 : 7; [-16, 16].forEach(dx => { ell(c, rx + dx, ry - 11, 6, bl); c.fill(); }); }
                    c.fillStyle = '#7b5cff'; rr(c, rx - 30, ry + 22, 60, 10, 5); c.fill();
                    txt(c, 'KI-AGENT', rx, ry + 58, 11, '#5b5f80');
                    // Ergebnisse, die der Roboter „ausspuckt“
                    for (const o of outputs) {
                        const k = ease(o.t);
                        c.save(); c.globalAlpha = 1 - Math.max(0, o.t - 0.8) / 0.4;
                        c.translate(o.x + 10 + k * 60, o.y - 70 - k * 50); c.rotate(-0.2 + k * 0.2);
                        c.fillStyle = '#fff'; rr(c, -42, -28, 84, 56, 10); c.fill();
                        c.strokeStyle = '#16a34a'; c.lineWidth = 3; c.stroke();
                        txt(c, '✓', -22, 0, 22, '#16a34a'); c.fillStyle = '#c9cde0';
                        [-12, 0, 12].forEach(y => c.fillRect(-6, y - 2, 36 - Math.abs(y), 4));
                        c.restore();
                    }
                    // Prompt-Leiste mit vier Plätzen
                    c.fillStyle = '#ffffff'; rr(c, SLOT_X0 - 12, SLOT_Y - 58, NP * (SLOT_W + SLOT_GAP) - SLOT_GAP + 24, 108, 20); c.fill();
                    c.strokeStyle = '#e1dcff'; c.lineWidth = 2; c.stroke();
                    txt(c, 'SICHERER KI-WORKFLOW', SLOT_X0, SLOT_Y - 40, 11, '#7b5cff', 'left', 800);
                    c.strokeStyle = '#d6d0f5'; c.lineWidth = 2;
                    for (let i = 0; i < NP - 1; i++) { const ax = slotX(i) + SLOT_W / 2, y = SLOT_Y + 6; c.beginPath(); c.moveTo(ax, y); c.lineTo(ax + SLOT_GAP, y); c.stroke(); }
                    PIECES.forEach((p, i) => {
                        const x = slotX(i), y = SLOT_Y + 6;
                        const isNext = i === filled && g.state === 'play';
                        if (i < filled) {
                            c.fillStyle = p.col; rr(c, x - SLOT_W / 2, y - SLOT_H / 2, SLOT_W, SLOT_H, 12); c.fill();
                            emo(c, p.ic, x, y - 12, 18); label(c, p.name, x, y + 14, SLOT_W - 8, 10.5, '#fff');
                        } else {
                            const pulse = isNext ? 0.5 + Math.sin(g.now * 8) * 0.5 : 0;
                            c.fillStyle = isNext ? p.col + '33' : '#f4f2fb'; rr(c, x - SLOT_W / 2, y - SLOT_H / 2, SLOT_W, SLOT_H, 12); c.fill();
                            c.setLineDash([6, 5]); c.strokeStyle = p.col; c.lineWidth = isNext ? 3 + pulse * 2 : 2; c.globalAlpha = isNext ? 1 : 0.45;
                            c.stroke(); c.setLineDash([]);
                            emo(c, p.ic, x, y - 12, 18); label(c, p.name, x, y + 14, SLOT_W - 8, 10.5, p.col);
                            c.globalAlpha = 1;
                        }
                    });
                    // Fließband
                    c.fillStyle = '#3b3f5c'; rr(c, -10, BELT_Y - 10, W + 20, 56, 12); c.fill();
                    c.fillStyle = '#4b5072';
                    for (let x = -(belt % 34); x < W + 34; x += 34) c.fillRect(x, BELT_Y - 6, 16, 48);
                    c.fillStyle = '#2b2e45'; for (let x = 20; x < W; x += 70) { ell(c, x, BELT_Y + 52, 12, 12); c.fill(); }
                    for (const it of items) {
                        const sx = it.shake > 0 ? Math.sin(it.shake * 60) * 5 : 0;
                        card(c, it.kind, it.x + sx, it.y + Math.sin(g.now * 4 + it.wob) * 1.5);
                    }
                    for (const f of flying) {
                        const k = ease(f.t);
                        card(c, f.kind, CV.lerp(f.x, f.tx, k), CV.lerp(f.y, f.ty, k) - Math.sin(k * Math.PI) * 60, 1 - k * 0.2, 1 - k * 0.6);
                    }
                    if (g.state === 'play' && g.t < 2.6) { c.globalAlpha = 1 - g.t / 2.6; txt(c, 'Tippen Sie den Schritt an, der oben leuchtet!', W / 2, 392, 16, '#4b3fb0', 'center', 800); c.globalAlpha = 1; }
                },
                down(p) {
                    for (let i = items.length - 1; i >= 0; i--) {
                        const it = items[i];
                        if (Math.abs(p.x - it.x) < PW / 2 + 6 && Math.abs(p.y - it.y) < PH / 2 + 12) { tap(it); return; }
                    }
                }
            };
        }
    });

    // ================================================================== 5) Tech-Lab: Ideen-Regen (Fangspiel)
    M.lab = arcade('lab', {
        name: 'Ideen-Regen', icon: '💡', color: '#16a34a', time: 15, stars: [8, 20, 34],
        goal: 'Bewegen Sie den Korb und fangen Sie die fallenden Ideen. Den grauen Regenwolken ausweichen!',
        controls: ['mouse', 'tap', 'arrows'],
        result: (g) => `${g.hits} Ideen gefangen – die besten landen im Code.`,
        make(g) {
            const bk = { x: W / 2, tx: W / 2, y: H - 58, w: 96, wob: 0, squash: 0 };
            let items = [], spawnT = 0.4, keyL = false, keyR = false;
            const GOOD = [['💡', 1, 0.72], ['⭐', 2, 0.92], ['🏆', 5, 1]];
            function spawn() {
                const bad = g.t > 1 && Math.random() < 0.2;
                let kind = null;
                if (!bad) { const r = Math.random(); kind = GOOD.find(k => r < k[2]); }
                items.push({ x: rnd(40, W - 40), y: -30, vy: rnd(150, 190) + g.t * 9, bad, ic: kind && kind[0], pts: kind && kind[1], rot: rnd(-0.4, 0.4), ph: Math.random() * TAU });
            }
            return {
                update(dt) {
                    const live = g.state === 'play';
                    if (live) {
                        if (keyL || keyR) bk.tx = bk.x + ((keyR ? 1 : 0) - (keyL ? 1 : 0)) * 60;
                        spawnT -= dt;
                        if (spawnT <= 0) { spawn(); spawnT = Math.max(0.3, 0.6 - g.t * 0.02); }
                    } else bk.tx = W / 2 + Math.sin(g.now * 1.3) * 140;
                    bk.tx = CV.clamp(bk.tx, bk.w / 2 + 8, W - bk.w / 2 - 8);
                    const prev = bk.x;
                    bk.x = CV.lerp(bk.x, bk.tx, Math.min(1, dt * 16));
                    bk.lean = CV.clamp((bk.x - prev) * 0.02, -0.25, 0.25);
                    bk.wob = Math.max(0, bk.wob - dt); bk.squash = Math.max(0, bk.squash - dt * 5);
                    for (const it of items) {
                        it.y += it.vy * dt; it.ph += dt * 3;
                        if (!live || it.done) continue;
                        if (it.y > bk.y - 24 && it.y < bk.y + 10 && Math.abs(it.x - bk.x) < bk.w / 2 + 6) {
                            it.done = true;
                            if (it.bad) {
                                bk.wob = 0.5; g.miss(bk.x, bk.y - 50, 'Regen!');
                                g.burst(it.x, it.y, 18, ['#9ad1ff', '#cfe8ff', '#7aa7d6'], 220, { size: 4, grav: 600 });
                            } else {
                                bk.squash = 1;
                                g.hit(it.pts, it.x, it.y - 30, it.pts >= 5 ? 'Volltreffer!' : '', it.pts > 1 ? '#ffd166' : '#fff');
                                g.sfx(it.pts >= 5 ? 'bonus' : 'coin');
                                g.burst(it.x, it.y, it.pts >= 5 ? 26 : 10, ['#ffd166', '#fff', '#b9fbc0'], 200, { shape: 'star', size: 5, grav: 150 });
                            }
                        } else if (!it.bad && it.y > H + 20) { it.done = true; if (g.combo > 0) g.miss(it.x, H - 20, '', true); }
                    }
                    items = items.filter(it => !it.done && it.y < H + 40);
                },
                draw(c) {
                    const sky = c.createLinearGradient(0, 0, 0, H);
                    sky.addColorStop(0, '#8fd3ff'); sky.addColorStop(1, '#e6f7ff');
                    c.fillStyle = sky; c.fillRect(0, 0, W, H);
                    c.fillStyle = 'rgba(255,236,170,0.45)'; ell(c, 90, 80, 50, 50); c.fill();
                    c.fillStyle = '#ffe28a'; ell(c, 90, 80, 30, 30); c.fill();
                    c.fillStyle = '#a7dc8b'; ell(c, 140, H + 30, 260, 90); c.fill(); ell(c, 480, H + 40, 280, 100); c.fill();
                    c.fillStyle = '#7cc46b'; c.fillRect(0, H - 26, W, 26);
                    for (const it of items) {
                        const sw = Math.sin(it.ph) * 4;
                        if (it.bad) {
                            c.fillStyle = '#8a94a6';
                            ell(c, it.x + sw, it.y, 30, 15); c.fill(); ell(c, it.x - 10 + sw, it.y - 10, 17, 13); c.fill(); ell(c, it.x + 11 + sw, it.y - 12, 19, 15); c.fill();
                            c.strokeStyle = '#6aa8e8'; c.lineWidth = 2.5; c.lineCap = 'round';
                            for (let i = -1; i <= 1; i++) { const yy = it.y + 20 + ((g.now * 60 + i * 7) % 12); c.beginPath(); c.moveTo(it.x + i * 12 + sw, yy); c.lineTo(it.x + i * 12 - 3 + sw, yy + 7); c.stroke(); }
                        } else {
                            c.fillStyle = it.pts >= 5 ? 'rgba(255,209,102,0.5)' : 'rgba(255,255,255,0.55)'; ell(c, it.x + sw, it.y, 22, 22); c.fill();
                            c.save(); c.translate(it.x + sw, it.y); c.rotate(it.rot + Math.sin(it.ph) * 0.15); emo(c, it.ic, 0, 0, it.pts >= 5 ? 32 : 28); c.restore();
                        }
                    }
                    // Korb
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
                    if (g.state === 'play' && g.t < 2.4) { c.globalAlpha = 1 - g.t / 2.4; txt(c, 'Korb mit Maus oder Finger bewegen', W / 2, 90, 17, '#1b2a4a', 'center', 800); c.globalAlpha = 1; }
                },
                down(p) { bk.tx = p.x; },
                move(p) { bk.tx = p.x; },
                key(k, down) {
                    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keyL = down; return true; }
                    if (k === 'ArrowRight' || k === 'd' || k === 'D') { keyR = down; return true; }
                }
            };
        }
    });

    // ================================================================== 6) Projekte: Projekt-Stapler
    // Jeder Block ist ein Projekt, ein Skill oder eine Eigenschaft. Gestapelt wird, bis alle aufgetaucht sind.
    const KIND = { p: ['Projekt', 28], s: ['Skill', 212], e: ['Eigenschaft', 150] };
    function stackLabels() {
        const d = data(), x = D();
        const proj = (d.projects || []).map(p => ['p', p.title]);
        const pref = ['Java', 'SQL', 'JavaScript', 'React', 'Node.js', 'Claude Code', 'Git', 'Jira'];
        const toks = x.skillTokens || [];
        const skills = pref.filter(t => toks.includes(t)).concat(toks.filter(t => !pref.includes(t))).slice(0, 7).map(t => ['s', t]);
        const traits = (d.traits || []).slice(0, 6).map(t => ['e', t]);
        const out = [], n = Math.max(proj.length, skills.length, traits.length);
        for (let i = 0; i < n; i++) [proj[i], skills[i], traits[i]].forEach(v => v && out.push(v));
        // Lange Begriffe zuerst (unten, auf den breiten Blöcken), kürzere oben – der Turm wird schmaler wie eine Pyramide.
        return out.sort((a, b) => b[1].length - a[1].length);
    }
    M.projects = arcade('projects', {
        name: 'Projekt-Stapler', icon: '🏗️', color: '#f59e0b', time: 0,
        stars: () => { const n = stackLabels().length; return [Math.round(n * 0.8), Math.round(n * 1.25), Math.round(n * 1.8)]; },
        goal: 'Tippen, um den Block abzusetzen. Stapeln Sie alle meine Projekte, Skills und Eigenschaften!',
        controls: ['click', 'space', 'tap'],
        hud: (g) => `🏗️ ${g.level || 0} / ${g.total || 0}`,
        result: (g) => `${g.level || 0} Bausteine sicher gestapelt.`,
        make(g) {
            const labels = stackLabels();
            const BH = 30, DEP = 10, MINW = 54;
            const base = { x: W / 2 - 120, w: 240, label: 'FH Dortmund · Praktische Informatik', kind: 'base', hue: 222, land: 0 };
            const stack = [base];
            let cur = null, dir = 1, speed = 170, cam = 0, falling = [], perfectRun = 0, over = false, endT = 0, idx = 0;
            g.level = 0; g.total = labels.length;
            const yOf = (i) => H - 56 - i * BH;
            function newBlock() {
                const top = stack[stack.length - 1], i = stack.length;
                const [kind, label] = labels[idx];
                dir = i % 2 ? 1 : -1;
                cur = { x: dir > 0 ? 30 - top.w * 0.5 : W - 30 - top.w * 0.5, w: top.w, label, kind, hue: KIND[kind][1] + (i % 3) * 8, land: 0 };
                speed = Math.min(340, 170 + i * 9);
            }
            function drop() {
                if (!cur || over) return;
                const top = stack[stack.length - 1], dx = cur.x - top.x, i = stack.length, cy = yOf(i) + cam;
                if (Math.abs(dx) <= 7) {
                    cur.x = top.x; perfectRun++;
                    if (perfectRun >= 3) { const grow = Math.min(14, 250 - cur.w); if (grow > 0) { cur.w += grow; cur.x -= grow / 2; } }
                    g.hit(2, cur.x + cur.w / 2, cy - 30, perfectRun >= 3 ? 'Perfekt! Wächst!' : 'Perfekt!', '#ffd166');
                    g.ring(cur.x + cur.w / 2, cy + BH / 2, '#fff', cur.w / 2);
                    g.sfx('perfect');
                } else {
                    const overlap = top.w - Math.abs(dx);
                    if (overlap <= 0) {
                        // Daneben: Block fällt, derselbe Baustein kommt noch einmal
                        falling.push(Object.assign({}, cur, { y: yOf(i), vy: 0, vx: dir * 80, rot: 0, vr: dir * 2 }));
                        perfectRun = 0;
                        g.miss(W / 2, cy - 40, 'Daneben – nochmal!');
                        cur = null; newBlock();
                        return;
                    }
                    const piece = dx > 0 ? { x: top.x + top.w, w: dx } : { x: cur.x, w: -dx };
                    falling.push(Object.assign({}, cur, piece, { y: yOf(i), vy: -60, vx: Math.sign(dx) * 90, rot: 0, vr: Math.sign(dx) * 3 }));
                    if (dx > 0) cur.w = overlap; else { cur.x = top.x; cur.w = overlap; }
                    if (cur.w < MINW) { const c0 = cur.x + cur.w / 2; cur.w = MINW; cur.x = c0 - MINW / 2; }
                    perfectRun = 0; g.combo = 0;
                    g.add(1, cur.x + cur.w / 2, cy - 26);
                    g.sfx('thud');
                }
                cur.land = 1;
                stack.push(cur); g.level = stack.length - 1; idx++;
                g.shake(3);
                g.burst(cur.x + cur.w / 2, yOf(i) + cam + BH, 10, ['#fff', '#e5e7eb'], 140, { grav: 200, life: 0.4, size: 4 });
                cur = null;
                if (idx >= labels.length) { g.add(10, W / 2, H / 2 - 40, 'Alles gestapelt!', '#ffd166'); g.sfx('fanfare'); g.flash('#fff', 0.4); over = true; endT = 1.3; }
                else newBlock();
            }
            function block(c, b, y) {
                const h = b.hue, sat = b.kind === 'base' ? 30 : 68;
                c.fillStyle = `hsl(${h},${sat}%,74%)`;
                c.beginPath(); c.moveTo(b.x, y); c.lineTo(b.x + b.w, y); c.lineTo(b.x + b.w + DEP, y - DEP); c.lineTo(b.x + DEP, y - DEP); c.closePath(); c.fill();
                c.fillStyle = `hsl(${h},${sat - 8}%,40%)`;
                c.beginPath(); c.moveTo(b.x + b.w, y); c.lineTo(b.x + b.w + DEP, y - DEP); c.lineTo(b.x + b.w + DEP, y - DEP + BH); c.lineTo(b.x + b.w, y + BH); c.closePath(); c.fill();
                c.fillStyle = `hsl(${h},${sat}%,55%)`; c.fillRect(b.x, y, b.w, BH);
                if (b.w > 34) {
                    c.save(); c.beginPath(); c.rect(b.x + 3, y, b.w - 6, BH); c.clip();
                    let tag = KIND[b.kind] ? KIND[b.kind][0].toUpperCase() : '';
                    const avail = b.w - 14;
                    let fs = 13, label = b.label, tw2 = 0, lw = 0;
                    const measure = () => {
                        c.font = `800 8.5px ${FONT}`; tw2 = tag ? c.measureText(tag).width + 10 : 0;
                        c.font = `800 ${fs}px ${FONT}`; lw = c.measureText(label).width;
                        return lw + (tag ? tw2 + 6 : 0) + 16;
                    };
                    if (measure() > avail) tag = '';
                    while (measure() > avail && fs > 9) fs -= 0.5;
                    while (measure() > avail && label.length > 3) label = label.slice(0, -2) + '…';
                    const total = measure();
                    const x0 = b.x + b.w / 2 - total / 2;
                    c.fillStyle = `hsla(${h},70%,24%,0.82)`; rr(c, x0, y + 6, total, 18, 9); c.fill();
                    if (tag) { c.fillStyle = 'rgba(255,255,255,0.22)'; rr(c, x0 + 4, y + 9, tw2, 12, 6); c.fill(); txt(c, tag, x0 + 4 + tw2 / 2, y + 15.5, 8.5, '#fff'); }
                    txt(c, label, x0 + (tag ? tw2 + 10 : 8) + lw / 2, y + 15.5, fs, '#fff');
                    c.restore();
                }
            }
            return {
                update(dt) {
                    if (g.state === 'play' && !cur && !over) newBlock();
                    if (cur && g.state === 'play') {
                        cur.x += dir * speed * dt;
                        const L = 20 - cur.w * 0.6, R = W - 20 - cur.w * 0.4;
                        if (cur.x > R) { cur.x = R; dir = -1; }
                        if (cur.x < L) { cur.x = L; dir = 1; }
                    }
                    for (const f of falling) { f.vy += 1100 * dt; f.y += f.vy * dt; f.x += f.vx * dt; f.rot += f.vr * dt; }
                    falling = falling.filter(f => f.y + cam < H + 200);
                    for (const b of stack) b.land = Math.max(0, b.land - dt * 4);
                    const want = Math.max(0, (stack.length - 6) * BH);
                    cam = CV.lerp(cam, want, Math.min(1, dt * 4));
                    if (endT > 0) { endT -= dt; if (endT <= 0) g.end(); }
                },
                draw(c) {
                    const hgt = Math.min(1, cam / 500);
                    const sky = c.createLinearGradient(0, 0, 0, H);
                    sky.addColorStop(0, `hsl(${215 + hgt * 25},${70 - hgt * 20}%,${72 - hgt * 45}%)`);
                    sky.addColorStop(1, `hsl(${30 + hgt * 200},${80 - hgt * 40}%,${88 - hgt * 40}%)`);
                    c.fillStyle = sky; c.fillRect(0, 0, W, H);
                    if (hgt > 0.2) { c.fillStyle = `rgba(255,255,255,${(hgt - 0.2) * 0.9})`; for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = (i * 53) % (H * 0.6); c.fillRect(x, y, 2, 2); } }
                    c.fillStyle = 'rgba(80,100,140,0.35)';
                    for (let i = 0; i < 12; i++) { const bx = i * 54, bh2 = 40 + ((i * 37) % 70); c.fillRect(bx, H - 40 - bh2 + cam * 0.35, 46, bh2 + 40); }
                    c.fillStyle = '#6b7280'; c.fillRect(0, H - 40 + cam, W, 60);
                    c.fillStyle = '#facc15'; for (let x = 0; x < W; x += 60) c.fillRect(x, H - 34 + cam, 30, 5);
                    stack.forEach((b, i) => {
                        const y = yOf(i) + cam + (b.land ? -Math.sin(b.land * Math.PI) * 4 : 0);
                        if (y < -BH * 2 || y > H + 20) return;
                        block(c, b, y);
                    });
                    for (const f of falling) {
                        c.save(); const cx = f.x + f.w / 2, cy = f.y + cam + BH / 2;
                        c.translate(cx, cy); c.rotate(f.rot); c.translate(-cx, -cy);
                        block(c, f, f.y + cam); c.restore();
                    }
                    if (cur) {
                        const y = yOf(stack.length) + cam;
                        const top = stack[stack.length - 1];
                        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.setLineDash([4, 6]); c.lineWidth = 1.5;
                        c.beginPath(); c.moveTo(top.x, y + BH); c.lineTo(top.x, y - 30); c.moveTo(top.x + top.w, y + BH); c.lineTo(top.x + top.w, y - 30); c.stroke(); c.setLineDash([]);
                        block(c, cur, y);
                        c.strokeStyle = '#475569'; c.lineWidth = 2; c.beginPath(); c.moveTo(cur.x + cur.w / 2, y); c.lineTo(cur.x + cur.w / 2, y - 60); c.stroke();
                        c.fillStyle = '#facc15'; c.fillRect(cur.x + cur.w / 2 - 8, y - 66, 16, 8);
                    }
                    // Legende
                    let lx = 16;
                    Object.values(KIND).forEach(([name, hue]) => {
                        c.fillStyle = `hsl(${hue},68%,55%)`; rr(c, lx, H - 22, 10, 10, 3); c.fill();
                        txt(c, name, lx + 16, H - 16.5, 11, '#fff', 'left', 700); lx += 26 + name.length * 6.4;
                    });
                    if (g.state === 'play' && g.t < 2.4) { c.globalAlpha = 1 - g.t / 2.4; txt(c, 'Klick / Leertaste = absetzen', W / 2, 92, 17, '#fff', 'center', 800, 5); c.globalAlpha = 1; }
                },
                down() { drop(); },
                key(k, down, _g, rep) { if ((k === ' ' || k === 'Enter' || k === 'ArrowDown') && down && !rep) { drop(); return true; } }
            };
        }
    });

    // ================================================================== 7) See: SUP-Slalom
    M.lake = arcade('lake', {
        name: 'SUP-Slalom', icon: '🏄', color: '#06b6d4', time: 15, stars: [7, 18, 32],
        goal: 'Das Board folgt Ihrer Maus oder Ihrem Finger: einfach nach links oder rechts bewegen, Felsen ausweichen und Sterne einsammeln!',
        controls: ['mouse', 'swipe', 'arrows'],
        result: (g) => `${g.hits} Sterne eingesammelt – Ausdauer zahlt sich aus.`,
        make(g) {
            const RL = W / 2 - 190, RR = W / 2 + 190;
            const LANES = [W / 2 - 125, W / 2, W / 2 + 125];
            const p = { lane: 1, x: LANES[1], y: H - 96, inv: 0, jump: 0, wob: 0, paddle: 0 };
            let speed = 250, scroll = 0, rowT = 0.6, objs = [];
            const banks = Array.from({ length: 16 }, (_, i) => ({ side: i % 2, y: i * 60, s: rnd(0.8, 1.3), off: rnd(0, 40), kind: Math.random() < 0.7 ? 'tree' : 'rock' }));
            function spawnRow() {
                const free = Math.floor(Math.random() * 3);
                const r = Math.random();
                if (r < 0.2 && g.t > 2 && free !== 1) {
                    const startL = free === 0 ? 1 : 0;
                    objs.push({ kind: 'log', x: (LANES[startL] + LANES[startL + 1]) / 2, y: -40, hw: 100, hh: 14 });
                } else {
                    for (let l = 0; l < 3; l++) {
                        if (l === free) continue;
                        if (Math.random() < 0.55) objs.push({ kind: 'rock', x: LANES[l] + rnd(-10, 10), y: -40 - rnd(0, 30), hw: 26, hh: 22, s: rnd(0.85, 1.15) });
                    }
                }
                const q = Math.random();
                const kind = q < 0.08 ? 'duck' : q < 0.17 && g.t > 3 ? 'ramp' : q < 0.85 ? 'star' : null;
                if (kind === 'star') for (let i = 0; i < 3; i++) objs.push({ kind, x: LANES[free], y: -40 - i * 46, hw: 18, hh: 18 });
                else if (kind) objs.push({ kind, x: LANES[free], y: -50, hw: kind === 'ramp' ? 40 : 20, hh: kind === 'ramp' ? 20 : 18 });
            }
            function move(d) { setLane(p.lane + d); }
            function setLane(l) {
                const nl = CV.clamp(l, 0, 2);
                if (nl !== p.lane) { p.lane = nl; g.sfx('step'); g.burst(p.x, p.y + 20, 6, ['#e0fbff', '#fff'], 100, { grav: 0, life: 0.4, size: 4 }); }
            }
            function follow(x) {
                let best = 0;
                LANES.forEach((lx, i) => { if (Math.abs(x - lx) < Math.abs(x - LANES[best])) best = i; });
                setLane(best);
            }
            return {
                update(dt) {
                    const live = g.state === 'play';
                    if (live) speed = CV.lerp(speed, Math.min(460, 250 + g.t * 10), dt * 1.2);
                    const sp = live ? speed : 110;
                    scroll += sp * dt; p.paddle += dt * (live ? 5 : 2);
                    for (const b of banks) { b.y += sp * dt; if (b.y > H + 60) { b.y -= 16 * 60; b.kind = Math.random() < 0.7 ? 'tree' : 'rock'; b.off = rnd(0, 40); } }
                    if (!live) p.lane = 1 + Math.round(Math.sin(g.now * 0.8));
                    p.x = CV.lerp(p.x, LANES[p.lane], Math.min(1, dt * 13));
                    p.inv = Math.max(0, p.inv - dt); p.jump = Math.max(0, p.jump - dt); p.wob = Math.max(0, p.wob - dt);
                    if (live) { rowT -= dt * sp / 250; if (rowT <= 0) { spawnRow(); rowT = rnd(0.55, 0.8); } }
                    if (live && Math.random() < 0.7) g.burst(p.x + rnd(-8, 8), p.y + 40, 1, ['rgba(255,255,255,0.8)'], 40, { dir: Math.PI / 2, spread: 0.8, grav: -40, life: 0.5, size: 4 });
                    for (const o of objs) {
                        o.y += sp * dt;
                        if (!live || o.done) continue;
                        if (Math.abs(o.x - p.x) < o.hw + 14 && Math.abs(o.y - p.y) < o.hh + 26) {
                            if (o.kind === 'star') { o.done = true; g.hit(1, o.x, o.y - 26); g.sfx('coin'); g.burst(o.x, o.y, 10, ['#ffd166', '#fff'], 160, { shape: 'star', size: 5, grav: 0 }); }
                            else if (o.kind === 'duck') { o.done = true; g.hit(4, o.x, o.y - 30, 'Quietsch!', '#ffd166'); g.sfx('bonus'); g.ring(o.x, o.y, '#ffd166', 40); g.burst(o.x, o.y, 20, ['#ffd166', '#ffb703', '#fff'], 240, { shape: 'star', size: 6, grav: 0 }); }
                            else if (o.kind === 'ramp') { if (p.jump <= 0) { o.done = true; p.jump = 0.85; g.add(2, o.x, o.y - 40, 'Air!', '#7ee8fa'); g.sfx('whoosh'); } }
                            else if (p.jump <= 0 && p.inv <= 0) {
                                o.done = true; p.inv = 1.1; p.wob = 0.6; speed *= 0.6;
                                g.miss(p.x, p.y - 50, 'Platsch!');
                                g.burst(p.x, p.y, 26, ['#bdefff', '#fff', '#7dd3fc'], 300, { grav: 600, size: 6 });
                            }
                        }
                    }
                    objs = objs.filter(o => o.y < H + 80 && !(o.done && o.kind !== 'rock' && o.kind !== 'log'));
                },
                draw(c) {
                    c.fillStyle = '#6fbf5a'; c.fillRect(0, 0, W, H);
                    const water = c.createLinearGradient(RL, 0, RR, 0);
                    water.addColorStop(0, '#38bdf8'); water.addColorStop(0.5, '#0ea5e9'); water.addColorStop(1, '#38bdf8');
                    c.fillStyle = '#e8d3a8'; c.fillRect(RL - 14, 0, RR - RL + 28, H);
                    c.fillStyle = water; c.fillRect(RL, 0, RR - RL, H);
                    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5; c.lineCap = 'round';
                    for (let i = 0; i < 14; i++) {
                        const y = ((i * 47 + scroll * 1.0) % (H + 40)) - 20, x = RL + 30 + ((i * 137) % (RR - RL - 60));
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
                    for (const o of objs) {
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
                    // Board
                    const js = p.jump > 0 ? Math.sin((1 - p.jump / 0.85) * Math.PI) : 0;
                    const sc = 1 + js * 0.35;
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
                    if (g.state === 'play' && g.t < 2.4) { c.globalAlpha = 1 - g.t / 2.4; txt(c, CV.isTouch ? 'Finger nach links oder rechts ziehen' : 'Maus nach links oder rechts bewegen', W / 2, 90, 17, '#fff', 'center', 800, 5); c.globalAlpha = 1; }
                },
                // Board folgt dem Zeiger: nächstliegende Spur, die Bewegung dorthin ist weich.
                down(pp) { follow(pp.x); },
                move(pp) { follow(pp.x); },
                key(k, down, _g, rep) {
                    if (!down || rep) return ['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(k);
                    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { move(-1); return true; }
                    if (k === 'ArrowRight' || k === 'd' || k === 'D') { move(1); return true; }
                }
            };
        }
    });
})();

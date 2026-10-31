// Sieben kurze Minispiele (je ca. 15–20 Sekunden). Jedes ist fehlerverzeihend und endet immer positiv.
(function () {
    const CV = window.CV;
    const TAU = Math.PI * 2;

    function canvasStage(stage, LW = 640, LH = 400) {
        const cnv = document.createElement('canvas');
        cnv.className = 'mg-canvas';
        stage.appendChild(cnv);
        const ctx = cnv.getContext('2d');
        function fit() {
            const r = stage.getBoundingClientRect();
            const maxH = Math.max(200, window.innerHeight * 0.52);
            const w = Math.min(r.width, maxH * LW / LH), h = w * LH / LW;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            cnv.width = Math.round(w * dpr); cnv.height = Math.round(h * dpr);
            cnv.style.width = w + 'px'; cnv.style.height = h + 'px';
            ctx.setTransform(dpr * w / LW, 0, 0, dpr * w / LW, 0, 0);
        }
        fit();
        window.addEventListener('resize', fit);
        return {
            cnv, ctx, LW, LH,
            toLocal(e) { const r = cnv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * LW, y: (e.clientY - r.top) / r.height * LH }; },
            destroy() { window.removeEventListener('resize', fit); }
        };
    }
    function loop(fn) {
        let id, last = performance.now(), stopped = false;
        const tick = (ts) => {
            if (stopped) return;
            const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
            fn(dt);
            id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        return () => { stopped = true; cancelAnimationFrame(id); };
    }
    function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
    function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
    function txt(c, s, x, y, size, col, align = 'center', weight = 800) {
        c.font = `${weight} ${size}px Outfit, system-ui, sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y);
    }
    function timeBar(c, LW, frac, label) {
        c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, 16, 14, LW - 32, 10, 5); c.fill();
        c.fillStyle = frac > 0.25 ? '#2ec4b6' : '#ff8a3d'; rr(c, 16, 14, Math.max(0, (LW - 32) * frac), 10, 5); c.fill();
        if (label) { c.fillStyle = 'rgba(27,42,74,0.85)'; rr(c, 16, 32, 150, 28, 14); c.fill(); txt(c, label, 91, 46, 14, '#fff'); }
    }
    function floaters() {
        const list = [];
        return {
            add(x, y, s, col = '#fff') { list.push({ x, y, s, col, t: 0 }); },
            draw(c, dt) {
                for (let i = list.length - 1; i >= 0; i--) {
                    const f = list[i]; f.t += dt;
                    if (f.t > 0.9) { list.splice(i, 1); continue; }
                    c.globalAlpha = 1 - f.t / 0.9; txt(c, f.s, f.x, f.y - f.t * 50, 18, f.col); c.globalAlpha = 1;
                }
            }
        };
    }
    function keyHandler(down, up) {
        const kd = (e) => { if (down(e) === true) e.preventDefault(); };
        const ku = (e) => { if (up) up(e); };
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
        return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
    }

    const G = CV.Minigames = {};

    // ------------------------------------------------------------- 1) Ankunft: Stempel-Flug
    G.arrival = {
        name: 'Stempel-Flug',
        how: 'Gedrückt halten (Maus, Finger oder Leertaste) = steigen. Sammeln Sie Länder-Stempel ein!',
        mount(stage, done, sfx) {
            const S = canvasStage(stage), c = S.ctx, LW = S.LW, LH = S.LH;
            const pool = CV.shuffle(CV.derived.countries.filter(n => !/deutschland|syrien/i.test(n)));
            const plane = { x: 130, y: 190, vy: 0 };
            let hold = false, t = 0, got = 0, spawned = 0, spawnT = 0.5, ended = false;
            const DUR = 15, stamps = [], fl = floaters();
            const clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 120, y: 40 + Math.random() * 180, s: 0.6 + Math.random() * 0.8 }));
            const on = (e) => { hold = true; e.preventDefault(); }, off = () => { hold = false; };
            S.cnv.addEventListener('pointerdown', on); window.addEventListener('pointerup', off); S.cnv.addEventListener('pointerleave', off);
            const unkey = keyHandler((e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { hold = true; return true; } }, (e) => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') hold = false; });
            let runway = LW + 200;
            const stop = loop((dt) => {
                t += dt;
                if (t < DUR) {
                    plane.vy += (hold ? -560 : 360) * dt;
                    plane.vy = CV.clamp(plane.vy, -240, 240);
                    plane.y += plane.vy * dt;
                    if (plane.y < 50) { plane.y = 50; plane.vy = 0; }
                    if (plane.y > 320) { plane.y = 320; plane.vy = 0; }
                    spawnT -= dt;
                    if (spawnT <= 0 && pool.length) {
                        const name = pool[spawned % pool.length];
                        stamps.push({ x: LW + 40, y: 70 + Math.random() * 230, name, flag: CV.flag(name) || '🛂', got: false });
                        spawned++; spawnT = 1.15;
                    }
                } else {
                    plane.y = CV.lerp(plane.y, 322, dt * 2); plane.vy = 0;
                    runway = Math.max(60, runway - 420 * dt);
                    if (t > DUR + 2.4 && !ended) {
                        ended = true;
                        const n = CV.derived.countries.length;
                        done({ score: got, max: spawned, text: (got ? `${got} Länder-Stempel gesammelt!` : 'Turbulenzen! ✈️') + ` Ich selbst habe bereits ${n} Länder kennengelernt – Offenheit für Neues gehört zu mir.` });
                    }
                }
                for (const s of stamps) {
                    s.x -= 230 * dt;
                    if (!s.got && Math.hypot(s.x - plane.x, s.y - plane.y) < 46) { s.got = true; got++; sfx('coin'); fl.add(s.x, s.y - 20, '+ ' + s.name, '#ffe08a'); }
                }
                for (const cl of clouds) { cl.x -= 40 * cl.s * dt; if (cl.x < -100) { cl.x = LW + 80; cl.y = 40 + Math.random() * 180; } }

                const sky = c.createLinearGradient(0, 0, 0, LH);
                sky.addColorStop(0, '#5fb6f0'); sky.addColorStop(1, '#cdeeff');
                c.fillStyle = sky; c.fillRect(0, 0, LW, LH);
                c.fillStyle = 'rgba(255,240,180,0.9)'; ell(c, LW - 90, 70, 30, 30); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.9)';
                for (const cl of clouds) { ell(c, cl.x, cl.y, 40 * cl.s, 16 * cl.s); c.fill(); ell(c, cl.x + 20 * cl.s, cl.y - 10 * cl.s, 24 * cl.s, 14 * cl.s); c.fill(); }
                c.fillStyle = '#8fd16f'; ell(c, 150, LH + 30, 260, 90); c.fill(); ell(c, 520, LH + 40, 300, 100); c.fill();
                c.fillStyle = '#6dbb55'; c.fillRect(0, LH - 40, LW, 40);
                if (t >= DUR) { c.fillStyle = '#5b6170'; c.fillRect(runway - 60, LH - 52, LW, 20); c.fillStyle = '#fff'; for (let x = runway - 40; x < LW; x += 50) c.fillRect(x, LH - 43, 26, 3); }
                for (const s of stamps) {
                    if (s.got) continue;
                    c.fillStyle = '#fff'; ell(c, s.x, s.y, 30, 30); c.fill();
                    c.strokeStyle = '#d62839'; c.lineWidth = 3; c.setLineDash([5, 4]); ell(c, s.x, s.y, 26, 26); c.stroke(); c.setLineDash([]);
                    c.font = '24px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s.flag, s.x, s.y - 4);
                    txt(c, s.name, s.x, s.y + 16, 9, '#d62839');
                }
                c.save(); c.translate(plane.x, plane.y); c.rotate(plane.vy * 0.0016);
                c.fillStyle = '#fff'; rr(c, -46, -10, 92, 20, 10); c.fill();
                c.fillStyle = '#2f5d8a'; c.fillRect(-38, -1, 76, 3);
                c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(-46, -8); c.lineTo(-34, -8); c.lineTo(-44, -28); c.lineTo(-52, -28); c.closePath(); c.fill();
                c.fillStyle = '#dfe7ef'; c.beginPath(); c.moveTo(-8, 2); c.lineTo(14, 2); c.lineTo(-6, 22); c.lineTo(-20, 22); c.closePath(); c.fill();
                c.fillStyle = '#7fc8f0'; for (let i = 0; i < 6; i++) { ell(c, -22 + i * 9, -4, 2.4, 2.4); c.fill(); }
                c.fillStyle = '#1b2a4a'; ell(c, 40, -3, 5, 4); c.fill();
                c.restore();
                fl.draw(c, dt);
                timeBar(c, LW, Math.max(0, 1 - t / DUR), `🛂 Stempel: ${got}`);
                if (t < 2.2) { c.fillStyle = 'rgba(27,42,74,0.75)'; rr(c, LW / 2 - 170, LH / 2 - 26, 340, 52, 16); c.fill(); txt(c, 'Halten = steigen · Loslassen = sinken', LW / 2, LH / 2, 17, '#fff'); }
            });
            return () => { stop(); unkey(); S.destroy(); window.removeEventListener('pointerup', off); };
        }
    };

    // ------------------------------------------------------------- 2) Sprachschule: Sprach-Quiz
    const WORDS = [
        { de: 'Hallo', ar: 'مرحبا', tr: 'marhaban', en: 'Hello', fr: 'Bonjour' },
        { de: 'Danke', ar: 'شكراً', tr: 'shukran', en: 'Thank you', fr: 'Merci' },
        { de: 'Freund', ar: 'صديق', tr: 'sadiq', en: 'Friend', fr: 'Ami' },
        { de: 'Arbeit', ar: 'عمل', tr: '‘amal', en: 'Work', fr: 'Travail' },
        { de: 'Zukunft', ar: 'مستقبل', tr: 'mustaqbal', en: 'Future', fr: 'Avenir' },
        { de: 'Willkommen', ar: 'أهلاً وسهلاً', tr: 'ahlan wa sahlan', en: 'Welcome', fr: 'Bienvenue' },
        { de: 'Erfolg', ar: 'نجاح', tr: 'najah', en: 'Success', fr: 'Succès' }
    ];
    G.language = {
        name: 'Sprach-Quiz',
        how: 'Was bedeutet das Wort auf Deutsch? 5 Runden – Arabisch, Englisch und Französisch.',
        mount(stage, done, sfx) {
            const rounds = CV.shuffle(WORDS).slice(0, 5);
            const langs = [['ar', 'Arabisch', '🇸🇾'], ['fr', 'Französisch', '🇫🇷'], ['en', 'Englisch', '🇬🇧'], ['ar', 'Arabisch', '🇸🇾'], ['fr', 'Französisch', '🇫🇷']];
            let i = 0, score = 0, timer = null;
            const box = document.createElement('div');
            box.className = 'quiz';
            stage.appendChild(box);
            function show() {
                if (i >= rounds.length) {
                    const n = CV.derived.languages.length;
                    done({
                        score, max: rounds.length,
                        text: score >= 4 ? `${score}/5 richtig – Sie sind ja selbst ein Sprachtalent! 😉 Ich wechsle täglich zwischen ${n} Sprachen.`
                            : `${score}/5 – gar nicht so leicht, oder? Für mich ist der Wechsel zwischen ${n} Sprachen Alltag.`
                    });
                    return;
                }
                const w = rounds[i], [code, lname, flag] = langs[i];
                const opts = CV.shuffle([w.de].concat(CV.shuffle(WORDS.filter(x => x !== w)).slice(0, 3).map(x => x.de)));
                box.innerHTML = `
                    <div class="quiz-top"><span>Runde ${i + 1} / ${rounds.length}</span><span>✔ ${score}</span></div>
                    <div class="quiz-word"><small>${flag} ${lname}</small><strong ${code === 'ar' ? 'dir="rtl" lang="ar"' : ''}>${CV.esc(w[code])}</strong>
                    ${code === 'ar' ? `<em>gesprochen: „${CV.esc(w.tr)}“</em>` : ''}</div>
                    <div class="quiz-opts">${opts.map(o => `<button class="quiz-opt" data-v="${CV.esc(o)}">${CV.esc(o)}</button>`).join('')}</div>`;
                box.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => {
                    if (box.dataset.lock === '1') return;
                    box.dataset.lock = '1';
                    const ok = b.dataset.v === w.de;
                    if (ok) { score++; sfx('good'); } else sfx('bad');
                    box.querySelectorAll('.quiz-opt').forEach(x => { if (x.dataset.v === w.de) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
                    timer = setTimeout(() => { box.dataset.lock = '0'; i++; show(); }, ok ? 650 : 1100);
                }));
            }
            show();
            return () => clearTimeout(timer);
        }
    };

    // ------------------------------------------------------------- 3) Campus: IT-Memory
    G.school = {
        name: 'IT-Memory',
        how: 'Finden Sie alle Paare. Die Karten werden zu Beginn kurz aufgedeckt – gut merken!',
        mount(stage, done, sfx) {
            const pref = ['Java', 'SQL', 'Linux', 'GitHub', 'HTML', 'C++', 'JS', 'CSS', 'Figma', 'Jira'];
            const toks = CV.derived.skillTokens;
            let labels = pref.filter(p => toks.includes(p));
            toks.forEach(t => { if (!labels.includes(t)) labels.push(t); });
            labels = labels.slice(0, 6);
            while (labels.length < 6) labels.push(['Teamwork', 'Agile', 'Clean Code', 'Testing', 'UX', 'Debugging'][labels.length]);
            const cards = CV.shuffle(labels.concat(labels));
            const board = document.createElement('div');
            board.className = 'memory';
            board.innerHTML = cards.map((l, i) => `<button class="mcard open" data-i="${i}" data-l="${CV.esc(l)}"><span class="front">?</span><span class="back"><b>${CV.skillIcon(l)}</b>${CV.esc(l)}</span></button>`).join('');
            const status = document.createElement('div');
            status.className = 'mg-status';
            status.textContent = 'Gut merken …';
            stage.appendChild(status);
            stage.appendChild(board);
            let first = null, lock = true, moves = 0, found = 0;
            const timers = [];
            timers.push(setTimeout(() => {
                board.querySelectorAll('.mcard').forEach(c => c.classList.remove('open'));
                lock = false; status.textContent = 'Los geht’s! Züge: 0';
            }, 1700));
            board.addEventListener('click', (e) => {
                const card = e.target.closest('.mcard');
                if (!card || lock || card.classList.contains('open')) return;
                card.classList.add('open'); sfx('click');
                if (!first) { first = card; return; }
                moves++;
                status.textContent = `Züge: ${moves}`;
                if (first.dataset.l === card.dataset.l) {
                    first.classList.add('done'); card.classList.add('done'); first = null; found++; sfx('good');
                    if (found === labels.length) timers.push(setTimeout(() => done({
                        score: moves, max: labels.length,
                        text: `Alle Paare in ${moves} Zügen! Ein gutes Gedächtnis brauche ich im Informatikstudium jeden Tag.`
                    }), 600));
                } else {
                    lock = true;
                    const a = first; first = null;
                    timers.push(setTimeout(() => { a.classList.remove('open'); card.classList.remove('open'); lock = false; }, 750));
                }
            });
            return () => timers.forEach(clearTimeout);
        }
    };

    // ------------------------------------------------------------- 4) Business: Hotline-Held
    G.career = {
        name: 'Hotline-Held',
        how: 'Telefone klingeln! Klicken bzw. tippen Sie auf klingelnde Telefone, bevor die Kunden auflegen.',
        mount(stage, done, sfx) {
            const DUR = 15;
            const wrap = document.createElement('div');
            wrap.className = 'hotline';
            wrap.innerHTML = `<div class="mg-status"><span id="hl-score">😊 0 Kunden</span><span class="hl-bar"><i id="hl-time"></i></span></div>
                <div class="phones">${Array.from({ length: 6 }, (_, i) => `<button class="phone" data-i="${i}"><span class="ph">☎️</span><span class="face"></span></button>`).join('')}</div>`;
            stage.appendChild(wrap);
            const phones = Array.from(wrap.querySelectorAll('.phone')).map(el => ({ el, ring: 0 }));
            let t = 0, next = 0.5, answered = 0, total = 0, ended = false;
            const scoreEl = wrap.querySelector('#hl-score'), timeEl = wrap.querySelector('#hl-time');
            wrap.addEventListener('pointerdown', (e) => {
                const b = e.target.closest('.phone'); if (!b) return;
                const p = phones[+b.dataset.i];
                if (p.ring > 0) {
                    p.ring = 0; answered++; sfx('good');
                    b.classList.remove('ringing'); b.classList.add('happy');
                    b.querySelector('.face').textContent = ['😊', '😄', '🙂', '🤩'][answered % 4];
                    setTimeout(() => { b.classList.remove('happy'); b.querySelector('.face').textContent = ''; }, 650);
                    scoreEl.textContent = `😊 ${answered} Kunden`;
                }
            });
            const stop = loop((dt) => {
                t += dt;
                timeEl.style.width = Math.max(0, 100 - t / DUR * 100) + '%';
                if (t < DUR) {
                    next -= dt;
                    if (next <= 0) {
                        const idle = phones.filter(p => p.ring <= 0 && !p.el.classList.contains('happy'));
                        if (idle.length) {
                            const p = idle[Math.floor(Math.random() * idle.length)];
                            p.ring = 1.7; total++; p.el.classList.add('ringing'); sfx('ring');
                        }
                        next = 0.55 + Math.random() * 0.45;
                    }
                }
                phones.forEach(p => {
                    if (p.ring > 0) { p.ring -= dt; if (p.ring <= 0) { p.el.classList.remove('ringing'); } }
                });
                if (t >= DUR + 0.4 && !ended) {
                    ended = true;
                    done({ score: answered, max: total, text: answered ? `${answered} zufriedene Kunden in 15 Sekunden! Schnell und trotzdem freundlich – so habe ich im Kundenservice für Samsung & Telekom gearbeitet.` : 'Die Leitungen glühen! ☎️ Im Kundenservice für Samsung & Telekom habe ich gelernt, auch im größten Ansturm freundlich zu bleiben.' });
                }
            });
            return stop;
        }
    };

    // ------------------------------------------------------------- 5) Tech-Lab: Bug-Jagd
    G.lab = {
        name: 'Bug-Jagd',
        how: 'Im Code krabbeln Bugs! Klicken bzw. tippen Sie sie an, um sie zu fixen.',
        mount(stage, done, sfx) {
            const S = canvasStage(stage), c = S.ctx, LW = S.LW, LH = S.LH;
            const DUR = 15, GOAL = 12, bugs = [], fl = floaters(), splats = [];
            let t = 0, fixed = 0, spawnT = 0.2, ended = false;
            const code = [
                ['kw', 'public class '], ['ty', 'Bewerbung'], ['tx', ' {'], ['', ''],
                ['kw', '  private final '], ['ty', 'Kandidat'], ['tx', ' abdul;'], ['', ''],
                ['kw', '  public boolean '], ['fn', 'passtInsTeam'], ['tx', '() {'], ['', ''],
                ['kw', '    return '], ['tx', 'abdul.lernt() && abdul.liefert();'], ['', ''],
                ['tx', '  }'], ['', ''], ['tx', '}'], ['', '']
            ];
            const lines = [];
            let cur = [];
            code.forEach(([k, s]) => { if (!k && !s) { lines.push(cur); cur = []; } else cur.push([k, s]); });
            const col = { kw: '#c792ea', ty: '#ffcb6b', fn: '#82aaff', tx: '#d6deeb' };
            function spawnBug() {
                const x = 60 + Math.random() * (LW - 120), y = 80 + Math.random() * (LH - 130);
                bugs.push({ x, y, a: Math.random() * TAU, v: 60 + Math.random() * 40 + fixed * 4, wob: Math.random() * TAU, hue: Math.random() < 0.5 ? '#ff5d73' : '#7bd88f', age: 0 });
            }
            const hit = (e) => {
                const p = S.toLocal(e);
                let best = null, bd = 40;
                bugs.forEach(b => { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < bd) { bd = d; best = b; } });
                if (best) {
                    bugs.splice(bugs.indexOf(best), 1); fixed++; sfx('splat');
                    splats.push({ x: best.x, y: best.y, t: 0 });
                    fl.add(best.x, best.y - 16, '✓ gefixt', '#7bd88f');
                } else sfx('click');
            };
            S.cnv.addEventListener('pointerdown', hit);
            const stop = loop((dt) => {
                t += dt;
                if (t < DUR && fixed < GOAL) {
                    spawnT -= dt;
                    if (spawnT <= 0 && bugs.length < 6) { spawnBug(); spawnT = 0.75; }
                } else if (!ended) {
                    ended = true;
                    setTimeout(() => done({ score: fixed, max: GOAL, text: (fixed ? `${fixed} Bug${fixed === 1 ? "" : "s"} gefixt!` : 'Die Bugs waren heute flink! 🐞') + ' Debugging gehört bei PSI zu meinem Alltag – systematisch, geduldig und mit Spaß an der Lösung.' }), 500);
                }
                for (const b of bugs) {
                    b.wob += dt * 6;
                    b.a += Math.sin(b.wob) * dt * 1.6;
                    b.x += Math.cos(b.a) * b.v * dt; b.y += Math.sin(b.a) * b.v * dt;
                    b.age += dt;
                    const vx = Math.cos(b.a), vy = Math.sin(b.a);
                    if ((b.x < 24 && vx < 0) || (b.x > LW - 24 && vx > 0)) b.a = Math.PI - b.a;
                    if ((b.y < 44 && vy < 0) || (b.y > LH - 24 && vy > 0)) b.a = -b.a;
                }
                c.fillStyle = '#011627'; c.fillRect(0, 0, LW, LH);
                c.fillStyle = '#0b2942'; c.fillRect(0, 0, 44, LH);
                lines.forEach((ln, i) => {
                    const y = 70 + i * 34;
                    txt(c, String(i + 1), 30, y, 13, '#4b6479', 'right', 500);
                    let x = 58;
                    c.font = '600 16px ui-monospace, Menlo, Consolas, monospace'; c.textAlign = 'left'; c.textBaseline = 'middle';
                    ln.forEach(([k, s]) => { c.fillStyle = col[k] || '#d6deeb'; c.fillText(s, x, y); x += c.measureText(s).width; });
                    if (i < Math.round(fixed / GOAL * lines.length)) { c.fillStyle = 'rgba(123,216,143,0.12)'; c.fillRect(44, y - 15, LW - 44, 30); txt(c, '✓', LW - 24, y, 16, '#7bd88f'); }
                });
                splats.forEach(s => { s.t += dt; c.globalAlpha = Math.max(0, 1 - s.t); c.fillStyle = '#7bd88f'; for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ell(c, s.x + Math.cos(a) * (8 + s.t * 30), s.y + Math.sin(a) * (8 + s.t * 30), 3, 3); c.fill(); } c.globalAlpha = 1; });
                for (const b of bugs) {
                    c.save(); c.translate(b.x, b.y); c.rotate(b.a + Math.PI / 2); c.scale(Math.min(1, b.age * 4), Math.min(1, b.age * 4));
                    c.strokeStyle = '#111'; c.lineWidth = 2;
                    for (let k = -1; k <= 1; k++) { const w = Math.sin(b.wob * 3 + k) * 3; c.beginPath(); c.moveTo(-8, k * 6); c.lineTo(-15, k * 6 + w); c.moveTo(8, k * 6); c.lineTo(15, k * 6 - w); c.stroke(); }
                    c.fillStyle = b.hue; ell(c, 0, 2, 10, 13); c.fill();
                    c.fillStyle = '#111'; ell(c, 0, -12, 6, 5); c.fill();
                    c.strokeStyle = '#111'; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 14); c.stroke();
                    c.fillStyle = '#111'; ell(c, -4, 4, 2, 2); c.fill(); ell(c, 4, -2, 2, 2); c.fill(); ell(c, 3, 8, 1.6, 1.6); c.fill();
                    c.restore();
                }
                fl.draw(c, dt);
                timeBar(c, LW, Math.max(0, 1 - t / DUR), `🐞 ${fixed} / ${GOAL}`);
            });
            return () => { stop(); S.destroy(); };
        }
    };

    // ------------------------------------------------------------- 6) Baustelle: Projekt-Turm
    G.projects = {
        name: 'Projekt-Turm',
        how: 'Klicken, tippen oder Leertaste, um den Projekt-Block abzusetzen. Stapeln Sie alle Projekte zu einem Turm!',
        mount(stage, done, sfx) {
            const S = canvasStage(stage), c = S.ctx, LW = S.LW, LH = S.LH;
            let names = (CV.data.projects || []).map(p => p.title).slice(0, 5);
            while (names.length < 3) names.push(['Idee', 'Prototyp', 'Launch'][names.length]);
            const cols = ['#ff8a3d', '#2ec4b6', '#ffca3a', '#9b5de5', '#ef476f'];
            const BH = 46, GROUND = LH - 30;
            const stack = [{ x: LW / 2 - 120, w: 240, label: 'Fundament', col: '#8d99ae' }];
            let mover = null, falling = null, perfect = 0, misses = 0, camY = 0, ended = false, fl = floaters(), t = 0;
            function newMover() {
                const top = stack[stack.length - 1], i = stack.length - 1;
                const w = Math.max(160, 240 - i * 20);
                mover = { x: i % 2 ? LW - w - 10 : 10, w, v: (i % 2 ? -1 : 1) * (210 + i * 25), label: names[i], col: cols[i % cols.length] };
            }
            newMover();
            function drop() {
                if (!mover || ended) return;
                const top = stack[stack.length - 1];
                const off = (mover.x + mover.w / 2) - (top.x + top.w / 2);
                if (Math.abs(off) > top.w / 2 + 12) {
                    falling = { x: mover.x, y: 0, w: mover.w, col: mover.col, label: mover.label, vy: 0, a: 0 };
                    misses++; sfx('bad'); fl.add(LW / 2, 80, 'Daneben – nochmal!', '#ffb3b3');
                    newMover();
                    return;
                }
                const tc = top.x + top.w / 2, w = mover.w;
                let x;
                if (Math.abs(off) < 18) { x = tc - w / 2; perfect++; sfx('badge'); fl.add(LW / 2, 90, 'Perfekt!', '#ffe08a'); }
                else { const m = top.w * 0.3; x = tc + CV.clamp(off, -m, m) - w / 2; sfx('pop'); fl.add(LW / 2, 90, 'Sitzt!', '#ffffff'); }
                stack.push({ x, w, label: mover.label, col: mover.col });
                if (stack.length - 1 >= names.length) {
                    mover = null; ended = true;
                    setTimeout(() => done({ score: perfect, max: names.length, text: `Projekt-Turm steht${perfect ? ` – ${perfect}× perfekt platziert` : ""}! Ideen Schritt für Schritt umsetzen ist genau mein Ding.` }), 900);
                } else newMover();
            }
            S.cnv.addEventListener('pointerdown', (e) => { e.preventDefault(); drop(); });
            const unkey = keyHandler((e) => { if (e.key === ' ' || e.key === 'Enter') { drop(); return true; } });
            const stop = loop((dt) => {
                t += dt;
                if (mover) {
                    mover.x += mover.v * dt;
                    if (mover.x < 0) { mover.x = 0; mover.v *= -1; }
                    if (mover.x + mover.w > LW) { mover.x = LW - mover.w; mover.v *= -1; }
                }
                const towerTop = GROUND - stack.length * BH;
                const wantCam = Math.min(0, towerTop - 170);
                camY = CV.lerp(camY, wantCam, dt * 4);
                const sky = c.createLinearGradient(0, 0, 0, LH);
                sky.addColorStop(0, '#9ad7ff'); sky.addColorStop(1, '#e8f7ff');
                c.fillStyle = sky; c.fillRect(0, 0, LW, LH);
                c.save(); c.translate(0, -camY);
                c.fillStyle = '#7f8c8d'; c.fillRect(-10, GROUND, LW + 20, 400);
                c.fillStyle = '#ffca3a'; for (let x = 0; x < LW; x += 40) c.fillRect(x, GROUND, 20, 6);
                stack.forEach((b, i) => {
                    const y = GROUND - (i + 1) * BH;
                    c.fillStyle = 'rgba(0,0,0,0.15)'; rr(c, b.x + 4, y + 4, b.w, BH - 2, 8); c.fill();
                    c.fillStyle = b.col; rr(c, b.x, y, b.w, BH - 2, 8); c.fill();
                    c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, b.x + 4, y + 4, b.w - 8, 8, 4); c.fill();
                    txt(c, b.label, b.x + b.w / 2, y + BH / 2, b.w < 140 ? 11 : 14, '#fff');
                });
                if (mover) {
                    const y = GROUND - (stack.length + 1) * BH - 50;
                    c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(mover.x + mover.w / 2, camY - 10); c.lineTo(mover.x + mover.w / 2, y); c.stroke();
                    c.fillStyle = mover.col; rr(c, mover.x, y, mover.w, BH - 2, 8); c.fill();
                    c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, mover.x + 4, y + 4, mover.w - 8, 8, 4); c.fill();
                    txt(c, mover.label, mover.x + mover.w / 2, y + BH / 2, mover.w < 140 ? 11 : 14, '#fff');
                }
                if (falling) {
                    falling.vy += 900 * dt; falling.y += falling.vy * dt; falling.a += dt * 3;
                    const y = GROUND - (stack.length + 1) * BH - 50 + falling.y;
                    c.save(); c.translate(falling.x + falling.w / 2, y + BH / 2); c.rotate(falling.a);
                    c.globalAlpha = 0.7; c.fillStyle = falling.col; rr(c, -falling.w / 2, -BH / 2, falling.w, BH - 2, 8); c.fill();
                    c.restore(); c.globalAlpha = 1;
                    if (falling.y > 600) falling = null;
                }
                c.restore();
                fl.draw(c, dt);
                c.fillStyle = 'rgba(27,42,74,0.85)'; rr(c, 16, 14, 190, 30, 15); c.fill();
                txt(c, `🏗️ ${stack.length - 1} / ${names.length} Projekte`, 111, 29, 14, '#fff');
                if (t < 2.5) { c.fillStyle = 'rgba(27,42,74,0.75)'; rr(c, LW / 2 - 150, 60, 300, 40, 14); c.fill(); txt(c, 'Klicken = Block absetzen', LW / 2, 80, 16, '#fff'); }
            });
            return () => { stop(); unkey(); S.destroy(); };
        }
    };

    // ------------------------------------------------------------- 7) See: SUP-Rennen
    G.lake = {
        name: 'SUP-Rennen',
        how: 'Abwechselnd links und rechts paddeln (Pfeiltasten/A-D oder die Buttons). Schlagen Sie die Ente! 🦆',
        mount(stage, done, sfx) {
            const S = canvasStage(stage, 640, 340), c = S.ctx, LW = S.LW, LH = S.LH;
            const btns = document.createElement('div');
            btns.className = 'sup-btns';
            btns.innerHTML = '<button data-s="L">◀ Links</button><button data-s="R">Rechts ▶</button>';
            stage.appendChild(btns);
            const GOAL = 1000, DUCK_V = 100;
            let me = 0, duck = 0, v = 0, lastSide = null, wobble = 0, t = -3, ended = false, paddle = 0, ripples = [];
            const fl = floaters();
            function stroke(side) {
                if (t < 0 || ended) return;
                if (side !== lastSide) { v += 70; sfx('step'); } else { v += 18; wobble = 1; }
                lastSide = side; paddle = side === 'L' ? -1 : 1;
                ripples.push({ x: 60 + me * 0.52, y: side === 'L' ? 120 : 160, t: 0 });
            }
            btns.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); stroke(b.dataset.s); } });
            S.cnv.addEventListener('pointerdown', (e) => { const p = S.toLocal(e); stroke(p.x < LW / 2 ? 'L' : 'R'); });
            const unkey = keyHandler((e) => {
                if (e.repeat) return true;
                if (e.key === 'ArrowLeft' || e.key === 'a') { stroke('L'); return true; }
                if (e.key === 'ArrowRight' || e.key === 'd') { stroke('R'); return true; }
            });
            const stop = loop((dt) => {
                const prevT = t;
                t += dt;
                if (prevT < 0 && Math.ceil(prevT) !== Math.ceil(t)) sfx(t >= 0 ? 'good' : 'click');
                if (t > 0 && !ended) {
                    v *= Math.exp(-1.6 * dt);
                    me += v * dt; duck += DUCK_V * dt;
                    wobble = Math.max(0, wobble - dt * 2);
                    if (me >= GOAL || duck >= GOAL || t > 15) {
                        ended = true;
                        const won = me >= duck;
                        if (won) sfx('fanfare');
                        setTimeout(() => done({
                            score: won ? 1 : 0, max: 1,
                            text: won ? `Gewonnen in ${t.toFixed(1)} s! Ausdauer und Rhythmus – im Sport wie im Job.`
                                : 'Knapp! Die Ente trainiert wohl heimlich 🦆 – aber Ausdauer zählt. Beim Schwimmen und SUP tanke ich Energie für den Job.'
                        }), 900);
                    }
                }
                const water = c.createLinearGradient(0, 0, 0, LH);
                water.addColorStop(0, '#5cc0e6'); water.addColorStop(1, '#2f8fc4');
                c.fillStyle = water; c.fillRect(0, 0, LW, LH);
                c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
                for (let i = 0; i < 14; i++) {
                    const x = ((i * 97 - me * 0.3 - t * 20) % (LW + 40) + LW + 40) % (LW + 40) - 20, y = 30 + (i * 53) % (LH - 40);
                    c.beginPath(); c.moveTo(x - 10, y); c.quadraticCurveTo(x - 5, y - 4, x, y); c.quadraticCurveTo(x + 5, y + 4, x + 10, y); c.stroke();
                }
                c.fillStyle = 'rgba(255,255,255,0.5)'; for (let x = 20; x < LW; x += 40) { ell(c, x, LH / 2 + 30, 4, 4); c.fill(); }
                const fx = 60 + GOAL * 0.52;
                c.fillStyle = '#fff'; c.fillRect(fx, 30, 4, LH - 60);
                for (let y = 30; y < LH - 30; y += 20) { c.fillStyle = (y / 20) % 2 ? '#222' : '#fff'; c.fillRect(fx + 4, y, 10, 10); }
                c.fillStyle = '#ff5d5d'; ell(c, fx + 7, 22, 10, 10); c.fill();
                ripples = ripples.filter(r => (r.t += dt) < 0.8);
                ripples.forEach(r => { c.strokeStyle = `rgba(255,255,255,${0.8 - r.t})`; ell(c, r.x, r.y, 6 + r.t * 30, 3 + r.t * 12); c.stroke(); });
                // Spieler
                const px = 60 + me * 0.52, py = 140 + Math.sin(wobble * 20) * wobble * 6;
                c.fillStyle = 'rgba(0,0,0,0.15)'; ell(c, px, py + 10, 44, 8); c.fill();
                c.fillStyle = '#ff8a3d'; ell(c, px, py, 44, 9); c.fill();
                c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(px - 36, py - 1, 72, 2);
                c.fillStyle = '#1f2a44'; rr(c, px - 7, py - 40, 14, 30, 5); c.fill();
                c.fillStyle = '#e2b08c'; ell(c, px, py - 48, 9, 9); c.fill();
                c.fillStyle = '#3b2a20'; c.beginPath(); c.arc(px, py - 50, 9.5, Math.PI, TAU); c.fill();
                c.strokeStyle = '#6b4a2f'; c.lineWidth = 3; c.beginPath(); c.moveTo(px + 4, py - 34); c.lineTo(px + 10 + paddle * 6, py + 12 * paddle + 4); c.stroke();
                // Ente
                const dx = 60 + duck * 0.52, dy = 250;
                c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, dx, dy + 8, 26, 6); c.fill();
                c.fillStyle = '#ffd23f'; ell(c, dx, dy, 22, 13); c.fill(); ell(c, dx + 16, dy - 14, 11, 11); c.fill();
                c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(dx + 26, dy - 14); c.lineTo(dx + 36, dy - 12); c.lineTo(dx + 26, dy - 9); c.fill();
                c.fillStyle = '#222'; ell(c, dx + 19, dy - 17, 2, 2); c.fill();
                fl.draw(c, dt);
                c.fillStyle = 'rgba(27,42,74,0.85)'; rr(c, 16, LH - 44, 220, 30, 15); c.fill();
                txt(c, `🏄 ${Math.round(Math.min(me, GOAL) / GOAL * 100)}%   🦆 ${Math.round(Math.min(duck, GOAL) / GOAL * 100)}%`, 126, LH - 29, 14, '#fff');
                if (t < 0) { c.fillStyle = 'rgba(27,42,74,0.7)'; ell(c, LW / 2, LH / 2, 60, 60); c.fill(); txt(c, String(Math.ceil(-t)), LW / 2, LH / 2 + 2, 54, '#fff'); }
                else if (t < 1) txt(c, 'LOS!', LW / 2, LH / 2, 60, `rgba(255,255,255,${1 - t})`);
            });
            return () => { stop(); unkey(); S.destroy(); };
        }
    };
})();

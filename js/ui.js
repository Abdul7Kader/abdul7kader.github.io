// Oberfläche: HUD, Minimap, Stations-Dialoge, Minispiel-Rahmen, Befehlspalette, kompakter Lebenslauf, Finale.
(function () {
    const CV = window.CV;
    const esc = CV.esc;
    const UI = CV.UI = {};
    let cleanupGame = null;
    let currentStation = null;
    let cvReturnTo = 'world';

    // Farbwelt je Station (Verlauf im Kopf des Dialogs, Akzente im Inhalt)
    const THEME = {
        arrival: ['#3a86ff', '#22b8e6'],
        school: ['#ff7a3d', '#ffb02e'],
        career: ['#0fa89a', '#21c7a8'],
        lab: ['#16a34a', '#0ea5a4'],
        projects: ['#f59e0b', '#f0532f'],
        lake: ['#0891b2', '#3a86ff'],
        finale: ['#f59e0b', '#ef4462']
    };
    UI.theme = (id) => THEME[id] || THEME.finale;
    const setTheme = (el, id) => { const [a, b] = UI.theme(id); el.style.setProperty('--c1', a); el.style.setProperty('--c2', b); };
    const starsOf = (id) => CV.store.get('stars:' + id, 0);
    const starStr = (n, max = 3) => '★'.repeat(n) + '<span class="off">' + '★'.repeat(max - n) + '</span>';

    // ------------------------------------------------------------------ Toasts & Erfolge
    UI.toast = function (html, ms = 2600, cls = '') {
        const el = document.createElement('div');
        el.className = 'toast plain ' + cls;
        el.innerHTML = html;
        show(el, ms);
    };
    UI.achieve = function (icon, kicker, title, ms = 3200, cls = '') {
        const el = document.createElement('div');
        el.className = 'toast ' + cls;
        el.innerHTML = `<span class="t-ic">${icon}</span><span><small>${esc(kicker)}</small><strong>${title}</strong></span>`;
        show(el, ms);
    };
    function show(el, ms) {
        const box = CV.$('#toasts');
        while (box.children.length > 2) box.firstChild.remove();
        box.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 450); }, ms);
    }

    // ------------------------------------------------------------------ HUD
    let lastBadges = null;
    UI.updateHud = function () {
        const G = CV.game, n = G.order.length - 1;
        const done = G.order.slice(0, n).filter(id => G.visited.has(id)).length;
        CV.$('#hud-progress-label').textContent = done === n ? 'Alle Kapitel entdeckt 🏆' : `Kapitel ${done} / ${n} entdeckt`;
        CV.$('#hud-ring').style.setProperty('--p', Math.round(done / n * 100));
        const st = CV.data.stations || {};
        const gotNow = G.order.slice(0, n).filter(id => G.visited.has(id));
        CV.$('#hud-badges').innerHTML = G.order.slice(0, n).map(id => {
            const s = st[id] || {}, got = G.visited.has(id);
            const fresh = got && lastBadges && !lastBadges.includes(id);
            return `<span class="hb ${got ? 'got' : ''} ${fresh ? 'fresh' : ''}" title="${esc(s.badge || '')}${got ? '' : ' (noch offen)'}">${esc(s.badgeIcon || '⭐')}</span>`;
        }).join('');
        lastBadges = gotNow;
        const next = G.nextId();
        const obj = CV.$('#objective');
        if (next && G.started) {
            const s = CV.World.stations.find(x => x.id === next);
            CV.$('#objective-text').textContent = `${s.emoji} ${(st[next] && st[next].title) || s.title}`;
            obj.style.borderLeftColor = UI.theme(next)[0];
            obj.classList.remove('hidden');
        } else obj.classList.add('hidden');
    };

    // ------------------------------------------------------------------ Minimap
    let mmBase = null;
    UI.drawMinimap = function () {
        const cnv = CV.$('#minimap-cnv');
        if (!cnv || CV.$('#minimap').classList.contains('hidden') || !CV.World.player) return;
        const Wd = CV.World.W, Hd = CV.World.H;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw = cnv.clientWidth || 220, ch = cnv.clientHeight || 152;
        if (cnv.width !== Math.round(cw * dpr)) { cnv.width = Math.round(cw * dpr); cnv.height = Math.round(ch * dpr); mmBase = null; }
        const c = cnv.getContext('2d');
        const sx = cnv.width / Wd, sy = cnv.height / Hd;
        if (!mmBase && CV.World.ground) {
            mmBase = document.createElement('canvas');
            mmBase.width = cnv.width; mmBase.height = cnv.height;
            const b = mmBase.getContext('2d');
            b.imageSmoothingQuality = 'high';
            b.drawImage(CV.World.ground, 0, 0, mmBase.width, mmBase.height);
            b.fillStyle = 'rgba(255,255,255,0.12)'; b.fillRect(0, 0, mmBase.width, mmBase.height);
        }
        if (mmBase) c.drawImage(mmBase, 0, 0);
        const G = CV.game, next = G.nextId(), t = performance.now() / 1000;
        for (const s of CV.World.stations) {
            const x = (s.x + s.w / 2) * sx, y = (s.base - s.height / 2) * sy;
            const r = 9 * dpr;
            const got = G.visited.has(s.id);
            if (s.id === next) {
                c.strokeStyle = UI.theme(s.id)[0]; c.lineWidth = 2 * dpr; c.globalAlpha = 1 - (t % 1.2) / 1.2;
                c.beginPath(); c.arc(x, y, r + ((t % 1.2) / 1.2) * 10 * dpr, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
            }
            c.fillStyle = got ? '#fff' : UI.theme(s.id)[0];
            c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
            c.strokeStyle = got ? '#16a34a' : '#fff'; c.lineWidth = 1.6 * dpr; c.stroke();
            c.font = `${11 * dpr}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(got ? '✅' : s.emoji, x, y + 0.5 * dpr);
        }
        const v = CV.World.view();
        c.strokeStyle = 'rgba(11,18,40,0.55)'; c.lineWidth = 1.5 * dpr;
        c.strokeRect(Math.max(1, v.x * sx), Math.max(1, v.y * sy), Math.min(cnv.width - 2, v.w * sx), Math.min(cnv.height - 2, v.h * sy));
        const p = CV.World.player;
        c.fillStyle = 'rgba(255,122,61,0.35)'; c.beginPath(); c.arc(p.x * sx, p.y * sy, (6 + Math.sin(t * 5) * 2) * dpr, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ff7a3d'; c.strokeStyle = '#fff'; c.lineWidth = 2 * dpr;
        c.beginPath(); c.arc(p.x * sx, p.y * sy, 4.5 * dpr, 0, Math.PI * 2); c.fill(); c.stroke();
    };
    UI.minimapClick = function (e) {
        const cnv = CV.$('#minimap-cnv'), r = cnv.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * CV.World.W, y = (e.clientY - r.top) / r.height * CV.World.H;
        let best = null, bd = 1e9;
        for (const s of CV.World.stations) { const d = Math.hypot(s.x + s.w / 2 - x, s.base - s.height / 2 - y); if (d < bd) { bd = d; best = s; } }
        CV.audio.play('click');
        if (best && bd < 190) CV.World.walkToStation(best.id);
        else CV.World.walkToPoint(x, y);
    };

    // ------------------------------------------------------------------ Overlays
    const OVERLAYS = ['contact', 'station', 'journey', 'cv', 'palette'];
    function showOverlay(id) { CV.$('#' + id).classList.remove('hidden'); CV.World.paused = true; }
    function hideOverlay(id) {
        CV.$('#' + id).classList.add('hidden');
        const anyOpen = OVERLAYS.concat('start').some(o => !CV.$('#' + o).classList.contains('hidden'));
        if (!anyOpen && CV.game.started) CV.World.paused = false;
    }
    UI.hideOverlay = hideOverlay;
    UI.showOverlay = showOverlay;
    UI.anyOverlay = () => OVERLAYS.find(o => !CV.$('#' + o).classList.contains('hidden'));

    // ------------------------------------------------------------------ Station
    UI.openStation = function (id, opts = {}) {
        if (CV.World.isLocked && CV.World.isLocked(id)) { CV.World.onLocked && CV.World.onLocked(id); return; }
        if (cleanupGame) { cleanupGame(); cleanupGame = null; }
        currentStation = id;
        const def = CV.World.stations.find(s => s.id === id);
        const st = (CV.data.stations || {})[id] || {};
        const G = CV.game, idx = G.order.indexOf(id), n = G.order.length - 1;
        const panel = CV.$('#station .panel');
        setTheme(panel, id);
        panel.classList.remove('playing');
        CV.$('#station-emoji').textContent = def.emoji;
        CV.$('#station-era').textContent = st.era || '';
        CV.$('#station-chapter').textContent = id === 'finale' ? 'Finale' : `Kapitel ${idx + 1} / ${n}`;
        CV.$('#station-title').textContent = st.title || def.title;
        CV.$('#station-steps').innerHTML = G.order.slice(0, n).map(o => `<i class="${o === id ? 'cur' : G.visited.has(o) ? 'done' : ''}"></i>`).join('');
        CV.$('#station').dataset.station = id;
        showOverlay('station');
        CV.audio.play('open');
        if (id === 'finale') return renderFinale();
        if (G.visited.has(id) || opts.info) renderInfo(id, null);
        else renderStory(id);
    };

    function closeStation() {
        if (cleanupGame) { cleanupGame(); cleanupGame = null; }
        hideOverlay('station');
        CV.$('#station-body').innerHTML = '';
        CV.$('#station .panel').classList.remove('playing');
        CV.game.onStationClosed && CV.game.onStationClosed(currentStation);
        currentStation = null;
    }
    UI.closeStation = closeStation;

    function gameCard(id) {
        const mg = CV.Minigames[id];
        if (!mg) return '';
        const best = CV.store.get('best:' + id, 0), stars = starsOf(id);
        return `
            <div class="game-card">
                <div class="gc-icon">${mg.icon}</div>
                <div class="gc-txt">
                    <span class="kicker">Minispiel · ${mg.time ? `${mg.time} Sek.` : 'ohne Zeitlimit'}</span>
                    <strong>${esc(mg.name)}</strong>
                    ${best ? `<span class="gc-best">Bestwert ${best} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>` : ''}
                </div>
                <button class="btn primary" data-act="play">▶ Spielen</button>
            </div>`;
    }

    function renderStory(id) {
        const st = (CV.data.stations || {})[id] || {};
        const body = CV.$('#station-body');
        body.innerHTML = `
            <div class="story">
                <img class="story-photo" src="${esc(CV.data.profileImage)}" alt="">
                <div class="story-bubble"><span class="story-name">${esc(CV.derived.firstName)} erzählt</span><p class="type"></p></div>
            </div>
            ${gameCard(id)}
            <div class="skipline"><button class="linkbtn" data-act="info">Ohne Spiel direkt zu den Fakten →</button></div>`;
        typeText(body.querySelector('.type'), st.story || '');
        body.querySelector('[data-act="info"]').onclick = () => { CV.audio.play('click'); renderInfo(id, null); };
        const p = body.querySelector('[data-act="play"]');
        if (p) { p.onclick = () => { CV.audio.play('click'); renderGame(id); }; setTimeout(() => p.isConnected && p.focus({ preventScroll: true }), 50); }
    }

    function typeText(el, text) {
        if (CV.reducedMotion) { el.textContent = text; el.classList.add('doneT'); return; }
        let i = 0;
        el.textContent = '';
        const tick = () => {
            if (!el.isConnected) return;
            i = Math.min(text.length, i + 2);
            el.textContent = text.slice(0, i);
            if (i < text.length) setTimeout(tick, 16); else el.classList.add('doneT');
        };
        el.parentElement.addEventListener('click', () => { i = text.length; el.textContent = text; el.classList.add('doneT'); }, { once: true });
        tick();
    }

    function renderGame(id) {
        const mg = CV.Minigames[id];
        const body = CV.$('#station-body');
        CV.$('#station .panel').classList.add('playing');
        body.innerHTML = `
            <div class="mg-stage"></div>
            <div class="mg-foot"><button class="linkbtn" data-act="skip">Überspringen → direkt zu den Fakten</button></div>`;
        const stage = body.querySelector('.mg-stage');
        body.querySelector('[data-act="skip"]').onclick = () => {
            if (cleanupGame) { cleanupGame(); cleanupGame = null; }
            renderInfo(id, null);
        };
        CV.$('#station .panel').scrollTop = 0;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        let finished = false;
        cleanupGame = mg.mount(stage, (result) => {
            if (finished) return;
            finished = true;
            if (cleanupGame) { cleanupGame(); cleanupGame = null; }
            renderInfo(id, result);
        }, (n) => CV.audio.play(n));
    }

    function renderInfo(id, result) {
        const st = (CV.data.stations || {})[id] || {};
        const firstTime = !CV.game.visited.has(id);
        CV.game.markVisited(id);
        CV.$('#station .panel').classList.remove('playing');
        CV.$$('#station-steps i').forEach((el, i) => { if (CV.game.order[i] === id) el.className = 'cur'; });
        const G = CV.game;
        const nextId = G.nextId();
        const next = nextId && CV.World.stations.find(s => s.id === nextId);
        const nextTitle = next && ((CV.data.stations || {})[nextId] || {}).title || (next && next.title);
        const body = CV.$('#station-body');
        const stars = result ? result.stars : 0;
        const badge = (firstTime || result) ? `
            <div class="achv ${firstTime ? 'new' : ''}">
                <span class="b-icon">${esc(st.badgeIcon || '⭐')}</span>
                <div>
                    <small>${firstTime ? 'Stärke freigeschaltet' : 'Ergebnis'}${result ? `<span class="a-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>` : ''}</small>
                    <strong>${esc(st.badge || '')}</strong>
                    ${result ? `<p>${result.score} Punkte${result.isBest ? ' · neuer Bestwert' : ''}</p>` : ''}
                </div>
            </div>` : '';
        body.innerHTML = `
            ${badge}
            <div class="info">${(CONTENT[id] || (() => ''))(result)}</div>
            <footer class="panel-foot">
                ${CV.Minigames[id] ? `<button class="btn ghost small" data-act="replay">${CV.icon('play')} ${result ? 'Nochmal spielen' : 'Minispiel spielen'}</button>` : ''}
                <span class="spacer"></span>
                <button class="btn primary" data-act="next">${next ? `Weiter: ${esc(nextTitle)} →` : 'Zurück zur Welt'}</button>
            </footer>`;
        if (firstTime) {
            CV.audio.play('badge');
            CV.World.confettiOnPlayer(60);
        }
        const rp = body.querySelector('[data-act="replay"]');
        if (rp) rp.onclick = () => { CV.audio.play('click'); renderGame(id); };
        const nb = body.querySelector('[data-act="next"]');
        nb.onclick = () => {
            CV.audio.play('click');
            closeStation();
            if (nextId) setTimeout(() => CV.World.walkToStation(nextId), 250);
        };
        const ghr = body.querySelector('.gh-root');
        if (ghr && CV.GitHub) CV.GitHub.mount(ghr, { onReady: () => { const l = body.querySelector('.gh-card'); if (l && ghr.nextElementSibling === l) l.remove(); } });
        const wm = body.querySelector('.wm-root');
        if (wm && CV.WorldMap) CV.WorldMap.mount(wm, D().countries);
        const pv = body.querySelector('.pv-wrap');
        if (pv && CV.ProjectQuarter) mountQuarter(pv, body, result);
        animateBars(body);
        CV.$('#station .panel').scrollTop = 0;
        setTimeout(() => nb.isConnected && nb.focus({ preventScroll: true }), 60);
    }

    function mountQuarter(pv, body, result) {
        const cards = CV.$$('.pv-card', body);
        const mark = (i) => cards.forEach((el, k) => el.classList.toggle('sel', k === i));
        const q = CV.ProjectQuarter.mount(pv, CV.data.projects, {
            animate: !!(result && result.stars),
            onSelect: (i) => { CV.audio.play('click'); mark(i); if (cards[i]) cards[i].scrollIntoView({ behavior: CV.reducedMotion ? 'auto' : 'smooth', block: 'nearest' }); }
        });
        cards.forEach((el, i) => {
            const go = () => { mark(i); q.select(i); if (pv.scrollTo) pv.scrollTo({ left: Math.max(0, (30 + i * 150) / 960 * pv.scrollWidth - 60), behavior: 'smooth' }); };
            el.addEventListener('click', (e) => { if (!e.target.closest('a')) go(); });
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        });
    }

    function animateBars(root) {
        requestAnimationFrame(() => setTimeout(() => {
            root.querySelectorAll('[data-pct]').forEach(el => { el.style.width = el.dataset.pct + '%'; });
        }, 80));
    }

    // ------------------------------------------------------------------ Inhalte je Station
    const D = () => CV.derived;
    const timeline = (items, map) => `<ol class="timeline">${items.map(it => {
        const m = map(it);
        const bl = (m.bullets || []).length ? `<ul class="tl-bullets">${m.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
        return `<li class="${m.current ? 'current' : ''}"><span class="tl-date">${esc(String(m.date).replace(/Aktuell/, 'heute'))}${m.current ? ' <em>aktuell</em>' : ''}</span><strong>${esc(m.title)}</strong><span class="tl-sub">${esc(m.sub)}</span>${m.badge ? `<span class="noai">${esc(m.badge)}</span>` : ''}${bl}</li>`;
    }).join('')}</ol>`;
    const ghBtn = () => {
        const gh = (CV.data.contact || {}).github;
        return gh ? `<a class="gh-card" href="${esc(gh)}" target="_blank" rel="noopener"><span class="gh-ic">${CV.icon('github')}</span><span><strong>Mein GitHub</strong><small>${esc(gh.replace(/^https?:\/\/(www\.)?/, ''))}</small></span><span class="gh-go">Öffnen ↗</span></a>` : '';
    };
    const chips = (list) => `<div class="chips">${list.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>`;
    const langBars = () => `<div class="langs">${D().languages.map(l => `
        <div class="lang"><div class="lang-top"><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></div>
        <div class="bar"><i data-pct="${CV.levelPct(l.level)}"></i></div></div>`).join('')}</div>`;

    const CONTENT = {
        arrival() {
            const home = (CV.data.travels || []).find(t => /heimat/i.test(t.date));
            const arrival = (CV.data.travels || []).find(t => /einreise|ankunft/i.test(t.country));
            return `
                <div class="facts">
                    ${arrival ? `<div class="fact"><b>${esc(arrival.date)}</b><span>${esc(arrival.country)}</span></div>` : ''}
                    <div class="fact"><b>${D().countries.length}</b><span>Länder kennengelernt</span></div>
                    ${home ? `<div class="fact"><b>${esc(home.country)}</b><span>Heimat</span></div>` : ''}
                </div>
                <h3>Meine Weltkarte</h3>
                <div class="wm-root"></div>
                <h3>Bereiste Länder</h3>
                <div class="flags">${D().countries.map(c => `<span class="flagchip">${CV.flagHtml(c)} ${esc(c)}</span>`).join('')}</div>`;
        },
        school() {
            return `<h3>Vom Integrationskurs zum Studium</h3>${timeline(D().educationDesc, e => ({ date: e.date, title: e.title, sub: e.detail, current: e.range.current, bullets: e.bullets }))}
                <h3>Meine Sprachen heute</h3>${langBars()}`;
        },
        career() {
            return `<h3>Berufserfahrung</h3>${timeline(D().experienceDesc, e => ({ date: e.date, title: e.role, sub: e.company, current: e.range.current, bullets: e.bullets, badge: e.badge }))}`;
        },
        lab() {
            const r = D().currentRole;
            return `
                ${r ? `<div class="role-card"><span class="kicker">Aktuelle Position</span><strong>${esc(r.role)}</strong><span class="rc-sub">${esc(r.company)} · seit ${esc(String(r.date).split('-')[0].trim())}</span>
                    ${r.badge || r.note ? `<p class="rc-noai">${r.badge ? `<b>${esc(r.badge)}</b>` : ''}${r.note ? `<span>${esc(r.note)}</span>` : ''}</p>` : ''}
                    ${(r.bullets || []).length ? `<ul>${r.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</div>` : ''}
                ${(CV.data.aiSkills || []).length ? `<h3>KI-Kompetenzen</h3><div class="ai-grid">${CV.data.aiSkills.map(a => `<div class="ai-item"><strong>${esc(a.name)}</strong><span>${esc(a.text)}</span></div>`).join('')}</div>` : ''}
                ${D().skills.map(s => `<h3>${esc(s.name)}${s.note ? ` <small class="h-note">${esc(s.note)}</small>` : ''}</h3>${chips(String(s.level).split(',').map(x => x.trim()).filter(Boolean))}`).join('')}
                <h3>Woran ich gerade arbeite</h3>
                <div class="gh-root"></div>
                ${ghBtn()}`;
        },
        projects(result) {
            const founder = D().experienceDesc.find(e => /gründer/i.test(e.role));
            const list = CV.data.projects || [];
            return `${founder ? `<div class="role-card"><span class="kicker">Eigenes Unternehmen · seit ${esc(String(founder.date).split('-')[0].trim())}</span><strong>${esc(founder.role)}</strong><span>${esc(founder.company)}</span></div>` : ''}
            <h3>Mein Projekt-Viertel <small class="h-note">${result && result.stars ? 'Ihre Belohnung: Hier wird gerade gebaut' : 'Gebäude antippen für Details'}</small></h3>
            <div class="pv-wrap"></div>
            <div class="pv-legend"><span class="done">Fertig</span><span class="build">Im Bau</span><span class="base">Fundament</span></div>
            <div class="projects">${list.map((p, i) => {
                const stg = CV.projStage(p);
                return `<article class="project pv-card" data-i="${i}" tabindex="0">
                    <div class="pv-head"><span class="kicker">${esc(p.tag || 'Projekt')}</span><span class="tag ${stg.cls}">${esc(stg.label)}</span></div>
                    <strong>${esc(p.title)}</strong>
                    <div class="pv-bar"><i data-pct="${stg.pct}" class="${stg.cls}"></i></div>
                    <p>${esc(p.detail)}</p>
                    ${p.tech ? `<small class="pv-tech">${esc(p.tech)}</small>` : ''}
                    ${p.link ? `<a class="pv-link" href="${esc(p.link)}" target="_blank" rel="noopener">Ansehen ${CV.icon('external')}</a>` : '<span class="pv-soon">Link folgt</span>'}
                </article>`;
            }).join('')}</div>
            ${ghBtn()}`;
        },
        lake() {
            return `<h3>Freizeit</h3><div class="hobbies">${(CV.data.hobbies || []).map(h => {
                const t = CV.noEmoji(h);
                return `<div class="hobby"><b>${CV.icon(CV.hobbyIcon(t))}</b><span>${esc(t)}</span></div>`;
            }).join('')}</div>
            ${(CV.data.volunteer || []).length ? `<h3>Ehrenamtliches Engagement</h3><div class="vol-grid">${CV.data.volunteer.map(v => `
                <article class="vol">
                    <span class="vol-ic">${CV.icon(v.icon || 'heart')}</span>
                    <div><span class="vol-meta">${esc(v.date || '')}${v.role ? ' · ' + esc(v.role) : ''}</span>
                    <strong>${esc(v.title)}</strong>
                    <p>${esc(v.text || v.detail || '')}</p></div>
                </article>`).join('')}</div>` : ''}`;
        }
    };

    // ------------------------------------------------------------------ Finale: „Ihr Unternehmen“
    // Namensaufkleber auf dem T-Shirt (jubelbild-nah.jpg, 838 × 944). Der eingegebene Firmenname
    // wird wie mit einem Marker auf den Aufkleber geschrieben; Falten und Licht des Shirts liegen darüber.
    const STICKER = { cx: 384, cy: 668, w: 292, h: 140, rot: -0.035, band: 0.3, r: 11 };
    const MARKER = '"Permanent Marker", "Segoe Print", "Comic Sans MS", cursive';
    function stickerShape(c, S) { c.beginPath(); if (c.roundRect) c.roundRect(-S.w / 2, -S.h / 2, S.w, S.h, S.r); else c.rect(-S.w / 2, -S.h / 2, S.w, S.h); }
    function stickerText(t, name, S) {
        const maxW = S.w - 34, areaTop = -S.h / 2 + S.h * S.band, areaH = S.h * (1 - S.band);
        let size = 46, lines = [name];
        const fits = () => lines.every(l => { t.font = `${size}px ${MARKER}`; return t.measureText(l).width <= maxW; }) && lines.length * size * 1.02 <= areaH - 10;
        while (!fits() && size > 26) size -= 1;
        if (!fits() && name.includes(' ')) {           // lange Namen auf zwei Zeilen verteilen
            const words = name.split(/\s+/); let best = null;
            for (let i = 1; i < words.length; i++) {
                const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
                const d = Math.abs(a.length - b.length);
                if (!best || d < best.d) best = { d, l: [a, b] };
            }
            lines = best.l; size = 40;
        }
        while (!fits() && size > 14) size -= 1;
        t.fillStyle = '#16213f'; t.textAlign = 'center'; t.textBaseline = 'middle';
        const lh = size * 1.02, y0 = areaTop + areaH / 2 - (lines.length - 1) * lh / 2 + size * 0.06;
        lines.forEach((l, i) => {
            t.font = `${size}px ${MARKER}`;
            t.save(); t.translate(0, y0 + i * lh); t.rotate(-0.025 + i * 0.015);
            t.fillText(l, 0, 0); t.restore();
        });
    }
    function shirtPrint(cnv, img, name) {
        const S = STICKER;
        const W2 = img.naturalWidth, H2 = img.naturalHeight;
        cnv.width = W2; cnv.height = H2;
        const c = cnv.getContext('2d');
        c.drawImage(img, 0, 0);
        name = String(name || '').trim();
        // Aufkleber-Ebene in Bildgröße
        const L = document.createElement('canvas'); L.width = W2; L.height = H2;
        const t = L.getContext('2d');
        t.save(); t.translate(S.cx, S.cy); t.rotate(S.rot);
        stickerShape(t, S); t.fillStyle = '#fbfaf6'; t.fill();
        t.save(); stickerShape(t, S); t.clip();
        t.fillStyle = '#e8553a'; t.fillRect(-S.w / 2, -S.h / 2, S.w, S.h * S.band);
        t.fillStyle = '#fff'; t.textAlign = 'center'; t.textBaseline = 'middle';
        t.font = `800 ${Math.round(S.h * 0.11)}px Outfit, system-ui, sans-serif`;
        if (t.letterSpacing !== undefined) t.letterSpacing = '2px';
        t.fillText('MEIN NÄCHSTES KAPITEL', 0, -S.h / 2 + S.h * S.band / 2 + 1);
        if (t.letterSpacing !== undefined) t.letterSpacing = '0px';
        t.restore();
        if (name) stickerText(t, name, S);
        t.restore();
        // Stoff-Schattierung: das Foto multiplizieren (aufgehellt), danach wieder auf die Aufkleberform zuschneiden
        t.save();
        t.globalCompositeOperation = 'multiply';
        t.filter = 'grayscale(1) brightness(1.13) contrast(1.35)';
        t.globalAlpha = 0.75;
        t.drawImage(img, 0, 0);
        t.restore();
        t.save(); t.globalCompositeOperation = 'destination-in';
        t.translate(S.cx, S.cy); t.rotate(S.rot); stickerShape(t, S); t.fillStyle = '#000'; t.fill();
        t.restore();
        // dezenter Schatten und Kante, dann aufs Foto
        c.save();
        c.translate(S.cx, S.cy + 2); c.rotate(S.rot);
        c.filter = 'blur(3px)'; c.globalAlpha = 0.18; c.fillStyle = '#000';
        stickerShape(c, S); c.fill();
        c.restore();
        c.drawImage(L, 0, 0);
        c.save(); c.translate(S.cx, S.cy); c.rotate(S.rot);
        c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 1.2; stickerShape(c, S); c.stroke();
        c.restore();
    }

    function renderFinale() {
        const G = CV.game, d = CV.data, st = d.stations || {};
        const n = G.order.length - 1;
        const done = G.order.slice(0, n).filter(id => G.visited.has(id)).length;
        const totalStars = G.order.slice(0, n).reduce((a, id) => a + starsOf(id), 0);
        G.markVisited('finale');
        const c = d.contact || {};
        const body = CV.$('#station-body');
        body.innerHTML = `
            <div class="finale">
                <div class="tshirt">
                    <canvas class="tshirt-cnv" aria-label="Foto von ${esc(d.name)} mit dem Firmennamen auf dem T-Shirt"></canvas>
                    <span class="trophy">🏆</span>
                </div>
                <label class="firm">
                    <span>Ihr Unternehmen</span>
                    <input id="firm-input" type="text" maxlength="28" autocomplete="organization" placeholder="Bitte Ihren Firmennamen eingeben" value="${esc(G.firm)}">
                    <small>Er erscheint auf dem Aufkleber auf meinem T-Shirt.</small>
                </label>
                <div class="firm-next ${G.firm ? '' : 'hidden'}"><button class="btn primary big" data-act="contact">${CV.icon('send')} <span>${esc(CV.derived.firstName)} kontaktieren</span></button></div>
                <h3 class="finale-title">${done === n ? 'Sie haben meinen ganzen Weg erkundet!' : `${done} von ${n} Kapiteln erkundet`}</h3>
                <p class="finale-text">${esc((st.finale && st.finale.story) || '')}</p>
                <div class="cert">
                    <div class="cert-head"><span class="kicker">Ihre Erkenntnisse über ${esc(CV.derived.firstName)}</span><span class="total">⭐ ${totalStars} / ${n * 3} Sterne in Minispielen</span></div>
                    <ul class="cert-list">
                        ${G.order.slice(0, n).map(id => {
                            const s = st[id] || {}, sN = starsOf(id);
                            return `<li class="got"><b>${esc(s.badgeIcon || '⭐')}</b><span><strong>${esc(s.badge || '')}</strong><small>${esc(s.title || '')}</small>${sN ? `<span class="st">${'★'.repeat(sN)}</span>` : ''}</span></li>`;
                        }).join('')}
                    </ul>
                </div>
                <div class="cta">
                    <button class="btn ghost" data-act="contact">${CV.icon('send')} Kontakt aufnehmen</button>
                    <button class="btn ghost" data-act="cv">${CV.icon('file')} Lebenslauf kompakt &amp; PDF</button>
                    ${c.phone ? `<a class="btn ghost" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${CV.icon('phone')} ${esc(c.phone)}</a>` : ''}
                    ${c.linkedin ? `<a class="btn ghost" href="${esc(c.linkedin)}" target="_blank" rel="noopener">${CV.icon('linkedin')} LinkedIn</a>` : ''}
                </div>
            </div>`;
        CV.audio.play('fanfare');
        CV.World.confettiOnPlayer(160);
        setTimeout(() => CV.World.confettiOnPlayer(120), 600);
        const cnv = body.querySelector('.tshirt-cnv');
        const img = new Image();
        let pending = 0;
        const draw = () => { if (img.complete && img.naturalWidth) shirtPrint(cnv, img, G.firm); };
        img.onload = () => {
            draw();
            if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`40px ${MARKER}`), document.fonts.load('800 16px Outfit')]).then(draw, draw);
        };
        img.src = d.finaleImage || d.congratsImage || d.profileImage;
        const inp = body.querySelector('#firm-input');
        inp.addEventListener('input', () => {
            G.setFirm(inp.value);
            cancelAnimationFrame(pending); pending = requestAnimationFrame(draw);
            body.querySelector('.firm-next').classList.toggle('hidden', !G.firm);
        });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && G.firm) { e.preventDefault(); CV.Contact.open({ firm: G.firm }); } });
        body.querySelectorAll('[data-act="contact"]').forEach(b => b.onclick = () => { CV.audio.play('click'); CV.Contact.open({ firm: G.firm }); });
        if (!G.firm) setTimeout(() => inp.isConnected && inp.focus({ preventScroll: true }), 400);
        body.querySelector('[data-act="cv"]').onclick = () => { closeStation(); UI.openCv('world'); };
    }
    UI.shirtPrint = shirtPrint;

    // ------------------------------------------------------------------ Kapitelübersicht
    UI.openJourney = function () {
        const G = CV.game, st = CV.data.stations || {};
        const next = G.nextId(), n = G.order.length - 1;
        const done = G.order.slice(0, n).filter(id => G.visited.has(id)).length;
        const totalStars = G.order.slice(0, n).reduce((a, id) => a + starsOf(id), 0);
        CV.$('#journey-sub').textContent = `${done} von ${n} Kapiteln entdeckt · ⭐ ${totalStars} / ${n * 3} Sterne · Klick = hinlaufen`;
        CV.$('#journey-list').innerHTML = G.order.map((id) => {
            const s = CV.World.stations.find(x => x.id === id), meta = st[id] || {};
            const mg = CV.Minigames[id];
            const locked = CV.World.isLocked && CV.World.isLocked(id);
            const status = locked ? `<span class="js">🔒 gesperrt<small>öffnet nach allen ${n} Kapiteln</small></span>` : G.visited.has(id)
                ? `<span class="js done">✓ entdeckt${mg ? `<span class="st">${starStr(starsOf(id))}</span>` : ''}</span>`
                : id === next ? '<span class="js next"><span class="pill">nächstes Ziel</span></span>' : `<span class="js">offen${mg ? `<small>${esc(mg.icon)} ${esc(mg.name)}</small>` : ''}</span>`;
            return `<li class="${id === next ? 'is-next' : ''}"><button data-id="${id}"><span class="je">${s.emoji}</span><span class="jt"><strong>${esc(meta.title || s.title)}</strong><small>${esc(meta.era || '')}${meta.badge ? ' · ' + esc(meta.badge) : ''}</small></span>${status}</button></li>`;
        }).join('');
        CV.$$('#journey-list button').forEach(b => b.onclick = () => {
            CV.audio.play('click');
            hideOverlay('journey');
            setTimeout(() => CV.World.walkToStation(b.dataset.id), 150);
        });
        showOverlay('journey');
    };

    // ------------------------------------------------------------------ Befehlspalette (Strg+K)
    let palItems = [], palSel = 0, palView = [];
    function buildIndex() {
        const d = CV.data, x = CV.derived, st = d.stations || {}, items = [];
        const stTitle = (id) => (st[id] && st[id].title) || id;
        const goto = (id) => () => { hideOverlay('palette'); setTimeout(() => CV.World.walkToStation(id), 120); };
        const info = (id) => () => { hideOverlay('palette'); CV.World.teleportTo(id); setTimeout(() => UI.openStation(id, { info: true }), 60); };
        const emojiOf = (id) => (CV.World.stations.find(s => s.id === id) || {}).emoji || '📍';
        const c = d.contact || {};
        items.push({ g: 'Aktionen', ic: '📄', t: 'Lebenslauf kompakt öffnen', s: 'Alle Fakten auf einer Seite', k: 'L', q: 'lebenslauf cv kompakt resume', run: () => { hideOverlay('palette'); UI.openCv('world'); } });
        items.push({ g: 'Aktionen', ic: '📄', t: 'Als PDF speichern', s: 'Farbiger Lebenslauf als PDF-Datei', q: 'pdf drucken print download speichern', run: () => { hideOverlay('palette'); UI.openCv('world'); setTimeout(() => CV.savePdf(CV.$('#cv-sheet [data-act="print"]')), 300); } });
        items.push({ g: 'Aktionen', ic: '🗺️', t: 'Kapitelübersicht', s: 'Alle Stationen & Sterne', k: 'M', q: 'karte map übersicht kapitel fortschritt', run: () => { hideOverlay('palette'); UI.openJourney(); } });
        const next = CV.game.nextId();
        if (next) items.push({ g: 'Aktionen', ic: '🎯', t: `Zum nächsten Ziel: ${stTitle(next)}`, s: 'Automatisch hinlaufen', k: 'G', q: 'weiter nächstes ziel', run: goto(next) });
        items.push({ g: 'Aktionen', ic: CV.audio.state.sfx ? '🔇' : '🔊', t: CV.audio.state.sfx ? 'Ton ausschalten' : 'Ton einschalten', s: 'Soundeffekte', q: 'ton sound audio leise mute', run: () => { CV.$('#btn-sound').click(); hideOverlay('palette'); } });
        items.push({ g: 'Aktionen', ic: '✉️', t: 'Jetzt kontaktieren', s: 'Nachricht direkt an mich senden', q: 'kontakt mail email anfrage formular nachricht', run: () => { hideOverlay('palette'); CV.Contact.open(); } });
        if (c.email) items.push({ g: 'Aktionen', ic: '✉️', t: 'E-Mail schreiben', s: c.email, q: 'kontakt mail email', run: () => { location.href = 'mailto:' + c.email; } });
        if (c.github) items.push({ g: 'Aktionen', ic: '🐙', t: 'GitHub öffnen', s: c.github.replace(/^https?:\/\//, ''), q: 'github code repo', run: () => window.open(c.github, '_blank', 'noopener') });
        CV.game.order.forEach((id, i) => {
            const s = st[id] || {};
            items.push({ g: 'Kapitel', ic: emojiOf(id), t: `${i < CV.game.order.length - 1 ? (i + 1) + '. ' : ''}${stTitle(id)}`, s: [s.era, s.badge].filter(Boolean).join(' · '), q: `${stTitle(id)} ${s.badge || ''} ${s.story || ''}`, run: goto(id) });
        });
        x.skillTokens.forEach(tk => items.push({ g: 'Inhalte', ic: CV.skillIcon(tk), t: tk, s: `Kenntnis · ${stTitle('lab')}`, q: tk, run: info('lab') }));
        x.experienceDesc.forEach(e => items.push({ g: 'Inhalte', ic: '💼', t: e.role, s: `${e.company} · ${e.date}`, q: `${e.role} ${e.company} beruf job arbeit`, run: info('career') }));
        x.academic.forEach(e => items.push({ g: 'Inhalte', ic: '🎓', t: e.title, s: `${e.detail} · ${e.date}`, q: `${e.title} ${e.detail} studium schule ausbildung`, run: info('school') }));
        x.languages.forEach(l => items.push({ g: 'Inhalte', ic: '🗣️', t: l.name, s: `Sprache · ${l.level}`, q: `${l.name} ${l.level} sprache`, run: info('school') }));
        (d.projects || []).forEach(p => items.push({ g: 'Inhalte', ic: '🚀', t: p.title, s: `${p.tech} · Projekt`, q: `${p.title} ${p.tech} ${p.detail} projekt`, run: info('projects') }));
        (d.aiSkills || []).forEach(a => items.push({ g: 'Inhalte', ic: '🤖', t: a.name, s: 'KI-Kompetenz', q: `${a.name} ${a.text} ki ai prompt`, run: info('lab') }));
        (d.volunteer || []).forEach(v => items.push({ g: 'Inhalte', ic: '💛', t: v.title, s: `Ehrenamt · ${v.date}`, q: `${v.title} ${v.detail} ehrenamt engagement`, run: info('lake') }));
        (d.hobbies || []).forEach(h => items.push({ g: 'Inhalte', ic: '🏄', t: String(h).replace(/^\S+\s+/, ''), s: 'Hobby', q: `${h} hobby freizeit sport`, run: info('lake') }));
        x.countries.forEach(cn => items.push({ g: 'Inhalte', ic: CV.flag(cn) || '🌍', icHtml: CV.flagSvgUrl(cn) ? CV.flagHtml(cn) : '', t: cn, s: 'Bereistes Land', q: `${cn} land reise`, run: info('arrival') }));
        return items;
    }
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    function hl(text, q) {
        if (!q) return esc(text);
        const i = norm(text).indexOf(norm(q));
        if (i < 0) return esc(text);
        return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
    }
    function renderPalette() {
        const q = CV.$('#pal-q').value.trim();
        const nq = norm(q);
        if (!nq) palView = palItems.filter(it => it.g !== 'Inhalte');
        else {
            palView = palItems.map(it => {
                const t = norm(it.t), all = norm(it.t + ' ' + it.s + ' ' + it.q);
                const score = t.startsWith(nq) ? 3 : t.includes(nq) ? 2 : all.includes(nq) ? 1 : 0;
                return [score ? score + (it.g === 'Inhalte' ? 0.5 : 0) : 0, it];
            }).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 14).map(a => a[1]);
        }
        palSel = Math.min(palSel, Math.max(0, palView.length - 1));
        const list = CV.$('#pal-list');
        if (!palView.length) { list.innerHTML = `<li class="pal-empty">Nichts gefunden für „${esc(q)}“ – versuchen Sie z. B. „Java“ oder „PSI“.</li>`; return; }
        let lastG = '';
        list.innerHTML = palView.map((it, i) => {
            const head = it.g !== lastG ? `<li class="pal-group">${esc(it.g)}</li>` : '';
            lastG = it.g;
            return `${head}<li class="pal-item ${i === palSel ? 'sel' : ''}" data-i="${i}" role="option"><span class="pi-ic">${it.icHtml || esc(it.ic)}</span><span class="pi-t"><strong>${hl(it.t, q)}</strong><small>${esc(it.s || '')}</small></span>${it.k ? `<kbd>${esc(it.k)}</kbd>` : '<span class="pi-k">↵</span>'}</li>`;
        }).join('');
        const sel = list.querySelector('.pal-item.sel');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }
    UI.openPalette = function () {
        palItems = buildIndex(); palSel = 0;
        const inp = CV.$('#pal-q');
        inp.value = '';
        renderPalette();
        showOverlay('palette');
        CV.audio.play('click');
        setTimeout(() => inp.focus(), 30);
    };
    function palRun(i) { const it = palView[i]; if (it) { CV.audio.play('click'); it.run(); } }
    document.addEventListener('DOMContentLoaded', () => {
        const inp = CV.$('#pal-q');
        inp.addEventListener('input', () => { palSel = 0; renderPalette(); });
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palView.length - 1, palSel + 1); renderPalette(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); renderPalette(); }
            else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); palRun(palSel); }
        });
        CV.$('#pal-list').addEventListener('click', (e) => { const li = e.target.closest('.pal-item'); if (li) palRun(+li.dataset.i); });
        CV.$('#pal-list').addEventListener('mousemove', (e) => {
            const li = e.target.closest('.pal-item');
            if (li && +li.dataset.i !== palSel) { palSel = +li.dataset.i; CV.$$('#pal-list .pal-item').forEach(x => x.classList.toggle('sel', x === li)); }
        });
    });

    // ------------------------------------------------------------------ Kompakter Lebenslauf
    UI.openCv = function (returnTo) {
        cvReturnTo = returnTo || 'world';
        renderCv();
        showOverlay('cv');
        CV.$('#cv').scrollTop = 0;
        CV.audio.play('open');
    };
    // Auch Strg+P druckt den kompakten Lebenslauf.
    window.addEventListener('beforeprint', () => {
        if (!CV.$('#cv-sheet').innerHTML) renderCv();
        CV.$$('#cv-sheet [data-pct]').forEach(el => { el.style.width = el.dataset.pct + '%'; });
    });

    function renderCv() {
        const d = CV.data, x = CV.derived, c = d.contact || {};
        const contact = [
            d.location ? `<span>${CV.icon('pin')} ${esc(d.location)}</span>` : '',
            c.email ? `<a href="mailto:${esc(c.email)}">${CV.icon('mail')} ${esc(c.email)}</a>` : '',
            c.phone ? `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${CV.icon('phone')} ${esc(c.phone)}</a>` : '',
            c.linkedin ? `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${CV.icon('linkedin')} LinkedIn</a>` : '',
            c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noopener">${CV.icon('github')} ${esc(c.github.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : '',
            `<a href="${esc(location.origin + location.pathname)}" target="_blank" rel="noopener" class="only-print">${CV.icon('globe')} ${esc((location.host + location.pathname).replace(/index\.html$/, '').replace(/\/$/, ''))}</a>`
        ].filter(Boolean).join('');
        const tl = (items, map) => `<ol class="cv-tl">${items.map(it => { const m = map(it); return `<li class="${m.current ? 'current' : ''}"><span class="d">${esc(String(m.date).replace(/Aktuell/, 'heute'))}</span><div><strong>${esc(m.title)}</strong><span>${esc(m.sub)}</span>${m.badge ? `<em class="cv-noai">${esc(m.badge)}${m.note ? ` – ${esc(m.note)}` : ''}</em>` : ''}${(m.bullets || []).length ? `<ul class="cv-bullets">${m.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</div></li>`; }).join('')}</ol>`;
        CV.$('#cv-sheet').innerHTML = `
            <div class="cv-toolbar no-print">
                <button class="btn ghost small" data-act="back">← ${cvReturnTo === 'start' ? 'Zurück' : 'Zurück zur Welt'}</button>
                <div class="tb-r">
                    <button class="btn ghost small" data-act="contact">${CV.icon('send')} Kontakt</button>
                    <button class="btn dark small" data-act="print">${CV.icon('download')} Als PDF speichern</button>
                </div>
            </div>
            <article class="cv-page">
                <header class="cv-head">
                    <img src="${esc(d.profileImage)}" alt="Foto von ${esc(d.name)}">
                    <div>
                        <h1>${esc(d.name)}</h1>
                        <p class="cv-title">${esc(d.title)}</p>
                        ${d.availability ? `<p class="cv-avail"><i></i>${esc(d.availability)}</p>` : ''}
                        <p class="cv-contact">${contact}</p>
                    </div>
                </header>
                ${d.summary ? `<p class="cv-summary">${esc(d.summary)}</p>` : ''}
                ${(d.strengths || []).length ? `<section class="cv-strengths">${d.strengths.map(s => `<div><b>${CV.icon(s.icon) || CV.icon('check')}</b><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></div>`).join('')}</section>` : ''}
                <div class="cv-grid">
                    <div>
                        ${(d.aiSkills || []).length ? `<h2>KI-Kompetenzen</h2><dl class="cv-dl">${d.aiSkills.map(a => `<dt>${esc(a.name)}</dt><dd>${esc(a.text)}</dd>`).join('')}</dl>` : ''}
                        <h2>Berufliche Tätigkeiten</h2>
                        ${tl(x.experienceDesc, e => ({ date: e.date, title: e.role, sub: e.company, current: e.range.current, bullets: e.bullets, badge: e.badge, note: e.note }))}
                        <h2>Bildungsweg</h2>
                        ${tl(x.educationDesc, e => ({ date: e.date, title: e.title, sub: e.detail, current: e.range.current, bullets: e.bullets }))}
                        <div class="no-print cv-gh"><h2>GitHub-Aktivität</h2><div class="gh-root"></div></div>
                        ${(d.volunteer || []).length ? `<h2>Ehrenamtliches Engagement</h2>${tl(d.volunteer, v => ({ date: v.date, title: v.title, sub: v.role || v.detail || '' }))}` : ''}
                    </div>
                    <aside>
                        <h2>Kenntnisse</h2>
                        ${x.skills.map(s => `<h4>${esc(s.name)}</h4><p class="cv-chips">${String(s.level).split(',').map(t => `<span>${esc(t.trim())}</span>`).join('')}</p>${s.note ? `<p class="cv-note">${esc(s.note)}</p>` : ''}`).join('')}
                        <h2>Projekte</h2>
                        <ul class="cv-projects">${(d.projects || []).map(p => `<li><strong>${esc(p.title)}</strong> <em class="cv-stage ${CV.projStage(p).cls}">${esc(CV.projStage(p).label)}</em>${p.tech ? `<small>${esc(p.tech)}</small>` : ''}<span>${esc(p.detail)}</span></li>`).join('')}</ul>
                        <h2>Sprachen</h2>
                        ${x.languages.map(l => `<div class="cv-lang"><div><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></div><div class="bar"><i data-pct="${CV.levelPct(l.level)}"></i></div></div>`).join('')}
                        <h2>Interessen</h2>
                        <p class="cv-travel">${(d.hobbies || []).map(h => esc(CV.noEmoji(h))).join(' · ')}</p>
                        <h2>Reisen</h2>
                        <p class="cv-travel"><strong>${x.countries.length} Länder</strong> – ${x.countries.map(n => esc(n)).join(', ')}</p>
                        ${(d.extras || []).length ? `<h2>Weitere Angaben</h2><ul class="cv-plain">${d.extras.map(e => `<li><strong>${esc(e.name)}:</strong> ${esc(e.text)}</li>`).join('')}</ul>` : ''}
                    </aside>
                </div>
            </article>
            <footer class="cv-foot no-print">
                <div><strong>Lust auf die spielerische Version?</strong>${CV.game.order.length - 1} kurze Kapitel – in ca. 3 Minuten.</div>
                <button class="btn primary" data-act="play">▶ Welt erkunden</button>
            </footer>`;
        const sheet = CV.$('#cv-sheet');
        sheet.querySelector('[data-act="back"]').onclick = () => UI.closeCv();
        sheet.querySelector('[data-act="print"]').onclick = (e) => { CV.audio.play('click'); CV.savePdf(e.currentTarget); };
        sheet.querySelector('[data-act="contact"]').onclick = () => { CV.audio.play('click'); CV.Contact.open(); };
        sheet.querySelector('[data-act="play"]').onclick = () => { UI.closeCv(true); };
        animateBars(sheet);
        const ghr = sheet.querySelector('.gh-root');
        if (ghr && CV.GitHub) CV.GitHub.mount(ghr, { compact: true }).then(() => { if (!ghr.innerHTML) ghr.parentElement.remove(); });
    }
    UI.closeCv = function (play) {
        hideOverlay('cv');
        if (play && !CV.game.started) CV.game.start();
        else if (cvReturnTo === 'start' && !CV.game.started) CV.$('#start').classList.remove('hidden');
    };
})();

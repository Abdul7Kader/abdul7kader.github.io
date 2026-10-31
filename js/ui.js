// Oberfläche: HUD, Stations-Dialoge, Minispiel-Rahmen, kompakter Lebenslauf, Finale.
(function () {
    const CV = window.CV;
    const esc = CV.esc;
    const UI = CV.UI = {};
    let cleanupGame = null;
    let currentStation = null;
    let cvReturnTo = 'world';

    // ------------------------------------------------------------------ Toasts
    UI.toast = function (html, ms = 2600, cls = '') {
        const el = document.createElement('div');
        el.className = 'toast ' + cls;
        el.innerHTML = html;
        CV.$('#toasts').appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, ms);
    };

    // ------------------------------------------------------------------ HUD
    UI.updateHud = function () {
        const G = CV.game, n = G.order.length - 1;
        const done = G.order.slice(0, n).filter(id => G.visited.has(id)).length;
        CV.$('#hud-progress-label').textContent = `${done} / ${n} Stationen entdeckt`;
        CV.$('#hud-progress-bar').style.width = (done / n * 100) + '%';
        const st = CV.data.stations || {};
        CV.$('#hud-badges').innerHTML = G.order.slice(0, n).map(id => {
            const s = st[id] || {}, got = G.visited.has(id);
            return `<span class="hb ${got ? 'got' : ''}" title="${esc(s.badge || '')}${got ? '' : ' (noch offen)'}">${esc(s.badgeIcon || '⭐')}</span>`;
        }).join('');
        const next = G.nextId();
        const obj = CV.$('#objective');
        if (next && !obj.dataset.hidden) {
            const s = CV.World.stations.find(x => x.id === next);
            CV.$('#objective-text').textContent = `${s.emoji} ${s.title}`;
            obj.classList.remove('hidden');
        } else obj.classList.add('hidden');
    };

    // ------------------------------------------------------------------ Overlays
    function showOverlay(id) { CV.$('#' + id).classList.remove('hidden'); CV.World.paused = true; }
    function hideOverlay(id) {
        CV.$('#' + id).classList.add('hidden');
        const anyOpen = ['station', 'journey', 'cv', 'start'].some(o => !CV.$('#' + o).classList.contains('hidden'));
        if (!anyOpen && CV.game.started) CV.World.paused = false;
    }
    UI.hideOverlay = hideOverlay;
    UI.anyOverlay = () => ['station', 'journey', 'cv'].find(o => !CV.$('#' + o).classList.contains('hidden'));

    // ------------------------------------------------------------------ Station
    UI.openStation = function (id) {
        currentStation = id;
        const def = CV.World.stations.find(s => s.id === id);
        const st = (CV.data.stations || {})[id] || {};
        CV.$('#station-emoji').textContent = def.emoji;
        CV.$('#station-era').textContent = st.era || '';
        CV.$('#station-title').textContent = st.title || def.title;
        CV.$('#station').dataset.station = id;
        showOverlay('station');
        CV.audio.play('open');
        if (id === 'finale') return renderFinale();
        if (CV.game.visited.has(id)) renderInfo(id, null);
        else renderStory(id);
    };

    function closeStation() {
        if (cleanupGame) { cleanupGame(); cleanupGame = null; }
        hideOverlay('station');
        CV.$('#station-body').innerHTML = '';
        CV.game.onStationClosed && CV.game.onStationClosed(currentStation);
        currentStation = null;
    }
    UI.closeStation = closeStation;

    function renderStory(id) {
        const st = (CV.data.stations || {})[id] || {};
        const mg = CV.Minigames[id];
        const body = CV.$('#station-body');
        body.innerHTML = `
            <div class="story">
                <img class="story-photo" src="${esc(CV.data.profileImage)}" alt="">
                <div class="story-bubble"><span class="story-name">${esc(CV.derived.firstName)}</span><p class="type"></p></div>
            </div>
            <div class="choice">
                ${mg ? `<button class="btn primary" data-act="play"><span>🎮 Minispiel: ${esc(mg.name)}</span><small>ca. 15 Sekunden</small></button>` : ''}
                <button class="btn ghost" data-act="info"><span>📄 Direkt zu den Fakten</span><small>ohne Spiel</small></button>
            </div>`;
        typeText(body.querySelector('.type'), st.story || '');
        body.querySelector('[data-act="info"]').onclick = () => { CV.audio.play('click'); renderInfo(id, null); };
        const p = body.querySelector('[data-act="play"]');
        if (p) p.onclick = () => { CV.audio.play('click'); renderGame(id); };
    }

    function typeText(el, text) {
        if (CV.reducedMotion) { el.textContent = text; return; }
        let i = 0;
        el.textContent = '';
        const tick = () => {
            if (!el.isConnected) return;
            i = Math.min(text.length, i + 2);
            el.textContent = text.slice(0, i);
            if (i < text.length) setTimeout(tick, 16);
        };
        el.parentElement.addEventListener('click', () => { i = text.length; el.textContent = text; }, { once: true });
        tick();
    }

    function renderGame(id) {
        const mg = CV.Minigames[id];
        const body = CV.$('#station-body');
        body.innerHTML = `
            <p class="mg-how">${esc(mg.how)}</p>
            <div class="mg-stage"></div>
            <div class="mg-foot"><button class="linkbtn" data-act="skip">Überspringen → direkt zu den Fakten</button></div>`;
        const stage = body.querySelector('.mg-stage');
        body.querySelector('[data-act="skip"]').onclick = () => {
            if (cleanupGame) { cleanupGame(); cleanupGame = null; }
            renderInfo(id, null);
        };
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
        const G = CV.game;
        const nextId = G.nextId();
        const next = nextId && CV.World.stations.find(s => s.id === nextId);
        const body = CV.$('#station-body');
        const badge = (firstTime || result) ? `
            <div class="badge-earned ${firstTime ? 'new' : ''}">
                <span class="b-icon">${esc(st.badgeIcon || '⭐')}</span>
                <div>
                    <small>${firstTime ? 'Stärke entdeckt' : 'Ergebnis'}</small>
                    <strong>${esc(st.badge || '')}</strong>
                    ${result ? `<p>${esc(result.text)}</p>` : ''}
                </div>
            </div>` : '';
        body.innerHTML = `
            ${badge}
            <div class="info">${(CONTENT[id] || (() => ''))()}</div>
            <footer class="panel-foot">
                ${CV.Minigames[id] ? '<button class="btn ghost small" data-act="replay">🎮 Minispiel</button>' : ''}
                <button class="btn primary" data-act="next">${next ? `Weiter: ${esc(next.emoji)} ${esc(next.title)} →` : 'Zurück zur Welt'}</button>
            </footer>`;
        if (firstTime) {
            CV.audio.play('badge');
            CV.World.confettiOnPlayer(60);
        }
        const rp = body.querySelector('[data-act="replay"]');
        if (rp) rp.onclick = () => renderGame(id);
        body.querySelector('[data-act="next"]').onclick = () => {
            CV.audio.play('click');
            closeStation();
            if (nextId) setTimeout(() => CV.World.walkToStation(nextId), 250);
        };
        animateBars(body);
        body.scrollTop = 0;
        CV.$('#station .panel').scrollTop = 0;
    }

    function animateBars(root) {
        requestAnimationFrame(() => setTimeout(() => {
            root.querySelectorAll('[data-pct]').forEach(el => { el.style.width = el.dataset.pct + '%'; });
        }, 60));
    }

    // ------------------------------------------------------------------ Inhalte je Station
    const D = () => CV.derived;
    const timeline = (items, map) => `<ol class="timeline">${items.map(it => {
        const m = map(it);
        return `<li class="${m.current ? 'current' : ''}"><span class="tl-date">${esc(m.date)}${m.current ? ' <em>aktuell</em>' : ''}</span><strong>${esc(m.title)}</strong><span class="tl-sub">${esc(m.sub)}</span></li>`;
    }).join('')}</ol>`;
    const chips = (list) => `<div class="chips">${list.map(t => `<span class="chip"><b>${CV.skillIcon(t)}</b>${esc(t)}</span>`).join('')}</div>`;
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
                <h3>Bereiste Länder</h3>
                <div class="flags">${D().countries.map(c => `<span class="flagchip">${CV.flag(c)} ${esc(c)}</span>`).join('')}</div>`;
        },
        language() {
            return `<h3>Meine Sprachen</h3>${langBars()}
                ${D().languageCourses.length ? `<h3>Der Weg zur Sprache</h3>${timeline(D().languageCourses, e => ({ date: e.date, title: e.title, sub: e.detail }))}` : ''}`;
        },
        school() {
            return `<h3>Bildungsweg</h3>${timeline(D().academic, e => ({ date: e.date, title: e.title, sub: e.detail, current: e.range.current }))}`;
        },
        career() {
            return `<h3>Berufserfahrung</h3>${timeline(D().experienceDesc, e => ({ date: e.date, title: e.role, sub: e.company, current: e.range.current }))}`;
        },
        lab() {
            const r = D().currentRole;
            return `
                ${r ? `<div class="role-card"><span class="kicker">Aktuelle Position</span><strong>${esc(r.role)}</strong><span>${esc(r.company)} · ${esc(r.date)}</span></div>` : ''}
                ${D().skills.map(s => `<h3>${esc(s.name)}</h3>${chips(String(s.level).split(',').map(x => x.trim()).filter(Boolean))}`).join('')}`;
        },
        projects() {
            return `<div class="projects">${(CV.data.projects || []).map(p => {
                const soon = /coming soon/i.test(p.detail), idea = /nicht umgesetzt|offen/i.test(p.detail);
                const tag = soon ? '<span class="tag soon">in Arbeit</span>' : idea ? '<span class="tag idea">Konzept</span>' : '<span class="tag live">umgesetzt</span>';
                const detail = String(p.detail).replace(/\s*\((coming soon!?|nicht umgesetzt \/ offen)\)/i, '').trim();
                return `<div class="project">${tag}<strong>${esc(p.title)}</strong><span class="kicker">${esc(p.tech)}</span><p>${esc(detail)}</p></div>`;
            }).join('')}</div>`;
        },
        lake() {
            return `<div class="hobbies">${(CV.data.hobbies || []).map(h => {
                const m = String(h).match(/^(\S+)\s+(.*)$/);
                const isEmoji = m && /\p{Extended_Pictographic}/u.test(m[1]);
                return `<div class="hobby"><b>${esc(isEmoji ? m[1] : '⭐')}</b><span>${esc(isEmoji ? m[2] : h)}</span></div>`;
            }).join('')}</div>`;
        }
    };

    // ------------------------------------------------------------------ Finale
    function renderFinale() {
        const G = CV.game, d = CV.data, st = d.stations || {};
        const n = G.order.length - 1;
        const done = G.order.slice(0, n).filter(id => G.visited.has(id)).length;
        const all = done === n;
        G.markVisited('finale');
        const c = d.contact || {};
        const body = CV.$('#station-body');
        const subject = encodeURIComponent(`Kennenlernen${G.firm ? ' – ' + G.firm : ''}`);
        body.innerHTML = `
            <div class="finale">
                <div class="finale-hero">
                    <img src="${esc(d.congratsImage || d.profileImage)}" alt="">
                    <span class="trophy">🏆</span>
                </div>
                <h3 class="finale-title">${all ? 'Sie haben meinen ganzen Weg erkundet!' : `${done} von ${n} Stationen erkundet`}</h3>
                <p class="finale-text">${esc((st.finale && st.finale.story) || '')}</p>
                <div class="cert">
                    <span class="kicker">Ihre Erkenntnisse über ${esc(CV.derived.firstName)}</span>
                    <ul class="cert-list">
                        ${G.order.slice(0, n).map(id => {
                            const s = st[id] || {}, got = G.visited.has(id);
                            return `<li class="${got ? 'got' : 'open'}" data-id="${id}"><b>${esc(s.badgeIcon || '⭐')}</b><span><strong>${esc(s.badge || '')}</strong><small>${got ? esc(s.title || '') : 'noch nicht entdeckt – hier klicken'}</small></span></li>`;
                        }).join('')}
                    </ul>
                </div>
                <label class="firm">
                    <span>Mein nächstes Kapitel bei:</span>
                    <input id="firm-input" type="text" maxlength="40" placeholder="Ihr Unternehmen" value="${esc(G.firm)}">
                </label>
                <div class="cta">
                    ${c.email ? `<a class="btn primary" href="mailto:${esc(c.email)}?subject=${subject}">✉️ Gespräch vereinbaren</a>` : ''}
                    <button class="btn ${c.email ? 'ghost' : 'primary'}" data-act="cv">📄 Lebenslauf kompakt &amp; PDF</button>
                    ${c.phone ? `<a class="btn ghost" href="tel:${esc(c.phone.replace(/\s/g, ''))}">📞 ${esc(c.phone)}</a>` : ''}
                    ${c.linkedin ? `<a class="btn ghost" href="${esc(c.linkedin)}" target="_blank" rel="noopener">in LinkedIn</a>` : ''}
                    ${c.github ? `<a class="btn ghost" href="${esc(c.github)}" target="_blank" rel="noopener">🐙 GitHub</a>` : ''}
                </div>
                <p class="muted small">Danke für Ihre Zeit – ich freue mich darauf, von Ihnen zu hören.</p>
            </div>`;
        CV.audio.play('fanfare');
        CV.World.confettiOnPlayer(160);
        setTimeout(() => CV.World.confettiOnPlayer(120), 600);
        const inp = body.querySelector('#firm-input');
        inp.addEventListener('input', () => { G.setFirm(inp.value); });
        body.querySelector('[data-act="cv"]').onclick = () => { closeStation(); UI.openCv('world'); };
        body.querySelectorAll('.cert-list li.open').forEach(li => li.onclick = () => { closeStation(); setTimeout(() => CV.World.walkToStation(li.dataset.id), 200); });
    }

    // ------------------------------------------------------------------ Schnellreise
    UI.openJourney = function () {
        const G = CV.game, st = CV.data.stations || {};
        const next = G.nextId();
        CV.$('#journey-list').innerHTML = G.order.map((id, i) => {
            const s = CV.World.stations.find(x => x.id === id), meta = st[id] || {};
            const status = G.visited.has(id) ? '<span class="js done">✓ entdeckt</span>' : id === next ? '<span class="js next">nächstes Ziel</span>' : '<span class="js">offen</span>';
            return `<li><button data-id="${id}"><span class="jn">${i + 1}</span><span class="je">${s.emoji}</span><span class="jt"><strong>${esc(s.title)}</strong><small>${esc(meta.era || '')}</small></span>${status}</button></li>`;
        }).join('');
        CV.$$('#journey-list button').forEach(b => b.onclick = () => {
            CV.audio.play('click');
            hideOverlay('journey');
            setTimeout(() => CV.World.walkToStation(b.dataset.id), 150);
        });
        showOverlay('journey');
    };

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
            d.location ? `<span>📍 ${esc(d.location)}</span>` : '',
            c.email ? `<a href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>` : '',
            c.phone ? `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">📞 ${esc(c.phone)}</a>` : '',
            c.linkedin ? `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : '',
            c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noopener">🐙 ${esc(c.github.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : ''
        ].filter(Boolean).join('');
        const tl = (items, map) => `<ol class="cv-tl">${items.map(it => { const m = map(it); return `<li class="${m.current ? 'current' : ''}"><span class="d">${esc(m.date)}</span><div><strong>${esc(m.title)}</strong><span>${esc(m.sub)}</span></div></li>`; }).join('')}</ol>`;
        CV.$('#cv-sheet').innerHTML = `
            <div class="cv-toolbar no-print">
                <button class="btn ghost small" data-act="back">← ${cvReturnTo === 'start' ? 'Zurück' : 'Zurück zur Welt'}</button>
                <button class="btn primary small" data-act="print">📄 Als PDF speichern</button>
            </div>
            <header class="cv-head">
                <img src="${esc(d.profileImage)}" alt="Foto von ${esc(d.name)}">
                <div>
                    <h1>${esc(d.name)}</h1>
                    <p class="cv-title">${esc(d.title)}</p>
                    ${d.availability ? `<p class="cv-avail"><i></i>${esc(d.availability)}</p>` : ''}
                    <p class="cv-contact">${contact}</p>
                </div>
            </header>
            ${(d.strengths || []).length ? `<section class="cv-strengths">${d.strengths.map(s => `<div><b>${esc(s.icon || '★')}</b><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></div>`).join('')}</section>` : ''}
            <div class="cv-grid">
                <div>
                    <h2>Berufserfahrung</h2>
                    ${tl(x.experienceDesc, e => ({ date: e.date, title: e.role, sub: e.company, current: e.range.current }))}
                    <h2>Ausbildung</h2>
                    ${tl(x.educationDesc, e => ({ date: e.date, title: e.title, sub: e.detail, current: e.range.current }))}
                    <h2>Eigene Projekte</h2>
                    <ul class="cv-projects">${(d.projects || []).map(p => `<li><strong>${esc(p.title)}</strong> <em>${esc(p.tech)}</em><span>${esc(p.detail)}</span></li>`).join('')}</ul>
                </div>
                <aside>
                    <h2>Kenntnisse</h2>
                    ${x.skills.map(s => `<h4>${esc(s.name)}</h4><p class="cv-chips">${String(s.level).split(',').map(t => `<span>${esc(t.trim())}</span>`).join('')}</p>`).join('')}
                    <h2>Sprachen</h2>
                    ${x.languages.map(l => `<div class="cv-lang"><div><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></div><div class="bar"><i data-pct="${CV.levelPct(l.level)}"></i></div></div>`).join('')}
                    <h2>Interessen</h2>
                    <ul class="cv-plain">${(d.hobbies || []).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
                    <h2>Reisen</h2>
                    <p class="cv-travel"><strong>${x.countries.length} Länder</strong> – ${x.countries.map(n => esc(n)).join(', ')}</p>
                </aside>
            </div>
            <footer class="cv-foot no-print">
                <span>Lust auf die spielerische Version?</span>
                <button class="btn primary small" data-act="play">▶ Welt erkunden</button>
            </footer>`;
        const sheet = CV.$('#cv-sheet');
        sheet.querySelector('[data-act="back"]').onclick = () => UI.closeCv();
        sheet.querySelector('[data-act="print"]').onclick = () => { CV.audio.play('click'); window.print(); };
        sheet.querySelector('[data-act="play"]').onclick = () => { UI.closeCv(true); };
        animateBars(sheet);
    }
    UI.closeCv = function (play) {
        hideOverlay('cv');
        if (play && !CV.game.started) CV.game.start();
        else if (cvReturnTo === 'start' && !CV.game.started) CV.$('#start').classList.remove('hidden');
    };
})();

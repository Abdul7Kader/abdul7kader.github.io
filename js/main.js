// Spielzustand, Startbildschirm, Tastenkürzel und Verdrahtung der Oberfläche.
document.addEventListener('DOMContentLoaded', () => {
    const CV = window.CV;
    const $ = CV.$;
    CV.data = window.resumeData || {};
    CV.derived = CV.derive(CV.data);
    const d = CV.data, x = CV.derived;
    const ORDER = ['arrival', 'language', 'school', 'career', 'lab', 'projects', 'lake', 'finale'];
    const st = d.stations || {};

    const G = CV.game = {
        order: ORDER,
        started: false,
        visited: new Set(CV.store.get('visited', []).filter(id => ORDER.includes(id))),
        firm: CV.param('firma') || CV.param('company') || CV.store.get('firm', ''),
        nextId() {
            return ORDER.slice(0, 7).find(id => !this.visited.has(id)) || (this.visited.has('finale') ? null : 'finale');
        },
        allVisited() { return ORDER.slice(0, 7).every(id => this.visited.has(id)); },
        markVisited(id) {
            if (this.visited.has(id)) return;
            const wasAll = this.allVisited();
            this.visited.add(id);
            CV.store.set('visited', Array.from(this.visited));
            CV.UI.updateHud();
            if (id !== 'finale') {
                const s = st[id] || {};
                CV.UI.achieve(s.badgeIcon || '⭐', 'Stärke freigeschaltet', CV.esc(s.badge || s.title || ''), 2800);
            }
            if (!wasAll && this.allVisited() && id !== 'finale') this.allDone = true;
        },
        setFirm(name) {
            this.firm = String(name || '').trim().slice(0, 40);
            CV.store.set('firm', this.firm);
        },
        start() {
            if (this.started) return;
            this.started = true;
            $('#start').classList.add('hidden');
            ['#hud', '#dock', '#minimap'].forEach(s => $(s).classList.remove('hidden'));
            CV.UI.updateHud();
            CV.World.begin();
            CV.audio.unlock();
            CV.audio.play('whoosh');
            const hint = $('#controls-hint');
            hint.innerHTML = CV.isTouch
                ? 'Ziehen zum Laufen · Tippen, um hinzulaufen'
                : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> laufen · Klick = hinlaufen · <kbd>Strg K</kbd> Suche';
            hint.classList.remove('hidden');
            const returning = this.visited.size > 0;
            setTimeout(() => {
                CV.World.sayRobot(returning
                    ? `Willkommen zurück! ${Math.min(7, this.visited.size)} Kapitel kennen Sie schon. Weiter geht’s! 🤖`
                    : `Hi, ich bin Bit 🤖 – ${x.firstName}s Assistent. Folgen Sie dem orangen Pfeil – oder ${window.innerWidth < 640 ? 'unten' : 'oben links'} auf „Nächstes Ziel“ ${CV.isTouch ? 'tippen' : 'klicken'}!`, 5600);
            }, 700);
            if (!returning) setTimeout(() => CV.World.say(CV.World.player, 'Kommen Sie mit – hier beginnt mein Weg! 👋', 3800), 6600);
            idleReset();
        },
        onStationClosed(id) {
            if (this.allDone) {
                this.allDone = false;
                setTimeout(() => {
                    CV.UI.achieve('🏆', 'Alle Kapitel entdeckt', 'Das Finale wartet auf dem Hügel!', 4200, 'gold');
                    CV.World.sayRobot('Wow, alles entdeckt! Kommen Sie mit zum Finale auf dem Hügel 🏆', 5000);
                }, 400);
            } else if (id && id !== 'finale') {
                const next = this.nextId();
                const s = next && CV.World.stations.find(s2 => s2.id === next);
                if (s) setTimeout(() => CV.World.sayRobot(`Nächster Halt: ${s.emoji} ${(st[next] && st[next].title) || s.title}`, 3000), 300);
            }
            idleReset();
        }
    };

    // ------------------------------------------------------------- Startbildschirm befüllen
    const photo = d.profileImage || '';
    ['#start-photo', '#hud-photo'].forEach(s => { if (photo) $(s).src = photo; });
    $('#hud-name').textContent = d.name || '';
    $('#start-title').innerHTML = `Hallo, ich bin <span class="hl">${CV.esc(x.firstName)}</span>.`;
    $('#start-role').textContent = d.title || '';
    $('#start-tagline').textContent = d.tagline || d.intro || '';
    const who = CV.param('name');
    $('#start-greeting').textContent = who && G.firm ? `👋 Hallo ${who} von ${G.firm}!` : G.firm ? `👋 Willkommen, Team ${G.firm}!` : who ? `👋 Hallo ${who}!` : '👋 Schön, dass Sie da sind';
    $('#pc-name').textContent = d.name || '';
    $('#pc-class').textContent = x.currentRole ? `${x.currentRole.role} · ${x.currentRole.companyShort}` : (d.title || '');
    $('#pc-status').textContent = d.availability ? d.availability.replace(/^Offen für /i, 'offen für ') : 'verfügbar';
    const stats = [];
    if (x.roleSinceYear && x.currentRole) stats.push([String(x.roleSinceYear), `bei ${x.currentRole.companyShort.replace(/\s+(SE|GmbH|AG)$/i, '')}`]);
    if (x.languages.length) stats.push([String(x.languages.length), 'Sprachen']);
    if (x.countries.length) stats.push([String(x.countries.length), 'Länder bereist']);
    $('#start-stats').innerHTML = stats.slice(0, 3).map(([v, l]) => `<div class="stat"><b>${CV.esc(v)}</b><span>${CV.esc(l)}</span></div>`).join('');
    const seen = G.order.slice(0, 7).filter(id => G.visited.has(id)).length;
    $('#start-chapters').innerHTML = ORDER.slice(0, 7).map(id => `<span class="${G.visited.has(id) ? 'got' : ''}" title="${CV.esc((st[id] || {}).badge || '')}">${CV.esc((st[id] || {}).badgeIcon || '⭐')}</span>`).join('');
    $('#start-foot').textContent = seen ? `Willkommen zurück – Sie haben bereits ${seen} von 7 Kapiteln entdeckt.` : 'Ohne Installation · Maus, Tastatur oder Touch · kein Game Over';
    if (seen) $('#start-play .cta-txt b').textContent = 'Weiter spielen';

    // Spielerkarte folgt der Maus (3D-Neigung)
    const card = $('.pcard-in');
    if (!CV.isTouch && !CV.reducedMotion) {
        $('#start').addEventListener('pointermove', (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
            card.style.setProperty('--ry', `${CV.clamp((px - 0.5) * 14, -10, 10)}deg`);
            card.style.setProperty('--rx', `${CV.clamp((0.5 - py) * 12, -9, 9)}deg`);
            card.style.setProperty('--mx', `${CV.clamp(px * 100, 0, 100)}%`);
            card.style.setProperty('--my', `${CV.clamp(py * 100, 0, 100)}%`);
        });
        $('#start').addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    }

    // ------------------------------------------------------------- Welt
    CV.World.init($('#world'));
    CV.World.onEnterStation = (id) => CV.UI.openStation(id);
    // Erster Besuch: automatisch hinein. Danach nur noch per „Betreten“ (Knopf, E/Enter oder Klick aufs Gebäude).
    const missing = () => ORDER.slice(0, 7).filter(id => !G.visited.has(id)).length;
    CV.World.isLocked = (id) => id === 'finale' && !G.allVisited();
    CV.World.canAutoEnter = (id) => !G.visited.has(id) && !CV.World.isLocked(id);
    let lockSaid = 0;
    CV.World.onLocked = () => {
        const n = missing();
        if (performance.now() - lockSaid < 2500) return;
        lockSaid = performance.now();
        CV.audio.play('bad');
        CV.World.sayRobot(`🔒 Das letzte Kapitel öffnet sich erst, wenn Sie alle 7 Gebäude besucht haben – noch ${n} offen.`, 4200);
    };
    CV.World.onFirstMove = () => setTimeout(() => $('#controls-hint').classList.add('hidden'), 2500);
    const tokMax = CV.World.tokenCount();
    $('#tokens-max').textContent = tokMax;
    $('#tokens-val').textContent = CV.World.tokensGot().length;
    CV.World.onCollect = (label, got, max) => {
        CV.audio.play('coin');
        CV.store.set('tokens', got);
        $('#tokens-val').textContent = got.length;
        const t = $('#tokens'); t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
        if (got.length === max) {
            setTimeout(() => {
                CV.UI.achieve('⭐', 'Sammler', `Alle ${max} Skill-Sterne gefunden!`, 4200, 'gold');
                CV.World.confettiOnPlayer(120);
                CV.audio.play('fanfare');
            }, 300);
        }
        idleReset();
    };

    // Minimap (ca. 12 fps reichen)
    let mmLast = 0;
    (function mm(ts) {
        if (ts - mmLast > 80 && G.started && !CV.World.paused) { mmLast = ts; CV.UI.drawMinimap(); }
        requestAnimationFrame(mm);
    })(0);
    $('#minimap').addEventListener('click', (e) => CV.UI.minimapClick(e));

    // ------------------------------------------------------------- Buttons
    const playNow = () => { CV.audio.unlock(); CV.audio.play('click'); G.start(); };
    const cvNow = () => { CV.audio.unlock(); CV.audio.play('click'); $('#start').classList.add('hidden'); CV.UI.openCv('start'); };
    $('#start-play').onclick = playNow;
    $('#start-cv').onclick = cvNow;
    $('#btn-cv').onclick = () => { CV.audio.play('click'); CV.UI.openCv('world'); };
    $('#btn-map').onclick = () => { CV.audio.play('click'); CV.UI.openJourney(); };
    $('#btn-search').onclick = () => CV.UI.openPalette();
    $('#hud-profile').onclick = () => { CV.audio.play('click'); CV.UI.openJourney(); };
    const goNext = () => { const n = G.nextId(); if (n) { CV.audio.play('click'); CV.World.walkToStation(n); } };
    $('#objective').onclick = goNext;
    $('#station-close').onclick = () => CV.UI.closeStation();
    CV.$$('[data-close]').forEach(b => b.onclick = () => CV.UI.hideOverlay(b.dataset.close));
    const snd = $('#btn-sound'), mus = $('#btn-music');
    const syncAudioBtns = () => {
        snd.textContent = CV.audio.state.sfx ? '🔊' : '🔈';
        snd.classList.toggle('off', !CV.audio.state.sfx);
        mus.classList.toggle('off', !CV.audio.state.music);
    };
    syncAudioBtns();
    snd.onclick = () => { CV.audio.setSfx(!CV.audio.state.sfx); syncAudioBtns(); CV.audio.play('click'); };
    mus.onclick = () => { CV.audio.setMusic(!CV.audio.state.music); syncAudioBtns(); };

    const action = $('#action-btn');
    action.onclick = () => { if (CV.World.nearStation) { CV.audio.play('click'); CV.World.enter(CV.World.nearStation); } };
    let lastAct = '';
    setInterval(() => {
        const s = CV.World.nearStation;
        const show = G.started && !CV.World.paused && s;
        action.classList.toggle('hidden', !show);
        if (!show) { lastAct = ''; return; }
        $('#controls-hint').classList.add('hidden');
        const locked = CV.World.isLocked(s.id);
        const html = locked ? `🔒 <span>Noch ${missing()} Kapitel offen</span>`
            : `<span class="ab-ic">${s.emoji}</span><span><small>Betreten</small>${CV.esc((st[s.id] && st[s.id].title) || s.title)}</span>${CV.isTouch ? '' : '<kbd>E</kbd>'}`;
        if (html !== lastAct) { action.innerHTML = html; lastAct = html; }
        action.classList.toggle('locked', locked);
    }, 150);

    // Klick außerhalb des Panels schließt Overlays
    ['station', 'journey', 'palette'].forEach(id => {
        $('#' + id).addEventListener('pointerdown', (e) => {
            if (e.target.id === id) id === 'station' ? CV.UI.closeStation() : CV.UI.hideOverlay(id);
        });
    });

    // ------------------------------------------------------------- Tastenkürzel
    window.addEventListener('keydown', (e) => {
        const typing = e.target && /input|textarea/i.test(e.target.tagName);
        const open = CV.UI.anyOverlay();
        if (e.key === 'Escape') {
            if (open === 'station') CV.UI.closeStation();
            else if (open === 'cv') CV.UI.closeCv();
            else if (open) CV.UI.hideOverlay(open);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (open === 'palette') CV.UI.hideOverlay('palette');
            else if (!open && G.started) CV.UI.openPalette();
            return;
        }
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
        const startOpen = !$('#start').classList.contains('hidden');
        if (startOpen && !open) {
            if (e.key === 'Enter' && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); playNow(); }
            else if (e.key.toLowerCase() === 'l') cvNow();
            return;
        }
        if (open || !G.started) return;
        const k = e.key.toLowerCase();
        if (k === '/') { e.preventDefault(); CV.UI.openPalette(); }
        else if (k === 'm') { CV.audio.play('click'); CV.UI.openJourney(); }
        else if (k === 'l') { CV.audio.play('click'); CV.UI.openCv('world'); }
        else if (k === 'g') goNext();
    });

    // Sanfte Hilfe, wenn länger nichts passiert
    let idleTimer = null;
    function idleReset() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (!G.started || CV.World.paused) return idleReset();
            const n = G.nextId();
            if (n) CV.World.sayRobot(CV.isTouch ? 'Tipp: Auf „Nächstes Ziel“ tippen – dann laufe ich automatisch hin.' : 'Tipp: Links oben auf „Nächstes Ziel“ klicken (oder G drücken) – dann laufe ich automatisch hin.', 5200);
            idleReset();
        }, 22000);
    }
    ['keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, idleReset, { passive: true }));

    // Direktlinks: ?cv=1 oder #lebenslauf öffnet direkt die Kompaktansicht
    if (CV.param('cv') || /lebenslauf|cv/i.test(location.hash)) cvNow();
    else setTimeout(() => $('#start-play').focus({ preventScroll: true }), 300);
});

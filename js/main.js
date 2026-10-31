// Spielzustand und Start.
document.addEventListener('DOMContentLoaded', () => {
    const CV = window.CV;
    const $ = CV.$;
    CV.data = window.resumeData || {};
    CV.derived = CV.derive(CV.data);
    const d = CV.data, x = CV.derived;
    const ORDER = ['arrival', 'language', 'school', 'career', 'lab', 'projects', 'lake', 'finale'];

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
            ['#hud', '#tokens'].forEach(s => $(s).classList.remove('hidden'));
            CV.UI.updateHud();
            CV.World.begin();
            CV.audio.unlock();
            CV.audio.play('whoosh');
            const hint = $('#controls-hint');
            hint.textContent = CV.isTouch ? 'Ziehen zum Laufen · Tippen, um hinzulaufen' : 'WASD / Pfeiltasten – oder einfach irgendwohin klicken';
            hint.classList.remove('hidden');
            const returning = this.visited.size > 0;
            setTimeout(() => {
                CV.World.sayRobot(returning
                    ? `Willkommen zurück! ${this.visited.size} Station${this.visited.size === 1 ? '' : 'en'} kennen Sie schon. Weiter geht’s! 🤖`
                    : `Hi, ich bin Bit 🤖 – ${x.firstName}s Assistent. Folgen Sie einfach dem orangen Pfeil!`, 5200);
            }, 700);
            if (!returning) setTimeout(() => CV.World.say(CV.World.player, 'Kommen Sie mit – hier beginnt mein Weg! 👋', 3800), 6200);
            idleReset();
        },
        onStationClosed(id) {
            if (this.allDone) {
                this.allDone = false;
                setTimeout(() => {
                    CV.UI.toast('🏆 <b>Alle Stationen entdeckt!</b> Das Finale wartet auf dem Hügel.', 4200, 'gold');
                    CV.World.sayRobot('Wow, alles entdeckt! Kommen Sie mit zum Finale auf dem Hügel 🏆', 5000);
                }, 400);
            } else if (id && id !== 'finale') {
                const next = this.nextId();
                const s = next && CV.World.stations.find(st => st.id === next);
                if (s) setTimeout(() => CV.World.sayRobot(`Nächster Halt: ${s.emoji} ${s.title}`, 3000), 300);
            }
            idleReset();
        }
    };

    // ------------------------------------------------------------- Startbildschirm befüllen
    const photo = d.profileImage || '';
    ['#start-photo', '#hud-photo'].forEach(s => { if (photo) $(s).src = photo; });
    $('#hud-name').textContent = d.name || '';
    $('#start-title').textContent = `Hallo, ich bin ${x.firstName}!`;
    $('#start-role').textContent = d.title || '';
    $('#start-tagline').textContent = d.tagline || d.intro || '';
    const who = CV.param('name');
    $('#start-greeting').textContent = who && G.firm ? `Hallo ${who} von ${G.firm}! 👋` : G.firm ? `Willkommen, Team ${G.firm}! 👋` : who ? `Hallo ${who}! 👋` : 'Schön, dass Sie da sind!';
    const stats = [];
    if (x.roleSinceYear && x.currentRole) stats.push([`seit ${x.roleSinceYear}`, `${x.currentRole.role.replace(/\s*\(.*\)/, '')} bei ${x.currentRole.company}`]);
    if (x.languages.length) stats.push([String(x.languages.length), 'Sprachen, Deutsch C1']);
    if (x.countries.length) stats.push([String(x.countries.length), 'Länder bereist']);
    $('#start-stats').innerHTML = stats.slice(0, 3).map(([v, l]) => `<div class="stat"><b>${CV.esc(v)}</b><span>${CV.esc(l)}</span></div>`).join('');
    const seen = G.visited.size;
    $('#start-foot').textContent = seen ? `Willkommen zurück – Sie haben bereits ${Math.min(seen, 7)} von 7 Stationen entdeckt.` : 'Ohne Installation · funktioniert mit Maus, Tastatur und Touch';
    if (seen) $('#start-play span').textContent = '▶ Weiter erkunden';

    // ------------------------------------------------------------- Welt
    CV.World.init($('#world'));
    CV.World.onEnterStation = (id) => CV.UI.openStation(id);
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
                CV.UI.toast(`⭐ <b>Alle ${max} Skill-Sterne gesammelt!</b> Sie haben ein Auge fürs Detail.`, 4200, 'gold');
                CV.World.confettiOnPlayer(120);
                CV.audio.play('fanfare');
            }, 300);
        }
        idleReset();
    };

    // ------------------------------------------------------------- Buttons
    $('#start-play').onclick = () => { CV.audio.unlock(); CV.audio.play('click'); G.start(); };
    $('#start-cv').onclick = () => { CV.audio.unlock(); CV.audio.play('click'); $('#start').classList.add('hidden'); CV.UI.openCv('start'); };
    $('#btn-cv').onclick = () => { CV.audio.play('click'); CV.UI.openCv('world'); };
    $('#btn-map').onclick = () => { CV.audio.play('click'); CV.UI.openJourney(); };
    $('#hud-profile').onclick = () => { CV.audio.play('click'); CV.UI.openJourney(); };
    $('#objective').onclick = () => { CV.audio.play('click'); const n = G.nextId(); if (n) CV.World.walkToStation(n); };
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
    action.onclick = () => { if (CV.World.nearStation) CV.World.enter(CV.World.nearStation); };
    setInterval(() => {
        const show = CV.isTouch && G.started && !CV.World.paused && CV.World.nearStation;
        action.classList.toggle('hidden', !show);
    }, 200);

    // Klick außerhalb des Panels schließt Overlays
    ['station', 'journey'].forEach(id => {
        $('#' + id).addEventListener('pointerdown', (e) => {
            if (e.target.id === id) id === 'station' ? CV.UI.closeStation() : CV.UI.hideOverlay(id);
        });
    });
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const open = CV.UI.anyOverlay();
        if (open === 'station') CV.UI.closeStation();
        else if (open === 'cv') CV.UI.closeCv();
        else if (open) CV.UI.hideOverlay(open);
    });

    // Sanfte Hilfe, wenn länger nichts passiert
    let idleTimer = null;
    function idleReset() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (!G.started || CV.World.paused) return idleReset();
            const n = G.nextId();
            if (n) CV.World.sayRobot('Tipp: Oben auf „Nächstes Ziel“ klicken – dann laufe ich automatisch hin.', 5000);
            idleReset();
        }, 22000);
    }
    ['keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, idleReset, { passive: true }));

    // Direktlinks: ?cv=1 oder #lebenslauf öffnet direkt die Kompaktansicht
    if (CV.param('cv') || /lebenslauf|cv/i.test(location.hash)) $('#start-cv').click();
});

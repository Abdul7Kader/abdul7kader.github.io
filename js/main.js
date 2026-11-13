// Einstieg: verbindet Welt, Spielstand und Oberfläche. Jedes Modul kennt nur seine eigene Aufgabe;
// hier wird verdrahtet, wer worauf reagiert (Ereignisse aus core/events.js).
import { $, $$ } from './core/dom.js';
import { isTouch, param } from './core/env.js';
import { t, lang, setLang, LANGS } from './core/i18n.js';
import { on, emit } from './core/events.js';
import { audio } from './core/audio.js';
import { store } from './core/store.js';
import { theme, setTheme, toggleTheme } from './core/theme.js';
import { WORLD_DAY, WORLD_NIGHT } from './config/theme.js';
import { FINALE, ACTIVITY_WEEKS } from './config/layout.js';
import { TIMING } from './config/timing.js';
import { WORLD_PERF } from './config/performance.js';
import { World } from './world/world.js';
import { progress } from './app/progress.js';
import { data, derived, station } from './app/content.js';
import { isOpen, topOverlay, hideOverlay, setupFocusTrap } from './ui/overlays.js';
import { achieve } from './ui/toasts.js';
import { updateHud, translateHud, syncAudioButtons, syncThemeButtons, showControlsHint, hideControlsHint, updateActionButton, robotCorner } from './ui/hud.js';
import { drawMinimap, minimapClick, resetMinimap } from './ui/minimap.js';
import { openStation, closeStation, rerenderStation } from './ui/station.js';
import { openJourney, renderJourney } from './ui/journey.js';
import { openPalette, setupPalette } from './ui/palette.js';
import { openCv, closeCv, renderCv, savePdfFromCv, setupPrint } from './ui/cv.js';
import { openContact, closeContact } from './ui/contact.js';
import { renderStart, setupStartCard } from './ui/start.js';
import { activityLevels } from './ui/github.js';

const ACTION_POLL_MS = 150;
const DELAY = { allDoneToast: 400, collectorToast: 300, startFocus: 300 };
const COLLECTOR_CONFETTI = 120;
const CLICK_OUTSIDE_CLOSES = ['station', 'journey', 'palette', 'contact'];

const titles = () => Object.fromEntries(progress.order.map(id => [id, station(id).title]));
let pendingAllDone = false;

// ------------------------------------------------------------------ Spielablauf
function startGame() {
    if (progress.started) return;
    progress.started = true;
    $('#start').classList.add('hidden');
    ['#hud', '#dock', '#minimap'].forEach(s => $(s).classList.remove('hidden'));
    updateHud();
    World.begin();
    audio.unlock();
    audio.play('whoosh');
    showControlsHint();
    const returning = progress.visited.size > 0;
    setTimeout(() => {
        World.sayRobot(returning
            ? t('robot.welcomeBack', { n: Math.min(progress.chapters.length, progress.visited.size) })
            : t(isTouch ? 'robot.welcomeTouch' : 'robot.welcome', { name: derived().firstName, corner: robotCorner() }), TIMING.ROBOT_GREETING_MS);
    }, TIMING.ROBOT_GREETING_DELAY_MS);
    if (!returning) setTimeout(() => World.sayPlayer(t('robot.playerHello'), TIMING.PLAYER_GREETING_MS), TIMING.PLAYER_GREETING_DELAY_MS);
    idleReset();
}

const playNow = () => { audio.unlock(); audio.play('click'); startGame(); };
const cvNow = () => { audio.unlock(); audio.play('click'); $('#start').classList.add('hidden'); openCv('start'); };
const goNext = () => { const n = progress.nextId(); if (n) { audio.play('click'); World.walkToStation(n); } };

// Sanfte Hilfe, wenn länger nichts passiert
let idleTimer = null;
function idleReset() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (progress.started && !World.paused && progress.nextId()) World.sayRobot(t(isTouch ? 'robot.idleTouch' : 'robot.idleKeys'), TIMING.IDLE_HINT_BUBBLE_MS);
        idleReset();
    }, TIMING.IDLE_HINT_MS);
}

// ------------------------------------------------------------------ Welt
/** Tag- oder Nacht-Palette der Welt (Sprites und Boden werden dabei einmal neu gezeichnet) */
function applyWorldTheme() {
    World.setPalette(theme() === 'dark' ? WORLD_NIGHT : WORLD_DAY);
    resetMinimap();
    if (progress.started) drawMinimap();
}

function setupWorld() {
    let lockSaid = 0, minimapLast = 0;
    World.init($('#world'), {
        titles: titles(),
        skillTokens: derived().skillTokens,
        collected: store.get('tokens', []),
        hooks: {
            t, lang, firm: () => progress.firm, facts: () => data().facts || [],
            nextId: () => progress.nextId(),
            isVisited: (id) => progress.visited.has(id),
            isLocked: (id) => progress.isLocked(id),
            allVisited: () => progress.allVisited(),
            // Erster Besuch: automatisch hinein. Danach nur noch per „Betreten“ (Knopf, E/Enter oder Klick aufs Gebäude).
            canAutoEnter: (id) => !progress.visited.has(id) && !progress.isLocked(id),
            onEnterStation: (id) => openStation(id),
            onLocked: () => {
                if (performance.now() - lockSaid < TIMING.LOCK_MESSAGE_GAP_MS) return;
                lockSaid = performance.now();
                audio.play('bad');
                World.sayRobot(t('robot.locked', { total: progress.chapters.length, n: progress.chapters.length - progress.doneCount }), TIMING.LOCK_MESSAGE_MS);
            },
            onFirstMove: () => setTimeout(hideControlsHint, TIMING.HINT_HIDE_AFTER_MOVE_MS),
            onCollect: (label, got, max) => {
                audio.play('coin');
                store.set('tokens', got);
                $('#tokens-val').textContent = got.length;
                const box = $('#tokens');
                box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
                if (got.length === max) {
                    setTimeout(() => {
                        achieve('⭐', t('toast.collector'), t('toast.collectorTitle', { n: max }), TIMING.GOLD_TOAST_MS, 'gold');
                        World.confettiOnPlayer(COLLECTOR_CONFETTI);
                        audio.play('fanfare');
                    }, DELAY.collectorToast);
                }
                idleReset();
            },
            // Minimap hängt an der Render-Schleife; wenige Bilder pro Sekunde reichen für den Positionspunkt
            onFrame: (ts) => {
                if (ts - minimapLast > WORLD_PERF.MINIMAP_INTERVAL_MS && progress.started && !World.paused) { minimapLast = ts; drawMinimap(); }
            },
            unlockAudio: () => audio.unlock()
        }
    });
    if (theme() === 'dark') applyWorldTheme();
    activityLevels(ACTIVITY_WEEKS).then(levels => { if (levels) World.setActivity(levels); });
    $('#tokens-max').textContent = World.tokenCount();
    $('#tokens-val').textContent = World.tokensGot().length;
    $('#minimap').addEventListener('click', minimapClick);
}

// ------------------------------------------------------------------ Knöpfe
function setupButtons() {
    $('#start-play').onclick = playNow;
    $('#start-cv').onclick = cvNow;
    $('#btn-cv').onclick = () => { audio.play('click'); openCv('world'); };
    $('#btn-map').onclick = () => { audio.play('click'); openJourney(); };
    $('#btn-search').onclick = () => openPalette();
    $('#btn-contact').onclick = () => { audio.play('click'); openContact(); };
    $('#hud-profile').onclick = () => { audio.play('click'); openJourney(); };
    $('#objective').onclick = goNext;
    $('#station-close').onclick = () => closeStation();
    $$('[data-close]').forEach(b => { b.onclick = () => hideOverlay(b.dataset.close); });
    $('#btn-sound').onclick = () => { audio.setSfx(!audio.state.sfx); syncAudioButtons(); audio.play('click'); };
    $('#btn-music').onclick = () => { audio.setMusic(!audio.state.music); syncAudioButtons(); };
    $$('[data-set-lang]').forEach(b => { b.onclick = () => { audio.play('click'); setLang(b.dataset.setLang); }; });
    $$('[data-toggle-lang]').forEach(b => { b.onclick = () => { audio.play('click'); emit('lang:toggle'); }; });
    $$('[data-toggle-theme]').forEach(b => { b.onclick = () => { audio.play('click'); toggleTheme(); }; });
    $$('[data-set-theme]').forEach(b => { b.onclick = () => { audio.play('click'); setTheme(b.dataset.setTheme); }; });
    $('#action-btn').onclick = () => { if (World.nearStation) { audio.play('click'); World.enter(World.nearStation); } };
    setInterval(updateActionButton, ACTION_POLL_MS);
    // Klick neben das Fenster schließt es
    CLICK_OUTSIDE_CLOSES.forEach(id => {
        $('#' + id).addEventListener('pointerdown', (e) => { if (e.target.id === id) (id === 'station' ? closeStation() : hideOverlay(id)); });
    });
}

// ------------------------------------------------------------------ Tastenkürzel
function setupKeyboard() {
    window.addEventListener('keydown', (e) => {
        const typing = e.target && /input|textarea/i.test(e.target.tagName);
        const open = topOverlay();
        if (e.key === 'Escape') {
            if (open === 'station') closeStation();
            else if (open === 'cv') closeCv();
            else if (open) hideOverlay(open);
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (open === 'palette') hideOverlay('palette');
            else if (!open && progress.started) openPalette();
            return;
        }
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
        const k = e.key.toLowerCase();
        if (isOpen('start') && !open) {
            if (e.key === 'Enter' && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); playNow(); }
            else if (k === 'l') cvNow();
            return;
        }
        if (open || !progress.started) return;
        if (k === '/') { e.preventDefault(); openPalette(); }
        else if (k === 'm') { audio.play('click'); openJourney(); }
        else if (k === 'l') { audio.play('click'); openCv('world'); }
        else if (k === 'g') goNext();
    });
    ['keydown', 'pointerdown'].forEach(ev => window.addEventListener(ev, idleReset, { passive: true }));
}

// ------------------------------------------------------------------ Ereignisse zwischen den Modulen
function setupEvents() {
    on('progress:visited', ({ completedAll }) => { updateHud(); if (completedAll) pendingAllDone = true; });
    on('station:closed', () => {
        if (pendingAllDone) {
            pendingAllDone = false;
            setTimeout(() => achieve('🏆', t('toast.allDone'), t('toast.allDoneTitle'), TIMING.GOLD_TOAST_MS, 'gold'), DELAY.allDoneToast);
        }
        idleReset();
    });
    on('station:open', ({ id, info }) => openStation(id, { info }));
    on('contact:open', (prefill) => openContact(prefill));
    on('journey:open', () => openJourney());
    on('cv:open', ({ from }) => { if (from === 'finale') { closeStation(); openCv('world'); } else openCv(from); });
    on('pdf:save', () => savePdfFromCv());
    on('game:start', () => startGame());
    on('lang:toggle', () => setLang(LANGS[(LANGS.indexOf(lang()) + 1) % LANGS.length]));
    on('firm:changed', () => World.refresh());
    on('theme:set', (m) => setTheme(m));
    on('theme:toggle', () => toggleTheme());
    on('theme:changed', () => { syncThemeButtons(); applyWorldTheme(); });
    on('lang:changed', () => {
        translateHud();
        renderStart();
        updateHud();
        World.refresh(titles());
        if (isOpen('station')) rerenderStation();
        if (isOpen('journey')) renderJourney();
        if (isOpen('cv')) renderCv();
        if (isOpen('palette')) hideOverlay('palette');
        if (isOpen('contact')) closeContact();
    });
}

// ------------------------------------------------------------------ Test-Schnittstelle (tests/*.mjs)
function exposeTestApi() {
    window.cvApp = {
        start: () => startGame(),
        openStation: (id, o) => openStation(id, o), closeStation: () => closeStation(),
        openCv: (r) => openCv(r || 'world'), closeCv: () => closeCv(),
        openJourney: () => openJourney(), openPalette: () => openPalette(),
        openContact: (p) => openContact(p), hide: (id) => hideOverlay(id),
        walkTo: (id) => World.walkToStation(id), order: () => progress.order.slice(),
        state: () => ({ visited: progress.visited.size, all: progress.allVisited(), locked: progress.isLocked(FINALE) }),
        frameCount: () => World.frames,
        setLang: (l) => setLang(l), lang: () => lang(),
        setTheme: (m) => emit('theme:set', m), theme: () => theme(),
        finishGame: () => emit('game:finish')
    };
}

// ------------------------------------------------------------------ Start
function boot() {
    translateHud();
    renderStart();
    setupStartCard();
    setupWorld();
    setupButtons();
    setupKeyboard();
    setupEvents();
    setupPalette();
    setupPrint();
    setupFocusTrap();
    exposeTestApi();
    // Direktlinks: ?cv=1 oder #lebenslauf / #cv öffnet direkt die Kompaktansicht
    if (param('cv') || /lebenslauf|cv/i.test(location.hash)) cvNow();
    else if (/kontakt|contact/i.test(location.hash)) { $('#start').classList.add('hidden'); openContact(); }
    else setTimeout(() => $('#start-play').focus({ preventScroll: true }), DELAY.startFocus);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

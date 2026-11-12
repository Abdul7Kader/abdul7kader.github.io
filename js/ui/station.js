// Stations-Dialog: Erzähltext → Minispiel (optional) → Fakten. Das Finale hat einen eigenen Inhalt (finale.js).
import { $, $$, esc, focusLater } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { reducedMotion } from '../core/env.js';
import { audio } from '../core/audio.js';
import { emit } from '../core/events.js';
import { FINALE } from '../config/layout.js';
import { TIMING } from '../config/timing.js';
import { stationColors, BADGE_ICONS } from '../config/theme.js';
import { World } from '../world/world.js';
import { GAMES, mountGame } from '../games/index.js';
import { progress, MAX_STARS_PER_GAME } from '../app/progress.js';
import { data, derived, station } from '../app/content.js';
import { showOverlay, hideOverlay } from './overlays.js';
import { CONTENT, mountExtras } from './station-content.js';
import { renderFinale } from './finale.js';

let cleanupGame = null;
let current = null;
const stopGame = () => { if (cleanupGame) { cleanupGame(); cleanupGame = null; } };
const starRow = (n) => '★'.repeat(n) + '☆'.repeat(MAX_STARS_PER_GAME - n);   // als Text (auch in Titeln nutzbar)

export const currentStation = () => current;

export function openStation(id, opts = {}) {
    if (progress.isLocked(id)) { emit('station:locked', id); return; }
    stopGame();
    current = id;
    const def = World.stations.find(s => s.id === id), st = station(id);
    const idx = progress.order.indexOf(id), n = progress.chapters.length;
    const panel = $('#station .panel');
    const [c1, c2] = stationColors(id);
    panel.style.setProperty('--c1', c1); panel.style.setProperty('--c2', c2);
    panel.classList.remove('playing');
    $('#station-emoji').textContent = def.emoji;
    $('#station-era').textContent = st.era || '';
    $('#station-chapter').textContent = id === FINALE ? t('station.finale') : t('station.chapter', { n: idx + 1, total: n });
    $('#station-title').textContent = st.title || def.title;
    $('#station-steps').innerHTML = progress.chapters.map(o => `<i class="${o === id ? 'cur' : progress.visited.has(o) ? 'done' : ''}"></i>`).join('');
    $('#station').dataset.station = id;
    showOverlay('station');
    audio.play('open');
    if (id === FINALE) return renderFinale($('#station-body'));
    if (progress.visited.has(id) || opts.info) renderInfo(id, null);
    else renderStory(id);
}

export function closeStation() {
    stopGame();
    hideOverlay('station');
    $('#station-body').innerHTML = '';
    $('#station .panel').classList.remove('playing');
    const id = current;
    current = null;
    emit('station:closed', id);
}

/** Inhalt neu aufbauen (z. B. nach Sprachwechsel) */
export function rerenderStation() {
    if (!current || $('#station .panel').classList.contains('playing')) return;
    openStation(current, { info: progress.visited.has(current) });
}

function gameCard(id) {
    const spec = GAMES[id];
    if (!spec) return '';
    const best = progress.best(id);
    return `
        <div class="game-card">
            <div class="gc-icon">${spec.icon}</div>
            <div class="gc-txt">
                <span class="kicker">${esc(t('station.minigame'))} · ${esc(spec.time ? t('station.seconds', { n: spec.time }) : t('games.noLimit'))}</span>
                <strong>${esc(t(`games.${id}.name`))}</strong>
                ${best ? `<span class="gc-best">${esc(t('games.best', { n: best }))} · ${starRow(progress.stars(id))}</span>` : ''}
            </div>
            <button class="btn primary" data-act="play">▶ ${esc(t('games.play'))}</button>
        </div>`;
}

function renderStory(id) {
    const body = $('#station-body');
    body.innerHTML = `
        <div class="story">
            <img class="story-photo" src="${esc(data().profileImage)}" alt="">
            <div class="story-bubble"><span class="story-name">${esc(t('station.tells', { name: derived().firstName }))}</span><p class="type"></p></div>
        </div>
        ${gameCard(id)}
        <div class="skipline"><button class="linkbtn" data-act="info">${esc(t('station.skipToFacts'))}</button></div>`;
    typeText(body.querySelector('.type'), station(id).story || '');
    body.querySelector('[data-act="info"]').onclick = () => { audio.play('click'); renderInfo(id, null); };
    const play = body.querySelector('[data-act="play"]');
    if (play) { play.onclick = () => { audio.play('click'); renderGame(id); }; focusLater(play); }
}

// Schreibmaschinen-Effekt; ein Klick zeigt sofort den ganzen Text
function typeText(el, text) {
    if (reducedMotion) { el.textContent = text; el.classList.add('doneT'); return; }
    let i = 0;
    el.textContent = '';
    const tick = () => {
        if (!el.isConnected) return;
        i = Math.min(text.length, i + TIMING.TYPE_CHARS_PER_TICK);
        el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(tick, TIMING.TYPE_TICK_MS); else el.classList.add('doneT');
    };
    el.parentElement.addEventListener('click', () => { i = text.length; el.textContent = text; el.classList.add('doneT'); }, { once: true });
    tick();
}

function renderGame(id) {
    const body = $('#station-body'), panel = $('#station .panel');
    panel.classList.add('playing');
    body.innerHTML = `
        <div class="mg-stage"></div>
        <div class="mg-foot"><button class="linkbtn" data-act="skip">${esc(t('station.skipGame'))}</button></div>`;
    body.querySelector('[data-act="skip"]').onclick = () => { stopGame(); renderInfo(id, null); };
    panel.scrollTop = 0;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    let finished = false;
    cleanupGame = mountGame(GAMES[id], body.querySelector('.mg-stage'), (result) => {
        if (finished) return;
        finished = true;
        stopGame();
        renderInfo(id, result);
    }, (name) => audio.play(name), { data: data(), derived: derived() });
}

function renderInfo(id, result) {
    const st = station(id), firstTime = !progress.visited.has(id);
    progress.markVisited(id);
    const panel = $('#station .panel');
    panel.classList.remove('playing');
    $$('#station-steps i').forEach((el, i) => { if (progress.chapters[i] === id) el.className = 'cur'; });
    const nextId = progress.nextId(), next = nextId && World.stations.find(s => s.id === nextId);
    const nextTitle = next && (station(nextId).title || next.title);
    const stars = result ? result.stars : 0;
    const badge = (firstTime || result) ? `
        <div class="achv ${firstTime ? 'new' : ''}">
            <span class="b-icon">${icon(BADGE_ICONS[id])}</span>
            <div>
                <small>${esc(firstTime ? t('station.unlocked') : t('station.result'))}${result ? `<span class="a-stars">${starRow(stars)}</span>` : ''}</small>
                <strong>${esc(st.badge || '')}</strong>
                ${result ? `<p>${esc(t('station.points', { n: result.score }))}${result.isBest ? ' · ' + esc(t('station.newBest')) : ''}</p>` : ''}
            </div>
        </div>` : '';
    const body = $('#station-body');
    body.innerHTML = `
        ${badge}
        <div class="info">${(CONTENT[id] || (() => ''))(result)}</div>
        <footer class="panel-foot">
            ${GAMES[id] ? `<button class="btn ghost small" data-act="replay">${icon('play')} ${esc(result ? t('station.playAgain') : t('station.playGame'))}</button>` : ''}
            <span class="spacer"></span>
            <button class="btn primary" data-act="next">${esc(next ? t('station.next', { title: nextTitle }) : t('station.backToWorld'))}</button>
        </footer>`;
    if (firstTime) { audio.play('badge'); World.confettiOnPlayer(60); }
    const replay = body.querySelector('[data-act="replay"]');
    if (replay) replay.onclick = () => { audio.play('click'); renderGame(id); };
    const nb = body.querySelector('[data-act="next"]');
    nb.onclick = () => {
        audio.play('click');
        closeStation();
        if (nextId) setTimeout(() => World.walkToStation(nextId), TIMING.WALK_AFTER_CLOSE_MS);
    };
    mountExtras(body, result);
    panel.scrollTop = 0;
    focusLater(nb, 60);
}

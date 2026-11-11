// HUD: Profil mit Fortschrittsring, „Nächstes Ziel“, Knöpfe oben rechts, Abzeichen unten links,
// „Betreten“-Knopf an Türen und der Steuerungshinweis.
import { $, $$, esc } from '../core/dom.js';
import { isTouch, isNarrow } from '../core/env.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { stationColors } from '../config/theme.js';
import { World } from '../world/world.js';
import { progress } from '../app/progress.js';
import { station } from '../app/content.js';

let lastBadges = null;

/** Fortschritt, Abzeichen und nächstes Ziel aktualisieren */
export function updateHud() {
    const n = progress.chapters.length, done = progress.doneCount;
    $('#hud-progress-label').textContent = done === n ? t('hud.allDone') : t('hud.progress', { done, total: n });
    $('#hud-ring').style.setProperty('--p', Math.round(done / n * 100));
    $('#hud-badges').innerHTML = progress.chapters.map(id => {
        const s = station(id), got = progress.visited.has(id), fresh = got && lastBadges && !lastBadges.includes(id);
        return `<span class="hb ${got ? 'got' : ''} ${fresh ? 'fresh' : ''}" title="${esc(s.badge || '')}${got ? '' : ' ' + esc(t('hud.badgeOpen'))}">${esc(s.badgeIcon || '⭐')}</span>`;
    }).join('');
    lastBadges = progress.chapters.filter(id => progress.visited.has(id));
    const next = progress.nextId(), obj = $('#objective');
    if (next && progress.started) {
        const s = World.stations.find(x => x.id === next);
        $('#objective-text').textContent = `${s.emoji} ${station(next).title || s.title}`;
        obj.style.borderLeftColor = stationColors(next)[0];
        obj.classList.remove('hidden');
    } else obj.classList.add('hidden');
}

/** Statische Beschriftungen des HUD in der aktuellen Sprache */
export function translateHud() {
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); });
    $$('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$('[data-ic]').forEach(el => { el.innerHTML = icon(el.dataset.ic); });
    syncAudioButtons();
}

export function syncAudioButtons() {
    const snd = $('#btn-sound'), mus = $('#btn-music');
    snd.innerHTML = icon(audio.state.sfx ? 'volume' : 'mute');
    snd.classList.toggle('off', !audio.state.sfx);
    mus.classList.toggle('off', !audio.state.music);
}

/** Steuerungshinweis unten beim Spielstart */
export function showControlsHint() {
    const hint = $('#controls-hint');
    hint.innerHTML = isTouch ? esc(t('hud.hintTouch')) : t('hud.hintKeys');
    hint.classList.remove('hidden');
}
export const hideControlsHint = () => $('#controls-hint').classList.add('hidden');

// „Betreten“-Knopf: nur neu aufbauen, wenn sich etwas geändert hat
let lastAction = '';
export function updateActionButton() {
    const btn = $('#action-btn'), s = World.nearStation;
    const show = progress.started && !World.paused && s;
    btn.classList.toggle('hidden', !show);
    if (!show) { lastAction = ''; return; }
    hideControlsHint();
    const locked = progress.isLocked(s.id);
    const missing = progress.chapters.length - progress.doneCount;
    const html = locked
        ? `🔒 <span>${esc(t('hud.lockedOpen', { n: missing }))}</span>`
        : `<span class="ab-ic">${s.emoji}</span><span><small>${esc(t('hud.enter'))}</small>${esc(station(s.id).title || s.title)}</span>${isTouch ? '' : '<kbd>E</kbd>'}`;
    if (html !== lastAction) { btn.innerHTML = html; lastAction = html; }
    btn.classList.toggle('locked', locked);
}

export const robotCorner = () => (isNarrow() ? t('robot.cornerBottom') : t('robot.cornerTopLeft'));

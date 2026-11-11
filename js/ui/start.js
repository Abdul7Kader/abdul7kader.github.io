// Startbildschirm: Spielerkarte, Begrüßung, Kennzahlen, Kapitel-Abzeichen.
import { $, esc } from '../core/dom.js';
import { clamp } from '../core/math.js';
import { t } from '../core/i18n.js';
import { isTouch, reducedMotion, param } from '../core/env.js';
import { progress } from '../app/progress.js';
import { data, derived, station } from '../app/content.js';

const MAX_STATS = 3;
const TILT = { y: 14, yMax: 10, x: 12, xMax: 9 };   // 3D-Neigung der Karte (Grad)

function greeting() {
    const who = param('name'), firm = progress.firm;
    if (who && firm) return t('start.greetNameFirm', { name: who, firm });
    if (firm) return t('start.greetFirm', { firm });
    if (who) return t('start.greetName', { name: who });
    return t('start.greet');
}

/** Inhalte (neu) einsetzen – beim Start und nach jedem Sprachwechsel */
export function renderStart() {
    const d = data(), x = derived();
    const photo = d.profileImage || '';
    ['#start-photo', '#hud-photo'].forEach(s => { if (photo) $(s).src = photo; });
    $('#start-photo').alt = t('cv.photoOf', { name: d.name || '' });
    $('#hud-name').textContent = d.name || '';
    $('#start-title').innerHTML = t('start.hello', { name: `<span class="hl">${esc(x.firstName)}</span>` });
    $('#start-role').textContent = d.title || '';
    $('#start-tagline').textContent = d.tagline || d.intro || '';
    $('#start-greeting').textContent = greeting();
    $('#pc-name').textContent = d.name || '';
    $('#pc-class').textContent = d.cardRole || '';
    $('#pc-status').textContent = d.cardStatus || d.availability || t('start.available');
    const stats = [];
    if (x.devYears) stats.push([x.devYears.value, x.devYears.label]);
    if (x.languages.length) stats.push([String(x.languages.length), t('start.languages')]);
    if (x.countries.length) stats.push([String(x.countries.length), t('start.countries')]);
    $('#start-stats').innerHTML = stats.slice(0, MAX_STATS).map(([v, l]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
    const seen = progress.doneCount;
    $('#start-chapters').innerHTML = progress.chapters.map(id => `<span class="${progress.visited.has(id) ? 'got' : ''}" title="${esc(station(id).badge || '')}">${esc(station(id).badgeIcon || '⭐')}</span>`).join('');
    $('#start-foot').textContent = seen ? t('start.footBack', { done: seen, total: progress.chapters.length }) : t('start.foot');
    $('#start-play .cta-txt b').textContent = seen ? t('start.continue') : t('start.play');
}

/** Spielerkarte folgt der Maus (3D-Neigung) */
export function setupStartCard() {
    if (isTouch || reducedMotion) return;
    const card = $('.pcard-in'), start = $('#start');
    start.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${clamp((px - 0.5) * TILT.y, -TILT.yMax, TILT.yMax)}deg`);
        card.style.setProperty('--rx', `${clamp((0.5 - py) * TILT.x, -TILT.xMax, TILT.xMax)}deg`);
        card.style.setProperty('--mx', `${clamp(px * 100, 0, 100)}%`);
        card.style.setProperty('--my', `${clamp(py * 100, 0, 100)}%`);
    });
    start.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
}

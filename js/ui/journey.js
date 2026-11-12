// Kapitelübersicht: alle Stationen mit Status und Sternen; Klick = hinlaufen.
import { $, $$, esc } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { World } from '../world/world.js';
import { GAMES } from '../games/index.js';
import { progress, MAX_STARS_PER_GAME } from '../app/progress.js';
import { station } from '../app/content.js';
import { icon } from '../core/icons.js';
import { BADGE_ICONS, stationColors } from '../config/theme.js';
import { showOverlay, hideOverlay } from './overlays.js';

const WALK_DELAY_MS = 150;
const starHtml = (n) => '★'.repeat(n) + '<span class="off">' + '★'.repeat(MAX_STARS_PER_GAME - n) + '</span>';

function status(id, next, n) {
    const game = GAMES[id];
    if (progress.isLocked(id)) return `<span class="js">🔒 ${esc(t('journey.locked'))}<small>${esc(t('journey.opensAfter', { n }))}</small></span>`;
    if (progress.visited.has(id)) return `<span class="js done">✓ ${esc(t('journey.done'))}${game ? `<span class="st">${starHtml(progress.stars(id))}</span>` : ''}</span>`;
    if (id === next) return `<span class="js next"><span class="pill">${esc(t('journey.next'))}</span></span>`;
    return `<span class="js">${esc(t('journey.open'))}${game ? `<small>${esc(game.icon)} ${esc(t(`games.${id}.name`))}</small>` : ''}</span>`;
}

export function renderJourney() {
    const next = progress.nextId(), n = progress.chapters.length;
    $('#journey-sub').textContent = t('journey.sub', { done: progress.doneCount, total: n, stars: progress.totalStars, max: n * MAX_STARS_PER_GAME });
    $('#journey-list').innerHTML = progress.order.map((id) => {
        const s = World.stations.find(x => x.id === id), meta = station(id);
        return `<li class="${id === next ? 'is-next' : ''}"><button data-id="${id}"><span class="je" style="--bc:${stationColors(id)[0]}">${icon(BADGE_ICONS[id])}</span><span class="jt"><strong>${esc(meta.title || s.title)}</strong><small>${esc(meta.era || '')}${meta.badge ? ' · ' + esc(meta.badge) : ''}</small></span>${status(id, next, n)}</button></li>`;
    }).join('');
    $$('#journey-list button').forEach(b => {
        b.onclick = () => {
            audio.play('click');
            hideOverlay('journey');
            setTimeout(() => World.walkToStation(b.dataset.id), WALK_DELAY_MS);
        };
    });
}

export function openJourney() {
    renderJourney();
    showOverlay('journey');
}

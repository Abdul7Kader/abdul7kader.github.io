// Easter Egg „Hinter den Kulissen“: erscheint, wenn alle Skill-Sterne gesammelt sind (danach auch über die Suche).
// Vorher gibt es Feuerwerk und Roboter Bit tanzt (World.celebrate).
import { $, esc, focusLater } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { World } from '../world/world.js';
import { GAMES } from '../games/index.js';
import { progress } from '../app/progress.js';
import { showOverlay, hideOverlay } from './overlays.js';

const FACTS = ['engine', 'drawn', 'noBuild', 'tests', 'rest'];
const FACT_ICONS = { engine: '🎮', drawn: '🎨', noBuild: '📦', tests: '🧪', rest: '😴' };

export const allStarsFound = () => World.tokenCount() > 0 && World.tokensGot().length >= World.tokenCount();

export function openBackstage() {
    const params = { games: Object.keys(GAMES).length, stars: World.tokenCount(), chapters: progress.chapters.length };
    $('#backstage-body').innerHTML = `
        <p class="bs-intro">${esc(t('backstage.intro'))}</p>
        <ul class="bs-facts">${FACTS.map(k => `<li><span aria-hidden="true">${FACT_ICONS[k]}</span><span>${esc(t('backstage.' + k, params))}</span></li>`).join('')}</ul>
        <p class="bs-outro">${esc(t('backstage.outro'))}</p>
        <div class="bs-foot"><button class="btn primary" data-act="bs-close">${esc(t('station.backToWorld'))}</button></div>`;
    const btn = $('#backstage-body [data-act="bs-close"]');
    btn.onclick = () => { audio.play('click'); hideOverlay('backstage'); };
    showOverlay('backstage');
    focusLater(btn, 80);
}

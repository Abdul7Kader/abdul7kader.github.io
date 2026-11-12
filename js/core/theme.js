// Farbmodus: System (Standard) → Hell → Dunkel. Die Wahl wird gemerkt.
// Das kleine Skript im <head> von index.html setzt data-theme schon vor dem ersten Zeichnen (kein Aufblitzen);
// dieses Modul übernimmt danach Umschalten, Systemwechsel und Benachrichtigung ('theme:changed').
import { store } from './store.js';
import { param } from './env.js';
import { emit } from './events.js';

export const THEME_PREFS = ['system', 'light', 'dark'];
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const fromUrl = param('theme');

let pref = THEME_PREFS.includes(fromUrl) ? fromUrl : (THEME_PREFS.includes(store.get('theme', '')) ? store.get('theme', '') : 'system');

/** Gewählte Einstellung (system/light/dark) */
export const themePref = () => pref;
/** Tatsächlich angezeigter Modus (light/dark) */
export const theme = () => (pref === 'system' ? (media && media.matches ? 'dark' : 'light') : pref);

let applied = null;
function apply() {
    const t = theme(), root = document.documentElement;
    root.dataset.theme = t;
    root.dataset.themePref = pref;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'dark' ? '#0b1020' : '#0d1530';
    if (t !== applied) { const first = applied === null; applied = t; if (!first) emit('theme:changed', t); }
    else emit('theme:pref', pref);
}

export function setThemePref(p) {
    if (!THEME_PREFS.includes(p)) return;
    pref = p;
    store.set('theme', p);
    apply();
}
export const cycleTheme = () => setThemePref(THEME_PREFS[(THEME_PREFS.indexOf(pref) + 1) % THEME_PREFS.length]);

if (media && media.addEventListener) media.addEventListener('change', () => { if (pref === 'system') apply(); });
apply();

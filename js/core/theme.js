// Farbmodus: Hell oder Dunkel. Beim ersten Besuch gilt die Systemeinstellung als Startwert (und folgt ihr, solange
// niemand umschaltet); eine eigene Wahl wird gemerkt.
// Das kleine Skript im <head> von index.html setzt data-theme schon vor dem ersten Zeichnen (kein Aufblitzen);
// dieses Modul übernimmt danach Umschalten und Benachrichtigung ('theme:changed').
import { store } from './store.js';
import { param } from './env.js';
import { emit } from './events.js';

export const THEMES = ['light', 'dark'];
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const system = () => (media && media.matches ? 'dark' : 'light');
const fromUrl = param('theme'), saved = store.get('theme', '');

/** Eigene Wahl (light/dark) oder null, solange die Systemeinstellung gilt */
let chosen = THEMES.includes(fromUrl) ? fromUrl : THEMES.includes(saved) ? saved : null;

/** Angezeigter Modus (light/dark) */
export const theme = () => chosen || system();

let applied = null;
function apply() {
    const t = theme(), root = document.documentElement;
    root.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'dark' ? '#0b1020' : '#0d1530';
    if (t !== applied) { const first = applied === null; applied = t; if (!first) emit('theme:changed', t); }
}

export function setTheme(t) {
    if (!THEMES.includes(t)) return;
    chosen = t;
    store.set('theme', t);
    apply();
}
export const toggleTheme = () => setTheme(theme() === 'dark' ? 'light' : 'dark');

if (media && media.addEventListener) media.addEventListener('change', () => { if (!chosen) apply(); });
apply();

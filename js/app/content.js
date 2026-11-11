// Inhalte des Lebenslaufs in der aktuellen Sprache, samt abgeleiteter Angaben (werden je Sprache einmal berechnet).
import { content, lang } from '../core/i18n.js';
import { derive } from '../core/derive.js';

let cache = { lang: null, data: null, derived: null };
function current() {
    const l = lang();
    if (cache.lang !== l) { const d = content(l); cache = { lang: l, data: d, derived: derive(d) }; }
    return cache;
}
/** Lebenslauf-Daten (data/resume.<sprache>.js) */
export const data = () => current().data;
/** Abgeleitete Angaben (Länder, aktuelle Position, Jahre als Entwickler …) */
export const derived = () => current().derived;
/** Angaben einer Station (Titel, Zeitraum, Abzeichen, Erzähltext) */
export const station = (id) => (data().stations || {})[id] || {};

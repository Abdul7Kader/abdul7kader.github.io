// Mehrsprachigkeit: alle Oberflächentexte kommen über t('bereich.schluessel').
// Wörterbücher: js/i18n/de.js (Grundlage) und js/i18n/en.js. Fehlt ein Text in einer Sprache, wird Deutsch genommen.
// Inhalte des Lebenslaufs kommen aus data/resume.<sprache>.js (siehe content()).
import de from '../i18n/de.js';
import en from '../i18n/en.js';
import { store } from './store.js';
import { param } from './env.js';
import { emit } from './events.js';

export const LANGS = ['de', 'en'];
const DICTS = { de, en };
const LOCALES = { de: 'de-DE', en: 'en-GB' };

function detect() {
    const p = param('lang').toLowerCase();
    if (LANGS.includes(p)) return p;
    const saved = store.get('lang', '');
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.languages || [navigator.language || 'de']).map(l => String(l).slice(0, 2).toLowerCase());
    return nav.find(l => LANGS.includes(l)) || 'de';
}

let current = detect();
document.documentElement.lang = current;

export const lang = () => current;
export const locale = () => LOCALES[current];

/** Sprache wechseln; alle Module hören auf 'lang:changed' und bauen sich neu auf. */
export function setLang(l) {
    if (!LANGS.includes(l) || l === current) return;
    current = l;
    store.set('lang', l);
    document.documentElement.lang = l;
    emit('lang:changed', l);
}

const lookup = (dict, key) => key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);
const reported = new Set();

/**
 * Text holen. Platzhalter {name} werden ersetzt; ist der Eintrag ein Objekt mit zero/one/other,
 * entscheidet params.n über die Form (keiner / Einzahl / Mehrzahl).
 */
export function t(key, params = {}) {
    let v = lookup(DICTS[current], key);
    if (v === undefined) v = lookup(DICTS.de, key);
    if (v === undefined) {
        if (!reported.has(key)) { reported.add(key); console.warn('[i18n] fehlender Text:', key); }
        return key;
    }
    if (v && typeof v === 'object' && !Array.isArray(v) && ('other' in v)) {
        v = params.n === 0 && 'zero' in v ? v.zero : params.n === 1 && 'one' in v ? v.one : v.other;
    }
    if (typeof v === 'function') return v(params);
    if (typeof v !== 'string') return v;
    return v.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
}

/** Liste aus dem Wörterbuch (z. B. Wortkarten im Spiel) */
export const tList = (key) => {
    const v = lookup(DICTS[current], key) || lookup(DICTS.de, key);
    return Array.isArray(v) ? v : [];
};

/** Datum kurz: „12. Okt.“ / „12 Oct“ */
export const shortDate = (iso) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
/** Monatsname kurz */
export const monthShort = (m) => new Date(2000, m, 1).toLocaleDateString(locale(), { month: 'short' });

/** Relative Zeitangabe: „vor 2 Tagen“ / „2 days ago“ */
export function ago(iso) {
    const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return t('time.justNow');
    if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
    const d = Math.round(s / 86400);
    if (d < 30) return rtf.format(-d, 'day');
    return rtf.format(-Math.round(d / 30), 'month');
}

// ------------------------------------------------------------------ Inhalte (Lebenslauf)
// data/resume.de.js und data/resume.en.js legen window.RESUME.de bzw. .en an.
// Fehlende englische Felder werden mit den deutschen gefüllt.
function merge(base, over) {
    if (over === undefined || over === null || over === '') return base;
    if (Array.isArray(base) || Array.isArray(over) || typeof base !== 'object' || typeof over !== 'object') return over;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
}
const cache = {};
export function content(l = current) {
    if (cache[l]) return cache[l];
    const all = window.RESUME || {};
    cache[l] = l === 'de' ? (all.de || {}) : merge(all.de || {}, all[l] || {});
    return cache[l];
}

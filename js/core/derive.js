// Abgeleitete Angaben aus den Lebenslauf-Daten – so bleibt alles automatisch aktuell.
// Funktioniert mit deutschen und englischen Inhalten.
import { t } from './i18n.js';

/** "11.2023 - Aktuell" → { start: 202311, end: null, current: true } */
export function parseRange(str) {
    const s = String(str || '');
    const m = s.match(/(\d{1,2})[./](\d{4})|\b(\d{4})\b/g) || [];
    const toNum = (x) => { const q = x.split(/[./]/); return q.length === 2 ? +q[1] * 100 + +q[0] : +q[0] * 100 + 1; };
    return { start: m[0] ? toNum(m[0]) : null, end: m[1] ? toNum(m[1]) : null, current: /aktuell|heute|now|present|current/i.test(s) };
}

// Sprachniveau → Balkenlänge in Prozent
const LEVEL_PCT = [[/mutter|native/i, 100], [/c2/i, 95], [/c1/i, 86], [/b2/i, 72], [/b1/i, 58], [/a2/i, 38], [/a1/i, 22]];
const LEVEL_PCT_DEFAULT = 60;
export function levelPct(level) {
    for (const [re, p] of LEVEL_PCT) if (re.test(level)) return p;
    return LEVEL_PCT_DEFAULT;
}

// Emoji für Kenntnisse – nur in der Suche (Strg+K), die zur verspielten Bedienung gehört
const SKILL_ICONS = {
    java: '☕', c: '🔧', 'c++': '⚙️', javascript: '🟨', css: '🎨', sql: '🗄️', html: '🌐', r: '📊', linux: '🐧', jira: '📋',
    github: '🐙', git: '🌿', itsm: '🧾', python: '🐍', typescript: '🔷', react: '⚛️', docker: '🐳', 'node.js': '🟩',
    'express.js': '🚂', sqlite: '🪶', 'microsoft sql server': '🗄️', gitlab: '🦊', windows: '🪟', 'claude code': '🤖',
    'openai codex': '🧠', 'bmc helix itsm': '🧾', itil: '📘'
};
export const skillIcon = (name) => SKILL_ICONS[String(name).toLowerCase()] || '✨';

/** Emojis aus einem Text entfernen (für Lebenslauf und PDF) */
export const noEmoji = (s) => String(s == null ? '' : s)
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();

/** Passendes Icon für ein Hobby */
export function hobbyIcon(text) {
    const s = String(text).toLowerCase();
    if (/\bki\b|\bai\b|tool|code|entwick|develop/.test(s)) return 'cpu';
    if (/fitness|kraft|gym/.test(s)) return 'dumbbell';
    if (/schwimm|swim/.test(s)) return 'waves';
    if (/paddl|sup|boot|boat/.test(s)) return 'paddle';
    if (/reise|travel/.test(s)) return 'globe';
    if (/musik|music/.test(s)) return 'music';
    return 'heart';
}

/** „seit X Jahren Entwickler“ – aus dem frühesten Entwickler-Job berechnet */
export function devYears(data, now = new Date()) {
    let first = null;
    (data.experience || []).forEach(e => {
        if (!/entwickl|software|developer/i.test(e.role || '')) return;
        const r = parseRange(e.date);
        if (r.start && (!first || r.start < first)) first = r.start;
    });
    if (!first) return null;
    const months = (now.getFullYear() * 12 + now.getMonth() + 1) - (Math.floor(first / 100) * 12 + first % 100);
    const years = Math.floor(months / 12);
    return years >= 1
        ? { value: t('start.years', { n: years }), label: t('start.devLabel'), years }
        : { value: t('start.months', { n: Math.max(1, months) }), label: t('start.devLabel'), years: 0 };
}

// Baufortschritt eines eigenen Projekts → Status-Schild
const FOUNDATION_BELOW = 10;   // unter 10 % gilt ein Projekt als „Fundament“
export function projStage(p) {
    const pct = Math.max(0, Math.min(100, +p.progress || 0));
    const cls = pct >= 100 ? 'done' : pct < FOUNDATION_BELOW ? 'base' : 'build';
    if (p.stage) return { label: p.stage, short: t(`projects.stage.${cls}`, { pct }), cls, pct };
    const label = t(`projects.stage.${cls}`, { pct });
    return { label, short: label, cls, pct };
}

const LANG_NAMES = /^(arabisch|deutsch|englisch|französisch|spanisch|türkisch|italienisch|russisch|arabic|german|english|french|spanish|turkish|italian|russian)$/i;
const LANGUAGE_COURSE = /sprach|integration|language/i;

/** Alle abgeleiteten Angaben auf einmal */
export function derive(data) {
    const d = {};
    const countries = [];
    (data.travels || []).forEach(tr => {
        String(tr.country || '').split(/,|&|\bund\b|\band\b/).map(s => s.trim()).forEach(c => {
            if (c && !/\s/.test(c) && !countries.includes(c)) countries.push(c);
        });
    });
    d.countries = countries;

    const langs = Array.isArray(data.languages) ? data.languages.slice() : [];
    const skills = [];
    (data.skills || []).forEach(s => {
        if (LANG_NAMES.test(String(s.name).trim())) { if (!langs.some(l => l.name === s.name)) langs.push(s); }
        else skills.push(s);
    });
    d.languages = langs;
    d.skills = skills;
    d.skillTokens = [];
    skills.forEach(s => String(s.level || '').split(',').map(x => x.trim()).filter(Boolean).forEach(tok => {
        if (!d.skillTokens.includes(tok)) d.skillTokens.push(tok);
    }));

    const exp = (data.experience || []).map(e => ({ ...e, range: parseRange(e.date) }));
    d.experienceDesc = exp.slice().sort((a, b) => {
        if (a.range.current !== b.range.current) return a.range.current ? -1 : 1;
        return (b.range.start || 0) - (a.range.start || 0);
    });
    d.currentRole = d.experienceDesc.find(e => e.primary) || d.experienceDesc.find(e => e.range.current) || d.experienceDesc[0] || null;
    d.founderRole = d.experienceDesc.find(e => e.founder || /gründer|founder/i.test(e.role)) || null;

    const edu = (data.education || []).map(e => ({ ...e, range: parseRange(e.date) }));
    d.educationDesc = edu.slice().sort((a, b) => (b.range.start || 0) - (a.range.start || 0));
    d.academic = d.educationDesc.filter(e => !LANGUAGE_COURSE.test(e.title + ' ' + e.detail));

    d.firstName = data.firstName || String(data.name || '').split(' ')[0];
    d.devYears = devYears(data);
    return d;
}

/** Datum „Aktuell“ in der Anzeige als „heute“ bzw. „today“ */
export const displayDate = (s) => String(s || '').replace(/Aktuell|Present|Current/i, t('time.today'));

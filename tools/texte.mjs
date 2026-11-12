// Sammelt alle sichtbaren Texte (Oberfläche: js/i18n/*.js, Inhalte: data/resume.*.js) je Sprache in docs/texte.md
// und meldet Doppelungen: gleiche Texte unter verschiedenen Schlüsseln und Wortfolgen (ab 5 Wörtern),
// die in mehreren Texten vorkommen – damit sich Startseite, Stationen, Finale und Sprüche nicht wiederholen.
//   node tools/texte.mjs            → schreibt docs/texte.md, gibt die Doppelungen aus
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const dict = async (f) => (await import('data:text/javascript,' + encodeURIComponent(read(f)))).default;
const ctx = { window: {} };
vm.runInNewContext(read('data/resume.de.js') + '\n' + read('data/resume.en.js'), ctx);
const R = ctx.window.RESUME;

// Felder, die keine Lesetexte sind
const SKIP = /(^|\.)(url|link|icon|building|profileImage|congratsImage|finaleImage|github|email|phone|linkedin|form|date|progress|primary|founder|level|tech|pdfFile)$/;
const NGRAM = 5, MIN_LEN = 14;
// Gewollt gleich: dieselbe Angabe an zwei Stellen, die nie zusammen zu sehen sind
const ALLOWED = [['cv.cardStatus', 'cv.availability'],
    // „Ihr Unternehmen“ ist das Leitmotiv des Finales: Schild, Feld im Finale, Platzhalter im Formular, Stationstitel
    ['ui.world.signs.yourCompany', 'ui.finale.firmLabel', 'ui.contact.companyPlaceholder', 'cv.stations.finale.title']];
const allowed = (keys) => ALLOWED.some(a => a.every(k => keys.includes(k)) && keys.length === a.length);
// Nur Oberfläche: gleiche Beschriftungen für dieselbe Aktion an mehreren Stellen sind gewollt (z. B. „Zurück zur Welt“),
// ebenso Varianten desselben Satzes, von denen immer nur eine erscheint (Maus/Touch).
const uiOnly = (keys) => keys.every(k => k.startsWith('ui.'));

function flatten(o, prefix, out) {
    if (typeof o === 'string') { if (o.trim() && !SKIP.test(prefix)) out.push([prefix, o]); return out; }
    if (Array.isArray(o)) { o.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out)); return out; }
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
    return out;
}
const norm = (s) => s.toLowerCase().replace(/\{\w+\}/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function duplicates(entries) {
    const exact = new Map(), grams = new Map();
    for (const [key, text] of entries) {
        const n = norm(text);
        if (n.length >= MIN_LEN) { if (!exact.has(n)) exact.set(n, []); exact.get(n).push(key); }
        const w = n.split(' ');
        const seen = new Set();
        for (let i = 0; i + NGRAM <= w.length; i++) {
            const g = w.slice(i, i + NGRAM).join(' ');
            if (seen.has(g)) continue;
            seen.add(g);
            if (!grams.has(g)) grams.set(g, new Set());
            grams.get(g).add(key);
        }
    }
    const ex = [...exact.entries()].filter(([, k]) => k.length > 1);
    // Wortfolgen nur melden, wenn sie in Texten verschiedener Bereiche stehen (nicht z. B. zwei Hälften eines Satzes)
    const ng = [...grams.entries()].filter(([, k]) => k.size > 1).map(([g, k]) => [g, [...k]]);
    return { ex, ng };
}

const md = ['# Alle sichtbaren Texte', '', 'Automatisch erzeugt mit `node tools/texte.mjs` – nicht von Hand bearbeiten.', 'Zweck: Wiederholungen zwischen Startseite, Stationen, Finale, Sprüchen und Lebenslauf finden.', ''];
let problems = 0;
for (const lang of ['de', 'en']) {
    const ui = flatten(await dict(`js/i18n/${lang}.js`), 'ui', []);
    const content = flatten(lang === 'de' ? R.de : { ...R.de, ...R.en }, 'cv', []);
    const all = ui.concat(content);
    const d = duplicates(all);
    const isProblem = ([, keys]) => !uiOnly(keys) && !allowed(keys);
    const ex = d.ex.filter(isProblem), ng = d.ng.filter(isProblem), info = d.ex.filter(e => !isProblem(e));
    problems += ex.length + ng.length;
    md.push(`## ${lang === 'de' ? 'Deutsch' : 'Englisch'} (${all.length} Texte)`, '');
    md.push('### Doppelungen', '');
    if (!ex.length && !ng.length) md.push('Keine in den Inhalten gefunden.', '');
    ex.forEach(([t, keys]) => md.push(`- Gleicher Text „${t}“: ${keys.map(k => '`' + k + '`').join(', ')}`));
    ng.forEach(([g, keys]) => md.push(`- Wortfolge „${g}“ in ${keys.map(k => '`' + k + '`').join(', ')}`));
    if (info.length) md.push('', 'Gewollt gleich (gleiche Aktion an mehreren Stellen):', '', ...info.map(([t, keys]) => `- „${t}“: ${keys.map(k => '`' + k + '`').join(', ')}`));
    md.push('', '### Liste', '', '| Schlüssel | Text |', '|---|---|');
    all.forEach(([k, t]) => md.push(`| \`${k}\` | ${t.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`));
    md.push('');
    console.log(`${lang}: ${all.length} Texte · ${ex.length} gleiche Texte · ${ng.length} doppelte Wortfolgen`);
    ex.forEach(([t, keys]) => console.log(`  = „${t}“ → ${keys.join(', ')}`));
    ng.forEach(([g, keys]) => console.log(`  ~ „${g}“ → ${keys.join(', ')}`));
}
fs.writeFileSync(path.join(ROOT, 'docs/texte.md'), md.join('\n'));
console.log(problems ? `\n${problems} Stelle(n) prüfen – Liste in docs/texte.md` : '\nKeine Doppelungen');

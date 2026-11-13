// Prüft die Mehrsprachigkeit:
// 1. de.js und en.js haben genau dieselben Schlüssel (inkl. Mehrzahl-Formen und Listen gleicher Länge).
// 2. Im englischen Modus erscheint in keiner Ansicht ein deutscher Oberflächentext.
// 3. Umschalten ohne Neuladen: offene Ansichten werden in der neuen Sprache neu aufgebaut.
//   node tests/i18n.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, startServer, isolate, sampleActivity, APP } from './lib.mjs';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); };

// ------------------------------------------------------------------ 1. Schlüssel vergleichen
const load = async (file) => (await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(ROOT, file), 'utf8')))).default;
const de = await load('js/i18n/de.js'), en = await load('js/i18n/en.js');
function shape(o, prefix = '', out = new Map()) {
    for (const [k, v] of Object.entries(o)) {
        const key = prefix + k;
        if (Array.isArray(v)) out.set(key, 'list:' + v.length);
        else if (v && typeof v === 'object') shape(v, key + '.', out);
        else out.set(key, typeof v);
    }
    return out;
}
const a = shape(de), b = shape(en);
const missingEn = [...a.keys()].filter(k => !b.has(k)), extraEn = [...b.keys()].filter(k => !a.has(k));
const differ = [...a.keys()].filter(k => b.has(k) && a.get(k) !== b.get(k));
console.log('\nWörterbücher');
check(!missingEn.length, `en.js hat alle ${a.size} Schlüssel${missingEn.length ? ' – fehlt: ' + missingEn.join(', ') : ''}`);
check(!extraEn.length, `en.js hat keine zusätzlichen Schlüssel${extraEn.length ? ': ' + extraEn.join(', ') : ''}`);
check(!differ.length, `gleiche Form (Text/Liste) je Schlüssel${differ.length ? ': ' + differ.join(', ') : ''}`);
const placeholders = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');
const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, p + k + '.', out); else out[p + k] = v; } return out; };
const fa = flat(de), fb = flat(en);
const phDiff = Object.keys(fa).filter(k => k in fb && typeof fa[k] === 'string' && placeholders(fa[k]) !== placeholders(fb[k])
    && !/^(robot\.welcome|games\.career\.result)/.test(k));
check(!phDiff.length, `gleiche Platzhalter je Text${phDiff.length ? ': ' + phDiff.join(', ') : ''}`);

// ------------------------------------------------------------------ 2. + 3. Englisch im Browser
// Typische deutsche Oberflächenwörter (Eigennamen wie „Westfalen-Kolleg“ sind erlaubt)
const GERMAN = /\b(Kapitel|Lebenslauf|Weiter|Zurück|Schließen|Spielen|Nächstes|Sterne|entdeckt|Fakten|Länder|Sprachen|Freizeit|Ehrenamt|Nachricht|bereist|Heimat|Bestwert|Punkte|Minispiel|Betreten|Suchen|gesperrt|Fertig|Fundament|Bitte|Ihr|Ihre|Sie|und|oder|mit|für|seit|heute|aktuell|Unternehmen|Kenntnisse|Berufserfahrung|Bildungsweg)\b/;
const server = await startServer();
const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'warning' && /\[i18n\]/.test(m.text())) errors.push(m.text()); });
await isolate(page, { activity: sampleActivity() });
await page.goto(`${server.url}/index.html?lang=en`, { waitUntil: 'networkidle' });
const app = (fn, ...x) => page.evaluate(`(${fn})(${APP}, ...${JSON.stringify(x)})`);
// sichtbarer Text ohne Sprachknöpfe und ohne Inhalte, die bewusst zweisprachig sind
const visibleText = (sel) => page.evaluate((s) => {
    const root = document.querySelector(s);
    if (!root) return '';
    const parts = [];
    const walk = (el) => {
        if (el.matches && (el.matches('[data-set-lang], [data-toggle-lang], [lang]:not(html)') || getComputedStyle(el).display === 'none')) return;
        for (const n of el.childNodes) {
            if (n.nodeType === 3) parts.push(n.nodeValue);
            else if (n.nodeType === 1) { walk(n); ['title', 'aria-label', 'placeholder'].forEach(a => n.getAttribute(a) && parts.push(n.getAttribute(a))); }
        }
    };
    walk(root);
    return parts.join(' ').replace(/\s+/g, ' ');
}, sel);
const germanIn = (txt) => (txt.match(new RegExp(GERMAN.source, 'g')) || []);

console.log('\nEnglisch im Browser');
check(await page.evaluate(() => document.documentElement.lang) === 'en', '<html lang="en">');
check(/Interactive CV/.test(await page.title()), `Seitentitel englisch (${await page.title()})`);
let g = germanIn(await visibleText('#start'));
check(!g.length, `Startseite ohne deutschen Text${g.length ? ': ' + g.join(', ') : ''}`);
await app(A => A.start());
await page.waitForTimeout(300);
g = germanIn(await visibleText('#hud'));
check(!g.length, `HUD ohne deutschen Text${g.length ? ': ' + g.join(', ') : ''}`);
for (const id of await app(A => A.order())) {
    await app((A, i) => A.openStation(i, { info: true }), id);
    await page.waitForTimeout(400);
    g = germanIn(await visibleText('#station'));
    check(!g.length, `Station ${id} ohne deutschen Text${g.length ? ': ' + g.join(', ') : ''}`);
    await app(A => A.closeStation());
}
await app(A => A.openStation('arrival'));
await page.evaluate(() => document.querySelector('#station [data-act=play], #station [data-act=replay]').click());
await page.waitForTimeout(200);
g = germanIn(await visibleText('#station'));
check(!g.length, `Minispiel-Startkarte ohne deutschen Text${g.length ? ': ' + g.join(', ') : ''}`);
await app(A => A.closeStation());
for (const [name, open, sel] of [['Kapitelübersicht', A => A.openJourney(), '#journey'], ['Suche', A => A.openPalette(), '#palette'], ['Kontakt', A => A.openContact(), '#contact'], ['Lebenslauf', A => A.openCv(), '#cv']]) {
    await app(open);
    await page.waitForTimeout(400);
    g = germanIn(await visibleText(sel));
    check(!g.length, `${name} ohne deutschen Text${g.length ? ': ' + g.join(', ') : ''}`);
    await app((A, s) => A.hide(s.slice(1)), sel);
}
// PDF-Dateiname
await app(A => A.openCv());
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.evaluate(() => document.querySelector('#cv-sheet [data-act=print]').click())]);
check(dl.suggestedFilename() === 'CV_Abdul_Kader_Sabouni.pdf', `PDF heißt ${dl.suggestedFilename()}`);
await app(A => A.closeCv());

// Umschalten ohne Neuladen, offener Dialog wird neu aufgebaut
await app(A => A.openStation('lab', { info: true }));
await page.waitForTimeout(200);
await app(A => A.setLang('de'));
await page.waitForTimeout(400);
const deTitle = await page.textContent('#station-title');
check(deTitle === 'Tech-Lab' && /KI-Kompetenzen/.test(await page.textContent('#station-body')), `Umschalten auf Deutsch baut den offenen Dialog neu auf (${deTitle})`);
check(await page.evaluate(() => document.documentElement.lang) === 'de', '<html lang="de"> nach dem Umschalten');
const visited = await app(A => A.state());
check(visited.visited >= 7, 'Spielstand bleibt beim Umschalten erhalten');
check(!errors.length, 'keine Fehler und keine fehlenden Texte' + (errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''));

await browser.close();
await server.close();
console.log(failures.length ? `\n${failures.length} Problem(e)` : '\nAlles in Ordnung');
process.exit(failures.length ? 1 : 0);

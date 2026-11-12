// Findet CSS-Selektoren, die in keiner Ansicht der Seite vorkommen.
// Spielt alle Ansichten durch (Start, Welt, alle Stationen mit Fakten, Minispiel-Karte, Finale, Kontakt,
// Kapitelübersicht, Suche, Lebenslauf) und merkt sich, welche Selektoren irgendwann etwas getroffen haben.
//   node tools/css-unused.mjs
// Ergebnis ist eine Liste zum Prüfen – nicht blind löschen (z. B. Zustände wie :hover, Fehler-Ansichten, Druck).
import { createRequire } from 'node:module';
import { startServer, isolate, sampleActivity, APP } from '../tests/lib.mjs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const server = await startServer();
const browser = await chromium.launch();
const seen = new Set();
let all = [];

async function collect(page) {
    const r = await page.evaluate(() => {
        const sels = [];
        for (const sheet of document.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch (e) { continue; }
            const walk = (list) => { for (const rule of list) { if (rule.selectorText) sels.push(rule.selectorText); else if (rule.cssRules) walk(rule.cssRules); } };
            walk(rules);
        }
        const used = [];
        for (const sel of sels) for (const part of sel.split(',')) {
            const p = part.trim().replace(/::?(before|after|placeholder|-webkit-[\w-]+|marker|selection)\b/g, '').replace(/:(hover|focus|focus-visible|active|disabled|checked|last-child|first-child)\b/g, '');
            try { if (document.querySelector(p || '*')) used.push(part.trim()); } catch (e) { used.push(part.trim()); }
        }
        return { all: sels.flatMap(s => s.split(',').map(x => x.trim())), used };
    });
    all = r.all;
    r.used.forEach(s => seen.add(s));
}

for (const opts of [{ viewport: { width: 1366, height: 860 } }, devices['iPhone 13']]) {
    const page = await browser.newPage(opts);
    await isolate(page, { activity: sampleActivity() });
    await page.goto(`${server.url}/index.html?lang=de`, { waitUntil: 'networkidle' });
    const app = (fn, ...a) => page.evaluate(`(${fn})(${APP}, ...${JSON.stringify(a)})`);
    await collect(page);
    await app(A => A.start()); await page.waitForTimeout(300); await collect(page);
    for (const id of await app(A => A.order())) {
        await app((A, i) => A.openStation(i), id); await page.waitForTimeout(300); await collect(page);
        const play = await page.$('#station [data-act=play]');
        if (play) { await play.click(); await page.waitForTimeout(200); await collect(page); await page.click('#station [data-act=skip]'); }
        else { const info = await page.$('#station [data-act=info]'); if (info) await info.click(); }
        await page.waitForTimeout(500); await collect(page);
        await app(A => A.closeStation());
    }
    for (const fn of [A => A.openJourney(), A => A.openPalette(), A => A.openContact(), A => A.openCv()]) {
        await app(fn); await page.waitForTimeout(400); await collect(page);
        await page.keyboard.press('Escape');
    }
    await page.close();
}
await browser.close();
await server.close();
const unused = [...new Set(all)].filter(s => !seen.has(s));
console.log(`${unused.length} von ${new Set(all).size} Selektoren nie getroffen:\n` + unused.join('\n'));

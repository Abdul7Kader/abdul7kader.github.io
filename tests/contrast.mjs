// Kontrastprüfung (WCAG 2.1 AA) für alle sichtbaren Texte – hell und dunkel.
// Text ≥ 4,5 : 1, große Schrift (≥ 24 px oder ≥ 18,67 px fett) ≥ 3 : 1.
// Geprüft wird gegen die erste deckende Hintergrundfarbe darüber. Bei Karten mit Farbverlauf (SURFACES) zählt die
// ungünstigste Verlaufsfarbe. Bunte Knöpfe/Kopfzeilen mit Verlauf (weiße, große Schrift mit Schatten), Bilder und
// die Spielwelt lassen sich so nicht berechnen und werden übersprungen.
//   node tests/contrast.mjs [--theme=light|dark]   (ohne Angabe: beide)
import { createRequire } from 'node:module';
import { startServer, isolate, sampleActivity, APP } from './lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const themes = arg('theme', '') ? [arg('theme', '')] : ['light', 'dark'];
const failures = [];

function scan() {
    const SURFACES = '.timeline > li, .role-card, .pv-card, .cert, .vol, .gh-act, .ai-item, .fact, .hobby, .game-card';
    const parse = (c) => {
        const s = c.match(/color\(srgb ([\d.e-]+) ([\d.e-]+) ([\d.e-]+)(?: \/ ([\d.]+))?\)/);   // Ergebnis von color-mix()
        if (s) return { r: +s[1] * 255, g: +s[2] * 255, b: +s[3] * 255, a: s[4] !== undefined ? +s[4] : 1 };
        const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null;
        const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    // Liefert alle möglichen Hintergrundfarben (bei Verläufen mehrere), oder null wenn nicht berechenbar
    function background(el) {
        const layers = [];
        let stops = null;
        for (let e = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.filter !== 'none' && e !== el) return null;
            if (cs.backgroundImage !== 'none') {
                // Deckender Farbverlauf (ohne Bild): seine Farben als Kandidaten; sonst nicht berechenbar
                const cols = /url\(/.test(cs.backgroundImage) ? [] : (cs.backgroundImage.match(/(rgba?|color)\([^)]+\)/g) || []).map(parse).filter(Boolean);
                if (!e.matches(SURFACES) || !cols.length || cols.some(c => c.a < 0.99) || layers.length) return null;
                stops = cols; break;
            }
            const c = parse(cs.backgroundColor);
            if (c && c.a > 0) { layers.push(c); if (c.a >= 0.99) break; }
            if (e.id === 'world') return null;
        }
        if (stops) return stops;
        if (!layers.length || layers[layers.length - 1].a < 0.99) return null;   // liegt über der Spielwelt
        return [layers.reverse().reduce((acc, l) => (acc ? blend(l, acc) : l), null)];
    }
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const done = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || done.has(el) || !n.nodeValue.trim()) continue;
        done.add(el);
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
        if (/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(n.nodeValue)) continue;   // Emojis haben eigene Farben
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || +cs.opacity < 0.5 || el.closest('[aria-hidden="true"], .hidden, svg, canvas, kbd')) continue;
        let op = 1;
        for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
        if (op < 0.5) continue;
        const fg = parse(cs.color), bgs = background(el);
        if (!fg || !bgs) continue;
        const ratio = Math.min(...bgs.map(bg => { const L1 = lum(blend(fg, bg)), L2 = lum(bg); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); }));
        const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
        // große Schrift 3 : 1; leere Bewertungssterne sind eine Grafik (ebenfalls 3 : 1)
        const need = size >= 24 || (bold && size >= 18.66) || el.matches('.off') ? 3 : 4.5;
        if (ratio < need) out.push(`${ratio.toFixed(2)} < ${need} · „${n.nodeValue.trim().slice(0, 40)}“ · ${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`);
    }
    return out;
}

const server = await startServer();
const browser = await chromium.launch();
for (const theme of themes) {
    console.log(`\nKontrast · ${theme}`);
    // System absichtlich im anderen Modus: so fallen Felder auf, die dem System statt der Seite folgen
    const page = await browser.newPage({ viewport: { width: 1366, height: 860 }, colorScheme: theme === 'dark' ? 'light' : 'dark' });
    await isolate(page, { activity: sampleActivity() });
    await page.goto(`${server.url}/index.html?lang=de&theme=${theme}`, { waitUntil: 'networkidle' });
    const app = (fn, ...a) => page.evaluate(`(${fn})(${APP}, ...${JSON.stringify(a)})`);
    const check = async (label) => {
        await page.waitForTimeout(500);
        const bad = [...new Set(await page.evaluate(scan))];
        if (bad.length) failures.push(...bad.map(b => `${theme} · ${label}: ${b}`));
        console.log(`${bad.length ? '  ✗' : '  ✓'} ${label}${bad.length ? '\n      ' + bad.slice(0, 12).join('\n      ') : ''}`);
    };
    await check('Startseite');
    await app(A => A.start());
    for (const id of await app(A => A.order())) {
        await app((A, i) => A.openStation(i, { info: true }), id);
        await check('Station ' + id);
        if (id === 'finale') {
            // Eingabefeld passt zum Seitenmodus (helle Fläche im Hellmodus, dunkle im Dunkelmodus)
            const lum = await page.evaluate(() => { const m = getComputedStyle(document.querySelector('#firm-input')).backgroundColor.match(/\d+/g).map(Number); return (m[0] * 0.299 + m[1] * 0.587 + m[2] * 0.114) / 255; });
            const fits = theme === 'dark' ? lum < 0.4 : lum > 0.85;
            if (!fits) failures.push(`${theme} · Firmenfeld im Finale passt nicht zum Modus (Helligkeit ${lum.toFixed(2)})`);
            console.log(`${fits ? '  ✓' : '  ✗'} Firmenfeld passt zum Modus`);
        }
        await app(A => A.closeStation());
    }
    // Minispiel: Startkarte und Ergebniskarte (dunkle Karte über dem Spielfeld)
    await app(A => A.openStation('career'));
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#station [data-act=play], #station [data-act=replay]').click());
    await check('Minispiel Startkarte');
    await page.evaluate(() => document.querySelector('[data-act=go]').click());
    await page.waitForTimeout(1800);
    await app(A => A.finishGame());
    await page.waitForTimeout(2200);
    await check('Minispiel Ergebniskarte');
    await app(A => A.closeStation());
    for (const [label, fn, sel] of [['Kapitelübersicht', A => A.openJourney(), 'journey'], ['Suche', A => A.openPalette(), 'palette'], ['Kontakt', A => A.openContact(), 'contact'], ['Hinter den Kulissen', A => A.openBackstage(), 'backstage'], ['Lebenslauf', A => A.openCv(), 'cv']]) {
        await app(fn); await check(label); await app((A, s) => A.hide(s), sel);
    }
    await page.close();
}
await browser.close();
await server.close();
console.log(failures.length ? `\n${failures.length} Kontrastproblem(e)` : '\nAlles in Ordnung');
process.exit(failures.length ? 1 : 0);

// Screenshots aller wichtigen Ansichten (Desktop + iPhone) für den Vorher-Nachher-Vergleich.
//   node tests/visual.mjs <ausgabe-ordner> [--lang=de|en] [--theme=light|dark]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, isolate, sampleActivity, APP } from './lib.mjs';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'shots';
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const lang = arg('lang', 'de'), theme = arg('theme', 'light');
fs.mkdirSync(outDir, { recursive: true });

const SCENES = [
    ['01-start', null],
    ['02-welt', A => A.start()],
    ['03-ankunft-story', A => A.openStation('arrival')],
    ['04-ankunft-fakten', A => { A.closeStation(); A.openStation('arrival', { info: true }); }],
    ['05-bildungsweg', A => { A.closeStation(); A.openStation('school', { info: true }); }],
    ['06-business', A => { A.closeStation(); A.openStation('career', { info: true }); }],
    ['07-techlab', A => { A.closeStation(); A.openStation('lab', { info: true }); }],
    ['08-projekte', A => { A.closeStation(); A.openStation('projects', { info: true }); }],
    ['09-freizeit', A => { A.closeStation(); A.openStation('lake', { info: true }); }],
    ['10-spiel-intro', A => { A.closeStation(); A.openStation('career'); document.querySelector('#station [data-act=play], #station [data-act=replay]').click(); }],
    ['11-kapitel', A => { A.closeStation(); A.openJourney(); }],
    ['12-suche', A => { A.hide('journey'); A.openPalette(); }],
    ['13-kontakt', A => { A.hide('palette'); A.openContact(); }],
    ['14-lebenslauf', A => { A.hide('contact'); A.openCv(); }]
];

const server = await startServer();
const browser = await pw.chromium.launch();
for (const [label, opts] of [['d', { viewport: { width: 1366, height: 860 } }], ['m', pw.devices['iPhone 13']]]) {
    const ctx = await browser.newContext({ ...opts, colorScheme: theme === 'dark' ? 'dark' : 'light', reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await isolate(page, { activity: sampleActivity() });
    await page.goto(`${server.url}/index.html?lang=${lang}`, { waitUntil: 'networkidle' });
    await page.evaluate(`(${APP}).setTheme('${theme}')`);
    for (const [name, fn] of SCENES) {
        if (fn) await page.evaluate(`(${fn})(${APP})`);
        await page.waitForTimeout(700);
        await page.screenshot({ path: path.join(outDir, `${label}-${name}.png`) });
    }
    await ctx.close();
}
await browser.close();
await server.close();
console.log('Screenshots in', outDir);

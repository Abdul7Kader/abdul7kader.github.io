// Smoke-Test: spielt die ganze Seite einmal durch und meldet jeden Fehler.
//   node tests/smoke.mjs [--browser=chromium|firefox|webkit] [--lang=de|en] [--theme=light|dark]
// Beendet sich mit Code 1, wenn etwas schiefgeht.
import { createRequire } from 'node:module';
import { startServer, isolate, sampleActivity, APP } from './lib.mjs';

const require = createRequire(import.meta.url);
const pw = require('playwright');
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const browserName = arg('browser', 'chromium'), lang = arg('lang', 'de'), theme = arg('theme', 'light');

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); };

const server = await startServer();
const browser = await pw[browserName].launch();
const VIEWPORTS = [
    ['Desktop', { viewport: { width: 1366, height: 860 } }],
    ['iPhone', { ...pw.devices['iPhone 13'], ...(browserName === 'firefox' ? { isMobile: undefined } : {}) }]
];

for (const [label, opts] of VIEWPORTS) {
    console.log(`\n${browserName} · ${label} · ${lang} · ${theme}`);
    const ctx = await browser.newContext({ ...opts, acceptDownloads: true, colorScheme: theme === 'dark' ? 'dark' : 'light' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => {
        if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text());
        if (m.type() === 'warning' && /\[i18n\]/.test(m.text())) errors.push('i18n: ' + m.text());
    });
    await isolate(page, { activity: sampleActivity() });
    await page.goto(`${server.url}/index.html?lang=${lang}`, { waitUntil: 'networkidle' });
    const app = (fn, ...a) => page.evaluate(`(${fn})(${APP}, ...${JSON.stringify(a)})`);

    await app((A, th) => { A.setTheme(th); A.start(); }, theme);
    await page.waitForTimeout(300);
    const order = await app(A => A.order());
    check(order.length === 7, `7 Stationen inkl. Finale (${order.join(', ')})`);

    for (const id of order.slice(0, -1)) {
        await app((A, i) => A.openStation(i), id);
        await page.waitForTimeout(120);
        const hasGame = await page.evaluate(() => !!document.querySelector('#station [data-act=play]'));
        if (hasGame) {
            await page.evaluate(() => document.querySelector('#station [data-act=play]').click());
            await page.waitForTimeout(120);
            await page.evaluate(() => document.querySelector('[data-act=go]').click());
            await page.waitForTimeout(1500);
            await page.evaluate(() => document.querySelector('#station [data-act=skip]').click());
        } else {
            await page.evaluate(() => document.querySelector('#station [data-act=info]').click());
        }
        await page.waitForTimeout(300);
        const facts = await page.evaluate(() => document.querySelector('#station .info') && document.querySelector('#station .info').textContent.trim().length);
        check(facts > 50, `Station ${id}: Spiel + Fakten`);
        if (id === 'arrival') check(await page.locator('#station .wm-svg').count() === 1, 'Weltkarte vorhanden');
        if (id === 'projects') check(await page.locator('#station .pv-cnv, #station .pq-root canvas').count() >= 1, 'Projekt-Viertel vorhanden');
        if (id === 'lab') {
            check(await page.locator('#station .gh-grid').count() === 1, 'GitHub-Kacheln vorhanden');
            check(await page.locator('#station .gh-overview > div').count() === 4 && await page.locator('#station .gh-scope').count() === 1, 'GitHub-Übersicht (Commits gesamt, Monate, privat, Projekte) und Bereichs-Überschrift');
        }
        await app(A => A.closeStation());
    }
    const st = await app(A => A.state());
    check(st.all && !st.locked, 'Alle Kapitel entdeckt, Finale offen');

    await app(A => A.openStation('finale'));
    await page.waitForTimeout(300);
    await page.fill('#firm-input', 'Musterfirma GmbH');
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector('.firm-next [data-act=contact]').click());
    await page.waitForTimeout(250);
    check(await page.inputValue('#contact-form [name=company]') === 'Musterfirma GmbH', 'Finale → Kontakt mit Firmenname');
    await page.fill('#contact-form [name=name]', 'Erika Muster');
    await page.fill('#contact-form [name=email]', 'erika@example.com');
    await page.check('#contact-form [name=consent]');
    await page.evaluate(() => document.querySelector('#contact-form [type=submit]').click());
    await page.waitForTimeout(400);
    check(await page.evaluate(() => document.querySelector('#contact').classList.contains('hidden')) && await page.locator('#toasts .toast').count() >= 1,
        'Kontaktformular gesendet (simuliert): Formular geschlossen, Bestätigung sichtbar');
    await page.evaluate(() => document.querySelector('.firm-next [data-act=contact]').click());
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check(await page.evaluate(() => document.querySelector('#contact').classList.contains('hidden') && !document.querySelector('#station').classList.contains('hidden')), 'Esc schließt nur den Kontakt-Dialog');
    await app(A => A.closeStation());

    await app(A => A.openPalette());
    await page.fill('#pal-q', 'Java');
    await page.waitForTimeout(150);
    check(await page.locator('#pal-list .pal-item').count() > 0, 'Suche findet „Java“');
    await page.keyboard.press('Escape');

    await app(A => A.openJourney());
    await page.waitForTimeout(150);
    check(await page.locator('#journey-list li').count() === 7, 'Kapitelübersicht mit 7 Einträgen');
    await page.keyboard.press('Escape');

    // Easter Egg: Feuerwerk + Bit tanzt, danach „Hinter den Kulissen“
    await app(A => A.celebrate());
    await app(A => A.openBackstage());
    await page.waitForTimeout(150);
    check(await page.locator('#backstage:not(.hidden) .bs-facts li').count() === 5, 'Easter Egg „Hinter den Kulissen“ mit 5 Fakten');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    check(await page.evaluate(() => document.querySelector('#backstage').classList.contains('hidden')), 'Easter Egg schließt mit Esc');

    await app(A => A.openCv());
    await page.waitForTimeout(400);
    check(await page.locator('#cv-sheet .cv-page').count() === 1, 'Lebenslauf geöffnet');
    if (label === 'Desktop') {
        const dl = page.waitForEvent('download', { timeout: 60000 });
        await page.evaluate(() => document.querySelector('#cv-sheet [data-act="print"]').click());
        const d = await dl;
        check(/\.pdf$/.test(d.suggestedFilename()), `PDF heruntergeladen (${d.suggestedFilename()})`);
    }
    check(errors.length === 0, `keine JavaScript-Fehler${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await ctx.close();
}

// Admin-Seite
{
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${server.url}/admin.html`, { waitUntil: 'networkidle' });
    await page.fill('#password', 'hackable');
    await page.click('#login-btn');
    await page.waitForTimeout(300);
    check(await page.locator('.form-group').count() > 20, 'Admin: Formular aufgebaut');
    await page.click('#generate-btn');
    check(/window\.RESUME\.de = \{/.test(await page.inputValue('#output-code')), 'Admin: erzeugt data/resume.de.js');
    await page.selectOption('#lang-select', 'en');
    await page.waitForTimeout(200);
    await page.click('#generate-btn');
    const enCode = await page.inputValue('#output-code');
    check(/window\.RESUME\.en = \{/.test(enCode) && /Arrival & Travel/.test(enCode) && !/"profileImage"/.test(enCode), 'Admin: erzeugt data/resume.en.js (nur abweichende Felder)');
    check(errors.length === 0, 'Admin: keine Fehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
}

// Unterseiten: Linkseite und Datenschutz laden ohne Fehler, in beiden Sprachen
for (const [path, sel, min] of [['/links/?lang=de', '.link', 3], ['/links/?lang=en', '.link', 3], ['/datenschutz.html?lang=de', 'article[lang=de] h2', 5], ['/datenschutz.html?lang=en', 'article[lang=en] h2', 5]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(server.url + path, { waitUntil: 'networkidle' });
    const n = await page.locator(sel).count();
    check(n >= min && !errors.length, `Unterseite ${path}: ${n} Einträge${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    await page.close();
}

await browser.close();
await server.close();
console.log(failures.length ? `\n${failures.length} Fehler` : '\nAlles in Ordnung');
process.exit(failures.length ? 1 : 0);

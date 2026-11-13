// Kontaktformular gegen verschiedene Antworten von FormSubmit prüfen:
// Erfolg (JSON), Erfolg ohne JSON, ausdrücklicher Fehler (success: "false"), Serverfehler (500), Netzwerkfehler.
//   node tests/contact.mjs
import { createRequire } from 'node:module';
import { startServer, isolate, APP } from './lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); };

const CASES = [
    ['Erfolg (JSON)', (r) => r.fulfill({ contentType: 'application/json', body: '{"success":"true","message":"The form was submitted successfully."}' }), true],
    ['Erfolg ohne JSON', (r) => r.fulfill({ contentType: 'text/html', body: '<html>ok</html>' }), true],
    ['Fehler: success "false"', (r) => r.fulfill({ contentType: 'application/json', body: '{"success":"false","message":"This form needs Activation."}' }), false],
    ['Serverfehler 500', (r) => r.fulfill({ status: 500, body: '' }), false],
    ['Netzwerkfehler', (r) => r.abort(), false]
];

const server = await startServer();
const browser = await chromium.launch();
console.log('\nKontaktformular');
for (const [label, respond, success] of CASES) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await isolate(page);
    await page.route('https://formsubmit.co/**', respond);
    await page.goto(`${server.url}/index.html?lang=de`, { waitUntil: 'networkidle' });
    await page.evaluate(`(${APP}).openContact()`);
    await page.waitForTimeout(200);
    await page.fill('#contact-form [name=name]', 'Erika Muster');
    await page.fill('#contact-form [name=email]', 'erika@example.com');
    await page.check('#contact-form [name=consent]');
    await page.click('#contact-form [type=submit]');
    await page.waitForTimeout(500);
    const closed = await page.evaluate(() => document.querySelector('#contact').classList.contains('hidden'));
    const errShown = await page.evaluate(() => { const e = document.querySelector('.cf-err'); return !!e && !e.hidden; });
    const toast = await page.locator('#toasts .toast').count();
    const ok = success ? closed && toast >= 1 && !errShown : !closed && errShown;
    check(ok && !errors.length, `${label}: ${success ? 'Formular schließt, Bestätigung' : 'Formular bleibt offen, Fehlerhinweis'}${errors.length ? ' · ' + errors.join(' | ') : ''}`);
    await page.close();
}
await browser.close();
await server.close();
console.log(failures.length ? `\n${failures.length} Fehler` : '\nAlles in Ordnung');
process.exit(failures.length ? 1 : 0);

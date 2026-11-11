// Performance-Messung: Auslastung des Hauptthreads und Bildrate je Szenario.
//   node tests/perf.mjs [--dpr=2] [--secs=5] [--theme=light|dark] [--json=pfad]
// Gemessen ohne GPU (Software-Rendering) – das ist der ungünstige Fall, wie auf Rechnern ohne Grafikbeschleunigung.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { startServer, isolate, sampleActivity, APP } from './lib.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const DPR = +arg('dpr', 2), SECS = +arg('secs', 5), theme = arg('theme', 'light'), out = arg('json', '');

// Zielwerte aus docs/REFACTORING-PLAN.md – gelten für den Hauptthread (wie die Ausgangsmessung).
// „CPU gesamt“ (alle Browser-Prozesse) wird zusätzlich ausgegeben; ohne GPU enthält er das Compositing in Software.
const BUDGET = { 'Welt, Spieler steht': 15, 'Welt, Spieler läuft': 35, 'Dialog offen (Tech-Lab)': 5, 'Minispiel läuft (Prompt-Fabrik)': 35 };

const server = await startServer();
const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: DPR, colorScheme: theme === 'dark' ? 'dark' : 'light' });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
await isolate(page, { activity: sampleActivity() });
await page.goto(`${server.url}/index.html`, { waitUntil: 'networkidle' });
const app = (fn) => page.evaluate(`(${fn})(${APP})`);
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
const fps = () => page.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t < 1000) requestAnimationFrame(f); else r(n); })(); }));
// tatsächlich gezeichnete Bilder der Welt (falls die Seite einen Zähler anbietet)
const frames = () => page.evaluate(() => (window.cvApp && window.cvApp.frameCount) ? window.cvApp.frameCount() : null);

// Gesamte CPU-Zeit aller Browser-Prozesse (Hauptthread, Compositor, GPU-/Raster-Prozess …) aus /proc – nur unter Linux.
// Das entspricht dem, was der Task-Manager zeigt (100 % = ein voller Kern).
const browserPids = () => fs.readdirSync('/proc').filter(p => /^\d+$/.test(p)).filter(p => {
    try { return /chrom|headless_shell/.test(fs.readFileSync(`/proc/${p}/comm`, 'utf8')); } catch (e) { return false; }
});
const cpuTicks = () => browserPids().reduce((sum, p) => {
    try { const f = fs.readFileSync(`/proc/${p}/stat`, 'utf8').split(') ')[1].split(' '); return sum + +f[11] + +f[12]; } catch (e) { return sum; }
}, 0);
const HAS_PROC = fs.existsSync('/proc/self/stat');
const TICKS_PER_SEC = 100;

const results = [];
async function measure(label, setup) {
    if (setup) await app(setup);
    await page.waitForTimeout(900);
    const f0 = await frames();
    const a = await metrics(), t0 = Date.now(), k0 = HAS_PROC ? cpuTicks() : 0;
    await page.waitForTimeout(SECS * 1000);
    const b = await metrics(), dt = (Date.now() - t0) / 1000, k1 = HAS_PROC ? cpuTicks() : 0;
    const f1 = await frames();
    const total = HAS_PROC ? Math.round((k1 - k0) / TICKS_PER_SEC / dt * 100) : null;
    const main = Math.round((b.TaskDuration - a.TaskDuration) / dt * 100);
    const cpu = total != null ? total : main;
    const script = Math.round((b.ScriptDuration - a.ScriptDuration) / dt * 100);
    const drawn = f0 != null && f1 != null ? Math.round((f1 - f0) / dt) : null;
    const rafFps = await fps();
    const budget = BUDGET[label];
    results.push({ label, cpu, main, script, rafFps, drawn, budget, ok: budget == null || main <= budget });
    console.log(`${label.padEnd(34)} CPU gesamt ${String(cpu).padStart(3)} % | Hauptthread ${String(main).padStart(3)} % | Script ${String(script).padStart(3)} % | rAF ${String(rafFps).padStart(3)} fps${drawn != null ? ` | Welt ${drawn}/s` : ''}${budget != null ? `  (Ziel Hauptthread ≤ ${budget} %${main <= budget ? ' ✓' : ' ✗'})` : ''}`);
}

await page.evaluate(`(${APP}).setTheme('${theme}')`);
await measure('Startbildschirm');
await measure('Welt, Spieler steht', A => A.start());
await measure('Welt, Spieler läuft', A => A.walkTo('lake'));
await measure('Dialog offen (Tech-Lab)', A => A.openStation('lab', { info: true }));
await measure('Projekt-Viertel offen', A => { A.closeStation(); A.openStation('projects', { info: true }); });
await measure('Weltkarte offen', A => { A.closeStation(); A.openStation('arrival', { info: true }); });
await measure('Minispiel läuft (Prompt-Fabrik)', A => {
    A.closeStation(); A.openStation('career');
    document.querySelector('[data-act=play]').click();
    setTimeout(() => document.querySelector('[data-act=go]').click(), 100);
});
await browser.close();
await server.close();
if (out) fs.writeFileSync(out, JSON.stringify({ dpr: DPR, theme, date: new Date().toISOString(), results }, null, 2));
process.exit(results.every(r => r.ok) ? 0 : 1);

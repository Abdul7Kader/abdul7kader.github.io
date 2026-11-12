// Gemeinsame Helfer für die Entwicklungs-Tests (nicht Teil der Webseite).
// - startServer(): kleiner statischer Webserver auf einem freien Port
// - app(page): Zugriff auf die Test-Schnittstelle der Seite (window.cvApp)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8', '.ico': 'image/x-icon'
};

export function startServer(root = ROOT, port = 0) {
    const server = http.createServer((req, res) => {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (p.endsWith('/')) p += 'index.html';
        const file = path.join(root, p);
        // Ordner ohne Schrägstrich (z. B. /links) wie bei GitHub Pages weiterleiten
        if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isDirectory()) { res.writeHead(301, { Location: p + '/' }); res.end(); return; }
        if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(port, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) });
    }));
}

// Externe Dienste im Test abfangen: keine echten Anfragen an GitHub oder FormSubmit.
export async function isolate(page, { activity = null } = {}) {
    await page.route('https://api.github.com/**', r => r.fulfill({ status: 403, body: '{}' }));
    await page.route('https://raw.githubusercontent.com/**', r => r.fulfill({ status: 404, body: '' }));
    await page.route('**/github-activity.json', r => activity
        ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(activity) })
        : r.fulfill({ status: 404, body: '' }));
    await page.route('https://formsubmit.co/**', r => r.fulfill({ contentType: 'application/json', body: '{"success":"true"}' }));
}

// Erfundene Beispieldaten für die GitHub-Kacheln (deterministisch)
export function sampleActivity() {
    const days = [];
    const end = new Date('2026-11-10T12:00:00Z');
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 370; i >= 0; i--) {
        const d = new Date(end - i * 864e5);
        const r = rnd();
        days.push([d.toISOString().slice(0, 10), r < 0.45 ? 0 : Math.floor(r * r * 14)]);
    }
    return {
        login: 'Abdul7Kader', generated: new Date(Date.now() - 5 * 3600e3).toISOString(),
        total: days.reduce((a, d) => a + d[1], 0), currentStreak: 4, longestStreak: 12, best: { date: days[200][0], count: 23 }, days,
        commits: [{ repo: 'Abdul7Kader/abdul7kader.github.io', message: 'Beispiel-Commit', date: new Date(Date.now() - 2 * 3600e3).toISOString(), url: 'https://github.com/Abdul7Kader' }]
    };
}

// Einheitlicher Zugriff auf die Test-Schnittstelle der Seite.
// Die Seite stellt window.cvApp bereit (alte Fassung: window.CV) mit
// start(), openStation(id, opts), closeStation(), openCv(), openJourney(), openPalette(), openContact(), walkTo(id) usw.
export const APP = `(window.cvApp || (window.CV && {
    start: () => CV.game.start(),
    openStation: (id, o) => CV.UI.openStation(id, o),
    closeStation: () => CV.UI.closeStation(),
    openCv: (r) => CV.UI.openCv(r || 'world'),
    closeCv: () => CV.UI.closeCv(),
    openJourney: () => CV.UI.openJourney(),
    hide: (id) => CV.UI.hideOverlay(id),
    openPalette: () => CV.UI.openPalette(),
    openContact: (p) => CV.Contact.open(p),
    walkTo: (id) => CV.World.walkToStation(id),
    order: () => CV.game.order,
    state: () => ({ visited: CV.game.visited.size, all: CV.game.allVisited(), locked: CV.World.isLocked('finale') }),
    setLang: () => {}, setTheme: () => {}
}))`;

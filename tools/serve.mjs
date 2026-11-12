// Lokaler Entwicklungsserver: node tools/serve.mjs [port]  →  http://127.0.0.1:8080
// (ES-Module funktionieren nicht über file://, deshalb ein kleiner statischer Server ohne Abhängigkeiten.)
import { startServer } from '../tests/lib.mjs';

const port = Number(process.argv[2]) || 8080;
const server = await startServer(undefined, port);
console.log(`Lebenslauf läuft auf ${server.url}  (Strg+C beendet)`);

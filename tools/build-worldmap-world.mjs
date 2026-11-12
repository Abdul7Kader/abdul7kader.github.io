// Erzeugt assets/data/world.json: alle Länder der Erde (Natural Earth 1:110m über world-atlas) für die Weltansicht
// der Karte, Projektion Equal Earth (flächentreu), mit deutschen (n) und englischen (en) Namen aus i18n-iso-countries.
// Aufruf: node tools/build-worldmap-world.mjs assets/data/world.json  (Pakete: world-atlas, topojson-client, d3-geo, i18n-iso-countries)
import fs from 'fs';
import { createRequire } from 'module';
import * as topo from 'topojson-client';
import { geoEqualEarth, geoPath, geoCentroid, geoArea } from 'd3-geo';

const require = createRequire(import.meta.url);
const countries = require('i18n-iso-countries');
countries.registerLocale(require('i18n-iso-countries/langs/de.json'));
countries.registerLocale(require('i18n-iso-countries/langs/en.json'));

const W = 1000, H = 500;
const w = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json'));
const fc = topo.feature(w, w.objects.countries);
const proj = geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' });
const path = geoPath(proj).digits(1);
// Kurznamen wie im Lebenslauf (sonst offizielle Langformen)
const SHORT_DE = { NL: 'Niederlande', GB: 'Großbritannien', CZ: 'Tschechien', US: 'USA', RU: 'Russland', SY: 'Syrien', KR: 'Südkorea', KP: 'Nordkorea', CD: 'Kongo (Dem. Rep.)', CG: 'Kongo', TR: 'Türkei' };
const SHORT_EN = { NL: 'Netherlands', GB: 'United Kingdom', US: 'United States', RU: 'Russia', SY: 'Syria', KR: 'South Korea', KP: 'North Korea', CD: 'DR Congo', CG: 'Congo', TR: 'Turkey', CZ: 'Czechia', IR: 'Iran', VN: 'Vietnam', LA: 'Laos', BO: 'Bolivia', VE: 'Venezuela', TZ: 'Tanzania', MD: 'Moldova' };
const out = [];
for (const f of fc.features) {
    const d = path(f);
    if (!d) continue;
    const a2 = f.id ? countries.numericToAlpha2(f.id) : null;
    const en = (a2 && (SHORT_EN[a2] || countries.getName(a2, 'en', { select: 'alias' }))) || f.properties.name;
    const de = (a2 && (SHORT_DE[a2] || countries.getName(a2, 'de', { select: 'alias' }))) || f.properties.name;
    const c = proj(geoCentroid(f));
    out.push({ n: de, en, code: a2 || '', d, c: c ? [Math.round(c[0]), Math.round(c[1])] : null, a: Math.round(geoArea(f) * 6371 * 6371) });
}
const sphere = path({ type: 'Sphere' });
const json = JSON.stringify({ source: 'Natural Earth 1:110m (public domain) via world-atlas; Equal Earth projection. Generated – do not edit.', w: W, h: H, sphere, countries: out });
fs.writeFileSync(process.argv[2], json);
console.log(out.length, 'Länder,', (json.length / 1024).toFixed(1), 'KB');

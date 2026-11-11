// Erzeugt assets/data/worldmap.json: vereinfachte Ländergrenzen (Natural Earth 1:50m über world-atlas),
// projiziert mit Deutschland in der Mitte, als fertige SVG-Pfade mit deutschen (n) und englischen (en) Namen.
// Aufruf: node tools/build-worldmap.mjs assets/data/worldmap.json  (braucht die devDependencies aus package.json)
import fs from 'fs';
import * as topo from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoAzimuthalEqualArea, geoPath, geoCentroid, geoArea } from 'd3-geo';

const W = 1000, H = 760;
const DE = {
  'Germany': 'Deutschland', 'Syria': 'Syrien', 'Spain': 'Spanien', 'Greece': 'Griechenland', 'Italy': 'Italien',
  'Algeria': 'Algerien', 'Morocco': 'Marokko', 'Croatia': 'Kroatien', 'Denmark': 'Dänemark', 'Belgium': 'Belgien',
  'Netherlands': 'Niederlande', 'Austria': 'Österreich', 'Switzerland': 'Schweiz', 'Luxembourg': 'Luxemburg',
  'Liechtenstein': 'Liechtenstein', 'Poland': 'Polen', 'Sweden': 'Schweden', 'Czechia': 'Tschechien', 'Hungary': 'Ungarn',
  'Turkey': 'Türkei', 'Lebanon': 'Libanon', 'France': 'Frankreich', 'Portugal': 'Portugal', 'United Kingdom': 'Großbritannien',
  'Ireland': 'Irland', 'Norway': 'Norwegen', 'Finland': 'Finnland', 'Iceland': 'Island', 'Estonia': 'Estland', 'Latvia': 'Lettland',
  'Lithuania': 'Litauen', 'Belarus': 'Belarus', 'Ukraine': 'Ukraine', 'Moldova': 'Moldau', 'Romania': 'Rumänien', 'Bulgaria': 'Bulgarien',
  'Serbia': 'Serbien', 'Kosovo': 'Kosovo', 'Montenegro': 'Montenegro', 'Albania': 'Albanien', 'Macedonia': 'Nordmazedonien',
  'Bosnia and Herz.': 'Bosnien und Herzegowina', 'Slovenia': 'Slowenien', 'Slovakia': 'Slowakei', 'Russia': 'Russland',
  'Georgia': 'Georgien', 'Armenia': 'Armenien', 'Azerbaijan': 'Aserbaidschan', 'Iran': 'Iran', 'Iraq': 'Irak', 'Jordan': 'Jordanien',
  'Israel': 'Israel', 'Palestine': 'Palästina', 'Egypt': 'Ägypten', 'Libya': 'Libyen', 'Tunisia': 'Tunesien', 'Saudi Arabia': 'Saudi-Arabien',
  'Kuwait': 'Kuwait', 'Qatar': 'Katar', 'Bahrain': 'Bahrain', 'United Arab Emirates': 'Vereinigte Arabische Emirate', 'Oman': 'Oman',
  'Yemen': 'Jemen', 'Cyprus': 'Zypern', 'N. Cyprus': 'Nordzypern', 'Malta': 'Malta', 'Andorra': 'Andorra', 'Monaco': 'Monaco',
  'San Marino': 'San Marino', 'Vatican': 'Vatikanstadt', 'Kazakhstan': 'Kasachstan', 'Turkmenistan': 'Turkmenistan',
  'Uzbekistan': 'Usbekistan', 'Afghanistan': 'Afghanistan', 'Pakistan': 'Pakistan', 'Sudan': 'Sudan', 'Chad': 'Tschad', 'Niger': 'Niger',
  'Mali': 'Mali', 'Mauritania': 'Mauretanien', 'W. Sahara': 'Westsahara', 'Eritrea': 'Eritrea', 'Greenland': 'Grönland',
  'Faeroe Is.': 'Färöer', 'Åland': 'Åland', 'Jersey': 'Jersey', 'Guernsey': 'Guernsey', 'Isle of Man': 'Isle of Man',
  'S. Sudan': 'Südsudan', 'Ethiopia': 'Äthiopien', 'Djibouti': 'Dschibuti', 'Somalia': 'Somalia', 'Somaliland': 'Somaliland',
  'Kyrgyzstan': 'Kirgisistan', 'Tajikistan': 'Tadschikistan', 'India': 'Indien', 'Nigeria': 'Nigeria', 'Burkina Faso': 'Burkina Faso',
  'Senegal': 'Senegal', 'Gambia': 'Gambia', 'Guinea': 'Guinea', 'Cameroon': 'Kamerun', 'Central African Rep.': 'Zentralafrikanische Republik',
  'Benin': 'Benin', 'Ghana': 'Ghana', 'Togo': 'Togo', "Côte d'Ivoire": 'Elfenbeinküste', 'Guinea-Bissau': 'Guinea-Bissau', 'China': 'China', 'Mongolia': 'Mongolei'
};

const w = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const pre = presimplify(w);
const simp = simplify(pre, quantile(pre, 0.42));
const fc = topo.feature(simp, simp.objects.countries);
const full = topo.feature(w, w.objects.countries);

// Deutschland in der Mitte; Ausschnitt reicht von Marokko bis zum Iran und vom Nordkap bis zum Jemen.
// Mittelpunkt = Deutschland (10.4° O, 51.2° N); Maßstab so, dass Marokko, Irak, Nordkap und Nordafrika passen.
const proj = geoAzimuthalEqualArea().rotate([-10.4, -51.2]).scale(1).translate([0, 0]);
const pts = [[-13, 28], [46, 31], [25, 71.5], [10, 24], [-24, 64]];
const mx = Math.max(...pts.map(p => Math.abs(proj(p)[0]))), my = Math.max(...pts.map(p => Math.abs(proj(p)[1])));
proj.scale(Math.min((W / 2 - 12) / mx, (H / 2 - 12) / my)).translate([W / 2, H / 2]).clipExtent([[0, 0], [W, H]]);
const path = geoPath(proj).digits(1);

const EN_FULL = { 'W. Sahara': 'Western Sahara', 'Macedonia': 'North Macedonia', 'Faeroe Is.': 'Faroe Islands', 'N. Cyprus': 'Northern Cyprus', 'Bosnia and Herz.': 'Bosnia and Herzegovina', 'Vatican': 'Vatican City' };
DE['Canada'] = DE['Canada'] || 'Kanada';
const out = [];
fc.features.forEach((f, i) => {
  const d = path(f);
  if (!d) return;
  const en = f.properties.name;
  const de = DE[en] || en;
  const exact = full.features[i];
  const c = proj(geoCentroid(exact));
  const a = geoArea(exact) * 6371 * 6371; // km² (ungefähr)
  out.push({ n: de, en: EN_FULL[en] || en, d, c: c ? [Math.round(c[0]), Math.round(c[1])] : null, a: Math.round(a) });
});
// Kleinstaaten: Pfad aus der genauen Geometrie, damit sie nicht wegfallen
['Liechtenstein', 'Luxembourg', 'Malta', 'Andorra', 'Monaco', 'San Marino', 'Vatican'].forEach(en => {
  const f = full.features.find(x => x.properties.name === en);
  const o = out.find(x => x.n === (DE[en] || en));
  if (f && o) o.d = path(f) || o.d;
  else if (f) { const c = proj(geoCentroid(f)); out.push({ n: DE[en] || en, en: EN_FULL[en] || en, d: path(f), c: [Math.round(c[0]), Math.round(c[1])], a: 100 }); }
});
// Daten als JSON (assets/data/worldmap.json): n = deutscher Name, en = englischer Name (Natural Earth)
const js = JSON.stringify({ source: 'Natural Earth 1:50m (public domain) via world-atlas; equal-area projection centred on Germany. Generated – do not edit.', w: W, h: H, countries: out });
fs.writeFileSync(process.argv[2], js);
console.log(out.length, 'Länder,', (js.length / 1024).toFixed(1), 'KB');
console.log('ohne DE-Namen:', out.filter(o => !Object.values(DE).includes(o.n)).map(o => o.n).join(', '));

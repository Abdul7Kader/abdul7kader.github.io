// Länderflaggen: Emoji aus dem Ländercode – außer dort, wo das Emoji veraltet ist (Syrien → eigene SVG-Grafik).
// Ländernamen dürfen deutsch oder englisch sein (je nach Sprache der Inhalte).

const CODES = {
    SY: ['Syrien', 'Syria'], DE: ['Deutschland', 'Germany'], ES: ['Spanien', 'Spain'], GR: ['Griechenland', 'Greece'],
    IT: ['Italien', 'Italy'], DZ: ['Algerien', 'Algeria'], MA: ['Marokko', 'Morocco'], HR: ['Kroatien', 'Croatia'],
    DK: ['Dänemark', 'Denmark'], BE: ['Belgien', 'Belgium'], NL: ['Holland', 'Niederlande', 'Netherlands'],
    AT: ['Österreich', 'Austria'], CH: ['Schweiz', 'Switzerland'], LU: ['Luxemburg', 'Luxembourg'], LI: ['Liechtenstein'],
    PL: ['Polen', 'Poland'], SE: ['Schweden', 'Sweden'], CZ: ['Tschechien', 'Czechia', 'Czech Republic'], HU: ['Ungarn', 'Hungary'],
    TR: ['Türkei', 'Turkey', 'Türkiye'], LB: ['Libanon', 'Lebanon'], FR: ['Frankreich', 'France'], PT: ['Portugal'],
    GB: ['England', 'Großbritannien', 'United Kingdom'], NO: ['Norwegen', 'Norway'], FI: ['Finnland', 'Finland'],
    EG: ['Ägypten', 'Egypt'], TN: ['Tunesien', 'Tunisia'], JO: ['Jordanien', 'Jordan'], US: ['USA'], CA: ['Kanada', 'Canada'],
    IE: ['Irland', 'Ireland'], SI: ['Slowenien', 'Slovenia'], BG: ['Bulgarien', 'Bulgaria'], RO: ['Rumänien', 'Romania'],
    CY: ['Zypern', 'Cyprus'], MT: ['Malta'], AE: ['Dubai', 'Vereinigte Arabische Emirate', 'United Arab Emirates'],
    QA: ['Katar', 'Qatar'], ME: ['Montenegro']
};
const NAME_TO_CODE = new Map();
for (const [code, names] of Object.entries(CODES)) names.forEach(n => NAME_TO_CODE.set(n.toLowerCase(), code));
export const countryCode = (name) => NAME_TO_CODE.get(String(name).trim().toLowerCase()) || null;

// Windows zeigt Flaggen-Emojis nur als Buchstabenpaar – dann lieber kein Emoji.
let emojiFlagsOk = null;
function emojiFlagsSupported() {
    if (emojiFlagsOk !== null) return emojiFlagsOk;
    const SIZE = 24, COLOR_DIFF = 30;
    try {
        const c = document.createElement('canvas'); c.width = c.height = SIZE;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.font = '20px sans-serif'; x.textBaseline = 'top'; x.fillText('\u{1F1E9}\u{1F1EA}', 0, 0);
        const d = x.getImageData(0, 0, SIZE, SIZE).data;
        emojiFlagsOk = false;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > COLOR_DIFF || Math.abs(d[i + 1] - d[i + 2]) > COLOR_DIFF)) { emojiFlagsOk = true; break; }
        }
    } catch (e) { emojiFlagsOk = false; }
    return emojiFlagsOk;
}
const REGIONAL_INDICATOR_OFFSET = 0x1F1A5;

/** Flaggen-Emoji (leer, wenn das System keine Flaggen-Emojis kann) */
export function flagEmoji(country) {
    const code = countryCode(country);
    if (!emojiFlagsSupported()) return '';
    if (!code) return '📍';
    return String.fromCodePoint(...[...code].map(c => REGIONAL_INDICATOR_OFFSET + c.charCodeAt(0)));
}

// Eigene Grafiken: Syrien – grün-weiß-schwarz mit drei roten Sternen (das Emoji zeigt meist noch die alte Flagge).
const starPoints = (cx, cy, r) => Array.from({ length: 10 }, (_, i) => {
    const rad = i % 2 ? r * 0.382 : r, a = -Math.PI / 2 + i * Math.PI / 5;
    return `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
}).join(' ');
const SY_GREEN = '#007a3d', SY_RED = '#ce1126', SY_STAR_R = 62;
const FLAG_SVG = {
    SY: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"><rect width="900" height="600" fill="#000"/><rect width="900" height="400" fill="#fff"/><rect width="900" height="200" fill="${SY_GREEN}"/><g fill="${SY_RED}">${[225, 450, 675].map(x => `<polygon points="${starPoints(x, 300, SY_STAR_R)}"/>`).join('')}</g></svg>`
};

export function flagSvgUrl(country) {
    const svg = FLAG_SVG[countryCode(country)];
    return svg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) : '';
}
/** HTML: eigene Grafik, wenn vorhanden, sonst Emoji */
export function flagHtml(country, cls = 'flag-img') {
    const url = flagSvgUrl(country);
    return url ? `<img class="${cls}" src="${url}" alt="" width="20" height="14">` : flagEmoji(country);
}
/** Für Canvas: Bild-Objekt der eigenen Grafik (oder null → Emoji zeichnen) */
const images = {};
export function flagImage(country) {
    const url = flagSvgUrl(country);
    if (!url) return null;
    if (!images[country]) { const im = new Image(); im.src = url; images[country] = im; }
    return images[country];
}

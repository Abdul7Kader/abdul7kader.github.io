// Weltkarte für „Ankunft & Reisen“: Deutschland in der Mitte, bereiste Länder farbig, alle anderen blass.
// Kartendaten: assets/data/worldmap.json (lokal, kein Kartendienst), werden erst beim Öffnen geladen.
import { esc } from '../core/dom.js';
import { clamp } from '../core/math.js';
import { isTouch } from '../core/env.js';
import { t, lang } from '../core/i18n.js';
import { flagHtml } from '../core/flags.js';

const DATA_URL = 'assets/data/worldmap.json';
const HOME = 'Germany', ORIGIN = 'Syria';            // englische Namen in den Kartendaten
// Namen aus dem Lebenslauf, die anders heißen als in der Karte
const ALIAS = {
    holland: 'Netherlands', england: 'United Kingdom', dubai: 'United Arab Emirates',
    'tschechische republik': 'Czechia', 'czech republic': 'Czechia', 'türkiye': 'Turkey'
};
const LABEL = { minAreaUnvisited: 200000, microState: 6000, fontDivisor: 52, minFont: 8, minFontVisited: 8.5, maxFont: 12, maxFontVisited: 15, charWidth: 0.56, margin: 4 };
const ZOOM = { step: 1.5, max: 3.4, mobileMinWidth: 760, mobileBreakpoint: 700 };
const TIP = { offsetX: 14, offsetY: 44, width: 170 };
const DOT_RADIUS = 4.5;

let loading = null;
const loadMap = () => loading || (loading = fetch(DATA_URL).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch(e => { loading = null; throw e; }));

/** Farbton je Land, immer gleich */
function hue(name) { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

export async function mountWorldMap(root, visitedNames) {
    let M;
    try { M = await loadMap(); } catch (e) { root.remove(); return; }
    if (!root.isConnected) return;
    const label = (c) => (lang() === 'en' ? c.en : c.n);
    const lookup = new Map();
    M.countries.forEach(c => { lookup.set(c.n.toLowerCase(), c); lookup.set(c.en.toLowerCase(), c); });
    const find = (name) => { const k = String(name).trim().toLowerCase(); return lookup.get(ALIAS[k] ? ALIAS[k].toLowerCase() : k); };
    const visited = new Map();                                       // englischer Kartenname → Name im Lebenslauf
    visitedNames.forEach(n => { const c = find(n); if (c) visited.set(c.en, n); });
    const home = lookup.get(HOME.toLowerCase()), origin = lookup.get(ORIGIN.toLowerCase());

    // Beschriftungen: große Länder zuerst, keine Überlappungen
    const L = LABEL, placed = [], labels = [];
    M.countries.slice().sort((a, b) => b.a - a.a).forEach(c => {
        if (!c.c) return;
        const isV = visited.has(c.en), name = label(c);
        if (!isV && c.a < L.minAreaUnvisited) return;
        if (isV && c.a < L.microState) return;                       // Kleinstaaten bekommen einen Punkt statt Text
        const fs = clamp(Math.sqrt(c.a) / L.fontDivisor, isV ? L.minFontVisited : L.minFont, isV ? L.maxFontVisited : L.maxFont);
        const w = name.length * fs * L.charWidth, h = fs * 1.1;
        const box = [c.c[0] - w / 2, c.c[1] - h / 2, c.c[0] + w / 2, c.c[1] + h / 2];
        if (box[0] < L.margin || box[2] > M.w - L.margin || box[1] < L.margin || box[3] > M.h - L.margin) return;
        if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) return;
        placed.push(box);
        const ly = c === home ? c.c[1] + fs * 1.4 : c.c[1];          // unter dem Heimat-Punkt
        labels.push(`<text x="${c.c[0]}" y="${ly.toFixed(1)}" class="${isV ? 'v' : ''}" font-size="${fs.toFixed(1)}">${esc(name)}</text>`);
    });
    const dots = M.countries.filter(c => visited.has(c.en) && c.a < L.microState && c.c)
        .map(c => `<circle class="wm-dot" data-n="${esc(c.en)}" cx="${c.c[0]}" cy="${c.c[1]}" r="${DOT_RADIUS}" style="--h:${hue(c.n)}"/>`).join('');
    const paths = M.countries.map(c => {
        const cls = c === home ? 'wm-c v home' : visited.has(c.en) ? 'wm-c v' : 'wm-c';
        return `<path class="${cls}" data-n="${esc(c.en)}" d="${c.d}" style="--h:${hue(c.n)}"/>`;
    }).join('');
    let route = '';
    if (home && origin && home.c && origin.c) {
        // Route grob wie 2014: über die Türkei und den Balkan nach Deutschland
        const [x1, y1] = origin.c, [x2, y2] = home.c, mx = (x1 + x2) / 2 - 30, my = Math.max(y1, y2) + 10;
        route = `<path class="wm-route" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>
            <circle class="wm-pin origin" cx="${x1}" cy="${y1}" r="5"/>
            <g class="wm-home" transform="translate(${x2},${y2})"><circle class="pulse" r="9"/><circle r="6"/></g>
            <g class="wm-tag" transform="translate(${x2 - 172},${y2 - 58})"><rect width="128" height="22" rx="11"/><text x="64" y="15">${esc(t('worldmap.homeSince'))}</text></g>`;
    }
    root.innerHTML = `
        <div class="wm">
            <div class="wm-bar">
                <span class="wm-stat">${t('worldmap.stat', { n: `<b>${visitedNames.length}</b>` })}</span>
                <span class="wm-zoom"><button type="button" data-z="-1" aria-label="${esc(t('worldmap.zoomOut'))}">−</button><button type="button" data-z="0" aria-label="${esc(t('worldmap.zoomAllLabel'))}">${esc(t('worldmap.zoomAll'))}</button><button type="button" data-z="1" aria-label="${esc(t('worldmap.zoomIn'))}">+</button></span>
            </div>
            <div class="wm-scroll">
                <svg class="wm-svg" viewBox="0 0 ${M.w} ${M.h}" role="img" aria-label="${esc(t('worldmap.aria', { list: visitedNames.join(', ') }))}">
                    <rect width="${M.w}" height="${M.h}" class="wm-sea"/>
                    <g class="wm-land">${paths}</g>
                    <g class="wm-labels">${labels.join('')}</g>
                    ${route}
                    ${dots}
                </svg>
            </div>
            <div class="wm-tip" hidden></div>
            <p class="wm-hint">${esc(isTouch ? t('worldmap.hintTouch') : t('worldmap.hintMouse'))}</p>
        </div>`;
    const wrap = root.querySelector('.wm'), sc = root.querySelector('.wm-scroll'), svg = root.querySelector('svg'), tip = root.querySelector('.wm-tip');

    // Zoom: SVG breiter machen, der Container scrollt; Deutschland bleibt in der Mitte
    const baseWidth = () => Math.max(sc.clientWidth, isTouch && window.innerWidth < ZOOM.mobileBreakpoint ? ZOOM.mobileMinWidth : 0);
    let z = 1;
    const center = () => {
        if (!home || !home.c) return;
        sc.scrollLeft = home.c[0] / M.w * svg.clientWidth - sc.clientWidth / 2;
        sc.scrollTop = home.c[1] / M.h * svg.clientHeight - sc.clientHeight / 2;
    };
    const apply = () => { svg.style.width = Math.round(baseWidth() * z) + 'px'; requestAnimationFrame(center); };
    apply();
    root.querySelectorAll('[data-z]').forEach(b => {
        b.onclick = () => {
            const d = +b.dataset.z;
            z = d === 0 ? 1 : clamp(z * (d > 0 ? ZOOM.step : 1 / ZOOM.step), 1, ZOOM.max);
            apply();
        };
    });

    // Tooltip
    const show = (el, x, y) => {
        const en = el.dataset.n, c = lookup.get(en.toLowerCase()), v = visited.has(en);
        const status = c === home ? t('worldmap.homeSince') : c === origin ? t('worldmap.origin') : v ? t('worldmap.visited') : t('worldmap.notVisited');
        tip.innerHTML = `${v ? flagHtml(visited.get(en)) + ' ' : ''}<strong>${esc(label(c))}</strong><small>${esc(status)}</small>`;
        tip.className = 'wm-tip' + (v ? ' v' : '');
        tip.hidden = false;
        const r = wrap.getBoundingClientRect();
        tip.style.left = clamp(x - r.left + TIP.offsetX, 4, r.width - TIP.width) + 'px';
        tip.style.top = Math.max(4, y - r.top - TIP.offsetY) + 'px';
    };
    const clearHighlight = (keep) => svg.querySelectorAll('.hl').forEach(x => x !== keep && x.classList.remove('hl'));
    let pinned = null;
    svg.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const el = e.target.closest('.v, .wm-dot');
        clearHighlight(el);
        if (el) { el.classList.add('hl'); show(el, e.clientX, e.clientY); } else tip.hidden = true;
    });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; clearHighlight(); });
    svg.addEventListener('click', (e) => {
        const el = e.target.closest('.wm-c, .wm-dot');
        if (!el) { tip.hidden = true; return; }
        clearHighlight();
        if (pinned === el && !tip.hidden) { tip.hidden = true; pinned = null; return; }
        pinned = el; el.classList.add('hl'); show(el, e.clientX, e.clientY);
    });
    const onResize = () => { if (!root.isConnected) { window.removeEventListener('resize', onResize); return; } apply(); };
    window.addEventListener('resize', onResize);
}

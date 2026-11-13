// Weltkarte für „Ankunft & Reisen“: bereiste Länder farbig, alle anderen blass.
// Zwei Ansichten: Europa (Deutschland in der Mitte, Natural Earth 1:50m) und Welt (Equal Earth, 1:110m).
// Kartendaten liegen lokal in assets/data/ und werden erst beim Öffnen geladen. Zoom über Knöpfe,
// Strg+Mausrad bzw. Zwei-Finger-Geste auf dem Touchpad und Pinch auf dem Handy.
import { esc } from '../core/dom.js';
import { clamp } from '../core/math.js';
import { isTouch } from '../core/env.js';
import { t, lang } from '../core/i18n.js';

const VIEWS = {
    europe: { url: 'assets/data/worldmap.json', minAreaUnvisited: 200000, microState: 6000, fontDivisor: 52, tag: true },
    world: { url: 'assets/data/world.json', minAreaUnvisited: 2500000, microState: 60000, fontDivisor: 150, tag: false }
};
const HOME = 'Germany', ORIGIN = 'Syria';            // englische Namen in den Kartendaten
// Namen aus dem Lebenslauf, die anders heißen als in der Karte
const ALIAS = {
    holland: 'Netherlands', england: 'United Kingdom', dubai: 'United Arab Emirates', 'the netherlands': 'Netherlands',
    'tschechische republik': 'Czechia', 'czech republic': 'Czechia', 'türkiye': 'Turkey'
};
const LABEL = { minFont: 8, minFontVisited: 8.5, maxFont: 12, maxFontVisited: 15, charWidth: 0.56, margin: 4 };
const ZOOM = { step: 1.5, max: 4, mobileMinWidth: 760, mobileBreakpoint: 700, wheelStep: 1.12 };
const TIP = { offsetX: 14, offsetY: 44, width: 170 };
const DOT_RADIUS = 4.5;

const cache = {};
const loadMap = (view) => cache[view] || (cache[view] = fetch(VIEWS[view].url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).catch(e => { delete cache[view]; throw e; }));

/** Farbton je Land, immer gleich */
function hue(name) { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

export async function mountWorldMap(root, visitedNames) {
    let view = 'europe';
    const render = async () => {
        let M;
        try { M = await loadMap(view); } catch (e) { if (view === 'europe') root.remove(); return; }
        if (!root.isConnected) return;
        draw(root, M, view, visitedNames, (v) => { view = v; render(); });
    };
    await render();
}

function draw(root, M, view, visitedNames, switchView) {
    const V = VIEWS[view];
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
        if (!isV && c.a < V.minAreaUnvisited) return;
        if (isV && c.a < V.microState) return;                       // Kleinstaaten bekommen einen Punkt statt Text
        const fs = clamp(Math.sqrt(c.a) / V.fontDivisor, isV ? L.minFontVisited : L.minFont, isV ? L.maxFontVisited : L.maxFont);
        const w = name.length * fs * L.charWidth, h = fs * 1.1;
        const box = [c.c[0] - w / 2, c.c[1] - h / 2, c.c[0] + w / 2, c.c[1] + h / 2];
        if (box[0] < L.margin || box[2] > M.w - L.margin || box[1] < L.margin || box[3] > M.h - L.margin) return;
        if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) return;
        placed.push(box);
        const ly = c === home && V.tag ? c.c[1] + fs * 1.4 : c.c[1];   // unter dem Heimat-Punkt
        labels.push(`<text x="${c.c[0]}" y="${ly.toFixed(1)}" class="${isV ? 'v' : ''}" font-size="${fs.toFixed(1)}">${esc(name)}</text>`);
    });
    const dots = M.countries.filter(c => visited.has(c.en) && c.a < V.microState && c.c)
        .map(c => `<circle class="wm-dot" data-n="${esc(c.en)}" cx="${c.c[0]}" cy="${c.c[1]}" r="${DOT_RADIUS}" style="--h:${hue(c.n)}"/>`).join('');
    const paths = M.countries.map(c => {
        const cls = c === home ? 'wm-c v home' : visited.has(c.en) ? 'wm-c v' : 'wm-c';
        return `<path class="${cls}" data-n="${esc(c.en)}" d="${c.d}" style="--h:${hue(c.n)}"/>`;
    }).join('');
    let route = '';
    if (home && origin && home.c && origin.c) {
        // Route grob wie 2014: über die Türkei und den Balkan nach Deutschland
        const [x1, y1] = origin.c, [x2, y2] = home.c, bend = view === 'world' ? 6 : 30;
        const mx = (x1 + x2) / 2 - bend, my = Math.max(y1, y2) + bend / 3;
        const r = view === 'world' ? 0.5 : 1;
        route = `<path class="wm-route" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>
            <circle class="wm-pin origin" cx="${x1}" cy="${y1}" r="${5 * r}"/>
            <g class="wm-home" transform="translate(${x2},${y2}) scale(${r})"><circle class="pulse" r="9"/><circle r="6"/></g>
            ${V.tag ? `<g class="wm-tag" transform="translate(${x2 - 172},${y2 - 58})"><rect width="128" height="22" rx="11"/><text x="64" y="15">${esc(t('worldmap.homeSince'))}</text></g>` : ''}`;
    }
    const sea = M.sphere ? `<path class="wm-sea" d="${M.sphere}"/>` : `<rect width="${M.w}" height="${M.h}" class="wm-sea"/>`;
    root.innerHTML = `
        <div class="wm wm-${view}">
            <div class="wm-bar">
                <span class="wm-stat">${esc(t('worldmap.stat'))}</span>
                <span class="wm-views" role="group" aria-label="${esc(t('worldmap.views'))}">
                    <button type="button" data-view="europe" aria-pressed="${view === 'europe'}">${esc(t('worldmap.europe'))}</button>
                    <button type="button" data-view="world" aria-pressed="${view === 'world'}">${esc(t('worldmap.world'))}</button>
                </span>
                <span class="wm-zoom"><button type="button" data-z="-1" aria-label="${esc(t('worldmap.zoomOut'))}">−</button><button type="button" data-z="0" aria-label="${esc(t('worldmap.zoomAllLabel'))}">${esc(t('worldmap.zoomAll'))}</button><button type="button" data-z="1" aria-label="${esc(t('worldmap.zoomIn'))}">+</button></span>
            </div>
            <div class="wm-scroll">
                <svg class="wm-svg" viewBox="0 0 ${M.w} ${M.h}" role="img" aria-label="${esc(t('worldmap.aria', { list: visitedNames.join(', ') }))}">
                    ${M.sphere ? '' : sea}
                    ${M.sphere ? sea : ''}
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
    root.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => { if (b.dataset.view !== view) switchView(b.dataset.view); }; });

    // Zoom: SVG breiter machen, der Container scrollt. Europa: Deutschland bleibt in der Mitte; Welt: Mitte bleibt Mitte.
    const baseWidth = () => Math.max(sc.clientWidth, isTouch && window.innerWidth < ZOOM.mobileBreakpoint ? ZOOM.mobileMinWidth : 0);
    let z = 1;
    // Mittelpunkt: Europa → Deutschland; Welt → ganze Karte, beim Hineinzoomen aus der Gesamtansicht aber Deutschland
    const focus = (zooming) => ((view === 'europe' || zooming) && home && home.c ? home.c : [M.w / 2, M.h / 2]);
    const center = (fx, fy) => {
        sc.scrollLeft = fx / M.w * svg.clientWidth - sc.clientWidth / 2;
        sc.scrollTop = fy / M.h * svg.clientHeight - sc.clientHeight / 2;
    };
    const apply = (fx, fy) => {
        const f = fx == null ? focus() : [fx, fy];
        svg.style.width = Math.round(baseWidth() * z) + 'px';
        requestAnimationFrame(() => center(f[0], f[1]));
    };
    // aktueller Mittelpunkt in Kartenkoordinaten
    const middle = () => [(sc.scrollLeft + sc.clientWidth / 2) / svg.clientWidth * M.w, (sc.scrollTop + sc.clientHeight / 2) / svg.clientHeight * M.h];
    const zoomTo = (nz) => { const [mx, my] = z === 1 ? focus(true) : middle(); z = clamp(nz, 1, ZOOM.max); apply(mx, my); };
    apply();
    root.querySelectorAll('[data-z]').forEach(b => {
        b.onclick = () => {
            const d = +b.dataset.z;
            if (d === 0) { z = 1; apply(); } else zoomTo(z * (d > 0 ? ZOOM.step : 1 / ZOOM.step));
        };
    });
    // Strg+Mausrad / Touchpad-Geste (sendet ctrlKey); normales Scrollen bleibt für den Dialog
    sc.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        zoomTo(z * (e.deltaY < 0 ? ZOOM.wheelStep : 1 / ZOOM.wheelStep));
    }, { passive: false });
    // Pinch mit zwei Fingern
    const touches = new Map();
    let pinch = null;
    sc.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touches.set(e.pointerId, e); });
    sc.addEventListener('pointermove', (e) => {
        if (!touches.has(e.pointerId)) return;
        touches.set(e.pointerId, e);
        if (touches.size !== 2) return;
        const [a, b] = [...touches.values()], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (!pinch) { pinch = { d, z }; return; }
        zoomTo(pinch.z * d / pinch.d);
    });
    const endTouch = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
    sc.addEventListener('pointerup', endTouch);
    sc.addEventListener('pointercancel', endTouch);

    // Tooltip
    const show = (el, x, y) => {
        const en = el.dataset.n, c = lookup.get(en.toLowerCase()), v = visited.has(en);
        const status = c === home ? t('worldmap.homeSince') : c === origin ? t('worldmap.origin') : v ? t('worldmap.visited') : t('worldmap.notVisited');
        tip.innerHTML = `<strong>${esc(label(c))}</strong><small>${esc(status)}</small>`;
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
    // Größe des Ausschnitts ändert sich (Fenster, Drehen des Handys) → neu einpassen; endet mit dem Dialog
    let lastWidth = sc.clientWidth;
    const ro = new ResizeObserver(() => {
        if (!root.isConnected || !wrap.isConnected) { ro.disconnect(); return; }
        if (sc.clientWidth !== lastWidth) { lastWidth = sc.clientWidth; apply(); }
    });
    ro.observe(sc);
}

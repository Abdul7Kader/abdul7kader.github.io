// Projekt-Viertel: eine kleine, frei begehbare Stadt in der Draufsicht. Jedes eigene Projekt ist ein Gebäude im
// Bauzustand, der zum Fortschritt passt (projects[].progress): Baugrube mit Bagger, Rohbau mit Gerüst und Kran
// oder fertig mit Besuchern. Abdul läuft über die Straßen – Pfeiltasten/WASD, Ziehen (er folgt dem Finger/der Maus)
// oder Tippen (er läuft über die Straßen hin). Steht er vor einem Gebäude, erscheint unten die Projektkarte;
// Enter oder Antippen der Karte markiert das Projekt in der Liste darunter.
// Zeichnet höchstens 30 Bilder/s und nur, solange das Viertel sichtbar ist.
import { clamp, dist } from '../core/math.js';
import { rr, ellipse as ell, FONT } from '../core/canvas.js';
import { reducedMotion, isTouch } from '../core/env.js';
import { t as tr, lang } from '../core/i18n.js';
import { projStage } from '../core/derive.js';
import { theme } from '../core/theme.js';
import { WIDGET_FRAME_MS } from '../config/performance.js';
import { PLAYER_LOOK } from '../config/theme.js';
import { drawPerson } from '../world/sprites/people.js';
import { BUILDINGS, PW, PH, label, topPerson, tree, excavation, scaffold, crane, fence } from './quarter-buildings.js';

// ---------------------------------------------------------------- Aufbau (Welteinheiten)
const MAX_PROJECTS = 6, COLS = 3;
const GRASS = 40, ROAD = 56, M = GRASS + ROAD;                 // Rand: Wiese, dann Ringstraße
const W = M * 2 + COLS * PW + (COLS - 1) * ROAD;
const H = M * 2 + 2 * PH + ROAD;
const XS = [GRASS + ROAD / 2, M + PW + ROAD / 2, M + 2 * PW + ROAD * 1.5, W - GRASS - ROAD / 2];   // Straßenmitten
const YS = [GRASS + ROAD / 2, M + PH + ROAD / 2, H - GRASS - ROAD / 2];
const plotPos = (i) => ({ x: M + (i % COLS) * (PW + ROAD), y: M + Math.floor(i / COLS) * (PH + ROAD) });
const GHOST_ALPHA = 0.32;                      // Bauplan: fertiges Gebäude in Grau
const GROW = { stagger: 0.25, duration: 1.6 }; // Belohnung: Gebäude wachsen nacheinander
const FOUNDATION_BELOW = 10;                   // unter so viel Prozent: Baugrube
// Spielfigur
const WALKER = { scale: 0.62, speed: 210, radius: 9, stepRate: 0.09, hintS: 8, steerMin: 10, arrive: 4 };
// Ausschnitt und Zoom
const VIEW = { minWorld: 430, maxWorld: 760, perCss: 0.95, aspect: 0.62, minH: 260, maxH: 460, follow: 8 };
const ZOOM = { max: 2.2, step: 1.3, wheelStep: 1.1, dragPx: 6 };
const MAX_DPR = 2, CACHE_RES = 1.75;
const CARD = { h: 64, maxW: 340, pad: 10 };
// Tag und Nacht
const SCENE = {
    day: { grass: '#8cce6c', grass2: '#7fc25f', plot: '#a3d98a', sand: '#ecd29b', road: '#c9ced8', curb: '#eef1f6', mark: '#ffffff', shade: null, title: '#16213f', pill: 'rgba(255,255,255,0.82)', card: 'rgba(255,255,255,0.95)', cardText: '#16213f', muted: '#5f6880' },
    night: { grass: '#4d7d4a', grass2: '#456f42', plot: '#5c8a55', sand: '#b89d6a', road: '#5d6883', curb: '#76829e', mark: '#c9d1e6', shade: 'rgb(118,128,190)', title: '#e7ebf7', pill: 'rgba(16,24,48,0.78)', card: 'rgba(20,28,56,0.95)', cardText: '#e7ebf7', muted: '#aab4de' }
};
const FAN_COLORS = ['#2a9d8f', '#e76f51', '#3a86ff', '#f4a261'];

const typeOf = (p) => (BUILDINGS[p.building] ? p.building : 'shop');
const footOf = (p, i) => { const o = plotPos(i), f = BUILDINGS[typeOf(p)].foot; return { x: o.x + f.x, y: o.y + f.y, w: f.w, h: f.h }; };
const doorOf = (p, i) => { const f = footOf(p, i); return { x: f.x + f.w / 2, y: Math.min(plotPos(i).y + PH - 26, f.y + f.h + 26) }; };

// ---------------------------------------------------------------- Wege über die Straßen (kleiner Graph)
/** Nächster Punkt auf einer Straßenmitte */
function roadPoint(p) {
    let best = null;
    YS.forEach(y => { const q = { x: clamp(p.x, XS[0], XS[3]), y }; const d = dist(p.x, p.y, q.x, q.y); if (!best || d < best.d) best = { ...q, d }; });
    XS.forEach(x => { const q = { x, y: clamp(p.y, YS[0], YS[2]) }; const d = dist(p.x, p.y, q.x, q.y); if (!best || d < best.d) best = { ...q, d }; });
    return { x: best.x, y: best.y };
}
const onH = (n, y) => Math.abs(n.y - y) < 0.5 && n.x >= XS[0] - 0.5 && n.x <= XS[3] + 0.5;
const onV = (n, x) => Math.abs(n.x - x) < 0.5 && n.y >= YS[0] - 0.5 && n.y <= YS[2] + 0.5;
/** Kürzester Weg von a nach b über die Straßen (Liste von Punkten, ohne a) */
function route(a, b) {
    const A = roadPoint(a), B = roadPoint(b);
    const nodes = [A, B];
    XS.forEach(x => YS.forEach(y => nodes.push({ x, y })));
    const n = nodes.length, edges = nodes.map(() => []);
    const link = (members, key) => {
        members.sort((p, q) => nodes[p][key] - nodes[q][key]);
        for (let k = 1; k < members.length; k++) {
            const i = members[k - 1], j = members[k], d = Math.abs(nodes[i][key] - nodes[j][key]);
            edges[i].push([j, d]); edges[j].push([i, d]);
        }
    };
    YS.forEach(y => link(nodes.map((_, i) => i).filter(i => onH(nodes[i], y)), 'x'));
    XS.forEach(x => link(nodes.map((_, i) => i).filter(i => onV(nodes[i], x)), 'y'));
    const D = Array(n).fill(Infinity), prev = Array(n).fill(-1), done = Array(n).fill(false);
    D[0] = 0;
    for (;;) {
        let u = -1;
        for (let i = 0; i < n; i++) if (!done[i] && D[i] < Infinity && (u < 0 || D[i] < D[u])) u = i;
        if (u < 0 || u === 1) break;
        done[u] = true;
        edges[u].forEach(([v, d]) => { if (D[u] + d < D[v]) { D[v] = D[u] + d; prev[v] = u; } });
    }
    const path = [];
    for (let v = 1; v >= 0; v = prev[v]) path.unshift({ x: nodes[v].x, y: nodes[v].y });
    path.push({ x: b.x, y: b.y });
    // doppelte Punkte (Abstand < 1) entfernen
    return path.filter((p, i) => i === 0 || dist(p.x, p.y, path[i - 1].x, path[i - 1].y) > 1);
}

// ---------------------------------------------------------------- Zeichnen
// Bauplan = fertiges Grundstück in Graustufen, je Typ und Auflösung einmal erzeugt
const LUMA = [0.3, 0.59, 0.11];
const ghosts = new Map();
let ghostKey = '';
function ghost(type, R, info) {
    const key = R + ':' + lang();
    if (ghostKey !== key) { ghosts.clear(); ghostKey = key; }
    let g = ghosts.get(type);
    if (!g) {
        g = document.createElement('canvas');
        g.width = Math.ceil(PW * R); g.height = Math.ceil(PH * R);
        const gc = g.getContext('2d');
        gc.setTransform(R, 0, 0, R, 0, 0);
        BUILDINGS[type].draw(gc, 0, 0, info);
        const img = gc.getImageData(0, 0, g.width, g.height), d = img.data;
        for (let n = 0; n < d.length; n += 4) { const y = d[n] * LUMA[0] + d[n + 1] * LUMA[1] + d[n + 2] * LUMA[2]; d[n] = d[n + 1] = d[n + 2] = y; }
        gc.putImageData(img, 0, 0);
        ghosts.set(type, g);
    }
    return g;
}

function drawGround(c, S) {
    c.fillStyle = S.grass; c.fillRect(0, 0, W, H);
    c.fillStyle = S.grass2;
    for (let i = 0; i < 160; i++) c.fillRect((i * 173) % W, (i * 97) % H, 3, 3);   // Grasbüschel an festen Stellen
    c.fillStyle = S.curb; c.fillRect(GRASS - 4, GRASS - 4, W - GRASS * 2 + 8, H - GRASS * 2 + 8);
    c.fillStyle = S.road; c.fillRect(GRASS, GRASS, W - GRASS * 2, H - GRASS * 2);
    // Mittellinien
    c.strokeStyle = S.mark; c.lineWidth = 2; c.setLineDash([14, 12]);
    YS.forEach(y => { c.beginPath(); c.moveTo(XS[0], y); c.lineTo(XS[3], y); c.stroke(); });
    XS.forEach(x => { c.beginPath(); c.moveTo(x, YS[0]); c.lineTo(x, YS[2]); c.stroke(); });
    c.setLineDash([]);
    // Zebrastreifen vor jeder Kreuzung der Mittelstraße
    c.fillStyle = S.mark;
    XS.slice(1, 3).forEach(x => { for (let k = 0; k < 5; k++) c.fillRect(x - 24 + k * 10, YS[1] - ROAD / 2 + 4, 5, ROAD - 8); });
    // Bäume im Randstreifen
    for (let x = 22; x < W; x += 58) { tree(c, x, 18, 15); tree(c, x + 28, H - 18, 14); }
    for (let y = 70; y < H - 40; y += 62) { tree(c, 18, y, 14); tree(c, W - 18, y + 30, 15); }
}
/** Straßenlaternen an den Kreuzungen (Mast statisch, Licht nachts) */
const LAMPS = XS.flatMap(x => YS.map(y => ({ x: x + ROAD / 2 - 4, y: y - ROAD / 2 + 4 })));

function drawPlot(c, p, i, pct, S, info, R, t) {
    const o = plotPos(i), type = typeOf(p), B = BUILDINGS[type], f = footOf(p, i);
    c.fillStyle = B.sand ? S.sand : S.plot; rr(c, o.x, o.y, PW, PH, 10); c.fill();
    if (B.sand) { c.fillStyle = 'rgba(160,110,50,0.18)'; for (let k = 0; k < 6; k++) { ell(c, o.x + 40 + k * 48, o.y + 228 - (k % 2) * 8, 18, 4); c.fill(); } }
    if (pct >= 100) B.draw(c, o.x, o.y, info);
    else if (pct < FOUNDATION_BELOW) {
        // Bauplan als gestrichelter Umriss, Baugrube, Absperrung
        c.strokeStyle = 'rgba(37,99,235,0.7)'; c.lineWidth = 1.5; c.setLineDash([6, 4]); c.strokeRect(f.x, f.y, f.w, f.h); c.setLineDash([]);
        excavation(c, f, t);
        fence(c, f);
        if (B.site) B.site(c, o.x, o.y);
    } else {
        // Rohbau: Bauplan in Grau, darüber der gebaute Teil von vorn nach hinten, Gerüst
        c.fillStyle = '#c9ccd2'; c.fillRect(f.x, f.y, f.w, f.h);   // Bodenplatte
        c.globalAlpha = GHOST_ALPHA; c.drawImage(ghost(type, R, info), o.x, o.y, PW, PH); c.globalAlpha = 1;
        const top = f.y + f.h * (1 - pct / 100);
        c.save(); c.beginPath(); c.rect(f.x - 2, top, f.w + 4, f.y + f.h - top + 2); c.clip(); B.draw(c, o.x, o.y, info); c.restore();
        scaffold(c, f, top);
        fence(c, f);
    }
    // Namensschild am Straßenrand
    let fs = 13, name = p.title;
    c.font = `800 ${fs}px ${FONT}`;
    while (c.measureText(name).width > PW - 40 && fs > 10) { fs -= 0.5; c.font = `800 ${fs}px ${FONT}`; }
    while (c.measureText(name).width > PW - 40 && name.length > 4) name = name.slice(0, -2).trim() + '…';
    const w = c.measureText(name).width + 18;
    c.fillStyle = S.pill; rr(c, o.x + PW / 2 - w / 2, o.y + PH - 22, w, 19, 9.5); c.fill();
    label(c, name, o.x + PW / 2, o.y + PH - 12, fs, S.title);
}

/** Statische Ebene: Boden, Straßen, Bäume, Grundstücke */
function drawStatic(c, list, prog, S, info, R, t) {
    drawGround(c, S);
    LAMPS.forEach(l => { c.fillStyle = '#4b5563'; ell(c, l.x, l.y, 4, 4); c.fill(); c.fillStyle = '#e5e7eb'; ell(c, l.x, l.y, 2, 2); c.fill(); });
    list.forEach((p, i) => drawPlot(c, p, i, prog[i], S, info, R, t));
}

/** Bewegte Teile: Kräne, Bagger, Besucher, Animationen der Gebäude */
function drawDynamic(c, list, prog, t) {
    list.forEach((p, i) => {
        const o = plotPos(i), B = BUILDINGS[typeOf(p)], f = footOf(p, i), pct = prog[i];
        if (pct >= 100) {
            if (B.anim) B.anim(c, o.x, o.y, t);
            for (let k = 0; k < 3; k++) {   // Besucher schlendern durch den Hof
                const px = o.x + 30 + ((t * 16 + k * 90 + i * 37) % (PW - 60)), py = o.y + PH - 48 + Math.sin(t * 0.8 + k * 2) * 6;
                topPerson(c, px, py, FAN_COLORS[(k + i) % FAN_COLORS.length]);
            }
        } else if (pct < FOUNDATION_BELOW) excavation(c, f, t);   // Bagger bewegt sich (Baugrube wird neu gezeichnet)
        else crane(c, f.x + f.w + 2, f.y + 6, t + i * 1.7, Math.min(150, f.w * 0.75));
    });
}
const lampGlow = (() => {
    let g = null;
    return () => {
        if (g) return g;
        g = document.createElement('canvas'); g.width = g.height = 96;
        const gc = g.getContext('2d'), gr = gc.createRadialGradient(48, 48, 0, 48, 48, 48);
        gr.addColorStop(0, 'rgba(255,226,150,0.55)'); gr.addColorStop(1, 'rgba(255,226,150,0)');
        gc.fillStyle = gr; gc.fillRect(0, 0, 96, 96);
        return g;
    };
})();
function drawLights(c, list, prog, t, night) {
    if (night) LAMPS.forEach(l => c.drawImage(lampGlow(), l.x - 40, l.y - 40, 80, 80));
    list.forEach((p, i) => {
        const B = BUILDINGS[typeOf(p)], o = plotPos(i);
        if (prog[i] >= 100 && B.lights) B.lights(c, o.x, o.y, t, night);
    });
}

function drawWalker(c, w, t) {
    c.save(); c.translate(w.x, w.y); c.scale(WALKER.scale, WALKER.scale);
    drawPerson(c, 0, 0, w, t);
    c.restore();
}
/** Projektkarte unten im Bild (Bildschirm-Koordinaten); liefert das Rechteck für Klicks */
function drawCard(c, p, cssW, cssH, S) {
    const st = projStage(p), w = Math.min(CARD.maxW, cssW - CARD.pad * 2), h = CARD.h, x = CARD.pad, y = CARD.pad;   // oben: unten liegt oft die Fußleiste des Dialogs
    c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, x + 2, y + 3, w, h, 14); c.fill();
    c.fillStyle = S.card; rr(c, x, y, w, h, 14); c.fill();
    const col = st.cls === 'done' ? ['#d9f7e8', '#0f6b44', '#16a34a'] : st.cls === 'base' ? ['#eceff6', '#4b5368', '#9aa1ad'] : ['#fff1d6', '#8a4b00', '#f59e0b'];
    c.font = `800 10.5px ${FONT}`;
    const cw = c.measureText(st.label).width + 14;
    c.fillStyle = col[0]; rr(c, x + 12, y + 9, cw, 17, 8.5); c.fill();
    label(c, st.label, x + 12 + cw / 2, y + 18, 10.5, col[1]);
    let name = p.title;
    c.font = `800 14px ${FONT}`;
    while (c.measureText(name).width > w - 24 && name.length > 4) { name = name.slice(0, -2).trim() + '…'; }
    label(c, name, x + 12, y + 39, 14, S.cardText, 800, 'left');
    c.fillStyle = 'rgba(127,137,160,0.3)'; rr(c, x + 12, y + 51, w - 24, 5, 2.5); c.fill();
    c.fillStyle = col[2]; rr(c, x + 12, y + 51, Math.max(5, (w - 24) * clamp(+p.progress || 0, 0, 100) / 100), 5, 2.5); c.fill();
    const hint = tr(isTouch ? 'projects.cardHintTouch' : 'projects.cardHintKeys');
    c.font = `700 10.5px ${FONT}`;
    label(c, hint, x + w - 12, y + 18, 10.5, S.muted, 700, 'right');
    return { x, y, w, h };
}
function drawHint(c, s, alpha) {
    if (alpha <= 0) return;
    c.save(); c.globalAlpha = alpha;
    c.font = `700 12px ${FONT}`;
    const w = c.measureText(s).width + 20;
    c.fillStyle = 'rgba(11,18,40,0.66)'; rr(c, 10, 10, w, 24, 12); c.fill();
    label(c, s, 20, 22.5, 12, '#fff', 700, 'left');
    c.restore();
}

// ---------------------------------------------------------------- Einbinden
/** Viertel in wrap zeichnen; liefert { select(i) } */
export function mountQuarter(wrap, projects, opts = {}) {
    const list = (projects || []).slice(0, MAX_PROJECTS);
    const info = { t: tr };
    const cnv = document.createElement('canvas');
    cnv.className = 'pv-cnv';
    cnv.tabIndex = 0;
    cnv.setAttribute('role', 'application');
    cnv.setAttribute('aria-roledescription', tr('projects.walkRole'));
    cnv.setAttribute('aria-label', tr('projects.quarterAria', { list: list.map(p => `${p.title} (${projStage(p).label})`).join(', ') }));
    wrap.appendChild(cnv);
    const c = cnv.getContext('2d');
    const feet = list.map(footOf);

    // Größe, Zoom, Kamera
    let cssW = 0, cssH = 0, dpr = 1, zoom = 1, base = 1, lastDraw = 0, lastTs = 0;
    const scale = () => base * zoom;
    const minZoom = () => Math.min(1, Math.min(cssW / W, cssH / H) / base);
    const fit = () => {
        cssW = Math.max(260, wrap.clientWidth || 600);
        cssH = Math.round(clamp(cssW * VIEW.aspect, VIEW.minH, VIEW.maxH));
        base = cssW / clamp(cssW * VIEW.perCss, VIEW.minWorld, VIEW.maxWorld);
        zoom = clamp(zoom, minZoom(), ZOOM.max);
        dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
        cnv.style.width = cssW + 'px'; cnv.style.height = cssH + 'px';
        cnv.width = Math.round(cssW * dpr); cnv.height = Math.round(cssH * dpr);
        lastDraw = 0;
    };
    const tools = document.createElement('div');
    tools.className = 'pv-tools';
    tools.innerHTML = `<button type="button" data-pz="-1" aria-label="${tr('worldmap.zoomOut')}">−</button><button type="button" data-pz="0" aria-label="${tr('worldmap.zoomAllLabel')}">${tr('worldmap.zoomAll')}</button><button type="button" data-pz="1" aria-label="${tr('worldmap.zoomIn')}">+</button>`;
    wrap.parentElement.insertBefore(tools, wrap);
    const setZoom = (z) => { zoom = clamp(z, minZoom(), ZOOM.max); lastDraw = 0; };
    tools.querySelectorAll('[data-pz]').forEach(b => {
        b.onclick = () => { const d = +b.dataset.pz; setZoom(d === 0 ? minZoom() : zoom * (d > 0 ? ZOOM.step : 1 / ZOOM.step)); };
    });

    // Spielfigur: Start an der linken Kreuzung der Mittelstraße
    const walker = { x: XS[0], y: YS[1], dir: 'right', walk: 0, moving: false, look: PLAYER_LOOK, path: null, arrive: -1, steer: null, moved: false };
    const cam = { x: walker.x, y: walker.y };
    const keys = new Set();
    let near = -1, cardRect = null, hover = -1;

    const blocked = (x, y) => {
        const r = WALKER.radius;
        if (x < GRASS + r || x > W - GRASS - r || y < GRASS + r || y > H - GRASS - r) return true;
        return feet.some(f => x > f.x - r && x < f.x + f.w + r && y > f.y - r && y < f.y + f.h + r * 0.4);
    };
    const toWorld = (e) => {
        const r = cnv.getBoundingClientRect(), s = scale();
        return { x: viewLeft() + (e.clientX - r.left) / s, y: viewTop() + (e.clientY - r.top) / s };
    };
    const viewW = () => cssW / scale(), viewH = () => cssH / scale();
    const viewLeft = () => (viewW() >= W ? (W - viewW()) / 2 : clamp(cam.x - viewW() / 2, 0, W - viewW()));
    const viewTop = () => (viewH() >= H ? (H - viewH()) / 2 : clamp(cam.y - viewH() / 2, 0, H - viewH()));
    const buildingAt = (p) => list.findIndex((_, i) => { const o = plotPos(i); return p.x >= o.x && p.x <= o.x + PW && p.y >= o.y && p.y <= o.y + PH - 40; });

    const goTo = (target, arrive) => {
        walker.steer = null; walker.moved = true; walker.arrive = arrive;
        if (reducedMotion) { walker.x = target.x; walker.y = target.y; walker.path = null; if (arrive >= 0 && opts.onSelect) opts.onSelect(arrive); walker.arrive = -1; return; }
        walker.path = route(walker, target);
    };
    const goToBuilding = (i, show) => goTo(doorOf(list[i], i), show ? i : -1);

    // Zeiger: Tippen = hinlaufen, Ziehen = Figur folgt dem Zeiger, zwei Finger = Zoom
    const pointers = new Map();
    let press = null, pinch = null;
    cnv.addEventListener('pointerdown', (e) => {
        pointers.set(e.pointerId, e);
        if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: zoom }; press = null; walker.steer = null; return; }
        press = { x: e.clientX, y: e.clientY, drag: false };
        try { cnv.setPointerCapture(e.pointerId); } catch (err) { /* ältere Browser */ }
    });
    cnv.addEventListener('pointermove', (e) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e);
        if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; setZoom(pinch.z * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.d); return; }
        const p = toWorld(e);
        if (press) {
            if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > ZOOM.dragPx) press.drag = true;
            if (press.drag) { walker.steer = p; walker.path = null; walker.arrive = -1; walker.moved = true; }
        } else if (e.pointerType === 'mouse') {
            hover = buildingAt(p);
            cnv.style.cursor = hover >= 0 ? 'pointer' : 'default';
        }
    });
    const release = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        if (!press) return;
        const wasDrag = press.drag;
        press = null; walker.steer = null;
        if (wasDrag || e.type === 'pointercancel') return;
        const r = cnv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
        if (cardRect && near >= 0 && sx >= cardRect.x && sx <= cardRect.x + cardRect.w && sy >= cardRect.y && sy <= cardRect.y + cardRect.h) { if (opts.onSelect) opts.onSelect(near); return; }
        const p = toWorld(e), i = buildingAt(p);
        if (i >= 0) goToBuilding(i, true);
        else if (!blocked(p.x, p.y)) goTo(p, -1);
    };
    cnv.addEventListener('pointerup', release);
    cnv.addEventListener('pointercancel', release);
    cnv.addEventListener('pointerleave', () => { hover = -1; });
    cnv.addEventListener('wheel', (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        setZoom(zoom * (e.deltaY < 0 ? ZOOM.wheelStep : 1 / ZOOM.wheelStep));
    }, { passive: false });

    // Tastatur (wenn das Viertel den Fokus hat)
    const KEY = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' };
    cnv.addEventListener('keydown', (e) => {
        const k = KEY[e.key.length === 1 ? e.key.toLowerCase() : e.key];
        if (k) { keys.add(k); walker.path = null; walker.arrive = -1; walker.moved = true; e.preventDefault(); return; }
        if ((e.key === 'Enter' || e.key === ' ') && near >= 0) { if (opts.onSelect) opts.onSelect(near); e.preventDefault(); }
        if (e.key === '+' || e.key === '-') { setZoom(zoom * (e.key === '+' ? ZOOM.step : 1 / ZOOM.step)); e.preventDefault(); }
    });
    cnv.addEventListener('keyup', (e) => { const k = KEY[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (k) keys.delete(k); });
    cnv.addEventListener('blur', () => keys.clear());

    function step(dt) {
        let dx = 0, dy = 0;
        if (keys.size) { dx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0); dy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0); }
        else if (walker.steer) {
            const ex = walker.steer.x - walker.x, ey = walker.steer.y - walker.y;
            if (Math.hypot(ex, ey) > WALKER.steerMin) { dx = ex; dy = ey; }
        } else if (walker.path && walker.path.length) {
            const n = walker.path[0], ex = n.x - walker.x, ey = n.y - walker.y, d = Math.hypot(ex, ey);
            if (d <= Math.max(WALKER.arrive, WALKER.speed * dt)) {
                walker.x = n.x; walker.y = n.y; walker.path.shift();
                if (!walker.path.length) {
                    walker.path = null;
                    if (walker.arrive >= 0 && opts.onSelect) opts.onSelect(walker.arrive);
                    walker.arrive = -1;
                }
            } else { dx = ex; dy = ey; }
        }
        const len = Math.hypot(dx, dy);
        walker.moving = len > 0;
        if (walker.moving) {
            const vx = dx / len * WALKER.speed * dt, vy = dy / len * WALKER.speed * dt;
            const ox = walker.x, oy = walker.y;
            if (!blocked(walker.x + vx, walker.y)) walker.x += vx;
            if (!blocked(walker.x, walker.y + vy)) walker.y += vy;
            if (walker.x === ox && walker.y === oy) { walker.moving = false; if (walker.path) { walker.path = null; walker.arrive = -1; } }
            walker.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
            walker.walk += dt / WALKER.stepRate;
        } else if (!walker.path) walker.dir = 'down';
        const f = Math.min(1, dt * VIEW.follow);
        cam.x += (walker.x - cam.x) * f; cam.y += (walker.y - cam.y) * f;
        near = list.findIndex((_, i) => { const o = plotPos(i); return walker.x >= o.x - 6 && walker.x <= o.x + PW + 6 && walker.y >= o.y && walker.y <= o.y + PH + ROAD / 2; });
    }

    // Statische Ebene (vorgerendert, bei Theme-/Sprach-/Größenwechsel neu)
    const target = list.map(p => clamp(+p.progress || 0, 0, 100));
    const animate = opts.animate && !reducedMotion;
    const growEnd = GROW.stagger * list.length + GROW.duration;
    let cache = null, cacheKey = '';
    function staticLayer(S, R, prog, t) {
        const key = `${R}|${theme()}|${lang()}`;
        if (cache && key === cacheKey) return cache;
        cache = cache || document.createElement('canvas');
        cache.width = Math.ceil(W * R); cache.height = Math.ceil(H * R);
        const sc = cache.getContext('2d');
        sc.setTransform(R, 0, 0, R, 0, 0);
        drawStatic(sc, list, prog, S, info, R, t);
        cacheKey = key;
        return cache;
    }

    fit();
    let lastWidth = wrap.clientWidth;
    const ro = new ResizeObserver(() => { if (wrap.clientWidth !== lastWidth) { lastWidth = wrap.clientWidth; fit(); } });
    ro.observe(wrap);
    let visible = true;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
    if (io) io.observe(cnv);
    const t0 = performance.now();
    (function frame(ts) {
        if (!cnv.isConnected) { ro.disconnect(); if (io) io.disconnect(); return; }
        requestAnimationFrame(frame);
        if (!visible || document.hidden || ts - lastDraw < WIDGET_FRAME_MS) return;
        const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
        lastDraw = ts; lastTs = ts;
        const t = reducedMotion ? 0 : (ts - t0) / 1000;
        const night = theme() === 'dark', S = night ? SCENE.night : SCENE.day;
        step(dt);
        const growing = animate && t < growEnd;
        const prog = target.map((p, i) => Math.round(growing ? p * clamp((t - i * GROW.stagger) / GROW.duration, 0, 1) : p));
        const s = scale(), k = s * dpr, R = Math.min(CACHE_RES, Math.ceil(k * 4) / 4);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.fillStyle = S.grass; c.fillRect(0, 0, cssW, cssH);
        c.setTransform(k, 0, 0, k, -viewLeft() * k, -viewTop() * k);
        if (growing) drawStatic(c, list, prog, S, info, R, t);
        else c.drawImage(staticLayer(S, R, prog, t), 0, 0, W, H);
        drawDynamic(c, list, prog, t);
        if (hover >= 0) { const o = plotPos(hover); c.strokeStyle = 'rgba(255,170,60,0.9)'; c.lineWidth = 3 / s; rr(c, o.x + 2, o.y + 2, PW - 4, PH - 4, 10); c.stroke(); }
        if (S.shade) {   // Nacht: alles abdunkeln, danach Lichter und Spielfigur hell darüber
            c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.fillStyle = S.shade; c.fillRect(0, 0, cnv.width, cnv.height); c.restore();
        }
        drawLights(c, list, prog, t, night);
        drawWalker(c, walker, t);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        cardRect = near >= 0 ? drawCard(c, list[near], cssW, cssH, S) : null;
        drawHint(c, tr('projects.walkHint', { name: opts.name || '' }), walker.moved ? 0 : clamp(WALKER.hintS - t, 0, 1));
    })(t0);

    return {
        /** Projekt i aus der Liste: Abdul läuft zum Gebäude */
        select(i) { if (i >= 0 && i < list.length) goToBuilding(i, false); },
        /** nur für Tests: Position und nächstes Gebäude */
        state: () => ({ x: walker.x, y: walker.y, near, zoom, w: W, h: H })
    };
}

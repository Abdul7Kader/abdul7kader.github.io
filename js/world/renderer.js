// Zeichnet die Welt.
//
// Ablauf je Bild:
//   1. Statische Ebene: Boden + Bäume + Requisiten + Gebäude. Steht die Kamera still, liegt sie fertig in einer
//      Offscreen-Canvas und wird nur kopiert. Bewegt sich die Kamera, wird direkt gezeichnet (Bodenkacheln + Sprites).
//   2. Bewegte Dinge: Wasser, Sterne, Bewohner, Spielfigur, Roboter, Gebäude-Details (Kran, Blinklichter, Fahnen).
//      Statische Objekte, die davor stehen, werden noch einmal darüber gezeichnet (Verdeckung bleibt richtig).
//   3. Oben drauf: Partikel, Wolkenschatten, Vögel, Beschriftungen, Hinweise, Pfeil zum nächsten Ziel.
//
// Alles Unbewegliche wird einmal in kleine Bilder (Sprites) in Bildschirm-Auflösung gezeichnet und danach nur noch
// 1:1 kopiert – auf ganze Pixel gerundet, damit der Browser nicht filtern muss.
import { WORLD, LAKE, PROPS, RUNWAY, CAMERA } from '../config/layout.js';
import { WORLD_PERF as PERF } from '../config/performance.js';
import { WORLD_DAY } from '../config/theme.js';
import { clamp, TAU } from '../core/math.js';
import { isTouch, reducedMotion } from '../core/env.js';
import { rr, ellipse, signText, FONT, EMOJI_FONT } from './draw.js';
import { state } from './state.js';
import { BUILDINGS, buildingTop } from './sprites/buildings.js';
import { paintTree, treeVariant, TREE_BOX_UNIT, TREE_SIZE_STEP, buildGround } from './sprites/nature.js';
import { paintProp, drawFountain, drawPlane, PROP_BOX, PLANE_BOX, LAMP_LIGHT } from './sprites/props.js';
import { drawPerson, drawRobot, PERSON_BOX, ROBOT_BOX } from './sprites/people.js';
import { drawParticles } from './particles.js';

let canvas = null, ctx = null;
let dpr = 1, vw = 0, vh = 0, zoom = 1, RS = 1, dprCap = PERF.MAX_DPR, motion = false;
let ground = null, groundRes = 1;
let palette = WORLD_DAY;
let info = null;          // Angaben von außen: Sprache, Fortschritt, Firmenname … (siehe setInfo)

export const view = {
    get zoom() { return zoom; }, get dpr() { return dpr; }, get rs() { return RS; },
    get w() { return vw / zoom; }, get h() { return vh / zoom; }, get vw() { return vw; }, get vh() { return vh; }
};

// ------------------------------------------------------------------ Größe
export function initRenderer(cnv) {
    canvas = cnv;
    ctx = canvas.getContext('2d');
    groundRes = isTouch ? PERF.GROUND_RES_TOUCH : PERF.GROUND_RES_DESKTOP;
    ground = buildGround(groundRes, palette);
    resize();
    return ground;
}
export function resize() {
    const full = Math.min(window.devicePixelRatio || 1, dprCap);
    dpr = motion ? Math.min(full, PERF.MOTION_DPR) : full;
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    canvas.style.width = vw + 'px'; canvas.style.height = vh + 'px';
    zoom = clamp(Math.sqrt(vw * vh) / CAMERA.zoomDivisor, CAMERA.minZoom, CAMERA.maxZoom);
    RS = dpr * zoom;
    useCaches();
    staticLayer.valid = false;
}
/**
 * Während die Kamera fährt, mit geringerer Pixeldichte zeichnen (die Rasterung kostet bei 60 Bildern/s am meisten),
 * im Stand wieder voll scharf. Die Sprites beider Auflösungen bleiben erhalten – der Wechsel kostet daher fast nichts.
 * Gibt zurück, ob sich etwas geändert hat.
 */
export function setMotion(on) {
    if (on === motion) return false;
    const before = dpr;
    motion = on;
    resize();
    return dpr !== before;
}
/** Bei Überlast die Auflösung schrittweise senken; true, wenn noch Luft war */
export function lowerResolution() {
    if (dprCap <= PERF.MIN_DPR) return false;
    dprCap = Math.max(PERF.MIN_DPR, dprCap - PERF.DPR_STEP);
    resize();
    return true;
}
export function setInfo(i) { info = i; }
export function setPalette(p) { palette = p; ground = buildGround(groundRes, p); invalidate(); return ground; }

/** Nacht: Sprite einmal blau abdunkeln (nur dort, wo schon gemalt ist) */
function nightTint(c, cv) {
    if (!palette.night) return;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = palette.night.tint;
    c.fillRect(0, 0, cv.width, cv.height);
    c.restore();
}
/** Nacht: Laterne leuchtet (Lichtschein um die Lampe, nach der Abdunklung aufgemalt) */
const LAMP_GLOW_R = 26;
function lampGlow(c) {
    if (!palette.night) return;
    const g = c.createRadialGradient(LAMP_LIGHT.dx, LAMP_LIGHT.dy, 0, LAMP_LIGHT.dx, LAMP_LIGHT.dy, LAMP_GLOW_R);
    g.addColorStop(0, `rgba(${palette.night.lampGlow},0.9)`); g.addColorStop(0.35, `rgba(${palette.night.lampGlow},0.35)`); g.addColorStop(1, `rgba(${palette.night.lampGlow},0)`);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g;
    c.beginPath(); c.arc(LAMP_LIGHT.dx, LAMP_LIGHT.dy, LAMP_GLOW_R, 0, TAU); c.fill(); c.restore();
}
export const groundCanvas = () => ground;

// ------------------------------------------------------------------ Sprite-Cache
// Je Auflösung (RS) ein eigener Satz Caches; höchstens zwei Sätze (scharf und beim Fahren).
const MAX_CACHE_SETS = 2;
const cacheSets = new Map();
let sprites = new Map(), groundTiles = new Map(), buildingSprites = new Map();
function useCaches() {
    let set = cacheSets.get(RS);
    if (!set) {
        set = { sprites: new Map(), groundTiles: new Map(), buildingSprites: new Map() };
        cacheSets.set(RS, set);
        if (cacheSets.size > MAX_CACHE_SETS) cacheSets.delete(cacheSets.keys().next().value);
    }
    ({ sprites, groundTiles, buildingSprites } = set);
}
/** Sprite holen oder einmal zeichnen. Box in Welteinheiten relativ zum Bezugspunkt. */
function sprite(key, x0, y0, x1, y1, paint) {
    let sp = sprites.get(key);
    if (!sp) {
        sp = { cv: document.createElement('canvas'), x0, y0 };
        sp.cv.width = Math.max(1, Math.ceil((x1 - x0) * RS)); sp.cv.height = Math.max(1, Math.ceil((y1 - y0) * RS));
        const c = sp.cv.getContext('2d');
        c.setTransform(RS, 0, 0, RS, -x0 * RS, -y0 * RS);
        paint(c);
        if (!/^(text:|label:|star$)/.test(key)) nightTint(c, sp.cv);
        if (key.startsWith('prop:lamp')) lampGlow(c);
        sprites.set(key, sp);
    }
    return sp;
}
/** Sprite an (x, y) kopieren – auf ganze Bildschirmpixel gerundet */
function blit(c, sp, x, y) {
    c.drawImage(sp.cv, Math.round((x + sp.x0) * RS) / RS, Math.round((y + sp.y0) * RS) / RS, sp.cv.width / RS, sp.cv.height / RS);
}
/** Alles neu zeichnen lassen (Auflösung, Sprache, Farbmodus, Firmenname …) */
export function invalidate() { cacheSets.clear(); useCaches(); staticLayer.valid = false; }

// ------------------------------------------------------------------ Bodenkacheln
function groundTile(tx, ty) {
    const key = tx + ',' + ty;
    let t = groundTiles.get(key);
    if (t) { groundTiles.delete(key); groundTiles.set(key, t); return t; }   // als zuletzt benutzt markieren
    const T = PERF.GROUND_TILE, x0 = tx * T, y0 = ty * T, w = Math.min(T, WORLD.W - x0), h = Math.min(T, WORLD.H - y0);
    const px0 = Math.round(x0 * RS), py0 = Math.round(y0 * RS);
    const cv = document.createElement('canvas');
    cv.width = Math.round((x0 + w) * RS) - px0; cv.height = Math.round((y0 + h) * RS) - py0;
    const g = cv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(ground, x0 * groundRes, y0 * groundRes, w * groundRes, h * groundRes, 0, 0, cv.width, cv.height);
    t = { cv, px0, py0 };
    groundTiles.set(key, t);
    if (groundTiles.size > PERF.GROUND_TILE_MAX) groundTiles.delete(groundTiles.keys().next().value);
    return t;
}
/** Boden für den Bereich (x0, y0)–(x1, y1) zeichnen; ox/oy = Geräte-Pixel-Versatz der Zielfläche */
function drawGround(c, x0, y0, x1, y1, ox, oy) {
    const T = PERF.GROUND_TILE;
    const tx0 = Math.max(0, Math.floor(x0 / T)), ty0 = Math.max(0, Math.floor(y0 / T));
    const tx1 = Math.min(Math.ceil(WORLD.W / T) - 1, Math.floor(x1 / T)), ty1 = Math.min(Math.ceil(WORLD.H / T) - 1, Math.floor(y1 / T));
    c.save();
    c.setTransform(1, 0, 0, 1, -ox, -oy);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const t = groundTile(tx, ty); c.drawImage(t.cv, t.px0, t.py0); }
    c.restore();
}

// ------------------------------------------------------------------ Gebäude-Sprites (statischer Teil)
function buildingSprite(s) {
    const B = BUILDINGS[s.style], pad = B.pad;
    const key = `${s.id}|${info.lang}|${s.style === 'finale' ? info.firm : ''}|${B.glow ? info.activityKey : ''}`;
    let e = buildingSprites.get(s.id);
    if (e && e.key === key) return e.sp;
    const { yR } = buildingTop(s);
    const x0 = s.x - pad.left, y0 = yR - pad.top, x1 = s.x + s.w + pad.right, y1 = s.base + pad.bottom;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil((x1 - x0) * RS); cv.height = Math.ceil((y1 - y0) * RS);
    const c = cv.getContext('2d');
    c.setTransform(RS, 0, 0, RS, -x0 * RS, -y0 * RS);
    B.paint(c, s, info);
    nightTint(c, cv);
    if (B.glow) B.glow(c, s, info);   // Leuchtendes nach der Abdunklung
    e = { key, sp: { cv, x0, y0 } };
    buildingSprites.set(s.id, e);
    staticLayer.valid = false;
    return e.sp;
}
const buildingBox = (s) => { const pad = BUILDINGS[s.style].pad, { yR } = buildingTop(s); return [s.x - pad.left, yR - pad.top, s.x + s.w + pad.right, s.base + pad.bottom]; };

// ------------------------------------------------------------------ Statische Objekte
let staticItems = [];
/** Nach dem Aufbau der Welt einmal aufrufen */
export function collectStatic() {
    staticItems = [];
    for (const t of state.trees) {
        const size = Math.round(t.size / TREE_SIZE_STEP) * TREE_SIZE_STEP, v = treeVariant(t), [bx0, by0, bx1, by1] = TREE_BOX_UNIT;
        const key = `tree:${v}:${size.toFixed(1)}`;
        staticItems.push({ y: t.y, box: [t.x + bx0 * size, t.y + by0 * size, t.x + bx1 * size, t.y + by1 * size],
            draw: (c) => blit(c, sprite(key, bx0 * size, by0 * size, bx1 * size, by1 * size, (cc) => paintTree(cc, 0, 0, size, v)), t.x, t.y) });
    }
    for (const p of state.props) {
        const b = PROP_BOX[p.type];
        if (!b) continue;
        staticItems.push({ y: p.y, box: [p.x + b[0], p.y + b[1], p.x + b[2], p.y + b[3]],
            draw: (c) => blit(c, sprite(`prop:${p.type}:${info.lang}`, b[0], b[1], b[2], b[3], (cc) => paintProp(cc, p.type, 0, 0, info)), p.x, p.y) });
    }
    for (const s of state.stations) {
        staticItems.push({ y: s.base, station: s, box: buildingBox(s), draw: (c) => blit(c, buildingSprite(s), 0, 0) });
    }
    staticItems.sort((a, b) => a.y - b.y);
    staticLayer.valid = false;
}
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const inView = (box, v) => overlaps(box, v);

// Statische Ebene als Offscreen-Bild (nur bei stehender Kamera)
const STATIC_MARGIN = PERF.STATIC_MARGIN;
const staticLayer = { cv: null, valid: false, x0: 0, y0: 0, x1: 0, y1: 0, px0: 0, py0: 0, fadeKey: '' };
function buildStaticLayer(camX, camY) {
    const x0 = camX - STATIC_MARGIN, y0 = camY - STATIC_MARGIN, x1 = camX + view.w + STATIC_MARGIN, y1 = camY + view.h + STATIC_MARGIN;
    const px0 = Math.round(x0 * RS), py0 = Math.round(y0 * RS);
    const w = Math.round(x1 * RS) - px0, h = Math.round(y1 * RS) - py0;
    if (!staticLayer.cv) staticLayer.cv = document.createElement('canvas');
    const cv = staticLayer.cv;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = palette.void; c.fillRect(0, 0, w, h);
    drawGround(c, x0, y0, x1, y1, px0, py0);
    c.setTransform(RS, 0, 0, RS, -px0, -py0);
    const box = [x0, y0, x1, y1];
    for (const it of staticItems) if (!(it.station && it.station.fade > 0) && inView(it.box, box)) it.draw(c);
    Object.assign(staticLayer, { valid: true, x0, y0, x1, y1, px0, py0, fadeKey: fadeKey() });
}
const fadeKey = () => state.stations.map(s => (s.fade > 0 ? 1 : 0)).join('');
export function staticLayerValidFor(camX, camY) {
    const L = staticLayer;
    return L.valid && camX >= L.x0 && camY >= L.y0 && camX + view.w <= L.x1 && camY + view.h <= L.y1 && L.fadeKey === fadeKey();
}

// ------------------------------------------------------------------ Bewegte Objekte
// Jedes Objekt: { y: Tiefe (Fußpunkt), box: Umriss in Welteinheiten, draw(c) }
function dynamicItems(time) {
    const { player, robot, npcs, stations } = state;
    const items = [];
    for (const n of npcs) items.push({ y: n.y, box: [n.x + PERSON_BOX[0], n.y + PERSON_BOX[1], n.x + PERSON_BOX[2], n.y + PERSON_BOX[3]], draw: (c) => drawPerson(c, n.x, n.y, n, time) });
    items.push({ y: player.y, box: [player.x - 34, player.y + PERSON_BOX[1], player.x + 34, player.y + 16], draw: (c) => {
        const pr = (time * 0.9) % 1;
        c.strokeStyle = `rgba(${palette.playerRing},${0.55 * (1 - pr)})`; c.lineWidth = 2.5;
        ellipse(c, player.x, player.y, 16 + pr * 16, (16 + pr * 16) * 0.42); c.stroke();
        drawPerson(c, player.x, player.y, player, time);
    } });
    items.push({ y: robot.y, box: [robot.x + ROBOT_BOX[0], robot.y + ROBOT_BOX[1], robot.x + ROBOT_BOX[2], robot.y + ROBOT_BOX[3]], draw: (c) => drawRobot(c, robot.x, robot.y, time) });
    for (const s of stations) {
        const B = BUILDINGS[s.style];
        if (s.fade > 0) {   // Spieler hinter dem Gebäude: ganz Gebäude halbdurchsichtig über allem davor Liegenden
            const a = 1 - s.fade * 0.62;
            items.push({ y: s.base, box: buildingBox(s), draw: (c) => { c.globalAlpha = a; blit(c, buildingSprite(s), 0, 0); if (B.anim) B.anim(c, s, time, reducedMotion); c.globalAlpha = 1; } });
        } else if (B.anim) {
            items.push({ y: s.base + ANIM_AFTER_BUILDING, box: B.animBox(s), draw: (c) => B.anim(c, s, time, reducedMotion) });
        }
    }
    const f = state.fountain;
    items.push({ y: f.y + 30, box: [f.x - f.r - 8, f.y - 44, f.x + f.r + 8, f.y + f.r * 0.7], draw: (c) => drawFountain(c, f, time) });
    if (state.plane.t < 0) {
        const p = PROPS.parkedPlane;
        items.push({ y: p.y, box: [p.x + PLANE_BOX[0], p.y + PLANE_BOX[1], p.x + PLANE_BOX[2], p.y + PLANE_BOX[3]], draw: (c) => drawPlane(c, p.x, p.y, 1, 0) });
    }
    return items;
}

// Bewegte Gebäudeteile liegen minimal vor ihrem Gebäude, damit sie nach ihm gezeichnet werden
const ANIM_AFTER_BUILDING = 0.01;

// Bodennahe Dinge (liegen unter allem Statischen): Wasser, Enten, Paddler, Zielring, Sterne
function groundItems(time) {
    const items = [];
    const P = palette;
    items.push({ box: [LAKE.x - LAKE.rx, LAKE.y - LAKE.ry - 30, LAKE.x + LAKE.rx, LAKE.y + LAKE.ry], draw: (c) => {
        c.strokeStyle = P.waves; c.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
            const a = i * 0.7 + 1, rx = LAKE.rx * (0.25 + (i % 4) * 0.17), ry = LAKE.ry * (0.25 + (i % 3) * 0.2);
            const wx = LAKE.x + Math.cos(a) * rx, wy = LAKE.y + Math.sin(a) * ry + Math.sin(time + i) * 3;
            c.beginPath(); c.moveTo(wx - 12, wy); c.quadraticCurveTo(wx - 6, wy - 4, wx, wy); c.quadraticCurveTo(wx + 6, wy + 4, wx + 12, wy); c.stroke();
        }
        for (const d of state.ducks) {
            const x = LAKE.x + Math.cos(d.a) * LAKE.rx * d.r, y = LAKE.y + Math.sin(d.a) * LAKE.ry * d.r, dir = -Math.sin(d.a) > 0 ? 1 : -1;
            c.fillStyle = 'rgba(255,255,255,0.35)'; ellipse(c, x, y + 4, 14, 4); c.fill();
            c.fillStyle = '#ffd23f'; ellipse(c, x, y, 10, 6); c.fill(); ellipse(c, x + dir * 8, y - 6, 5, 5); c.fill();
            c.fillStyle = '#ff8a3d'; c.beginPath(); c.moveTo(x + dir * 12, y - 6); c.lineTo(x + dir * 17, y - 5); c.lineTo(x + dir * 12, y - 3); c.fill();
            c.fillStyle = '#222'; ellipse(c, x + dir * 9, y - 7, 1, 1); c.fill();
        }
        const a = time * 0.12, x = LAKE.x + Math.cos(a) * LAKE.rx * 0.45, y = LAKE.y + Math.sin(a) * LAKE.ry * 0.45;   // Paddler
        c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.fillStyle = '#ff8a3d'; ellipse(c, 0, 0, 30, 7); c.fill(); c.restore();
        c.fillStyle = '#2ec4b6'; ellipse(c, x, y - 10, 5, 8); c.fill();
        c.fillStyle = '#e0ac69'; ellipse(c, x, y - 20, 4.5, 4.5); c.fill();
    } });
    const next = info.nextStation;
    if (next && !state.attract) {
        const d = next.door;
        items.push({ box: [d.x - 60, d.y - 34, d.x + 60, d.y + 26], draw: (c) => {
            const p = (time * 1.2) % 1;
            c.strokeStyle = `rgba(${P.nextRing},${1 - p})`; c.lineWidth = 4;
            ellipse(c, d.x, d.y - 4, 22 + p * 34, (22 + p * 34) * 0.45); c.stroke();
        } });
    }
    const labelSize = Math.round(10 / Math.max(zoom, 0.8) * 10) / 10;
    for (const t of state.tokens) {
        if (t.got) continue;
        items.push({ box: [t.x - 60, t.y - 40, t.x + 60, t.y + 22], draw: (c) => {
            const bob = Math.sin(time * 3 + t.phase) * 4;
            c.fillStyle = 'rgba(25,50,20,0.18)'; ellipse(c, t.x, t.y + 2, 9, 3); c.fill();
            blit(c, starSprite(), t.x, t.y - 16 + bob);
            blit(c, textSprite(t.label, labelSize, P.tokenLabel, 700), t.x, t.y + 12);
        } });
    }
    return items;
}
const STAR_R = 18;
const starSprite = () => sprite('star', -STAR_R, -STAR_R, STAR_R, STAR_R, (c) => {
    c.fillStyle = 'rgba(255,220,80,0.3)'; ellipse(c, 0, 0, 16, 16); c.fill();
    c.fillStyle = '#ffcd3c'; c.strokeStyle = '#e09b00'; c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4.6 : 11, a = i / 10 * TAU - Math.PI / 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke();
});
function textSprite(text, fs, col, weight) {
    ctx.font = `${weight} ${fs}px ${FONT}`;
    const w = ctx.measureText(text).width + 4;
    return sprite(`text:${text}|${fs}|${col}|${weight}`, -w / 2, -fs, w / 2, fs, (c) => signText(c, text, 0, 0, fs, col, weight));
}
function labelSprite(text, fs, bg, glow) {
    ctx.font = `700 ${fs}px ${FONT}`;
    const tw = ctx.measureText(text).width + fs * 1.4, th = fs * 2, pad = glow ? 22 : 2;
    return sprite(`label:${text}|${fs}|${bg}|${glow}`, -tw / 2 - pad, -th / 2 - pad, tw / 2 + pad, th / 2 + pad, (c) => {
        if (glow) { c.shadowColor = palette.label.glow; c.shadowBlur = 18 * RS; }
        c.fillStyle = bg; rr(c, -tw / 2, -th / 2, tw, th, th / 2); c.fill();
        c.shadowBlur = 0;
        signText(c, text, 0, 1, fs, palette.label.text, 700);
    });
}
const cloudSprite = (i, cl) => sprite(`cloud:${i}`, -cl.rx, -cl.ry, cl.rx, cl.ry, (c) => {
    c.scale(1, cl.ry / cl.rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, cl.rx), C = palette.cloudShadow;
    g.addColorStop(0, `rgba(${C},0.07)`); g.addColorStop(0.6, `rgba(${C},0.04)`); g.addColorStop(1, `rgba(${C},0)`);
    c.fillStyle = g; ellipse(c, 0, 0, cl.rx, cl.rx); c.fill();
});

/** Statische Objekte, die vor bewegten Dingen stehen und sie überdecken (transitiv, nach Tiefe sortiert) */
function occluders(dyn, ground, viewBox) {
    const picked = new Set();
    const queue = [];
    const add = (it) => { if (!picked.has(it)) { picked.add(it); queue.push(it); } };
    for (const it of staticItems) {
        if (it.station && it.station.fade > 0) continue;
        if (!inView(it.box, viewBox)) continue;
        if (ground.some(g => overlaps(it.box, g.box))) { add(it); continue; }
        if (dyn.some(d => it.y > d.y && overlaps(it.box, d.box))) add(it);
    }
    while (queue.length) {   // was vor einem neu gezeichneten Objekt steht, muss auch neu gezeichnet werden
        const o = queue.pop();
        for (const it of staticItems) if (it.y > o.y && !picked.has(it) && !(it.station && it.station.fade > 0) && overlaps(it.box, o.box)) add(it);
    }
    return Array.from(picked);
}

// ------------------------------------------------------------------ Bild zeichnen
/**
 * Ein Bild der Welt zeichnen. useStatic: statische Ebene verwenden (Kamera steht still).
 * Gibt zurück, ob die statische Ebene benutzt wurde.
 */
export function render(useStatic) {
    const c = ctx, { cam } = state, time = state.time, P = palette;
    const camPx = Math.round(cam.x * RS), camPy = Math.round(cam.y * RS);
    const vb = [cam.x - 80, cam.y - 80, cam.x + view.w + 80, cam.y + view.h + 260];
    let usedStatic = false;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (useStatic && !staticLayerValidFor(cam.x, cam.y)) buildStaticLayer(cam.x, cam.y);
    const dyn = dynamicItems(time), grd = groundItems(time);
    if (useStatic && staticLayerValidFor(cam.x, cam.y)) {
        c.drawImage(staticLayer.cv, staticLayer.px0 - camPx, staticLayer.py0 - camPy);
        c.setTransform(RS, 0, 0, RS, -camPx, -camPy);
        for (const g of grd) if (inView(g.box, vb)) g.draw(c);
        const list = dyn.filter(d => inView(d.box, vb)).concat(occluders(dyn, grd, vb));
        list.sort((a, b) => a.y - b.y);
        for (const it of list) it.draw(c);
        usedStatic = true;
    } else {
        c.fillStyle = P.void; c.fillRect(0, 0, canvas.width, canvas.height);
        drawGround(c, cam.x, cam.y, cam.x + view.w, cam.y + view.h, camPx, camPy);
        c.setTransform(RS, 0, 0, RS, -camPx, -camPy);
        for (const g of grd) if (inView(g.box, vb)) g.draw(c);
        const list = dyn.filter(d => inView(d.box, vb));
        for (const it of staticItems) if (!(it.station && it.station.fade > 0) && inView(it.box, vb)) list.push(it);
        list.sort((a, b) => a.y - b.y);
        for (const it of list) it.draw(c);
    }
    drawOverlay(c, time, vb);
    return usedStatic;
}

// Oberste Ebene: startendes Flugzeug, Partikel, Wolkenschatten, Vögel, Beschriftungen, Hinweise, Pfeil
function drawOverlay(c, time, vb) {
    const P = palette, pl = state.plane;
    if (pl.t >= 0) {
        const t = pl.t, x = RUNWAY.x + 80 + Math.min(t, 4) ** 2 * 32 + Math.max(0, t - 4) * 260, lift = Math.max(0, (t - 3.2) / 2.5);
        drawPlane(c, x, RUNWAY.y + RUNWAY.h / 2, 1 + lift * 0.4, Math.min(lift, 3));
    }
    drawParticles(c, zoom);
    state.clouds.forEach((cl, i) => { if (cl.x + cl.rx > vb[0] && cl.x - cl.rx < vb[2]) blit(c, cloudSprite(i, cl), cl.x, cl.y); });
    c.strokeStyle = P.bird; c.lineWidth = 2;
    for (const b of state.birds) for (let i = 0; i < b.n; i++) {
        const x = b.x - i * 18, y = b.y + (i % 2) * 10 + i * 4, f = Math.sin(time * 10 + i) * 4;
        c.beginPath(); c.moveTo(x - 7, y - f); c.quadraticCurveTo(x - 3, y - 3, x, y); c.quadraticCurveTo(x + 3, y - 3, x + 7, y - f); c.stroke();
    }
    // Beschriftungen der Stationen
    const fs = Math.round(13 / Math.max(zoom, 0.75) * 10) / 10;
    const next = info.nextStation;
    for (const s of state.stations) {
        const visited = info.isVisited(s.id), isNext = next && next.id === s.id, locked = info.isLocked(s.id);
        const lift = LABEL_LIFT[s.style] || LABEL_LIFT.default;
        const topY = s.base - s.height - s.depth - lift - (isNext ? Math.abs(Math.sin(time * 3)) * 8 : 0);
        const label = locked ? `🔒 ${s.title}` : `${s.emoji} ${s.title}${visited ? '  ✓' : ''}`;
        const bg = locked ? P.label.locked : visited ? P.label.visited : isNext ? P.label.next : P.label.normal;
        blit(c, labelSprite(label, fs, bg, isNext || state.hoverStation === s), s.x + s.w / 2, topY);
    }
    // Hinweis „Betreten“ an der Tür
    const near = state.nearStation;
    if (near && !state.paused) {
        const y = near.door.y - 90 + Math.sin(time * 5) * 4;
        const txt = info.isLocked(near.id) ? info.t('world.locked') : isTouch ? info.t('world.enterTouch') : info.t('world.enterKeys');
        c.font = `800 ${fs}px ${FONT}`;
        const tw = c.measureText(txt).width + fs * 1.6;
        c.fillStyle = P.hint.bg; rr(c, near.door.x - tw / 2, y - fs, tw, fs * 2, 8); c.fill();
        signText(c, txt, near.door.x, y + 1, fs, P.hint.text, 800);
    }
    // Pfeil am Bildschirmrand zur nächsten Station
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (next && !state.attract && !state.paused) {
        const sp = { x: (next.door.x - state.cam.x) * zoom, y: (next.door.y - 40 - state.cam.y) * zoom };
        const M = EDGE_ARROW.margin;
        if (sp.x < M || sp.y < M + 40 || sp.x > vw - M || sp.y > vh - M) {
            const cx = vw / 2, cy = vh / 2, dx = sp.x - cx, dy = sp.y - cy;
            const k = Math.min((vw / 2 - M) / Math.abs(dx || 1), (vh / 2 - M) / Math.abs(dy || 1));
            c.save(); c.translate(cx + dx * k, cy + dy * k);
            c.fillStyle = 'rgba(255,138,61,0.95)'; ellipse(c, 0, 0, EDGE_ARROW.r, EDGE_ARROW.r); c.fill();
            c.strokeStyle = '#fff'; c.lineWidth = 3; ellipse(c, 0, 0, EDGE_ARROW.r, EDGE_ARROW.r); c.stroke();
            c.font = `20px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(next.emoji, 0, 1);
            c.rotate(Math.atan2(dy, dx)); c.fillStyle = P.edgeArrow;
            c.beginPath(); c.moveTo(34 + Math.sin(time * 6) * 3, 0); c.lineTo(24, -9); c.lineTo(24, 9); c.closePath(); c.fill();
            c.restore();
        }
    }
}
// Höhe der Beschriftung über dem Dach je Gebäudetyp
const LABEL_LIFT = { career: 100, airport: 30, school: 136, construction: 60, default: 34 };
const EDGE_ARROW = { margin: 56, r: 24 };

/** Letztes Bild einmal weichzeichnen (hinter Dialogen, statt einer ständig neu berechneten CSS-Unschärfe) */
export function blurFrame() {
    if (!('filter' in ctx)) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = `blur(${PERF.COVER_BLUR_PX * dpr}px) saturate(1.1)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
}

export const debug = {
    get spriteCount() { return sprites.size; },
    buildingCanvas: (id) => buildingSprite(state.stations.find(s => s.id === id)).cv,
    setDprCap: (v) => { dprCap = v; resize(); }
};

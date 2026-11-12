// Natur: Bäume und die einmal vorgerenderte Bodenebene (Gras, Hügel, Wege, Platz, See, Landebahn).
import { rng } from '../../core/math.js';
import { rr, ellipse } from '../draw.js';
import { WORLD, ROADS, SIDE_PATHS, ROAD_WIDTH, PLAZA, LAKE, HILL, RUNWAY } from '../../config/layout.js';

// ------------------------------------------------------------------ Bäume
const TRUNK = '#7a5235';
const TREE_SHADOW = 'rgba(25,55,20,0.24)';
const PINE = ['#2f7d4a', '#3a9158', '#47a465'];
const CROWNS = { r0: ['#3f8f45', '#55a957', '#73c26a'], r1: ['#468f3e', '#5fa84a', '#80c45e'], r2: ['#3b8a55', '#4fa36a', '#6dbb80'], fruit: ['#3b8a55', '#4fa36a', '#6dbb80'] };
const FRUIT = '#ff5d5d';
const FRUIT_SPOTS = [[-12, -40], [8, -55], [14, -38], [-2, -48]];

/** Baumtyp aus Art und Farbton: wenige Vorlagen, die als Sprite wiederverwendet werden */
export const treeVariant = (t) => t.kind === 'pine' ? 'pine' : t.hue > 0.82 ? 'fruit' : t.hue < 0.33 ? 'r0' : t.hue < 0.66 ? 'r1' : 'r2';
/** Umriss eines Baums der Größe 1 relativ zum Stamm-Fußpunkt */
export const TREE_BOX_UNIT = [-37, -100, 37, 13];
/** Größen werden auf Stufen gerundet, damit jede Vorlage 1:1 kopiert werden kann */
export const TREE_SIZE_STEP = 0.1;

export function paintTree(c, x, y, s, variant) {
    c.fillStyle = TREE_SHADOW; ellipse(c, x + 8 * s, y + 2, 26 * s, 9 * s); c.fill();
    c.fillStyle = TRUNK; rr(c, x - 5 * s, y - 24 * s, 10 * s, 26 * s, 3); c.fill();
    if (variant === 'pine') {
        for (let i = 0; i < 3; i++) {
            const ty = y - 22 * s - i * 20 * s, w = (34 - i * 8) * s;
            c.fillStyle = PINE[i];
            c.beginPath(); c.moveTo(x - w, ty); c.lineTo(x + w, ty); c.lineTo(x, ty - 34 * s); c.closePath(); c.fill();
        }
        return;
    }
    const g = CROWNS[variant];
    c.fillStyle = g[0]; ellipse(c, x, y - 44 * s, 30 * s, 26 * s); c.fill();
    c.fillStyle = g[1]; ellipse(c, x - 8 * s, y - 52 * s, 22 * s, 20 * s); c.fill();
    ellipse(c, x + 11 * s, y - 48 * s, 18 * s, 17 * s); c.fill();
    c.fillStyle = g[2]; ellipse(c, x - 6 * s, y - 60 * s, 13 * s, 10 * s); c.fill();
    if (variant === 'fruit') { c.fillStyle = FRUIT; FRUIT_SPOTS.forEach(([dx, dy]) => { ellipse(c, x + dx * s, y + dy * s, 3, 3); c.fill(); }); }
}

// ------------------------------------------------------------------ Bodenebene
const GROUND_SEED = 77;
const PATCHES = 160, SPECKLES = 9000, BLADES = 1700, FLOWERS = 650;
const PLAZA_RING_STEP = 26;

function strokeRoads(c, color, width, dash) {
    c.strokeStyle = color; c.lineWidth = width;
    if (dash) c.setLineDash(dash);
    ROADS.concat(SIDE_PATHS).forEach(r => { c.beginPath(); c.moveTo(r[0][0], r[0][1]); r.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.stroke(); });
    c.setLineDash([]);
}

/** Zeichnet die ganze unbewegliche Bodenebene in eine Canvas mit res Pixeln pro Welteinheit. */
export function buildGround(res, P) {
    const { W, H } = WORLD;
    const g = document.createElement('canvas');
    g.width = Math.round(W * res); g.height = Math.round(H * res);
    const c = g.getContext('2d');
    c.scale(res, res);
    const rnd = rng(GROUND_SEED);
    c.fillStyle = P.grass; c.fillRect(0, 0, W, H);
    for (let i = 0; i < PATCHES; i++) {   // hellere und dunklere Grasflecken
        const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 200;
        const grad = c.createRadialGradient(x, y, 0, x, y, r);
        const col = P.grassPatches[rnd() < 0.5 ? 0 : 1];
        grad.addColorStop(0, `rgba(${col},0.35)`); grad.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = grad; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const hg = c.createRadialGradient(HILL.x, HILL.y + 40, 20, HILL.x, HILL.y, HILL.rx);   // Hügel unter dem Finale
    P.hill.forEach((col, i) => hg.addColorStop([0, 0.7, 1][i], col));
    c.fillStyle = hg; ellipse(c, HILL.x, HILL.y, HILL.rx, HILL.ry); c.fill();
    c.strokeStyle = P.hillEdge; c.lineWidth = 10;
    c.beginPath(); c.ellipse(HILL.x, HILL.y + 6, HILL.rx * 0.82, HILL.ry * 0.78, 0, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke();
    for (let i = 0; i < SPECKLES; i++) { c.fillStyle = P.grassSpeckles[rnd() < 0.5 ? 0 : 1]; c.fillRect(rnd() * W, rnd() * H, 2, 2); }
    c.lineWidth = 2; c.lineCap = 'round';
    for (let i = 0; i < BLADES; i++) {
        const x = rnd() * W, y = rnd() * H;
        c.strokeStyle = P.grassBlades[rnd() < 0.5 ? 0 : 1];
        c.beginPath(); c.moveTo(x - 4, y - 7); c.lineTo(x, y); c.lineTo(x + 4, y - 8); c.moveTo(x, y); c.lineTo(x + 1, y - 10); c.stroke();
    }
    for (let i = 0; i < FLOWERS; i++) {
        const x = rnd() * W, y = rnd() * H;
        c.fillStyle = P.flowers[Math.floor(rnd() * P.flowers.length)];
        for (let k = 0; k < 4; k++) { ellipse(c, x + Math.cos(k * 1.57) * 2.4, y + Math.sin(k * 1.57) * 2.4, 2.1, 2.1); c.fill(); }
        c.fillStyle = P.flowerCenter; ellipse(c, x, y, 1.4, 1.4); c.fill();
    }
    // Landebahn
    c.fillStyle = P.runway; rr(c, RUNWAY.x, RUNWAY.y, RUNWAY.w, RUNWAY.h, 8); c.fill();
    c.fillStyle = P.runwayMarks;
    for (let x = RUNWAY.x + 30; x < RUNWAY.x + RUNWAY.w - 30; x += 60) c.fillRect(x, RUNWAY.y + RUNWAY.h / 2 - 2, 32, 4);
    for (let i = 0; i < 6; i++) c.fillRect(RUNWAY.x + 10, RUNWAY.y + 8 + i * 10, 18, 5);
    // Wege: Rand, Belag, gestrichelte Mitte
    c.lineCap = 'round'; c.lineJoin = 'round';
    strokeRoads(c, P.roadEdge, ROAD_WIDTH + 8);
    c.fillStyle = P.roadEdge; ellipse(c, PLAZA.x, PLAZA.y, PLAZA.r + 4, PLAZA.r + 4); c.fill();
    strokeRoads(c, P.road, ROAD_WIDTH);
    strokeRoads(c, P.roadDash, 4, [2, 22]);
    // Marktplatz
    c.fillStyle = P.plaza; ellipse(c, PLAZA.x, PLAZA.y, PLAZA.r, PLAZA.r); c.fill();
    c.strokeStyle = P.plazaRings; c.lineWidth = 2;
    for (let r = 30; r < PLAZA.r; r += PLAZA_RING_STEP) { ellipse(c, PLAZA.x, PLAZA.y, r, r); c.stroke(); }
    // See mit Ufer
    c.fillStyle = P.shore; ellipse(c, LAKE.x, LAKE.y, LAKE.rx + 16, LAKE.ry + 14); c.fill();
    const lg = c.createRadialGradient(LAKE.x, LAKE.y, 20, LAKE.x, LAKE.y, LAKE.rx);
    lg.addColorStop(0, P.waterDeep); lg.addColorStop(1, P.waterShallow);
    c.fillStyle = lg; ellipse(c, LAKE.x, LAKE.y, LAKE.rx, LAKE.ry); c.fill();
    return g;
}

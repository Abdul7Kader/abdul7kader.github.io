// Kollision und Wegfindung (A* auf einem Raster, danach geglättet).
import { WORLD, PATH_CELL, PLAYER_RADIUS, FOUNTAIN, LAKE, ROADS } from '../config/layout.js';
import { dist, distToSegment } from '../core/math.js';
import { state } from './state.js';

const EDGE = 16;                 // Abstand zum Weltrand
const LAKE_SHORE = 14;           // so weit darf man ans Wasser
const TREE_CHECK = 40;           // nur Bäume in der Nähe prüfen
const GRID_RADIUS = 15;          // Radius beim Aufbau des Rasters (etwas großzügiger als die Figur)
const LINE_STEP = 8, LINE_RADIUS = 14;
const MAX_ITERATIONS = 40000;
const NEAREST_FREE_RANGE = 12;

export function inLake(x, y, pad = 0) {
    const dx = (x - LAKE.x) / (LAKE.rx + pad), dy = (y - LAKE.y) / (LAKE.ry + pad);
    return dx * dx + dy * dy < 1;
}
export function distRoad(x, y) {
    let m = Infinity;
    for (const r of ROADS) for (let i = 0; i < r.length - 1; i++) m = Math.min(m, distToSegment(x, y, r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]));
    return m;
}

/** Ist der Punkt für eine Figur mit Radius r versperrt? */
export function blocked(x, y, r = PLAYER_RADIUS) {
    const { W, H } = WORLD;
    if (x < r + EDGE || y < r + EDGE || x > W - r - EDGE || y > H - r - EDGE) return true;
    for (const s of state.stations) {
        const top = s.base - s.depth;
        if (x > s.x - r && x < s.x + s.w + r && y > top - r && y < s.base + r * 0.4) return true;
    }
    if (dist(x, y, FOUNTAIN.x, FOUNTAIN.y) < FOUNTAIN.r + r) return true;
    if (inLake(x, y, -LAKE_SHORE + r)) return true;
    for (const t of state.trees) {
        if (Math.abs(t.x - x) < TREE_CHECK && Math.abs(t.y - y) < TREE_CHECK && dist(x, y, t.x, t.y) < t.trunk + r) return true;
    }
    for (const p of state.props) if (p.solid && dist(x, y, p.x, p.y) < p.solid + r) return true;
    return false;
}

const GW = Math.ceil(WORLD.W / PATH_CELL), GH = Math.ceil(WORLD.H / PATH_CELL);
let grid = null;
export function buildGrid() {
    grid = new Uint8Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
        grid[gy * GW + gx] = blocked(gx * PATH_CELL + PATH_CELL / 2, gy * PATH_CELL + PATH_CELL / 2, GRID_RADIUS) ? 1 : 0;
    }
}
function nearestFree(gx, gy) {
    for (let rad = 0; rad < NEAREST_FREE_RANGE; rad++) for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x >= 0 && y >= 0 && x < GW && y < GH && !grid[y * GW + x]) return [x, y];
    }
    return null;
}
function lineFree(ax, ay, bx, by) {
    const n = Math.ceil(dist(ax, ay, bx, by) / LINE_STEP);
    for (let i = 1; i <= n; i++) if (blocked(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, LINE_RADIUS)) return false;
    return true;
}

/** Kleiner Binär-Heap für die offene Liste */
function heap() {
    const h = [];
    return {
        get size() { return h.length; },
        push(f, i) { h.push([f, i]); let k = h.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (h[p][0] <= h[k][0]) break; [h[p], h[k]] = [h[k], h[p]]; k = p; } },
        pop() {
            const top = h[0], end = h.pop();
            if (h.length) {
                h[0] = end; let k = 0;
                for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; }
            }
            return top[1];
        }
    };
}

/** Weg von (sx, sy) nach (tx, ty) als Liste von Wegpunkten – oder null */
export function findPath(sx, sy, tx, ty) {
    const s = nearestFree(Math.floor(sx / PATH_CELL), Math.floor(sy / PATH_CELL));
    const t = nearestFree(Math.floor(tx / PATH_CELL), Math.floor(ty / PATH_CELL));
    if (!s || !t) return null;
    const N = GW * GH, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const start = s[1] * GW + s[0], goal = t[1] * GW + t[0];
    const h = (i) => { const dx = Math.abs(i % GW - t[0]), dy = Math.abs(((i / GW) | 0) - t[1]); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const open = heap();
    g[start] = 0; open.push(h(start), start);
    let found = false, iter = 0;
    while (open.size && iter++ < MAX_ITERATIONS) {
        const cur = open.pop();
        if (cur === goal) { found = true; break; }
        if (closed[cur]) continue;
        closed[cur] = 1;
        const cx = cur % GW, cy = (cur / GW) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
            const ni = ny * GW + nx;
            if (grid[ni] || closed[ni]) continue;
            if (dx && dy && (grid[cy * GW + nx] || grid[ny * GW + cx])) continue;   // keine Ecken schneiden
            const ng = g[cur] + (dx && dy ? Math.SQRT2 : 1);
            if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; open.push(ng + h(ni), ni); }
        }
    }
    if (!found) return null;
    const pts = [];
    for (let i = goal; i !== -1; i = came[i]) pts.push([(i % GW) * PATH_CELL + PATH_CELL / 2, ((i / GW) | 0) * PATH_CELL + PATH_CELL / 2]);
    pts.reverse();
    if (!blocked(tx, ty)) pts[pts.length - 1] = [tx, ty];
    // Glätten: überflüssige Zwischenpunkte entfernen
    const out = [];
    let ax = sx, ay = sy, i = 0;
    while (i < pts.length) {
        let j = pts.length - 1;
        while (j > i && !lineFree(ax, ay, pts[j][0], pts[j][1])) j--;
        out.push(pts[j]); ax = pts[j][0]; ay = pts[j][1]; i = j + 1;
    }
    return out;
}

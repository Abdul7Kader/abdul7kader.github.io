// Aufbau der Welt: Stationen, Wald, Laternen, Bewohner, Enten, Wolken und Skill-Sterne.
// Alles deterministisch (fester Zufalls-Startwert), damit die Welt bei jedem Besuch gleich aussieht.
import { WORLD, STATIONS, DOOR_OFFSET_Y, ROADS, ROAD_WIDTH, PLAZA, FOUNTAIN, RUNWAY, SPAWN, NPC_HOMES, PROPS, FOREST, TOKENS } from '../config/layout.js';
import { NPC_LOOKS } from '../config/theme.js';
import { rng, dist } from '../core/math.js';
import { state, createPlayer, createRobot } from './state.js';
import { blocked, inLake, distRoad } from './pathfinding.js';

const TREE = { minSize: 0.8, sizeRange: 0.5, trunkPerSize: 11, pineShare: 0.28 };
const LAMP_SOLID = 5, SIGN_SOLID = 8, LAMP_ROAD_GAP = 12;
const DUCKS = 3, CLOUDS = 6;

function placeTrees(rnd) {
    const { W, H } = WORLD;
    const okForTree = (x, y, pad) => {
        if (distRoad(x, y) < ROAD_WIDTH / 2 + pad) return false;
        if (dist(x, y, PLAZA.x, PLAZA.y) < PLAZA.r + pad + 10) return false;
        if (inLake(x, y, pad + 26)) return false;
        if (x > RUNWAY.x - pad && x < RUNWAY.x + RUNWAY.w + pad && y > RUNWAY.y - pad && y < RUNWAY.y + RUNWAY.h + pad + 20) return false;
        for (const s of state.stations) {
            const top = s.base - s.height - s.depth - 30;
            if (x > s.x - pad - 10 && x < s.x + s.w + pad + 10 && y > top && y < s.base + pad + 60) return false;
        }
        if (dist(x, y, SPAWN.x, SPAWN.y) < 70) return false;
        for (const t of state.trees) if (dist(x, y, t.x, t.y) < FOREST.minGap) return false;
        return true;
    };
    const addTree = (x, y) => {
        const size = TREE.minSize + rnd() * TREE.sizeRange;
        state.trees.push({ x, y, size, trunk: TREE.trunkPerSize * size, kind: rnd() < TREE.pineShare ? 'pine' : 'round', hue: rnd() });
        rnd();   // früher die Wiegephase – bleibt gezogen, damit der Wald genauso verteilt ist wie bisher
    };
    // Waldrand oben/unten und links/rechts, dann zufällig verteilt
    for (let x = 20; x < W; x += FOREST.edgeStep) {
        [[x + rnd() * 20, 30 + rnd() * 20], [x + rnd() * 20, H - 40 - rnd() * 16]].forEach(([tx, ty]) => { if (okForTree(tx, ty, 10)) addTree(tx, ty); });
    }
    for (let y = 80; y < H - 60; y += 60) {
        [[26 + rnd() * 20, y + rnd() * 20], [W - 30 - rnd() * 20, y + rnd() * 20]].forEach(([tx, ty]) => { if (okForTree(tx, ty, 10)) addTree(tx, ty); });
    }
    for (let i = 0; i < FOREST.attempts && state.trees.length < FOREST.maxTrees; i++) {
        const x = 60 + rnd() * (W - 120), y = 80 + rnd() * (H - 140);
        if (okForTree(x, y, 34)) addTree(x, y);
    }
}

function placeLamps() {
    ROADS.forEach((r, ri) => {
        for (let i = 0; i < r.length - 1; i++) {
            const [ax, ay] = r[i], [bx, by] = r[i + 1];
            const len = Math.hypot(bx - ax, by - ay), n = Math.floor(len / PROPS.lampSpacing);
            for (let k = 1; k <= n; k++) {
                const t = k / (n + 1), nx = -(by - ay) / len, ny = (bx - ax) / len, side = (k + ri) % 2 ? 1 : -1;
                const off = ROAD_WIDTH / 2 + LAMP_ROAD_GAP;
                const px = ax + (bx - ax) * t + nx * side * off, py = ay + (by - ay) * t + ny * side * off;
                if (!state.stations.some(s => px > s.x - 20 && px < s.x + s.w + 20 && py > s.base - s.depth - 20 && py < s.base + 50)) {
                    state.props.push({ type: 'lamp', x: px, y: py, solid: LAMP_SOLID });
                }
            }
        }
    });
}

function placeTokens(labels, collected) {
    const segs = [];
    let total = 0;
    ROADS.forEach(r => { for (let i = 0; i < r.length - 1; i++) { const len = dist(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]); segs.push({ a: r[i], b: r[i + 1], len, at: total }); total += len; } });
    const RETRIES = 12, NUDGE = 37;
    labels.slice(0, TOKENS.max).forEach((label, i, arr) => {
        let pos = (i + 0.5) / arr.length * total;
        for (let tries = 0; tries < RETRIES; tries++) {
            const seg = segs.find(s => pos >= s.at && pos <= s.at + s.len) || segs[segs.length - 1];
            const t = (pos - seg.at) / seg.len;
            const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t, y = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
            const nearDoor = state.stations.some(s => dist(x, y, s.door.x, s.door.y) < TOKENS.minDoorDistance);
            if (!nearDoor && !blocked(x, y, 8) && dist(x, y, SPAWN.x, SPAWN.y) > TOKENS.minSpawnDistance) {
                state.tokens.push({ x, y, label, got: collected.includes(label), phase: i });
                break;
            }
            pos = (pos + NUDGE) % total;
        }
    });
}

/** Welt aufbauen. titles: Stationstitel je id; skillTokens: Beschriftungen der Sterne; collected: schon gesammelte */
export function buildWorld({ titles, skillTokens, collected }) {
    const rnd = rng(FOREST.seed);
    state.stations = STATIONS.map(d => ({ ...d, title: titles[d.id] || d.id, door: { x: d.x + d.w / 2, y: d.base + DOOR_OFFSET_Y }, fade: 0 }));
    placeTrees(rnd);
    placeLamps();
    state.props.push({ type: 'sign', x: PROPS.signpost.x, y: PROPS.signpost.y, solid: SIGN_SOLID });
    PROPS.benches.forEach(b => state.props.push({ type: 'bench', x: b.x, y: b.y }));
    state.props.push({ type: 'dock', x: PROPS.dock.x, y: PROPS.dock.y });
    NPC_HOMES.forEach(([x, y], i) => {
        state.npcs.push({ x, y, home: { x, y }, tx: x, ty: y, look: NPC_LOOKS[i % NPC_LOOKS.length], dir: 'down', walk: 0, moving: false, wait: 1 + i, fact: i, cooldown: 0 });
    });
    for (let i = 0; i < DUCKS; i++) state.ducks.push({ a: i * 2.1, r: 0.55 + i * 0.12, speed: 0.06 + i * 0.015 });
    for (let i = 0; i < CLOUDS; i++) state.clouds.push({ x: rnd() * WORLD.W, y: rnd() * WORLD.H, rx: 160 + rnd() * 160, ry: 70 + rnd() * 60, v: 6 + rnd() * 8 });
    placeTokens(skillTokens, collected);
    state.player = createPlayer();
    state.robot = createRobot();
    state.fountain = { x: FOUNTAIN.x, y: FOUNTAIN.y, r: FOUNTAIN.r };
    return state;
}


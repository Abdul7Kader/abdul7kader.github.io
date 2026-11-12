// Die begehbare Welt: Bewegung, Bewohner, Kamera, Bildraten-Steuerung und öffentliche Schnittstelle.
// Zeichnen: renderer.js · Aufbau: build.js · Wegfindung: pathfinding.js · Eingaben: input.js
import { WORLD, DOOR_REACH, FINALE, PLAYER, CAMERA, TOKENS, NPC_WANDER, PLAYER_RADIUS, FOUNTAIN } from '../config/layout.js';
import { WORLD_PERF as PERF } from '../config/performance.js';
import { TIMING } from '../config/timing.js';
import { clamp, lerp, dist, TAU } from '../core/math.js';
import { $ } from '../core/dom.js';
import { state } from './state.js';
import { buildWorld } from './build.js';
import { blocked, findPath, buildGrid } from './pathfinding.js';
import { setupInput } from './input.js';
import { spawn, spawnRing, confetti, updateParticles } from './particles.js';
import * as renderer from './renderer.js';

// Von außen gesetzt (app.js): Fortschritt, Texte, Ereignisse
let hooks = {
    t: (k) => k, lang: () => 'de', firm: () => '', facts: () => [],
    nextId: () => null, isVisited: () => false, isLocked: () => false, canAutoEnter: () => true, allVisited: () => false,
    onEnterStation: () => {}, onLocked: () => {}, onCollect: () => {}, onFirstMove: () => {}, onFrame: () => {}, unlockAudio: () => {}
};

let covered = false, frozen = false, last = 0, lastDraw = 0, wakeUntil = 0, camMoving = false, liveParticles = 0;
let gapEma = 0, busyFrames = 0, prevTs = 0, frames = 0, lastCamMove = 0;

const ROBOT_FOLLOW = { dx: 38, dy: 14, lerp: 3 };
const FADE = { in: 0.12, out: 0.08, alpha: 0.62, roofReach: { career: 110, school: 140, default: 60 }, side: 24 };
const BIRDS = { chancePerSecond: 0.05, max: 2, speed: 110, speedRange: 40, climb: 8 };
const PLANE_FLIGHT_S = 9, PLANE_PAUSE_S = 26, PLANE_PAUSE_RANGE_S = 10;
const FOUNTAIN_DROPS_PER_S = 14, FINALE_GLINTS_PER_S = 6;
const STATION_HITBOX = { side: 10, roof: { career: 70, default: 20 }, above: 40, below: 40 };

// ------------------------------------------------------------------ Kamera
const viewW = () => renderer.view.w, viewH = () => renderer.view.h;
function clampCam(x, y) {
    const w = viewW(), h = viewH();
    return { x: w >= WORLD.W ? (WORLD.W - w) / 2 : clamp(x, 0, WORLD.W - w), y: h >= WORLD.H ? (WORLD.H - h) / 2 : clamp(y, 0, WORLD.H - h) };
}
const worldToScreen = (x, y) => ({ x: (x - state.cam.x) * renderer.view.zoom, y: (y - state.cam.y) * renderer.view.zoom });
const screenToWorld = (x, y) => ({ x: x / renderer.view.zoom + state.cam.x, y: y / renderer.view.zoom + state.cam.y });

function stationAt(x, y) {
    for (const s of state.stations) {
        const top = s.base - s.height - s.depth - (STATION_HITBOX.roof[s.style] || STATION_HITBOX.roof.default) - STATION_HITBOX.above;
        if (x > s.x - STATION_HITBOX.side && x < s.x + s.w + STATION_HITBOX.side && y > top && y < s.base + STATION_HITBOX.below) return s;
    }
    return null;
}

// ------------------------------------------------------------------ Bewegung der Spielfigur
function markFirstMove() { if (!state.firstMoveDone) { state.firstMoveDone = true; hooks.onFirstMove(); } }
function stopWalking() { state.player.path = null; state.player.pendingStation = null; }

function updatePlayer(dt) {
    const { player, keys, joy } = state;
    let mx = 0, my = 0;
    if (!state.paused) {
        if (keys.w || keys.ArrowUp) my -= 1;
        if (keys.s || keys.ArrowDown) my += 1;
        if (keys.a || keys.ArrowLeft) mx -= 1;
        if (keys.d || keys.ArrowRight) mx += 1;
        if (joy) { mx = joy.x; my = joy.y; }
    }
    if (mx || my) { stopWalking(); markFirstMove(); }
    if (!state.paused && player.path && player.path.length) {
        const [tx, ty] = player.path[0];
        const dx = tx - player.x, dy = ty - player.y, d = Math.hypot(dx, dy);
        if (d < PLAYER.arriveDistance) player.path.shift(); else { mx = dx / d; my = dy / d; }
        if (!player.path.length) {
            player.path = null;
            if (player.pendingStation) {
                const s = state.stations.find(st => st.id === player.pendingStation);
                player.pendingStation = null; player.dir = 'up';
                if (s) World.enter(s);
            }
        }
    }
    const len = Math.hypot(mx, my);
    player.moving = len > 0.05;
    if (!player.moving) { player.walk = 0; return; }
    const sp = PLAYER.speed * dt * Math.min(1, len), nx = mx / len, ny = my / len, ox = player.x, oy = player.y;
    if (!blocked(player.x + nx * sp, player.y)) player.x += nx * sp;
    if (!blocked(player.x, player.y + ny * sp)) player.y += ny * sp;
    const moved = Math.hypot(player.x - ox, player.y - oy);
    if (player.path && moved < sp * 0.2) { if (++player.stuck > PLAYER.stuckFrames) { stopWalking(); player.stuck = 0; } }
    else player.stuck = 0;
    player.walk += dt * 13;
    player.dir = Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 'right' : 'left') : (ny > 0 ? 'down' : 'up');
    if (Math.random() < dt * 9) spawn({ type: 'dust', x: player.x + (Math.random() - 0.5) * 10, y: player.y, vx: -nx * 20, vy: -8, life: 0, max: 0.5 });
}

function updateCamera(dt) {
    const { cam, player } = state;
    if (state.attract) {   // Vorschau: langsamer Schwenk über die Welt
        const c = clampCam(WORLD.W / 2 + Math.cos(state.time * 0.08) * 700 - viewW() / 2, WORLD.H / 2 + Math.sin(state.time * 0.11) * 360 - viewH() / 2);
        cam.x = lerp(cam.x, c.x, Math.min(1, dt * CAMERA.attractLerp)); cam.y = lerp(cam.y, c.y, Math.min(1, dt * CAMERA.attractLerp));
        camMoving = true;
        return;
    }
    const c = clampCam(player.x - viewW() / 2, player.y - CAMERA.lookAhead - viewH() / 2);
    const k = Math.min(1, dt * CAMERA.followLerp);
    cam.x = lerp(cam.x, c.x, k); cam.y = lerp(cam.y, c.y, k);
    camMoving = Math.abs(cam.x - c.x) + Math.abs(cam.y - c.y) > 0.5;
    if (!camMoving) { cam.x = c.x; cam.y = c.y; }   // einrasten, damit die statische Ebene gültig bleibt
}

// Gebäude werden halbdurchsichtig, wenn die Spielfigur dahinter steht
function updateFades() {
    const p = state.player;
    for (const s of state.stations) {
        const top = s.base - s.height - s.depth - (FADE.roofReach[s.style] || FADE.roofReach.default);
        const behind = p.y < s.base + 4 && p.y > top && p.x > s.x - FADE.side && p.x < s.x + s.w + FADE.side;
        s.fade = behind ? Math.min(1, s.fade + FADE.in) : Math.max(0, s.fade - FADE.out);
    }
}

function updateStations() {
    const p = state.player;
    let near = null;
    for (const s of state.stations) if (dist(p.x, p.y, s.door.x, s.door.y) < DOOR_REACH) { near = s; break; }
    state.nearStation = near;
    if (!near) { state.suppressStation = null; return; }
    if (state.paused || state.suppressStation === near.id || p.path) return;
    if (hooks.canAutoEnter(near.id)) World.enter(near);
    else if (hooks.isLocked(near.id)) { state.suppressStation = near.id; hooks.onLocked(near.id); }
}

function updateTokens() {
    if (state.paused) return;
    const p = state.player, SPARKS = 14;
    for (const t of state.tokens) {
        if (t.got || dist(p.x, p.y - 10, t.x, t.y) >= TOKENS.pickupRadius) continue;
        t.got = true;
        for (let i = 0; i < SPARKS; i++) { const a = i / SPARKS * TAU; spawn({ type: 'spark', x: t.x, y: t.y - 14, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0, max: 0.5 }); }
        spawn({ type: 'text', x: t.x, y: t.y - 30, text: '+ ' + t.label, life: 0, max: 1.3 });
        hooks.onCollect(t.label, state.tokens.filter(x => x.got).map(x => x.label), state.tokens.length);
    }
}

function updateNpcs(dt) {
    const p = state.player, N = NPC_WANDER;
    for (const n of state.npcs) {
        if (dist(n.x, n.y, p.x, p.y) < N.talkDistance && !state.paused) {   // Bewohner bleibt stehen und erzählt etwas
            n.moving = false;
            n.dir = Math.abs(p.x - n.x) > Math.abs(p.y - n.y) ? (p.x > n.x ? 'right' : 'left') : (p.y > n.y ? 'down' : 'up');
            if (n.cooldown <= 0) {
                const facts = hooks.facts();
                if (facts.length) { World.say(n, facts[n.fact % facts.length], TIMING.NPC_FACT_MS); n.fact += state.npcs.length; }
                n.cooldown = N.talkCooldown;
            }
        } else {
            n.wait -= dt;
            if (n.wait <= 0 && !n.moving) {
                for (let k = 0; k < 8; k++) {
                    const a = Math.random() * TAU, r = N.minR + Math.random() * (N.maxR - N.minR);
                    const tx = n.home.x + Math.cos(a) * r, ty = n.home.y + Math.sin(a) * r;
                    if (!blocked(tx, ty, 14)) { n.tx = tx; n.ty = ty; n.moving = true; break; }
                }
                n.wait = N.minWait + Math.random() * (N.maxWait - N.minWait);
            }
            if (n.moving) {
                const dx = n.tx - n.x, dy = n.ty - n.y, dd = Math.hypot(dx, dy);
                if (dd < 3) n.moving = false;
                else {
                    const sp = N.speed * dt, nx = n.x + dx / dd * sp, ny = n.y + dy / dd * sp;
                    if (blocked(nx, ny, 12)) n.moving = false; else { n.x = nx; n.y = ny; }
                    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                }
            }
        }
        n.cooldown -= dt;
        n.walk = n.moving ? n.walk + dt * 9 : 0;
    }
}

function updateAmbient(dt) {
    for (const d of state.ducks) d.a += d.speed * dt;
    for (const cl of state.clouds) { cl.x += cl.v * dt; if (cl.x - cl.rx > WORLD.W) cl.x = -cl.rx; }
    const B = BIRDS, birds = state.birds;
    if (Math.random() < dt * B.chancePerSecond && birds.length < B.max) birds.push({ x: -80, y: 200 + Math.random() * (WORLD.H - 400), v: B.speed + Math.random() * B.speedRange, n: 3 + Math.floor(Math.random() * 3) });
    for (let i = birds.length - 1; i >= 0; i--) { birds[i].x += birds[i].v * dt; birds[i].y -= dt * B.climb; if (birds[i].x > WORLD.W + 100) birds.splice(i, 1); }
    const pl = state.plane;
    pl.next -= dt;
    if (pl.t < 0 && pl.next <= 0) pl.t = 0;
    if (pl.t >= 0) { pl.t += dt; if (pl.t > PLANE_FLIGHT_S) { pl.t = -1; pl.next = PLANE_PAUSE_S + Math.random() * PLANE_PAUSE_RANGE_S; } }
    if (Math.random() < dt * FOUNTAIN_DROPS_PER_S) {
        const a = Math.random() * TAU;
        spawn({ type: 'drop', x: FOUNTAIN.x + Math.cos(a) * 4, y: FOUNTAIN.y - 38, vx: Math.cos(a) * (30 + Math.random() * 30), vy: -140 - Math.random() * 60, g: 420, life: 0, max: 0.9, floor: FOUNTAIN.y + 6 + Math.sin(a) * 18 });
    }
    if (hooks.allVisited() && Math.random() < dt * FINALE_GLINTS_PER_S) {   // Glitzern am Finale (Deko, hält die Bildrate nicht hoch)
        const f = state.stations.find(s => s.id === FINALE);
        spawn({ type: 'drop', glint: true, x: f.x + Math.random() * f.w, y: f.base - Math.random() * (f.height + f.depth), vx: 0, vy: -30, life: 0, max: 1, floor: Infinity });
    }
}

function update(dt) {
    state.time += dt;
    updateCamera(dt);
    updatePlayer(dt);
    const r = state.robot, p = state.player;
    r.x = lerp(r.x, p.x + (p.dir === 'left' ? ROBOT_FOLLOW.dx : -ROBOT_FOLLOW.dx), Math.min(1, dt * ROBOT_FOLLOW.lerp));
    r.y = lerp(r.y, p.y + ROBOT_FOLLOW.dy, Math.min(1, dt * ROBOT_FOLLOW.lerp));
    updateFades();
    updateStations();
    updateTokens();
    updateNpcs(dt);
    updateAmbient(dt);
    liveParticles = updateParticles(dt);
    updateBubbles();
}

// ------------------------------------------------------------------ Sprechblasen (DOM über der Welt)
const bubbles = new Map();
const BUBBLE_OFFSET = { robot: 70, person: 74 };
function updateBubbles() {
    bubbles.forEach((b, ent) => {
        if (state.time > b.until) { if (b.shown) { b.el.classList.remove('show'); b.shown = false; } return; }
        const s = worldToScreen(ent.x, ent.y - (ent === state.robot ? BUBBLE_OFFSET.robot : BUBBLE_OFFSET.person));
        b.el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    });
}

// ------------------------------------------------------------------ Schleife: Bildrate nach Lage
// Verdeckt → gar nicht zeichnen · Vorschau → 24 · Leerlauf → 15 · Bewegung → 60 Bilder/s
const busy = (ts) => state.player.moving || !!state.player.path || !!state.joy || liveParticles > 0 || camMoving || ts < wakeUntil;
function frame(ts) {
    requestAnimationFrame(frame);
    if (covered) {
        if (!frozen) { draw(ts, 0); renderer.blurFrame(); frozen = true; }
        last = ts; prevTs = 0;
        return;
    }
    const moving = busy(ts);
    const fps = state.attract ? PERF.ATTRACT_FPS : moving ? 0 : PERF.IDLE_FPS;
    if (fps && ts - lastDraw < 1000 / fps - 2) return;
    if (moving && !state.attract) adapt(ts); else prevTs = 0;
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    draw(ts, dt);
}
function draw(ts, dt) {
    lastDraw = ts; frames++;
    update(dt);
    // Fahrende Kamera: geringere Pixeldichte; kurz nach dem Anhalten wieder scharf (siehe renderer.setMotion)
    if (camMoving) lastCamMove = ts;
    if (renderer.setMotion(camMoving || ts - lastCamMove < PERF.MOTION_SETTLE_MS)) frozen = false;
    renderer.setInfo(renderInfo());
    renderer.render(true);
    hooks.onFrame(ts);
}
// Läuft die Welt trotz Bewegung dauerhaft unter ~38 Bildern/s, wird die Auflösung schrittweise gesenkt.
function adapt(ts) {
    if (prevTs) {
        gapEma = gapEma ? gapEma * 0.95 + (ts - prevTs) * 0.05 : ts - prevTs;
        if (++busyFrames > PERF.ADAPT_FRAMES && gapEma > PERF.SLOW_GAP_MS) { renderer.lowerResolution(); busyFrames = 0; gapEma = 0; }
    }
    prevTs = ts;
}
function renderInfo() {
    const nextId = hooks.nextId();
    return {
        t: hooks.t, lang: hooks.lang(), firm: hooks.firm(),
        nextStation: nextId ? state.stations.find(s => s.id === nextId) : null,
        isVisited: hooks.isVisited, isLocked: hooks.isLocked
    };
}

// ------------------------------------------------------------------ Öffentliche Schnittstelle
export const World = {
    W: WORLD.W, H: WORLD.H,
    get stations() { return state.stations; },
    get player() { return state.player; },
    get nearStation() { return state.nearStation; },
    get paused() { return state.paused; },
    set paused(v) { state.paused = v; },
    get frames() { return frames; },

    init(canvas, opts) {
        hooks = { ...hooks, ...opts.hooks };
        buildWorld({ titles: opts.titles, skillTokens: opts.skillTokens, collected: opts.collected || [] });
        renderer.setInfo(renderInfo());
        renderer.initRenderer(canvas);
        renderer.collectStatic();
        buildGrid();
        setupInput(canvas, {
            wake: () => World.wake(),
            enterNear: () => World.enter(state.nearStation),
            tap: (sx, sy) => { const p = screenToWorld(sx, sy); World.walkToPoint(p.x, p.y); },
            hover: (sx, sy) => { const p = screenToWorld(sx, sy), h = stationAt(p.x, p.y); if (h !== state.hoverStation) World.wake(); state.hoverStation = h; return !!h; },
            stopWalking, unlockAudio: () => hooks.unlockAudio()
        });
        window.addEventListener('resize', () => { renderer.resize(); frozen = false; World.wake(); });
        state.cam.x = clampCam(WORLD.W / 2 - viewW() / 2, 0).x; state.cam.y = clampCam(0, WORLD.H / 2 - viewH() / 2).y;
        requestAnimationFrame((ts) => { last = ts; frame(ts); });
    },
    /** Spiel beginnt: Kamera folgt der Spielfigur */
    begin() { state.attract = false; state.paused = false; World.wake(); },
    /** Titel der Stationen (z. B. nach Sprachwechsel) aktualisieren und alle Bilder neu zeichnen */
    refresh(titles) {
        if (titles) state.stations.forEach(s => { s.title = titles[s.id] || s.title; });
        renderer.invalidate(); frozen = false;
    },
    setPalette(p) { const g = renderer.setPalette(p); frozen = false; return g; },
    groundCanvas: () => renderer.groundCanvas(),
    /** Ist die Welt von einem Dialog verdeckt? Dann wird nicht gezeichnet. */
    setCovered(v) { covered = !!v; if (!covered) { frozen = false; World.wake(); } },
    wake(ms = PERF.WAKE_MS) { wakeUntil = performance.now() + ms; },
    walkToStation(id) {
        const s = state.stations.find(st => st.id === id);
        if (!s) return;
        markFirstMove();
        if (dist(state.player.x, state.player.y, s.door.x, s.door.y) < 60) { World.enter(s); return; }
        const path = findPath(state.player.x, state.player.y, s.door.x, s.door.y + 6);
        if (path) { state.player.path = path; state.player.pendingStation = s.id; spawnRing(s.door.x, s.door.y); World.wake(); }
    },
    walkToPoint(x, y) {
        if (state.paused) return;
        const s = stationAt(x, y);
        if (s) { World.walkToStation(s.id); return; }
        markFirstMove();
        const path = findPath(state.player.x, state.player.y, x, y);
        if (path) { state.player.path = path; state.player.pendingStation = null; spawnRing(x, y); World.wake(); }
    },
    enter(s) {
        if (!s || state.paused) return;
        stopWalking();
        for (const k in state.keys) state.keys[k] = false;
        state.suppressStation = s.id;
        if (hooks.isLocked(s.id)) { hooks.onLocked(s.id); return; }
        hooks.onEnterStation(s.id);
    },
    teleportTo(id) {
        const s = state.stations.find(st => st.id === id);
        if (!s) return;
        state.player.x = s.door.x; state.player.y = s.door.y + 20;
        state.suppressStation = s.id;
    },
    say(ent, text, ms = TIMING.BUBBLE_MS) {
        let b = bubbles.get(ent);
        if (!b) {
            const el = document.createElement('div');
            el.className = 'bubble';
            $('#bubbles').appendChild(el);
            b = { el }; bubbles.set(ent, b);
        }
        b.el.textContent = text;
        b.until = state.time + ms / 1000;
        b.el.classList.add('show'); b.shown = true;
        World.wake(100);
    },
    sayRobot: (text, ms) => World.say(state.robot, text, ms),
    sayPlayer: (text, ms) => World.say(state.player, text, ms),
    confettiOnPlayer(n) { confetti(state.player.x, state.player.y - 60, n); },
    isLocked: (id) => hooks.isLocked(id),
    view: () => ({ x: state.cam.x, y: state.cam.y, w: viewW(), h: viewH() }),
    worldToScreen, screenToWorld,
    tokenCount: () => state.tokens.length,
    tokensGot: () => state.tokens.filter(t => t.got).map(t => t.label),
    debug: { state, renderer: renderer.debug, findPath, blocked, PLAYER_RADIUS }
};

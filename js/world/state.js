// Gemeinsamer Zustand der Welt. Alle Welt-Module lesen und schreiben hier – nichts davon ist global.
import { SPAWN } from '../config/layout.js';
import { PLAYER_LOOK } from '../config/theme.js';

export const state = {
    time: 0,                 // Weltzeit in Sekunden (treibt alle Animationen)
    paused: true,            // keine Eingaben/Bewegung (Dialog offen oder Startbildschirm)
    attract: true,           // Vorschau-Kamera hinter dem Startbildschirm
    stations: [], trees: [], props: [], npcs: [], ducks: [], tokens: [], particles: [], clouds: [], birds: [],
    player: null, robot: null,
    plane: { t: -1, next: 6 },          // Startendes Flugzeug: t ≥ 0 während des Starts
    nearStation: null, hoverStation: null, suppressStation: null,
    firstMoveDone: false,
    cam: { x: 400, y: 900 },
    joy: null,                          // Touch-Joystick { x, y } in -1…1
    keys: {}
};

export function createPlayer() {
    return { x: SPAWN.x, y: SPAWN.y, dir: 'up', walk: 0, moving: false, path: null, pendingStation: null, look: PLAYER_LOOK, stuck: 0 };
}
export function createRobot() {
    return { x: SPAWN.x - 40, y: SPAWN.y + 10 };
}

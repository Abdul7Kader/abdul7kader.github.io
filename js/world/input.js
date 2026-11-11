// Eingaben in der Welt: Tastatur (WASD/Pfeile, E/Enter), Maus (Klick = hinlaufen, Hover über Gebäuden)
// und Touch (Ziehen = Joystick, Tippen = hinlaufen).
import { $ } from '../core/dom.js';
import { state } from './state.js';

const DRAG_START_PX = 14;      // ab dieser Strecke wird aus einem Tippen ein Ziehen (Joystick)
const JOY_RANGE_PX = 52;       // voller Ausschlag des Joysticks
const KNOB_TRAVEL_PX = 40;
const MOVE_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
const ENTER_KEYS = ['e', 'Enter', ' '];

/**
 * handlers: { wake(), enterNear(), tap(screenX, screenY), hover(screenX, screenY) → bool (über einem Gebäude?),
 *             stopWalking(), unlockAudio() }
 */
export function setupInput(canvas, handlers) {
    const keyName = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener('keydown', (e) => {
        if (state.paused) return;
        handlers.wake();
        const k = keyName(e);
        if (MOVE_KEYS.includes(e.key)) e.preventDefault();
        state.keys[k] = true;
        if (ENTER_KEYS.includes(k) && state.nearStation) handlers.enterNear();
    });
    window.addEventListener('keyup', (e) => { state.keys[keyName(e)] = false; });
    window.addEventListener('blur', () => { for (const k in state.keys) state.keys[k] = false; });

    const joyEl = $('#joystick'), knob = $('#joystick-knob');
    let down = null;
    canvas.addEventListener('pointerdown', (e) => {
        if (state.paused) return;
        handlers.unlockAudio();
        handlers.wake();
        down = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType, drag: false };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* nicht unterstützt */ }
    });
    canvas.addEventListener('pointermove', (e) => {
        if (!down || down.id !== e.pointerId) {
            if (e.pointerType === 'mouse') canvas.style.cursor = handlers.hover(e.clientX, e.clientY) ? 'pointer' : 'default';
            return;
        }
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.drag && Math.hypot(dx, dy) > DRAG_START_PX && down.type !== 'mouse') {
            down.drag = true;
            state.joy = { x: 0, y: 0 };
            joyEl.style.left = down.x + 'px'; joyEl.style.top = down.y + 'px';
            joyEl.classList.remove('hidden');
            handlers.stopWalking();
        }
        if (down.drag) {
            const len = Math.hypot(dx, dy), m = Math.min(len, JOY_RANGE_PX);
            state.joy.x = len ? dx / len * (m / JOY_RANGE_PX) : 0;
            state.joy.y = len ? dy / len * (m / JOY_RANGE_PX) : 0;
            knob.style.transform = `translate(${state.joy.x * KNOB_TRAVEL_PX}px, ${state.joy.y * KNOB_TRAVEL_PX}px)`;
            handlers.wake();
        }
    });
    const end = (e) => {
        if (!down || down.id !== e.pointerId) return;
        if (!down.drag && !state.paused) handlers.tap(e.clientX, e.clientY);
        down = null; state.joy = null;
        joyEl.classList.add('hidden');
        knob.style.transform = '';
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
}

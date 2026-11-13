// Dialoge über der Welt (Station, Kapitelübersicht, Lebenslauf, Suche, Kontakt).
// Solange einer offen ist, ist die Welt pausiert und wird nicht neu gezeichnet.
// Barrierefreiheit: Tab bleibt im obersten Dialog, beim Schließen kehrt der Fokus dorthin zurück, wo er vorher war.
import { $ } from '../core/dom.js';
import { emit } from '../core/events.js';
import { World } from '../world/world.js';
import { progress } from '../app/progress.js';

// Reihenfolge = Vorrang: oben liegende Dialoge zuerst (Esc schließt den obersten)
export const OVERLAYS = ['contact', 'backstage', 'station', 'journey', 'cv', 'palette'];
export const isOpen = (id) => !$('#' + id).classList.contains('hidden');
/** Oberster offener Dialog oder undefined */
export const topOverlay = () => OVERLAYS.find(isOpen);

const FOCUS_CHECK_MS = 120;   // die Dialoge setzen ihren Fokus selbst (z. B. aufs Eingabefeld) – erst danach eingreifen
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const returnFocus = new Map();

const focusables = (root) => Array.from(root.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'));

export function showOverlay(id) {
    const el = $('#' + id);
    if (!returnFocus.has(id)) returnFocus.set(id, document.activeElement);
    el.classList.remove('hidden');
    World.paused = true;
    World.setCovered(true);
    document.body.classList.add('is-covered');
    setTimeout(() => {
        if (!isOpen(id) || el.contains(document.activeElement)) return;
        const panel = el.querySelector('.panel, .palette, .cv-sheet') || el;
        if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
        panel.focus({ preventScroll: true });
    }, FOCUS_CHECK_MS);
    emit('overlay:changed', id);
}

export function hideOverlay(id) {
    $('#' + id).classList.add('hidden');
    const covered = OVERLAYS.some(isOpen);
    World.setCovered(covered);
    document.body.classList.toggle('is-covered', covered);
    if (!covered && !isOpen('start') && progress.started) World.paused = false;
    const back = returnFocus.get(id);
    returnFocus.delete(id);
    if (back && back.isConnected && back.offsetParent !== null && back !== document.body) back.focus({ preventScroll: true });
    emit('overlay:changed', null);
}

/** Tab und Umschalt+Tab bleiben im obersten offenen Dialog */
export function setupFocusTrap() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const id = topOverlay();
        if (!id) return;
        const root = $('#' + id), list = focusables(root);
        if (!list.length) { e.preventDefault(); return; }
        const first = list[0], last = list[list.length - 1], inside = root.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
    });
}

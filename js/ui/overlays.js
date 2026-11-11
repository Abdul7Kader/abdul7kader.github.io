// Dialoge über der Welt (Station, Kapitelübersicht, Lebenslauf, Suche, Kontakt).
// Solange einer offen ist, ist die Welt pausiert und wird nicht neu gezeichnet.
import { $ } from '../core/dom.js';
import { emit } from '../core/events.js';
import { World } from '../world/world.js';
import { progress } from '../app/progress.js';

// Reihenfolge = Vorrang: oben liegende Dialoge zuerst (Esc schließt den obersten)
export const OVERLAYS = ['contact', 'station', 'journey', 'cv', 'palette'];
export const isOpen = (id) => !$('#' + id).classList.contains('hidden');
/** Oberster offener Dialog oder undefined */
export const topOverlay = () => OVERLAYS.find(isOpen);

export function showOverlay(id) {
    $('#' + id).classList.remove('hidden');
    World.paused = true;
    World.setCovered(true);
    document.body.classList.add('is-covered');
    emit('overlay:changed', id);
}
export function hideOverlay(id) {
    $('#' + id).classList.add('hidden');
    const covered = OVERLAYS.some(isOpen);
    World.setCovered(covered);
    document.body.classList.toggle('is-covered', covered);
    if (!covered && !isOpen('start') && progress.started) World.paused = false;
    emit('overlay:changed', null);
}

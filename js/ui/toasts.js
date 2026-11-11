// Kurze Meldungen oben in der Mitte (z. B. „Alle Kapitel entdeckt“).
import { $, esc } from '../core/dom.js';
import { TIMING } from '../config/timing.js';

function show(el, ms) {
    const box = $('#toasts');
    while (box.children.length >= TIMING.MAX_TOASTS) box.firstChild.remove();
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), TIMING.TOAST_FADE_MS); }, ms);
}
/** Erfolg mit Symbol, Überschrift und Titel (Titel wird als Text eingesetzt) */
export function achieve(icon, kicker, title, ms = TIMING.ACHIEVEMENT_MS, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.innerHTML = `<span class="t-ic">${icon}</span><span><small>${esc(kicker)}</small><strong>${esc(title)}</strong></span>`;
    show(el, ms);
}

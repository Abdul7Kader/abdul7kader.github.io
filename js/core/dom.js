// DOM-Helfer: Elemente finden, Text sicher in HTML einsetzen.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Text für innerHTML unschädlich machen. */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

/** Wartet ms Millisekunden. */
export const wait = (ms) => new Promise(r => setTimeout(r, ms));

/** Fokus setzen, ohne die Seite zu scrollen (nur, wenn das Element noch im Dokument ist). */
export function focusLater(el, ms = 50) {
    setTimeout(() => { if (el && el.isConnected) el.focus({ preventScroll: true }); }, ms);
}

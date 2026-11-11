// Fähigkeiten und Einstellungen des Geräts bzw. der Adresszeile.

const mq = (q) => !!(window.matchMedia && window.matchMedia(q).matches);

/** Nutzer möchte weniger Bewegung (Systemeinstellung) */
export const reducedMotion = mq('(prefers-reduced-motion: reduce)');
/** Gerät mit Touchscreen */
export const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

const MAX_PARAM_LENGTH = 40;
const params = new URLSearchParams(location.search);
/** Wert aus der Adresszeile (?firma=…), gekürzt und ohne Leerzeichen am Rand */
export function param(key) {
    const v = params.get(key);
    return v ? v.trim().slice(0, MAX_PARAM_LENGTH) : '';
}

/** Kleiner Bildschirm (Handy hochkant) */
export const isNarrow = () => window.innerWidth < 640;

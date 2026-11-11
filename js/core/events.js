// Kleiner Ereignis-Bus: Module melden Ereignisse, ohne einander direkt zu kennen.
// Beispiele: 'station:visited', 'lang:changed', 'theme:changed', 'overlay:changed'

const listeners = new Map();

export function on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type).delete(fn);
}

export function emit(type, detail) {
    const set = listeners.get(type);
    if (set) for (const fn of Array.from(set)) fn(detail);
}

// Speicher für Einstellungen und Spielstand.
// Der Spielstand (Kapitel, Sterne, Bestwerte, Firmenname) lebt nur im Arbeitsspeicher: Jedes Neuladen startet frisch.
// Dauerhaft im Browser gemerkt werden nur Einstellungen (Ton, Musik, Sprache, Farbmodus).

const PREFIX = 'cvworld:';
const PERSISTENT = ['sfx', 'music', 'lang', 'theme'];
const memory = new Map();

// Alte Spielstände früherer Versionen aufräumen
try {
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith(PREFIX) && !PERSISTENT.includes(k.slice(PREFIX.length))) localStorage.removeItem(k);
    });
} catch (e) { /* privater Modus */ }

export const store = {
    get(key, fallback) {
        if (!PERSISTENT.includes(key)) return memory.has(key) ? memory.get(key) : fallback;
        try {
            const v = localStorage.getItem(PREFIX + key);
            return v == null ? fallback : JSON.parse(v);
        } catch (e) { return fallback; }
    },
    set(key, value) {
        if (!PERSISTENT.includes(key)) { memory.set(key, value); return; }
        try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* privater Modus */ }
    }
};

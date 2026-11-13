// Stellschrauben für Rechenzeit und Bildrate. Gemessen mit tests/perf.mjs.

export const WORLD_PERF = {
    MAX_DPR: 1.5,             // höchste Pixeldichte der Welt (Retina rechnet sonst die vierfache Fläche)
    MIN_DPR: 1,               // so weit wird bei Überlast automatisch heruntergeregelt
    DPR_STEP: 0.25,
    MOTION_DPR: 1,            // Pixeldichte, solange die Kamera fährt (im Stand wieder volle Schärfe)
    MOTION_SETTLE_MS: 250,    // so lange nach dem Anhalten, bevor wieder scharf gezeichnet wird
    IDLE_FPS: 15,             // Bildrate, wenn nur Kleinigkeiten sich bewegen (Bewohner, Wasser, Wolken)
    ATTRACT_FPS: 24,          // Vorschau hinter dem Startbildschirm
    SLOW_GAP_MS: 26,          // gemessener Bildabstand, ab dem die Welt als überlastet gilt
    ADAPT_FRAMES: 90,         // so viele bewegte Bilder werden gemittelt, bevor heruntergeregelt wird
    WAKE_MS: 400,             // nach einer Eingabe so lange mit voller Bildrate zeichnen
    GROUND_RES_DESKTOP: 1.25, // Auflösung der vorgerenderten Bodenebene (Pixel je Welteinheit)
    GROUND_RES_TOUCH: 1,
    GROUND_TILE: 256,         // Bodenkachel in Welteinheiten
    GROUND_TILE_MAX: 56,      // höchstens so viele Kacheln im Speicher
    STATIC_MARGIN: 220,       // Rand der statischen Ebene um den sichtbaren Ausschnitt (Welteinheiten)
    COVER_BLUR_PX: 6,         // Unschärfe der angehaltenen Welt hinter Dialogen
    MAX_PARTICLES: 600,
    MINIMAP_INTERVAL_MS: 200  // Minimap: 5 Bilder pro Sekunde
};

export const GAME_PERF = {
    MAX_DPR: 1.5,
    MAX_BACKING_PX: 1500,      // höchstens so viele Bildpunkte Breite, auch wenn das Spiel den ganzen Bildschirm füllt
    IDLE_FRAME_MS: 1000 / 30,  // Start- und Ergebniskarte der Minispiele
    MAX_PARTICLES: 500
};

export const WIDGET_FRAME_MS = 1000 / 30;  // Projekt-Viertel u. Ä.

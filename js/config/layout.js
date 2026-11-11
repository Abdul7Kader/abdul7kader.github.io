// Aufbau der Spielwelt (alle Angaben in Welteinheiten; 1 Einheit ≈ 1 CSS-Pixel bei Zoom 1).
// Wer die Welt umbauen möchte, ändert nur diese Datei.

/** Größe der ganzen Welt */
export const WORLD = { W: 2600, H: 1800 };

/** Kapitel in Reihenfolge des Lebenslaufs; das letzte ist das Finale (öffnet sich erst nach allen anderen). */
export const CHAPTERS = ['arrival', 'school', 'career', 'lab', 'projects', 'lake', 'finale'];
export const FINALE = 'finale';

/**
 * Gebäude der Stationen.
 * x = linke Kante, base = Unterkante (Boden vor der Tür), w = Breite,
 * depth = Tiefe der Dachfläche (Draufsicht), height = Höhe der Fassade, style = Zeichenfunktion.
 */
export const STATIONS = [
    { id: 'arrival', emoji: '✈️', style: 'airport', x: 160, base: 1470, w: 360, depth: 120, height: 96 },
    { id: 'school', emoji: '🎓', style: 'school', x: 330, base: 760, w: 380, depth: 130, height: 120 },
    { id: 'career', emoji: '🏢', style: 'career', x: 900, base: 560, w: 360, depth: 110, height: 190 },
    { id: 'lab', emoji: '💻', style: 'lab', x: 1500, base: 620, w: 320, depth: 120, height: 116 },
    { id: 'projects', emoji: '🏗️', style: 'construction', x: 1500, base: 1400, w: 320, depth: 120, height: 86 },
    { id: 'lake', emoji: '🏄', style: 'boathouse', x: 1900, base: 1420, w: 240, depth: 90, height: 80 },
    { id: 'finale', emoji: '🏆', style: 'finale', x: 2060, base: 470, w: 340, depth: 120, height: 146 }
];
/** Die Tür liegt mittig unter dem Gebäude, so weit davor: */
export const DOOR_OFFSET_Y = 30;
/** So nah muss die Spielfigur an der Tür sein, um eintreten zu können */
export const DOOR_REACH = 62;
/** Abstand, ab dem ein Klick auf die Minimap eine Station statt eines Punktes ansteuert */
export const MINIMAP_SNAP = 190;

/** Wege als Linienzüge [[x, y], …] */
export const ROADS = [
    [[340, 1500], [340, 1560], [770, 1560], [770, 1420]],     // Flughafen → Kreuzung
    [[770, 1420], [1010, 1420], [1250, 1080]],                  // → Marktplatz
    [[1120, 950], [520, 950], [520, 780]],                      // Marktplatz → Bildungsweg
    [[1250, 820], [1250, 690], [1080, 690], [1080, 580]],       // → Business-Viertel
    [[1250, 690], [1660, 690], [1660, 640]],                    // → Tech-Lab
    [[1380, 950], [1440, 950], [1440, 1490], [1660, 1490], [1660, 1420]],  // → Projekt-Baustelle
    [[1660, 1490], [2020, 1490], [2020, 1440]],                 // → Bootshaus
    [[1660, 690], [1960, 690], [1960, 545], [2230, 545], [2230, 490]],     // → Finale auf dem Hügel
    [[2020, 1490], [2300, 1490], [2420, 1300], [2470, 1180]]    // Rundweg am See
];
export const ROAD_WIDTH = 62;

export const PLAZA = { x: 1250, y: 950, r: 138 };
export const FOUNTAIN = { x: 1250, y: 950, r: 54 };
export const LAKE = { x: 2260, y: 1000, rx: 235, ry: 170 };
export const HILL = { x: 2230, y: 410, rx: 380, ry: 220 };
export const RUNWAY = { x: 90, y: 1612, w: 940, h: 74 };
export const SPAWN = { x: 340, y: 1565 };

/** Startpunkte der Bewohner (jeder läuft in seiner Umgebung herum) */
export const NPC_HOMES = [[1150, 1080], [1330, 640], [960, 1500], [1880, 1300], [600, 1000]];
export const NPC_WANDER = { minR: 30, maxR: 120, speed: 55, minWait: 2, maxWait: 6, talkDistance: 95, talkCooldown: 9 };

/** Dekoration */
export const PROPS = {
    signpost: { x: PLAZA.x + 112, y: PLAZA.y + 110 },
    benches: [{ x: PLAZA.x - 100, y: PLAZA.y - 116 }, { x: PLAZA.x + 100, y: PLAZA.y - 116 }],
    parkedPlane: { x: 860, y: 1650 },
    dock: { x: 2190, y: 1150 },
    lampSpacing: 240                 // eine Laterne etwa alle 240 Einheiten Weg
};

/** Bäume */
export const FOREST = { maxTrees: 260, attempts: 900, edgeStep: 58, minGap: 46, seed: 20141031 };

/** Kollisionsraster für die Wegfindung */
export const PATH_CELL = 20;
export const PLAYER_RADIUS = 13;

/** Spielfigur */
export const PLAYER = { speed: 235, stuckFrames: 40, arriveDistance: 6 };

/** Kamera und Zoom (abhängig von der Bildschirmgröße) */
export const CAMERA = { zoomDivisor: 1000, minZoom: 0.55, maxZoom: 1.12, followLerp: 5, lookAhead: 40, attractLerp: 0.8 };

/** Skill-Sterne entlang der Wege */
export const TOKENS = { max: 24, pickupRadius: 34, minDoorDistance: 90, minSpawnDistance: 60 };

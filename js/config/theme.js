// Farben für alles, was auf Canvas gezeichnet wird (Welt, Minimap, Beschriftungen).
// Farben der HTML-Oberfläche stehen als CSS-Variablen in css/tokens.css.
// Jede Farbe hat einen Rollen-Namen; der Nachtmodus (Dark Mode) ersetzt nur diese Werte.

/** Akzentfarben je Station (Verlauf im Dialogkopf, Markierungen in Minimap und HUD) */
export const STATION_COLORS = {
    arrival: ['#3a86ff', '#22b8e6'],
    school: ['#ff7a3d', '#ffb02e'],
    career: ['#0fa89a', '#21c7a8'],
    lab: ['#16a34a', '#0ea5a4'],
    projects: ['#f59e0b', '#f0532f'],
    lake: ['#0891b2', '#3a86ff'],
    finale: ['#f59e0b', '#ef4462'],
    github: ['#24292f', '#2da44e']
};
export const stationColors = (id) => STATION_COLORS[id] || STATION_COLORS.finale;

/** Abzeichen je Station als Linien-Icon (HUD, Startkarte, Dialog, Urkunde, Kapitelübersicht) – siehe core/icons.js */
export const BADGE_ICONS = { arrival: 'globe', school: 'school', career: 'users', lab: 'cpu', projects: 'rocket', lake: 'heart', finale: 'trophy' };

/** Bewohner der Welt (Haut, Haare, Kleidung) */
export const NPC_LOOKS = [
    { skin: '#f1c27d', hair: '#e2b04a', jacket: '#e76f51', pants: '#3d405b', shirt: '#fff' },
    { skin: '#8d5524', hair: '#1b1b1b', jacket: '#2a9d8f', pants: '#264653', shirt: '#fff' },
    { skin: '#ffdbac', hair: '#7b3f00', jacket: '#9b5de5', pants: '#22223b', shirt: '#fff' },
    { skin: '#c68642', hair: '#2b2b2b', jacket: '#f4a261', pants: '#3a5a40', shirt: '#fff' },
    { skin: '#e0ac69', hair: '#b5651d', jacket: '#457b9d', pants: '#1d3557', shirt: '#fff' }
];
/** Abdul als Spielfigur: Anzug, Bart, Brille */
export const PLAYER_LOOK = { skin: '#e2b08c', hair: '#2e211a', jacket: '#1d2741', pants: '#262b38', shirt: '#fbfbfb', beard: '#3d2c22', glasses: true, hero: true, lapel: '#2c3a5e' };

/** Welt bei Tag */
export const WORLD_DAY = {
    void: '#4f8a45',                 // Fläche außerhalb der Welt
    grass: '#8cce6c',
    grassPatches: ['120,190,90', '160,215,120'],
    grassSpeckles: ['rgba(90,160,70,0.35)', 'rgba(190,235,150,0.35)'],
    grassBlades: ['#6db455', '#79c060'],
    flowers: ['#ffffff', '#ffd23f', '#ff6b9a', '#b388ff', '#ff8c42'],
    flowerCenter: '#ffcf33',
    hill: ['rgba(200,236,150,0.95)', 'rgba(170,222,128,0.6)', 'rgba(150,210,110,0)'],
    hillEdge: 'rgba(70,120,50,0.18)',
    roadEdge: '#c4ab7b', road: '#ead9ae', roadDash: 'rgba(255,255,255,0.25)',
    plaza: '#e6dfcf', plazaRings: '#d2c7b0',
    runway: '#5b6170', runwayMarks: '#ffffff',
    shore: '#e8d8a4', waterDeep: '#2f8fc4', waterShallow: '#5cc0e6', waves: 'rgba(255,255,255,0.45)',
    shadow: 'rgba(25,45,20,0.25)',
    cloudShadow: '20,40,60',
    bird: '#2b2b33',
    nextRing: '255,170,60', playerRing: '255,138,61',
    label: { normal: 'rgba(27,42,74,0.9)', visited: 'rgba(34,139,94,0.94)', next: 'rgba(255,138,61,0.96)', locked: 'rgba(90,98,120,0.92)', text: '#fff', glow: 'rgba(255,160,40,0.9)' },
    hint: { bg: '#ffffff', text: '#1b2a4a' },
    tokenLabel: 'rgba(40,60,30,0.75)',
    pickupText: '#e08a00',
    edgeArrow: '#ff8a3d',
    night: null                      // Tag: keine Abdunklung
};

/**
 * Welt bei Nacht (Dark Mode). Boden und Wege bekommen eigene Farben; Bäume, Gebäude und Requisiten werden beim
 * Erzeugen ihrer Sprites einmal blau abgedunkelt (night.tint) – das kostet pro Bild nichts. Laternen leuchten
 * (night.lampGlow), Beschriftungen bleiben hell und gut lesbar.
 */
export const WORLD_NIGHT = {
    ...WORLD_DAY,
    void: '#14261b',
    grass: '#3e6a3c',
    grassPatches: ['52,96,56', '72,120,70'],
    grassSpeckles: ['rgba(26,56,34,0.4)', 'rgba(120,160,120,0.2)'],
    grassBlades: ['#33603a', '#3c6b40'],
    flowers: ['#c9d2e6', '#c9a93a', '#b45478', '#8c6cc8', '#b8693a'],
    flowerCenter: '#c9a42a',
    hill: ['rgba(80,120,78,0.95)', 'rgba(70,110,70,0.6)', 'rgba(60,100,64,0)'],
    hillEdge: 'rgba(0,10,0,0.25)',
    roadEdge: '#6d6250', road: '#857b64', roadDash: 'rgba(255,255,255,0.12)',
    plaza: '#77736a', plazaRings: '#66625a',
    runway: '#2c303b', runwayMarks: '#c8cdd8',
    shore: '#7f775f', waterDeep: '#173f63', waterShallow: '#24618a', waves: 'rgba(190,220,255,0.3)',
    shadow: 'rgba(0,0,12,0.35)',
    cloudShadow: '0,0,24',
    bird: '#c9d1e6',
    hint: { bg: '#1c2442', text: '#e7ebf7' },
    tokenLabel: 'rgba(225,232,255,0.8)',
    night: { tint: 'rgba(14,22,64,0.42)', lampGlow: '255,214,120' }
};

/** Minimap */
export const MINIMAP = { veil: 'rgba(255,255,255,0.12)', visitedFill: '#fff', visitedStroke: '#16a34a', viewport: 'rgba(11,18,40,0.55)', player: '#ff7a3d', playerHalo: 'rgba(255,122,61,0.35)' };

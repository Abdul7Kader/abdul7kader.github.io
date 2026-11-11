// Spielstand: entdeckte Kapitel, Firmenname, Sterne und Bestwerte der Minispiele.
// Lebt nur im Arbeitsspeicher (siehe core/store.js) – jedes Neuladen startet frisch.
import { CHAPTERS, FINALE } from '../config/layout.js';
import { store } from '../core/store.js';
import { param } from '../core/env.js';
import { emit } from '../core/events.js';

const MAX_FIRM_LENGTH = 40;
export const MAX_STARS_PER_GAME = 3;

export const progress = {
    order: CHAPTERS,
    /** Kapitel ohne Finale */
    chapters: CHAPTERS.filter(id => id !== FINALE),
    started: false,
    visited: new Set(),
    firm: param('firma') || param('company') || '',

    get doneCount() { return this.chapters.filter(id => this.visited.has(id)).length; },
    /** Nächstes offenes Kapitel (zuletzt das Finale) */
    nextId() { return this.chapters.find(id => !this.visited.has(id)) || (this.visited.has(FINALE) ? null : FINALE); },
    allVisited() { return this.chapters.every(id => this.visited.has(id)); },
    isLocked(id) { return id === FINALE && !this.allVisited(); },
    markVisited(id) {
        if (this.visited.has(id)) return;
        const wasAll = this.allVisited();
        this.visited.add(id);
        emit('progress:visited', { id, completedAll: !wasAll && this.allVisited() && id !== FINALE });
    },
    setFirm(name) {
        this.firm = String(name || '').trim().slice(0, MAX_FIRM_LENGTH);
        emit('firm:changed', this.firm);
    },
    stars: (id) => store.get('stars:' + id, 0),
    best: (id) => store.get('best:' + id, 0),
    get totalStars() { return this.chapters.reduce((a, id) => a + this.stars(id), 0); }
};

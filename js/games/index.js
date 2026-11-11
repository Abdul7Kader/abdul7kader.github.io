// Alle Minispiele, nach Station.
import stampJet from './stamp-jet.js';
import wordNinja from './word-ninja.js';
import promptFactory from './prompt-factory.js';
import ideaRain from './idea-rain.js';
import projectStacker from './project-stacker.js';
import supSlalom from './sup-slalom.js';

export const GAMES = Object.fromEntries([stampJet, wordNinja, promptFactory, ideaRain, projectStacker, supSlalom].map(s => [s.id, s]));
export { mountGame } from './engine.js';

// Synthetischer Sound (keine Audiodateien nötig). Effekte leise, Musik standardmäßig aus.
// Der AudioContext entsteht erst bei der ersten Nutzer-Aktion (Browser-Vorgabe).
import { store } from './store.js';

const MASTER_VOLUME = 0.5;
const MUSIC_VOLUME = 0.9;
const MUSIC_FADE_IN_S = 1.5, MUSIC_FADE_OUT_S = 0.6;
const MUSIC_STEP_MS = 240;            // Länge eines Musik-Schritts
const MUSIC_STEPS_PER_CHORD = 16;
const MUSIC_NOTE_CHANCE = 0.55;

let ctx = null, master = null, musicGain = null, musicTimer = null;
const state = { sfx: store.get('sfx', true), music: store.get('music', false) };

function ensure() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(ctx.destination);
        musicGain = ctx.createGain();
        musicGain.gain.value = 0;
        musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
}

/** Einzelner Ton mit kurzer Hüllkurve */
function tone(freq, start, dur, { type = 'sine', vol = 0.12, to = 0, dest = master } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (to) o.frequency.exponentialRampToValueAtTime(to, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.02, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(dest);
    o.start(start); o.stop(start + dur + 0.05);
}

// Effekte: Frequenzen in Hz, Dauer in Sekunden
const SFX = {
    click: (t) => tone(660, t, 0.07, { type: 'triangle', vol: 0.06 }),
    coin: (t) => { tone(988, t, 0.08, { type: 'square', vol: 0.04 }); tone(1319, t + 0.07, 0.18, { type: 'square', vol: 0.04 }); },
    open: (t) => { tone(392, t, 0.12, { vol: 0.08 }); tone(523, t + 0.08, 0.16, { vol: 0.08 }); },
    good: (t) => { tone(523, t, 0.1, { type: 'triangle', vol: 0.1 }); tone(784, t + 0.08, 0.16, { type: 'triangle', vol: 0.1 }); },
    bad: (t) => tone(220, t, 0.18, { type: 'sawtooth', vol: 0.035, to: 160 }),
    pop: (t) => tone(300, t, 0.09, { type: 'triangle', vol: 0.1, to: 900 }),
    whoosh: (t) => tone(200, t, 0.35, { vol: 0.06, to: 800 }),
    step: (t) => tone(120, t, 0.04, { type: 'triangle', vol: 0.02 }),
    badge: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.22, { type: 'triangle', vol: 0.09 })),
    bonus: (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.12, { type: 'square', vol: 0.035 })),
    combo: (t) => { tone(659, t, 0.08, { type: 'triangle', vol: 0.09 }); tone(988, t + 0.06, 0.08, { type: 'triangle', vol: 0.09 }); tone(1319, t + 0.12, 0.18, { type: 'triangle', vol: 0.09 }); },
    count: (t) => tone(440, t, 0.12, { type: 'square', vol: 0.04 }),
    go: (t) => tone(880, t, 0.3, { type: 'square', vol: 0.05 }),
    tick: (t) => tone(1046, t, 0.05, { type: 'square', vol: 0.03 }),
    slice: (t) => tone(1400, t, 0.09, { type: 'sawtooth', vol: 0.025, to: 500 }),
    boom: (t) => { tone(160, t, 0.4, { type: 'sawtooth', vol: 0.07, to: 40 }); tone(90, t, 0.5, { type: 'square', vol: 0.05, to: 30 }); },
    perfect: (t) => { tone(1047, t, 0.1, { type: 'triangle', vol: 0.1 }); tone(1568, t + 0.07, 0.2, { type: 'triangle', vol: 0.09 }); },
    thud: (t) => tone(140, t, 0.12, { type: 'triangle', vol: 0.12, to: 70 }),
    star0: (t) => tone(784, t, 0.18, { type: 'triangle', vol: 0.1 }),
    star1: (t) => tone(988, t, 0.18, { type: 'triangle', vol: 0.1 }),
    star2: (t) => { tone(1175, t, 0.3, { type: 'triangle', vol: 0.1 }); tone(1568, t + 0.08, 0.35, { type: 'triangle', vol: 0.06 }); },
    fanfare: (t) => {
        const seq = [523, 659, 784, 659, 784, 1047];
        seq.forEach((f, i) => tone(f, t + i * 0.12, i === seq.length - 1 ? 0.6 : 0.16, { type: 'triangle', vol: 0.1 }));
    }
};

// Ruhige Pentatonik-Begleitung
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const CHORDS = [[130.81, 196.0, 261.63], [110.0, 164.81, 220.0], [146.83, 220.0, 293.66], [98.0, 146.83, 196.0]];
const CHORD_S = 3.6, NOTE_S = 0.5;
let step = 0;
function musicTick() {
    if (!ctx || !state.music) return;
    const t = ctx.currentTime + 0.05;
    if (step % MUSIC_STEPS_PER_CHORD === 0) {
        CHORDS[(step / MUSIC_STEPS_PER_CHORD) % CHORDS.length].forEach(f => tone(f, t, CHORD_S, { vol: 0.05, dest: musicGain }));
    }
    if (Math.random() < MUSIC_NOTE_CHANCE) tone(SCALE[Math.floor(Math.random() * SCALE.length)], t, NOTE_S, { type: 'triangle', vol: 0.06, dest: musicGain });
    step++;
}

export const audio = {
    state,
    play(name) {
        if (!state.sfx || !ensure() || !SFX[name]) return;
        try { SFX[name](ctx.currentTime + 0.01); } catch (e) { /* Ton ist Nebensache */ }
    },
    unlock() { ensure(); if (state.music) this.startMusic(); },
    setSfx(on) { state.sfx = on; store.set('sfx', on); },
    setMusic(on) { state.music = on; store.set('music', on); if (on) this.startMusic(); else this.stopMusic(); },
    startMusic() {
        if (!ensure()) return;
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, ctx.currentTime + MUSIC_FADE_IN_S);
        if (!musicTimer) musicTimer = setInterval(musicTick, MUSIC_STEP_MS);
    },
    stopMusic() {
        if (!ctx) return;
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + MUSIC_FADE_OUT_S);
        clearInterval(musicTimer); musicTimer = null;
    }
};

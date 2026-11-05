// Synthetischer Sound (keine Audiodateien nötig). Effekte leise, Musik standardmäßig aus.
(function () {
    const CV = window.CV;
    let ctx = null, master = null, musicGain = null, musicTimer = null;
    const state = {
        sfx: CV.store.get('sfx', true),
        music: CV.store.get('music', false)
    };

    function ensure() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.5;
            master.connect(ctx.destination);
            musicGain = ctx.createGain();
            musicGain.gain.value = 0.0;
            musicGain.connect(master);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function tone(freq, start, dur, opts = {}) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = opts.type || 'sine';
        o.frequency.setValueAtTime(freq, start);
        if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
        const vol = opts.vol || 0.12;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + Math.min(0.02, dur / 4));
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g);
        g.connect(opts.dest || master);
        o.start(start);
        o.stop(start + dur + 0.05);
    }

    const SFX = {
        click: (t) => tone(660, t, 0.07, { type: 'triangle', vol: 0.06 }),
        coin: (t) => { tone(988, t, 0.08, { type: 'square', vol: 0.04 }); tone(1319, t + 0.07, 0.18, { type: 'square', vol: 0.04 }); },
        open: (t) => { tone(392, t, 0.12, { vol: 0.08 }); tone(523, t + 0.08, 0.16, { vol: 0.08 }); },
        good: (t) => { tone(523, t, 0.1, { type: 'triangle', vol: 0.1 }); tone(784, t + 0.08, 0.16, { type: 'triangle', vol: 0.1 }); },
        bad: (t) => tone(220, t, 0.18, { type: 'sawtooth', vol: 0.035, to: 160 }),
        pop: (t) => tone(300, t, 0.09, { type: 'triangle', vol: 0.1, to: 900 }),
        splat: (t) => tone(180, t, 0.12, { type: 'square', vol: 0.05, to: 60 }),
        ring: (t) => { for (let i = 0; i < 3; i++) tone(1200, t + i * 0.09, 0.06, { type: 'square', vol: 0.025 }); },
        whoosh: (t) => tone(200, t, 0.35, { type: 'sine', vol: 0.06, to: 800 }),
        step: (t) => tone(120, t, 0.04, { type: 'triangle', vol: 0.02 }),
        badge: (t) => {
            [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.22, { type: 'triangle', vol: 0.09 }));
        },
        bonus: (t) => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.12, { type: 'square', vol: 0.035 })); },
        combo: (t) => { tone(659, t, 0.08, { type: 'triangle', vol: 0.09 }); tone(988, t + 0.06, 0.08, { type: 'triangle', vol: 0.09 }); tone(1319, t + 0.12, 0.18, { type: 'triangle', vol: 0.09 }); },
        count: (t) => tone(440, t, 0.12, { type: 'square', vol: 0.04 }),
        go: (t) => tone(880, t, 0.3, { type: 'square', vol: 0.05 }),
        tick: (t) => tone(1046, t, 0.05, { type: 'square', vol: 0.03 }),
        slice: (t) => tone(1400, t, 0.09, { type: 'sawtooth', vol: 0.025, to: 500 }),
        boom: (t) => { tone(160, t, 0.4, { type: 'sawtooth', vol: 0.07, to: 40 }); tone(90, t, 0.5, { type: 'square', vol: 0.05, to: 30 }); },
        jump: (t) => tone(330, t, 0.14, { type: 'square', vol: 0.035, to: 700 }),
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

    // Ruhige, freundliche Pentatonik-Begleitung.
    const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const CHORDS = [[130.81, 196.0, 261.63], [110.0, 164.81, 220.0], [146.83, 220.0, 293.66], [98.0, 146.83, 196.0]];
    let step = 0;
    function musicTick() {
        if (!ctx || !state.music) return;
        const t = ctx.currentTime + 0.05;
        if (step % 16 === 0) {
            const chord = CHORDS[(step / 16) % CHORDS.length];
            chord.forEach(f => tone(f, t, 3.6, { type: 'sine', vol: 0.05, dest: musicGain }));
        }
        if (Math.random() < 0.55) {
            const f = SCALE[Math.floor(Math.random() * SCALE.length)];
            tone(f, t, 0.5, { type: 'triangle', vol: 0.06, dest: musicGain });
        }
        step++;
    }

    CV.audio = {
        state,
        play(name) {
            if (!state.sfx) return;
            if (!ensure()) return;
            try { SFX[name] && SFX[name](ctx.currentTime + 0.01); } catch (e) { /* ignorieren */ }
        },
        unlock() { ensure(); if (state.music) this.startMusic(); },
        setSfx(on) { state.sfx = on; CV.store.set('sfx', on); },
        setMusic(on) {
            state.music = on; CV.store.set('music', on);
            if (on) this.startMusic(); else this.stopMusic();
        },
        startMusic() {
            if (!ensure()) return;
            musicGain.gain.cancelScheduledValues(ctx.currentTime);
            musicGain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1.5);
            if (!musicTimer) musicTimer = setInterval(musicTick, 240);
        },
        stopMusic() {
            if (!ctx) return;
            musicGain.gain.cancelScheduledValues(ctx.currentTime);
            musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
            clearInterval(musicTimer); musicTimer = null;
        }
    };
})();

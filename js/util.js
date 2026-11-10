// Kleine Helfer, die von allen Modulen genutzt werden.
(function () {
    const CV = window.CV = window.CV || {};

    CV.$ = (sel, root = document) => root.querySelector(sel);
    CV.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    CV.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    CV.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    CV.lerp = (a, b, t) => a + (b - a) * t;
    CV.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
    CV.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    CV.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    // Deterministischer Zufall, damit die Welt bei jedem Besuch gleich aussieht.
    CV.rng = function (seed) {
        let a = seed >>> 0;
        return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    CV.shuffle = (arr, rnd = Math.random) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    // Spielstand (Kapitel, Sterne, Bestwerte, Firmenname) lebt nur im Arbeitsspeicher:
    // Jedes Neuladen startet ein frisches Spiel. Nur die Ton-Einstellungen bleiben im Browser gespeichert.
    const KEEP = ['sfx', 'music'];
    const mem = new Map();
    try {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cvworld:') && !KEEP.includes(k.slice(8))) localStorage.removeItem(k);
        });
    } catch (e) { /* privat */ }
    CV.store = {
        get(key, fallback) {
            if (!KEEP.includes(key)) return mem.has(key) ? mem.get(key) : fallback;
            try {
                const v = localStorage.getItem('cvworld:' + key);
                return v == null ? fallback : JSON.parse(v);
            } catch (e) { return fallback; }
        },
        set(key, value) {
            if (!KEEP.includes(key)) { mem.set(key, value); return; }
            try { localStorage.setItem('cvworld:' + key, JSON.stringify(value)); } catch (e) { /* privat */ }
        }
    };

    const params = new URLSearchParams(location.search);
    CV.param = (k) => {
        const v = params.get(k);
        return v ? v.trim().slice(0, 40) : '';
    };

    // "11.2023 - Aktuell" -> { start: 202311, end: null, current: true }
    CV.parseRange = function (str) {
        const s = String(str || '');
        const m = s.match(/(\d{1,2})[./](\d{4})|\b(\d{4})\b/g) || [];
        const toNum = (t) => { const q = t.split(/[./]/); return q.length === 2 ? +q[1] * 100 + +q[0] : +q[0] * 100 + 1; };
        return {
            start: m[0] ? toNum(m[0]) : null,
            end: m[1] ? toNum(m[1]) : null,
            current: /aktuell|heute|now/i.test(s)
        };
    };

    const FLAGS = {
        'Syrien': 'SY', 'Deutschland': 'DE', 'Spanien': 'ES', 'Griechenland': 'GR', 'Italien': 'IT',
        'Algerien': 'DZ', 'Marokko': 'MA', 'Kroatien': 'HR', 'Dänemark': 'DK', 'Belgien': 'BE',
        'Holland': 'NL', 'Niederlande': 'NL', 'Österreich': 'AT', 'Schweiz': 'CH', 'Luxemburg': 'LU',
        'Liechtenstein': 'LI', 'Polen': 'PL', 'Schweden': 'SE', 'Tschechien': 'CZ', 'Ungarn': 'HU',
        'Türkei': 'TR', 'Libanon': 'LB', 'Frankreich': 'FR', 'Portugal': 'PT', 'England': 'GB',
        'Großbritannien': 'GB', 'Norwegen': 'NO', 'Finnland': 'FI', 'Ägypten': 'EG', 'Tunesien': 'TN',
        'Jordanien': 'JO', 'USA': 'US', 'Kanada': 'CA', 'Irland': 'IE', 'Slowenien': 'SI', 'Bulgarien': 'BG',
        'Rumänien': 'RO', 'Zypern': 'CY', 'Malta': 'MT', 'Dubai': 'AE', 'Katar': 'QA', 'Montenegro': 'ME'
    };
    // Windows zeigt Flaggen-Emojis nur als Buchstaben – dann lieber weglassen.
    let flagsOk = null;
    function flagSupport() {
        if (flagsOk !== null) return flagsOk;
        try {
            const c = document.createElement('canvas'); c.width = c.height = 24;
            const x = c.getContext('2d', { willReadFrequently: true });
            x.font = '20px sans-serif'; x.textBaseline = 'top'; x.fillText('\u{1F1E9}\u{1F1EA}', 0, 0);
            const d = x.getImageData(0, 0, 24, 24).data;
            flagsOk = false;
            for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (Math.abs(d[i] - d[i + 1]) > 30 || Math.abs(d[i + 1] - d[i + 2]) > 30)) { flagsOk = true; break; }
        } catch (e) { flagsOk = false; }
        return flagsOk;
    }
    CV.flag = (country) => {
        const code = FLAGS[country];
        if (!flagSupport()) return '';
        if (!code) return '📍';
        return String.fromCodePoint(...[...code].map(c => 0x1F1A5 + c.charCodeAt(0)));
    };

    const LANG_NAMES = /^(arabisch|deutsch|englisch|französisch|franzoesisch|spanisch|türkisch|kurdisch|italienisch|russisch|niederländisch)$/i;
    const LEVEL_PCT = [[/mutter|native/i, 100], [/c2/i, 95], [/c1/i, 86], [/b2/i, 72], [/b1/i, 58], [/a2/i, 38], [/a1/i, 22]];
    CV.levelPct = (lvl) => {
        for (const [re, p] of LEVEL_PCT) if (re.test(lvl)) return p;
        return 60;
    };

    const SKILL_ICONS = {
        'java': '☕', 'c': '🔧', 'c++': '⚙️', 'js': '🟨', 'javascript': '🟨', 'css': '🎨', 'sql': '🗄️',
        'html': '🌐', 'r': '📊', 'ms office': '📎', 'linux': '🐧', 'figma': '✏️', 'jira': '📋',
        'github': '🐙', 'git': '🌿', 'shopify': '🛍️', 'it-support': '🛟', 'digital design': '🖌️',
        'frontend-design': '🖥️', 'itsm': '🧾', 'python': '🐍', 'typescript': '🔷', 'react': '⚛️', 'docker': '🐳',
        'node.js': '🟩', 'express.js': '🚂', 'sqlite': '🪶', 'microsoft sql server': '🗄️', 'gitlab': '🦊', 'windows': '🪟',
        'claude code': '🤖', 'openai codex': '🧠', 'bmc helix itsm': '🧾', 'itil': '📘'
    };
    CV.skillIcon = (name) => SKILL_ICONS[String(name).toLowerCase()] || '✨';

    // Abgeleitete Kennzahlen aus data.js – so bleibt alles automatisch aktuell.
    CV.derive = function (data) {
        const d = {};
        const countries = [];
        (data.travels || []).forEach(t => {
            String(t.country || '').split(/,|&|\bund\b/).map(s => s.trim()).forEach(c => {
                if (c && !/\s/.test(c) && !countries.includes(c)) countries.push(c);
            });
        });
        d.countries = countries;

        let langs = Array.isArray(data.languages) ? data.languages.slice() : [];
        const skills = [];
        (data.skills || []).forEach(s => {
            if (LANG_NAMES.test(String(s.name).trim())) {
                if (!langs.some(l => l.name === s.name)) langs.push(s);
            } else skills.push(s);
        });
        d.languages = langs;
        d.skills = skills;
        d.skillTokens = [];
        skills.forEach(s => String(s.level || '').split(',').map(x => x.trim()).filter(Boolean).forEach(t => {
            if (!d.skillTokens.includes(t)) d.skillTokens.push(t);
        }));

        const exp = (data.experience || []).map(e => Object.assign({}, e, { range: CV.parseRange(e.date) }));
        d.experienceAsc = exp.slice().sort((a, b) => (a.range.start || 0) - (b.range.start || 0));
        d.experienceDesc = exp.slice().sort((a, b) => {
            if (a.range.current !== b.range.current) return a.range.current ? -1 : 1;
            return (b.range.start || 0) - (a.range.start || 0);
        });
        d.currentRole = d.experienceDesc.find(e => e.primary) || d.experienceDesc.find(e => e.range.current) || d.experienceDesc[0] || null;
        if (d.currentRole) d.currentRole.companyShort = String(d.currentRole.company || '').split(',')[0].trim();

        const edu = (data.education || []).map(e => Object.assign({}, e, { range: CV.parseRange(e.date) }));
        const isLang = (e) => /sprach|integration/i.test(e.title + ' ' + e.detail);
        d.educationDesc = edu.slice().sort((a, b) => (b.range.start || 0) - (a.range.start || 0));
        d.languageCourses = d.educationDesc.filter(isLang);
        d.academic = d.educationDesc.filter(e => !isLang(e));

        d.firstName = data.firstName || String(data.name || 'Ich').split(' ')[0];
        d.roleSinceYear = d.currentRole && d.currentRole.range.start ? Math.floor(d.currentRole.range.start / 100) : null;
        d.devYears = CV.devYears(data);
        return d;
    };

    CV.wait = (ms) => new Promise(r => setTimeout(r, ms));

    // Schlichte Linien-Icons (Inline-SVG) für alles, was HR liest – sieht auf jedem System gleich aus.
    const ICONS = {
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
        map: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
        volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
        mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
        music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
        phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
        linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
        download: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
        send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
        cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
        code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
        users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5"/>',
        trending: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
        heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
        coffee: '<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v3M10 2v3M14 2v3"/>',
        book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
        school: '<path d="m22 10-10-5L2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5M22 10v6"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
        dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
        waves: '<path d="M2 7c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M2 12c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M2 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
        paddle: '<path d="M3 19c6 1.5 12 1.5 18 0"/><path d="M12 15V5M12 5l-3 2M8 9l8 0"/><path d="M17 3l-9 15"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
        check: '<path d="m5 12 5 5 9-10"/>',
        chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
        external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
        lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        play: '<path d="M7 4v16l13-8z"/>'
    };
    CV.icon = (name, cls = '') => ICONS[name]
        ? `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
        : '';
    CV.noEmoji = (s) => String(s == null ? '' : s).replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/\s{2,}/g, ' ').trim();
    CV.hobbyIcon = (t) => {
        const s = String(t).toLowerCase();
        if (/ki|tool|code|entwick/.test(s)) return 'cpu';
        if (/fitness|kraft|gym/.test(s)) return 'dumbbell';
        if (/schwimm/.test(s)) return 'waves';
        if (/paddl|sup|boot/.test(s)) return 'paddle';
        if (/reise/.test(s)) return 'globe';
        if (/musik/.test(s)) return 'music';
        return 'heart';
    };

    // Baufortschritt eines eigenen Projekts → Status-Schild
    CV.projStage = (p) => {
        const n = Math.max(0, Math.min(100, +p.progress || 0));
        if (p.stage) return { label: p.stage, cls: n >= 100 ? 'done' : n < 10 ? 'base' : 'build', pct: n };
        if (n >= 100) return { label: 'Fertig', cls: 'done', pct: n };
        if (n < 10) return { label: 'Fundament', cls: 'base', pct: n };
        return { label: `Im Bau · ${n} %`, cls: 'build', pct: n };
    };

    // „seit X Jahren Entwickler“ – aus dem frühesten Entwickler-Job in data.js berechnet.
    CV.devYears = function (data, now = new Date()) {
        let first = null;
        (data.experience || []).forEach(e => {
            if (!/entwickl|software|developer/i.test(e.role || '')) return;
            const r = CV.parseRange(e.date);
            if (r.start && (!first || r.start < first)) first = r.start;
        });
        if (!first) return null;
        const months = (now.getFullYear() * 12 + now.getMonth() + 1) - (Math.floor(first / 100) * 12 + first % 100);
        const years = Math.floor(months / 12);
        return years >= 1
            ? { value: `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`, label: 'Full-Stack-Entwickler', years }
            : { value: `${Math.max(1, months)} Mon.`, label: 'Full-Stack-Entwickler', years: 0 };
    };
})();

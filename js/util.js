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

    CV.store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem('cvworld:' + key);
                return v == null ? fallback : JSON.parse(v);
            } catch (e) { return fallback; }
        },
        set(key, value) {
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
        const m = s.match(/(\d{1,2})\.(\d{4})/g) || [];
        const toNum = (t) => { const [mm, yy] = t.split('.'); return +yy * 100 + +mm; };
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
        'frontend-design': '🖥️', 'itsm': '🧾', 'python': '🐍', 'typescript': '🔷', 'react': '⚛️', 'docker': '🐳'
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
        d.currentRole = d.experienceDesc.find(e => e.range.current) || d.experienceDesc[0] || null;

        const edu = (data.education || []).map(e => Object.assign({}, e, { range: CV.parseRange(e.date) }));
        const isLang = (e) => /sprach|integration/i.test(e.title + ' ' + e.detail);
        d.educationDesc = edu.slice().sort((a, b) => (b.range.start || 0) - (a.range.start || 0));
        d.languageCourses = d.educationDesc.filter(isLang);
        d.academic = d.educationDesc.filter(e => !isLang(e));

        d.firstName = data.firstName || String(data.name || 'Ich').split(' ')[0];
        d.roleSinceYear = d.currentRole && d.currentRole.range.start ? Math.floor(d.currentRole.range.start / 100) : null;
        return d;
    };

    CV.wait = (ms) => new Promise(r => setTimeout(r, ms));
})();

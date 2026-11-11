// Projekt-Viertel: Abduls eigene Projekte als kleine Stadt. Jedes Gebäude steht im Bauzustand,
// der zum Fortschritt passt (data.js → projects[].progress), sodass Fertiges und Laufendes sofort unterscheidbar sind.
(function () {
    const CV = window.CV;
    const TAU = Math.PI * 2;
    const VW = 960, VH = 350, GROUND = 236, PLOT = 150, X0 = 30;
    const FONT = 'Outfit, system-ui, sans-serif';
    const FRAME_MS = 1000 / 30;     // 30 Bilder/s reichen für die kleinen Animationen
    const GHOST_ALPHA = 0.16;       // Deckkraft des „Bauplans“ (fertiges Gebäude in Grau)

    function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
    function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
    function text(c, s, x, y, size, col, weight = 800, align = 'center') {
        c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y);
    }
    function person(c, x, y, col, t, ph) {
        const step = Math.sin(t * 6 + ph) * 2;
        c.fillStyle = 'rgba(0,0,0,0.15)'; ell(c, x, y + 1, 6, 2); c.fill();
        c.fillStyle = '#2b2f3a'; c.fillRect(x - 3, y - 9 + Math.max(0, step) * 0.3, 2.4, 9); c.fillRect(x + 0.6, y - 9 + Math.max(0, -step) * 0.3, 2.4, 9);
        c.fillStyle = col; rr(c, x - 4.5, y - 20, 9, 12, 3); c.fill();
        c.fillStyle = '#e0ac69'; ell(c, x, y - 24, 4, 4); c.fill();
    }

    // ---------------------------------------------------------------- Gebäude (vollständig)
    // Jede Funktion zeichnet das fertige Gebäude mittig auf cx, Unterkante GROUND; liefert die Höhe.
    const B = {
        shop(c, cx, t) { // Werkzeugverleih: Laden mit Schaufenster und Markise
            const w = 124, h = 92, x = cx - w / 2, y = GROUND - h;
            c.fillStyle = '#c8553d'; c.fillRect(x, y, w, h);
            c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 1;
            for (let yy = y + 8; yy < GROUND; yy += 8) { c.beginPath(); c.moveTo(x, yy); c.lineTo(x + w, yy); c.stroke(); }
            c.fillStyle = '#5b2a1e'; c.fillRect(x - 5, y - 8, w + 10, 10);
            c.fillStyle = '#1f2a44'; rr(c, x + 14, y + 6, w - 28, 18, 4); c.fill();
            text(c, 'WERKZEUGVERLEIH', cx, y + 15.5, 9.5, '#ffd166');
            for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#fff' : '#16a34a'; c.fillRect(x + 6 + i * ((w - 12) / 6), y + 30, (w - 12) / 6, 10); }
            c.fillStyle = '#9fd4f5'; rr(c, x + 8, y + 44, 64, 40, 3); c.fill();
            c.strokeStyle = '#6b7280'; c.lineWidth = 2.4; c.lineCap = 'round';  // Werkzeuge im Fenster
            c.beginPath(); c.moveTo(x + 20, y + 76); c.lineTo(x + 34, y + 54); c.moveTo(x + 48, y + 54); c.lineTo(x + 48, y + 78); c.moveTo(x + 42, y + 56); c.lineTo(x + 54, y + 56); c.stroke();
            c.fillStyle = '#ffca3a'; rr(c, x + 56, y + 66, 12, 14, 2); c.fill();
            c.fillStyle = '#3b2416'; rr(c, x + w - 42, y + 46, 30, h - 46, [8, 8, 0, 0]); c.fill();
            c.fillStyle = '#ffd36b'; ell(c, x + w - 18, y + 70, 2, 2); c.fill();
            return h;
        },
        studio(c, cx, t) { // KI-Videos: Studio mit Sendeturm und Bildschirm
            const w = 108, h = 104, x = cx - w / 2, y = GROUND - h;
            c.fillStyle = '#2a2f4f'; c.fillRect(x, y, w, h);
            c.fillStyle = '#353b63'; c.fillRect(x, y, w, 10);
            c.fillStyle = '#0b1020'; rr(c, x + 12, y + 18, w - 24, 46, 6); c.fill();
            const g = c.createLinearGradient(x + 12, 0, x + w - 12, 0); g.addColorStop(0, '#7b5cff'); g.addColorStop(1, '#ff4f6d');
            c.fillStyle = g; rr(c, x + 16, y + 22, w - 32, 38, 4); c.fill();
            c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx - 7, y + 32); c.lineTo(cx + 10, y + 41); c.lineTo(cx - 7, y + 50); c.closePath(); c.fill();
            if (Math.sin(t * 4) > 0) { c.fillStyle = '#ff3b3b'; ell(c, x + 24, y + 74, 4, 4); c.fill(); }
            text(c, 'REC', x + 38, y + 74.5, 8, '#ff8a8a');
            c.fillStyle = '#1b1f36'; rr(c, cx - 12, y + h - 26, 24, 26, [6, 6, 0, 0]); c.fill();
            // Sendeturm
            const tx = x + w - 20;
            c.strokeStyle = '#c0c6d4'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(tx - 7, y); c.lineTo(tx, y - 62); c.lineTo(tx + 7, y); c.stroke();
            for (let k = 1; k < 6; k++) { const yy = y - k * 10, d = 7 * (1 - k / 6.2); c.beginPath(); c.moveTo(tx - d, yy); c.lineTo(tx + d, yy); c.stroke(); }
            c.fillStyle = '#ff4d4d'; ell(c, tx, y - 64, 3, 3); c.fill();
            c.strokeStyle = 'rgba(123,92,255,0.6)'; c.lineWidth = 1.6;
            for (let k = 0; k < 3; k++) { const r = 8 + ((t * 18 + k * 9) % 27); c.globalAlpha = 1 - r / 35; c.beginPath(); c.arc(tx, y - 64, r, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(tx, y - 64, r, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
            c.globalAlpha = 1;
            return h + 64;
        },
        refinery(c, cx, t) { // Rustfall: Ölraffinerie in der Wüste
            const y = GROUND;
            c.fillStyle = '#8a8f99'; c.fillRect(cx - 52, y - 70, 14, 70); // Schornstein
            c.fillStyle = '#b5482b'; c.fillRect(cx - 54, y - 74, 18, 6);
            const fl = 1 + Math.sin(t * 9) * 0.18;
            c.fillStyle = '#ff9f1c'; ell(c, cx - 45, y - 82 * fl + 4, 5, 9 * fl); c.fill();
            c.fillStyle = '#ffd166'; ell(c, cx - 45, y - 79, 2.6, 5); c.fill();
            // Destillationsturm
            c.fillStyle = '#9c6644'; rr(c, cx - 30, y - 104, 22, 104, 6); c.fill();
            c.strokeStyle = '#6f4a32'; c.lineWidth = 2;
            for (let yy = y - 92; yy < y; yy += 14) { c.beginPath(); c.moveTo(cx - 32, yy); c.lineTo(cx - 6, yy); c.stroke(); }
            // Tanks
            [[cx + 12, 40, 34, '#c46a3a'], [cx + 44, 30, 26, '#a85a32']].forEach(([tx, h, r, col]) => {
                c.fillStyle = col; c.fillRect(tx - r / 2, y - h, r, h);
                c.fillStyle = '#d9824f'; ell(c, tx, y - h, r / 2, 5); c.fill();
                c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(tx - r / 2, y - h * 0.55, r, 5);
            });
            // Rohre
            c.strokeStyle = '#5a5f6b'; c.lineWidth = 4;
            c.beginPath(); c.moveTo(cx - 8, y - 60); c.lineTo(cx + 4, y - 60); c.lineTo(cx + 4, y - 30); c.moveTo(cx - 8, y - 20); c.lineTo(cx + 30, y - 20); c.stroke();
            text(c, 'RUSTFALL', cx + 26, y - 50, 8, '#fff3c4');
            return 104;
        },
        stadium(c, cx, t) { // Ultranisator: Fußballstadion
            const y = GROUND, rx = 66, ry = 24, h = 46;
            c.fillStyle = '#4b5563'; c.beginPath(); c.ellipse(cx, y - h, rx, ry, 0, Math.PI, TAU); c.lineTo(cx + rx, y - 10); c.ellipse(cx, y - 10, rx, ry * 0.5, 0, 0, Math.PI); c.closePath(); c.fill();
            c.fillStyle = '#e63946'; c.beginPath(); c.ellipse(cx, y - h, rx, ry, 0, Math.PI, TAU); c.ellipse(cx, y - h + 4, rx - 10, ry - 7, 0, TAU, Math.PI, true); c.closePath(); c.fill();
            c.fillStyle = '#3fae49'; ell(c, cx, y - h + 4, rx - 14, ry - 10); c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; ell(c, cx, y - h + 4, 8, 3); c.stroke();
            c.beginPath(); c.moveTo(cx, y - h - 5); c.lineTo(cx, y - h + 13); c.stroke();
            c.fillStyle = '#374151'; c.fillRect(cx - rx, y - h, rx * 2, h - 10);
            c.fillStyle = '#6b7280';
            for (let i = 0; i < 9; i++) c.fillRect(cx - rx + 6 + i * 14.5, y - h + 6, 8, h - 22);
            [cx - rx + 4, cx + rx - 4].forEach((fx) => {
                c.strokeStyle = '#9ca3af'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(fx, y - h); c.lineTo(fx, y - h - 46); c.stroke();
                c.fillStyle = '#e5e7eb'; rr(c, fx - 9, y - h - 54, 18, 9, 2); c.fill();
                c.fillStyle = `rgba(255,250,200,${0.5 + Math.sin(t * 3) * 0.2})`; rr(c, fx - 7, y - h - 52, 14, 5, 1); c.fill();
            });
            return h + 54;
        },
        restaurant(c, cx, t) { // Rest-IQ: kleines Restaurant
            const w = 112, h = 78, x = cx - w / 2, y = GROUND - h;
            c.fillStyle = '#f4e3c3'; c.fillRect(x, y, w, h);
            c.fillStyle = '#7c3f22'; c.beginPath(); c.moveTo(x - 8, y + 2); c.lineTo(cx, y - 30); c.lineTo(x + w + 8, y + 2); c.closePath(); c.fill();
            for (let i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#fff' : '#e63946'; c.beginPath(); const ax = x + i * (w / 7); c.moveTo(ax, y + 12); c.lineTo(ax + w / 7, y + 12); c.lineTo(ax + w / 7, y + 22); c.arc(ax + w / 14, y + 22, w / 14, 0, Math.PI); c.closePath(); c.fill(); }
            c.fillStyle = '#9fd4f5'; rr(c, x + 10, y + 34, 40, 30, 3); c.fill(); rr(c, x + w - 50, y + 34, 40, 30, 3); c.fill();
            c.fillStyle = '#5a2e19'; rr(c, cx - 10, y + 36, 20, h - 36, [6, 6, 0, 0]); c.fill();
            c.fillStyle = '#1f2a44'; rr(c, cx - 28, y - 14, 56, 14, 4); c.fill();
            text(c, 'REST-IQ', cx, y - 6.5, 9, '#ffd166');
            return h + 30;
        }
    };

    function scaffold(c, cx, top, bottom, w) {
        c.strokeStyle = '#d97706'; c.lineWidth = 1.6;
        const x0 = cx - w / 2 - 6, x1 = cx + w / 2 + 6;
        for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 5) { c.beginPath(); c.moveTo(x, bottom); c.lineTo(x, top); c.stroke(); }
        for (let y = bottom - 18; y > top; y -= 18) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
        c.strokeStyle = 'rgba(217,119,6,0.55)'; c.lineWidth = 1;
        for (let y = bottom; y - 18 > top; y -= 18) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + (x1 - x0) / 5, y - 18); c.stroke(); }
    }
    function miniCrane(c, x, top, t) {
        c.strokeStyle = '#f2b705'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(x, GROUND); c.lineTo(x, top); c.stroke();
        c.lineWidth = 1.2;
        for (let y = GROUND; y > top + 8; y -= 10) { c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y - 10); c.stroke(); }
        const len = 46 + Math.sin(t * 0.8) * 8;
        c.lineWidth = 3; c.beginPath(); c.moveTo(x + 14, top); c.lineTo(x - len, top); c.stroke();
        c.fillStyle = '#6b7280'; c.fillRect(x + 6, top + 1, 9, 6);
        const hx = x - len + 10, drop = 26 + Math.sin(t * 1.3) * 6;
        c.strokeStyle = '#444'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, top); c.lineTo(hx, top + drop); c.stroke();
        c.fillStyle = '#ff8a3d'; c.fillRect(hx - 6, top + drop, 12, 6);
    }
    function foundation(c, cx, t) {
        const w = 112, y = GROUND;
        c.fillStyle = '#7a5c3e'; rr(c, cx - w / 2, y - 6, w, 22, 4); c.fill();
        c.fillStyle = '#9b8a76'; c.fillRect(cx - w / 2 + 6, y - 2, w - 12, 8);
        c.strokeStyle = '#4b5563'; c.lineWidth = 1.5;
        for (let x = cx - w / 2 + 12; x < cx + w / 2 - 8; x += 10) { c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x, y - 16); c.stroke(); }
        // Bagger
        const bx = cx + w / 2 - 6, a = Math.sin(t * 1.4) * 0.25;
        c.fillStyle = '#f2b705'; rr(c, bx - 18, y - 22, 26, 14, 3); c.fill();
        c.fillStyle = '#9fd4f5'; c.fillRect(bx - 4, y - 20, 8, 7);
        c.fillStyle = '#374151'; rr(c, bx - 20, y - 8, 30, 8, 4); c.fill();
        c.save(); c.translate(bx - 16, y - 18); c.rotate(-0.6 + a);
        c.strokeStyle = '#f2b705'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(-26, 0); c.stroke();
        c.rotate(1.1); c.beginPath(); c.moveTo(-26 * Math.cos(1.1), 26 * Math.sin(1.1) * 0); c.stroke();
        c.restore();
        [[cx - w / 2 + 6, y + 10], [cx, y + 12]].forEach(([x, yy]) => { c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(x - 5, yy); c.lineTo(x + 5, yy); c.lineTo(x, yy - 12); c.closePath(); c.fill(); });
    }

    // Bauplan = fertiges Gebäude in Graustufen. Wird je Gebäudetyp einmal erzeugt (statt eines teuren Filters pro Bild).
    const ghosts = new Map();
    let ghostScale = 0;
    function ghost(type, draw, k) {
        if (ghostScale !== k) { ghosts.clear(); ghostScale = k; }
        let g = ghosts.get(type);
        if (!g) {
            const cv = document.createElement('canvas');
            cv.width = Math.ceil(PLOT * k); cv.height = Math.ceil((GROUND + 10) * k);
            const gc = cv.getContext('2d');
            gc.setTransform(k, 0, 0, k, (PLOT / 2) * k, 0);
            const full = draw(gc, 0, 0);
            const img = gc.getImageData(0, 0, cv.width, cv.height), d = img.data;
            for (let n = 0; n < d.length; n += 4) { const y = d[n] * 0.3 + d[n + 1] * 0.59 + d[n + 2] * 0.11; d[n] = d[n + 1] = d[n + 2] = y; }
            gc.putImageData(img, 0, 0);
            g = { cv, full };
            ghosts.set(type, g);
        }
        return g;
    }

    function drawPlot(c, p, i, t, pct, hover, sel, k) {
        const x0 = X0 + i * PLOT, cx = x0 + PLOT / 2, type = p.building || 'shop';
        const desert = type === 'refinery';
        // Grundstück
        c.fillStyle = desert ? '#e9c98f' : '#9bd27c'; rr(c, x0 + 4, GROUND - 6, PLOT - 8, 20, 6); c.fill();
        if (desert) { c.fillStyle = '#d9b26e'; for (let k = 0; k < 4; k++) { ell(c, x0 + 20 + k * 34, GROUND + 2, 12, 3); c.fill(); } }
        if (hover || sel) { c.fillStyle = sel ? 'rgba(255,170,60,0.22)' : 'rgba(255,255,255,0.25)'; rr(c, x0 + 2, 24, PLOT - 4, GROUND - 10, 14); c.fill(); }
        if (type === 'foundation' || pct < 10) {
            foundation(c, cx, t);
        } else {
            const draw = B[type] || B.shop;
            // Plan (Umriss) des fertigen Gebäudes, darüber der gebaute Teil
            const gh = ghost(type, draw, k);
            const full = gh.full;
            c.globalAlpha = GHOST_ALPHA; c.drawImage(gh.cv, x0, 0, PLOT, GROUND + 10); c.globalAlpha = 1;
            const visH = pct >= 100 ? full + 10 : Math.max(14, full * pct / 100);
            c.save(); c.beginPath(); c.rect(x0, GROUND - visH, PLOT, visH + 30); c.clip(); draw(c, cx, t); c.restore();
            if (pct < 100) {
                scaffold(c, cx, GROUND - Math.min(full, visH + 26), GROUND, 104);
                miniCrane(c, x0 + PLOT - 14, GROUND - full - 24, t + i);
            } else {
                // Besucher und Kunden, Schild „erweiterbar“
                for (let k = 0; k < 3; k++) {
                    const px = x0 + 14 + ((t * 14 + k * 46) % (PLOT - 28));
                    person(c, px, GROUND + 12, ['#2a9d8f', '#e76f51', '#3a86ff'][k], t, k * 2);
                }
                c.fillStyle = '#16a34a'; rr(c, x0 + PLOT - 58, GROUND - 120, 54, 15, 7); c.fill();
                text(c, '+ erweiterbar', x0 + PLOT - 31, GROUND - 112.5, 8, '#fff');
            }
        }
        // Beschriftung + Status
        const st = CV.projStage(p);
        let fs = 13.5, name = p.title;
        c.font = `800 ${fs}px ${FONT}`;
        while (c.measureText(name).width > PLOT - 12 && fs > 10.5) { fs -= 0.5; c.font = `800 ${fs}px ${FONT}`; }
        while (c.measureText(name).width > PLOT - 12 && name.length > 4) { name = name.slice(0, -2).trim() + '…'; }
        text(c, name, cx, GROUND + 34, fs, '#16213f');
        const col = st.cls === 'done' ? ['#d9f7e8', '#0f6b44'] : st.cls === 'base' ? ['#eceff6', '#5f6880'] : ['#fff1d6', '#a15c00'];
        const lab = st.cls === 'done' ? 'Fertig' : st.cls === 'base' ? 'Fundament' : `Im Bau · ${st.pct} %`;
        c.font = `800 11px ${FONT}`; const tw = c.measureText(lab).width + 20;
        c.fillStyle = col[0]; rr(c, cx - tw / 2, GROUND + 47, tw, 19, 9.5); c.fill();
        text(c, lab, cx, GROUND + 57, 11, col[1]);
        c.fillStyle = '#e6e9f0'; rr(c, x0 + 22, GROUND + 74, PLOT - 44, 6, 3); c.fill();
        c.fillStyle = st.cls === 'done' ? '#16a34a' : st.cls === 'base' ? '#9aa1ad' : '#f59e0b';
        rr(c, x0 + 22, GROUND + 74, Math.max(6, (PLOT - 44) * pct / 100), 6, 3); c.fill();
    }

    function drawScene(c, list, t, prog, hover, sel, k) {
        const sky = c.createLinearGradient(0, 0, 0, GROUND);
        sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#eaf7ff');
        c.fillStyle = sky; c.fillRect(0, 0, VW, VH);
        c.fillStyle = 'rgba(255,255,255,0.85)';
        [[120, 50, 1], [520, 36, 0.8], [820, 60, 1.1]].forEach(([x, y, s], k) => {
            const xx = (x + t * 6 * (k + 1)) % (VW + 120) - 60;
            ell(c, xx, y, 34 * s, 12 * s); c.fill(); ell(c, xx + 16 * s, y - 8 * s, 20 * s, 12 * s); c.fill();
        });
        c.fillStyle = '#8cce6c'; c.fillRect(0, GROUND - 4, VW, VH - GROUND + 4);
        c.fillStyle = '#d8dde6'; c.fillRect(0, GROUND + 22, VW, 2);
        list.forEach((p, i) => drawPlot(c, p, i, t, prog[i], hover === i, sel === i, k));
    }

    // ---------------------------------------------------------------- Einbinden
    CV.ProjectQuarter = {
        mount(wrap, projects, opts = {}) {
            const list = (projects || []).slice(0, 6);
            const cnv = document.createElement('canvas');
            cnv.className = 'pv-cnv';
            cnv.setAttribute('role', 'img');
            cnv.setAttribute('aria-label', 'Projekt-Viertel: ' + list.map(p => `${p.title} (${CV.projStage(p).label})`).join(', '));
            wrap.appendChild(cnv);
            const c = cnv.getContext('2d');
            let k = 1, hover = -1, sel = -1;
            const fit = () => {
                const cssW = Math.max(720, wrap.clientWidth || VW);
                const dpr = Math.min(2, window.devicePixelRatio || 1);
                cnv.style.width = cssW + 'px'; cnv.style.height = Math.round(cssW * VH / VW) + 'px';
                cnv.width = Math.round(cssW * dpr); cnv.height = Math.round(cssW * VH / VW * dpr);
                k = cnv.width / VW;
            };
            fit();
            window.addEventListener('resize', fit);
            const target = list.map(p => CV.clamp(+p.progress || 0, 0, 100));
            const animate = opts.animate && !CV.reducedMotion;
            const t0 = performance.now();
            const plotAt = (e) => {
                const r = cnv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * VW;
                const i = Math.floor((x - X0) / PLOT);
                return i >= 0 && i < list.length ? i : -1;
            };
            cnv.addEventListener('pointermove', (e) => { hover = plotAt(e); cnv.style.cursor = hover >= 0 ? 'pointer' : 'default'; });
            cnv.addEventListener('pointerleave', () => { hover = -1; });
            cnv.addEventListener('click', (e) => { const i = plotAt(e); if (i >= 0) { sel = i; opts.onSelect && opts.onSelect(i); } });
            const api = { select(i) { sel = i; } };
            // Nur zeichnen, solange das Viertel sichtbar ist
            let visible = true, lastDraw = 0;
            const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { visible = es[0].isIntersecting; }) : null;
            if (io) io.observe(cnv);
            (function frame(ts) {
                if (!cnv.isConnected) { window.removeEventListener('resize', fit); if (io) io.disconnect(); return; }
                requestAnimationFrame(frame);
                if (!visible || ts - lastDraw < FRAME_MS) return;
                lastDraw = ts;
                const t = (ts - t0) / 1000;
                // Belohnung nach dem Spiel: Gebäude wachsen nacheinander auf ihren Stand
                const prog = target.map((p, i) => animate ? p * Math.min(1, Math.max(0, (t - i * 0.25) / 1.6)) : p);
                c.setTransform(k, 0, 0, k, 0, 0);
                drawScene(c, list, CV.reducedMotion ? 0 : t, prog.map(Math.round), hover, sel, k);
            })(t0);
            return api;
        }
    };
})();

// Weltkarte für „Ankunft & Reisen“: Deutschland in der Mitte, bereiste Länder farbig, alle anderen blass.
// Kartendaten: js/worldmap-data.js (lokal im Repo, kein externer Kartendienst).
(function () {
    const CV = window.CV;
    const ALIAS = { 'Holland': 'Niederlande', 'England': 'Großbritannien', 'Dubai': 'Vereinigte Arabische Emirate', 'Tschechische Republik': 'Tschechien' };
    const HOME = 'Deutschland', ORIGIN = 'Syrien';

    function hue(name) { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

    CV.WorldMap = {
        mount(root, visitedNames, opts = {}) {
            const M = window.CV_WORLDMAP;
            if (!M) return;
            const esc = CV.esc;
            const norm = (n) => ALIAS[n] || n;
            const visited = new Map(visitedNames.map(n => [norm(n), n]));   // Kartenname → Name in data.js
            const byName = new Map(M.countries.map(c => [c.n, c]));
            const home = byName.get(HOME), origin = byName.get(ORIGIN);

            // Beschriftungen: große Länder zuerst, keine Überlappungen
            const placed = [];
            const labels = [];
            M.countries.slice().sort((a, b) => b.a - a.a).forEach(c => {
                if (!c.c) return;
                const isV = visited.has(c.n);
                if (!isV && c.a < 200000) return;
                const fs = CV.clamp(Math.sqrt(c.a) / 52, isV ? 8.5 : 8, isV ? 15 : 12);
                const w = c.n.length * fs * 0.56, h = fs * 1.1;
                const box = [c.c[0] - w / 2, c.c[1] - h / 2, c.c[0] + w / 2, c.c[1] + h / 2];
                if (box[0] < 4 || box[2] > M.w - 4 || box[1] < 4 || box[3] > M.h - 4) return;
                if (isV && c.a < 6000) return;  // Kleinstaaten bekommen einen Punkt statt Text
                if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) return;
                placed.push(box);
                const ly = c.n === HOME ? c.c[1] + fs * 1.4 : c.c[1];   // unter dem Heimat-Punkt
                labels.push(`<text x="${c.c[0]}" y="${ly.toFixed(1)}" class="${isV ? 'v' : ''}" font-size="${fs.toFixed(1)}">${esc(c.n)}</text>`);
            });
            const dots = M.countries.filter(c => visited.has(c.n) && c.a < 6000 && c.c)
                .map(c => `<circle class="wm-dot" data-n="${esc(c.n)}" cx="${c.c[0]}" cy="${c.c[1]}" r="4.5" style="--h:${hue(c.n)}"/>`).join('');
            const paths = M.countries.map(c => {
                const v = visited.has(c.n);
                const cls = c.n === HOME ? 'wm-c v home' : v ? 'wm-c v' : 'wm-c';
                return `<path class="${cls}" data-n="${esc(c.n)}" d="${c.d}" style="--h:${hue(c.n)}"/>`;
            }).join('');
            let route = '';
            if (home && origin && home.c && origin.c) {
                // Route grob wie 2014: über die Türkei und den Balkan nach Deutschland
                const [x1, y1] = origin.c, [x2, y2] = home.c, mx = (x1 + x2) / 2 - 30, my = Math.max(y1, y2) + 10;
                route = `<path class="wm-route" d="M${x1},${y1} Q${mx},${my} ${x2},${y2}"/>
                    <circle class="wm-pin origin" cx="${x1}" cy="${y1}" r="5"/>
                    <g class="wm-home" transform="translate(${x2},${y2})"><circle class="pulse" r="9"/><circle r="6"/></g>
                    <g class="wm-tag" transform="translate(${x2 - 172},${y2 - 58})"><rect width="128" height="22" rx="11"/><text x="64" y="15">Heimat seit 2014</text></g>`;
            }
            const nV = visitedNames.length;
            root.innerHTML = `
                <div class="wm">
                    <div class="wm-bar">
                        <span class="wm-stat"><b>${nV}</b> Länder bereist · Ausgangspunkt Deutschland</span>
                        <span class="wm-zoom"><button type="button" data-z="-1" aria-label="Herauszoomen">−</button><button type="button" data-z="0" aria-label="Ganze Karte">Gesamt</button><button type="button" data-z="1" aria-label="Hineinzoomen">+</button></span>
                    </div>
                    <div class="wm-scroll">
                        <svg class="wm-svg" viewBox="0 0 ${M.w} ${M.h}" role="img" aria-label="Karte der bereisten Länder: ${esc(visitedNames.join(', '))}">
                            <rect width="${M.w}" height="${M.h}" class="wm-sea"/>
                            <g class="wm-land">${paths}</g>
                            <g class="wm-labels">${labels.join('')}</g>
                            ${route}
                            ${dots}
                        </svg>
                    </div>
                    <div class="wm-tip" hidden></div>
                    <p class="wm-hint">${CV.isTouch ? 'Wischen zum Verschieben · Land antippen für den Namen' : 'Mit der Maus über ein farbiges Land fahren'}</p>
                </div>`;
            const wrap = root.querySelector('.wm'), sc = root.querySelector('.wm-scroll'), svg = root.querySelector('svg'), tip = root.querySelector('.wm-tip');
            // Zoom: SVG breiter machen, der Container scrollt; Deutschland bleibt in der Mitte
            const base = () => Math.max(sc.clientWidth, CV.isTouch && window.innerWidth < 700 ? 760 : 0);
            let z = 1;
            const center = () => {
                if (!home || !home.c) return;
                sc.scrollLeft = home.c[0] / M.w * svg.clientWidth - sc.clientWidth / 2;
                sc.scrollTop = home.c[1] / M.h * svg.clientHeight - sc.clientHeight / 2;
            };
            const apply = () => { svg.style.width = Math.round(base() * z) + 'px'; requestAnimationFrame(center); };
            apply();
            root.querySelectorAll('[data-z]').forEach(b => b.onclick = () => {
                const d = +b.dataset.z;
                z = d === 0 ? 1 : CV.clamp(z * (d > 0 ? 1.5 : 1 / 1.5), 1, 3.4);
                apply();
            });
            // Tooltip
            const show = (el, x, y) => {
                const n = el.dataset.n, v = visited.has(n);
                const shown = visited.get(n) || n;
                tip.innerHTML = `${v ? CV.flagHtml(shown) + ' ' : ''}<strong>${esc(n)}</strong><small>${n === HOME ? 'Heimat seit 2014' : n === ORIGIN ? 'Herkunftsland' : v ? 'bereist' : 'noch nicht bereist'}</small>`;
                tip.className = 'wm-tip' + (v ? ' v' : '');
                tip.hidden = false;
                const r = wrap.getBoundingClientRect();
                tip.style.left = CV.clamp(x - r.left + 14, 4, r.width - 170) + 'px';
                tip.style.top = Math.max(4, y - r.top - 44) + 'px';
            };
            let pinned = null;
            svg.addEventListener('pointermove', (e) => {
                if (e.pointerType !== 'mouse') return;
                const el = e.target.closest('.v, .wm-dot');
                svg.querySelectorAll('.hl').forEach(x => x !== el && x.classList.remove('hl'));
                if (el) { el.classList.add('hl'); show(el, e.clientX, e.clientY); } else tip.hidden = true;
            });
            svg.addEventListener('pointerleave', () => { tip.hidden = true; svg.querySelectorAll('.hl').forEach(x => x.classList.remove('hl')); });
            svg.addEventListener('click', (e) => {
                const el = e.target.closest('.wm-c, .wm-dot');
                if (!el) { tip.hidden = true; return; }
                svg.querySelectorAll('.hl').forEach(x => x.classList.remove('hl'));
                if (pinned === el && !tip.hidden) { tip.hidden = true; pinned = null; return; }
                pinned = el; el.classList.add('hl'); show(el, e.clientX, e.clientY);
            });
            const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); apply(); };
            window.addEventListener('resize', onResize);
        }
    };
})();

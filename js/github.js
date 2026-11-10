// GitHub-Aktivität direkt auf der Seite: Commit-Kacheln (wie im GitHub-Profil), Kennzahlen und letzte Commits.
// Quelle 1: github-activity.json (täglich per GitHub Action erzeugt, keine API-Limits für Besucher).
// Quelle 2 (Rückfall): öffentliche Events-API im Browser (letzte 90 Tage). Klappt beides nicht, bleibt nur der Link.
(function () {
    const CV = window.CV;
    const esc = CV.esc;
    const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
    const LOGIN = () => (String((CV.data.contact || {}).github || '').match(/github\.com\/([^/?#]+)/i) || [])[1] || 'Abdul7Kader';
    let cache = null;

    const fmtDay = (iso) => { const d = new Date(iso + 'T12:00:00'); return `${d.getDate()}. ${MONTHS[d.getMonth()]}`; };
    function ago(iso) {
        const s = (Date.now() - new Date(iso).getTime()) / 1000;
        if (s < 3600) return 'gerade eben';
        if (s < 86400) { const h = Math.round(s / 3600); return `vor ${h} Std.`; }
        const d = Math.round(s / 86400);
        if (d === 1) return 'gestern';
        if (d < 30) return `vor ${d} Tagen`;
        const m = Math.round(d / 30);
        return m === 1 ? 'vor einem Monat' : `vor ${m} Monaten`;
    }

    async function fromJson() {
        const tryUrl = async (u) => { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return r.json(); };
        let j = null;
        try { j = await tryUrl('github-activity.json'); } catch (e) { /* noch nicht erzeugt */ }
        // GitHub Pages baut nach Bot-Commits nicht immer neu – dann die aktuelle Datei direkt aus dem Repo holen
        if (!j || Date.now() - new Date(j.generated).getTime() > 3 * 86400e3) {
            try { j = await tryUrl(`https://raw.githubusercontent.com/${LOGIN()}/${LOGIN().toLowerCase()}.github.io/main/github-activity.json`); } catch (e) { /* egal */ }
        }
        return j && Array.isArray(j.days) && j.days.length ? Object.assign(j, { source: 'json' }) : null;
    }
    async function fromEvents() {
        const r = await fetch(`https://api.github.com/users/${LOGIN()}/events/public?per_page=100`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(r.status);
        const ev = await r.json();
        const today = new Date(); today.setHours(12, 0, 0, 0);
        const days = [];
        for (let i = 90; i >= 0; i--) { const d = new Date(today - i * 86400e3); days.push([d.toISOString().slice(0, 10), 0]); }
        const idx = new Map(days.map((d, i) => [d[0], i]));
        const commits = [];
        ev.forEach(e => {
            const k = String(e.created_at).slice(0, 10);
            const n = e.type === 'PushEvent' ? Math.max(1, (e.payload && (e.payload.size || (e.payload.commits || []).length)) || 1) : 1;
            if (idx.has(k)) days[idx.get(k)][1] += n;
            if (e.type === 'PushEvent' && commits.length < 6) {
                const c = (e.payload.commits || []).slice(-1)[0];
                commits.push({ repo: e.repo.name, message: c ? c.message.split('\n')[0] : 'Neue Commits gepusht', date: e.created_at, url: `https://github.com/${e.repo.name}` });
            }
        });
        const total = days.reduce((a, d) => a + d[1], 0);
        if (!total) return null;
        return { source: 'events', days, commits, total, best: days.reduce((a, d) => d[1] > (a ? a.count : 0) ? { date: d[0], count: d[1] } : a, null) };
    }
    async function load() {
        if (cache) return cache;
        cache = (async () => {
            try { const j = await fromJson(); if (j) return j; } catch (e) { /* weiter */ }
            try { return await fromEvents(); } catch (e) { return null; }
        })();
        return cache;
    }

    function streak(days) {
        let cur = 0;
        for (let i = days.length - 1; i >= 0; i--) { if (days[i][1]) cur++; else if (i === days.length - 1) continue; else break; }
        return cur;
    }

    function render(el, a, opts) {
        const days = a.days.slice(opts.compact ? -26 * 7 : 0);
        // Wochen-Spalten (Sonntag oben, wie bei GitHub)
        const first = new Date(days[0][0] + 'T12:00:00');
        const lead = first.getDay();
        const cells = Array(lead).fill(null).concat(days);
        const weeks = [];
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
        const nz = days.map(d => d[1]).filter(Boolean).sort((x, y) => x - y);
        const q = (p) => nz.length ? nz[Math.min(nz.length - 1, Math.floor(p * nz.length))] : 1;
        const lv = (n) => !n ? 0 : n <= q(0.25) ? 1 : n <= q(0.5) ? 2 : n <= q(0.75) ? 3 : 4;
        let lastM = -1;
        const months = weeks.map((w) => {
            const d = w.find(Boolean);
            const m = d ? new Date(d[0] + 'T12:00:00').getMonth() : lastM;
            const show = m !== lastM && d && new Date(d[0] + 'T12:00:00').getDate() <= 7;
            lastM = m;
            return `<span>${show ? MONTHS[m] : ''}</span>`;
        }).join('');
        const grid = weeks.map(w => `<div class="gh-w">${w.map(d => d
            ? `<i class="l${lv(d[1])}" title="${d[1] ? `${d[1]} ${d[1] === 1 ? 'Beitrag' : 'Beiträge'}` : 'Keine Beiträge'} am ${fmtDay(d[0])}"></i>`
            : '<i class="e"></i>').join('')}</div>`).join('');
        const total = a.source === 'json' && !opts.compact ? a.total : days.reduce((s, d) => s + d[1], 0);
        const span = a.source === 'json' ? (opts.compact ? 'in den letzten 6 Monaten' : 'im letzten Jahr') : 'in den letzten 90 Tagen';
        const cur = a.currentStreak != null ? a.currentStreak : streak(a.days);
        const gh = (CV.data.contact || {}).github;
        el.innerHTML = `
            <div class="gh-act ${opts.compact ? 'compact' : ''}">
                <div class="gh-head">
                    <span class="gh-logo">${CV.icon('github')}</span>
                    <div><strong>GitHub-Aktivität</strong><small>${esc(LOGIN())} · ${a.source === 'json' && a.generated ? 'aktualisiert ' + ago(a.generated) : 'öffentliche Aktivität'}</small></div>
                    ${gh ? `<a class="gh-out" href="${esc(gh)}" target="_blank" rel="noopener">Profil ${CV.icon('external')}</a>` : ''}
                </div>
                <div class="gh-stats">
                    <div><b>${total}</b><span>Beiträge ${span}</span></div>
                    <div><b>${cur}</b><span>${cur === 1 ? 'Tag' : 'Tage'} aktuelle Serie</span></div>
                    ${a.best ? `<div><b>${a.best.count}</b><span>am aktivsten Tag (${fmtDay(a.best.date)})</span></div>` : ''}
                </div>
                <div class="gh-cal-wrap"><div class="gh-cal">
                    <div class="gh-months" style="grid-template-columns:repeat(${weeks.length}, var(--gh-c))">${months}</div>
                    <div class="gh-grid" role="img" aria-label="${total} Beiträge ${span}">${grid}</div>
                </div></div>
                <div class="gh-legend"><span>weniger</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>mehr</span></div>
                ${(a.commits || []).length && !opts.compact ? `<h4>Letzte Commits</h4><ul class="gh-commits">${a.commits.slice(0, 5).map(c => `
                    <li><a href="${esc(c.url)}" target="_blank" rel="noopener"><span class="gh-msg">${esc(c.message)}</span><span class="gh-meta">${esc(c.repo)} · ${esc(ago(c.date))}</span></a></li>`).join('')}</ul>` : ''}
            </div>`;
        const wrap = el.querySelector('.gh-cal-wrap');
        requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });
    }

    CV.GitHub = {
        // Platzhalter füllen; bei fehlenden Daten bleibt er leer (die Link-Karte steht daneben)
        async mount(el, opts = {}) {
            el.innerHTML = '<div class="gh-act loading"><span class="muted small">GitHub-Aktivität wird geladen …</span></div>';
            const a = await load();
            if (!el.isConnected) return;
            if (!a) { el.innerHTML = ''; return; }
            render(el, a, opts);
            if (opts.onReady) opts.onReady();
        },
        load
    };
})();

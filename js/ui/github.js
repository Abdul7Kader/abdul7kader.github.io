// GitHub-Aktivität auf der Seite: Beitrags-Kacheln (wie im GitHub-Profil), Kennzahlen und letzte Commits.
// Quelle 1: github-activity.json (täglich per GitHub Action erzeugt, keine API-Limits für Besucher).
// Quelle 2 (Rückfall): öffentliche Events-API im Browser (letzte 90 Tage). Klappt beides nicht, bleibt nur der Link.
import { esc } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { t, ago, shortDate, monthShort } from '../core/i18n.js';
import { data } from '../app/content.js';

const DAY_MS = 86400e3;
const STALE_DAYS = 3;              // ältere JSON-Datei → frische Fassung direkt aus dem Repo holen
const EVENTS_DAYS = 90;
const EVENTS_PER_PAGE = 100;
const MAX_COMMITS = 5, MAX_EVENT_COMMITS = 6;
const COMPACT_WEEKS = 26;
const LEVEL_QUANTILES = [0.25, 0.5, 0.75];
const DEFAULT_LOGIN = 'Abdul7Kader';

const login = () => (String((data().contact || {}).github || '').match(/github\.com\/([^/?#]+)/i) || [])[1] || DEFAULT_LOGIN;
const noon = (iso) => new Date(iso + 'T12:00:00');
let cache = null;

async function getJson(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
}

async function fromJson() {
    let j = null;
    try { j = await getJson('github-activity.json'); } catch (e) { /* noch nicht erzeugt */ }
    // GitHub Pages baut nach Bot-Commits nicht immer neu – dann die aktuelle Datei direkt aus dem Repo holen
    if (!j || Date.now() - new Date(j.generated).getTime() > STALE_DAYS * DAY_MS) {
        const user = login();
        try { j = await getJson(`https://raw.githubusercontent.com/${user}/${user.toLowerCase()}.github.io/main/github-activity.json`); } catch (e) { /* bleibt beim alten Stand */ }
    }
    return j && Array.isArray(j.days) && j.days.length ? Object.assign(j, { source: 'json' }) : null;
}

async function fromEvents() {
    const r = await fetch(`https://api.github.com/users/${login()}/events/public?per_page=${EVENTS_PER_PAGE}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error(String(r.status));
    const events = await r.json();
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const days = [];
    for (let i = EVENTS_DAYS; i >= 0; i--) days.push([new Date(today - i * DAY_MS).toISOString().slice(0, 10), 0]);
    const index = new Map(days.map((d, i) => [d[0], i]));
    const commits = [];
    for (const e of events) {
        const key = String(e.created_at).slice(0, 10);
        const push = e.type === 'PushEvent';
        const n = push ? Math.max(1, (e.payload && (e.payload.size || (e.payload.commits || []).length)) || 1) : 1;
        if (index.has(key)) days[index.get(key)][1] += n;
        if (push && commits.length < MAX_EVENT_COMMITS) {
            const c = (e.payload.commits || []).slice(-1)[0];
            commits.push({ repo: e.repo.name, message: c ? c.message.split('\n')[0] : t('github.pushed'), date: e.created_at, url: `https://github.com/${e.repo.name}` });
        }
    }
    const total = days.reduce((a, d) => a + d[1], 0);
    if (!total) return null;
    const best = days.reduce((a, d) => (d[1] > (a ? a.count : 0) ? { date: d[0], count: d[1] } : a), null);
    return { source: 'events', days, commits, total, best };
}

/** Aktivität laden (einmal je Seitenaufruf) */
export function loadActivity() {
    if (!cache) {
        cache = (async () => {
            try { const j = await fromJson(); if (j) return j; } catch (e) { /* weiter mit der API */ }
            try { return await fromEvents(); } catch (e) { return null; }
        })();
    }
    return cache;
}

/** Stufen 0–4 der letzten weeks Wochen (älteste zuerst) – für die Leuchtwand in der Spielwelt */
export async function activityLevels(weeks) {
    const a = await loadActivity();
    if (!a) return null;
    const days = a.days.slice(-weeks * 7);
    const active = days.map(d => d[1]).filter(Boolean).sort((x, y) => x - y);
    const q = (p) => (active.length ? active[Math.min(active.length - 1, Math.floor(p * active.length))] : 1);
    const limits = LEVEL_QUANTILES.map(q);
    return days.map(d => (!d[1] ? 0 : 1 + limits.filter(l => d[1] > l).length));
}

/** Aktuelle Serie in Tagen (heute darf noch leer sein) */
function streak(days) {
    let cur = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i][1]) cur++;
        else if (i === days.length - 1) continue;
        else break;
    }
    return cur;
}

function render(el, a, opts) {
    const days = a.days.slice(opts.compact ? -COMPACT_WEEKS * 7 : 0);
    // Wochen-Spalten (Sonntag oben, wie bei GitHub)
    const cells = Array(noon(days[0][0]).getDay()).fill(null).concat(days);
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    // Farbstufen nach Quantilen der aktiven Tage
    const active = days.map(d => d[1]).filter(Boolean).sort((x, y) => x - y);
    const q = (p) => (active.length ? active[Math.min(active.length - 1, Math.floor(p * active.length))] : 1);
    const limits = LEVEL_QUANTILES.map(q);
    const level = (n) => (!n ? 0 : 1 + limits.filter(l => n > l).length);
    let lastMonth = -1;
    const months = weeks.map((w) => {
        const d = w.find(Boolean);
        const date = d && noon(d[0]);
        const m = date ? date.getMonth() : lastMonth;
        const show = m !== lastMonth && date && date.getDate() <= 7;
        lastMonth = m;
        return `<span>${show ? esc(monthShort(m)) : ''}</span>`;
    }).join('');
    const grid = weeks.map(w => `<div class="gh-w">${w.map(d => (d
        ? `<i class="l${level(d[1])}" title="${esc(t('github.dayTitle', { n: d[1], date: shortDate(d[0]) }))}"></i>`
        : '<i class="e"></i>')).join('')}</div>`).join('');
    const total = a.source === 'json' && !opts.compact ? a.total : days.reduce((s, d) => s + d[1], 0);
    const span = a.source === 'json' ? t(opts.compact ? 'github.span6m' : 'github.spanYear') : t('github.span90');
    const cur = a.currentStreak != null ? a.currentStreak : streak(a.days);
    const gh = (data().contact || {}).github;
    el.innerHTML = `
        <div class="gh-act ${opts.compact ? 'compact' : ''}">
            <div class="gh-head">
                <span class="gh-logo">${icon('github')}</span>
                <div><strong>${esc(t('github.title'))}</strong><small>${esc(login())} · ${esc(a.source === 'json' && a.generated ? t('github.updated', { ago: ago(a.generated) }) : t('github.public'))}</small></div>
                ${gh ? `<a class="gh-out" href="${esc(gh)}" target="_blank" rel="noopener">${esc(t('github.profile'))} ${icon('external')}</a>` : ''}
            </div>
            <div class="gh-stats">
                <div><b>${total}</b><span>${esc(t('github.contributions', { span }))}</span></div>
                <div><b>${cur}</b><span>${esc(t('github.streak', { n: cur }))}</span></div>
                ${a.best ? `<div><b>${a.best.count}</b><span>${esc(t('github.bestDay', { date: shortDate(a.best.date) }))}</span></div>` : ''}
            </div>
            <div class="gh-cal-wrap"><div class="gh-cal">
                <div class="gh-months" style="grid-template-columns:repeat(${weeks.length}, var(--gh-c))">${months}</div>
                <div class="gh-grid" role="img" aria-label="${esc(total + ' ' + t('github.contributions', { span }))}">${grid}</div>
            </div></div>
            <div class="gh-legend"><span>${esc(t('github.less'))}</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>${esc(t('github.more'))}</span></div>
            ${(a.commits || []).length && !opts.compact ? `<h4>${esc(t('github.latest'))}</h4><ul class="gh-commits">${a.commits.slice(0, MAX_COMMITS).map(c => `
                <li><a href="${esc(c.url)}" target="_blank" rel="noopener"><span class="gh-msg">${esc(c.message)}</span><span class="gh-meta">${esc(c.repo)} · ${esc(ago(c.date))}</span></a></li>`).join('')}</ul>` : ''}
        </div>`;
    const wrap = el.querySelector('.gh-cal-wrap');
    requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });   // neueste Wochen sichtbar
}

/** Platzhalter füllen; ohne Daten bleibt er leer (die Link-Karte daneben bleibt stehen) */
export async function mountGitHub(el, opts = {}) {
    el.innerHTML = `<div class="gh-act loading"><span class="muted small">${esc(t('github.loading'))}</span></div>`;
    const a = await loadActivity();
    if (!el.isConnected) return;
    if (!a) { el.innerHTML = ''; return; }
    render(el, a, opts);
    if (opts.onReady) opts.onReady();
}

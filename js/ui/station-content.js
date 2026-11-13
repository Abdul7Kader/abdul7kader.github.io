// Inhalte der Stations-Dialoge („Fakten“). Jede Funktion liefert HTML; Daten kommen aus app/content.js.
// Nach dem Einfügen ruft station.js mountExtras() auf (Weltkarte, Projekt-Viertel, GitHub-Kacheln).
import { esc, $$ } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { levelPct, noEmoji, hobbyIcon, projStage, displayDate } from '../core/derive.js';
import { reducedMotion } from '../core/env.js';
import { audio } from '../core/audio.js';
import { data, derived } from '../app/content.js';
import { mountWorldMap } from './worldmap.js';
import { mountQuarter } from './project-quarter.js';
import { mountGitHub } from './github.js';

const sinceDate = (date) => String(date).split('-')[0].trim();

/** Zeitleiste (Ausbildung, Beruf) */
export const timeline = (items, map) => `<ol class="timeline">${items.map(it => {
    const m = map(it);
    const bullets = (m.bullets || []).length ? `<ul class="tl-bullets">${m.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
    return `<li class="${m.current ? 'current' : ''}"><span class="tl-date">${esc(displayDate(m.date))}${m.current ? ` <em>${esc(t('facts.current'))}</em>` : ''}</span><strong>${esc(m.title)}</strong><span class="tl-sub">${esc(m.sub)}</span>${m.badge ? `<span class="noai">${esc(m.badge)}</span>` : ''}${bullets}</li>`;
}).join('')}</ol>`;
const chips = (list) => `<div class="chips">${list.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>`;
const langBars = () => `<div class="langs">${derived().languages.map(l => `
    <div class="lang"><div class="lang-top"><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></div>
    <div class="bar"><i data-pct="${levelPct(l.level)}"></i></div></div>`).join('')}</div>`;
function githubCard() {
    const gh = (data().contact || {}).github;
    return gh ? `<a class="gh-card" href="${esc(gh)}" target="_blank" rel="noopener"><span class="gh-ic">${icon('github')}</span><span><strong>${esc(t('facts.myGithub'))}</strong><small>${esc(gh.replace(/^https?:\/\/(www\.)?/, ''))}</small></span><span class="gh-go">${esc(t('facts.open'))} ↗</span></a>` : '';
}
const founderCard = () => {
    const f = derived().founderRole;
    return f ? `<div class="role-card"><span class="kicker">${esc(t('facts.ownCompanySince', { since: sinceDate(f.date) }))}</span><strong>${esc(f.role)}</strong><span>${esc(f.company)}</span></div>` : '';
};

export const CONTENT = {
    arrival() {
        const travels = data().travels || [];
        const home = travels.find(x => x.type === 'home' || /heimat|home/i.test(x.date));
        const arrival = travels.find(x => x.type === 'arrival' || /einreise|ankunft|arrival/i.test(x.country));
        const countries = derived().countries;
        return `
            <div class="facts">
                ${arrival ? `<div class="fact"><b>${esc(arrival.date)}</b><span>${esc(arrival.country)}</span></div>` : ''}
                <div class="fact"><b>${countries.length}</b><span>${esc(t('facts.countriesSeen'))}</span></div>
                ${home ? `<div class="fact"><b>${esc(home.country)}</b><span>${esc(t('facts.home'))}</span></div>` : ''}
            </div>
            <h3>${esc(t('facts.myMap'))}</h3>
            <div class="wm-root"></div>
            <h3>${esc(t('facts.countries'))}</h3>
            <div class="flags">${countries.map(c => `<span class="flagchip">${esc(c)}</span>`).join('')}</div>`;
    },
    school() {
        return `<h3>${esc(t('facts.educationPath'))}</h3>${timeline(derived().educationDesc, e => ({ date: e.date, title: e.title, sub: e.detail, current: e.range.current, bullets: e.bullets }))}
            <h3>${esc(t('facts.languagesToday'))}</h3>${langBars()}`;
    },
    career() {
        return `<h3>${esc(t('facts.experience'))}</h3>${timeline(derived().experienceDesc, e => ({ date: e.date, title: e.role, sub: e.company, current: e.range.current, bullets: e.bullets, badge: e.badge }))}`;
    },
    lab() {
        const d = data();
        return `
            ${(d.aiSkills || []).length ? `<h3>${esc(t('facts.aiSkills'))}</h3><div class="ai-grid">${d.aiSkills.map(a => `<div class="ai-item"><strong>${esc(a.name)}</strong><span>${esc(a.text)}</span></div>`).join('')}</div>` : ''}
            ${derived().skills.map(s => `<h3>${esc(s.name)}${s.note ? ` <small class="h-note">${esc(s.note)}</small>` : ''}</h3>${chips(String(s.level).split(',').map(x => x.trim()).filter(Boolean))}`).join('')}
            <h3>${esc(t('facts.workingOn'))}</h3>
            <div class="gh-root"></div>
            ${githubCard()}`;
    },
    projects(result) {
        const list = data().projects || [];
        return `${founderCard()}
        <h3>${esc(t('facts.quarter'))} <small class="h-note">${esc(result && result.stars ? t('facts.quarterReward') : t('facts.quarterTap'))}</small></h3>
        <div class="pv-wrap"></div>
        <div class="pv-legend"><span class="done">${esc(t('projects.legend.done'))}</span><span class="build">${esc(t('projects.legend.build'))}</span><span class="base">${esc(t('projects.legend.base'))}</span></div>
        <div class="projects">${list.map((p, i) => {
            const stg = projStage(p);
            return `<article class="project pv-card" data-i="${i}" tabindex="0">
                <div class="pv-head"><span class="kicker">${esc(p.tag || t('facts.project'))}</span><span class="tag ${stg.cls}">${esc(stg.label)}</span></div>
                <strong>${esc(p.title)}</strong>
                <div class="pv-bar"><i data-pct="${stg.pct}" class="${stg.cls}"></i></div>
                <p>${esc(p.detail)}</p>
                ${p.tech ? `<small class="pv-tech">${esc(p.tech)}</small>` : ''}
                ${p.link ? `<a class="pv-link" href="${esc(p.link)}" target="_blank" rel="noopener">${esc(t('facts.view'))} ${icon('external')}</a>` : `<span class="pv-soon">${esc(t('facts.linkSoon'))}</span>`}
            </article>`;
        }).join('')}</div>`;
    },
    lake() {
        const d = data();
        return `<h3>${esc(t('facts.leisure'))}</h3><div class="hobbies">${(d.hobbies || []).map(h => {
            const text = noEmoji(h);
            return `<div class="hobby"><b>${icon(hobbyIcon(text))}</b><span>${esc(text)}</span></div>`;
        }).join('')}</div>
        ${(d.volunteer || []).length ? `<h3>${esc(t('facts.volunteering'))}</h3><div class="vol-grid">${d.volunteer.map(v => `
            <article class="vol">
                <span class="vol-ic">${icon(v.icon || 'heart')}</span>
                <div><span class="vol-meta">${esc(v.date || '')}${v.role ? ' · ' + esc(v.role) : ''}</span>
                <strong>${esc(v.title)}</strong>
                <p>${esc(v.text || v.detail || '')}</p></div>
            </article>`).join('')}</div>` : ''}`;
    }
};

/** Bausteine nach dem Einfügen starten (Weltkarte, Projekt-Viertel, GitHub, Balken) */
export function mountExtras(body, result) {
    const gh = body.querySelector('.gh-root');
    if (gh) mountGitHub(gh, { onReady: () => { const link = body.querySelector('.gh-card'); if (link && gh.nextElementSibling === link) link.remove(); } });
    const wm = body.querySelector('.wm-root');
    if (wm) mountWorldMap(wm, derived().countries);
    const pv = body.querySelector('.pv-wrap');
    if (pv) {
        const cards = $$('.pv-card', body);
        const mark = (i) => cards.forEach((el, k) => el.classList.toggle('sel', k === i));
        const q = mountQuarter(pv, data().projects, {
            animate: !!(result && result.stars),
            name: derived().firstName,
            onSelect: (i) => { audio.play('click'); mark(i); if (cards[i]) cards[i].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' }); }
        });
        cards.forEach((el, i) => {
            const go = () => { mark(i); q.select(i); q.scrollTo(i); };
            el.addEventListener('click', (e) => { if (!e.target.closest('a')) go(); });
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        });
    }
    animateBars(body);
}

/** Balken (Sprachen, Fortschritt) nach dem Einblenden auf ihre Länge wachsen lassen */
export function animateBars(root) {
    const BAR_DELAY_MS = 80;
    requestAnimationFrame(() => setTimeout(() => { root.querySelectorAll('[data-pct]').forEach(el => { el.style.width = el.dataset.pct + '%'; }); }, BAR_DELAY_MS));
}

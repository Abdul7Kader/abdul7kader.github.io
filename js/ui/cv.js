// Kompakter Lebenslauf (eine Seite, druck- und PDF-fähig).
import { $, $$, esc } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { emit } from '../core/events.js';
import { levelPct, noEmoji, projStage, displayDate } from '../core/derive.js';
import { progress } from '../app/progress.js';
import { data, derived } from '../app/content.js';
import { showOverlay, hideOverlay, isOpen } from './overlays.js';
import { animateBars } from './station-content.js';
import { mountGitHub } from './github.js';
import { savePdf } from './pdf.js';

let returnTo = 'world';

const siteUrl = () => location.origin + location.pathname;
const siteLabel = () => (location.host + location.pathname).replace(/index\.html$/, '').replace(/\/$/, '');

function contactLine(d) {
    const c = d.contact || {};
    return [
        d.location ? `<span>${icon('pin')} ${esc(d.location)}</span>` : '',
        c.email ? `<a href="mailto:${esc(c.email)}">${icon('mail')} ${esc(c.email)}</a>` : '',
        c.phone ? `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${icon('phone')} ${esc(c.phone)}</a>` : '',
        c.linkedin ? `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${icon('linkedin')} LinkedIn</a>` : '',
        c.github ? `<a href="${esc(c.github)}" target="_blank" rel="noopener">${icon('github')} ${esc(c.github.replace(/^https?:\/\/(www\.)?/, ''))}</a>` : '',
        `<a href="${esc(siteUrl())}" target="_blank" rel="noopener" class="only-print">${icon('globe')} ${esc(siteLabel())}</a>`
    ].filter(Boolean).join('');
}

const timeline = (items, map) => `<ol class="cv-tl">${items.map(it => {
    const m = map(it);
    return `<li class="${m.current ? 'current' : ''}"><span class="d">${esc(displayDate(m.date))}</span><div><strong>${esc(m.title)}</strong><span>${esc(m.sub)}</span>${m.badge ? `<em class="cv-noai">${esc(m.badge)}${m.note ? ` – ${esc(m.note)}` : ''}</em>` : ''}${(m.bullets || []).length ? `<ul class="cv-bullets">${m.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</div></li>`;
}).join('')}</ol>`;

export function renderCv() {
    const d = data(), x = derived();
    $('#cv-sheet').innerHTML = `
        <div class="cv-toolbar no-print">
            <button class="btn ghost small" data-act="back">← ${esc(returnTo === 'start' ? t('cv.back') : t('cv.backToWorld'))}</button>
            <div class="tb-r">
                <button class="btn ghost small" data-act="contact">${icon('send')} ${esc(t('cv.contact'))}</button>
                <button class="btn dark small" data-act="print">${icon('download')} ${esc(t('cv.savePdf'))}</button>
            </div>
        </div>
        <article class="cv-page">
            <header class="cv-head">
                <img src="${esc(d.profileImage)}" alt="${esc(t('cv.photoOf', { name: d.name }))}">
                <div>
                    <h1>${esc(d.name)}</h1>
                    <p class="cv-title">${esc(d.title)}</p>
                    ${d.availability ? `<p class="cv-avail"><i></i>${esc(d.availability)}</p>` : ''}
                    <p class="cv-contact">${contactLine(d)}</p>
                </div>
            </header>
            ${d.summary ? `<p class="cv-summary">${esc(d.summary)}</p>` : ''}
            ${(d.strengths || []).length ? `<section class="cv-strengths">${d.strengths.map(s => `<div><b>${icon(s.icon) || icon('check')}</b><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></div>`).join('')}</section>` : ''}
            <div class="cv-grid">
                <div>
                    ${(d.aiSkills || []).length ? `<h2>${esc(t('cv.aiSkills'))}</h2><dl class="cv-dl">${d.aiSkills.map(a => `<dt>${esc(a.name)}</dt><dd>${esc(a.text)}</dd>`).join('')}</dl>` : ''}
                    <h2>${esc(t('cv.experience'))}</h2>
                    ${timeline(x.experienceDesc, e => ({ date: e.date, title: e.role, sub: e.company, current: e.range.current, bullets: e.bullets, badge: e.badge, note: e.note }))}
                    <h2>${esc(t('cv.education'))}</h2>
                    ${timeline(x.educationDesc, e => ({ date: e.date, title: e.title, sub: e.detail, current: e.range.current, bullets: e.bullets }))}
                    <div class="no-print cv-gh"><h2>${esc(t('cv.github'))}</h2><div class="gh-root"></div></div>
                    ${(d.volunteer || []).length ? `<h2>${esc(t('cv.volunteering'))}</h2>${timeline(d.volunteer, v => ({ date: v.date, title: v.title, sub: v.role || v.detail || '' }))}` : ''}
                </div>
                <aside>
                    <h2>${esc(t('cv.skills'))}</h2>
                    ${x.skills.map(s => `<h4>${esc(s.name)}</h4><p class="cv-chips">${String(s.level).split(',').map(v => `<span>${esc(v.trim())}</span>`).join('')}</p>${s.note ? `<p class="cv-note">${esc(s.note)}</p>` : ''}`).join('')}
                    <h2>${esc(t('cv.projects'))}</h2>
                    <ul class="cv-projects">${(d.projects || []).map(p => { const stg = projStage(p); return `<li><strong>${esc(p.title)}</strong> <em class="cv-stage ${stg.cls}">${esc(stg.label)}</em>${p.tech ? `<small>${esc(p.tech)}</small>` : ''}<span>${esc(p.detail)}</span></li>`; }).join('')}</ul>
                    <h2>${esc(t('cv.languages'))}</h2>
                    ${x.languages.map(l => `<div class="cv-lang"><div><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></div><div class="bar"><i data-pct="${levelPct(l.level)}"></i></div></div>`).join('')}
                    <h2>${esc(t('cv.interests'))}</h2>
                    <p class="cv-travel">${(d.hobbies || []).map(h => esc(noEmoji(h))).join(' · ')}</p>
                    <h2>${esc(t('cv.travel'))}</h2>
                    <p class="cv-travel"><strong>${esc(t('cv.countries', { n: x.countries.length }))}</strong> – ${x.countries.map(n => esc(n)).join(', ')}</p>
                    ${(d.extras || []).length ? `<h2>${esc(t('cv.more'))}</h2><ul class="cv-plain">${d.extras.map(e => `<li><strong>${esc(e.name)}:</strong> ${esc(e.text)}</li>`).join('')}</ul>` : ''}
                </aside>
            </div>
        </article>
        <footer class="cv-foot no-print">
            <div><strong>${esc(t('cv.playTitle'))}</strong>${esc(t('cv.playText', { n: progress.chapters.length }))}</div>
            <button class="btn primary" data-act="play">▶ ${esc(t('cv.play'))}</button>
        </footer>`;
    const sheet = $('#cv-sheet');
    sheet.querySelector('[data-act="back"]').onclick = () => closeCv();
    sheet.querySelector('[data-act="print"]').onclick = (e) => { audio.play('click'); savePdf(e.currentTarget); };
    sheet.querySelector('[data-act="contact"]').onclick = () => { audio.play('click'); emit('contact:open', {}); };
    sheet.querySelector('[data-act="play"]').onclick = () => closeCv(true);
    animateBars(sheet);
    const gh = sheet.querySelector('.gh-root');
    if (gh) mountGitHub(gh, { compact: true }).then(() => { if (!gh.innerHTML) gh.parentElement.remove(); });
}

/** returnTo: 'start' (vom Startbildschirm) oder 'world' */
export function openCv(from = 'world') {
    returnTo = from === 'start' ? 'start' : 'world';
    renderCv();
    showOverlay('cv');
    $('#cv').scrollTop = 0;
    audio.play('open');
}

/** play = true: direkt das Spiel starten */
export function closeCv(play = false) {
    hideOverlay('cv');
    if (play && !progress.started) emit('game:start');
    else if (returnTo === 'start' && !progress.started) $('#start').classList.remove('hidden');
}

/** PDF aus dem geöffneten Lebenslauf */
export function savePdfFromCv() {
    if (!isOpen('cv')) openCv('world');
    savePdf($('#cv-sheet [data-act="print"]'));
}

// Auch Strg+P druckt den kompakten Lebenslauf.
export function setupPrint() {
    window.addEventListener('beforeprint', () => {
        if (!$('#cv-sheet').innerHTML) renderCv();
        $$('#cv-sheet [data-pct]').forEach(el => { el.style.width = el.dataset.pct + '%'; });
    });
}

// Befehlspalette (Strg+K, /): Aktionen, Kapitel und alle Inhalte durchsuchen.
import { $, $$, esc } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { emit } from '../core/events.js';
import { skillIcon, noEmoji } from '../core/derive.js';
import { World } from '../world/world.js';
import { progress } from '../app/progress.js';
import { data, derived, station } from '../app/content.js';
import { showOverlay, hideOverlay } from './overlays.js';

const MAX_RESULTS = 14;
const SCORE = { titleStart: 3, titleHas: 2, anyHas: 1, contentBonus: 0.5 };
const DELAY = { walk: 120, info: 60, pdf: 300, focus: 30 };
const GROUP = { actions: 'actions', chapters: 'chapters', content: 'content' };

let items = [], view = [], sel = 0;

function buildIndex() {
    const d = data(), x = derived(), c = d.contact || {}, list = [];
    const title = (id) => station(id).title || id;
    const close = () => hideOverlay('palette');
    const goto = (id) => () => { close(); setTimeout(() => World.walkToStation(id), DELAY.walk); };
    const info = (id) => () => { close(); World.teleportTo(id); setTimeout(() => emit('station:open', { id, info: true }), DELAY.info); };
    const emojiOf = (id) => (World.stations.find(s => s.id === id) || {}).emoji || '📍';
    const add = (g, ic, tt, s, q, run, extra = {}) => list.push({ g, ic, t: tt, s, q, run, ...extra });
    const A = GROUP.actions, C = GROUP.content;

    add(A, '📄', t('palette.cv'), t('palette.cvSub'), t('palette.cvQ'), () => { close(); emit('cv:open', { from: 'world' }); }, { k: 'L' });
    add(A, '📄', t('palette.pdf'), t('palette.pdfSub'), t('palette.pdfQ'), () => { close(); emit('cv:open', { from: 'world' }); setTimeout(() => emit('pdf:save'), DELAY.pdf); });
    add(A, '🗺️', t('palette.journey'), t('palette.journeySub'), t('palette.journeyQ'), () => { close(); emit('journey:open'); }, { k: 'M' });
    const next = progress.nextId();
    if (next) add(A, '🎯', t('palette.next', { title: title(next) }), t('palette.nextSub'), t('palette.nextQ'), goto(next), { k: 'G' });
    add(A, audio.state.sfx ? '🔇' : '🔊', audio.state.sfx ? t('palette.soundOff') : t('palette.soundOn'), t('palette.soundSub'), t('palette.soundQ'), () => { $('#btn-sound').click(); close(); });
    add(A, '✉️', t('palette.contact'), t('palette.contactSub'), t('palette.contactQ'), () => { close(); emit('contact:open', {}); });
    add(A, '🌐', t('palette.lang'), t('palette.langSub'), t('palette.langQ'), () => { close(); emit('lang:toggle'); });
    add(A, '🌓', t('palette.theme'), t('palette.themeSub'), t('palette.themeQ'), () => { close(); emit('theme:toggle'); });
    if (c.email) add(A, '✉️', t('palette.email'), c.email, 'kontakt contact mail email', () => { location.href = 'mailto:' + c.email; });
    if (c.github) add(A, '🐙', t('palette.github'), c.github.replace(/^https?:\/\//, ''), 'github code repo', () => window.open(c.github, '_blank', 'noopener'));

    progress.order.forEach((id, i) => {
        const s = station(id);
        const num = i < progress.chapters.length ? `${i + 1}. ` : '';
        add(GROUP.chapters, emojiOf(id), num + title(id), [s.era, s.badge].filter(Boolean).join(' · '), `${title(id)} ${s.badge || ''} ${s.story || ''}`, goto(id));
    });

    x.skillTokens.forEach(tk => add(C, skillIcon(tk), tk, t('palette.skill', { place: title('lab') }), tk, info('lab')));
    x.experienceDesc.forEach(e => add(C, '💼', e.role, `${e.company} · ${e.date}`, `${e.role} ${e.company} ${t('palette.jobQ')}`, info('career')));
    x.academic.forEach(e => add(C, '🎓', e.title, `${e.detail} · ${e.date}`, `${e.title} ${e.detail} ${t('palette.educationQ')}`, info('school')));
    x.languages.forEach(l => add(C, '🗣️', l.name, t('palette.language', { level: l.level }), `${l.name} ${l.level} ${t('palette.languageQ')}`, info('school')));
    (d.projects || []).forEach(p => add(C, '🚀', p.title, t('palette.project', { tech: p.tech }), `${p.title} ${p.tech} ${p.detail} ${t('palette.projectQ')}`, info('projects')));
    (d.aiSkills || []).forEach(a => add(C, '🤖', a.name, t('palette.aiSkill'), `${a.name} ${a.text} ki ai prompt`, info('lab')));
    (d.volunteer || []).forEach(v => add(C, '💛', v.title, t('palette.volunteer', { date: v.date }), `${v.title} ${v.detail || ''} ${t('palette.volunteerQ')}`, info('lake')));
    (d.hobbies || []).forEach(h => add(C, '🏄', noEmoji(h), t('palette.hobby'), `${h} ${t('palette.hobbyQ')}`, info('lake')));
    x.countries.forEach(cn => add(C, '🌍', cn, t('palette.country'), `${cn} ${t('palette.countryQ')}`, info('arrival')));
    return list;
}

// Suche ohne Akzente/Umlaut-Punkte: „Uber“ findet „Über“
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function highlight(text, q) {
    if (!q) return esc(text);
    const i = norm(text).indexOf(norm(q));
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

function score(it, nq) {
    const title = norm(it.t), all = norm(it.t + ' ' + it.s + ' ' + it.q);
    const s = title.startsWith(nq) ? SCORE.titleStart : title.includes(nq) ? SCORE.titleHas : all.includes(nq) ? SCORE.anyHas : 0;
    return s ? s + (it.g === GROUP.content ? SCORE.contentBonus : 0) : 0;
}

function render() {
    const q = $('#pal-q').value.trim(), nq = norm(q);
    view = !nq
        ? items.filter(it => it.g !== GROUP.content)
        : items.map(it => [score(it, nq), it]).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, MAX_RESULTS).map(a => a[1]);
    sel = Math.min(sel, Math.max(0, view.length - 1));
    const list = $('#pal-list');
    if (!view.length) { list.innerHTML = `<li class="pal-empty">${esc(t('palette.empty', { q }))}</li>`; return; }
    let lastGroup = '';
    list.innerHTML = view.map((it, i) => {
        const head = it.g !== lastGroup ? `<li class="pal-group">${esc(t('palette.group.' + it.g))}</li>` : '';
        lastGroup = it.g;
        return `${head}<li class="pal-item ${i === sel ? 'sel' : ''}" data-i="${i}" role="option"><span class="pi-ic">${it.icHtml || esc(it.ic)}</span><span class="pi-t"><strong>${highlight(it.t, q)}</strong><small>${esc(it.s || '')}</small></span>${it.k ? `<kbd>${esc(it.k)}</kbd>` : '<span class="pi-k">↵</span>'}</li>`;
    }).join('');
    const cur = list.querySelector('.pal-item.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
}

function run(i) { const it = view[i]; if (it) { audio.play('click'); it.run(); } }

export function openPalette() {
    items = buildIndex(); sel = 0;
    const inp = $('#pal-q');
    inp.value = '';
    render();
    showOverlay('palette');
    audio.play('click');
    setTimeout(() => inp.focus(), DELAY.focus);
}

/** Einmalig beim Start: Eingabe, Pfeiltasten, Maus */
export function setupPalette() {
    const inp = $('#pal-q'), list = $('#pal-list');
    inp.addEventListener('input', () => { sel = 0; render(); });
    inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(view.length - 1, sel + 1); render(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); render(); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); run(sel); }
    });
    list.addEventListener('click', (e) => { const li = e.target.closest('.pal-item'); if (li) run(+li.dataset.i); });
    list.addEventListener('mousemove', (e) => {
        const li = e.target.closest('.pal-item');
        if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; $$('#pal-list .pal-item').forEach(x => x.classList.toggle('sel', x === li)); }
    });
}

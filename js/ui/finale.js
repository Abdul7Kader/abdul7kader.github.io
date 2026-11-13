// Finale „Ihr Unternehmen“: Foto mit Namensaufkleber auf dem T-Shirt (jubelbild-nah.jpg, 838 × 944).
// Der eingegebene Firmenname wird wie mit einem Marker auf den Aufkleber geschrieben; Falten und Licht des Shirts liegen darüber.
import { esc } from '../core/dom.js';
import { FONT } from '../core/canvas.js';
import { icon } from '../core/icons.js';
import { t } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { emit } from '../core/events.js';
import { FINALE } from '../config/layout.js';
import { BADGE_ICONS, stationColors } from '../config/theme.js';
import { World } from '../world/world.js';
import { progress, MAX_STARS_PER_GAME } from '../app/progress.js';
import { data, derived, station } from '../app/content.js';

/** Lage des Aufklebers im Foto (Bildpixel) */
const STICKER = { cx: 384, cy: 668, w: 292, h: 140, rot: -0.035, band: 0.3, r: 11 };
const STICKER_STYLE = {
    paper: '#fbfaf6', band: '#e8553a', bandText: '#fff', ink: '#16213f',
    padX: 34, padBottom: 10, maxSize: 46, minSize: 26, twoLineSize: 40, absMinSize: 14, lineHeight: 1.02,
    shadowBlurPx: 3, shadowAlpha: 0.18, edge: 'rgba(0,0,0,0.08)',
    fabric: 'grayscale(1) brightness(1.13) contrast(1.35)', fabricAlpha: 0.75
};
const MARKER = '"Permanent Marker", "Segoe Print", "Comic Sans MS", cursive';
const FIRM_MAX_LENGTH = 28;
const CONFETTI = [160, 120], CONFETTI_GAP_MS = 600, FOCUS_DELAY_MS = 400;

function stickerShape(c, S) { c.beginPath(); if (c.roundRect) c.roundRect(-S.w / 2, -S.h / 2, S.w, S.h, S.r); else c.rect(-S.w / 2, -S.h / 2, S.w, S.h); }

function stickerText(c, name, S) {
    const P = STICKER_STYLE;
    const maxW = S.w - P.padX, areaTop = -S.h / 2 + S.h * S.band, areaH = S.h * (1 - S.band);
    let size = P.maxSize, lines = [name];
    const fits = () => lines.every(l => { c.font = `${size}px ${MARKER}`; return c.measureText(l).width <= maxW; }) && lines.length * size * P.lineHeight <= areaH - P.padBottom;
    while (!fits() && size > P.minSize) size -= 1;
    if (!fits() && name.includes(' ')) {               // lange Namen auf zwei Zeilen verteilen
        const words = name.split(/\s+/);
        let best = null;
        for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
            const d = Math.abs(a.length - b.length);
            if (!best || d < best.d) best = { d, l: [a, b] };
        }
        lines = best.l; size = P.twoLineSize;
    }
    while (!fits() && size > P.absMinSize) size -= 1;
    c.fillStyle = P.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    const lh = size * P.lineHeight, y0 = areaTop + areaH / 2 - (lines.length - 1) * lh / 2 + size * 0.06;
    lines.forEach((l, i) => {
        c.font = `${size}px ${MARKER}`;
        c.save(); c.translate(0, y0 + i * lh); c.rotate(-0.025 + i * 0.015);
        c.fillText(l, 0, 0); c.restore();
    });
}

/** Foto mit beschriftetem Aufkleber in die Leinwand zeichnen (auch für das PDF genutzt) */
export function shirtPrint(cnv, img, name) {
    const S = STICKER, P = STICKER_STYLE;
    const W = img.naturalWidth, H = img.naturalHeight;
    cnv.width = W; cnv.height = H;
    const c = cnv.getContext('2d');
    c.drawImage(img, 0, 0);
    name = String(name || '').trim();
    // Aufkleber-Ebene in Bildgröße
    const L = document.createElement('canvas'); L.width = W; L.height = H;
    const s = L.getContext('2d');
    s.save(); s.translate(S.cx, S.cy); s.rotate(S.rot);
    stickerShape(s, S); s.fillStyle = P.paper; s.fill();
    s.save(); stickerShape(s, S); s.clip();
    s.fillStyle = P.band; s.fillRect(-S.w / 2, -S.h / 2, S.w, S.h * S.band);
    s.fillStyle = P.bandText; s.textAlign = 'center'; s.textBaseline = 'middle';
    s.font = `800 ${Math.round(S.h * 0.11)}px ${FONT}`;
    if (s.letterSpacing !== undefined) s.letterSpacing = '2px';
    s.fillText(t('finale.stickerBand'), 0, -S.h / 2 + S.h * S.band / 2 + 1);
    if (s.letterSpacing !== undefined) s.letterSpacing = '0px';
    s.restore();
    if (name) stickerText(s, name, S);
    s.restore();
    // Stoff-Schattierung: das Foto multiplizieren (aufgehellt), danach wieder auf die Aufkleberform zuschneiden
    s.save();
    s.globalCompositeOperation = 'multiply';
    s.filter = P.fabric;
    s.globalAlpha = P.fabricAlpha;
    s.drawImage(img, 0, 0);
    s.restore();
    s.save(); s.globalCompositeOperation = 'destination-in';
    s.translate(S.cx, S.cy); s.rotate(S.rot); stickerShape(s, S); s.fillStyle = '#000'; s.fill();
    s.restore();
    // dezenter Schatten und Kante, dann aufs Foto
    c.save();
    c.translate(S.cx, S.cy + 2); c.rotate(S.rot);
    c.filter = `blur(${P.shadowBlurPx}px)`; c.globalAlpha = P.shadowAlpha; c.fillStyle = '#000';
    stickerShape(c, S); c.fill();
    c.restore();
    c.drawImage(L, 0, 0);
    c.save(); c.translate(S.cx, S.cy); c.rotate(S.rot);
    c.strokeStyle = P.edge; c.lineWidth = 1.2; stickerShape(c, S); c.stroke();
    c.restore();
}

export function renderFinale(body) {
    const d = data(), c = d.contact || {}, first = derived().firstName;
    const n = progress.chapters.length, done = progress.doneCount;
    progress.markVisited(FINALE);
    body.innerHTML = `
        <div class="finale">
            <div class="tshirt">
                <canvas class="tshirt-cnv" aria-label="${esc(t('finale.photoLabel', { name: d.name }))}"></canvas>
                <span class="trophy">🏆</span>
            </div>
            <label class="firm">
                <span>${esc(t('finale.firmLabel'))}</span>
                <input id="firm-input" type="text" maxlength="${FIRM_MAX_LENGTH}" autocomplete="organization" placeholder="${esc(t('finale.firmPlaceholder'))}" value="${esc(progress.firm)}">
                <small>${esc(t('finale.firmHint'))}</small>
            </label>
            <div class="firm-next"><button class="btn primary big" data-act="contact">${icon('send')} <span>${esc(t('finale.contactName', { name: derived().contactName }))}</span></button></div>
            <h3 class="finale-title">${esc(done === n ? t('finale.allExplored') : t('finale.explored', { done, total: n }))}</h3>
            <p class="finale-text">${esc(station(FINALE).story || '')}</p>
            <div class="cert">
                <div class="cert-head"><span class="kicker">${esc(t('finale.insights', { name: first }))}</span><span class="total">⭐ ${esc(t('finale.starsTotal', { n: progress.totalStars, max: n * MAX_STARS_PER_GAME }))}</span></div>
                <ul class="cert-list">
                    ${progress.chapters.map(id => {
                        const s = station(id), sN = progress.stars(id);
                        return `<li class="got"><b style="--bc:${stationColors(id)[0]}">${icon(BADGE_ICONS[id])}</b><span><strong>${esc(s.badge || '')}</strong><small>${esc(s.title || '')}</small>${sN ? `<span class="st">${'★'.repeat(sN)}</span>` : ''}</span></li>`;
                    }).join('')}
                </ul>
            </div>
            <div class="cta">
                <button class="btn ghost" data-act="cv">${icon('file')} ${esc(t('finale.cvAndPdf'))}</button>
                ${c.phone ? `<a class="btn ghost" href="tel:${esc(c.phone.replace(/\s/g, ''))}">${icon('phone')} ${esc(c.phone)}</a>` : ''}
                ${c.linkedin ? `<a class="btn ghost" href="${esc(c.linkedin)}" target="_blank" rel="noopener">${icon('linkedin')} LinkedIn</a>` : ''}
            </div>
        </div>`;
    audio.play('fanfare');
    World.confettiOnPlayer(CONFETTI[0]);
    setTimeout(() => World.confettiOnPlayer(CONFETTI[1]), CONFETTI_GAP_MS);

    const cnv = body.querySelector('.tshirt-cnv');
    const img = new Image();
    let pending = 0;
    const draw = () => { if (img.complete && img.naturalWidth) shirtPrint(cnv, img, progress.firm); };
    img.onload = () => {
        draw();
        if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`40px ${MARKER}`), document.fonts.load('800 16px Outfit')]).then(draw, draw);
    };
    img.src = d.finaleImage || d.congratsImage || d.profileImage;

    const inp = body.querySelector('#firm-input');
    const contact = () => { audio.play('click'); emit('contact:open', { firm: progress.firm }); };
    inp.addEventListener('input', () => {
        progress.setFirm(inp.value);
        cancelAnimationFrame(pending); pending = requestAnimationFrame(draw);
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && progress.firm) { e.preventDefault(); contact(); } });
    body.querySelector('[data-act="contact"]').onclick = contact;
    if (!progress.firm) setTimeout(() => inp.isConnected && inp.focus({ preventScroll: true }), FOCUS_DELAY_MS);
    body.querySelector('[data-act="cv"]').onclick = () => emit('cv:open', { from: 'finale' });
}

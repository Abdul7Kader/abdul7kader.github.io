// „Als PDF speichern“: erzeugt das PDF direkt im Browser und lädt es als Datei herunter –
// farbig und unabhängig von den Druckeinstellungen (die lassen Hintergrundfarben oft weg).
// So funktioniert es: html2canvas „fotografiert“ eine A4-breite Kopie des Lebenslaufs, jsPDF verteilt das Bild
// auf A4-Seiten (Umbrüche nur zwischen Einträgen) und legt eine unsichtbare Textebene darüber –
// dadurch ist der Text im PDF auswählbar und durchsuchbar (wichtig für Bewerbermanagement-Systeme).
// Die Bibliotheken liegen lokal in vendor/ und werden erst beim Klick geladen. Klappt etwas nicht,
// öffnet sich als Rückfall der Druckdialog. Das PDF ist immer hell (auch im dunklen Farbmodus).
import { $ } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { data } from '../app/content.js';

const LIBS = ['vendor/html2canvas-1.4.1.min.js', 'vendor/jspdf-4.2.1.umd.min.js'];
const PDF = {
    scale: 2,             // Auflösung des Bildes (2 = scharf auf Retina, Datei bleibt klein genug)
    marginPt: 30,
    jpegQuality: 0.92,
    minBreakFill: 0.55,   // Umbruch frühestens nach 55 % der Seite
    minFontPt: 4,
    baseline: 0.78,       // Grundlinie innerhalb der Zeilenhöhe
    sameLinePx: 3,
    endSlackPx: 4
};
let loading = null;

function load(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = resolve; s.onerror = () => reject(new Error('load failed: ' + src));
        document.head.appendChild(s);
    });
}
const ready = () => loading || (loading = LIBS.reduce((p, src) => p.then(() => load(src)), Promise.resolve()).catch(e => { loading = null; throw e; }));

// Nur Zeichen, die die PDF-Standardschrift kennt (für die unsichtbare Textebene)
const WIN = '–—„“”‚‘’•…€™';
const clean = (s) => Array.from(s).map(ch => (ch.charCodeAt(0) < 256 || WIN.includes(ch)) ? ch : (ch === '→' ? '->' : '')).join('');

// Textzeilen mit Position (relativ zur Seite) über Ranges ermitteln
function textLines(root) {
    const base = root.getBoundingClientRect();
    const lines = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => n.nodeValue.trim() && n.parentElement && getComputedStyle(n.parentElement).visibility !== 'hidden' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const fs = parseFloat(getComputedStyle(n.parentElement).fontSize) || 12;
        const re = /\S+/g; let m, cur = null;
        while ((m = re.exec(n.nodeValue))) {
            range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
            const r = range.getBoundingClientRect();
            if (!r.width) continue;
            const top = r.top - base.top, left = r.left - base.left;
            if (cur && Math.abs(cur.top - top) < PDF.sameLinePx) { cur.text += ' ' + m[0]; cur.right = r.right - base.left; }
            else { cur = { text: m[0], top, left, right: r.right - base.left, h: r.height, fs }; lines.push(cur); }
        }
    }
    return lines;
}
// Erlaubte Seitenumbrüche: Unterkanten von Einträgen
function breakPoints(root) {
    const base = root.getBoundingClientRect().top;
    const ys = new Set();
    root.querySelectorAll('.cv-tl > li, .cv-bullets > li, .cv-projects li, .cv-strengths, .cv-summary, .cv-head, .cv-dl dd, .cv-lang, h2, h4, .cv-chips, .cv-note, .cv-travel, .cv-plain li, p').forEach(el => {
        const r = el.getBoundingClientRect();
        ys.add(Math.round(r.bottom - base + 2));
        ys.add(Math.round(r.top - base - 2));
    });
    return Array.from(ys).sort((a, b) => a - b);
}

/** PDF erzeugen und herunterladen; btn zeigt währenddessen „wird erstellt …“ */
export async function savePdf(btn) {
    const label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.textContent = t('cv.pdfBusy'); }
    let host = null;
    try {
        await ready();
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const src = $('#cv-sheet .cv-page');
        host = document.createElement('div');
        host.className = 'pdf-host';
        const page = src.cloneNode(true);
        page.classList.add('pdf-mode');
        page.querySelectorAll('[data-pct]').forEach(el => { el.style.transition = 'none'; el.style.width = el.dataset.pct + '%'; });
        host.appendChild(page);
        document.body.appendChild(host);
        const img = page.querySelector('.cv-head img');
        if (img && !img.complete) await new Promise(r => { img.onload = img.onerror = r; });

        const cssW = page.scrollWidth, cssH = page.scrollHeight;
        const lines = textLines(page), breaks = breakPoints(page);
        const canvas = await window.html2canvas(page, { scale: PDF.scale, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: cssW });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
        const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = PDF.marginPt;
        const k = (PW - M * 2) / cssW;                 // pt pro CSS-Pixel
        const sliceMax = (PH - M * 2) / k;             // CSS-Pixel pro Seite
        const sx = canvas.width / cssW;
        let y0 = 0, pageNo = 0;
        while (y0 < cssH - PDF.endSlackPx) {
            let y1 = Math.min(cssH, y0 + sliceMax);
            if (y1 < cssH) {
                const cand = breaks.filter(b => b > y0 + sliceMax * PDF.minBreakFill && b <= y1);
                if (cand.length) y1 = cand[cand.length - 1];
            }
            const part = document.createElement('canvas');
            part.width = canvas.width; part.height = Math.ceil((y1 - y0) * sx);
            const pc = part.getContext('2d');
            pc.fillStyle = '#fff'; pc.fillRect(0, 0, part.width, part.height);
            pc.drawImage(canvas, 0, Math.floor(y0 * sx), canvas.width, part.height, 0, 0, canvas.width, part.height);
            if (pageNo++) doc.addPage();
            doc.addImage(part.toDataURL('image/jpeg', PDF.jpegQuality), 'JPEG', M, M, PW - M * 2, (y1 - y0) * k, undefined, 'FAST');
            // unsichtbare Textebene für diese Seite
            doc.setFont('helvetica', 'normal');
            lines.filter(l => l.top + l.h / 2 >= y0 && l.top + l.h / 2 < y1).forEach(l => {
                const text = clean(l.text);
                if (!text.trim()) return;
                doc.setFontSize(Math.max(PDF.minFontPt, l.fs * k));
                const w = doc.getTextWidth(text), target = (l.right - l.left) * k;
                doc.text(text, M + l.left * k, M + (l.top - y0 + l.h * PDF.baseline) * k, { renderingMode: 'invisible', horizontalScale: w ? target / w : 1 });
            });
            // Links klickbar halten
            const b = page.getBoundingClientRect();
            page.querySelectorAll('a[href^="http"], a[href^="mailto:"]').forEach(a => {
                const r = a.getBoundingClientRect(), top = r.top - b.top;
                if (top >= y0 && top < y1 && r.width) doc.link(M + (r.left - b.left) * k, M + (top - y0) * k, r.width * k, r.height * k, { url: a.href });
            });
            y0 = y1;
        }
        const name = data().name || '';
        doc.setProperties({ title: t('cv.pdfTitle', { name }), author: name, subject: t('cv.pdfSubject'), creator: location.host || 'CV' });
        doc.save(t('cv.pdfFile'));
    } catch (e) {
        console.warn('PDF-Erstellung nicht möglich, Druckdialog als Rückfall:', e);
        window.print();
    } finally {
        if (host) host.remove();
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
    }
}

// Kontaktformular („Jetzt kontaktieren“): Die Seite ist statisch (GitHub Pages), deshalb leitet der
// Formular-Dienst FormSubmit (formsubmit.co) die Anfrage per E-Mail weiter.
// Nach der einmaligen Aktivierung liefert FormSubmit einen Alias – den in den Lebenslauf-Daten unter contact.form
// eintragen, dann steht die E-Mail-Adresse gar nicht mehr im Quelltext.
import { $, esc } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { t, lang } from '../core/i18n.js';
import { audio } from '../core/audio.js';
import { progress } from '../app/progress.js';
import { data } from '../app/content.js';
import { showOverlay, hideOverlay } from './overlays.js';
import { achieve } from './toasts.js';

const ENDPOINT = 'https://formsubmit.co/ajax/';
// Ziel-Adresse nur verschleiert (gegen einfache Spam-Bots), wird erst beim Senden zusammengesetzt.
const FALLBACK = '==QbvNmLslWYtdGQ1kTauV3biF2cuIXZkF2auwWdkJWY';
const decode = () => { try { return atob(FALLBACK.split('').reverse().join('')); } catch (e) { return ''; } };
const LIMITS = { name: 80, email: 120, company: 80, phone: 40, message: 3000 };
const FOCUS_DELAY_MS = 80;
const EMPTY = '–';
const TOAST_MS = 5200;   // Bestätigung nach dem Senden etwas länger zeigen

const contactData = () => data().contact || {};
const target = () => (contactData().form ? contactData().form.trim() : decode());
const mailAddr = () => contactData().email || decode();

function formHtml(firm) {
    return `
        <form id="contact-form" novalidate>
            <div class="cf-grid">
                <label class="cf-f"><span>${esc(t('contact.name'))} *</span><input name="name" type="text" required autocomplete="name" maxlength="${LIMITS.name}"></label>
                <label class="cf-f"><span>${esc(t('contact.email'))} *</span><input name="email" type="email" required autocomplete="email" maxlength="${LIMITS.email}"></label>
                <label class="cf-f"><span>${esc(t('contact.company'))}</span><input name="company" type="text" autocomplete="organization" maxlength="${LIMITS.company}" value="${esc(firm)}" placeholder="${esc(t('contact.companyPlaceholder'))}"></label>
                <label class="cf-f"><span>${esc(t('contact.phone'))} <small>${esc(t('contact.optional'))}</small></span><input name="phone" type="tel" autocomplete="tel" maxlength="${LIMITS.phone}"></label>
            </div>
            <label class="cf-f"><span>${esc(t('contact.message'))} *</span><textarea name="message" rows="5" required maxlength="${LIMITS.message}">${esc(t('contact.messageStart'))}</textarea></label>
            <label class="cf-hp" aria-hidden="true">${esc(t('contact.honeypot'))} <input name="_honey" type="text" tabindex="-1" autocomplete="off"></label>
            <label class="cf-ok"><input name="consent" type="checkbox" required><span>${esc(t('contact.consent', { name: data().name }))} * <a href="datenschutz.html?lang=${lang()}" target="_blank" rel="noopener">${esc(t('contact.privacy'))}</a></span></label>
            <p class="cf-err" role="alert" hidden></p>
            <div class="cf-foot">
                <span class="muted small">${esc(t('contact.required'))}</span>
                <button class="btn primary" type="submit">${icon('send')} ${esc(t('contact.send'))}</button>
            </div>
        </form>`;
}

function render(prefill = {}) {
    const firm = prefill.firm || progress.firm || '';
    const box = $('#contact-body');
    box.innerHTML = formHtml(firm);
    const form = box.querySelector('form'), err = box.querySelector('.cf-err');
    const field = (n) => form.elements.namedItem(n);
    const fail = (msg, focus) => { err.textContent = msg; err.hidden = false; if (focus) focus.focus(); };
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.hidden = true;
        const bad = [field('name'), field('email'), field('message')].find(el => !el.value.trim() || !el.checkValidity());
        if (bad) return fail(bad === field('email') ? t('contact.errEmail') : t('contact.errRequired'), bad);
        if (!field('consent').checked) return fail(t('contact.errConsent'));
        if (field('_honey').value) return;   // Bot
        const btn = form.querySelector('[type=submit]');
        btn.disabled = true; btn.textContent = t('contact.sending');
        const company = field('company').value.trim(), email = field('email').value.trim();
        const payload = {
            name: field('name').value.trim(), email, unternehmen: company || EMPTY,
            telefon: field('phone').value.trim() || EMPTY, nachricht: field('message').value.trim(),
            _subject: t('contact.subject') + (company ? ' – ' + company : ''),
            _replyto: email, _template: 'table', _captcha: 'false'
        };
        try {
            const res = await fetch(ENDPOINT + encodeURIComponent(target()), {
                method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload)
            });
            // FormSubmit antwortet mit JSON { success: "true" | "false", message }. Manche Antworten sind kein JSON –
            // dann zählt der HTTP-Status. Ein Fehler wird nur gemeldet, wenn der Dienst ihn ausdrücklich zurückgibt.
            const j = await res.json().catch(() => ({}));
            if (!res.ok || String(j.success) === 'false') throw new Error(j.message || 'send failed');
            if (company && !progress.firm) progress.setFirm(company);
            // Erfolg: Formular schließt sich, eine kurze Bestätigung erscheint
            closeContact();
            box.innerHTML = '';
            achieve(icon('check'), t('contact.sent'), t('contact.thanks'), TOAST_MS);
            audio.play('fanfare');
        } catch (ex) {
            const mail = mailAddr();
            const body = encodeURIComponent(`${payload.nachricht}\n\n${payload.name}${company ? ', ' + company : ''}${payload.telefon !== EMPTY ? '\n' + t('contact.phoneShort') + ' ' + payload.telefon : ''}`);
            const link = mail ? `<a href="mailto:${esc(mail)}?subject=${encodeURIComponent(payload._subject)}&body=${body}">${esc(t('contact.openMail'))}</a>` : '';
            err.innerHTML = esc(t('contact.errSend')) + (link ? ' ' + esc(t('contact.orWrite')) + ' ' + link : '') + '.';
            err.hidden = false;
            btn.disabled = false; btn.innerHTML = `${icon('send')} ${esc(t('contact.send'))}`;
        }
    });
    setTimeout(() => (firm ? field('name') : field('company')).focus({ preventScroll: true }), FOCUS_DELAY_MS);
}

export function openContact(prefill) {
    render(prefill);
    showOverlay('contact');
    audio.play('open');
}
export function closeContact() { hideOverlay('contact'); }

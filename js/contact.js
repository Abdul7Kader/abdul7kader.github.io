// Kontaktformular („Jetzt kontaktieren“): Die Seite ist statisch (GitHub Pages), deshalb leitet der
// Formular-Dienst FormSubmit (formsubmit.co) die Anfrage per E-Mail an Abdul weiter.
// Nach der einmaligen Aktivierung liefert FormSubmit einen Alias – den in data.js unter contact.form eintragen,
// dann steht die E-Mail-Adresse gar nicht mehr im Quelltext.
(function () {
    const CV = window.CV;
    // Ziel-Adresse nur verschleiert (gegen einfache Spam-Bots), wird erst beim Senden zusammengesetzt.
    const FALLBACK = '==QbvNmLslWYtdGQ1kTauV3biF2cuIXZkF2auwWdkJWY';
    const target = () => {
        const c = (CV.data && CV.data.contact) || {};
        if (c.form) return c.form.trim();
        try { return atob(FALLBACK.split('').reverse().join('')); } catch (e) { return ''; }
    };
    const mailAddr = () => {
        const c = (CV.data && CV.data.contact) || {};
        if (c.email) return c.email;
        try { return atob(FALLBACK.split('').reverse().join('')); } catch (e) { return ''; }
    };

    function render(prefill) {
        const firm = (prefill && prefill.firm) || (CV.game && CV.game.firm) || '';
        const box = CV.$('#contact-body');
        box.innerHTML = `
            <form id="contact-form" novalidate>
                <div class="cf-grid">
                    <label class="cf-f"><span>Name *</span><input name="name" type="text" required autocomplete="name" maxlength="80"></label>
                    <label class="cf-f"><span>E-Mail *</span><input name="email" type="email" required autocomplete="email" maxlength="120"></label>
                    <label class="cf-f"><span>Unternehmen</span><input name="company" type="text" autocomplete="organization" maxlength="80" value="${CV.esc(firm)}" placeholder="Ihr Unternehmen"></label>
                    <label class="cf-f"><span>Telefon <small>(optional)</small></span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
                </div>
                <label class="cf-f"><span>Nachricht *</span><textarea name="message" rows="5" required maxlength="3000">Hallo Herr Sabouni,

wir würden Sie gern kennenlernen. </textarea></label>
                <label class="cf-hp" aria-hidden="true">Bitte leer lassen <input name="_honey" type="text" tabindex="-1" autocomplete="off"></label>
                <label class="cf-ok"><input name="consent" type="checkbox" required><span>Ich bin einverstanden, dass meine Angaben zur Bearbeitung der Anfrage über den Dienst FormSubmit (formsubmit.co) per E-Mail an Abdul Kader Sabouni übermittelt werden. Die Daten werden nur für diese Anfrage verwendet. *</span></label>
                <p class="cf-err" role="alert" hidden></p>
                <div class="cf-foot">
                    <span class="muted small">* Pflichtfelder</span>
                    <button class="btn primary" type="submit">${CV.icon('send')} Nachricht senden</button>
                </div>
            </form>`;
        const form = box.querySelector('form'), err = box.querySelector('.cf-err');
        const f = (n) => form.elements.namedItem(n);
        const msg = f('message');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            err.hidden = true;
            const bad = [f('name'), f('email'), msg].find(el => !el.value.trim() || !el.checkValidity());
            if (bad) { err.textContent = bad === f('email') ? 'Bitte eine gültige E-Mail-Adresse angeben.' : 'Bitte alle Pflichtfelder ausfüllen.'; err.hidden = false; bad.focus(); return; }
            if (!f('consent').checked) { err.textContent = 'Bitte der Übermittlung zustimmen, damit ich Ihre Nachricht erhalten kann.'; err.hidden = false; return; }
            if (f('_honey').value) return;   // Bot
            const btn = form.querySelector('[type=submit]');
            btn.disabled = true; btn.innerHTML = 'Wird gesendet …';
            const company = f('company').value.trim();
            const payload = {
                name: f('name').value.trim(), email: f('email').value.trim(), unternehmen: company || '–',
                telefon: f('phone').value.trim() || '–', nachricht: msg.value.trim(),
                _subject: `Kontaktanfrage über den Lebenslauf${company ? ' – ' + company : ''}`,
                _replyto: f('email').value.trim(), _template: 'table', _captcha: 'false'
            };
            try {
                const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(target()), {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload)
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok || String(j.success) !== 'true') throw new Error(j.message || 'Senden fehlgeschlagen');
                if (company && CV.game && !CV.game.firm) CV.game.setFirm(company);
                box.innerHTML = `<div class="cf-done"><span class="cf-check">${CV.icon('check')}</span><h3>Danke! Ich melde mich bald.</h3><p class="muted">Ihre Nachricht ist bei mir angekommen. Ich antworte in der Regel innerhalb von zwei Werktagen.</p><button class="btn ghost" data-act="close">Schließen</button></div>`;
                box.querySelector('[data-act=close]').onclick = () => CV.Contact.close();
                CV.audio && CV.audio.play('fanfare');
            } catch (ex) {
                const mail = mailAddr();
                const body = encodeURIComponent(`${payload.nachricht}\n\n${payload.name}${company ? ', ' + company : ''}${payload.telefon !== '–' ? '\nTel. ' + payload.telefon : ''}`);
                err.innerHTML = `Die Nachricht konnte gerade nicht gesendet werden. Bitte versuchen Sie es gleich noch einmal${mail ? ` – oder schreiben Sie mir direkt: <a href="mailto:${CV.esc(mail)}?subject=${encodeURIComponent(payload._subject)}&body=${body}">E-Mail öffnen</a>` : ''}.`;
                err.hidden = false;
                btn.disabled = false; btn.innerHTML = `${CV.icon('send')} Nachricht senden`;
            }
        });
        setTimeout(() => (firm ? f('name') : f('company')).focus({ preventScroll: true }), 80);
    }

    CV.Contact = {
        open(prefill) {
            render(prefill);
            CV.UI.showOverlay('contact');
            CV.audio && CV.audio.play('open');
        },
        close() { CV.UI.hideOverlay('contact'); }
    };
})();

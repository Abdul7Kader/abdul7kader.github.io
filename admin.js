document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password');
    const loginScreen = document.getElementById('login-screen');
    const adminPanel = document.getElementById('admin-panel');
    const loginError = document.getElementById('login-error');
    const formsContainer = document.getElementById('forms-container');
    const generateBtn = document.getElementById('generate-btn');
    const outputArea = document.getElementById('output-area');
    const outputCode = document.getElementById('output-code');
    const copyBtn = document.getElementById('copy-btn');

    // Helper function to hash passwords
    async function hashPassword(msg) {
        const msgBuffer = new TextEncoder().encode(msg);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Simple auth
    loginBtn.addEventListener('click', async () => {
        const inputHash = await hashPassword(passwordInput.value);
        // Hash for "hackable"
        if (inputHash === '9b8e060c591c2bd78bf08ae09879c5324c3e9a3d67026bfd8f5ac147a092afb5') {
            loginScreen.style.display = 'none';
            adminPanel.style.display = 'block';
            buildForm(resumeFor(langSelect.value));
        } else {
            loginError.style.display = 'block';
        }
    });

    // Also allow Enter key
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    let currentData = {};
    const langSelect = document.getElementById('lang-select');
    const RES = window.RESUME || {};
    // Englisch: fehlende Felder kommen aus der deutschen Fassung (wie auf der Seite selbst)
    function merge(base, over) {
        if (over === undefined || over === null || over === '') return base;
        if (Array.isArray(base) || Array.isArray(over) || typeof base !== 'object' || typeof over !== 'object') return over;
        const out = { ...base };
        for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
        return out;
    }
    const resumeFor = (l) => (l === 'de' ? (RES.de || {}) : merge(RES.de || {}, RES[l] || {}));
    const outFile = () => `data/resume.${langSelect.value}.js`;
    langSelect.addEventListener('change', () => {
        document.querySelectorAll('.out-file').forEach(el => { el.textContent = outFile(); });
        outputArea.style.display = 'none';
        if (adminPanel.style.display === 'block') buildForm(resumeFor(langSelect.value));
    });

    function buildForm(data) {
        currentData = JSON.parse(JSON.stringify(data)); // copy
        formsContainer.innerHTML = '';
        
        addSectionTitle('Personalisierter Link für Bewerbungen');
        createLinkBuilder();

        addSectionTitle('Allgemein');
        createStringField('name', 'Vollständiger Name');
        createStringField('firstName', 'Vorname (wird in Texten genutzt)');
        createStringField('contactName', 'Name auf dem Kontakt-Knopf im Finale (z. B. „Abdul Kader“)');
        createStringField('title', 'Berufsbezeichnung / Untertitel');
        if (currentData.cardRole == null) currentData.cardRole = '';
        createStringField('cardRole', 'Zeile unter dem Namen auf der Spielerkarte (ohne Firmennamen)');
        createStringField('location', 'Wohnort');
        createStringField('tagline', 'Kurzbeschreibung im Startbildschirm');
        createStringField('summary', 'Kurzprofil (oben im Lebenslauf)');
        createStringField('availability', 'Verfügbarkeit (grünes Label im Lebenslauf)');
        createStringField('intro', 'Begrüßungstext (Fallback)');
        createStringField('profileImage', 'Profilbild (Datei oder URL)');
        createStringField('congratsImage', 'Abschlussbild (Finale)');

        addSectionTitle('Kontakt (leere Felder werden ausgeblendet)');
        currentData.contact = currentData.contact || {};
        ['email', 'phone', 'linkedin', 'github', 'form'].forEach(k => { if (currentData.contact[k] == null) currentData.contact[k] = ''; });
        createStringField('contact.email', 'E-Mail (aktiviert den Button „Gespräch vereinbaren“)');
        createStringField('contact.phone', 'Telefon');
        createStringField('contact.linkedin', 'LinkedIn-URL');
        createStringField('contact.github', 'GitHub-URL');
        createStringField('contact.form', 'Kontaktformular: FormSubmit-Alias nach der Aktivierung (leer = Standard-Adresse, verschleiert)');

        addSectionTitle('Stärken (Kompakt-Lebenslauf)');
        createJSONField('strengths', 'Stärken (JSON: icon, title, text) – icon: cpu, code, users, trending, heart, globe, school …');

        addSectionTitle('KI-Kompetenzen (Tech-Lab & Lebenslauf)');
        createJSONField('aiSkills', 'KI-Kompetenzen (JSON: name, text)');

        addSectionTitle('Linkseite /links/');
        if (!Array.isArray(currentData.links)) currentData.links = [];
        createJSONField('links', 'Links (JSON: title, note, url, icon: globe, github, play, linkedin, send, mail …). Leere url = „folgt“.');

        addSectionTitle('Eigenschaften (Blöcke im Projekt-Stapler)');
        createJSONField('traits', 'Eigenschaften (JSON-Liste)');

        addSectionTitle('Ehrenamt & weitere Angaben');
        createJSONField('volunteer', 'Ehrenamt – jede Tätigkeit eine Kachel (JSON: date, title, role, text, icon: music, coffee, book, school, heart, moon …)');
        createJSONField('extras', 'Weitere Angaben (JSON: name, text)');

        addSectionTitle('Stationen der Welt (Titel, Zeitraum, Abzeichen, Geschichte)');
        createJSONField('stations', 'Stationen (JSON) – arrival, school (Bildungsweg), career, lab, projects, lake, finale');

        addSectionTitle('Fakten der Bewohner');
        createJSONField('facts', 'Sätze, die die Figuren in der Welt sagen (JSON-Liste)');

        addSectionTitle('Hobbies & Sport (See)');
        createJSONField('hobbies', 'Hobbies (JSON Liste, jedes Element in "")');

        addSectionTitle('Ausbildung (Bildungsweg)');
        createJSONField('education', 'Ausbildung (JSON)');

        addSectionTitle('Reisen (Ankunft)');
        createJSONField('travels', 'Reisen (JSON)');

        addSectionTitle('Fähigkeiten (Tech-Lab)');
        createJSONField('skills', 'Fähigkeiten (JSON)');

        addSectionTitle('Sprachen (Bildungsweg)');
        createJSONField('languages', 'Sprachen (JSON: name, level – z. B. "C1")');

        addSectionTitle('Berufserfahrung (Business-Viertel)');
        createJSONField('experience', 'Berufserfahrung (JSON) – optional badge + note, z. B. „100 % ohne KI-Werkzeuge“ bei PSI');

        addSectionTitle('Eigene Projekte (Projekt-Viertel)');
        createJSONField('projects', 'Projekte (JSON: title, tag, tech, detail, progress 0–100, stage optional, building: shop | studio | refinery | stadium | restaurant | drivingschool, link)');
    }

    function createLinkBuilder() {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = '<label>Firmenname – erscheint als Begrüßung und auf dem Finale-Gebäude</label>' +
            '<input type="text" id="firm-link-input" placeholder="z. B. Musterfirma GmbH">' +
            '<label style="margin-top:8px;font-weight:normal"><input type="checkbox" id="firm-link-en"> Seite auf Englisch öffnen (?lang=en)</label>' +
            '<p style="margin-top:8px;font-family:monospace;word-break:break-all;" id="firm-link-out"></p>';
        formsContainer.appendChild(div);
        const inp = div.querySelector('#firm-link-input'), out = div.querySelector('#firm-link-out'), en = div.querySelector('#firm-link-en');
        const base = location.origin + location.pathname.replace(/admin\.html$/, '');
        const upd = () => {
            const q = new URLSearchParams();
            if (inp.value.trim()) q.set(en.checked ? 'company' : 'firma', inp.value.trim());
            if (en.checked) q.set('lang', 'en');
            out.textContent = base + (q.toString() ? '?' + q.toString() : '');
        };
        inp.addEventListener('input', upd);
        en.addEventListener('change', upd);
        upd();
    }

    function addSectionTitle(titleText) {
        const h2 = document.createElement('h2');
        h2.className = 'section-title';
        h2.textContent = titleText;
        formsContainer.appendChild(h2);
    }

    function createStringField(keyPath, labelText) {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = labelText;
        
        const textarea = document.createElement('textarea');
        const keys = keyPath.split('.');
        if (keys.length === 1) textarea.value = currentData[keys[0]];
        else textarea.value = currentData[keys[0]][keys[1]];

        textarea.addEventListener('input', (e) => {
            if (keys.length === 1) {
                currentData[keys[0]] = e.target.value;
            } else {
                currentData[keys[0]][keys[1]] = e.target.value;
            }
        });

        div.appendChild(label);
        div.appendChild(textarea);
        formsContainer.appendChild(div);
    }

    function createJSONField(key, labelText) {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = labelText;
        
        const textarea = document.createElement('textarea');
        textarea.style.height = '150px';
        textarea.value = JSON.stringify(currentData[key], null, 4);

        textarea.addEventListener('input', (e) => {
            try {
                currentData[key] = JSON.parse(e.target.value);
                textarea.style.borderColor = '#ccc';
            } catch (err) {
                textarea.style.borderColor = 'red';
            }
        });

        div.appendChild(label);
        div.appendChild(textarea);
        formsContainer.appendChild(div);
    }

    generateBtn.addEventListener('click', () => {
        const l = langSelect.value;
        let data = currentData, head;
        if (l === 'de') {
            head = `// Lebenslauf-Inhalte auf Deutsch (Grundlage für alle Sprachen).
// Bearbeiten am bequemsten über admin.html – die Seite erzeugt diese Datei neu.
// Englische Fassung: data/resume.en.js (fehlende Felder werden von hier übernommen).`;
        } else {
            // Nur speichern, was sich von der deutschen Fassung unterscheidet – der Rest wird automatisch übernommen
            const de = RES.de || {};
            data = {};
            Object.keys(currentData).forEach(k => { if (JSON.stringify(currentData[k]) !== JSON.stringify(de[k])) data[k] = currentData[k]; });
            head = `// CV content in English. Fields missing here are taken from data/resume.de.js
// (objects are merged field by field, lists are replaced as a whole). Generated by admin.html.`;
        }
        const code = `${head}
window.RESUME = window.RESUME || {};
window.RESUME.${l} = ${JSON.stringify(data, null, 4)};
`;
        
        outputCode.value = code;
        outputArea.style.display = 'block';
        window.scrollTo(0, document.body.scrollHeight);
    });

    copyBtn.addEventListener('click', () => {
        outputCode.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Kopiert!';
        copyBtn.style.background = '#27ae60';
        setTimeout(() => {
            copyBtn.textContent = 'Code kopieren';
            copyBtn.style.background = '#f39c12';
        }, 2000);
    });
});

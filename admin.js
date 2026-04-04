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
            buildForm(window.resumeData);
        } else {
            loginError.style.display = 'block';
        }
    });

    // Also allow Enter key
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    let currentData = {};

    function buildForm(data) {
        currentData = JSON.parse(JSON.stringify(data)); // copy
        formsContainer.innerHTML = '';
        
        addSectionTitle('Allgemein');
        createStringField('intro', 'Begrüßungstext im Startbildschirm');
        createStringField('profileImage', 'Profilbild URL (Begrüßung) z.B. https://...');
        createStringField('congratsImage', 'Abschlussbild URL (Glückwunsch)');

        addSectionTitle('Hobbies & Sport (Stadion)');
        createJSONField('hobbies', 'Hobbies (JSON Liste, jedes Element in "")');

        addSectionTitle('Ausbildung (Universität)');
        createJSONField('education', 'Ausbildung (JSON)');

        addSectionTitle('Reisen (Flughafen)');
        createJSONField('travels', 'Reisen (JSON)');

        addSectionTitle('Fähigkeiten (Werkstatt)');
        createJSONField('skills', 'Fähigkeiten (JSON)');

        addSectionTitle('Berufserfahrung (Büro)');
        createJSONField('experience', 'Berufserfahrung (JSON)');

        addSectionTitle('Eigene Projekte (Baustelle)');
        createJSONField('projects', 'Projekte (JSON)');
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
        const code = `// Hier kannst du alle deine Lebenslauf-Daten anpassen!
// Speichere diese Datei auf GitHub und dein Spiel aktualisiert sich automatisch.
// Nutze die admin.html Seite, um diese Daten komfortabel zu bearbeiten.

const resumeData = ${JSON.stringify(currentData, null, 4)};

window.resumeData = resumeData;`;
        
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
            copyBtn.textContent = 'Code Kopieren';
            copyBtn.style.background = '#f39c12';
        }, 2000);
    });
});

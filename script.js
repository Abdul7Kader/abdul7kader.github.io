document.addEventListener('DOMContentLoaded', () => {
    // Landscape Warning Logic
    const landscapeWarning = document.getElementById('landscape-warning');
    const landscapeDismiss = document.getElementById('landscape-dismiss');
    
    function checkOrientation() {
        // Show warning if portrait on mobile (width < 768 and height > width)
        if (!landscapeWarning.classList.contains('dismissed')) {
            if (window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
                landscapeWarning.classList.remove('hidden');
            } else {
                landscapeWarning.classList.add('hidden');
            }
        }
    }
    window.addEventListener('resize', checkOrientation);
    checkOrientation();
    
    landscapeDismiss.addEventListener('click', () => {
        landscapeWarning.classList.add('hidden');
        landscapeWarning.classList.add('dismissed');
    });

    // Audio System (Lazy init to bypass browser limits)
    let audioCtx = null;
    window.playSound = function(type) {
        try {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            const now = audioCtx.currentTime;
            
            if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(987.77, now); // B5
                osc.frequency.setValueAtTime(1318.51, now + 0.1); // E6
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (type === 'click') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now); osc.stop(now + 0.1);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
                osc.frequency.setValueAtTime(1046.50, now + 0.45); // C6
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
                osc.start(now); osc.stop(now + 0.8);
            } else if (type === 'drop') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.2);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            }
        } catch(e) { console.log('Audio error', e); }
    };

    const data = window.resumeData;
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // PDF Export Logic
    const pdfBtn = document.getElementById('pdf-download-btn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.playSound) window.playSound('click');
            generatePrintResume();
            setTimeout(() => window.print(), 100);
        });
    }

    function generatePrintResume() {
        const pr = document.getElementById('print-resume');
        if (!pr || !data) return;
        
        // Use fixed name or fallback
        const displayName = "Abdul Kader Sabouni";
        
        let html = `
            <div style="text-align:center; margin-bottom: 40px;">
                <h1 style="margin-bottom:5px; border:none;">${displayName}</h1>
                <p style="font-size:1.2rem; color:#555; margin-top:0;">Softwareentwickler / Informatikstudent</p>
                <div style="font-size:0.9rem; color:#777; margin-top:10px;">
                    Dortmund, Deutschland | Interaktiver Lebenslauf Portfolio
                </div>
            </div>
        `;
        
        // Berufserfahrung (experience in data.js)
        const jobs = data.experience || data.jobs || [];
        if (jobs.length > 0) {
            html += `<h2>Berufserfahrung</h2>`;
            jobs.forEach(j => {
                html += `
                <div class="print-entry">
                    <div class="print-header">
                        <span class="print-title">${j.role}</span>
                        <span class="print-date">${j.date}</span>
                    </div>
                    <div class="print-subtitle">${j.company}</div>
                </div>`;
            });
        }

        // Projekte (projects in data.js)
        if (data.projects && data.projects.length > 0) {
            html += `<h2>Projekte & Portfolio</h2>`;
            data.projects.forEach(p => {
                html += `
                <div class="print-entry">
                    <div class="print-header">
                        <span class="print-title">${p.title} <span style="font-weight:normal;font-size:0.9rem">(${p.tech})</span></span>
                    </div>
                    <p class="print-detail">${p.detail}</p>
                </div>`;
            });
        }
        
        // Ausbildung (education in data.js uses title/detail)
        if (data.education && data.education.length > 0) {
            html += `<h2>Ausbildung & Sprachkurse</h2>`;
            data.education.forEach(e => {
                html += `
                <div class="print-entry">
                    <div class="print-header">
                        <span class="print-title">${e.title || e.degree || e.course}</span>
                        <span class="print-date">${e.date}</span>
                    </div>
                    <div class="print-subtitle">${e.detail || e.school}</div>
                </div>`;
            });
        }

        html += `<div class="grid-2col" style="margin-top:20px;">`;

        // Skills (skills in data.js is array of {name, level})
        if (data.skills && data.skills.length > 0) {
            html += `<div><h2>Fähigkeiten & IT</h2><ul>`;
            data.skills.forEach(s => {
                html += `<li><strong>${s.name}:</strong> ${s.level}</li>`;
            });
            html += `</ul></div>`;
        }
        
        html += `<div><h2>Weitere Kenntnisse</h2><ul>`;
        // Languages (if any extra outside skills)
        if (data.languages && data.languages.length > 0) {
            html += `<li><strong>Sprachen:</strong> ${data.languages.join(', ')}</li>`;
        }
        // Travels (travels in data.js)
        const travels = data.travels || data.travel || [];
        if (travels.length > 0) {
            const travelString = travels.map(t => t.country).join(', ');
            html += `<li><strong>Reiseerfahrung:</strong> ${travelString}</li>`;
        }
        // Hobbies (hobbies in data.js)
        if (data.hobbies && data.hobbies.length > 0) {
            html += `<li><strong>Hobbies:</strong> ${data.hobbies.join(', ')}</li>`;
        }
        html += `</ul></div>`;
        html += `</div>`; // end grid
        
        pr.innerHTML = html;
    }

    // UI Elements
    const introBox = document.getElementById('intro-box');
    const introText = document.getElementById('intro-text');
    const closeIntroBtn = document.getElementById('close-intro');
    const promptEl = document.getElementById('interaction-prompt');
    const uiLayer = document.getElementById('ui-layer');
    const infoModal = document.getElementById('info-modal');


    const mobileControls = document.getElementById('mobile-controls');

    // Init Data
    introText.textContent = data.intro;
    if (data.profileImage && data.profileImage.trim() !== '') {
        const picCont = document.getElementById('profile-picture-container');
        picCont.innerHTML = `<img src="${data.profileImage}" alt="Profilbild" style="width:100%; height:100%; object-fit:cover;">`;
    }
    if (data.congratsImage && data.congratsImage.trim() !== '') {
        const congratsPic = document.getElementById('congrats-pic');
        if (congratsPic) congratsPic.src = data.congratsImage;
    }

    // Load Character Sprite
    const charImg = new Image();
    charImg.src = 'character.png';
    let charImgLoaded = false;
    charImg.onload = () => { charImgLoaded = true; };

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Game State
    let isModalOpen = true;

    // Attempt tracking
    let currentAttempts = 0;

    closeIntroBtn.addEventListener('click', () => {
        introBox.classList.add('hidden');
        isModalOpen = false;
    });

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            modal.classList.add('hidden');
            setTimeout(() => { isModalOpen = false; }, 100);
            resetAllMinigames();
        });
    });

    document.getElementById('close-congrats-btn').addEventListener('click', () => {
        document.getElementById('congrats-modal').classList.add('hidden');
        setTimeout(() => { isModalOpen = false; }, 100);
    });



    // World Data
    const worldWidth = 1400; const worldHeight = 1100;

    const player = {
        x: worldWidth / 2, y: worldHeight / 2, width: 40, height: 40,
        speed: window.innerWidth < 768 ? 4 : 6, color: '#e74c3c'
    };

    let cameraX = 0; let cameraY = 0;

    const buildings = [
        { id: 'stadium', x: 260, y: 140, w: 250, h: 200, color: '#2ecc71', name: 'Stadium', emoji: '🏟️' },
        { id: 'uni', x: 640, y: 140, w: 200, h: 200, color: '#3498db', name: 'Universität', emoji: '🎓' },
        { id: 'airport', x: 960, y: 140, w: 260, h: 200, color: '#f39c12', name: 'Flughafen', emoji: '✈️' },
        { id: 'workshop', x: 280, y: 760, w: 200, h: 200, color: '#9b59b6', name: 'Werkstatt', emoji: '🛠️' },
        { id: 'office', x: 630, y: 760, w: 220, h: 220, color: '#34495e', name: 'Büro', emoji: '🏢' },
        { id: 'construction', x: 960, y: 760, w: 220, h: 220, color: '#e67e22', name: 'Baustelle', emoji: '🏗️' }
    ];

    // Pac-Man Points (generated along a loop path)
    const collectibles = [];
    const pathSegments = [
        { x: 250, y: 450, w: 900, h: 80 },  // Top horizontal
        { x: 250, y: 580, w: 900, h: 80 },  // Bottom horizontal
        { x: 340, y: 350, w: 80, h: 400 },  // Left vertical
        { x: 700, y: 350, w: 80, h: 400 },  // Mid vertical
        { x: 1050, y: 350, w: 80, h: 400 }  // Right vertical
    ];

    let maxScore = 0; let currentScore = 0;

    // Gen collectibles
    pathSegments.forEach(seg => {
        let items = Math.floor(seg.w / 100) + Math.floor(seg.h / 100);
        for (let i = 0; i < items; i++) {
            let cx, cy;
            let isValid = false;
            let attempts = 0;
            
            while (!isValid && attempts < 20) {
                cx = seg.x + 20 + Math.random() * (seg.w - 40);
                cy = seg.y + 20 + Math.random() * (seg.h - 40);
                
                isValid = true;
                for (let b of buildings) {
                    // Check if point is inside a building, with a 20px safety margin
                    if (cx > b.x - 20 && cx < b.x + b.w + 20 && cy > b.y - 20 && cy < b.y + b.h + 20) {
                        isValid = false;
                        break;
                    }
                }
                attempts++;
            }

            if (isValid) {
                collectibles.push({ x: cx, y: cy, eaten: false });
                maxScore++;
            }
        }
    });

    document.getElementById('score-max').textContent = maxScore;

    const trees = [];
    for (let i = 0; i < 40; i++) trees.push({ x: Math.random() * (worldWidth - 50), y: Math.random() * (worldHeight - 50) });

    const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    window.addEventListener('keydown', e => {
        let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (keys.hasOwnProperty(key)) {
            keys[key] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault(); // Prevent page scrolling
            }
        }
        if ((key === 'e' || key === ' ') && !isModalOpen) handleInteraction();
    }, { passive: false });
    
    window.addEventListener('keyup', e => {
        let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (keys.hasOwnProperty(key)) keys[key] = false;
    });

    // Unblock Audio globally on first interaction (Safari Fix)
    document.body.addEventListener('click', function unblockAudio() {
        window.playSound('init');
        document.body.removeEventListener('click', unblockAudio);
    }, { once: true });
    
    document.body.addEventListener('touchstart', function unblockAudio() {
        window.playSound('init');
        document.body.removeEventListener('touchstart', unblockAudio);
    }, { once: true });

    const mobileAction = () => { if (!isModalOpen) handleInteraction(); };
    document.getElementById('btn-action').addEventListener('touchstart', (e) => { e.preventDefault(); mobileAction(); });
    document.getElementById('btn-action').addEventListener('click', mobileAction);

    // D-Pad Touch events
    ['up', 'down', 'left', 'right'].forEach(dir => {
        const btn = document.getElementById(`btn-${dir}`);
        const kMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[kMap[dir]] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[kMap[dir]] = false; });
    });

    function checkCollision(nx, ny) {
        if (nx < 0 || ny < 0 || nx + player.width > worldWidth || ny + player.height > worldHeight) return true;
        for (let b of buildings) if (nx < b.x + b.w && nx + player.width > b.x && ny < b.y + b.h && ny + player.height > b.y) return true;
        return false;
    }

    let currentBuilding = null;
    let walkAnim = 0; let walkDir = 1;

    function update() {
        if (!isModalOpen) {
            let dx = 0; let dy = 0;
            if (keys.w || keys.ArrowUp) dy -= player.speed;
            if (keys.s || keys.ArrowDown) dy += player.speed;
            if (keys.a || keys.ArrowLeft) { dx -= player.speed; walkDir = -1; }
            if (keys.d || keys.ArrowRight) { dx += player.speed; walkDir = 1; }

            if (dx !== 0 && dy !== 0) { const l = Math.sqrt(dx * dx + dy * dy); dx = (dx / l) * player.speed; dy = (dy / l) * player.speed; }
            if (!checkCollision(player.x + dx, player.y)) player.x += dx;
            if (!checkCollision(player.x, player.y + dy)) player.y += dy;

            if (dx !== 0 || dy !== 0) walkAnim += 0.25; else walkAnim = 0;

            // Check interaction distance
            const padding = 40;
            currentBuilding = null;
            for (let b of buildings) {
                if (player.x - padding < b.x + b.w && player.x + player.width + padding > b.x && player.y - padding < b.y + b.h && player.y + player.height + padding > b.y) {
                    currentBuilding = b; break;
                }
            }
            if (currentBuilding) promptEl.classList.remove('hidden');
            else promptEl.classList.add('hidden');

            // Collectibles logic
            collectibles.forEach(c => {
                if (!c.eaten && Math.hypot((player.x + 20) - c.x, (player.y + 20) - c.y) < 30) {
                    c.eaten = true;
                    currentScore++;
                    window.playSound('coin');
                    document.getElementById('score-val').textContent = currentScore;
                    if (currentScore >= collectibles.length && collectibles.length > 0) {
                        setTimeout(() => {
                            const modal = document.getElementById('congrats-modal');
                            if(modal) { modal.classList.remove('hidden'); isModalOpen = true; }
                        }, 500);
                    }
                }
            });
        }
        cameraX = Math.max(0, Math.min(player.x + player.width / 2 - canvas.width / 2, worldWidth - canvas.width));
        cameraY = Math.max(0, Math.min(player.y + player.height / 2 - canvas.height / 2, worldHeight - canvas.height));
    }

    function draw() {
        ctx.fillStyle = '#689F38'; ctx.fillRect(0, 0, canvas.width, canvas.height); // Darker grass

        ctx.save(); ctx.translate(-cameraX, -cameraY);

        // Draw paths
        ctx.fillStyle = '#d7ccc8'; // Dirt path color
        pathSegments.forEach(seg => {
            ctx.beginPath(); ctx.roundRect(seg.x, seg.y, seg.w, seg.h, 20); ctx.fill();
        });

        // Add a lake
        ctx.fillStyle = '#29b6f6';
        ctx.beginPath(); ctx.ellipse(1200, 700, 100, 60, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0288d1'; ctx.lineWidth = 4; ctx.stroke();

        ctx.lineWidth = 10; ctx.strokeStyle = '#33691e'; ctx.strokeRect(0, 0, worldWidth, worldHeight);

        // Trees
        ctx.fillStyle = '#2e7d32';
        trees.forEach(t => {
            ctx.beginPath(); ctx.arc(t.x, t.y, 25, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.arc(t.x, t.y - 5, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2e7d32';
        });

        // Buildings (more detailed)
        for (let b of buildings) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h); // Shadow
            ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h); // Base
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(b.x, b.y, b.w, 20); // Roof detail
            ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 5; ctx.strokeRect(b.x, b.y, b.w, b.h);

            ctx.fillStyle = 'white'; ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center';
            ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3;
            ctx.fillText(b.name, b.x + b.w / 2, b.y - 20);

            ctx.font = '80px Arial'; ctx.shadowColor = "transparent";
            ctx.fillText(b.emoji, b.x + b.w / 2, b.y + b.h / 2 + 20);

            // Door
            ctx.fillStyle = '#3e2723'; 
            if (b.y < worldHeight / 2) {
                // Top map buildings: door faces down
                ctx.fillRect(b.x + b.w / 2 - 25, b.y + b.h - 50, 50, 50);
            } else {
                // Bottom map buildings: door faces up (towards the center paths)
                ctx.fillRect(b.x + b.w / 2 - 25, b.y, 50, 50);
            }
        }

        // Draw Collectibles (always on top of scenery)
        collectibles.forEach(c => {
            if (!c.eaten) {
                ctx.fillStyle = '#f1c40f'; // Pacman dot
                ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.stroke();
                
                // Add a small pulsing glow
                const glow = Math.abs(Math.sin(Date.now() / 200)) * 5;
                ctx.beginPath(); ctx.arc(c.x, c.y, 10 + glow, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(241, 196, 15, 0.3)'; ctx.fill();
            }
        });

        // Draw Player (Animated!)
        const legS = Math.sin(walkAnim) * 10;
        const armS = Math.cos(walkAnim) * 8;

        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(player.x + 20, player.y + 35, 15, 8, 0, 0, Math.PI * 2); ctx.fill();

        if (charImgLoaded) {
            const pb = Math.abs(Math.sin(walkAnim)) * 5;
            ctx.drawImage(charImg, player.x - 5, player.y - pb - 10, 50, 50);
        } else {
            // Legs
            ctx.fillStyle = '#34495e';
            ctx.fillRect(player.x + 10 + legS, player.y + 30, 8, 12);
            ctx.fillRect(player.x + 22 - legS, player.y + 30, 8, 12);

            // Body
            const pb = Math.abs(Math.sin(walkAnim)) * 3;
            ctx.fillStyle = player.color; ctx.fillRect(player.x, player.y - pb, player.width, 30);

            // Eyes
            ctx.fillStyle = 'white';
            let eyeX = walkDir > 0 ? 20 : 5;
            ctx.fillRect(player.x + eyeX, player.y + 5 - pb, 8, 8); ctx.fillRect(player.x + eyeX + 12, player.y + 5 - pb, 8, 8);
            ctx.fillStyle = 'black';
            ctx.fillRect(player.x + eyeX + (walkDir > 0 ? 4 : 0), player.y + 7 - pb, 4, 4); ctx.fillRect(player.x + eyeX + 12 + (walkDir > 0 ? 4 : 0), player.y + 7 - pb, 4, 4);
        }
        ctx.restore();
    }

    function loop() { update(); draw(); requestAnimationFrame(loop); }
    loop();

    // ============================================
    // MODAL INFO GENERATOR
    // ============================================
    function populateModalInfo(bId) {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        let html = ''; let title = '';
        if (bId === 'uni') {
            title = 'Universität & Ausbildung 🎓';
            if (data.education) data.education.forEach(ed => html += `<div class="cv-item"><div class="cv-date">${ed.date || ''}</div><div class="cv-title">${ed.title || ''}</div><div class="cv-desc">${ed.detail || ''}</div></div>`);
        } else if (bId === 'airport') {
            title = 'Reisen & Länder ✈️';
            html += `<ul class="cv-list">`;
            if (data.travels) data.travels.forEach(t => html += `<li><strong>${t.date ? t.date + ':' : ''}</strong> ${t.country || ''}</li>`);
            html += `</ul>`;
        } else if (bId === 'workshop') {
            title = 'Fähigkeiten & Skills 🛠️';
            html += `<ul class="cv-list">`;
            if (data.skills) data.skills.forEach(s => html += `<li><strong>${s.name || ''}</strong> - ${s.level || ''}</li>`);
            html += `</ul>`;
        } else if (bId === 'office') {
            title = 'Berufserfahrung 🏢';
            if (data.experience) data.experience.forEach(ex => html += `<div class="cv-item"><div class="cv-date">${ex.date || ''}</div><div class="cv-title">${ex.role || ''}</div><div class="cv-desc">${ex.company || ''}</div></div>`);
        } else if (bId === 'restaurant') {
            title = 'Gastro & Minijobs 🍔';
            if (data.minijobs) data.minijobs.forEach(m => html += `<div class="cv-item"><div class="cv-date">${m.date || ''}</div><div class="cv-title">${m.role || ''}</div><div class="cv-desc">${m.company || ''}</div></div>`);
        } else if (bId === 'construction') {
            title = 'Eigene Projekte 🏗️';
            if (data.projects) data.projects.forEach(p => html += `<div class="cv-item"><div class="cv-date">${p.tech || ''}</div><div class="cv-title">${p.title || ''}</div><div class="cv-desc">${p.detail || ''}</div></div>`);
        } else if (bId === 'stadium') {
            title = 'Hobbies & Sport ⚽';
            html += `<ul class="cv-list">`;
            if (data.hobbies) data.hobbies.forEach(h => html += `<li>${h}</li>`);
            html += `</ul>`;
        }
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = html;
        infoModal.classList.remove('hidden');
    }

    // ============================================
    // MINIGAME LOGICS
    // ============================================
    let activeIntervals = [];

    function resetAllMinigames() {
        activeIntervals.forEach(clearInterval);
        activeIntervals = [];
        document.querySelectorAll('.hint-text').forEach(h => h.classList.add('hidden'));
    }

    function handleInteraction() {
        if (!currentBuilding || isModalOpen) return;
        isModalOpen = true;
        currentAttempts = 0; // Reset attempts whenever a game is freshly opened
        promptEl.classList.add('hidden');
        resetAllMinigames();

        switch (currentBuilding.id) {
            case 'stadium': startStadium(); break;
            case 'airport': startAirport(); break;
            case 'workshop': startWorkshop(); break;
            case 'uni': startUni(); break;
            case 'office': startOffice(); break;
            case 'construction': startConstruction(); break;
            default: populateModalInfo(currentBuilding.id); break;
        }
    }

    function handleFail(bId, restartFunc) {
        currentAttempts++;
        const resBox = document.getElementById(`${bId}-result`);
        if (currentAttempts >= 2) {
            // Show hint instead of auto win
            document.getElementById(`${bId}-hint`).classList.remove('hidden');
            resBox.innerHTML = '<span class="miss-text">Versuch es weiter! Beachte den Tipp.</span>';
        } else {
            resBox.innerHTML = '<span class="miss-text">Knapp daneben! Gleich nochmal.</span>';
        }
        resBox.classList.remove('hidden');
        setTimeout(() => { if (isModalOpen) restartFunc(); }, 2000);
    }

    function handleWin(bId, msg) {
        window.playSound('win');
        resetAllMinigames();
        const resBox = document.getElementById(`${bId}-result`);
        resBox.innerHTML = `<span class="win-text">${msg} Lade Info...</span>`;
        resBox.classList.remove('hidden');
        setTimeout(() => { if (isModalOpen) populateModalInfo(bId); }, 1500);
    }

    // 1. Stadium Minigame
    function startStadium() {
        document.getElementById('minigame-modal').classList.remove('hidden');
        const ball = document.getElementById('ball');
        const crosshair = document.getElementById('aim-crosshair');
        const goalie = document.getElementById('goalie');
        const res = document.getElementById('stadium-result');
        
        res.classList.add('hidden'); 
        ball.style.bottom = '20px'; 
        ball.style.left = '50%';
        ball.style.display = 'block';
        ball.style.transform = `translateX(-50%) rotate(0deg)`;

        let cx = 0; let cDir = 1; let active = true;
        
        // Animate Crosshair
        const intv = setInterval(() => {
            cx += 8 * cDir;
            if (cx > 140) cDir = -1;
            if (cx < -140) cDir = 1;
            crosshair.style.transform = `translateX(calc(-50% + ${cx}px))`;
        }, 50);

        // Animate Goalie
        let gx = 0; let gDir = 1;
        const gIntv = setInterval(() => {
            gx += 12 * gDir;
            if (gx > 120) gDir = -1;
            if (gx < -120) gDir = 1;
            goalie.style.transform = `translateX(calc(-50% + ${gx}px))`;
        }, 50);

        activeIntervals.push(intv, gIntv);

        ball.onclick = (e) => {
            e.stopPropagation();
            if (!active) return;
            active = false; 
            clearInterval(intv);
            clearInterval(gIntv);
            
            ball.style.bottom = '160px'; 
            ball.style.left = `calc(50% + ${cx}px)`;
            ball.style.transform = `translateX(-50%) rotate(720deg)`;

            setTimeout(() => {
                if (Math.abs(cx - gx) < 45) {
                    handleFail('stadium', startStadium);
                    ball.style.display = 'none';
                }
                else if (Math.abs(cx) <= 150) {
                    handleWin('stadium', 'TOOOOR! 🏆');
                } else {
                    handleFail('stadium', startStadium);
                    ball.style.display = 'none';
                }
            }, 300);
        };
    }

    // 2. Airport
    function startAirport() {
        document.getElementById('airport-modal').classList.remove('hidden');
        const plane = document.getElementById('airplane');
        const res = document.getElementById('airport-result');
        res.classList.add('hidden'); 
        
        plane.style.transition = 'none';
        plane.style.top = '20px'; 
        plane.style.left = '-60px'; 
        plane.style.transform = 'rotate(70deg)'; // Nose slightly down during cruise

        let pX = -60; let active = true;
        const gameAreaWidth = document.getElementById('airport-game-area').clientWidth;

        const intv = setInterval(() => {
            pX += 6; // Move right horizontally
            if (pX > gameAreaWidth) pX = -60;
            plane.style.left = pX + 'px';
        }, 30);
        activeIntervals.push(intv);

        document.getElementById('airport-game-area').onclick = () => {
            if (!active) return; active = false; clearInterval(intv);
            
            // Dive towards the runway
            plane.style.transition = 'top 0.7s ease-in, left 0.7s linear, transform 0.6s ease-in';
            plane.style.top = '175px'; 
            
            const landX = pX + 80; // keep moving forward while dropping
            plane.style.left = landX + 'px';
            plane.style.transform = 'rotate(110deg)'; // dive sharply

            setTimeout(() => {
                plane.style.transition = 'transform 0.3s ease-out';
                plane.style.transform = 'rotate(45deg)'; // flare/level out flat on runway

                // Center of game area is the center of the runway
                // Runway width is 250px.
                // Left limit is center - 125, Right limit is center + 125.
                // We give a small margin of error (say +/- 100).
                const center = gameAreaWidth / 2;
                if (landX > center - 100 && landX < center + 100) {
                    handleWin('airport', 'Sichere Landung! 🛬');
                } else {
                    handleFail('airport', startAirport);
                }
            }, 700);
        };
    }

    // 4. Workshop
    function startWorkshop() {
        document.getElementById('workshop-modal').classList.remove('hidden');
        const res = document.getElementById('workshop-result');
        res.classList.add('hidden');
        let solved = 0;
        document.querySelectorAll('.screw-bar').forEach(b => b.style.width = '0%');
        const progress = [0, 0, 0];

        document.querySelectorAll('.screw-clickable').forEach(s => {
            s.style.transform = 'rotate(0deg)';
            s.onclick = () => {
                const idx = parseInt(s.dataset.index);
                if (progress[idx] >= 100) return;
                progress[idx] += 20; // 5 clicks per screw
                s.style.transform = `rotate(${progress[idx] * 3.6}deg)`;
                document.getElementById(`sbar-${idx}`).style.width = progress[idx] + '%';
                if (progress[idx] >= 100) {
                    solved++;
                    if (solved >= 3) handleWin('workshop', 'Zack! Alles sitzt bombenfest.');
                }
            };
        });

        // Add a timer just to enforce attempts logic gracefully if they don't do it right
        let timeLeft = 100;
        const intv = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                if (solved < 3) handleFail('workshop', startWorkshop);
                clearInterval(intv);
            }
        }, 100);
        activeIntervals.push(intv);
    }

    // 5. Uni
    // 5. Uni
    function startUni() {
        document.getElementById('uni-modal').classList.remove('hidden');
        const res = document.getElementById('uni-result');
        const board = document.getElementById('memory-board');
        res.classList.add('hidden'); 
        board.innerHTML = '';

        const symbols = ['💻', '🧠', '☕', '🎓'];
        let cards = [...symbols, ...symbols];
        
        cards.sort(() => Math.random() - 0.5);

        let firstCard = null;
        let secondCard = null;
        let lockBoard = false;
        let pairsFound = 0;

        cards.forEach(sym => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.symbol = sym;
            card.innerHTML = `<div class="front"></div><div class="back">${sym}</div>`;
            board.appendChild(card);

            card.addEventListener('click', () => {
                if (lockBoard) return;
                if (card === firstCard) return;
                if (card.classList.contains('flipped')) return;

                window.playSound('click');
                card.classList.add('flipped');

                if (!firstCard) {
                    firstCard = card;
                    return;
                }

                secondCard = card;
                lockBoard = true;

                if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
                    pairsFound++;
                    firstCard = null;
                    secondCard = null;
                    lockBoard = false;
                    if (pairsFound === symbols.length) {
                        setTimeout(() => handleWin('uni', 'Prüfungen bestanden!'), 600);
                    }
                } else {
                    setTimeout(() => {
                        firstCard.classList.remove('flipped');
                        secondCard.classList.remove('flipped');
                        firstCard = null;
                        secondCard = null;
                        lockBoard = false;
                    }, 800);
                }
            });
        });
    }

    // 6. Office
    // 6. Office
    function startOffice() {
        console.log("OFFICE GAME LOADED: Version 4 with 3D Shuffle!");
        document.getElementById('office-modal').classList.remove('hidden');
        const res = document.getElementById('office-result');
        res.classList.add('hidden');
        const bcs = [document.getElementById('bc-0'), document.getElementById('bc-1'), document.getElementById('bc-2')];
        const keys = document.querySelectorAll('.key-hidden');
        const positions = ['15%', '45%', '75%'];
        let bcsOrder = [0, 1, 2];

        keys.forEach(k => k.classList.add('hidden'));
        bcs.forEach((b, i) => {
            b.style.left = positions[i];
            b.style.bottom = '20px';
            b.style.zIndex = '2';
            b.onclick = null; // disable click
        });

        // Hide key under random one
        const trueIdx = Math.floor(Math.random() * 3);
        const startBtn = document.getElementById('start-office-btn');
        startBtn.style.display = 'block';

        startBtn.onclick = () => {
            startBtn.style.display = 'none';
            keys[trueIdx].classList.remove('hidden'); // Show briefly

            setTimeout(() => {
                keys[trueIdx].classList.add('hidden');
                // Shuffle visually with arcs
                let swaps = 10;
                const intv = setInterval(() => {
                    swaps--;
                    // Reset all bottoms and z-index quickly
                    bcs.forEach(b => { b.style.bottom = '20px'; b.style.zIndex = '2'; });
                    
                    const pairs = [[0,1], [1,2], [0,2]];
                    const pair = pairs[Math.floor(Math.random() * pairs.length)];
                    let i = pair[0], j = pair[1];
                    
                    let temp = bcsOrder[i];
                    bcsOrder[i] = bcsOrder[j];
                    bcsOrder[j] = temp;
                    
                    // Arc physics
                    bcs[i].style.bottom = '60px'; // Goes over
                    bcs[i].style.zIndex = '5';
                    bcs[j].style.bottom = '-10px'; // Goes under
                    bcs[j].style.zIndex = '1';

                    bcs[0].style.left = positions[bcsOrder.indexOf(0)];
                    bcs[1].style.left = positions[bcsOrder.indexOf(1)];
                    bcs[2].style.left = positions[bcsOrder.indexOf(2)];

                    if (swaps <= 0) {
                        clearInterval(intv);
                        setTimeout(() => {
                            bcs.forEach(b => { b.style.bottom = '20px'; b.style.zIndex = '2'; });
                            bcs.forEach((b, idx) => {
                                b.onclick = () => {
                                    keys[trueIdx].classList.remove('hidden');
                                    if (idx === trueIdx) handleWin('office', 'Gefunden! Büro offen.');
                                    else handleFail('office', startOffice);
                                    bcs.forEach(bx => bx.onclick = null);
                                };
                            });
                        }, 800); // let them land
                    }
                }, 800); // 800ms interval for smoother arc feeling
            }, 1500); // 1.5 seconds instead of 1 so it's impossible to miss!
        };
    }

    // 7. Construction
    function startConstruction() {
        document.getElementById('construction-modal').classList.remove('hidden');
        const res = document.getElementById('construction-result');
        res.classList.add('hidden');
        
        const hookAsm = document.getElementById('crane-hook-assembly');
        const movingBlock = document.getElementById('moving-block');
        const stackArea = document.getElementById('block-stack');
        const startBtn = document.getElementById('start-construction-btn');
        const gameAreaWidth = document.getElementById('construction-game-area').clientWidth;
        
        stackArea.innerHTML = '';
        movingBlock.style.display = 'none';
        
        let active = false;
        let cX = gameAreaWidth / 2;
        let cDir = 1;
        let intv = null;
        let currentBlocks = 0;
        let dropsLeft = 10;
        
        const dropsLeftSpan = document.getElementById('crane-drops-left');
        dropsLeftSpan.textContent = dropsLeft;
        
        hookAsm.style.left = cX + 'px';
        
        startBtn.style.display = 'block';
        startBtn.onclick = () => {
            startBtn.style.display = 'none';
            playRound();
        };
        
        function playRound() {
            if (currentBlocks >= 3) return;
            if (dropsLeft <= 0) {
                handleFail('construction', startConstruction);
                return;
            }
            
            movingBlock.style.display = 'flex';
            movingBlock.style.transition = 'none';
            movingBlock.style.top = '55px';
            
            active = true;
            intv = setInterval(() => {
                cX += 6 * cDir;
                if (cX > gameAreaWidth - 50) cDir = -1;
                if (cX < 50) cDir = 1;
                hookAsm.style.left = cX + 'px';
                movingBlock.style.left = cX + 'px';
            }, 30);
            activeIntervals.push(intv);
        }
        
        document.getElementById('construction-game-area').onclick = () => {
            if (!active) return;
            active = false;
            clearInterval(intv);
            
            window.playSound('drop');
            dropsLeft--;
            dropsLeftSpan.textContent = dropsLeft;
            
            movingBlock.style.transition = 'top 0.4s cubic-bezier(0.5, 0, 1, 1)';
            const dropTop = 320 - 30 - 40 - (currentBlocks * 40); 
            movingBlock.style.top = dropTop + 'px';
            
            setTimeout(() => {
                const center = gameAreaWidth / 2;
                if (Math.abs(cX - center) < 30) {
                    currentBlocks++;
                    const dropped = document.createElement('div');
                    dropped.className = 'build-block';
                    dropped.style.left = '50%';
                    dropped.style.transform = 'translateX(-50%)';
                    dropped.style.bottom = ((currentBlocks-1) * 40) + 'px';
                    dropped.textContent = "Projekt " + currentBlocks;
                    stackArea.appendChild(dropped);
                    
                    movingBlock.style.display = 'none';
                    if (currentBlocks < 3) {
                        setTimeout(playRound, 500);
                    } else {
                        handleWin('construction', 'Perfekt gestapelt!');
                    }
                } else {
                    movingBlock.style.display = 'none';
                    if (dropsLeft <= 0) {
                        handleFail('construction', startConstruction);
                    } else {
                        setTimeout(playRound, 500);
                    }
                }
            }, 450);
        };
    }
});

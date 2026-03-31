document.addEventListener('DOMContentLoaded', () => {
    const data = window.resumeData;
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const introBox = document.getElementById('intro-box');
    const introText = document.getElementById('intro-text');
    const closeIntroBtn = document.getElementById('close-intro');
    const promptEl = document.getElementById('interaction-prompt');
    const uiLayer = document.getElementById('ui-layer');
    const infoModal = document.getElementById('info-modal');

    // Tabs & Fairytale
    const tabGame = document.getElementById('tab-game');
    const tabFairytale = document.getElementById('tab-fairytale');
    const fairytaleView = document.getElementById('fairytale-view');
    const fairytaleContent = document.getElementById('fairytale-content');
    const mobileControls = document.getElementById('mobile-controls');

    // Init Data
    introText.textContent = data.intro;

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
    let isFairytaleMode = false;

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

    // TABS
    tabGame.addEventListener('click', () => {
        if (!isFairytaleMode) return;
        isFairytaleMode = false;
        tabGame.classList.add('active');
        tabFairytale.classList.remove('active');
        fairytaleView.classList.add('hidden');
        uiLayer.style.display = 'block';
        if (window.innerWidth <= 800) mobileControls.style.display = 'flex';
    });

    tabFairytale.addEventListener('click', () => {
        if (isFairytaleMode) return;
        isFairytaleMode = true;
        tabFairytale.classList.add('active');
        tabGame.classList.remove('active');
        populateFairytale();
        fairytaleView.classList.remove('hidden');
        uiLayer.style.display = 'none';
        mobileControls.style.display = 'none';
    });

    function populateFairytale() {
        if (!data.fairytale) {
            fairytaleContent.innerHTML = "<p>Märchen-Texte wurden noch nicht konfiguriert. Nutze das Admin-Dashboard!</p>";
            return;
        }
        fairytaleContent.innerHTML = `
            <div class="fairytale-section"><em>${data.fairytale.intro}</em></div>
            <div class="fairytale-section"><h3>Das Training (Ausbildung)</h3><p>${data.fairytale.education}</p></div>
            <div class="fairytale-section"><h3>Die großen Reisen</h3><p>${data.fairytale.travels}</p></div>
            <div class="fairytale-section"><h3>Die Anfänge (Minijobs)</h3><p>${data.fairytale.minijobs}</p></div>
            <div class="fairytale-section"><h3>Die Taten (Erfahrung)</h3><p>${data.fairytale.experience}</p></div>
            <div class="fairytale-section"><h3>Die Künste (Fähigkeiten)</h3><p>${data.fairytale.skills}</p></div>
            <div class="fairytale-section"><h3>Der Ausgleich (Hobbies)</h3><p>${data.fairytale.hobbies}</p></div>
            <div style="text-align:center; margin-top:40px; font-weight:bold;">...und die Reise geht weiter!</div>
        `;
    }

    // World Data
    const worldWidth = 2000; const worldHeight = 1500;

    const player = {
        x: worldWidth / 2, y: worldHeight / 2, width: 40, height: 40,
        speed: window.innerWidth < 768 ? 4 : 6, color: '#e74c3c'
    };

    let cameraX = 0; let cameraY = 0;

    const buildings = [
        { id: 'stadium', x: 200, y: 150, w: 320, h: 250, color: '#2ecc71', name: 'Stadium', emoji: '🏟️' },
        { id: 'uni', x: 850, y: 200, w: 220, h: 220, color: '#3498db', name: 'Universität', emoji: '🎓' },
        { id: 'airport', x: 1450, y: 200, w: 280, h: 200, color: '#f39c12', name: 'Flughafen', emoji: '✈️' },
        { id: 'workshop', x: 250, y: 850, w: 200, h: 200, color: '#9b59b6', name: 'Werkstatt', emoji: '🛠️' },
        { id: 'office', x: 900, y: 900, w: 250, h: 280, color: '#34495e', name: 'Büro', emoji: '🏢' }
    ];

    // Pac-Man Points (generated along a loop path)
    const collectibles = [];
    const pathSegments = [
        { x: 300, y: 500, w: 1400, h: 80 }, // Top horizontal
        { x: 300, y: 700, w: 1400, h: 80 }, // Bottom horizontal
        { x: 400, y: 400, w: 80, h: 500 },  // Left vertical 1
        { x: 950, y: 400, w: 80, h: 600 },  // Mid vertical
        { x: 1600, y: 400, w: 80, h: 500 }  // Right vertical
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
    for (let i = 0; i < 60; i++) trees.push({ x: Math.random() * (worldWidth - 50), y: Math.random() * (worldHeight - 50) });

    const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    window.addEventListener('keydown', e => {
        let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (keys.hasOwnProperty(key)) keys[key] = true;
        if ((key === 'e' || key === ' ') && !isModalOpen && !isFairytaleMode) handleInteraction();
    });
    window.addEventListener('keyup', e => {
        let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (keys.hasOwnProperty(key)) keys[key] = false;
    });

    const mobileAction = () => { if (!isModalOpen && !isFairytaleMode) handleInteraction(); };
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
        if (!isModalOpen && !isFairytaleMode) {
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
        if (isFairytaleMode) return;
        ctx.fillStyle = '#689F38'; ctx.fillRect(0, 0, canvas.width, canvas.height); // Darker grass

        ctx.save(); ctx.translate(-cameraX, -cameraY);

        // Draw paths
        ctx.fillStyle = '#d7ccc8'; // Dirt path color
        pathSegments.forEach(seg => {
            ctx.beginPath(); ctx.roundRect(seg.x, seg.y, seg.w, seg.h, 20); ctx.fill();
        });

        // Add a lake
        ctx.fillStyle = '#29b6f6';
        ctx.beginPath(); ctx.ellipse(1500, 500, 150, 80, 0, 0, Math.PI * 2); ctx.fill();
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
            ctx.fillStyle = '#3e2723'; ctx.fillRect(b.x + b.w / 2 - 25, b.y + b.h - 50, 50, 50);
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
    function startUni() {
        document.getElementById('uni-modal').classList.remove('hidden');
        const res = document.getElementById('uni-result');
        const area = document.getElementById('uni-game-area');
        res.classList.add('hidden'); area.innerHTML = '';

        const vals = [6, 7, 9];
        let active = true;

        vals.forEach((v, i) => {
            const b = document.createElement('div');
            b.className = 'uni-bubble'; b.textContent = v;
            b.style.left = (20 + i * 30) + '%';
            area.appendChild(b);

            b.onclick = () => {
                if (!active) return; active = false;
                if (v === 7) handleWin('uni', 'Akademisch brilliant!'); else handleFail('uni', startUni);
            };
        });

        let bubbleY = -50;
        const intv = setInterval(() => {
            if (!active) return;
            bubbleY += 2;
            document.querySelectorAll('.uni-bubble').forEach(b => b.style.top = bubbleY + 'px');
            if (bubbleY > 250) { active = false; handleFail('uni', startUni); } // Missed
        }, 50);
        activeIntervals.push(intv);
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
});

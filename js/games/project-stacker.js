// Projekt-Baustelle: „Projekt-Stapler“ – Blöcke mit Projekten, Skills und Eigenschaften genau aufeinander setzen.
// Lange Begriffe kommen zuerst (unten, auf den breiten Blöcken), kürzere oben – der Turm wird schmaler wie eine Pyramide.
import { lerp } from '../core/math.js';
import { t } from '../core/i18n.js';
import { W, H, FONT, rr, txt } from './draw.js';

const KIND_HUE = { p: 28, s: 212, e: 150 };            // Projekt, Skill, Eigenschaft
const PREFERRED_SKILLS = ['Java', 'SQL', 'JavaScript', 'React', 'Node.js', 'Claude Code', 'Git', 'Jira'];
const MAX_SKILLS = 7, MAX_TRAITS = 6;
const BLOCK = { h: 30, depth: 10, minW: 54, baseW: 240, maxW: 250, grow: 14 };
const SPEED = { start: 170, gain: 9, max: 340 };
const PERFECT_PX = 7, PERFECT_RUN_TO_GROW = 3, FINISH_DELAY_S = 1.3;
const GROUND_FROM_BOTTOM = 56, VISIBLE_BLOCKS = 6;

function stackLabels(env) {
    const d = env.data, toks = env.derived.skillTokens || [];
    const proj = (d.projects || []).map(p => ['p', p.title]);
    const skills = PREFERRED_SKILLS.filter(s => toks.includes(s)).concat(toks.filter(s => !PREFERRED_SKILLS.includes(s))).slice(0, MAX_SKILLS).map(s => ['s', s]);
    const traits = (d.traits || []).slice(0, MAX_TRAITS).map(s => ['e', s]);
    const out = [], n = Math.max(proj.length, skills.length, traits.length);
    for (let i = 0; i < n; i++) [proj[i], skills[i], traits[i]].forEach(v => v && out.push(v));
    return out.sort((a, b) => b[1].length - a[1].length);
}

export default {
    id: 'projects', icon: '🏗️', color: '#f59e0b', time: 0,
    controls: ['click', 'space', 'tap'],
    stars: (g) => [Math.round(g.total * 0.8), Math.round(g.total * 1.25), Math.round(g.total * 1.8)],
    hud: (g) => `🏗️ ${g.level || 0} / ${g.total || 0}`,
    resultParams: (g) => ({ n: g.level || 0 }),
    make(g, env) {
        const labels = stackLabels(env);
        const BH = BLOCK.h, DEP = BLOCK.depth;
        const base = { x: W / 2 - BLOCK.baseW / 2, w: BLOCK.baseW, label: t('games.projects.base'), kind: 'base', hue: 222, land: 0 };
        const stack = [base];
        let cur = null, dir = 1, speed = SPEED.start, cam = 0, falling = [], perfectRun = 0, over = false, endT = 0, idx = 0;
        g.level = 0; g.total = labels.length;
        const yOf = (i) => H - GROUND_FROM_BOTTOM - i * BH;
        function newBlock() {
            const top = stack[stack.length - 1], i = stack.length, [kind, label] = labels[idx];
            dir = i % 2 ? 1 : -1;
            cur = { x: dir > 0 ? 30 - top.w * 0.5 : W - 30 - top.w * 0.5, w: top.w, label, kind, hue: KIND_HUE[kind] + (i % 3) * 8, land: 0 };
            speed = Math.min(SPEED.max, SPEED.start + i * SPEED.gain);
        }
        function drop() {
            if (!cur || over) return;
            const top = stack[stack.length - 1], dx = cur.x - top.x, i = stack.length, cy = yOf(i) + cam;
            if (Math.abs(dx) <= PERFECT_PX) {
                cur.x = top.x; perfectRun++;
                if (perfectRun >= PERFECT_RUN_TO_GROW) { const grow = Math.min(BLOCK.grow, BLOCK.maxW - cur.w); if (grow > 0) { cur.w += grow; cur.x -= grow / 2; } }
                g.hit(2, cur.x + cur.w / 2, cy - 30, perfectRun >= PERFECT_RUN_TO_GROW ? t('games.projects.perfectGrow') : t('games.projects.perfect'), '#ffd166');
                g.ring(cur.x + cur.w / 2, cy + BH / 2, '#fff', cur.w / 2);
                g.sfx('perfect');
            } else {
                const overlap = top.w - Math.abs(dx);
                if (overlap <= 0) {   // daneben: Block fällt, derselbe Baustein kommt noch einmal
                    falling.push({ ...cur, y: yOf(i), vy: 0, vx: dir * 80, rot: 0, vr: dir * 2 });
                    perfectRun = 0;
                    g.miss(W / 2, cy - 40, t('games.projects.missed'));
                    cur = null; newBlock();
                    return;
                }
                const piece = dx > 0 ? { x: top.x + top.w, w: dx } : { x: cur.x, w: -dx };
                falling.push({ ...cur, ...piece, y: yOf(i), vy: -60, vx: Math.sign(dx) * 90, rot: 0, vr: Math.sign(dx) * 3 });
                if (dx > 0) cur.w = overlap; else { cur.x = top.x; cur.w = overlap; }
                if (cur.w < BLOCK.minW) { const c0 = cur.x + cur.w / 2; cur.w = BLOCK.minW; cur.x = c0 - BLOCK.minW / 2; }
                perfectRun = 0; g.combo = 0;
                g.add(1, cur.x + cur.w / 2, cy - 26);
                g.sfx('thud');
            }
            cur.land = 1;
            stack.push(cur); g.level = stack.length - 1; idx++;
            g.shake(3);
            g.burst(cur.x + cur.w / 2, yOf(i) + cam + BH, 10, ['#fff', '#e5e7eb'], 140, { grav: 200, life: 0.4, size: 4 });
            cur = null;
            if (idx >= labels.length) { g.add(10, W / 2, H / 2 - 40, t('games.projects.allDone'), '#ffd166'); g.sfx('fanfare'); g.flash('#fff', 0.4); over = true; endT = FINISH_DELAY_S; }
            else newBlock();
        }
        function block(c, b, y) {
            const h = b.hue, sat = b.kind === 'base' ? 30 : 68;
            c.fillStyle = `hsl(${h},${sat}%,74%)`;
            c.beginPath(); c.moveTo(b.x, y); c.lineTo(b.x + b.w, y); c.lineTo(b.x + b.w + DEP, y - DEP); c.lineTo(b.x + DEP, y - DEP); c.closePath(); c.fill();
            c.fillStyle = `hsl(${h},${sat - 8}%,40%)`;
            c.beginPath(); c.moveTo(b.x + b.w, y); c.lineTo(b.x + b.w + DEP, y - DEP); c.lineTo(b.x + b.w + DEP, y - DEP + BH); c.lineTo(b.x + b.w, y + BH); c.closePath(); c.fill();
            c.fillStyle = `hsl(${h},${sat}%,55%)`; c.fillRect(b.x, y, b.w, BH);
            if (b.w <= 34) return;
            c.save(); c.beginPath(); c.rect(b.x + 3, y, b.w - 6, BH); c.clip();
            let tag = KIND_HUE[b.kind] !== undefined ? t('games.projects.kinds.' + b.kind).toUpperCase() : '';
            const avail = b.w - 14;
            let fs = 13, label = b.label, tagW = 0, labelW = 0;
            const measure = () => {
                c.font = `800 8.5px ${FONT}`; tagW = tag ? c.measureText(tag).width + 10 : 0;
                c.font = `800 ${fs}px ${FONT}`; labelW = c.measureText(label).width;
                return labelW + (tag ? tagW + 6 : 0) + 16;
            };
            if (measure() > avail) tag = '';
            while (measure() > avail && fs > 9) fs -= 0.5;
            while (measure() > avail && label.length > 3) label = label.slice(0, -2) + '…';
            const total = measure(), x0 = b.x + b.w / 2 - total / 2;
            c.fillStyle = `hsla(${h},70%,24%,0.82)`; rr(c, x0, y + 6, total, 18, 9); c.fill();
            if (tag) { c.fillStyle = 'rgba(255,255,255,0.22)'; rr(c, x0 + 4, y + 9, tagW, 12, 6); c.fill(); txt(c, tag, x0 + 4 + tagW / 2, y + 15.5, 8.5, '#fff'); }
            txt(c, label, x0 + (tag ? tagW + 10 : 8) + labelW / 2, y + 15.5, fs, '#fff');
            c.restore();
        }
        return {
            update(dt) {
                if (g.state === 'play' && !cur && !over) newBlock();
                if (cur && g.state === 'play') {
                    cur.x += dir * speed * dt;
                    const L = 20 - cur.w * 0.6, R = W - 20 - cur.w * 0.4;
                    if (cur.x > R) { cur.x = R; dir = -1; }
                    if (cur.x < L) { cur.x = L; dir = 1; }
                }
                for (const f of falling) { f.vy += 1100 * dt; f.y += f.vy * dt; f.x += f.vx * dt; f.rot += f.vr * dt; }
                falling = falling.filter(f => f.y + cam < H + 200);
                for (const b of stack) b.land = Math.max(0, b.land - dt * 4);
                cam = lerp(cam, Math.max(0, (stack.length - VISIBLE_BLOCKS) * BH), Math.min(1, dt * 4));
                if (endT > 0) { endT -= dt; if (endT <= 0) g.end(); }
            },
            draw(c) {
                const hgt = Math.min(1, cam / 500);   // je höher der Turm, desto später der Abend
                const sky = c.createLinearGradient(0, 0, 0, H);
                sky.addColorStop(0, `hsl(${215 + hgt * 25},${70 - hgt * 20}%,${72 - hgt * 45}%)`);
                sky.addColorStop(1, `hsl(${30 + hgt * 200},${80 - hgt * 40}%,${88 - hgt * 40}%)`);
                c.fillStyle = sky; c.fillRect(0, 0, W, H);
                if (hgt > 0.2) { c.fillStyle = `rgba(255,255,255,${(hgt - 0.2) * 0.9})`; for (let i = 0; i < 40; i++) c.fillRect((i * 97) % W, (i * 53) % (H * 0.6), 2, 2); }
                c.fillStyle = 'rgba(80,100,140,0.35)';
                for (let i = 0; i < 12; i++) { const bh = 40 + ((i * 37) % 70); c.fillRect(i * 54, H - 40 - bh + cam * 0.35, 46, bh + 40); }
                c.fillStyle = '#6b7280'; c.fillRect(0, H - 40 + cam, W, 60);
                c.fillStyle = '#facc15'; for (let x = 0; x < W; x += 60) c.fillRect(x, H - 34 + cam, 30, 5);
                g.nightShade(c);
                stack.forEach((b, i) => {
                    const y = yOf(i) + cam + (b.land ? -Math.sin(b.land * Math.PI) * 4 : 0);
                    if (y >= -BH * 2 && y <= H + 20) block(c, b, y);
                });
                for (const f of falling) {
                    c.save(); const cx = f.x + f.w / 2, cy = f.y + cam + BH / 2;
                    c.translate(cx, cy); c.rotate(f.rot); c.translate(-cx, -cy);
                    block(c, f, f.y + cam); c.restore();
                }
                if (cur) {
                    const y = yOf(stack.length) + cam, top = stack[stack.length - 1];
                    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.setLineDash([4, 6]); c.lineWidth = 1.5;
                    c.beginPath(); c.moveTo(top.x, y + BH); c.lineTo(top.x, y - 30); c.moveTo(top.x + top.w, y + BH); c.lineTo(top.x + top.w, y - 30); c.stroke(); c.setLineDash([]);
                    block(c, cur, y);
                    c.strokeStyle = '#475569'; c.lineWidth = 2; c.beginPath(); c.moveTo(cur.x + cur.w / 2, y); c.lineTo(cur.x + cur.w / 2, y - 60); c.stroke();
                    c.fillStyle = '#facc15'; c.fillRect(cur.x + cur.w / 2 - 8, y - 66, 16, 8);
                }
                let lx = 16;   // Legende
                Object.entries(KIND_HUE).forEach(([kind, hue]) => {
                    const name = t('games.projects.kinds.' + kind);
                    c.fillStyle = `hsl(${hue},68%,55%)`; rr(c, lx, H - 22, 10, 10, 3); c.fill();
                    txt(c, name, lx + 16, H - 16.5, 11, '#fff', 'left', 700);
                    c.font = `700 11px ${FONT}`; lx += 26 + c.measureText(name).width;
                });
                if (g.state === 'play' && g.t < 2.4) { c.globalAlpha = 1 - g.t / 2.4; txt(c, t('games.projects.hint'), W / 2, 92, 17, '#fff', 'center', 800, 5); c.globalAlpha = 1; }
            },
            down() { drop(); },
            key(k, down, _g, rep) { if ((k === ' ' || k === 'Enter' || k === 'ArrowDown') && down && !rep) { drop(); return true; } }
        };
    }
};

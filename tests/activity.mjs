// Test für tools/github-activity.mjs mit simulierter GitHub-API (keine echten Anfragen).
// Prüft: Übersichtszahlen gesamt/3/6/12 Monate, private Commits nur als Zahl, Anzahl Projekte,
// Verhalten ohne persönliches Token (kein viewer → nur öffentliche Projektzahl).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './lib.mjs';

let problems = 0;
const check = (ok, msg) => { console.log(`  ${ok ? '✓' : '✗'} ${msg}`); if (!ok) problems++; };

// Vorgeschaltetes Modul ersetzt fetch durch Antworten aus der Variable MOCK_GH (JSON)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'activity-'));
const mock = path.join(tmp, 'mock-fetch.mjs');
fs.writeFileSync(mock, `
const opt = JSON.parse(process.env.MOCK_GH);
globalThis.fetch = async (url, init) => {
    const { query, variables } = JSON.parse(init.body);
    const reply = (data) => ({ ok: true, json: async () => ({ data }) });
    if (query.includes('viewer')) return opt.viewer ? reply({ viewer: { login: opt.viewer } }) : ({ ok: false, json: async () => ({ errors: [{ message: 'no viewer' }] }) });
    if (query.includes('contributionCalendar')) return reply({ user: { id: 'U1', createdAt: opt.createdAt,
        contributionsCollection: { contributionCalendar: { totalContributions: 9, weeks: [{ contributionDays: [{ date: '2026-11-10', contributionCount: 4 }, { date: '2026-11-11', contributionCount: 5 }] }] } },
        repositories: { nodes: [{ nameWithOwner: 'x/pub', url: 'https://github.com/x/pub', isFork: false }] },
        publicRepos: { totalCount: 4 } } });
    if (query.includes('commitContributionsByRepository')) {
        const days = (new Date(variables.to) - new Date(variables.from)) / 864e5;
        const pub = Math.round(days), priv = opt.viewer ? Math.round(days / 2) : 0;
        return reply({ user: { contributionsCollection: { totalCommitContributions: pub + priv, restrictedContributionsCount: opt.restricted || 0,
            commitContributionsByRepository: [{ repository: { isPrivate: false }, contributions: { totalCount: pub } }, ...(priv ? [{ repository: { isPrivate: true }, contributions: { totalCount: priv } }] : [])] } } });
    }
    if (query.includes('privacy: PRIVATE')) return reply({ user: { repositories: { totalCount: 7 } } });
    if (query.includes('history')) return reply({ repository: { defaultBranchRef: { target: { history: { nodes: [{ messageHeadline: 'Commit', committedDate: '2026-11-11T10:00:00Z', url: 'u' }] } } } } });
    throw new Error('Unerwartete Abfrage: ' + query.slice(0, 60));
};`);

function run(opt) {
    const out = path.join(tmp, 'out.json');
    const r = spawnSync(process.execPath, ['--import', mock, path.join(ROOT, 'tools/github-activity.mjs'), 'Abdul7Kader', out],
        { env: { ...process.env, GH_TOKEN: 'test', MOCK_GH: JSON.stringify(opt) }, encoding: 'utf8' });
    if (r.status !== 0) { console.log(r.stderr); return null; }
    return JSON.parse(fs.readFileSync(out, 'utf8'));
}

console.log('GitHub-Aktivität · persönliches Token');
const a = run({ viewer: 'abdul7kader', createdAt: '2023-01-15T00:00:00Z' });
check(!!a, 'Skript läuft');
if (a) {
    const s = a.summary;
    check(s.includesPrivate === true, 'private Beiträge enthalten');
    check(s.commits.months3 < s.commits.months6 && s.commits.months6 < s.commits.months12 && s.commits.months12 < s.commits.total, `Zeiträume steigen an (${s.commits.months3} < ${s.commits.months6} < ${s.commits.months12} < ${s.commits.total})`);
    check(s.privateCommits.total > 0 && s.privateCommits.total < s.commits.total, `davon privat: ${s.privateCommits.total} von ${s.commits.total}`);
    check(s.repos.public === 4 && s.repos.private === 7, 'Projekte öffentlich/privat gezählt');
    check(s.since === '2023-01-15', 'Konto seit');
    check(!JSON.stringify(a).includes('isPrivate'), 'keine Details privater Repositories in der Datei');
    check(a.days.length === 2 && a.commits.length === 1, 'Kalender und letzte Commits wie bisher');
}

console.log('GitHub-Aktivität · Standard-Token der Action');
const b = run({ viewer: null, createdAt: '2025-06-01T00:00:00Z' });
check(!!b, 'Skript läuft ohne viewer');
if (b) {
    check(b.summary.includesPrivate === false && b.summary.privateCommits.total === 0, 'ohne Token keine privaten Zahlen');
    check(b.summary.repos.private === null && b.summary.repos.public === 4, 'private Projektzahl unbekannt (null)');
}
const c = run({ viewer: null, createdAt: '2025-06-01T00:00:00Z', restricted: 3 });
check(c && c.summary.includesPrivate === true && c.summary.privateCommits.months3 === 3, 'im Profil freigegebene private Beiträge zählen auch ohne Token');

fs.rmSync(tmp, { recursive: true, force: true });
console.log(problems ? `\n${problems} Problem(e)` : '\nAlles in Ordnung');
process.exit(problems ? 1 : 0);

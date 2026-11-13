// Holt die GitHub-Aktivität (Beitrags-Kalender der letzten 12 Monate, letzte Commits aus öffentlichen Repos und
// Übersichtszahlen) und schreibt sie nach github-activity.json. Läuft täglich per GitHub Action
// (.github/workflows/github-activity.yml), damit Besucher der Webseite keine API-Limits erreichen. Node 18+.
//   GH_TOKEN=… node tools/github-activity.mjs [login] [ausgabe.json]
//
// Private Beiträge: Nur mit einem persönlichen Token (Secret ACTIVITY_TOKEN, nur Leserechte) zählt das Skript Commits
// in privaten Repositories mit und nennt die Anzahl privater Projekte. Es werden nur Zahlen gespeichert – keine Namen
// privater Repositories, keine Commit-Texte daraus. Mit dem Standard-Token der Action bleiben es öffentliche Zahlen.
import fs from 'node:fs';

const login = process.argv[2] || 'Abdul7Kader';
const out = process.argv[3] || 'github-activity.json';
const token = process.env.GH_TOKEN;
if (!token) { console.error('GH_TOKEN fehlt'); process.exit(1); }

const DAY = 864e5;
const MONTH_WINDOWS = [3, 6, 12];

async function gql(query, variables) {
    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'cv-activity' },
        body: JSON.stringify({ query, variables })
    });
    const j = await res.json();
    if (!res.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
    return j.data;
}

const data = await gql(`query($login: String!) {
  user(login: $login) {
    id createdAt
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    repositories(first: 12, privacy: PUBLIC, ownerAffiliations: [OWNER, COLLABORATOR], orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes { nameWithOwner url isFork }
    }
    publicRepos: repositories(privacy: PUBLIC, ownerAffiliations: [OWNER], isFork: false) { totalCount }
  }
}`, { login });

const user = data.user;
const cal = user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap(w => w.contributionDays).map(d => [d.date, d.contributionCount]);

// Ist das Token das eigene (persönliche) Token? Nur dann sind private Repositories sichtbar.
let withPrivate = false;
try {
    const v = await gql('query { viewer { login } }');
    withPrivate = String(v.viewer.login).toLowerCase() === login.toLowerCase();
} catch (e) { /* Token einer GitHub-App: kein viewer – bleibt öffentlich */ }

// Commit-Beiträge in einem Zeitraum (höchstens ein Jahr pro Abfrage), davon in privaten Repositories
async function commitsBetween(from, to) {
    const d = await gql(`query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) { contributionsCollection(from: $from, to: $to) {
        totalCommitContributions restrictedContributionsCount
        commitContributionsByRepository(maxRepositories: 100) { repository { isPrivate } contributions { totalCount } }
      } }
    }`, { login, from: from.toISOString(), to: to.toISOString() });
    const c = d.user.contributionsCollection;
    const priv = c.commitContributionsByRepository.filter(r => r.repository.isPrivate).reduce((a, r) => a + r.contributions.totalCount, 0);
    // restrictedContributionsCount: private Beiträge, die das Token nicht im Detail sehen darf (nur als Zahl)
    return { total: c.totalCommitContributions + c.restrictedContributionsCount, private: priv + c.restrictedContributionsCount };
}

const now = new Date();
const monthsAgo = (m) => { const d = new Date(now); d.setMonth(d.getMonth() - m); return d; };
const commitStats = { months: {} };
for (const m of MONTH_WINDOWS) commitStats.months[m] = await commitsBetween(monthsAgo(m), now);
// Gesamt seit Kontoerstellung: Jahr für Jahr aufsummieren
let total = 0, totalPrivate = 0;
for (let from = new Date(user.createdAt); from < now;) {
    const to = new Date(Math.min(now.getTime(), from.getTime() + 365 * DAY));
    const c = await commitsBetween(from, to);
    total += c.total; totalPrivate += c.private;
    from = to;
}
commitStats.total = { total, private: totalPrivate };

let privateRepos = null;
if (withPrivate) {
    const d = await gql(`query($login: String!) { user(login: $login) {
      repositories(privacy: PRIVATE, ownerAffiliations: [OWNER], isFork: false) { totalCount } } }`, { login });
    privateRepos = d.user.repositories.totalCount;
}

// Serien und aktivster Tag
let longest = 0, run = 0;
days.forEach(([, n]) => { run = n ? run + 1 : 0; longest = Math.max(longest, run); });
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
    if (days[i][1]) current++;
    else if (i === days.length - 1) continue;   // heute noch nichts → Serie bis gestern zählt
    else break;
}
const best = days.reduce((a, d) => (d[1] > a[1] ? d : a), ['', 0]);

// Letzte Commits (eigene) aus den zuletzt aktualisierten öffentlichen Repos
const commits = [];
for (const r of user.repositories.nodes.filter(r => !r.isFork).slice(0, 8)) {
    const [owner, name] = r.nameWithOwner.split('/');
    try {
        const d = await gql(`query($owner: String!, $name: String!, $author: ID!) {
          repository(owner: $owner, name: $name) {
            defaultBranchRef { target { ... on Commit { history(first: 5, author: { id: $author }) {
              nodes { messageHeadline committedDate url }
            } } } }
          }
        }`, { owner, name, author: user.id });
        const nodes = d.repository?.defaultBranchRef?.target?.history?.nodes || [];
        nodes.forEach(c => commits.push({ repo: r.nameWithOwner, message: c.messageHeadline, date: c.committedDate, url: c.url }));
    } catch (e) { console.warn('Übersprungen:', r.nameWithOwner, e.message); }
}
commits.sort((a, b) => b.date.localeCompare(a.date));

const json = {
    login, generated: now.toISOString(),
    total: cal.totalContributions, currentStreak: current, longestStreak: longest,
    best: best[1] ? { date: best[0], count: best[1] } : null,
    days, commits: commits.slice(0, 6),
    // Übersicht: Commits gesamt und in den letzten Monaten. Private Commits zählen vollständig nur mit persönlichem
    // Token; sonst nur, was GitHub als „private Beiträge“ im Profil freigibt. Anzahl privater Projekte nur mit Token.
    summary: {
        since: user.createdAt.slice(0, 10),
        includesPrivate: withPrivate || commitStats.total.private > 0,
        commits: {
            total: commitStats.total.total,
            ...Object.fromEntries(MONTH_WINDOWS.map(m => [`months${m}`, commitStats.months[m].total]))
        },
        privateCommits: {
            total: commitStats.total.private,
            ...Object.fromEntries(MONTH_WINDOWS.map(m => [`months${m}`, commitStats.months[m].private]))
        },
        repos: { public: user.publicRepos.totalCount, private: privateRepos }
    }
};
fs.writeFileSync(out, JSON.stringify(json) + '\n');
console.log(`${out}: ${json.total} Beiträge, ${json.commits.length} Commits, Serie ${current} (längste ${longest}), ` +
    `Commits gesamt ${json.summary.commits.total} (davon privat ${json.summary.privateCommits.total}${withPrivate ? '' : ', ohne persönliches Token'})`);

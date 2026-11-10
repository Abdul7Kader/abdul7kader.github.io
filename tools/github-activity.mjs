// Holt die GitHub-Aktivität (Beitrags-Kalender der letzten 12 Monate + letzte Commits aus öffentlichen Repos)
// und schreibt sie nach github-activity.json. Läuft täglich per GitHub Action (.github/workflows/github-activity.yml),
// damit Besucher der Webseite keine API-Limits erreichen. Benötigt Node 18+ (eingebautes fetch).
//   GH_TOKEN=… node tools/github-activity.mjs [login] [ausgabe.json]
import fs from 'node:fs';

const login = process.argv[2] || 'Abdul7Kader';
const out = process.argv[3] || 'github-activity.json';
const token = process.env.GH_TOKEN;
if (!token) { console.error('GH_TOKEN fehlt'); process.exit(1); }

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
    id
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
    repositories(first: 12, privacy: PUBLIC, ownerAffiliations: [OWNER, COLLABORATOR], orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes { nameWithOwner url isFork }
    }
  }
}`, { login });

const user = data.user;
const cal = user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap(w => w.contributionDays).map(d => [d.date, d.contributionCount]);

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
    login, generated: new Date().toISOString(),
    total: cal.totalContributions, currentStreak: current, longestStreak: longest,
    best: best[1] ? { date: best[0], count: best[1] } : null,
    days, commits: commits.slice(0, 6)
};
fs.writeFileSync(out, JSON.stringify(json) + '\n');
console.log(`${out}: ${json.total} Beiträge, ${json.commits.length} Commits, Serie ${current} (längste ${longest})`);

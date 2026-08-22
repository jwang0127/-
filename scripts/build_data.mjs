import fs from "node:fs/promises";

const sourceRoot = process.argv[2] || "C:/Users/Administrator/Documents/ChatGPT/足球雷达";
const date = process.argv[3] || "20260822";
const snapshotPath = `${sourceRoot}/data/market_snapshots_${date}.jsonl`;
const rawPath = `${sourceRoot}/data/raw/market_excel_${date}.json`;
const lines = (await fs.readFile(snapshotPath, "utf8")).split(/\r?\n/).filter(Boolean);
const snapshots = [];
for (const line of lines) {
  try { const row = JSON.parse(line); if (row.handicap && row.goals) snapshots.push(row); } catch {}
}
const latestByMatch = new Map();
for (const row of snapshots) latestByMatch.set(row.matchNum, row);
let raw = {};
try { raw = JSON.parse(await fs.readFile(rawPath, "utf8")); } catch {}
const rawByMatch = new Map();
for (const group of raw.value?.matchInfoList || []) for (const match of group.subMatchList || []) rawByMatch.set(match.matchNumStr, match);
const grouped = new Map();
for (const row of snapshots) {
  if (!grouped.has(row.matchNum)) grouped.set(row.matchNum, []);
  grouped.get(row.matchNum).push(row);
}
const matches = [...grouped.entries()].map(([matchNum, timeline]) => {
  const latest = latestByMatch.get(matchNum);
  const rawMatch = rawByMatch.get(matchNum) || {};
  return {
    id: matchNum.replace(/\D/g, "").slice(-3), matchNum,
    matchId: latest.matchId, kickoff: latest.kickoff, league: latest.league,
    home: latest.home, away: latest.away, status: latest.status,
    homeRank: rawMatch.homeRank?.[0] || "", awayRank: rawMatch.awayRank?.[0] || "",
    timeline: timeline.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)),
  };
}).sort((a, b) => Number(a.id) - Number(b.id));
const payload = { businessDate: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`, generatedAt: new Date().toISOString(), matchCount: matches.length, matches };
await fs.mkdir("data", { recursive: true });
await fs.writeFile(`data/market_${date}.json`, JSON.stringify(payload, null, 2), "utf8");
console.log(JSON.stringify({ matchCount: matches.length, output: `data/market_${date}.json` }));

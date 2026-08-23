import fs from "node:fs/promises";
const date = process.env.MARKET_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
const path = `data/raw/official_snapshots_${date}.jsonl`;
const target = `data/market_${date}.json`;
const current = JSON.parse(await fs.readFile(target, "utf8"));
const rows = (await fs.readFile(path, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const byId = new Map(current.matches.map(match => [match.id, match]));
for (const row of rows) {
  const id = row.matchNum.replace(/\D/g, "").slice(-3);
  let match = byId.get(id);
  if (!match) { match = { id, matchNum: row.matchNum, matchId: row.matchId, kickoff: row.kickoff, league: row.league, home: row.home, away: row.away, status: row.status, timeline: [], fiveHundred: { status: "unavailable", reason: "待采集" } }; byId.set(id, match); }
  if (!match.timeline.some(item => item.capturedAt === row.capturedAt)) match.timeline.push(row);
  match.timeline.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  match.status = row.status; match.kickoff = row.kickoff; match.league = row.league; match.home = row.home; match.away = row.away;
}
current.generatedAt = new Date().toISOString(); current.matchCount = byId.size; current.matches = [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
await fs.writeFile(target, JSON.stringify(current, null, 2), "utf8");
console.log(JSON.stringify({ target, matchCount: current.matchCount, appended: rows.length }));

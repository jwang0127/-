import fs from "node:fs/promises";
const date = process.argv[2] || process.env.MARKET_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
const path = `data/raw/official_snapshots_${date}.jsonl`;
const target = `data/market_${date}.json`;
const rows = (await fs.readFile(path, "utf8")).split(/\r?\n/).filter(Boolean).map(JSON.parse);
const businessDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
const sourceRegistry = [
  { key: "sporttery", name: "中国竞彩网", role: "官方赛程与竞彩基准", status: "checked", url: "https://www.sporttery.cn/" },
  { key: "fiveHundred", name: "500彩票网", role: "多公司亚盘/欧赔/大小球/比分页", status: "unavailable", url: "https://trade.500.com/jczq/" },
  { key: "asianOdds", name: "AsianOdds", role: "亚洲盘、大小球、赔率变动聚合", status: "page-accessible_match-feed-not-yet-verified", url: "https://asianodds.com/zh/odds-comparison" },
  { key: "oddsPortal", name: "OddsPortal", role: "跨公司赔率与 dropping odds 复核", status: "page-accessible_match-feed-not-yet-verified", url: "https://www.oddsportal.com/dropping-odds/" },
  { key: "exchange", name: "Betfair Exchange", role: "交易所价格与成交量", status: "unavailable-no-public-feed", url: "https://www.betfair.com/exchange/football" },
];
let current;
try {
  current = JSON.parse(await fs.readFile(target, "utf8"));
} catch {
  current = { businessDate, generatedAt: new Date().toISOString(), matchCount: 0, sourceRegistry, matches: [] };
}
let fiveHundred = {};
try {
  fiveHundred = JSON.parse(await fs.readFile(`data/raw/500_markets_${date}.json`, "utf8"));
} catch {}
const byId = new Map((current.matches || []).map(match => [match.id, match]));
for (const row of rows) {
  const id = row.matchNum.replace(/\D/g, "").slice(-3);
  let match = byId.get(id);
  if (!match) { match = { id, matchNum: row.matchNum, matchId: row.matchId, kickoff: row.kickoff, league: row.league, home: row.home, away: row.away, status: row.status, timeline: [], fiveHundred: { status: "unavailable", reason: "待采集" } }; byId.set(id, match); }
  if (!match.timeline.some(item => item.capturedAt === row.capturedAt)) match.timeline.push(row);
  match.timeline.sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  match.status = row.status; match.kickoff = row.kickoff; match.league = row.league; match.home = row.home; match.away = row.away;
  if (fiveHundred.matches?.[id]) match.fiveHundred = fiveHundred.matches[id];
}
current.businessDate = businessDate;
current.generatedAt = new Date().toISOString();
current.matchCount = byId.size;
current.sourceRegistry = sourceRegistry.map(source => source.key === "fiveHundred" ? { ...source, status: fiveHundred.matches ? "checked" : "unavailable" } : source);
current.matches = [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
await fs.writeFile(target, JSON.stringify(current, null, 2), "utf8");
await fs.writeFile("data/current.json", JSON.stringify(current, null, 2), "utf8");
console.log(JSON.stringify({ target, current: "data/current.json", matchCount: current.matchCount, appended: rows.length }));

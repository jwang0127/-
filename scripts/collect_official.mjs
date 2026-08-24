import fs from "node:fs/promises";

const date = process.env.MARKET_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
const businessDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
const url = "https://webapi.sporttery.cn/gateway/uniform/football/getMatchCalculatorV1.qry?channel=c&poolCode=ttg,had,hhad,crs,hafu";
const res = await fetch(url, { headers: {
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  referer: "https://m.sporttery.cn/mjc/jsq/zqzjq/",
  origin: "https://m.sporttery.cn",
  accept: "application/json, text/plain, */*",
  "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
} });
if (!res.ok) throw new Error(`official ${res.status}`);
const payload = await res.json();
const pool = (raw) => {
  const out = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (key.endsWith("f") || ["updateDate", "updateTime"].includes(key) || value === "" || value == null) continue;
    const n = Number(value); out[key] = Number.isFinite(n) ? n : String(value);
  }
  return out;
};
const capturedAt = new Date().toISOString();
const rows = [];
for (const group of payload.value?.matchInfoList || []) {
  if (group.businessDate !== businessDate) continue;
  for (const match of group.subMatchList || []) {
    if (match.businessDate !== businessDate) continue;
    const crs = pool(match.crs); const ttg = pool(match.ttg);
    rows.push({ capturedAt, businessDate, matchNum: match.matchNumStr, matchId: String(match.matchId), kickoff: `${match.matchDate}T${match.matchTime}:00+08:00`, league: match.leagueAllName || match.leagueAbbName || "unavailable", home: match.homeTeamAllName || match.homeTeamAbbName || "unavailable", away: match.awayTeamAllName || match.awayTeamAbbName || "unavailable", score: "unavailable", handicap: pool(match.hhad), european: pool(match.had), goals: ttg, exactScores: Object.fromEntries(Object.entries(crs).filter(([k]) => k.startsWith("s") && k.length === 6)), source: url, status: match.matchStatus || "unavailable" });
  }
}
if (!rows.length) throw new Error(`official returned no matches for businessDate=${businessDate}`);
await fs.mkdir("data/raw", { recursive: true });
const path = `data/raw/official_snapshots_${date}.jsonl`;
await fs.appendFile(path, rows.map(row => JSON.stringify(row, null, 0)).join("\n") + "\n", "utf8");
console.log(JSON.stringify({ businessDate, capturedAt, officialMatches: rows.length, path }));

import fs from "node:fs/promises";

const date = process.argv[2] || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", "");
const dateIso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
const outPath = `data/raw/500_markets_${date}.json`;
const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36", referer: "https://trade.500.com/" };

function decode(buffer) { return new TextDecoder("gb18030").decode(buffer); }
async function get(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return decode(await res.arrayBuffer());
}
function attrs(s) {
  const out = {};
  for (const m of s.matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)')/g)) out[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2] ?? m[3] ?? "";
  return out;
}
function strip(s) {
  return s.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
function rowSegments(html) {
  const re = /<tr\b[^>]*xls=["']row["'][^>]*>/gi;
  const starts = [...html.matchAll(re)].map(m => m.index);
  return starts.map((start, i) => html.slice(start, starts[i + 1] ?? html.length));
}
function tableValues(block) {
  return [...block.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => strip(m[1])).filter(Boolean);
}
function parseRows(html, market, source) {
  return rowSegments(html).map(row => {
    const head = row.match(/^<tr\b([^>]*)>/i)?.[1] || "";
    const a = attrs(head);
    const company = row.match(/<td\b[^>]*class=["'][^"']*tb_plgs[^"']*["'][\s\S]{0,500}?title=["']([^"']*)/i)?.[1] || row.match(/<td\b[^>]*title=["']([^"']*)["'][^>]*class=["'][^"']*tb_plgs/i)?.[1] || "unavailable";
    const tables = [...row.matchAll(/<table\b[^>]*class=["']pl_table_data["'][^>]*>([\s\S]*?)<\/table>/gi)].map(m => tableValues(m[1]));
    return { company, market, capturedAt: a["data-time"] || a.dt || null, current: tables[0] || [], initial: tables[1] || [], source };
  }).filter(x => x.company !== "unavailable" || x.current.length);
}
function parseMatches(html) {
  const re = /<tr\b([^>]*class=["'][^"']*bet-tb-tr[^"']*["'][^>]*)>/gi;
  const starts = [...html.matchAll(re)].map(m => ({ index: m.index, head: m[1] }));
  return starts.map((x, i) => {
    const row = html.slice(x.index, starts[i + 1]?.index ?? html.length);
    const a = attrs(x.head);
    if (a.dataProcessdate && a.dataProcessdate !== dateIso) return null;
    if (!/^周(?:一|二|三|四|五|六|日)\d{3}$/.test(a.dataMatchnum || "")) return null;
    return { id: (a.dataMatchnum || "").slice(-3), matchNum: a.dataMatchnum, fixtureId: a.dataFixtureid, home: a.dataHomesxname, away: a.dataAwaysxname, kickoff: `${a.dataMatchdate}T${a.dataMatchtime}:00+08:00`, league: a.dataSimpleleague, pages: { yazhi: `https://odds.500.com/fenxi/yazhi-${a.dataFixtureid}.shtml`, ouzhi: `https://odds.500.com/fenxi/ouzhi-${a.dataFixtureid}.shtml`, daxiao: `https://odds.500.com/fenxi/daxiao-${a.dataFixtureid}.shtml`, bifen: `https://odds.500.com/fenxi/bifen-${a.dataFixtureid}.shtml` } };
  }).filter(Boolean).filter((x, i, arr) => arr.findIndex(y => y.id === x.id) === i).slice(0, 28);
}

const mainUrl = `https://trade.500.com/jczq/index.php?date=${dateIso}&g=2&playid=269`;
const main = await get(mainUrl);
const matches = parseMatches(main);
const result = { date: dateIso, generatedAt: new Date().toISOString(), source: mainUrl, matches: {} };
for (const match of matches) {
  const pages = {};
  for (const [market, url] of Object.entries(match.pages)) {
    try {
      const html = await get(url);
      pages[market] = { status: "checked", source: url, rows: parseRows(html, market, url) };
    } catch (error) {
      pages[market] = { status: "unavailable", source: url, error: String(error), rows: [] };
    }
  }
  result.matches[match.id] = { ...match, pages };
}
await fs.mkdir("data/raw", { recursive: true });
await fs.writeFile(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ date: dateIso, matchCount: matches.length, checked: Object.values(result.matches).filter(x => Object.values(x.pages).some(p => p.status === "checked")).length, outPath }));

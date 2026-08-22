# 足球雷达 · Market Timeline

这是 2026-08-22 足球盘口时间线看板：

- 主页面按联赛分组，并用颜色区分不同赛制/联赛。
- 支持按比赛编号、球队、联赛筛选。
- 每场比赛有独立详情页。
- 详情页按时间点展示让球水位、欧赔、进球数赔率和比分赔率，并标注首末变化方向。
- 详情页增加 500 彩票的逐公司亚盘、百家欧赔、大小球和比分盘口区块，现盘/初盘并列显示。
- 数据由 `scripts/build_data.mjs` 从足球雷达项目的结构化快照生成。

当前页面使用的是已采集的官方竞彩时间点快照；无法验证的外盘字段不会用猜测补齐。后续刷新数据后重新运行：

```powershell
node scripts/build_data.mjs "C:/Users/Administrator/Documents/ChatGPT/足球雷达" 20260822
```

刷新 500 全公司盘口后再生成页面：

```powershell
node scripts/collect_500.mjs 20260822
node scripts/build_data.mjs "C:/Users/Administrator/Documents/ChatGPT/足球雷达" 20260822
```

以上仅为公开信息整理后的娱乐分析，不构成任何购彩建议，请理性参考。

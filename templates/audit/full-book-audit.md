---
asset_type: audit-report
report_type: full-book-audit
generated_at: <ISO>
auditor_version: 0.1.0
total_chapters: 0
approved_chapters: 0
draft_chapters: 0
---

<!--
  全书复盘报告。对所有 approved 章节重跑 audit（不重 settle）后聚合统计。
  详见 skills/novel-quality-auditor/SKILL.md 第 7 节工作流 D。
  
  落点：audit/reports/full-book-audit.md
-->

# 全书复盘报告

## 项目概况

- **书名**：<书名>
- **总章节**：<N>
- **approved 章节**：<N>
- **draft 章节**：<N>
- **总字数**：<N>
- **当前卷**：第 <V> 卷《<卷名>》

## 评分总览

- **综合评分平均**：<0-100>
- **AIGC 检测平均**：<0-100>

### 评分分布

| 区间 | 章节数 | 占比 |
|------|-------|------|
| 90+ | <N> | <%> |
| 80-90 | <N> | <%> |
| 70-80 | <N> | <%> |
| 60-70 | <N> | <%> |
| < 60 | <N> | <%> |

### 评分异常章节

#### < 70 分（建议重做）

| 章节 | 评分 | 主要问题 | 推荐 |
|------|------|---------|------|
| 第 <X> 章 | <score> | <例：critical 反噬代价没具体写> | rework |

#### AIGC < 70 分

| 章节 | AIGC 分 | 主要 AI 痕迹 | 推荐 |
|------|---------|-------------|------|
| 第 <X> 章 | <score> | <例：「缓缓」x12 + 段落都偏长> | anti-detect |

## 钩子债务

<!--
  pending_hooks 中 last_advanced_chapter 距当前 > stale_warning_threshold 的列表。
-->

| hook_id | 标题 | 埋于 | 最近推进 | stale 章数 | 严重度 |
|---------|------|------|---------|-----------|-------|
| hook-<slug> | <标题> | 第 4 章 | 第 8 章 | 23 | warn |

## 支线停滞

<!--
  subplot_board 中 stale > threshold 的支线。
-->

| subplot_id | 名称 | 最近推进 | stale 章数 | tier |
|-----------|------|---------|-----------|------|
| subplot-C-<slug> | <名称> | 第 18 章 | 13 | third |

## 角色矩阵异常

<!--
  扫描 character_matrix 找"长期未互动"或"承诺关系未推进"。
-->

- <例：林烬-苏婉柔关系 50 章未推进，但 blueprint 第 5 节承诺第 33 章救场后情感线推进>

## 弧光偏离

<!--
  emotional_arcs 与 character.md 字段 7 弧光设计的对照。
-->

- <例：主角 50 章卷末应到"反击者"，但 emotional_arcs 仍停在"压抑/麻木">

## 建议优先级

<!--
  按 impact / effort 排序的修订建议。
-->

1. **<优先级 1>**：<例：修第 28 章（critical: 反噬代价没具体写）>
2. **<优先级 2>**：<例：拉回 hook-old-village-mystery（stale 23 章）>
3. **<优先级 3>**：<例：第 35-40 章安排 subplot-C 回归>
4. **<优先级 4>**：<例：闲时 polish 第 7、12、19、25 章>

## 整本书走向是否健康

<!--
  与 blueprint 第 5 节"前 30 章承诺"和第 10 节"长期意图"对照。
-->

- **承诺兑现度**：<X / Y 已兑现>
- **境界曲线偏离**：<例：实际比 powers.protagonist_curve 快 5 章，可控>
- **金手指 tier**：<例：当前 tier 1，预计 50 章末进入 tier 2，与 cheat-system 对齐>
- **总体健康度**：<良好 / 需调整 / 警告>

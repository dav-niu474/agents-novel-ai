---
asset_type: audit-report
report_type: chapter-audit
chapter_no: <N>
audited_at: <ISO>
auditor_version: 0.1.0
audit_score: 0
aigc_score: 0
chapter_status_recommendation: revise
_chapter_status_recommendation_options: [approved, revise]
---

<!--
  单章审稿报告。33 维度 + 11 条 AIGC 规则后产出。
  详见 skills/novel-quality-auditor/SKILL.md 第 5 节。
  
  落点：audit/reports/chapter-<NNNN>.audit.md
-->

# 第 <N> 章 审稿报告

## 总评

- **综合评分**：<0-100>
- **AIGC 检测分**：<0-100>
- **大纲遵从度**：<0-100%>
- **状态建议**：<approved / revise>

## 维度命中（33 维度）

| 类别 | 维度 | 评分 | 备注 |
|------|------|------|------|
| 连续性 | D1 角色位置 | ✓ / ✗ | <说明> |
| 连续性 | D2 角色携带物 | ✓ | |
| 连续性 | D3 角色境界 | ✓ | |
| 连续性 | D4 时间线 | ✓ | |
| 连续性 | D5 季节天气 | ✓ | |
| 连续性 | D6 角色记忆 | ✓ | |
| 连续性 | D7 角色受伤状态 | ✓ | |
| 连续性 | D8 资源钱财 | ✓ | |
| 连续性 | D9 物品状态 | ✓ | |
| 连续性 | D10 主线进度 | ✓ | |
| 设定一致 | D11 世界观规则 | ✓ | |
| 设定一致 | D12 力量等级规则 | ✓ | |
| 设定一致 | D13 金手指 tier 匹配 | ✓ | |
| 设定一致 | D14 金手指消耗记账 | ✓ | |
| 设定一致 | D15 金手指限制 | ✓ | |
| 设定一致 | D16 角色 OOC | ✓ | |
| 设定一致 | D17 信息边界 | ✓ | |
| 节奏爽点 | D18 首屏钩子 | ✓ | |
| 节奏爽点 | D19 爽点节拍 | ✓ | |
| 节奏爽点 | D20 hookOps 命中 | ✓ | |
| 节奏爽点 | D21 钩子债务 | ✓ | |
| 节奏爽点 | D22 主线推进 | ✓ | |
| 节奏爽点 | D23 支线节奏 | ✓ | |
| 节奏爽点 | D24 情绪曲线 | ✓ | |
| 文风 | D25 高频禁用词 | ✓ | |
| 文风 | D26 禁用句式 | ✓ | |
| 文风 | D27 必备元素 | ✓ | |
| 文风 | D28 对话占比 | ✓ | |
| 文风 | D29 段落句长节奏 | ✓ | |
| 大纲遵从 | D30 必出场角色 | ✓ | |
| 大纲遵从 | D31 必发生事件 | ✓ | |
| 大纲遵从 | D32 不写禁忌规避 | ✓ | |
| 大纲遵从 | D33 字数节奏 | ✓ | |

## Critical Issues（必修）

<!--
  严重度 critical：D1 / D3 / D6 / D11 / D13 / D15 / D17 / D32（条件）
  必须 0 才能 approved。
-->

（如果有，按下面格式列）

- **C1**（D<X>）：<问题描述>
  - 位置：<段落 / 行号>
  - 建议：<修订建议>
  - 推荐 revise 模式：<rewrite / rework>

## Major Issues（建议修）

<!--
  严重度 major：D2 / D4 / D7 / D8 / D12 / D14 / D16 / D18 / D19 / D20 / D26（条件）/ D30 / D31
  不强制修，但建议处理。
-->

- **M1**（D<X>）：<问题描述>
  - 位置：<段落 / 行号>
  - 建议：<修订建议>
  - 推荐 revise 模式：<spot-fix / polish>

## Minor Issues（可不修）

<!--
  其余 16 维度 minor。
-->

- **N1**（D<X>）：<问题描述>
  - 推荐：<polish>

## hookOps 命中

| 类型 | hook_id | 是否命中 | 位置 |
|------|---------|---------|------|
| mustOpen | hook-<slug> | ✓ | 第 X 段 |
| mustAdvance | hook-<slug> | ✓ | 第 Y 段 |
| mustClose | — | — | — |

## 反 AI 味命中（11 条 AIGC 规则）

| # | 规则 | 阈值 | 命中数 | 是否违反 |
|---|------|------|-------|---------|
| 1 | 高频禁用词总命中 | ≤ 5 | 0 | ✓ |
| 2 | "缓缓"+"竟然"+"忽然"频率 | ≤ 4 | 0 | ✓ |
| 3 | 4 字成语连用 | ≤ 1 | 0 | ✓ |
| 4 | 万能侦探腔（"他眉头一皱..."） | 0 | 0 | ✓ |
| 5 | "X 是一种难以言喻的感觉" | 0 | 0 | ✓ |
| 6 | 段落平均句数 | [2, 4] | 3 | ✓ |
| 7 | 单段最长字数 | ≤ 120 | 0 | ✓ |
| 8 | 单句最长字数 | ≤ 40 | 0 | ✓ |
| 9 | 对话占比（章纲允许范围） | — | 0% | ✓ |
| 10 | 连续 ≥ 5 段无对话 | 0 | 0 | ✓ |
| 11 | 形容词列举（≥3 连用） | 0 | 0 | ✓ |

## settle 阶段建议（如果 status approved）

<!--
  应用以下 delta 到 memory/*。详细 schema 见 docs/design/03-memory-and-vault.md 第 4 节。
-->

```json
{
  "chapter": 0,
  "deltas": {
    "current_state": [],
    "particle_ledger": [],
    "pending_hooks": [],
    "chapter_summaries": [],
    "subplot_board": [],
    "emotional_arcs": [],
    "character_matrix": []
  }
}
```

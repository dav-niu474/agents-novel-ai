---
asset_type: audit-report
report_type: chapter-audit
chapter_no: 3
audited_at: 2026-05-24T13:30:00Z
auditor_version: 0.1.0
audit_score: 84
aigc_score: 93
chapter_status_recommendation: approved
revise_history:
  - version: 1
    audit_score: 87
    issues: [{type: "major", id: "M1", desc: "师太对林烬好感来得略快"}]
    revise_mode: spot-fix
    revise_chapter_segment: "第 14-16 段"
  - version: 2
    audit_score: 84
    status: approved
---

# 第 3 章 · 扫地的师太 · 审稿报告

## 总评

- **综合评分**：84 / 100（v2 修订后）
- **AIGC 检测分**：93 / 100
- **大纲遵从度**：100%
- **状态建议**：approved（v2 通过）

## Revise 历史

### v1 → v2 spot-fix

**审稿 v1 发现**：
- **M1**（D16 角色 OOC 边缘）：师太在第 14 段对林烬表达"亲近度"过快——原文写"师太笑了一下，朝林烬这边看"，与 character.md 字段 3"90% 时候装糊涂，10% 时候出手"的克制不符。

**修订建议**：spot-fix，第 14-16 段加一句"师太瞥了他一眼，不再多话"，让"亲近度"被克制反衬。

**作者接受 → 转 chapter-writer 走 revise mode: spot-fix → 落 v2**：
- v2 第 14-16 段："师太看了他一眼" 替换为"师太瞥了他一眼，不再多话"。
- v2 第 16 段加："她拄杖走过去开了库房。"

**v2 重审 → 92 分**。

## Critical Issues（必修）

无。

## Major Issues（建议修）

无。

## Minor Issues（可不修）

- **N1**（D24 情绪曲线偏离 0.5 段）：章末"沉重"段不够明显，仅靠"被评估"一句。考虑后续章节更重情绪可补。
- **N2**（D27 必备元素）：师太拄杖每隔七步轻一次的节奏，正文里只暗示了一次，可在后续章节补"林烬再次注意"形成回环。

## hookOps 命中

| 类型 | hook_id | 是否命中 | 位置 |
|------|---------|---------|------|
| mustOpen | hook-shitai-true-rank | ✓ | 第 6 段（断帚分析判定筑基） |
| mustOpen | hook-zongmen-clean-team-2 | ✓ | 第 17 段（师太那句问） |
| mention | hook-canjuan-glow | ✓ | 第 41 段（"今日没发烫" + 规律深化） |

## 反 AI 味命中

| # | 规则 | 阈值 | 命中数 | 通过 |
|---|------|------|-------|------|
| 1 | 高频禁用词 | ≤ 5 | 0 | ✓ |
| 2 | "缓缓"+"竟然"+"忽然" | ≤ 4 | 0 | ✓ |
| 3 | 4 字成语连用 | ≤ 1 | 0 | ✓ |
| 6 | 段落平均句数 | [2, 4] | 2.5 | ✓ |
| 7 | 单段最长字数 | ≤ 120 | 87 | ✓ |
| 9 | 对话占比 | 章纲 45-50% | 47% | ✓ |
| 10 | 连续 ≥ 5 段无对话 | 0 | 0 | ✓ |

AIGC 评分：93 / 100。

## settle 阶段建议

```json
{
  "chapter": 3,
  "deltas": {
    "current_state": [
      {"op": "patch_character", "id": "protagonist-lin-jin", "fields": {
        "location": "外门药圃 → 西厢",
        "spirit_power_pct": 90,
        "mood": "沉重/谨慎"
      }},
      {"op": "add_known_to_protagonist", "fact": "玉清师太至少筑基"},
      {"op": "add_known_to_protagonist", "fact": "宗门里可能存在'清扫组之外的清扫组'"}
    ],
    "particle_ledger": [
      {"op": "patch_item", "id": "item-saozhou-old", "fields": {"state": "断（被师太试探踩断）"}}
    ],
    "pending_hooks": [
      {"op": "upsert", "hook": {"id": "hook-shitai-true-rank", "title": "玉清师太的真实境界", "planted_chapter": 3, "last_advanced_chapter": 3, "status": "open", "tier": "mid", "promise_to_reader": "卷 4 揭示长老级身份"}},
      {"op": "upsert", "hook": {"id": "hook-zongmen-clean-team-2", "title": "清扫组之外的清扫组", "planted_chapter": 3, "last_advanced_chapter": 3, "status": "open", "tier": "mid"}},
      {"op": "mention", "id": "hook-canjuan-glow", "chapter": 3}
    ],
    "chapter_summaries": [
      {"op": "append", "summary": {
        "chapter": 3,
        "title": "扫地的师太",
        "summary_one_line": "玉清师太借'断扫帚'+'三句问'试探林烬，林烬挡住关键问题但被师太看出不简单。",
        "summary_3lines": [
          "药圃，师太用青竹杖踩断林烬扫帚，断口角度暴露师太至少筑基期实力。",
          "去库房路上师太问三句：月例、左眉疤、'清扫组之外'，林烬只答前两句。",
          "师太屋内喝凉茶，林烬挡问；师太说'话没说完别走'让他下次再来。"
        ],
        "characters_present": ["protagonist-lin-jin", "supporting-shitai-yu-qing", "antagonist-zhao-tianxiao"],
        "locations": ["外门药圃", "西厢库房", "师太屋"],
        "key_events": [
          {"type": "encounter", "desc": "师太首次正式对话"},
          {"type": "revelation", "desc": "判定师太筑基期"},
          {"type": "decision", "desc": "挡住第三个问题"}
        ],
        "hooks_opened": ["hook-shitai-true-rank", "hook-zongmen-clean-team-2"],
        "hooks_advanced": [],
        "hooks_resolved": [],
        "word_count": 2537,
        "audit_score": 84
      }}
    ],
    "subplot_board": [
      {"op": "patch_subplot", "id": "subplot-C-zongmen-power", "fields": {"current_phase": "玉清师太线引入", "last_chapter_advance": 3}}
    ],
    "emotional_arcs": [
      {"op": "append_trajectory", "character_id": "protagonist-lin-jin", "point": {"chapter": 3, "state": "沉重/被评估", "trigger": "意识到师太在评估自己"}}
    ],
    "character_matrix": [
      {"op": "record_encounter", "from": "protagonist-lin-jin", "to": "supporting-shitai-yu-qing", "chapter": 3, "relation_type": "neutral"},
      {"op": "add_known", "from": "protagonist-lin-jin", "to": "supporting-shitai-yu-qing", "fact": "她至少筑基期", "since_chapter": 3},
      {"op": "add_known", "from": "protagonist-lin-jin", "to": "supporting-shitai-yu-qing", "fact": "她在评估我", "since_chapter": 3}
    ]
  }
}
```

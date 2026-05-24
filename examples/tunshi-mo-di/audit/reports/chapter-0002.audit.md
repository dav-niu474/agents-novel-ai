---
asset_type: audit-report
report_type: chapter-audit
chapter_no: 2
audited_at: 2026-05-24T11:50:00Z
auditor_version: 0.1.0
audit_score: 85
aigc_score: 92
chapter_status_recommendation: approved
---

# 第 2 章 · 杂草·百年缚地芸 · 审稿报告

## 总评

- **综合评分**：85 / 100
- **AIGC 检测分**：92 / 100
- **大纲遵从度**：100%
- **状态建议**：approved（无需 revise，2 个 minor 接受）

## Critical Issues（必修）

无。

## Major Issues（建议修）

无。

## Minor Issues（可不修）

- **N1**（D25 高频禁用词）："缓缓"出现 1 次（第 47 段"缓慢地把陶瓢放进井里"）—— 不是直接"缓缓"但语义接近，作者已自觉控制。
  - 限值 ≤ 2，未超。可接受。
- **N2**（D29 段落节奏）：第 38-40 段连续 5 句节奏，单段 1 段达到 5 句（章纲限 2-4 句）。
  - 推荐 polish（不阻塞 approved）。

## hookOps 命中

| 类型 | hook_id | 是否命中 | 位置 |
|------|---------|---------|------|
| mustAdvance | hook-canjuan-glow | ✓ | 第 50-52 段（确认规律：要伤口血） |
| mustAdvance | hook-su-wanrou-emotion | ✓ | 第 64-67 段（窗外脚印） |
| mention | hook-canjuan-origin | ✓ | 第 57 段（一句反思） |

## 反 AI 味命中（11 条 AIGC 规则）

| # | 规则 | 阈值 | 命中数 | 通过 |
|---|------|------|-------|------|
| 1 | 高频禁用词总命中 | ≤ 5 | 1 | ✓ |
| 2 | "缓缓"+"竟然"+"忽然"频率 | ≤ 4 | 1 | ✓ |
| 3 | 4 字成语连用 | ≤ 1 | 0 | ✓ |
| 4 | 万能侦探腔 | 0 | 0 | ✓ |
| 5 | "X 是一种难以言喻的感觉" | 0 | 0 | ✓ |
| 6 | 段落平均句数 | [2, 4] | 2.6 | ✓ |
| 7 | 单段最长字数 | ≤ 120 | 108 | ✓ |
| 8 | 单句最长字数 | ≤ 40 | 36 | ✓ |
| 9 | 对话占比 | 章纲 30-35% | 33% | ✓ |
| 10 | 连续 ≥ 5 段无对话 | 0 | 0 | ✓ |
| 11 | 形容词列举（≥3 连用） | 0 | 0 | ✓ |

AIGC 评分：92 / 100（N1 -3，N2 -5）。

## 关键发现

第 2 章是"承"段铺垫章节，质量稳定。最大亮点：
- **反 AI 味"金手指消耗记账"自动命中**：林烬主动解析第二株百年缚地芸（cost: 5），章末窗外脚印桥段 + 鞋底叶子折痕，是非常具体的"窗外苏婉柔来过"暗示，无需明说。
- 章末"折痕方向朝南——南边是赵天霄住的院子" 是错位伏笔（为第 3、4 章铺路）。

## settle 阶段建议

```json
{
  "chapter": 2,
  "deltas": {
    "current_state": [
      {"op": "patch_character", "id": "protagonist-lin-jin", "fields": {
        "location": "外门西厢值守屋（夜）",
        "spirit_power_pct": 90,
        "carrying": ["天工残卷(贴身)", "百年缚地芸×3(鞋底)"],
        "mood": "锋利/隐忍"
      }},
      {"op": "add_known_to_protagonist", "fact": "百年缚地芸可抑制束气咒"},
      {"op": "add_known_to_protagonist", "fact": "赵天霄常用束气咒"},
      {"op": "add_known_to_protagonist", "fact": "残卷需要伤口血才发烫"}
    ],
    "particle_ledger": [
      {"op": "add_item", "item": {"id": "item-fudibei-x3", "name": "百年缚地芸×3(鞋底)", "owner": "protagonist-lin-jin", "state": "鞋底藏匿", "first_appear_chapter": 2}},
      {"op": "add_cheat_consumption", "data": {"chapter": 2, "type": "active", "operation": "解析另一株百年缚地芸（缺陷层）", "spirit_power_cost": 5, "outcome": "成功"}}
    ],
    "pending_hooks": [
      {"op": "progress", "id": "hook-canjuan-glow", "chapter": 2},
      {"op": "progress", "id": "hook-su-wanrou-emotion", "chapter": 2},
      {"op": "mention", "id": "hook-canjuan-origin", "chapter": 2}
    ],
    "chapter_summaries": [
      {"op": "append", "summary": {
        "chapter": 2,
        "title": "杂草·百年缚地芸",
        "summary_one_line": "林烬药圃再次解析灵草，发现可抑制赵天霄束气咒；窗外苏婉柔来过。",
        "summary_3lines": [
          "早间药圃林烬再次解析'百年缚地芸'，得到'缺陷'层信息：与束气咒冲突。",
          "中午饭堂目睹小弟子被束气咒罚跪，林烬隐忍未动手；下午借机摘三根灵草藏鞋底。",
          "夜里发现窗外有人来过——鞋印形水印 + 缚地芸叶子上的指甲折痕，方向朝南（赵天霄院）。"
        ],
        "characters_present": ["protagonist-lin-jin", "supporting-su-wanrou", "antagonist-zhao-tianxiao"],
        "locations": ["药圃", "饭堂", "外门西厢值守屋"],
        "key_events": [
          {"type": "ability-first-use", "desc": "解析另一株缚地芸得'缺陷'"},
          {"type": "decision", "desc": "藏三根灵草做反杀工具"},
          {"type": "encounter", "desc": "苏婉柔窗外来过（间接证据）"}
        ],
        "hooks_opened": [],
        "hooks_advanced": ["hook-canjuan-glow", "hook-su-wanrou-emotion"],
        "hooks_resolved": [],
        "word_count": 2732,
        "audit_score": 85
      }}
    ],
    "subplot_board": [
      {"op": "patch_subplot", "id": "subplot-A-canjuan-origin", "fields": {"current_phase": "金手指实战价值显现", "last_chapter_advance": 2}}
    ],
    "emotional_arcs": [
      {"op": "append_trajectory", "character_id": "protagonist-lin-jin", "point": {"chapter": 2, "state": "锋利/隐忍", "trigger": "决定动手反杀"}}
    ],
    "character_matrix": []
  }
}
```

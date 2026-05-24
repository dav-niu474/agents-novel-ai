---
asset_type: memory
asset_id: subplot-board
last_settled_chapter: 0
generated: true
generated_at: <ISO>
maintained_by: novel-quality-auditor
---

<!--
  ⚠️ JSON 投影。永不手动编辑。
  
  tier 枚举：main / second / third
  status 枚举：active（活跃推进中）/ dormant（暂时搁置）/ resolved（已收）/ abandoned（弃线）
  
  stale_warning_threshold：main 30 章 / second 50 章 / third 50 章。
  超过会被 quality-auditor D23 标记。
-->

# 支线进度板（截至第 0 章）

## 主线（main）

### subplot-A-<slug> · <名称>
- **状态**：active
- **当前阶段**：<例：线索收集>
- **最近推进**：第 1 章（距今 0 章）
- **下个里程碑**：第 50 章

## 第二线（second）

### subplot-B-<slug> · <名称>
- **状态**：active
- **当前阶段**：<例：好感累积>
- **最近推进**：第 1 章（距今 0 章）

## 第三线 / 后台线（third）

### subplot-C-<slug> · <名称>
- **状态**：dormant
- **当前阶段**：<例：暂时搁置>
- **最近推进**：第 1 章（距今 0 章）

## ⚠️ 停滞警告

（暂无）

<!--
  当某条 main 支线 last_advanced 距今 > 30 章 / second / third > 50 章 时，
  这一节会自动列出，提示 outline-architect PLAN 时把它列入 mustAdvance。
-->

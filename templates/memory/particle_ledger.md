---
asset_type: memory
asset_id: particle-ledger
last_settled_chapter: 0
generated: true
generated_at: <ISO>
maintained_by: novel-quality-auditor
---

<!--
  ⚠️ JSON 投影。永不手动编辑。
-->

# 物品 / 资源账本（截至第 0 章）

## 物品

| ID | 名称 | 持有者 | 状态 | 首现 | 最后使用 | 使用次数 |
|----|------|-------|------|------|---------|---------|
| <item-id> | <名称> | <character-id> | <状态> | 1 | 0 | 0 |

## 货币

| ID | 持有者 | 数量 | 币种 |
|----|-------|------|------|
| spirit-stone | <character-id> | 0 | 下品灵石 |

## 消耗品

| ID | 名称 | 持有者 | 现存 | 最大见过 | 最后使用 |
|----|------|-------|------|---------|---------|
| <id> | <名称> | <character-id> | 0 | 0 | 0 |

## 金手指消耗记账

| 章节 | 操作 | 类型 | 精神力消耗 | 结果 | 副作用 |
|------|------|------|-----------|------|-------|
| 0 | <操作> | active | 0 | <结果> | — |

<!--
  ⚠️ chapter-writer 每写一次主角发动金手指，必须在此处 append 一条。
  ⚠️ quality-auditor D14 校验"金手指消耗记账"。
-->

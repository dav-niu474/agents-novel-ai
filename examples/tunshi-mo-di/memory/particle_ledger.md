---
asset_type: memory
asset_id: particle-ledger
last_settled_chapter: 5
generated: true
generated_at: 2026-05-24T16:30:00Z
maintained_by: novel-quality-auditor
---

<!-- ⚠️ JSON 投影。永不手动编辑。 -->

# 物品 / 资源账本（截至第 5 章末）

## 物品（10 件）

| ID | 名称 | 持有者 | 状态 | 首现 | 最后使用 | 使用次数 |
|----|------|-------|------|------|---------|---------|
| item-tiangong-canjuan | 天工残卷 | protagonist-lin-jin | 贴身藏匿 | 1 | 5 | 4 |
| item-yuepei-stolen | 月例(七两) | antagonist-zhao-tianxiao | 被抢走，未归还 | 1 | — | — |
| item-fudibei-x2 | 百年缚地芸×2(鞋底) | protagonist-lin-jin | 鞋底藏匿 | 2 | 5 | 1 |
| item-saozhou-old | 旧扫帚 | qingyun-outer-clean | 断（被师太试探踩断） | 1 | 3 | — |
| item-saozhou-new | 新扫帚（师太给的） | protagonist-lin-jin | 随身 | 3 | 5 | — |
| item-su-jincao | 苏婉柔的金创灵草 | protagonist-lin-jin | 随身 | 4 | — | — |
| item-chenyaoshui | 陈药水（实非陈药水） | protagonist-lin-jin | 桌上 | 4 | — | — |
| item-tongqian | 铜签 | protagonist-lin-jin | 桌上 | 4 | — | — |
| item-zizhitiezhen | 自制铁针 | protagonist-lin-jin | 刺中赵后取回，随身 | 5 | 5 | 1 |
| item-yuepei-paper | 穿越前的纸 | protagonist-lin-jin | 贴身（与残卷一起） | 1 | — | — |

## 货币

| ID | 持有者 | 数量 | 币种 |
|----|-------|------|------|
| spirit-stone | protagonist-lin-jin | 0 | 下品灵石（穷） |

## 金手指消耗记账（cheat_consumption · 4 条）

| 章节 | 操作 | 类型 | 精神力消耗 | 结果 | 副作用 |
|------|------|------|-----------|------|-------|
| 1 | 解析野生灵草·百年缚地芸（被动接触：伤口血触玉简） | passive | 5 | 成功（前两层：原理+缺陷） | — |
| 2 | 解析另一株百年缚地芸（缺陷层补充） | active | 5 | 成功（缺陷层信息已得） | — |
| 5 | 解析赤焰拳 | active | 15 | 成功（原理+缺陷=七寸在左手腕骨突） | 玉简持续发烫约 20 秒 |
| 5 | 二次解析赤焰拳（24h 冷却期） | passive | 0 | 返回"已记"（玉简缓存机制确认） | — |

> **金手指 tier 校验通过**：
> - 5 次操作全部在 Tier 1 范围（章节区间 1-30）内
> - 输出限于"原理 + 缺陷"两层（Tier 1 cap）
> - 24h 冷却机制在第 5 章被验证（同一目标重复解析返回"已记"）
> - cost_multiplier 一致（base x1）

## 总消耗

- 第 1 章末 spirit_power_pct = 95（-5）
- 第 2 章末 spirit_power_pct = 90（-5，恢复 +0）
- 第 3 章末 spirit_power_pct = 90（-0）
- 第 4 章末 spirit_power_pct = 90（-0）
- 第 5 章末 spirit_power_pct = 65（-15，反杀消耗 + 部分恢复）

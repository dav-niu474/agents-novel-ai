---
asset_type: outline-chapter
asset_id: chapter-0002
chapter_no: 2
volume_no: 1
target_words: 3500
created_at: 2026-05-04T17:00:00Z
updated_at: 2026-05-04T17:30:00Z
version: 1
status: approved
maintained_by: novel-outline-architect
---

# 第 2 章 · 杂草·百年缚地芸

## 1. 一句话目标

林烬第二天偷偷研究残卷，在药圃洒扫时再次解析"百年缚地芸"，发现这种灵草可以抑制师兄赵天霄常用的"束气咒"——金手指第一次显出实战价值。

## 2. 必出场角色

- protagonist-lin-jin（POV）
- supporting-su-wanrou（不出现，但在窗外短暂闪过身影，林烬注意到）

## 3. 必发生事件（按顺序）

1. 黎明林烬被钟声叫醒，残卷贴身没异样，他用拇指蹭了一下衣襟内侧
2. 早间洒扫任务在外门第三排药圃，林烬借机靠近灵草，第二次解析"百年缚地芸"得到"原理"已记忆，本次解析得到"缺陷：与束气类灵术冲突"——这正是赵天霄常用的咒
3. 林烬意识到：如果让赵天霄的束气咒接触到这种灵草，咒就会断
4. 林烬开始计划——但他没有立刻动手，先做准备：摘了三根灵草藏到鞋底
5. 中午饭桌上目睹一个外门小弟子被赵天霄"束气咒"绑住罚跪，林烬手指捏紧木筷，但忍住没动
6. 黄昏窗外苏婉柔身影闪过，林烬怔了一下，没说话；继续做计划
7. 章末林烬独坐西厢，用左手食指反复确认残卷藏处，下定决心"明天动手"

## 4. 钩子（hookOps）

- **mustOpen**：（无新钩子，本章是承接 + 铺垫）
- **mustAdvance**：
  - hook-canjuan-glow（玉简发烫之谜）—— 通过"再次解析时玉简发烫感比第一次轻"暗示有规律
  - hook-su-wanrou-emotion —— 苏窗外闪过，林烬意识到不是巧合
- **mustClose**：（无）
- **mention**：
  - hook-canjuan-origin（残卷来源）—— 林烬反思"这玩意到底是从哪来的"，一句话过

## 5. 爽点节拍

- **类型**：windfall（cheat-system.beats[1]）
- **强度**：low-mid
- **描述**：金手指第一次显出实战价值，"原来如此"的快感升级一层。但还没动手——给读者攒着第 5 章爆发。

## 6. 情绪曲线

平静（早起）→ 警觉（解析时发现规律）→ 隐忍（看到弱者被欺没动手）→ 怔（窗外苏婉柔）→ 锋利（决定动手）

## 7. 字数 / 节奏

- **总字数**：3500（±15%）
- **对话占比**：约 30-35%（饭桌场景对话多）
- **段落节奏**：手机阅读，2-4 句一段

## 8. 不写

- ❌ 让林烬第 2 章就动手反杀（必须忍到第 5 章）
- ❌ 出现"竟然 / 缓缓 / 仿佛"等高频禁用词 ≥ 2 次
- ❌ 让残卷三层信息一次给出（Tier 1 仍只前两层）
- ❌ 让林烬主动接近赵天霄（违反"先观察后行动"决策模式）
- ❌ 让苏婉柔出现的时间超过半句话（情线还在朦胧期）
- ❌ 让林烬同一目标连续解析（24h 冷却）—— 但这里"百年缚地芸"作为类，只是不同株，所以解析允许

## 9. 与状态的耦合

- **particle_ledger**：
  - add cheat_consumption (chapter:2, type:active, operation:解析另一株百年缚地芸, cost:5, outcome:成功，得到缺陷层)
  - add item 三根藏在鞋底的灵草（用途：未来反杀工具）
- **pending_hooks**：
  - progress hook-canjuan-glow
  - progress hook-su-wanrou-emotion
  - mention hook-canjuan-origin
- **character_matrix**：（无新 encounter）
- **emotional_arcs**：
  - append protagonist-lin-jin: (2, "锋利/隐忍", "决定动手反杀")
- **subplot_board**：
  - patch subplot-A-canjuan-origin: current_phase = "金手指实战价值显现"
- **current_state**：
  - patch protagonist-lin-jin: location = "外门西厢值守屋（夜）"
  - patch protagonist-lin-jin: spirit_power_pct = 90
  - patch protagonist-lin-jin: carrying = ["天工残卷(贴身)", "三根百年缚地芸(鞋底)"]
  - add_known_to_protagonist: "百年缚地芸可抑制束气咒"
  - add_known_to_protagonist: "赵天霄常用束气咒"

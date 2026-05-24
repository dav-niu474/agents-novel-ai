---
asset_type: outline-chapter
asset_id: chapter-<NNNN>
chapter_no: <N>
volume_no: <V>
target_words: 3500
created_at: <ISO>
updated_at: <ISO>
version: 1
status: drafting
maintained_by: novel-outline-architect
---

<!--
  章纲（用户口中的"章节细纲"）。chapter-writer 的唯一直接输入。
  ⚠️ 9 个字段必须全有，status: approved 前自检。
  详见 docs/design/01-asset-model.md 第 8.3 节、skills/novel-outline-architect/SKILL.md 第 3.3 节。
  
  落点：outline/chapters/chapter-<NNNN>.md（NNNN 为 4 位 0 填充）
-->

# 第 <N> 章 · <暂定标题>

## 1. 一句话目标

<!--
  本章要让读者得到的最大快感 / 信息 / 转折。
  例：林烬被欺凌后捡到玉简，识出第一行字。
-->

<填一句话目标>

## 2. 必出场角色

<!--
  ⚠️ POV 必标。一句话照面也要列。
  ⚠️ quality-auditor D30 校验：必出场角色 100% 出场。
-->

- <角色 ID>（POV）
- <角色 ID>
- <角色 ID>（一句话照面）

## 3. 必发生事件（按顺序）

<!--
  3-5 个事件，按时间顺序。每个事件 1 句话。
  ⚠️ 事件链必须能"闭环"：开场状态 → 中段冲突 → 结尾状态变化。
  ⚠️ quality-auditor D31 校验：100% 命中（顺序可允许微调）。
-->

1. <事件 1>
2. <事件 2>
3. <事件 3>
4. <事件 4>
5. <事件 5>

## 4. 钩子（hookOps）

<!--
  ⚠️ mustAdvance / mustClose 必须用 pending_hooks.json 真实存在的 hook_id。
  ⚠️ mustOpen 是本章新埋的伏笔。
  ⚠️ mention 是本章只提及不推进。
-->

- **mustOpen**：
  - <例：玉简发烫之谜（hook-jian-glow）>
  - <例：苏婉柔的微妙情绪（hook-su-emotion）>
- **mustAdvance**：
  - <hook-id>（理由：last_advanced 距今 N 章）
- **mustClose**：
  - <hook-id>
- **mention**：
  - <hook-id>

## 5. 爽点节拍

<!--
  类型枚举：first-use / windfall / comeback / cost-reveal / stage-up / backlash / transcend
  例：第一次解析成功的轻微"原来如此"快感（first-use，不要过度）。
-->

- **类型**：<first-use>
- **强度**：<low / mid / high>
- **描述**：<具体爽点描述>

## 6. 情绪曲线

<!--
  开场 → 中段 → 结尾。建议 3-4 个情绪点。
-->

<开场情绪> → <中段情绪> → <过渡情绪> → <结尾情绪>

例：压抑 → 麻木 → 微光 → 谨慎兴奋

## 7. 字数 / 节奏

- **总字数**：<target_words>（±15%）
- **对话占比**：<%>
- **段落节奏**：手机阅读，2-4 句一段

## 8. 不写

<!--
  ⚠️ 本章绝对不能出现的内容。chapter-writer 会读这一节作为硬墙。
  ⚠️ quality-auditor D32 校验：0 命中（违关键禁忌升 critical）。
-->

- ❌ <例：直接揭示残卷来源>
- ❌ <例：让主角在第 1 章就立 flag 说要"踏破苍穹">
- ❌ <例：写苏婉柔的内心戏（她只是一句话照面）>

## 9. 与状态的耦合（写完后该更新什么）

<!--
  quality-auditor settle 阶段会按这个清单更新 memory/*。
  ⚠️ 至少 1-2 个 memory 文件会被更新——如果都是空，本章是水章。
-->

- **particle_ledger**：
  - <例：玉简（贴身藏匿）>
  - <例：月例（被赵天霄抢走）>
  - <例：cheat_consumption +1 (chapter:N, type:passive, cost:5)>
- **pending_hooks**：
  - upsert hook-<slug>
  - progress hook-<slug>
  - mention hook-<slug>
- **character_matrix**：
  - record_encounter <from>-<to>
  - add_known <from>-<to>: <fact>
- **emotional_arcs**：
  - append_trajectory <character-id>: (chapter, state, trigger)
- **subplot_board**：
  - patch_subplot <subplot-id>: current_phase=<...>
- **current_state**：
  - patch_character <character-id>: location=<...> / spirit_power_pct=<...>

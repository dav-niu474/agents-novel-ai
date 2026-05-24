---
asset_type: outline-chapter
asset_id: chapter-0001
chapter_no: 1
volume_no: 1
target_words: 3500
created_at: 2026-05-04T16:00:00Z
updated_at: 2026-05-04T16:30:00Z
version: 1
status: approved
maintained_by: novel-outline-architect
---

# 第 1 章 · 残卷

## 1. 一句话目标

林烬在山涧捡到一块"会让脑袋发烫"的玉简，在被欺凌后独自识出"天工"二字，对身边野草发动第一次解析。

## 2. 必出场角色

- protagonist-lin-jin（POV）
- antagonist-zhao-tianxiao（欺凌方，戏份重）
- supporting-su-wanrou（一句话照面，不开口）

## 3. 必发生事件（按顺序）

1. 林烬被赵天霄当众罚跪在演武场青石上，月例（七两银子）被抢
2. 苏婉柔从西厢方向走过，朝林烬这边停顿了半秒，又走开
3. 黄昏林烬独自下山取水，山涧边捡到一块小指长的玉简
4. 玉简贴身藏起后头脑发烫，浮现"天工"二字
5. 夜里在西厢值守屋偷研，意外让玉简贴到流血的食指上，触发解析，得到"野生灵草·百年缚地芸"的判定（前两层信息：原理 + 缺陷）

## 4. 钩子（hookOps）

- **mustOpen**：
  - hook-canjuan-glow（玉简发烫之谜）
  - hook-su-wanrou-emotion（苏婉柔的微妙情绪）
- **mustAdvance**：（无，第 1 章没有可推进的）
- **mustClose**：（无）
- **mention**：（无）

## 5. 爽点节拍

- **类型**：first-use（cheat-system.beats[0]）
- **强度**：low（不要过度）
- **描述**：解析灵草成功的轻微"原来如此"快感。读者第一次知道金手指能干什么，但还没看到它能怎么"反杀"。

## 6. 情绪曲线

压抑（被欺凌、数砖块）→ 麻木（独自下山取水）→ 微光（玉简发烫）→ 谨慎兴奋（解析成功）

## 7. 字数 / 节奏

- **总字数**：3500（±15%：2975 - 4025）
- **对话占比**：约 20-25%（第 1 章独处为主，对白少正常）
- **段落节奏**：手机阅读，2-4 句一段，单段 ≤ 120 字

## 8. 不写

- ❌ 直接揭示残卷来源 / 真正主人
- ❌ 让主角立 flag 说要"踏破苍穹 / 吞天 / 复仇"等大词
- ❌ 写苏婉柔的内心戏（她只是一句话照面，不能给视角）
- ❌ 出现高频禁用词 ≥ 2 次（缓缓 / 竟然 / 仿佛 / 那是一种 / 在他看来 等）
- ❌ 让赵天霄展现金丹以上水平（他炼气三层）
- ❌ 让残卷一次解析出三层信息（Tier 1 只前两层）
- ❌ 让林烬的境界突破（第 1 章末仍是炼气一层）

## 9. 与状态的耦合（写完后该更新什么）

- **particle_ledger**：
  - add item 天工残卷（贴身藏匿）
  - patch item 月例（被赵天霄抢走，未归还）
  - add cheat_consumption (chapter:1, type:passive, operation:解析灵草, cost:5, outcome:成功)
- **pending_hooks**：
  - upsert hook-canjuan-glow（玉简发烫之谜，long-tier，promise: 卷 5）
  - upsert hook-su-wanrou-emotion（苏婉柔的微妙情绪，mid-tier，promise: 卷 2）
  - upsert hook-canjuan-origin（残卷的真正主人，long-tier）
- **character_matrix**：
  - record_encounter protagonist-lin-jin → antagonist-zhao-tianxiao（relation_type: enemy）
  - record_encounter protagonist-lin-jin → supporting-su-wanrou（relation_type: neutral，仅 visual）
  - add_known protagonist-lin-jin → antagonist-zhao-tianxiao: "对方欺凌自己，抢走月例"
- **emotional_arcs**：
  - append_trajectory protagonist-lin-jin: (1, "压抑/麻木", "被欺凌")
  - append_trajectory protagonist-lin-jin: (1, "微光/谨慎兴奋", "解析灵草成功")
- **subplot_board**：
  - patch subplot-A-canjuan-origin: current_phase = "玉简启动"
- **current_state**：
  - patch protagonist-lin-jin: location = "外门西厢值守屋（夜）"
  - patch protagonist-lin-jin: stage = "炼气一层"
  - patch protagonist-lin-jin: spirit_power_pct = 95（解析消耗 5）
  - patch protagonist-lin-jin: carrying = ["天工残卷(贴身)"]
  - patch protagonist-lin-jin: mood = "谨慎兴奋"
  - add_known_to_protagonist: "残卷可解析"
  - add_known_to_protagonist: "解析需亲自接触"

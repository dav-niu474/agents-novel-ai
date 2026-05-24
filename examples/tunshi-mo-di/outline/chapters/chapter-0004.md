---
asset_type: outline-chapter
asset_id: chapter-0004
chapter_no: 4
volume_no: 1
target_words: 3500
created_at: 2026-05-04T18:00:00Z
updated_at: 2026-05-04T18:30:00Z
version: 1
status: approved
maintained_by: novel-outline-architect
---

# 第 4 章 · 赵天霄的耳朵

## 1. 一句话目标

赵天霄发现林烬最近"不一样"，私下找他试探，言语中提到一个名字"张师叔"（张三长老）；林烬第一次正面与赵天霄对话，藏住情绪，不动声色钓出更多线索。同章末苏婉柔药圃外第一次对林烬开口（仅两句话）。

## 2. 必出场角色

- protagonist-lin-jin（POV）
- antagonist-zhao-tianxiao（戏份重，私下对话）
- supporting-su-wanrou（章末第一次对话；两句话）
- antagonist-elder-zhang（仅在赵天霄口中"被提及"，不出场）

## 3. 必发生事件（按顺序）

1. 上午师太交代林烬去取一坛"陈药水"，林烬路过演武场后侧
2. 赵天霄在那里"碰巧"等他；先嘲讽两句"听说你最近不太一样"
3. 林烬用了停顿半秒的习惯，回了一句"师兄说哪不一样？"
4. 赵天霄借机绕了三句话，提到"张师叔"对外门弟子有个"考察"，意指林烬有机会
5. 林烬抓住机会反问"哪位张师叔"，赵下意识答"清扫组的张三长老"——把上下级关系暴露了一半
6. 赵反应过来，咂嘴改话，林烬假装没在意
7. 走开后林烬把这段对话默背了一遍，确认"张三 + 清扫组 + 考察"是钩子
8. 章末林烬路过药圃外，苏婉柔从篱笆内递出一根晒干的灵草，只说"擦伤口用"和"走了"，前后两句话
9. 林烬接过灵草，低头看了眼她递草时的左袖（下意识捏了一下）

## 4. 钩子（hookOps）

- **mustOpen**：
  - hook-zhang-elder-mention（张三长老首次"被提及"——名字 + 清扫组 + 对外门考察）
  - hook-zhao-tianxiao-conspiracy（赵天霄背后是张三长老，雏形）
- **mustAdvance**：
  - hook-canjuan-glow（mention：今日触碰残卷无发烫，规律已确认 = 与"主动用"有关）
  - hook-su-wanrou-emotion（progress：苏婉柔第一次主动开口）
  - hook-shitai-true-rank（mention：林烬意识到师太是"特意"派他出来路过演武场）
- **mustClose**：（无）

## 5. 爽点节拍

- **类型**：智斗（type 在 cheat-system 里没有这个枚举，本章不是 cheat 节拍，但是大纲层面的"对话钓线索"）
- **强度**：mid
- **描述**：林烬第一次正面与反派对话，靠"反问"钓出关键名字；读者跟着主角一起识破。

## 6. 情绪曲线

警觉（被叫住）→ 冷静（开始套话）→ 锋利（识破赵的口误）→ 暗喜（钓到名字）→ 怔（苏婉柔递草）

## 7. 字数 / 节奏

- **总字数**：3500（±15%）
- **对话占比**：约 40-45%（赵天霄对话 + 苏婉柔末尾两句）
- **段落节奏**：手机阅读，2-4 句一段
- **特别要求**：赵天霄"舔唇"必现一次（标志性细节 #1）；林烬"停顿半秒"必现一次

## 8. 不写

- ❌ 让张三长老正式出场（他第 15 章才首次正式出场）
- ❌ 让赵天霄说出"玄霄宗"或"内应"（这要等到第 22 章）
- ❌ 让林烬主动找赵天霄报复（违反"先观察后行动"）—— 是赵天霄主动找他
- ❌ 让苏婉柔说超过两句话（情线还在朦胧期）
- ❌ 让林烬告诉赵任何关于残卷的事
- ❌ 让残卷在对话中"发烫提示"（残卷不是 GPS）
- ❌ 出现"竟然 / 缓缓 / 仿佛"等高频禁用词 ≥ 2 次

## 9. 与状态的耦合

- **particle_ledger**：
  - add item 苏婉柔给的晒干灵草（金创类，状态：随身）
  - add cheat_consumption: 无（本章主角没主动用残卷）
- **pending_hooks**：
  - upsert hook-zhang-elder-mention（中期，promise: 第 15 章首次正式出场）
  - upsert hook-zhao-tianxiao-conspiracy（短期，promise: 第 22 章揭露）
  - progress hook-su-wanrou-emotion（"第一次主动开口"）
  - mention hook-canjuan-glow
  - mention hook-shitai-true-rank
- **character_matrix**：
  - record_encounter protagonist-lin-jin → antagonist-zhao-tianxiao（encounter_count + 1）
  - add_known protagonist-lin-jin → antagonist-zhao-tianxiao: "他与张三长老有上下级关系"
  - add_known protagonist-lin-jin → antagonist-zhao-tianxiao: "他试探我'最近不一样'"
  - record_encounter protagonist-lin-jin → supporting-su-wanrou（first conversation；relation: neutral → fond-of 1）
  - add_known protagonist-lin-jin → supporting-su-wanrou: "她送我灵草"
- **emotional_arcs**：
  - append protagonist-lin-jin: (4, "锋利", "钓出张三长老名字")
  - append protagonist-lin-jin: (4, "怔/温暖", "苏婉柔递草")
- **subplot_board**：
  - patch subplot-A-canjuan-origin: 无新进展
  - patch subplot-B-su-wanrou: current_phase = "第一次主动接触"
  - patch subplot-C-zongmen-power: current_phase = "张三长老线引入"
- **current_state**：
  - patch protagonist-lin-jin: location = "外门西厢"
  - patch protagonist-lin-jin: spirit_power_pct = 90（本章无消耗）
  - patch protagonist-lin-jin: carrying = ["天工残卷(贴身)", "三根百年缚地芸(鞋底)", "苏婉柔的金创灵草"]
  - patch protagonist-lin-jin: mood = "锋利/复杂"
  - add_known_to_protagonist: "张三长老掌'清扫组'，对外门弟子有'考察'"
  - add_known_to_protagonist: "赵天霄是张三长老的下属/小弟"

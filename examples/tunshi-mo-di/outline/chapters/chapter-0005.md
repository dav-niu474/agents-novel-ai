---
asset_type: outline-chapter
asset_id: chapter-0005
chapter_no: 5
volume_no: 1
target_words: 3500
created_at: 2026-05-04T18:30:00Z
updated_at: 2026-05-04T19:00:00Z
version: 1
status: approved
maintained_by: novel-outline-architect
---

# 第 5 章 · 七寸断（卷 1 第一爽点章）

## 1. 一句话目标

林烬主动设局，让赵天霄在演武场发起"教训"，林烬假装挨打趁机让束气咒接触到鞋底的"百年缚地芸"，咒断后用一根藏好的铁针刺穿赵天霄"赤焰拳"七寸（左手腕筋脉）—— 当众反杀师兄，第一次让宗门外门震动。

## 2. 必出场角色

- protagonist-lin-jin（POV）
- antagonist-zhao-tianxiao（被反杀方，戏份核心）
- supporting-su-wanrou（远景，演武场外，目睹）
- 几个外门弟子（路人，没台词）
- supporting-shitai-yu-qing（章末远处现身，意味深长）

## 3. 必发生事件（按顺序）

1. 林烬主动对赵天霄说一句"师兄要的陈药水我撒了"——主动找撕
2. 赵天霄被激，演武场当众"教训"
3. 赵天霄施展"束气咒"准备绑住林烬
4. 林烬故意往鞋底一蹭，束气咒接触到百年缚地芸 → 咒断（cheat-system 第 2 章解析得到的"缺陷"应用）
5. 赵天霄一愣，本能切换到"赤焰拳"
6. 林烬启动残卷，主动解析赤焰拳（消耗精神力 15，但本章是 active 第一次）
7. 残卷给出"原理 + 缺陷"两层——七寸在左手腕（这是 cheat-system Tier 1 输出）
8. 林烬接拳前一刻已经想好走位——侧身让过，从袖里抽出昨夜削好的铁针
9. 一击刺穿赵天霄左手腕筋脉（七寸断）
10. 赵天霄当场吐血倒下，赤焰拳威力散去
11. 在场所有外门弟子愣住——一个炼气一层的洒扫弟子刚刚反杀了三层的二师兄
12. 苏婉柔在演武场外边围观线那侧，第一次主动看了林烬一眼并没有走开
13. 远处玉清师太路过，看了一眼演武场，没说话，继续走
14. 章末林烬扶着木栏喘气，残卷在胸口烫了一下（精神力消耗的反馈），他低声说了三个字"七寸断"

## 4. 钩子（hookOps）

- **mustOpen**：（无新钩子，本章是首战兑现）
- **mustAdvance**：
  - hook-canjuan-glow（残卷在主动消耗精神力时会发烫，规律完成确认）
  - hook-su-wanrou-emotion（progress：苏婉柔第一次主动看林烬不走）
  - hook-shitai-true-rank（mention：师太路过看一眼，意味深长）
  - hook-zhao-tianxiao-conspiracy（progress：赵被反杀公开化，张三必须有反应）
- **mustClose**：
  - hook-zhao-tianxiao-bullying（"被赵天霄欺凌"短期 hook 闭合 —— 第 1 章埋的"小怪"被反杀）

## 5. 爽点节拍

- **类型**：comeback（cheat-system.beats[2]）
- **强度**：high（卷 1 第一个真正爆点）
- **描述**：blueprint 第 5 节"第 5 章前承诺"兑现。读者第一次看到金手指的实战力——但靠的是"分析 + 设局"，不是"碾压"。这是解析流爽点的核心：**赢得不靠等级，靠看穿**。

## 6. 情绪曲线

冷静（设局）→ 锋利（开打）→ 短暂的"原来如此"快感（解析后立即出招）→ 决绝（一击命中）→ 倦/锋（章末）

## 7. 字数 / 节奏

- **总字数**：3500（±15%）
- **对话占比**：约 25-30%（动作章对话偏少）
- **段落节奏**：手机阅读，2-4 句一段；动作场面用 1-2 字短句
- **特别要求**：
  - 残卷"原理 + 缺陷"两层文字必须明确浮现（让读者跟着看）
  - 一击命中那段必须短句快剪
  - 章末"七寸断"三字独占一段

## 8. 不写

- ❌ 让林烬一击秒杀（赵天霄重伤倒下，但不死，他要审查后第 8 章再上线）
- ❌ 让残卷给出"优化方向"第三层（Tier 1 只有前两层）
- ❌ 让林烬境界突破（他还是炼气一层接近二层）
- ❌ 让赵天霄使出超越炼气三层的能力（违反 powers）
- ❌ 让苏婉柔在演武场内出现 / 说话（远景目睹即可）
- ❌ 让师太上前阻止 / 解释（师太只是路过）
- ❌ 出现"竟然 / 缓缓 / 仿佛 / 一时之间"等高频禁用词 ≥ 2 次
- ❌ 让残卷凭空给出赵天霄"七寸"信息（必须 main 走"接触 + 解析"流程）
- ❌ 让林烬当众说"是残卷告诉我的"（永远不许）

## 9. 与状态的耦合

- **particle_ledger**：
  - add item 自制铁针（用途：第 5 章反杀工具，状态：刺中赵天霄后留在伤口附近，林烬章末取回）
  - patch item 月例（在"赵天霄被反杀"后归还了一部分给林烬，但不是全部 —— 留小遗憾）
  - patch item 三根百年缚地芸：消耗 1 根（鞋底接触束气咒断）
  - add cheat_consumption (chapter:5, type:active, operation:解析赤焰拳, cost:15, outcome:成功，得到原理+缺陷=七寸在左手腕)
- **pending_hooks**：
  - resolve hook-zhao-tianxiao-bullying（短期，第 1 章埋第 5 章兑现，移到 resolved）
  - progress hook-canjuan-glow
  - progress hook-su-wanrou-emotion
  - progress hook-zhao-tianxiao-conspiracy
  - mention hook-shitai-true-rank
  - upsert hook-canjuan-active-burn（残卷在主动消耗精神力时发烫，short-tier，promise: 第 8 章揭示规律确认）
- **character_matrix**：
  - record_encounter protagonist-lin-jin → antagonist-zhao-tianxiao（encounter_count + 1，relation: enemy 强度 +1）
  - add_known protagonist-lin-jin → antagonist-zhao-tianxiao: "赤焰拳七寸在左手腕"
  - add_known antagonist-zhao-tianxiao → protagonist-lin-jin: "他能反杀我，可能有外物"
  - record_encounter protagonist-lin-jin → supporting-su-wanrou（visual + 主动注视；strength 1 → 2）
- **emotional_arcs**：
  - append protagonist-lin-jin: (5, "决绝/锋", "一击命中赵天霄")
  - append protagonist-lin-jin: (5, "倦/锋", "章末喘气")
  - append antagonist-zhao-tianxiao: (5, "震惊/恐惧", "被反杀") *新增反派轨迹*
- **subplot_board**：
  - patch subplot-A-canjuan-origin: current_phase = "金手指主动战斗显威"，last_chapter_advance = 5
  - patch subplot-B-su-wanrou: current_phase = "第一次主动注视"
  - patch subplot-C-zongmen-power: current_phase = "外门震动，张三长老必有反应"
- **current_state**：
  - patch protagonist-lin-jin: location = "演武场 → 外门西厢"
  - patch protagonist-lin-jin: stage = "炼气一层（接近二层）"
  - patch protagonist-lin-jin: spirit_power_pct = 65（本章 active 解析消耗 15，加上恢复一部分）
  - patch protagonist-lin-jin: mood = "倦/锋"
  - patch antagonist-zhao-tianxiao: location = "演武场 → 外门医庐"
  - patch antagonist-zhao-tianxiao: status = "重伤，左手腕筋脉断"
  - add_known_to_protagonist: "残卷在主动消耗精神力时会发烫"
  - add_known_to_protagonist: "我能在炼气一层下反杀炼气三层（如果会用残卷）"

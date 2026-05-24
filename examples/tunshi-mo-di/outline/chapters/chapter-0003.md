---
asset_type: outline-chapter
asset_id: chapter-0003
chapter_no: 3
volume_no: 1
target_words: 3500
created_at: 2026-05-04T17:30:00Z
updated_at: 2026-05-04T18:00:00Z
version: 2
status: approved
maintained_by: novel-outline-architect
---

# 第 3 章 · 扫地的师太

## 1. 一句话目标

第二日上午药圃工时，玉清师太首次正式与林烬对话；师太借"扫地"的工夫试探林烬，林烬在试探中第一次正面与她交手言语，对话间师太察觉这"小子"不像表面那么木。

## 2. 必出场角色

- protagonist-lin-jin（POV）
- supporting-shitai-yu-qing（首次正式出场，对话戏份重）
- antagonist-zhao-tianxiao（远景，远处骂人，不直接出现）

## 3. 必发生事件（按顺序）

1. 早晨药圃，林烬故意慢半拍干活，等师太巡查到自己
2. 师太走过时"无意"踩了林烬扫帚，让其手中扫帚断成两截（试探）
3. 林烬反应：右手食指薄茧蹭了下断帚口，记下断口角度（不是普通踩断的力度）—— 心里推断师太境界至少筑基（远超表面）
4. 师太顺势让林烬陪她"换帚"，路上师太看似闲谈，问了三句关键的话：「外门弟子能领月例几两」「你左眉的疤多久了」「你信不信宗门里有'清扫组'之外的清扫组」
5. 林烬只回前两句（说三 + 没说），第三句沉默
6. 师太敲了下杯沿，喝了口冷茶，说"小子，话没说完别走"，但说完她自己倒走了
7. 远处赵天霄骂人的声音传过来，林烬没去看
8. 章末，林烬意识到：他刚才差点被引出来，师太既不是敌也不是友，是"等他长大才决定怎么处理"的人

## 4. 钩子（hookOps）

- **mustOpen**：
  - hook-shitai-true-rank（玉清师太的真实境界）—— 林烬怀疑她不止筑基初期
  - hook-zongmen-clean-team-2（"清扫组之外的清扫组"是什么）
- **mustAdvance**：
  - hook-canjuan-glow（mention，林烬触摸残卷时发现今日没发烫——规律深化）
- **mustClose**：（无）

## 5. 爽点节拍

- **类型**：— （本章是设定 + 关系铺垫，不是爽点章节，但给智斗节奏）
- **强度**：low
- **描述**：林烬"看穿"师太境界的小快感；但反过来师太也"看穿"了他不简单。互看的张力。

## 6. 情绪曲线

警觉（一上来就被试探）→ 紧张（师太境界判断）→ 谨慎（对话挡问）→ 沉重（意识到自己在被"评估"）

## 7. 字数 / 节奏

- **总字数**：3500（±15%）
- **对话占比**：约 45-50%（师太对话戏重）
- **段落节奏**：手机阅读，2-4 句一段
- **特别要求**：师太说话不能超过三句一停（标志性细节 #2）

## 8. 不写

- ❌ 让师太直接展示出筑基后期实力（她隐藏，只让林烬"推测"）
- ❌ 让师太在第 3 章揭示赎罪 / 60 年宿仇的过去（这是卷 4 的事）
- ❌ 让赵天霄出现在前景（远景骂人即可）
- ❌ 让林烬告诉师太自己是穿越者（永远不许）
- ❌ 让师太对林烬展现明显偏护（10% 出手要克制）
- ❌ 出现"竟然 / 缓缓 / 那是一种"等高频禁用词 ≥ 2 次

## 9. 与状态的耦合

- **particle_ledger**：
  - patch item 扫帚（损坏，被师太"试探"踩断）
- **pending_hooks**：
  - upsert hook-shitai-true-rank（玉清师太的真实境界，mid-tier）
  - upsert hook-zongmen-clean-team-2（"清扫组之外"，mid-tier）
  - mention hook-canjuan-glow（"今日没发烫"加一条规律线索）
- **character_matrix**：
  - record_encounter protagonist-lin-jin → supporting-shitai-yu-qing（relation_type: neutral，但 strength 1）
  - add_known protagonist-lin-jin → supporting-shitai-yu-qing: "她至少筑基期"
  - add_known protagonist-lin-jin → supporting-shitai-yu-qing: "她在评估我"
  - add to info_unknown protagonist-lin-jin → supporting-shitai-yu-qing: "她的过去 / 真实身份 / 与张三长老关系"
- **emotional_arcs**：
  - append protagonist-lin-jin: (3, "沉重/被评估", "意识到师太在评估自己")
- **subplot_board**：
  - patch subplot-C-zongmen-power: current_phase = "玉清师太线引入"，last_chapter_advance = 3
- **current_state**：
  - patch protagonist-lin-jin: location = "外门药圃 → 西厢"
  - patch protagonist-lin-jin: spirit_power_pct = 90
  - patch protagonist-lin-jin: mood = "沉重/谨慎"
  - add_known_to_protagonist: "玉清师太至少筑基"
  - add_known_to_protagonist: "宗门里可能存在另一条线（清扫组之外的清扫组）"

---
asset_type: progress-decisions
asset_id: decisions
created_at: 2026-05-01T00:00:00Z
updated_at: 2026-05-24T18:00:00Z
maintained_by: novel-studio + 用户
---

# 决策日志

## 2026-05-01 18:00 · 蓝图定盘 v4

**决策**：blueprint v1 → v4 通过 10 步定盘 4 轮迭代后 approved

**原因**：每一步与作者协商，不让 AI 单方面替决定。第 4 节金手指六要素 + 第 5 节前 30 章承诺 + 第 10 节长期意图三处反复打磨

**影响范围**：
- blueprint.md 整体（10 字段全填）
- 整本书的最高契约，下游所有 skill 不得违反

**反向决定的可能性**：低 - 蓝图定盘后只在重大节奏 / 题材调整时才回炉

---

## 2026-05-02 18:00 · 金手指 Tier 4 代价：精神力 → 记忆

**决策**：cheat-system Tier 4 的代价从"精神力"改为"记忆"（每次主动改写功法损失一段记忆）

**原因**：呼应 blueprint 第 10 节"残卷会任务完成消失，主角靠自己自立"长期伏笔（卷 12）。让 Tier 4 解锁的代价跟"残卷消失"在同一条主题线上 —— 主角越用 Tier 4，越靠近"残卷彻底消失，自己什么都记不得"的孤独终点

**影响范围**：
- world/cheat-system.json `stages[3]` + `alt_cost: "memory"`
- world/cheat-system.json `beats[9]` (chapter:720, type:transcend, "Tier 4 + 进入'记忆代价'模式，残卷开始倒计时消失")
- 第 720+ 章关键节拍
- 不影响前 100 章

**反向决定的可能性**：低 - 这条线在 blueprint 第 10 节明示

---

## 2026-05-03 18:00 · 角色阵容收紧到 5 人

**决策**：第一次只捏 5 个核心角色（主角 + 早反 + 中反 + 核心配角 × 2），其他按需补

**原因**：
1. character-atelier R6 "先少后多" —— 一开书堆 20 个 NPC 读者认知崩溃
2. 前 5 章规划只需要这 5 个就足够撑节奏
3. 张三长老（中反）虽然第 15 章才正式出场，但第 4 章必须"被提及"，所以也建卡

**影响范围**：
- characters/_index.json 5 个 entry
- characters/relationships.md 8 对关系
- 前 30 章不引入新主线角色

**反向决定的可能性**：高 —— 后续按章纲需要可补 minor 角色

---

## 2026-05-04 15:00 · 卷 1 反噬章从第 25 章提前到第 23 章

**决策**：卷 1 卷纲 v1 → v2，cheat-system 反噬节拍从原计划第 25 章提前到第 23 章

**原因**：
1. 第 22 章是 hook-zhao-tianxiao-conspiracy 兑现章（赵天霄身份暴露），节拍密集
2. 反噬章紧贴身份暴露后，主角"刚胜利又昏迷"的反差感更强
3. 第 23 章昏迷 + 第 24 章康复 + 第 25 章已经是"调查阴谋"段，节奏更紧

**影响范围**：
- outline/volumes/volume-01.md 卷纲 v2
- world/cheat-system.json beats 表（待第 23 章实际写时同步）
- pending_hooks 中 backlash 节拍预期更新

**反向决定的可能性**：中 - 实际写到第 22-23 章时如果发现节奏不对可回调

---

## 2026-05-24 14:20 · 第 3 章 spot-fix v1 → v2

**决策**：第 3 章《扫地的师太》v1 87 → v2 84 走 spot-fix 模式修订

**原因**：
- v1 第 14 段："师太笑了一下，朝林烬这边看" → 与 character.md supporting-shitai-yu-qing 字段 3 性格内核"90% 装糊涂，10% 出手要止于分寸"冲突
- 师太对林烬的"亲近度"在第 3 章首次正式接触就显得过快，破坏了 character 卡里的"克制感"

**修法**：spot-fix 第 14-16 段，把"师太笑了一下"替换为"师太瞥了他一眼，不再多话"，再加"她拄杖走过去开了库房"

**影响范围**：
- chapters/chapter-0003.md v1 → v2（旧版本归档到 .snapshots/，但本实战未做归档）
- 不影响其他章

**反向决定的可能性**：低 - 修后更符合人物设定

**备注**：评分 v2 84 < v1 87 是因为字数偏短（2537）触发 D33 length_critical 扣分。OOC 边缘修复本身是好事

---

## 2026-05-24 18:00 · v1.3 字数控制根因复盘 → SKILL.md 修订

**决策**：基于 5 章实战暴露的 5 个问题，启动 v1.3 修复（不写本书，写 SKILL.md）

**原因**：5 章字数全部 length_warning，2 章 length_critical，根因是 chapter-writer 没有"事件链字数 pre-check"，章纲第 3 字段事件 ×500 字贴近软范围下沿

**影响范围**：5 个 SKILL.md（chapter-writer / outline-architect / quality-auditor / asset-vault / 资产 schema）+ 新增 progress 子系统 + 本实战项目回填 progress/

**反向决定的可能性**：无 - v1.3 已落地（feat/v1.3-fixes-and-progress 分支）

**备注**：第 6 章起按 v1.3 新规则跑（章纲事件 ≥ 6，按 chapter_type 分配 per_event_words），预期字数恢复正常

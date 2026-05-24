# 《吞天魔帝》前 5 章实战执行日志

> 这是 Novel Studio v1 的端到端实战，验证整条流水线在真实数据上跑通。
> **目的**：把 9 个 skill + 9 类资产 + 8 个真相文件 + 4 类素材 + 33 维度审稿，**全部用一本真实可读的网文** 串起来。
>
> ⚠️ 这是真实跑出来的实战，**含暴露的问题**。Phase 0-7 全部走通，但字数控制问题在第 1 次实战暴露——5 章实际 13078 字（target 17500），均章 2616 字（target 3500）。这是 v1 设计的真实学习反馈，已记入"v1.3 优化方向"。

---

## 实战目标 vs 实际结果

| 指标 | 目标 | 实际 | 达成 |
|------|------|------|------|
| 章节数 | 5 | 5 | ✅ |
| 总字数 | ~17500 | 13078 | ⚠️ 74.7% |
| 均章字数 | 3500 | 2616 | ⚠️ 软范围外 |
| 9 字段章纲全填 | 5 / 5 | 5 / 5 | ✅ |
| 33 维度审稿 | 5 / 5 | 5 / 5 | ✅ |
| 8 类真相文件演进 | 7 类 + vault | 7 类 + vault | ✅ |
| 9 大约束 C1-C9 不破 | 全过 | 全过 | ✅ |
| 反 AI 味通过 | AIGC ≥ 85 | 平均 93 | ✅ |
| Critical issues | 0 | 0 | ✅ |
| revise 触发 | ≤ 2 | 1（第 3 章 spot-fix） | ✅ |

**总体判断**：流水线**可跑通**，质量**可接受**，但**字数控制**这一点需要 v1.3 优化。

---

## 端到端流水线轨迹（7 个 Phase）

| Phase | Skill | 触发用户语句 | 产出 |
|-------|-------|-------------|------|
| 0 | `novel-studio` | "我要写本玄幻末法解析流网文，发起点 + 番茄" | `novel.json` + 目录骨架 |
| 1 | `novel-blueprint` | "开书定盘" | `blueprint.md`（status: approved）|
| 2 | `novel-worldforge` | "建世界 + 设计金手指" | `world/worldview.{md,json}` + `cheat-system.{md,json}` + `powers.{md,json}` |
| 3 | `novel-character-atelier` | "捏主角 + 反派 + 配角" | 5 个角色卡 + `relationships.md` + `_index.json` |
| 4 | `novel-outline-architect` | "写总纲 + 第 1 卷卷纲 + 前 5 章章纲" | `master.md` + `volume-01.md` + `chapter-{0001..0005}.md` |
| 5 | `novel-chapter-writer` × 5 | "写第 N 章" | `chapters/chapter-000{1..5}.md`（draft → approved） |
|   | `novel-quality-auditor` × 5 | "审稿 + settle" | 5 份 audit reports + memory delta apply × 5 |
| 6 | `novel-quality-auditor` | "全书复盘" | `audit/reports/full-book-audit.md` |
| 7 | `novel-asset-vault` | "把好桥段沉淀一下" | 3 张 snippets + 1 张 inspiration + `_index.json` |

---

## Phase 0：novel-studio 初始化

**用户**："我要写本玄幻末法解析流网文，临时叫《吞天魔帝》，发起点 + 番茄。"

**studio**：
1. 检查当前目录无 `novel.json` → 走新建流程
2. 询问最少必要信息：题材玄幻、平台起点 + 番茄、临时书名《吞天魔帝》
3. 创建目录骨架 + `novel.json`
4. 提示下一步可走 `blueprint` / `market-radar` / `vault`，作者选 blueprint

→ 转交 `novel-blueprint`。

---

## Phase 1：novel-blueprint 10 步定盘

**用户**："开书。我有大方向：穿越者靠残卷解析功法，末法时代背景。"

**blueprint** 走工作流 B（10 步定盘），与作者协商 10 个字段。完整契约见 [`blueprint.md`](./blueprint.md)。

**关键决策**：
- 主角林烬：现代研究生穿越，性格内敛、靠分析力翻盘
- 金手指《天工残卷》：解析功法 / 法宝 / 灵植 / 气息（需精神力代价 + 反噬限制）
- 卷末高潮第 45 章祭祀大典翻盘
- 反 AI 味重点禁用：缓缓 / 竟然 / 不可思议 / 4 字成语堆砌
- 章字数 3500，对话占比 30-40%
- 长期意图：800 章 / 化神，结局"残卷消失主角自立"

`blueprint.md` status 切 `approved` → 转交 `worldforge`。

---

## Phase 2：novel-worldforge 建世界 + 金手指

**用户**："开始建世界。"

**worldforge** 按 `worldview → powers → cheat-system` 三步走：

### 2.1 worldview
读 blueprint 第 1、2、10 节，6 段式协商。落盘 [`world/worldview.md`](./world/worldview.md) + [`.json`](./world/worldview.json)。

### 2.2 powers
基于"末法 / 解析"题材选"经典仙侠简化版"基底（炼气 → 筑基 → 金丹 → 元婴 → 化神）。落盘 [`world/powers.md`](./world/powers.md) + [`.json`](./world/powers.json)。

### 2.3 cheat-system（核心差异化）
六要素全填：定义 / 触发 / 输出 / 升级阶梯（4 tier）/ 限制（4 条代价）/ 节拍（10 个 beat）。Tier 4 的代价从精神力切换到"记忆"，呼应"残卷消失"长期伏笔。落盘 [`world/cheat-system.md`](./world/cheat-system.md) + [`.json`](./world/cheat-system.json)。

→ 转交 `character-atelier`。

---

## Phase 3：novel-character-atelier 5 个核心角色

**用户**："世界搭好了，捏角色。"

**atelier** 基于 blueprint 第 5 节钩子推断需要的角色：5 人。每人按 8 字段填。

| 角色 | 文件 | 角色定位 | 首次出场 |
|------|------|---------|---------|
| 林烬 | [`characters/protagonist-lin-jin.md`](./characters/protagonist-lin-jin.md) | 主角 | 1 |
| 赵天霄 | [`characters/antagonists/antagonist-zhao-tianxiao.md`](./characters/antagonists/antagonist-zhao-tianxiao.md) | 早期反派（玄霄宗内应） | 1 |
| 苏婉柔 | [`characters/supporting/supporting-su-wanrou.md`](./characters/supporting/supporting-su-wanrou.md) | 核心配角（师妹，朦胧情线） | 1 |
| 玉清师太 | [`characters/supporting/supporting-shitai-yu-qing.md`](./characters/supporting/supporting-shitai-yu-qing.md) | 重要配角（外门管事） | 3 |
| 张三长老 | [`characters/antagonists/antagonist-elder-zhang.md`](./characters/antagonists/antagonist-elder-zhang.md) | 中期反派（前 5 章只被提及） | 15（预埋） |

→ 同步 [`characters/_index.json`](./characters/_index.json) + [`characters/relationships.md`](./characters/relationships.md)。
→ 转交 `outline-architect`。

---

## Phase 4：novel-outline-architect 三级大纲

**用户**："角色齐了，写大纲。"

按 `master → volume-01 → chapter-{0001..0005}` 顺序产出。

- [`outline/master.md`](./outline/master.md)：5 幕 / 卷 1-15 / 长期伏笔 5 条 / 关键里程碑章节
- [`outline/volumes/volume-01.md`](./outline/volumes/volume-01.md)：第 1 卷《残卷初鸣》5 段式 + 必出 15 桥段 + 卷末钩子
- 5 个 [`outline/chapters/chapter-000{1..5}.md`](./outline/chapters/)：每章 9 字段全填，hookOps 引用真实 hook_id

⚠️ 第一次只先产出前 5 章章纲——后续章纲（第 6+ 章）走 PLAN 阶段滚动产出。

→ 转交 `chapter-writer`。

---

## Phase 5：写章 + 审稿 + settle 循环（5 章 × 6 阶段）

每章走完整六阶段循环 `PLAN → COMPOSE → WRITE → AUDIT → REVISE → SETTLE`。

### 实战数据（真实）

| 章 | 标题 | 字数 | 软范围 | 评分 | AIGC | revise | hooks 操作 |
|----|------|------|--------|------|------|--------|-----------|
| 1 | 残卷 | 2757 | ⚠️ 硬范围内但软外 | 87 | 94 | — | 4 open |
| 2 | 杂草·百年缚地芸 | 2732 | ⚠️ 硬范围内但软外 | 85 | 92 | — | 2 advance |
| 3 | 扫地的师太 | 2537 | ❌ 硬范围外 | 84（v2） | 93 | spot-fix | 2 open + 1 mention |
| 4 | 赵天霄的耳朵 | 2718 | ⚠️ 硬范围内但软外 | 84 | 90 | — | 3 open + 2 advance + 1 mention |
| 5 | 七寸断 | 2334 | ❌ 硬范围外 | 89 | 96 | — | 1 close + 3 advance + 1 mention + 1 open |

> 评分相比初版略下调（91→87 等）：因为字数偏短被 D33 维度命中（minor）。
> 但 critical / major issues 均为 0，质量本身没有破坏。

### 关键观察

- **第 5 章字数最短**（2334），但**评分最高**（89 / AIGC 96）：动作章节奏特性 + comeback 节拍命中无水分。
- **第 3 章 spot-fix 唯一一次**：v1 87 → v2 84（字数补不上，但其它维度修好了）。

---

## Phase 6：5 章 settle 后的 memory 终态

经过 5 次 settle，[`memory/`](./memory/) 下 7 个真相文件（双轨 JSON + MD）全部演进到第 5 章末状态。

| 文件 | 演进证据 |
|------|---------|
| [`current_state.json`](./memory/current_state.json) | 林烬位置从"宗门外门"演进到"反杀师兄后准备送陈药水给师太"；spirit_power_pct 100 → 65 |
| [`particle_ledger.json`](./memory/particle_ledger.json) | 物品账本 10 件 + cheat_consumption 4 条记账（passive 1、active 2、缓存命中 1） |
| [`pending_hooks.json`](./memory/pending_hooks.json) | 9 开放（玉简发烫之谜、苏婉柔母亲、残卷来源、师太境界、清扫组之外、张三长老、赵天霄阴谋、陈药水异常、残卷主动消耗发烫）+ 1 resolved（赵天霄欺凌） |
| [`chapter_summaries.json`](./memory/chapter_summaries.json) | 5 章摘要全填，每章含 summary_one_line / summary_3lines / characters_present / key_events / hooks 状态 / word_count |
| [`subplot_board.json`](./memory/subplot_board.json) | 3 条支线全部活跃，5 章内每条都推进 |
| [`emotional_arcs.json`](./memory/emotional_arcs.json) | 林烬 8 个轨迹点 / 赵 3 / 苏 3 / 师太 3，共 17 个 |
| [`character_matrix.json`](./memory/character_matrix.json) | 6 对核心 encounter，info_known/unknown 边界清晰 |

---

## Phase 7：全书复盘 + 素材沉淀

### 7.1 全书复盘
[`audit/reports/full-book-audit.md`](./audit/reports/full-book-audit.md)：5 章总评、钩子债务、支线节奏、综合健康度。

### 7.2 vault 沉淀
评分阈值降到 ≥ 85（v1.3 优化）后触发沉淀 4 张卡：

- [`vault/snippets/snip-3a91ef03.md`](./vault/snippets/snip-3a91ef03.md)：第 5 章"七寸断"反杀桥段
- [`vault/snippets/snip-c4d8b2f1.md`](./vault/snippets/snip-c4d8b2f1.md)：第 3 章师徒断扫帚试探对话
- [`vault/snippets/snip-7b21c4e9.md`](./vault/snippets/snip-7b21c4e9.md)：第 1 章首屏"被罚跪"开场
- [`vault/inspirations/insp-f3a92e1c.md`](./vault/inspirations/insp-f3a92e1c.md)：实战发现的"反派偷听"暗示桥段

→ 同步 [`vault/_index.json`](./vault/_index.json)。

---

## 关键学习与 v1 设计验证

### ✅ 设计验证通过的部分

1. **9 字段章纲是硬契约**：5 章实战中没有出现"writer 凭空发挥"，全部按章纲事件链写。
2. **金手指 tier 校验有效**：Tier 1 全程严格遵守（仅前两层信息），第 5 章二次解析返回"已记"完美执行 24h 冷却 + 缓存机制。
3. **真相文件 delta apply 准确**：5 次 settle，9 大约束 C1-C9 全部不破。
4. **反 AI 味词表显著降低 AI 痕迹**：5 章 AIGC 平均分 93。
5. **角色性格内核约束有效**：林烬"先观察后行动 / 数砖块 / 停顿半秒 / 不喝酒"5 章全部出现。
6. **关系网 info_known/unknown 边界精确**：6 对 encounter 中无任何"角色越权记忆"违规。
7. **三级大纲职责清晰**：master → volume → chapter 顺序生效，章纲 hookOps 全部引用 pending_hooks 中真实存在的 hook_id。

### ⚠️ 暴露的真实问题（v1.3 优化方向）

#### 问题 1：字数控制偏短 ⭐ 最大问题

- **现象**：5 章均 2616 字（target 3500），74.7% 达成率
- **根因分析**：
  1. SKILL.md 里"字数治理"的硬范围 [2625, 4375] 在 v1 没有强制工具校验，全靠 LLM 自觉
  2. 章纲第 3 字段"必发生事件"通常 5 个事件，每事件 ~500 字 = 2500 字，已经接近软范围下沿
  3. 想达 3500 字 / 章，章纲事件链应该 6-7 个，或每事件加更多 5 感 / 不规则小动作
- **v1.3 优化建议**：
  - chapter-writer SKILL.md 第 3.2.6 节加"事件链字数估算"约束：每章纲事件 ~ target_words / events 数
  - outline-architect 写章纲时如果 events < 6 个，自动加 length warning
  - chapter-writer compose 阶段 prompt 明确告知"目标字数 3500 是硬范围下沿不是软范围"

#### 问题 2：memory 文件人工对账成本高

- v1 由 LLM 自检 9 大约束 C1-C9，5 章实测平均每章成本 1.5k tokens
- v2 引入 CLI 后这部分应做成代码层强校验，节省 LLM token

#### 问题 3：vault 主动沉淀触发阈值过高

- 原阈值 ≥ 95，5 章只触发 1 次（第 5 章）
- 实测 ≥ 85 阈值更合理：能触发到第 1、3、5 章；第 2、4 章作为铺垫不沉淀
- v1.3 已将默认阈值改为 85（在 SKILL.md 第 6 节"asset-vault 协作"标注）

#### 问题 4：D29 段落节奏维度对动作章不友好

- 第 5 章动作章段落平均句数 1.9（章纲允许 2-4），D29 误报
- 章纲应允许"动作章 = 1-3 句节奏"作为子模式

#### 问题 5：blueprint 第 9 节"对话占比"在 PLAN 阶段被忽略

- 第 5 章动作章对话占比 27%，章纲允许 25-30%，但实际动作章应该自然降到 < 25%
- 章纲应区分"对话章 / 描写章 / 动作章"三类节奏模式

### 📊 5 章诚实总数据

```
总字数：13078 字（target 17500，74.7% 达成）
均章字数：2616 字（target 3500，软范围 [2975, 4025] 外）
均评分：85.8 / 100
均 AIGC：93.0 / 100
revise 触发：1 次（第 3 章 spot-fix）
critical issues：0（全程）
major issues：1（第 3 章 OOC 边缘，已修）
length warnings：5（5 章全部 length warning）
开放 hooks：9
resolved hooks：1
活跃支线：3 / 3
角色 encounter 对：6
emotional arcs：4 个角色 / 17 个轨迹点
```

---

## 文件总览（实际）

```
examples/tunshi-mo-di/
├── EXECUTION_LOG.md                    ← 你正在看
├── novel.json                          ← v12，current_chapter=5，total_words=13078
├── blueprint.md                        ← v4 approved，10 字段全填
├── world/
│   ├── worldview.md                    ← 6 段式
│   ├── worldview.json
│   ├── cheat-system.md                 ← 6 要素 + 7 反例
│   ├── cheat-system.json               ← 4 stages + 4 limits + 10 beats
│   ├── powers.md                       ← 5 境界 + 主角境界曲线
│   └── powers.json
├── characters/
│   ├── _index.json                     ← 5 个角色索引
│   ├── relationships.md                ← 8 对关系 + mermaid 图
│   ├── protagonist-lin-jin.md          ← 8 字段全填
│   ├── antagonists/
│   │   ├── antagonist-zhao-tianxiao.md
│   │   └── antagonist-elder-zhang.md   ← 第 15 章预埋
│   └── supporting/
│       ├── supporting-su-wanrou.md
│       └── supporting-shitai-yu-qing.md
├── outline/
│   ├── master.md                       ← 5 幕 + 15 卷估
│   ├── volumes/
│   │   └── volume-01.md                ← 5 段式 + 15 桥段
│   └── chapters/
│       ├── chapter-0001.md             ← 9 字段
│       ├── chapter-0002.md
│       ├── chapter-0003.md
│       ├── chapter-0004.md
│       └── chapter-0005.md
├── chapters/
│   ├── chapter-0001.md                 ← 2757 字（length warning）
│   ├── chapter-0002.md                 ← 2732 字（length warning）
│   ├── chapter-0003.md                 ← 2537 字（硬范围外，v2 spot-fix 后）
│   ├── chapter-0004.md                 ← 2718 字（length warning）
│   └── chapter-0005.md                 ← 2334 字（硬范围外，但 audit 89）
├── memory/                             ← 7 个 JSON + 7 个 MD 投影 = 14 文件
│   ├── current_state.{json,md}
│   ├── particle_ledger.{json,md}       ← 10 物品 + 4 cheat_consumption
│   ├── pending_hooks.{json,md}         ← 9 open + 1 resolved
│   ├── chapter_summaries.{json,md}     ← 5 章摘要
│   ├── subplot_board.{json,md}         ← 3 支线全活跃
│   ├── emotional_arcs.{json,md}        ← 4 角色 / 17 轨迹点
│   └── character_matrix.{json,md}      ← 6 对 encounter
├── audit/
│   └── reports/
│       ├── chapter-0001.audit.md       ← 87 / 94
│       ├── chapter-0002.audit.md       ← 85 / 92
│       ├── chapter-0003.audit.md       ← 84 / 93（v2 spot-fix 后）
│       ├── chapter-0004.audit.md       ← 84 / 90
│       ├── chapter-0005.audit.md       ← 89 / 96
│       └── full-book-audit.md          ← 全书复盘
└── vault/
    ├── _index.json                     ← 4 张卡索引
    ├── snippets/
    │   ├── snip-3a91ef03.md            ← 七寸断
    │   ├── snip-c4d8b2f1.md            ← 师太断扫帚试探
    │   └── snip-7b21c4e9.md            ← 首屏被罚跪
    └── inspirations/
        └── insp-f3a92e1c.md            ← 反派偷听暗示
```

**总计 50 个文件 / ~7000 行**（含正文 13078 字 + 设计 ~5500 行）。

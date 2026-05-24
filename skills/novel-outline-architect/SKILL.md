---
name: novel-outline-architect
description: 用于设计三级大纲与单章意图的 skill。当用户说"写大纲 / 总纲 / 卷纲 / 细纲 / 章纲 / 章节细纲 / 节奏 / 卡点 / 高潮 / 下一卷怎么写 / 下一章写什么 / 主线 / 支线 / 起承转合 / 5 段式"时使用。需要 blueprint.md、world/*、characters/_index.json 已就绪。产出三级大纲：outline/master.md（总纲，5 幕主线 + 卷划分）、outline/volumes/volume-NN.md（卷纲，5 段式节奏 + 必出桥段 + 卷末钩子）、outline/chapters/chapter-NNNN.md（章纲，9 字段：一句话目标 / 必出场角色 / 必发生事件 / 钩子 mustOpen+mustClose / 爽点节拍 / 情绪曲线 / 字数节奏 / 不写 / 与状态耦合）。也负责写作期 PLAN 阶段的章意图编译（读 memory/pending_hooks 决定本章开 / 进 / 收哪些钩子）。第一次只写前 5-10 章章纲，后续滚动产出。完成后由 chapter-writer 接手写正文。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: [novel-blueprint, novel-worldforge, novel-character-atelier]
  upstream_assets: [blueprint.md, world/*, characters/_index.json]
  downstream_skills: [novel-chapter-writer]
  downstream_assets: [outline/master.md, outline/volumes/volume-NN.md, outline/chapters/chapter-NNNN.md]
  external_capabilities: [llm]
soft_depends_on:
  upstream_assets: [memory/pending_hooks.json, memory/chapter_summaries.json, memory/subplot_board.json, vault/snippets/]
---

# Novel Outline Architect · 三级大纲 + 章意图编译

把 blueprint 第 5 节"前 30 章承诺"和 cheat-system.beats、character 弧光，编译成可被 chapter-writer 直接消费的**三级大纲**。

⚠️ 这是网文工业链路里最容易被参考项目跳过的一步——inkos 直接 outline → write，跳过了"章纲"。AI-Novel-Writing-Assistant 把"章纲"叫"节奏拆章"。我们坚持**三级大纲（总纲 / 卷纲 / 章纲）都是一等公民**：

- **总纲** = 整本书的脊柱（5 幕主线 + 卷划分）
- **卷纲（细纲）** = 一卷的节奏（5 段式 + 必出桥段 + 卷末钩子）
- **章纲（章节细纲）** = 一章的契约（9 字段，chapter-writer 的唯一直接输入）

⚠️ **第一次只先写前 5-10 章章纲**。剩下的章纲根据写作反馈滚动产出（PLAN 阶段）。一开始就写 50 章章纲是浪费——前 3 章实战完，节奏判断会变。

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- characters 完成后第一次写大纲
- 用户说"写第 N 章章纲 / 给我下一章细纲"
- 用户说"第 X 卷写完了，写下一卷卷纲"
- 写作期 PLAN 阶段（chapter-writer 写正文之前先编译 intent）
- 用户说"现在节奏跑偏了，重做卷纲"

❌ 不要使用：
- 写正文 → `novel-chapter-writer`
- 改世界设定 → `novel-worldforge`
- 改角色 → `novel-character-atelier`
- 没有 character_index → 先回 `novel-character-atelier`

---

## 2. 输入与输出契约

### 输入（必需，按工作流分类）

| 工作流 | 必需输入 |
|--------|---------|
| 写总纲 | `blueprint.md`、`world/*`、`characters/_index.json`、`world/cheat-system.json` |
| 写卷纲 | + `outline/master.md` |
| 写章纲（首批） | + `outline/volumes/volume-01.md` |
| 写章纲（滚动 / PLAN） | + `memory/pending_hooks.json`、`memory/chapter_summaries.json`、`memory/subplot_board.json` |

### 输入（可选）
- `vault/snippets/`（章纲设计灵感）
- 用户给的指令（"本章重点写师徒矛盾"）

### 输出
- `outline/master.md`（首次或重做时）
- `outline/volumes/volume-NN.md`（每卷一份）
- `outline/chapters/chapter-NNNN.md`（每章一份）
- 更新 `novel.json.outline_status`

---

## 3. 三级大纲

### 3.1 总纲（master.md）

整本书的脊柱。**写完几乎不动**（除非 blueprint 大改）。

#### 必填字段

```markdown
---
asset_type: outline-master
version: 1
maintained_by: novel-outline-architect
status: drafting | approved
---

# 总纲：<书名>

## 主题驱动（一句话）
<整本书要回答的核心命题>

## 主线五幕
1. <幕 1 标题>（卷 X-Y）：<目标 / 转折>
2. <幕 2>
3. <幕 3>
4. <幕 4>
5. <幕 5>

## 卷列表
- 第 1 卷《<卷名>》：第 1-50 章
- 第 2 卷《<卷名>》：第 51-100 章
- ...

## 长期伏笔（与 memory/pending_hooks.json 镜像）
- <长期伏笔 1>（卷 X 末段揭示前置线索）
- <长期伏笔 2>
```

#### 关键约束

- **5 幕**结构（不强制 5，但建议 4-6 幕）：每幕对应 2-4 卷
- **卷数估计**：可以是估计值，但要给得出来。前期可以宽松，后期通过 plan 滚动收紧
- **长期伏笔**至少 3 条，每条标记预计兑现卷

### 3.2 卷纲 / 细纲（volume-NN.md）

⚠️ 这是用户口中的"细纲"。

每卷一份，**当前卷写完前 5 章前必须就绪下一卷的卷纲**。

#### 必填字段（5 段式）

```markdown
---
asset_type: outline-volume
volume_no: <N>
chapter_range: [<start>, <end>]
target_chapters: <count>
version: 1
status: drafting | approved
maintained_by: novel-outline-architect
---

# 第 <N> 卷《<卷名>》卷纲

## 卷主题
<一句话总结这一卷在回答什么>

## 卷高潮（必填，章节 + 事件）
第 <X> 章：<高潮事件>

## 节奏分段（5 段式）
- 起（第 1-X 章）：<段目标>
- 承（第 X-Y 章）：<段目标>
- 转（第 Y-Z 章）：<段目标>
- 合（第 Z-W 章）：<段目标>
- 高潮（第 W-end 章）：<高潮 + 卷末钩子>

## 必出现的桥段（≥ 5 个，按章节排）
- 第 X 章：<桥段>（来源：blueprint 第 5 节钩子 / cheat-system.beats / character 弧光）
- ...

## 卷末钩子（给下一卷的承诺）
<新埋的伏笔 / 主角境界跃迁 / 场景切换>

## 角色出场计划
- 第 X 章：<角色 ID>（首次 / 回归）
- ...

## 与金手指节拍的耦合
- 第 X 章：cheat-system.beats[N]（type: <type>, event: <event>）
```

#### 关键约束

- **卷高潮**章节必须明确，不能"未来某天"
- **必出桥段**至少 5 个，覆盖：1 个金手指 beat + 1 个角色弧光节点 + 1 个伏笔铺设 + 1 个伏笔回收 + 1 个反派威胁
- **5 段式**比例参考：起 20% / 承 25% / 转 25% / 合 20% / 高潮 10%

### 3.3 章纲 / 章节细纲（chapter-NNNN.md）

⚠️ 这是 chapter-writer 的**唯一直接输入**。每章一份，9 个字段全部不能少。

#### 9 字段模板

```markdown
---
asset_type: outline-chapter
chapter_no: <N>
volume_no: <V>
target_words: 3500
version: 1
status: drafting | approved
maintained_by: novel-outline-architect
---

# 第 <N> 章 · <暂定标题>

## 1. 一句话目标
<本章要让读者得到的最大快感 / 信息 / 转折>

## 2. 必出场角色
- <角色 ID>（POV）
- <角色 ID>
- <角色 ID>（一句话照面）

## 3. 必发生事件（按顺序）
1. <事件 1>
2. <事件 2>
3. <事件 3>
4. <事件 4>
5. <事件 5>

## 4. 钩子（hookOps）
- mustOpen：<本章新埋的伏笔，1-2 条>
- mustAdvance：<本章推进的伏笔，0-2 条，引用 pending_hooks 的 hook_id>
- mustClose：<本章兑现的伏笔，0-1 条，引用 pending_hooks 的 hook_id>
- mention：<本章只提及不推进的伏笔，0-2 条>

## 5. 爽点节拍
<本章核心爽点 + 类型（first-use / windfall / comeback / cost-reveal / stage-up / backlash / transcend）>

## 6. 情绪曲线
<开场情绪> → <中段情绪> → <结尾情绪>

## 7. 字数 / 节奏
- 总字数：<target_words>（±15%）
- 对话占比：<%>
- 段落节奏：手机阅读，2-4 句一段

## 8. 不写
- ❌ <本章绝对不能出现的内容 1>
- ❌ <绝对不能出现的内容 2>

## 9. 与状态的耦合（写完后该更新什么）
- particle_ledger：<新增 / 状态变化 / 金手指消耗>
- pending_hooks：<新埋 / 推进 / 收的钩子 ID>
- character_matrix：<新认识 / 信息变更>
- emotional_arcs：<情感轨迹点>
- subplot_board：<相关支线推进>
```

#### 9 字段必要性论证

每字段的存在意义：

| 字段 | 没有它会怎样 |
|------|-------------|
| 1 一句话目标 | chapter-writer 不知道章节中心，会写发散 |
| 2 必出场角色 | character-matrix 校验失败（出场没卡 / 该出场不出场） |
| 3 必发生事件 | 章节没骨架，writer 凭感觉写 |
| 4 钩子 | pending_hooks 没法 settle，长期伏笔失控 |
| 5 爽点节拍 | 章节没爽点，读者弃读 |
| 6 情绪曲线 | 写出来情绪平淡 |
| 7 字数 / 节奏 | 字数失控 |
| 8 不写 | writer 容易擅自加戏（如让角色突然 OOC） |
| 9 状态耦合 | quality-auditor settle 时无引导，容易漏 |

---

## 4. 工作流

### 工作流 A：首次写大纲（worldforge + characters 完成后）

按"总纲 → 第 1 卷卷纲 → 前 5-10 章章纲"顺序。

#### A.1 写总纲

读 blueprint.md + world/* + characters/_index.json，给候选 5 幕主线。

##### 协商步骤

```
基于 blueprint：
- 第 1 节定盘："末法时代穿越者，靠残卷成长为吞天魔帝"
- 第 5 节钩子：第 1/5/15/30 章承诺
- 第 10 节长期意图：800 章 / 化神

我推断 5 幕：
1. 觉醒（卷 1-2 / 第 1-100 章）：得到残卷，立足宗门
2. 离巢（卷 3-4 / 第 101-200 章）：脱离宗门，看到末法世界全貌
3. 真相边缘（卷 5-7 / 第 201-400 章）：触碰末法成因，被各方追杀
4. 决断（卷 8-10 / 第 401-600 章）：与上古失败者建立联系
5. 吞天（卷 11-12 / 第 601-800 章）：重启灵气纪元

接受 / 改？
```

让用户确认 / 调整后写到 master.md。

#### A.2 写第 1 卷卷纲

读 master.md（确定第 1 卷范围）+ blueprint.md（前 30 章承诺）+ cheat-system.beats（前 30 章 beats）+ characters/* （早期角色）。

##### 协商步骤

```
第 1 卷《残卷初鸣》（第 1-50 章）

卷主题候选：
"废柴林烬靠残卷在宗门站稳脚跟，识破第一个阴谋"

卷高潮候选：
第 45 章：祭祀大典上当众解析长老的禁忌功法，获得长老死敌的庇护

5 段式分配：
- 起（1-10 章）：得卷、藏卷、试卷
- 承（11-20 章）：用卷反击师兄、立足外门
- 转（21-30 章）：被卷入更大的阴谋、第一次反噬
- 合（31-44 章）：调查阴谋、收集证据、与师太半结盟
- 高潮（45-50 章）：祭祀大典翻盘、卷末钩子

必出桥段：
- 第 2 章：残卷第一次解析（cheat first-use beat）
- 第 5 章：第一次反杀（cheat comeback beat + 主角弧光起点）
- 第 25 章：第一次反噬（cheat backlash beat）
- 第 33 章：苏婉柔救场（character 弧光节点）
- 第 45 章：大典翻盘（卷高潮）

卷末钩子：
残卷第二段封印浮现，提到"中州之外"

接受？
```

让用户确认后写到 volume-01.md。

#### A.3 写前 5-10 章章纲

⚠️ 第一次**只写前 5-10 章**。理由：

1. 前 3 章实战完，节奏判断会变
2. 写 50 章章纲是浪费
3. 后续走 PLAN 阶段滚动产出更准

##### 每章章纲生成步骤

每章独立做一次"协商 + 写"循环：

1. 拉出本章在 volume-01 节奏分段中的位置（起 / 承 / 转 / 合 / 高潮）
2. 拉出本章对应的"必出桥段"（如果有）
3. 拉出本章对应的 cheat-system.beat（如果有）
4. 拉出本章对应的 character 弧光节点（如果有）
5. 给候选 9 字段，让用户确认
6. 写到 chapter-NNNN.md，status: approved

⚠️ 如果用户对每章都说"按你建议来"，**不要默认全部 approved**。第 1 章 + 第 5 章是关键章（开场 + 第一爽点），用户应该明确确认。

### 工作流 B：滚动写章纲（PLAN 阶段）

⚠️ 这是 chapter-writer 写正文之前调用的子流程。

触发：用户说"写下一章 / 写第 N 章"，且 chapter-NNNN.md 不存在。

#### B.1 检查输入

读：

- `outline/master.md`（卷划分 + 长期伏笔）
- `outline/volumes/volume-NN.md`（当前卷的节奏 + 必出桥段）
- `memory/pending_hooks.json`（当前未闭合伏笔）
- `memory/chapter_summaries.json`（最近 3-5 章摘要，确保连贯）
- `memory/subplot_board.json`（支线状态，特别是 stale > 30 章的）
- `world/cheat-system.json`（当前章对应的 beat）
- 用户给的 context（例："本章先把注意力拉回师徒矛盾"）

#### B.2 hookOps 决策

基于 pending_hooks 的 status / tier / last_advanced_chapter，决定本章：

| 决策 | 触发条件 |
|------|---------|
| mustOpen 新钩子 | 本章对应卷纲必出桥段需要新埋 / 本章是 cheat-system 的 first-use beat |
| mustAdvance | pending_hooks 中有 hook 已经 last_advanced 太久（> stale_warning_threshold） |
| mustClose | pending_hooks 中有 short-tier hook 已埋 5+ 章未收 |
| mention | 用户 context 提到的钩子 |

输出 hookOps 草稿，让用户校对。

#### B.3 必出场角色决策

基于：

- 卷纲第 X 章的"角色出场计划"
- 上一章的章末状态（角色还在哪 / 还在什么状态）
- 用户 context 是否要拉某角色

通常 1-2 个核心角色 + 0-3 个辅助角色。

#### B.4 必发生事件链

3-5 个事件，按时间顺序。每个事件 1 句话。

⚠️ 事件链必须能"闭环"：开场状态 → 中段冲突 → 结尾状态变化。

#### B.5 爽点节拍 + 情绪曲线

参考 cheat-system.beats 和 character emotional_arcs.json。

#### B.6 字数 / 节奏 + 不写 + 状态耦合

根据 blueprint 第 9 节给字数；不写部分参考 character.md 第 8 字段；状态耦合是 9 类资产中本章会修改的。

#### B.7 输出 + 用户校对

写到 `chapter-NNNN.md`，status: drafting；让用户确认 status: approved。

⚠️ chapter-writer **必须等到 status: approved 才能开始写正文**。

### 工作流 C：写下一卷卷纲

触发：当前卷写完前 5 章前 / 用户说"准备第 X 卷"。

步骤：

1. 读 master.md 拿下一卷的范围 + 主线位置
2. 读 memory/pending_hooks.json 拿要在下一卷处理的伏笔
3. 读 memory/subplot_board.json 拿正在跑的支线状态
4. 协商 5 段式 + 必出桥段（同 A.2）
5. 写到 volume-NN.md

### 工作流 D：重做卷纲（节奏跑偏）

触发：用户说"现在节奏不对 / 卷纲重做"。

⚠️ 警告：重做卷纲会让"已写章节是否还合理"成问题。

步骤：

1. 询问用户具体哪里不对（节奏太慢 / 钩子太多 / 主角境界提升太快）
2. 列出"已写章节是否需要 revise"的影响范围
3. 用户确认后改 volume-NN.md，version + 1
4. 同步检查 chapter-NNNN.md 是否还合理（特别是未来还没写的章）

### 工作流 E：编译 intent.md（v1 简化版本）

⚠️ inkos 把 PLAN 输出为单独的 `intent.md`，把 9 字段拆开放。我们 v1 简化为**章纲就是 intent**——9 字段直接合在一个文件里，避免文件过多。

v2 引入 CLI 后可能再拆。

---

## 5. 关键规则

### R1：章纲 9 字段零缺失

每章 chapter-NNNN.md 9 个字段不能少。`status: approved` 前必须自检。

### R2：第一次只写 5-10 章章纲

不一次性写 50 章章纲。剩下走 PLAN 滚动。

### R3：卷纲必出桥段对齐三源

卷纲"必出桥段"必须对应：blueprint 钩子 / cheat-system.beats / character 弧光 中的至少一个。不能凭空加桥段。

### R4：hookOps 必须真实引用

mustAdvance / mustClose 必须用 pending_hooks.json 真实存在的 hook_id。不能瞎编。

### R5：境界曲线对齐 powers

章纲里如果涉及主角能力 / 境界，必须与 powers.json.protagonist_curve 一致。第 5 章不能让主角金丹。

### R6：状态耦合（字段 9）必填

如果某章不修改任何 memory 文件，那它就是水章。**章纲必须有状态耦合**，至少更新 1-2 个 memory 文件。

### R7：用户 context 优先

用户给的 context（"本章拉回师徒矛盾"）优先级高于 stale 警告之类的自动建议。

---

## 6. 与其他 skill 的协作

### 上游
- `novel-blueprint`：第 5 节钩子 + 第 10 节意图（写总纲依据）
- `novel-worldforge`：cheat-system.beats（写卷纲 / 章纲依据） + powers（境界曲线）
- `novel-character-atelier`：弧光设计 + 关系网（写卷纲依据）

### 下游
- `novel-chapter-writer`：消费 chapter-NNNN.md 写正文
- `novel-quality-auditor`：审稿时校验"章纲 must-keep / must-avoid 命中率"

### 旁支
- `novel-asset-vault`：可被 vault 中"节奏示范"激发
- `novel-quality-auditor` 的 settle 阶段：写后更新 memory 后，下一次 PLAN 会消费这些更新

---

## 7. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| world/* 或 characters/_index.json 缺失 | 拒绝，回到上游 |
| 用户跳着写章纲（先写第 5 章不写 1-4 章） | 警告这会让 PLAN 阶段缺少前置摘要；允许但提示风险 |
| 章纲与 powers 冲突（主角境界超阶） | 拒绝，让用户改章纲或改 powers |
| pending_hooks 为空（首次 PLAN） | 跳过 mustAdvance / mustClose 校验，只生成 mustOpen |
| volume-NN 章节范围被 chapter-NNNN 越界（写到第 51 章但卷 1 是 1-50） | 警告，建议先写卷 2 卷纲 |
| 用户要重做总纲 | 强警告：所有卷纲 / 章纲都可能受影响 |

---

## 8. 示例对话

### 示例 1：首次写大纲（吞天魔帝）

```
用户：worldforge / characters 都好了，写大纲。

architect：好，按总纲 → 卷 1 卷纲 → 前 5-10 章章纲顺序。先总纲。

         [读 blueprint + world + characters_index]
         
         主题驱动候选：
         "末法时代下'个体如何重新接入失落的力量真相'。"
         
         5 幕主线候选：
         1. 觉醒（卷 1-2 / 第 1-100 章）：得到残卷，立足宗门
         2. 离巢（卷 3-4 / 第 101-200 章）：脱离宗门，看到世界全貌
         3. 真相边缘（卷 5-7 / 第 201-400 章）：触碰末法成因
         4. 决断（卷 8-10 / 第 401-600 章）：与上古失败者建联
         5. 吞天（卷 11-12 / 第 601-800 章）：重启灵气纪元
         
         接受？

用户：可以，第 5 幕改成"卷 11-15"，留长一点。

architect：[更新]
          长期伏笔候选（与 pending_hooks.json 镜像）：
          - 残卷的真正主人（卷 5 末段揭示前置线索）
          - 苏婉柔的母亲是宗门二长老（卷 2 中揭示）
          - 末法成因（卷 7 揭示）
          
          再加 1-2 条吗？

用户：加"残卷消失承诺"，第 12 卷兑现。

architect：[加] 总纲完成，写到 outline/master.md。
          
          → 进入第 1 卷卷纲

第 1 卷《残卷初鸣》（第 1-50 章）

卷主题：废柴林烬靠残卷在宗门站稳脚跟，识破第一个阴谋

卷高潮（第 45 章）：祭祀大典翻盘

5 段式：
- 起 1-10：得卷、藏卷、试卷
- 承 11-20：用卷反击师兄、立足外门
- 转 21-30：被卷入更大阴谋、第一次反噬
- 合 31-44：调查阴谋、与师太半结盟
- 高潮 45-50：祭祀翻盘、卷末钩子

必出桥段：
- 第 2 章：残卷第一次解析（cheat first-use beat）
- 第 5 章：第一次反杀（cheat comeback beat）
- 第 25 章：第一次反噬（cheat backlash beat）
- 第 33 章：苏婉柔救场（弧光节点）
- 第 45 章：大典翻盘（卷高潮）

卷末钩子：残卷第二段封印浮现，提到"中州之外"

接受？

用户：把第 25 章反噬提前到 23 章。

architect：[改] 卷 1 卷纲完成。
          
          → 进入前 5-10 章章纲。先第 1 章。

# 第 1 章 · 残卷

1. 一句话目标：林烬被欺凌后捡到玉简，识出第一行字。
2. 必出场角色：林烬（POV）/ 赵天霄（欺凌方）/ 苏婉柔（一句话照面）
3. 必发生事件：
   1. 林烬被赵天霄当众罚跪、抢月例
   2. 黄昏取水时山涧捡到玉简
   3. 玉简贴身后头脑发烫
   4. 夜里识出"天工"二字
   5. 解析杂草成功
4. 钩子：
   - mustOpen：玉简发烫之谜 / 苏婉柔的微妙情绪
5. 爽点节拍：解析成功的轻微"原来如此"（first-use beat，不要过度）
6. 情绪曲线：压抑 → 麻木 → 微光 → 谨慎兴奋
7. 字数：3500（±15%）/ 对话 25%（独处为主）/ 段落 2-4 句
8. 不写：直接揭示残卷来源 / 让主角立 flag / 苏婉柔内心戏
9. 状态耦合：
   - particle_ledger：玉简（贴身藏匿）/ 月例（被赵抢走）
   - pending_hooks：玉简发烫之谜 / 苏婉柔情绪
   - emotional_arcs：林烬（压抑→微光）

approved？

用户：approved。继续第 2-5 章。

→ ... 重复
→ 前 5-10 章章纲完成
→ 提示用户：第 6+ 章建议走 PLAN 滚动产出
```

### 示例 2：滚动 PLAN（已写到第 30 章）

```
用户：写下一章。

architect：[检查] chapter-0031.md 不存在 → 进入 PLAN

         [读 master / volume-01 / pending_hooks / chapter_summaries / cheat-system]
         
         本章在卷 1 节奏的"合"段（第 31-44 章），即调查阴谋。
         
         hookOps 分析：
         - mustOpen：基于卷纲第 31-44 段需要"调查赵天霄背后"
         - mustAdvance：hook-canjuan-origin（最近第 25 章推进，过 6 章了，可以再推一次）
         - mustClose：无 short-tier 待收
         - mention：hook-su-wanrou-mother（user context 没要求，但可以一句话提及）
         
         必出场角色：
         - 林烬（POV）
         - 玉清师太（卷纲 31-44 段"与师太半结盟"）
         - 一个新 NPC（情报来源）
         
         必发生事件草稿：
         1. 林烬找师太借口讨教功法
         2. 师太察觉异常，反问林烬来意
         3. 林烬试探性提出对赵天霄的疑问
         4. 师太给出关键线索（涉及玄霄宗）
         5. 林烬回去整理线索，触动残卷再次发烫
         
         爽点节拍：智斗（推进型，不是爆发型）
         
         情绪曲线：紧张（试探）→ 谨慎（被反问）→ 警觉（拿到线索）→ 沉重（残卷反应）
         
         字数 / 节奏：3500 / 对话 50%（与师太大量对话）
         
         不写：直接说出"赵天霄是玄霄宗的内应"（这条留给第 22 章已经收过）
              师太情绪反应过激（她是中立偏向）
         
         状态耦合：
         - particle_ledger：cheat_consumption +1（章末残卷发烫但没真用）
         - pending_hooks：progress hook-canjuan-origin / mention hook-su-wanrou-mother / upsert hook-shitai-suspect
         - character_matrix：record_encounter 林烬-师太
         - emotional_arcs：林烬（坚定→警觉）
         - subplot_board：patch subplot-A-canjuan-origin "锁定怀疑对象"
         
         approved？或者要改？

用户：approved。

→ chapter-0031.md 写入
→ 转交 chapter-writer 写正文
```

---

## 9. 引用文档

- 资产 schema：[`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md) 第 8 节
- pipeline PLAN 阶段：[`docs/design/02-pipeline-architecture.md`](../../docs/design/02-pipeline-architecture.md) 第 5.2 节
- 真相文件 hookOps 语义：[`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 3.2 节

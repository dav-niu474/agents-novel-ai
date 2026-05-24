---
name: novel-worldforge
description: 用于建世界观、设计金手指、设定力量等级体系的 skill。当用户说"建世界 / 世界观 / 设定 / 体系 / 力量等级 / 境界 / 设计金手指 / 主角的能力 / 解析流 / 系统流 / 模拟流 / 召唤流 / 等级划分 / 实力体系 / 物理规则 / 宗门 / 势力 / 地理 / 历史背景"时使用。需要 blueprint.md 已 approved。产出三份文件：world/worldview.md（世界观骨架）、world/cheat-system.md（金手指六要素）、world/powers.md（境界 / 力量等级），同时输出对应 JSON（结构化字段供 quality-auditor 校验）。**金手指设计是中文网文核心差异化资产**，必须有"代价 / 限制 / 升级阶梯"，让审稿可以校验主角境界匹配与消耗记账。完成后由 character-atelier 接手捏角色。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: [novel-blueprint]
  upstream_assets: [blueprint.md, novel.json]
  downstream_skills: [novel-character-atelier, novel-outline-architect]
  downstream_assets: [world/worldview.md, world/worldview.json, world/cheat-system.md, world/cheat-system.json, world/powers.md, world/powers.json]
  external_capabilities: [llm]
soft_depends_on:
  upstream_assets: [vault/inspirations/]
---

# Novel Worldforge · 建世界 + 金手指

把 blueprint 里"金手指一句话"和"题材定位"展开成可落到正文的世界观、金手指机制、力量等级。这是中文网文工业链路里被参考项目最忽视的一块——inkos 把它埋在 architect agent 里，AI-Novel-Writing-Assistant 用大段 prompt 替代结构化字段。我们独立成 skill，并要求**金手指六要素 + JSON 化**。

⚠️ 金手指设计是这本书"能不能写下去"的物理基础。爽点节拍、境界匹配、消耗记账都靠这里。

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- blueprint approved 后第一次建世界
- 用户说"金手指还要补 / 体系怎么写 / 等级划分"
- 用户想改金手指机制（比如"代价加重一点"）
- 用户想加新势力 / 新地理（"我要加一个第十大宗门"）

❌ 不要使用：
- 角色设计 → `novel-character-atelier`
- 写大纲 → `novel-outline-architect`
- 写章节里的世界细节描写 → `novel-chapter-writer`（描写不属于世界观骨架）
- 没有 blueprint → 先回 `novel-blueprint`

---

## 2. 输入与输出契约

### 输入（必需）
- `blueprint.md`（status: approved）
- `novel.json`

### 输入（可选）
- `vault/inspirations/insp-*.md`（用户沉淀的世界观灵感）
- `vault/references/`（参考世界观）
- 用户提供的设定细节

### 输出
- `world/worldview.md` + `world/worldview.json`
- `world/cheat-system.md` + `world/cheat-system.json`
- `world/powers.md` + `world/powers.json`
- 更新 `novel.json.tags`（追加世界观标签）

---

## 3. 工作流

### 工作流 A：完整建世界（首次）

触发：`world/` 为空，blueprint approved。

**总顺序**（必须按这个顺序，因为有依赖）：

```
1. 世界观骨架 worldview.md（先有世界）
2. 力量等级 powers.md（再有规则）
3. 金手指 cheat-system.md（最后是主角差异化）
```

#### A.1 建世界观骨架 worldview.md

按 6 段式询问 / 协商：

##### 段 1：大背景（一句话）

`<时空设定> + <核心冲突 / 困境>`

例：末法纪元，灵气枯竭五百年，仙路断绝，残存修士退守九大宗门。

→ 写到第 1 节

##### 段 2：时间线锚点

至少 3 个时间锚点，标定主角现在所处位置。

例：
- 上古：群仙时代（神话）
- 远古：神魔大战（传说）
- 近古：仙路断绝（500 年前）
- 当代：末法纪元 500 年（主角所在）

→ 写到第 2 节

##### 段 3：地理 / 势力

只列**主角前 30 章会接触到的**。不要一次列 50 个宗门 / 国家。

- 主角所在的核心势力（1 个，详细）
- 与之冲突的势力（1-2 个）
- 中立势力（0-2 个）
- 边缘 / 化外（1 个，留作后期 expand）

每个势力写：

```
- ID（slug）：例 qingyun
- 名称：例 青云宗
- 类型：sect / kingdom / clan / cult / ...
- 立场（相对主角阵营）：ally / neutral / antagonist
- 核心特色：3-5 个关键词
```

→ 写到第 3 节

##### 段 4：力量等级（详见下面 A.2，这里只先给目录）

→ 占位"详见 powers.md"

##### 段 5：物理规则

3-7 条**与主角金手指 / 爽点节拍直接相关**的规则。

例（吞天魔帝）：
- 灵气稀薄：日均吸纳量 = 上古 1/100（解释为什么主角境界提升慢）
- 法宝退化：上古法宝几乎全失效（解释为什么残卷罕见）
- 解析悖论：直接解析他人功法会反噬（金手指代价的世界观依据）

⚠️ 不要写 30 条物理规则。每条规则**必须有用**——能解释爽点 / 能限制主角 / 能制造冲突。

→ 写到第 5 节

##### 段 6：信息边界

主角**不知道**和**误解**的关键信息。这是后期反转的弹药库。

```
- 主角不知道：[3-5 条]
- 主角误解：[2-3 条]
```

例：
- 主角不知道：末法的真正原因 / 残卷的真主人 / 苏婉柔的母亲身份
- 主角误解：以为残卷是宗门遗物（实则来自上古失败者）

→ 写到第 6 节

##### A.1 输出

写到 `world/worldview.md`（按 [`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md) 第 5 节模板）+ `world/worldview.json`（含 era / factions / regions / physical_rules / info_boundaries 结构化字段）。

#### A.2 设计力量等级 powers.md

⚠️ 力量等级要在金手指之前定，因为金手指阶梯依赖境界划分。

##### A.2.1 选体系骨架

按题材给候选：

| 题材 | 推荐体系 |
|------|---------|
| 玄幻 | 自创境界 / 改良斗气 / 改良真气 |
| 仙侠 | 炼气-筑基-金丹-元婴-化神-合体-渡劫-大乘 / 自定义阶段 |
| 末法 / 解析流 | 经典仙侠简化版（炼气 → 筑基 → 金丹 → 元婴 → 化神） |
| 都市 / 异能 | 等级化（D-C-B-A-S-SS）或机能化（觉醒系 / 进化系 / 召唤系） |
| 历史 / 武侠 | 武学境界（招式境 / 内功境 / 意境 / 至境） |
| 科幻 | 科技等级（行星 / 恒星 / 银河 / 宇宙 + 文明 1-7 级） |
| 末世 | 进化等级（一阶 / 二阶 / ... / 神阶） + 进化方向（攻击系 / 防御系 / 治愈系） |
| 游戏 | 等级 + 副职业 + 装备阶 |
| 言情 | 通常无需，可省略 |

让用户选 / 改 / 自创。

##### A.2.2 写每个等级

每个等级写：

```
- 名称：例 炼气
- 阶段细分：例 一层至九层
- 核心特征：例 灵气吸纳，肉身强化
- 突破依据：例 灵气池满 + 顿悟 + 突破丹
- 平均年限（可选）：3-5 年
- 大众占比（可选）：80% 修士
- 寿命增益（可选）：+30 年
```

##### A.2.3 写主角进度对照表

把 blueprint 第 5 节的卷末钩子翻译成境界曲线：

```
- 第 1 章：炼气一层（被欺凌）
- 第 30 章末：炼气七层（解出师兄漏洞反杀）
- 第 50 章末（卷 1 末）：炼气九层 / 筑基初期（祭祀大典翻盘）
- 第 100 章末（卷 2 末）：筑基中期（脱离宗门）
- 第 300 章：金丹（中州外）
- 第 500 章：元婴（接近真相）
- 第 800 章末：化神 → 残卷消失，主角自立
```

⚠️ 这条曲线决定后续每一章主角的"能用什么招"。outline-architect 写章纲时会读这条对照表。

##### A.2.4 输出

写到 `world/powers.md` + `world/powers.json`。

JSON 结构示例：

```json
{
  "schema_version": "1.0",
  "asset_type": "powers",
  "asset_id": "powers-main",
  "version": 1,
  "data": {
    "system_name": "末法纪元修真体系",
    "stages": [
      {
        "id": "lianqi",
        "name": "炼气",
        "order": 1,
        "sub_levels": ["一层", "二层", "...", "九层"],
        "core_features": ["灵气吸纳", "肉身强化"],
        "breakthrough_requires": ["灵气池满", "顿悟"],
        "lifespan_bonus_years": 30
      },
      {
        "id": "zhuji",
        "name": "筑基",
        "order": 2,
        "sub_levels": ["初期", "中期", "后期", "圆满"],
        "core_features": ["筑灵气之基", "可凝聚法力"],
        "breakthrough_requires": ["筑基丹", "渡气海凝结劫"],
        "lifespan_bonus_years": 80
      }
    ],
    "protagonist_curve": [
      {"chapter": 1, "stage": "炼气一层", "context": "被欺凌"},
      {"chapter": 30, "stage": "炼气七层", "context": "解出师兄漏洞反杀"},
      {"chapter": 50, "stage": "炼气九层 / 筑基初期", "context": "祭祀大典翻盘"},
      {"chapter": 800, "stage": "化神", "context": "残卷消失，主角自立"}
    ]
  }
}
```

#### A.3 设计金手指 cheat-system.md（核心）

金手指**必须按六要素填**。任何缺失字段都阻塞 settle。

##### 要素 1：定义（Definition）

`<金手指名字>` 是什么。一句话讲清楚能做什么。

例：天工残卷，可解析任何接触过的功法 / 法宝 / 灵植 / 气息，输出"原理 + 缺陷 + 优化方向"。

##### 要素 2：触发条件（Trigger）

什么时候 / 怎么用。

枚举值（可组合）：
- `physical-contact`：必须亲自接触
- `visual-line-of-sight`：看到就行
- `voice-utterance`：念咒 / 念名
- `mental-focus`：意念聚焦
- `blood-ritual`：血祭
- `consume-resource`：消耗某类资源（灵石 / 灵草）
- `time-based`：定时触发（每日 / 每月 / 月圆）

例（吞天魔帝）：必须 `physical-contact` + `mental-focus`，且消耗精神力。

##### 要素 3：输出 / 效果（Output）

每次使用产出什么。具体到字段。

例：浮现脑海里的三层文字：
- 原理（机制描述）
- 缺陷（漏洞）
- 优化方向（如何改进 / 反制）

##### 要素 4：升级阶梯（Stages）

⚠️ **这是最关键的部分**。决定爽点节拍。

至少 3 个阶梯，对应卷划分：

```json
"stages": [
  {"tier": 1, "chapter_range": [1, 30], "cap": "炼气-筑基功法"},
  {"tier": 2, "chapter_range": [30, 100], "cap": "金丹功法（3 倍消耗）"},
  {"tier": 3, "chapter_range": [100, 300], "cap": "元婴 / 上古残卷"},
  {"tier": 4, "chapter_range": [300, null], "cap": "可主动改写 / 创造", "modes": ["rewrite", "create"]}
]
```

每个阶梯写：
- 章节区间
- 上限能力（cap）
- 解锁条件（怎么进入这个阶梯）
- 消耗倍数（相对 tier 1）
- 新能力（modes，可选）

##### 要素 5：限制 / 代价（Limits）

⚠️ **没有代价的金手指 = 龙傲天 = 翻车**。至少 3 条限制：

类别（候选，不止）：

- **资源消耗**：精神力 / 灵气 / 寿命 / 血脉
- **时间冷却**：同一目标 24h 内只能用一次
- **副作用**：失忆 / 失明 / 痴呆 / 短暂衰老
- **反噬**：超阶使用导致昏迷 / 走火入魔 / 血脉禁制
- **目标限制**：不能解析心魔 / 血脉禁制 / 圣体 / 主角自己
- **公开度限制**：只有主角能用，但被高阶看到能识破

例（吞天魔帝）：
1. 精神力消耗：高频解析会昏迷（资源）
2. 反噬条件：解析血脉禁制 / 心魔功法会被反向解析（反噬）
3. 时间冷却：同一目标 24 小时内只能解析一次（冷却）

##### 要素 6：节拍 / 关键场景（Beats）

⚠️ 这是金手指与剧情的**显式锚点**。每一个 beat 对应一个具体章节，告诉 outline-architect "这章必须发生 X"。

类型（候选）：
- `first-use`：第一次使用（必须有 cost-reveal）
- `windfall`：意外收获（解析得到稀有信息）
- `comeback`：绝境翻盘
- `cost-reveal`：代价暴露（主角第一次承担代价）
- `stage-up`：阶梯升级
- `backlash`：反噬触发
- `transcend`：超越限制

例：

```json
"beats": [
  {"chapter": 1, "type": "first-use", "event": "解析野生灵草·百年缚地芸"},
  {"chapter": 5, "type": "comeback", "event": "解析师兄功法漏洞反杀"},
  {"chapter": 15, "type": "comeback", "event": "解析长老心魔功法绝境翻盘"},
  {"chapter": 28, "type": "backlash", "event": "首次反噬昏迷"},
  {"chapter": 50, "type": "stage-up", "event": "进入 Tier 2，可解析金丹功法"},
  {"chapter": 200, "type": "transcend", "event": "残卷露出第二段封印"}
]
```

##### A.3 输出

`world/cheat-system.md`（按 [`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md) 第 6 节模板）+ `world/cheat-system.json`。JSON 必须包含：name / type / trigger / cost / stages / limits / beats 七个字段。

### 工作流 B：补充 / 修订（已有 world，要扩）

触发：用户说"加一个新势力 / 调整金手指 / 加一个境界"。

#### B.1 新增势力 / 地理

- 读 `world/worldview.json`
- 询问势力详情（id / 名 / 类型 / 立场 / 特色）
- append 到 `factions` 或 `regions`
- version + 1, updated_at 更新

#### B.2 修改金手指阶梯

⚠️ 警告：修改阶梯会影响**已写章节是否还合理**。

步骤：

1. 读 `world/cheat-system.json`，找到要改的 tier
2. 询问改动详情
3. **检查与已写章节的冲突**：扫 `chapters/`，找 protagonist 在涉及 tier 章节用过的能力，看是否还匹配新规则
4. 若有冲突，让用户决定：是改 cheat-system 还是改章节
5. 用户确认后更新

#### B.3 修改力量等级

类似 B.2，但更危险：等级体系动了，全书都可能受影响。

强警告：通常只在前 5 章内允许大改。

### 工作流 C：从素材库激发灵感

触发：用户说"我没思路 / 给我几个金手指方向 / 世界观参考"。

步骤：

1. 读 `vault/_index.json`，按 tags 筛选 `世界观` / `金手指` / `体系` 类素材
2. 取 top 5-7 张卡，简要展示
3. 问用户哪个方向像
4. 进入工作流 A 的相应步骤

如果 vault 没有足够素材，**不要自己脑补**——告诉用户："vault 里相关素材不够，要不要先扫一下市场雷达，或者你给我一些参考？"

---

## 4. 关键规则

### R1：金手指六要素零缺失

每次写完 `cheat-system.json`，必须自检 7 个字段：name / type / trigger / cost / stages / limits / beats。任一缺失，**status 不能写 approved**，必须显示提示。

### R2：金手指必须有代价

`limits` 数组长度 ≥ 3，且至少包含 1 个 `资源消耗` 类、1 个 `反噬 / 副作用` 类。

如果用户只想给 1 条限制，强烈建议补到 3 条；不接受 0 条限制。

### R3：阶梯与境界曲线对齐

`cheat-system.json.stages[].chapter_range` 必须与 `powers.json.protagonist_curve[]` 时间线对齐。

例：tier 1 是 `[1, 30]`，但 powers 里 protagonist 第 30 章已经是炼气七层接近筑基；tier 1 上限若写"炼气-筑基功法"是合理的。但如果 tier 1 写到 chapter_range `[1, 100]`，而 protagonist 100 章已经金丹，金手指还停留在炼气阶段就错位。

### R4：信息边界不要被立刻打破

worldview 第 6 节 `info_boundaries.protagonist_unknown` 列出的事项，不能在前 30 章就被揭露。让 quality-auditor 后续校验。

### R5：worldview / powers / cheat-system 三者写完才能进入下一阶段

不能只写 worldview 就让用户去 outline-architect。必须三份资产都齐全（且 status: approved）才允许下游 skill 接手。

### R6：JSON 与 Markdown 双写

每写一次 markdown 必须同步 JSON（schema 见 [`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md)）。JSON 是权威源，markdown 是投影；但当前 v1 由 LLM 双写，必须保持一致。

### R7：不替用户决定金手指方向

跟 blueprint 一样：协商。给候选，让用户选。

---

## 5. 与其他 skill 的协作

### 上游
- `novel-blueprint`：blueprint.md 第 4 节"金手指一句话" + 第 10 节"长期意图" 是 worldforge 的硬约束。

### 下游
- `novel-character-atelier`：拿到主角境界曲线 + 阵营立场设计角色
- `novel-outline-architect`：拿到 cheat-system.beats 写卷纲 / 章纲
- `novel-chapter-writer`：写正文时 compose 阶段会读 cheat-system.json 限制（哪些能力主角现在还不能用）
- `novel-quality-auditor`：审稿时按 cheat-system.json 校验"境界匹配 / 消耗记账"

### 旁支
- `novel-asset-vault`：可被 vault 的世界观素材激发；也可把好的世界观沉淀回 vault 给下本书

---

## 6. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| blueprint 没 approved | 拒绝执行，回到 blueprint |
| blueprint 第 4 节金手指描述太空泛（如"主角自带逆天天赋"） | 不直接拒绝，但要求用户具象化到"能做什么 + 触发条件 + 代价" |
| 用户写完 cheat-system 但 limits 只有 1 条 | 警告 + 强烈建议补到 3 条；用户坚持的话给 status: drafting 不给 approved |
| 用户只想写 worldview 不想写金手指（言情书 / 短篇） | 允许：cheat-system.md 留空但要明确标注 `not_applicable: true`，让 quality-auditor 跳过相关校验 |
| 已写章节与新 cheat-system 冲突 | 强警告，列出冲突章节，让用户决策（不要自动修章节） |
| 用户改主题材（玄幻 → 都市） | 提示 worldview 几乎要全部重写 |

---

## 7. 示例对话

### 示例 1：完整建世界（吞天魔帝）

```
用户：blueprint 定盘了，开始建世界。

worldforge：好。我们按 worldview → powers → cheat-system 顺序走。先建世界观。

第 1 段 · 大背景（一句话）
基于你 blueprint 第 1 段"末法时代穿越者，靠一本残卷解析功法"，给你候选：

> 末法纪元，灵气枯竭五百年，仙路断绝，残存修士退守九大宗门。

接受 / 改写？

用户：接受。但加一句"上古的力量正在悄悄回归"。

worldforge：[更新]
          第 2 段 · 时间线锚点
          给你 4 个候选锚点：
          - 上古：群仙时代（神话）
          - 远古：神魔大战（传说）
          - 近古：仙路断绝（500 年前）
          - 当代：末法纪元 500 年（主角所在）
          
          够了吗？要加吗？

用户：加一个"中古：诸天大战"。

→ ... 继续到第 6 段
→ 完成 worldview.md
→ 进入 powers.md

worldforge：第 4 段中力量等级我们详细展开。题材是玄幻末法，
          推荐用经典仙侠简化版：炼气 → 筑基 → 金丹 → 元婴 → 化神。
          
          要这个还是自创？
          
用户：用这个。

worldforge：好，每个境界写细节：
          - 炼气（1-9 层）：灵气吸纳，肉身强化，~3-5 年突破
          - 筑基（初/中/后/圆满）：凝聚法力，~10-20 年
          - 金丹：~50 年
          - 元婴：~200 年
          - 化神：~500 年
          
          接受？要改寿命 / 突破时间吗？
          
用户：接受。

worldforge：然后是主角境界曲线。基于你 blueprint 的钩子推算：
          - 第 1 章：炼气一层（被欺凌）
          - 第 30 章：炼气七层（反杀师兄）
          - 第 50 章末（卷 1 末）：炼气九层（祭祀翻盘）
          - 第 100 章末（卷 2 末）：筑基中期
          - 第 300 章：金丹
          - 第 800 章末：化神 → 残卷消失
          
          这条曲线决定每一章主角能用什么招。要调吗？
          
用户：可以。

→ powers.md 完成

worldforge：进入金手指。我们按六要素填。
          要素 1 · 定义：从你 blueprint 拿来：
          
          > 天工残卷，可解析任何接触过的功法 / 法宝 / 灵植 / 气息，输出"原理 + 缺陷 + 优化方向"。
          
          ok？

用户：ok。

worldforge：要素 2 · 触发条件
          基于"接触"和"残卷",我推断需要 physical-contact + mental-focus，
          消耗精神力。要不要加 voice-utterance（念咒）？

用户：不要，太麻烦。

worldforge：要素 3 · 输出
          每次解析浮现脑海里 3 层文字：
          - 原理 / 缺陷 / 优化方向。
          
          可以吗？或者只给原理 + 缺陷不给优化？

用户：3 层都要。

worldforge：要素 4 · 升级阶梯（关键，决定爽点节拍）
          基于 powers.protagonist_curve，给你 4 阶建议：
          
          | Tier | 章节区间 | 上限 | 消耗 |
          |------|---------|------|------|
          | 1 | 1-30 | 炼气-筑基功法 | x1 |
          | 2 | 30-100 | 金丹功法 | x3 |
          | 3 | 100-300 | 元婴/上古残卷 | x10 |
          | 4 | 300+ | 可改写/创造 | 不再消耗 |
          
          可以？

用户：可以但 tier 4 太逆天，给个限制。

worldforge：好。tier 4 改为：可改写 / 创造，但每次会"短暂忘记一段记忆"作为代价。
          这样到了 tier 4，能力上限上去了，代价从精神力变成"记忆"，
          也契合你 blueprint 第 10 节"残卷消失，主角自立"的伏笔。
          
用户：太好了，就这样。

worldforge：要素 5 · 限制 / 代价（必须 ≥ 3 条）
          初稿 3 条：
          1. 资源：精神力消耗，高频会昏迷
          2. 反噬：解析血脉禁制 / 心魔功法会被反向解析
          3. 冷却：同一目标 24h 内只能解析一次
          
          要加吗？

用户：再加"目标限制：不能解析自己的金手指"。

worldforge：[加上] 4 条限制就位。
          
          要素 6 · 节拍 / 关键场景
          基于你 blueprint 第 5 节钩子 + powers 曲线，初稿 6 个节拍：
          
          | 章 | type | event |
          |---|------|-------|
          | 1 | first-use | 解析野生灵草 |
          | 5 | comeback | 解析师兄功法漏洞反杀 |
          | 15 | comeback | 解析长老心魔功法绝境翻盘 |
          | 28 | backlash | 首次反噬昏迷 |
          | 50 | stage-up | 进入 Tier 2 |
          | 200 | transcend | 残卷露出第二段封印 |
          
          ok？

用户：ok，提前到 25 章反噬，让节奏紧一点。

worldforge：[改 28 → 25]
          
          六要素全部完成。我把 cheat-system.md + cheat-system.json 写出来，
          你看一遍 status 改 approved。
          
          [写文件]
          
          建世界全部完成。下一步建议：
          → 转到 character-atelier 捏主角 + 1-2 反派 + 1-2 配角。
```

---

## 8. 引用文档

- 资产 schema：[`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md) 第 5、6 节
- pipeline：[`docs/design/02-pipeline-architecture.md`](../../docs/design/02-pipeline-architecture.md) 第 4 节
- 与审稿的接口（境界匹配）：[`skills/novel-quality-auditor/SKILL.md`](../novel-quality-auditor/SKILL.md)

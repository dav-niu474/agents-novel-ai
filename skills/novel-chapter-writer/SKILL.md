---
name: novel-chapter-writer
description: 用于写网文章节正文的 skill。当用户说"写下一章 / 写第 N 章 / 把这章写完 / 草稿 / 改一下这章 / 修订 / polish / 改写 / 反 AI 味改写 / 把这段重写 / 续写"时使用。需要 outline/chapters/chapter-NNNN.md 章纲就绪（status: approved）。覆盖三个阶段：compose（运行时上下文编译，按相关性筛选 world / characters / memory / vault snippets，避免上下文膨胀）→ write（创作期 0.7，内嵌反 AI 味、首屏钩子、爽点节拍、对话引导、文风指纹注入）→ revise（5 种模式：polish / spot-fix / rewrite / rework / anti-detect）。产出 chapters/chapter-NNNN.md。写完后必须由 quality-auditor 审稿与沉淀状态（settle）。这是用户日常使用最高频的 skill，也是质量决定一切的核心环节。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: [novel-outline-architect]
  upstream_assets: [outline/chapters/chapter-NNNN.md, world/*, characters/*, memory/*, blueprint.md]
  downstream_skills: [novel-quality-auditor]
  downstream_assets: [chapters/chapter-NNNN.md]
  external_capabilities: [llm]
soft_depends_on:
  upstream_assets: [vault/snippets/, vault/style-fingerprints/]
---

# Novel Chapter Writer · 章节正文创作

把章纲展开成正文。这是整个 Studio 最高频、质量决定一切的 skill。

⚠️ 写正文不是 prompt-and-pray。我们走 **compose（编译） → write（创作） → revise（修订）** 三阶段，每个阶段有明确的输入 / 输出 / 温度。

⚠️ **反 AI 味是写正文的硬要求**。这本书读起来是不是 AI 写的，决定了能不能在起点 / 番茄活下去。

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- 章纲（outline/chapters/chapter-NNNN.md）已 approved，要写正文
- 已写章节需要修订（polish / spot-fix / rewrite / rework / anti-detect）
- 用户说"续写 / 接着写 / 把上次卡住的地方写完"

❌ 不要使用：
- 章纲不存在或没 approved → 先回 `novel-outline-architect`
- 用户想审稿 → `novel-quality-auditor`
- 用户想改大纲 / 节奏 → `novel-outline-architect`
- 用户想存桥段做素材 → `novel-asset-vault`

---

## 2. 输入与输出契约

### 输入（必需）

| 输入 | 用途 |
|------|------|
| `outline/chapters/chapter-NNNN.md`（status: approved） | **唯一直接输入**，9 字段是写作硬契约 |
| `blueprint.md` 第 6、7、8、9 节 | 反 AI 味 / 文风指纹 / 排除项 / 字数 |
| `world/cheat-system.json` | 主角当前 tier 限制（不能超阶用能力） |
| `world/powers.json` | 主角当前境界 |
| `characters/<必出场角色>.md` 字段 3、5、8 | 性格内核 / 标志性细节 / 禁止写法 |
| `memory/current_state.json` | 章前角色位置 / 状态 / 携带物 |
| `memory/chapter_summaries.json` 最近 3 章 | 衔接连贯 |

### 输入（可选）
- `vault/style-fingerprints/style-*.json`（启用文风指纹时必读）
- `vault/snippets/`（compose 阶段按 tag top-3 注入）
- 用户 inline context（"这章对话再多一些"）

### 输出
- `chapters/chapter-NNNN.md`（status: draft）
- `outline/chapters/.runtime/chapter-NNNN.context.json`（v1 可选，运行时调试用）

---

## 3. 三阶段流水线

### 3.1 COMPOSE 阶段（上下文编译）

**目的**：避免把所有真相文件全塞进 prompt，导致 token 爆炸 + 主线模糊。

**温度**：N/A（这是个工具步骤，不调 LLM）

**输入相关性筛选规则**：

| 资产 | 筛选策略 |
|------|---------|
| `outline/chapters/chapter-NNNN.md` | 全文注入（章纲不能裁） |
| `world/worldview.md` | 只注入：本章涉及的 factions 段（按章纲第 2 字段角色立场反推） |
| `world/cheat-system.json` | 只注入：当前 tier 的 cap / cost / limits + 章纲对应 beat |
| `world/powers.json` | 只注入：当前境界条目 + 下一阶 |
| `characters/<id>.md` | 只读章纲第 2 字段中的角色，每人字段 1、3、5、8（不读 4 能力，因为 powers 已覆盖） |
| `memory/current_state.json` | 只注入：本章涉及角色的 character 子项 |
| `memory/particle_ledger.json` | 只注入：本章涉及角色的 items + 最近 5 章 cheat_consumption |
| `memory/pending_hooks.json` | 只注入：章纲 hookOps 引用到的 hooks |
| `memory/chapter_summaries.json` | 只注入：最近 3 章 summary_3lines + 当前卷的 chapter_summaries |
| `vault/snippets/` | 按章纲第 5 字段"爽点节拍"+ 第 6 字段"情绪"做 tag 筛选，top 3 |
| `vault/style-fingerprints/` | 全文注入（如启用） |

**输出**：一个结构化的 context 对象（v1 可以是 LLM 的内部 working memory，v2 落盘到 `.runtime/chapter-NNNN.context.json`）。

⚠️ 总 prompt token 应控制在 **15K 以内**（不算输出），否则模型会"忘记"前面要求。

### 3.2 WRITE 阶段（创作）

**温度**：0.7（标准）/ 0.6（启用文风指纹时）

**目的**：把 compose 后的精简上下文转成 3500 字左右的正文。

#### 3.2.1 写作前自检（pre-write checklist）

WRITE 阶段开始前，必须确认（**v1.3 新增第 7 项：事件链字数预检**）：

- [ ] 章纲 9 字段全有
- [ ] 必出场角色的 character.md 都读到了字段 3、5、8
- [ ] memory/current_state 中本章涉及角色的位置 / 状态明确
- [ ] cheat-system.json 当前 tier 限制清楚（"主角现在不能用 Tier 2 能力"）
- [ ] 章纲第 8 字段"不写"的禁忌清单内化
- [ ] 章纲第 7 字段"字数 / 节奏"的目标值
- [ ] **事件链字数预检（v1.3）**：章纲第 3 字段事件数 × 平均事件预期字数（默认 500）≥ target_words × 0.85
  - 例：target_words = 3500，事件数 = 5，则 5 × 500 = 2500 < 3500 × 0.85 = 2975 ❌ **不足**
  - 例：target_words = 3500，事件数 = 7，则 7 × 500 = 3500 ≥ 2975 ✅ **足够**
  - **不足时不要硬写**——回 `novel-outline-architect` 走 rework，让它补 1-2 个事件 / 加深现有事件描写权重
  - 章纲若已有 `estimated_words` frontmatter 字段（v1.3 优化），直接用它作为门槛

任一项不满足，**回 outline-architect / character-atelier / studio**，不要继续。

> **v1.3 学习背景**：v1.2《吞天魔帝》前 5 章实战中 5 章字数全部偏短（target 3500，实际均 2616），74.7% 达成率。根因是 5 个事件 × 500 字 = 2500，贴近软范围下沿 2975 但低于 target 3500 一截。修复策略是上面这条 pre-check + 3.2.6 节的硬范围 alert + 3.3 节新增 extend 修订模式。

#### 3.2.2 首屏钩子规则（前 200 字）

⚠️ 起点 / 番茄读者前 200 字（约 5-7 段）决定是否继续读。前 200 字必须有以下至少 1 项：

- **冲突进行时**：开场角色已经在矛盾里（不要"今天天气真好"开场）
- **悬念**：未解之谜 / 未答之问
- **承诺**：暗示后续高潮（"他不知道，今晚会改变一切"——这种要克制）
- **场景钩子**：异常的画面 / 反常的细节（不解释为什么）

⚠️ 不允许的开场：

- ❌ "X 月 X 日，宜：开新书"（仪式感开场）
- ❌ "在一个名为 X 的世界里 ..."（设定堆砌开场）
- ❌ "他叫林烬"（自我介绍开场）
- ❌ "天空是蔚蓝的"（环境堆砌开场）

#### 3.2.3 反 AI 味规则（详见 [`references/anti-ai-patterns.md`](./references/anti-ai-patterns.md)）

3 类约束（v1 内嵌核心规则，详细词表见引用文档）：

##### 类 1：高频禁用词

避免 LLM 高频但读者会疲劳的词。**每章不超过 2 次**：

> 不可思议 / 震撼 / 目瞪口呆 / 缓缓 / 竟然 / 那是一种 / 在他看来 / 与其说 / 不仅仅 / 一时之间 / 顿时 / 突然 / 忽然 / 莫名 / 仿佛

每个题材有专属 fatigue 词，从 blueprint.md 第 6 节读取。

##### 类 2：禁用句式

- ❌ "他眉头一皱，发现事情并不简单"（万能侦探腔）
- ❌ "X 是一种难以言喻的感觉"（描述无能）
- ❌ "时间仿佛凝固了"（氛围堆砌）
- ❌ "心中泛起一阵涟漪"（情绪套话）
- ❌ 4 字成语连用 ≥ 3（成语堆砌）
- ❌ 长形容词列举（"那个高大、英俊、冷峻、神秘的男人"）

##### 类 3：必备元素（每章至少 1 项）

- 五感描写（味道 / 触感 / 异常的视觉细节）
- 不规则的小动作（反映角色性格 / 情绪）
- 具体物件（不是"宝剑"而是"剑柄缠了三圈牛皮的青锋"）
- 时间 / 空间锚点（"申时 / 鸡叫前后 / 三步外"，不是"过了一会"）

#### 3.2.4 对话占比规则

- 默认 30-45%（手机阅读，对话推进剧情比叙述快）
- 可被章纲第 7 字段覆盖（独处章可以低到 15%）
- 长对话不连续超过 5 轮一来一回（中间要插小动作 / 心理 / 环境）

#### 3.2.5 段落节奏

手机阅读：

- 每段 2-4 句
- 每句 < 30 字（中文）
- 一段不要超过 120 字
- 对话独占一行

#### 3.2.6 字数治理（length governance）

借鉴 inkos：

- 目标字数 = 章纲 target_words（默认 3500）
- 软范围 = target ± 15%（2975 - 4025）
- 硬范围 = target ± 25%（2625 - 4375）

写完后字数检查（**v1.3 强化报警分级**）：

- 在软范围 → ✅ 直接保存
- 在硬范围但不在软范围 → ⚠️ 记一条 **length warning**，但保存（quality-auditor D33 扣 -3）
- 跌出硬范围 → 🚨 **length critical**，进入 normalizer 单 pass（压缩 / 扩展），**1 次后仍超就保存 + telemetry 报警 + status 保留 draft 等待用户决策**（D33 扣 -5）

⚠️ 不允许"硬截断"（在中间挥刀切掉一半），只允许重写式压缩 / 扩展。

##### 写完后强制自检（v1.3 新增）

写完正文后立即对实际字数做"硬范围 alert"：

```
actual = 实际可见字符数（不含 frontmatter / markdown 标记 / 空白）
if actual < target × 0.75:                      # 例 < 2625（target 3500）
    raise length_critical
    建议触发：revise mode = extend（不是 rewrite）
    log 一条 progress/logs/<date>.jsonl: {phase: "length-check", critical: true}
elif actual < target × 0.85:                    # 例 < 2975
    record length_warning
    建议触发：revise mode = extend（可选）或保留 warning 进 settle
elif actual <= target × 1.15:                   # 软范围
    pass
elif actual <= target × 1.25:                   # 软外硬内（超长）
    record length_warning
    建议：polish 模式压缩
else:                                           # > target × 1.25
    raise length_critical
    建议：rewrite 模式重写更紧凑
```

> **v1.3 实战教训**：v1.2《吞天魔帝》5 章中第 3、5 章跌出硬范围下沿（2537 / 2334），第 1、2、4 章在硬内软外（2757 / 2732 / 2718）。问题在写前没拦——chapter-writer 接到 5 个事件章纲就开始写，没估算字数总和。v1.3 由 3.2.1 节 pre-check 在写前拦截，由本节在写后兜底。

#### 3.2.7 主角能力校验

在 WRITE 时，每次主角使用金手指 / 修真技能，自动对照 cheat-system.json 的当前 tier：

- 主角能用？✅
- 超阶？❌ 立刻拒绝这一段，重写

#### 3.2.8 文风指纹注入（启用时）

读 `vault/style-fingerprints/style-*.json` 的 stats / fatigue / mannerisms，作为 prompt 的"风格段"附加。

#### 3.2.9 输出格式

```markdown
---
asset_type: chapter
chapter_no: 31
volume_no: 1
title: <章节标题>
status: draft
version: 1
word_count: 3487
written_at: <ISO>
maintained_by: novel-chapter-writer
audit_score: null
---

# 第 31 章 · <章节标题>

<正文，遵守上面所有规则>
```

⚠️ 不要在正文里出现 markdown 围栏（```）或多余的 frontmatter。如 LLM 误输出，post-process 剥离。

### 3.3 REVISE 阶段（修订）

**温度**：0.5（标准）/ 0.4（spot-fix） / 0.7（rewrite / rework）/ 0.55（extend，v1.3 新增）

6 种模式（v1.3 新增 extend）：

#### 模式 1：polish（润色）

**适用**：审稿 minor issues / 用户说"语言再打磨一下"

**操作**：
- 减字（删冗余）
- 优化句式（去高频词）
- 修小错（错别字 / 标点）

**保留**：剧情、事件、对话主体不变。

#### 模式 2：spot-fix（定点修复）

**适用**：审稿 major issues 涉及具体段落 / 用户说"第 3 段那里改一下"

**操作**：
- 只改 issue 涉及的段落
- 其他段落 100% 保留

**输入**：审稿报告或用户具体指出的位置 + 原文

#### 模式 3：rewrite（整章重写）

**适用**：审稿 critical 问题 / 多个 major / 用户说"整章重写"

**操作**：
- 章纲不变
- 全章重写
- 旧版本归档到 `chapters/.snapshots/chapter-NNNN.v{N}.md`
- 新版本 version + 1

**保留**：章纲（第 1-9 字段）。

#### 模式 4：rework（连章纲一起重做）

**适用**：审稿发现章纲本身就有问题（如"必发生事件"自相矛盾）

**操作**：
- 回到 `novel-outline-architect` 改章纲
- 章纲改完后再用 rewrite 模式写正文

⚠️ rework 实际是跨 skill 协作，本 skill 只负责检测并提示用户。

#### 模式 5：anti-detect（反 AI 味专项）

**适用**：AIGC 检测发现某章 AI 痕迹太重 / 用户说"反 AI 味改写"

**操作**：
- 不改剧情
- 重点重写"AI 高频词 / 句式 / 节奏"
- 注入更多五感 / 不规则小动作 / 具体细节
- 提高对话占比（如果原文太叙述）

**温度**：0.5

#### 模式 6：extend（v1.3 新增 - 字数补全）

**适用**：
- 章纲事件链已合理但写出来字数偏短（length warning / length critical）
- 用户说"扩写 / 加长 / 补字"
- 3.2.6 节字数治理建议 `revise mode = extend`

**操作**：
- **保留章纲事件链 + 章纲钩子 + 章纲爽点节拍 100% 不动**
- **保留正文已有段落（不删不改）**——这是 extend 与 rewrite / polish 的核心区别
- 只在事件链相邻段落之间**插入**新段落，补：
  - 五感锚点（特别是嗅觉 / 触觉）
  - 不规则小动作（角色标志性细节）
  - 具体物件细节（替换原文的"宝剑"等类指词）
  - 一两段更密的环境 / 心理描写
  - **必要时由 outline-architect 补 1-2 个"过渡事件"**（不是新冲突），由 chapter-writer extend 阶段消费

**温度**：0.55（比 polish 高一点，比 anti-detect / rewrite 低）

**输入**：
- 原文 chapter-NNNN.md
- 章纲（再读一次）
- length warning / critical 的具体差距值（例：差 600 字到 target）
- 角色 character.md 字段 5 标志性细节（用于"加哪些不规则小动作"）

**操作步骤**：

```
1. 计算缺口：gap = target_words - actual_words
2. 按 "每段补 60-100 字" 估算需要插入的段数：n = ceil(gap / 80)
3. 选定插入点（5 个候选优先级）：
   a. 主角内心戏可加深的转折点
   b. 重要场景切换前后（让读者"喘口气"）
   c. 关键对话之间的"沉默"段
   d. 动作场面前的环境锚定
   e. 章末"留白" → 加一段感官余味
4. 每个插入点写 2-4 句新段落，符合 anti-ai-patterns 规则
5. 写完重跑 3.2.6 字数自检
```

**保留**：章纲所有字段 + 原文已有段落顺序与内容。

**注意事项**：
- ❌ 不能借 extend 的名义"加新冲突"——那是 rework 该做的
- ❌ 不能借 extend 把章纲第 8 字段"不写"清单的事写进去
- ❌ 不能借 extend 让主角境界突破或金手指越阶
- ✅ 可以加深现有事件——例：原文一句"林烬解析了灵草"扩成三段（伸手前的犹豫 / 解析时的烫感细节 / 解析后的余味）

#### REVISE 控制规则

- 默认每章 audit-revise 循环 1 轮（避免无限循环）
- 1 轮后仍有 critical issues：保留章节 status: draft，issues 列入审稿报告，留给用户
- 用户可以手动触发额外 revise（"再修一次"）
- 每次 revise 必须保留旧版本到 snapshots
- **v1.3 新增**：length critical 触发 extend 模式时不计入"1 轮上限"——extend 是字数补全，不是质量修订

---

## 4. 工作流

### 工作流 A：标准写章（默认）

触发：用户说"写第 N 章 / 写下一章 / 把第 N 章写完"。

```
1. 检查 chapter-NNNN.md 章纲是否存在 + status: approved
   缺失 → 转 outline-architect 走 PLAN
2. COMPOSE：相关性筛选生成精简上下文
3. WRITE：温度 0.7，遵守反 AI 味 + 首屏钩子 + 字数治理
4. 输出 chapters/chapter-NNNN.md（status: draft）
5. 提示用户：可以审稿了（→ quality-auditor）
```

### 工作流 B：批量写多章

触发：用户说"写下面 5 章 / 一次写 3 章"。

```
1. 检查后续章纲是否齐全
   缺失 → 警告，按"写一章 → PLAN 下一章 → 写下一章"循环
2. 串行执行工作流 A
3. ⚠️ 每章写完先 audit + settle 再写下一章（否则后续章节会基于过时 memory）
```

⚠️ v1 不强制串行 audit + settle，但强烈建议。否则连写 5 章后真相文件会脏。

### 工作流 C：修订（按模式）

触发：用户说"polish / spot-fix / rewrite / anti-detect / extend"或审稿后转 revise。

```
1. 读章节 + 审稿报告（如有）
2. 按模式执行（v1.3 共 6 种模式：polish / spot-fix / rewrite / rework / anti-detect / extend）
3. 旧版本归档到 .snapshots/
4. 写新版本，version + 1
5. 触发 quality-auditor 重新审稿（spot-fix / extend 例外，可只对修改段落审）
```

**特别说明（v1.3）**：
- length warning / critical 优先用 `extend` 模式，不要直接 rewrite
- extend 失败（gap 太大、章纲事件链确实不够）→ 转 rework，回 outline-architect 补事件

### 工作流 D：续写（卡住后接着写）

触发：用户说"接着写 / 续写 / 上次卡住了"。

```
1. 读已存在的 chapters/chapter-NNNN.md（可能是部分写完）
2. 读章纲第 3 字段"必发生事件"对照已写部分，确定从哪个事件开始接
3. 按 WRITE 阶段规则继续写
4. 合并：保留已写部分 + 续写部分
```

⚠️ 续写要保持文风一致。读已写部分的最后 500 字作为风格参考。

---

## 5. 关键规则

### R1：章纲是硬契约

不能擅自加事件 / 改主角立场 / 改钩子。要改 → 先改章纲。

### R2：反 AI 味强制内嵌

每章必须遵守"高频禁用词 ≤ 2 次 / 禁用句式 0 次 / 必备元素 ≥ 1 项"。

### R3：金手指能力 tier 校验

主角不能超阶用能力。每次写到主角发动金手指，对照 cheat-system.json.stages[当前 tier].cap。

### R4：性格内核不可破

每个出场角色对照 character.md 字段 3。决策模式 / 情绪锚点不能突变。

### R5：字数 ±15%，禁止硬截断；length critical 走 extend 不走 rewrite

软范围内 OK，超出软范围记 length warning，跌出硬范围记 length critical 走 normalizer / extend 单 pass。**跌出硬范围下沿（< target × 0.75）时优先 `extend` 模式补字而不是 rewrite**——v1.3 新增模式，保留事件链、保留已有段落、只插入感官 / 心理 / 环境段。详见 3.2.6 节与 3.3 节模式 6。

### R6：默认 status: draft，等待审稿

写完不是 approved。**必须经过 quality-auditor 审稿 + revise（必要时） + settle 后才能 approved**。

### R7：写前自检 6 项不能跳

3.2.1 节那 6 个 checklist 项。任一缺失，回上游 skill 不要硬写。

### R8：旧版本永不丢失

每次 revise 前归档到 .snapshots/，文件名带 version。

### R9：输出纯净

正文不含 markdown 围栏 / 多余 frontmatter / 调试日志。

---

## 6. 与其他 skill 的协作

### 上游
- `novel-outline-architect`：章纲是唯一直接输入
- `novel-worldforge`：cheat-system + powers 校验
- `novel-character-atelier`：角色卡

### 下游
- `novel-quality-auditor`：写完即转去审稿
- `novel-asset-vault`：审稿评分 ≥ 95 时建议把好桥段沉淀回 vault

### 旁支
- `novel-blueprint`：第 6、7、8、9 节是写作约束
- `memory/`：写前注入，写后由 quality-auditor settle 更新

---

## 7. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 章纲缺失 / 未 approved | 拒绝，回 outline-architect |
| 章纲第 3 字段事件链矛盾 | 拒绝，提示用户走 rework |
| 主角境界与 powers 冲突 | 拒绝写违规段落，提示是 chapter / powers 哪一边错了 |
| 字数硬范围外，1 次归一化仍失败 | 切到 `extend` 模式（v1.3）做字数补全，不要 rewrite；保存 + 长度 warning + 提示用户手动改章纲 |
| 字数 < target × 0.75（length critical） | 自动切 `extend`，1 次后仍不达 target × 0.85 → 转 rework 回 outline-architect 补事件 |
| 用户没装 vault style-fingerprint，blueprint 第 7 节又指定了风格指纹 | 警告：blueprint 引用了风格指纹但 vault 没有；询问是按通用风格写还是先做 fingerprint |
| 续写时检测到风格断裂 | 警告并继续，让 quality-auditor 后续修 |
| LLM 输出带 markdown 围栏 | post-process 剥离 |
| LLM 输出超长（5000+ 字） | 单 pass 归一化压缩 |
| LLM 输出过短 | 单 pass 归一化扩展，要求补五感 / 不规则小动作 / 内心戏 |

---

## 8. 示例对话

### 示例 1：写第 31 章

```
用户：写第 31 章。

writer：[读 chapter-0031.md] approved，9 字段齐。
       [COMPOSE 上下文]
       - chapter-0031.md 全文
       - blueprint 第 6/7/8/9 节
       - cheat-system Tier 1 限制（解析炼气-筑基功法，3 倍消耗时进入 Tier 2 但 31 章还没到）
       - powers 当前：炼气七层
       - 必出场角色：林烬 + 玉清师太 + 一个新 NPC
         - 林烬字段 3：观察后行动 / 对欺凌不主动报复
         - 师太字段 3：中立偏保护善的
       - memory current_state：林烬当前在外门 / 西厢
       - memory pending_hooks：hook-canjuan-origin 待 progress
       - 最近 3 章摘要
       - vault snippets top 3："智斗 / 试探 / 师徒对话" 标签
       
       [WRITE 阶段开始]
       [写出 3487 字，对话占比 47%（章纲允许）]
       
       [自检]
       - 高频禁用词：0 次"竟然"、1 次"缓缓"
       - 禁用句式：0 个
       - 必备元素：师太衣袖上的茶渍（具体物件）/ 林烬摸残卷（标志性细节）
       - 字数：3487 在软范围 [2975, 4025]
       - cheat tier：本章主角没真用，只是被动反应
       - 性格内核：林烬试探后停顿、不直接发问 ✓
       - 章纲事件链：5/5 事件全部命中
       - 不写：没有出现"赵天霄是玄霄宗内应"（已收）✓
       
       写到 chapters/chapter-0031.md，status: draft。
       
       下一步建议：跑一下 quality-auditor 审稿。
```

### 示例 2：anti-detect 修订

```
用户：第 12 章 AIGC 检测分数太高，反 AI 味改写一下。

writer：[读 chapters/chapter-0012.md + audit/reports/chapter-0012.audit.md]
       
       检测到的 AI 痕迹：
       - "缓缓" 出现 6 次
       - "在他看来" 出现 4 次
       - 4 字成语连用 8 处
       - 段落都偏长（平均 5 句，超出 2-4 句）
       - 5 段连续叙述无对话
       
       [REVISE 模式 anti-detect，温度 0.5]
       重写要点：
       - 替换"缓缓"为具体动作（"半秒后才动"/"一拍接一拍地"）
       - 拆长段为短句
       - 在第 5-9 段插入 1-2 轮对话
       - 加 2 个不规则小动作（师太擦杯沿 / 林烬摸残卷）
       - 加 1 个气味锚点（药味浓）
       
       [输出新版本]
       - 字数 3520（软范围内）
       - 高频词命中：0 次"缓缓" / 1 次"在他看来"
       - 段落平均 3 句
       - 对话占比从 22% 升到 38%
       
       旧版本归档到 chapters/.snapshots/chapter-0012.v1.md
       新版本 version: 2，status: draft
       
       建议重新跑 quality-auditor 验证。
```

---

## 9. 引用文档

- 章纲 schema：[`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md) 第 8.3 节
- pipeline COMPOSE / WRITE / REVISE 详解：[`docs/design/02-pipeline-architecture.md`](../../docs/design/02-pipeline-architecture.md) 第 5.2 节
- 反 AI 味词表与句式：[`references/anti-ai-patterns.md`](./references/anti-ai-patterns.md)
- 文风指纹格式：[`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 7.6 节

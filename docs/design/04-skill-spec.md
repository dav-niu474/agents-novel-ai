# Skills 规范 · Novel Studio

> 9 个 skill 的命名、目录结构、frontmatter 规范、依赖声明、激活描述 (description) 写法。
> 这份文档是所有 skill 作者**编写 SKILL.md 时的标准**。

---

## 1. Skills 全景

| # | Skill 名 | 在 Pipeline 中的位置 | 主导阶段 |
|---|---------|---------------------|---------|
| 0 | `novel-studio` | 根 skill / 总编排 | 全部 |
| 1 | `novel-market-radar` | 灵感期 | ① |
| 2 | `novel-blueprint` | 开书期 | ② |
| 3 | `novel-worldforge` | 大纲期 - 世界 / 金手指 | ③ |
| 4 | `novel-character-atelier` | 大纲期 - 角色 | ③ |
| 5 | `novel-outline-architect` | 大纲期 - 三级大纲 + 写作期 PLAN | ③④ |
| 6 | `novel-chapter-writer` | 写作期 - COMPOSE / WRITE / REVISE | ④ |
| 7 | `novel-quality-auditor` | 写作期 - AUDIT / SETTLE | ④ |
| 8 | `novel-asset-vault` | 灵感期 + 写作期素材辅助 + 完结期复盘 | ①④⑤ |

---

## 2. 命名规范

### 2.1 Skill 命名

- 全部小写，连字符分隔（kebab-case）。
- 必须以 `novel-` 开头，便于 Agent runtime 识别同一族 skill。
- 第二段表达"做什么"：`-studio` / `-blueprint` / `-worldforge` / `-character-atelier` / `-outline-architect` / `-chapter-writer` / `-quality-auditor` / `-market-radar` / `-asset-vault`。
- 长度建议 2-3 段，最多 4 段。

### 2.2 不允许的命名

- ❌ 使用版本号：`novel-writer-v2`
- ❌ 使用客户端名：`novel-claude-writer`
- ❌ 使用语言名：`novel-zh-writer`（除非确有差异化）

---

## 3. 目录结构

每个 skill 是 `skills/` 下的一个独立目录：

```
skills/
└── novel-chapter-writer/
    ├── SKILL.md                  # 必需。skill 主文件
    ├── references/               # 可选。深度引用文档
    │   ├── writing-rules.md
    │   ├── anti-ai-patterns.md
    │   └── style-fingerprint-format.md
    ├── examples/                 # 可选。示例
    │   └── sample-chapter.md
    └── scripts/                  # 可选。v2 引入 CLI 时使用
```

### 3.1 SKILL.md 是唯一必需文件

所有可被装载的 skill 入口都是 `SKILL.md`。

### 3.2 references/ 目录

`SKILL.md` 推荐保持 < 500 行，超出部分放到 `references/`：

- 详细规则（如反 AI 味词表）
- 长 schema 定义
- 大段示例

`SKILL.md` 引用方式：

```markdown
> 反 AI 味的完整词表见 [`references/anti-ai-patterns.md`](./references/anti-ai-patterns.md)。
```

Agent runtime 在加载 skill 时通常只读 SKILL.md，references 由 LLM 按需读取。

### 3.3 examples/ 目录

可选，放几个简短的"输入 → 输出"示例，帮 LLM 理解期望格式。

---

## 4. SKILL.md frontmatter 规范

每个 SKILL.md 顶部必须有 YAML frontmatter：

```yaml
---
name: novel-chapter-writer
description: 用于写网文章节正文的 skill。当用户说"写下一章 / 写第 N 章 / 把这章写完 / 草稿"或者已经有章节细纲（outline/chapters/chapter-NNNN.md）等待落成正文时使用。覆盖 compose（运行时上下文编译）→ write（创作期 0.7）→ revise（修订 0.5）三个阶段，内嵌反 AI 味、首屏钩子、爽点节拍、文风指纹注入规则。需要 outline-architect 先产出章纲，写完后由 quality-auditor 接手审稿。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: [novel-outline-architect]
  upstream_assets: [outline/chapters/chapter-NNNN.md, world/*, characters/*, memory/*]
  downstream_skills: [novel-quality-auditor]
  downstream_assets: [chapters/chapter-NNNN.md]
  external_capabilities: [llm]
---
```

### 4.1 字段语义

| 字段 | 含义 | 必需 |
|------|------|------|
| `name` | skill 标识，与目录名一致 | ✅ |
| `description` | 触发说明，**LLM 用来决定是否激活此 skill** | ✅ |
| `version` | semver | ✅ |
| `maintained_by` | 维护者（v1 都是 novel-studio） | ✅ |
| `depends_on` | 依赖声明（v1 仅文档化，v2 由 CLI 校验） | ✅ |

### 4.2 description 写作要点（最关键字段）

description 是 Agent runtime 选择 skill 的唯一信号。inkos 的 SKILL.md description 是个反例（500 词，关键词全混在一起）。我们的标准：

✅ **包含三类信号**：

1. **触发场景**：用户会说什么 / 需要什么时机激活
2. **能力范围**：覆盖哪些工作流，特别是和兄弟 skill 的边界
3. **依赖前置**：需要哪些上游产物已就绪

✅ **使用关键词包**：自然提及"写章 / 写正文 / 草稿 / 章纲 / 反 AI 味 / 首屏钩子"等高密度关键词。

✅ **句式建议**：

```
用于 [核心能力] 的 skill。当用户说"[触发短语 1] / [触发短语 2] / [触发短语 3]"
或者 [触发条件] 时使用。覆盖 [子流程 1] → [子流程 2] → [子流程 3]，
内嵌 [关键能力 1]、[关键能力 2] 规则。需要 [上游 skill] 先产出 [上游产物]，
写完后由 [下游 skill] 接手 [下游动作]。
```

❌ **不要做的事**：

- 描述实现细节（"使用 GPT-4o + temp 0.7"）
- 列大段命令参考（用 SKILL.md 正文承载）
- 重复 frontmatter 其他字段已有的信息

---

## 5. SKILL.md 正文结构

每个 skill 的 SKILL.md 正文遵循统一骨架：

```markdown
# <Skill 标题>

<一段话总览>

## 1. 何时使用 / 何时不要使用

✅ 使用：
- 场景 A
- 场景 B

❌ 不要使用：
- 场景 X（应该交给 sibling-skill）

## 2. 输入与输出契约

### 输入（必需）
- 资产 1
- 资产 2

### 输入（可选）
- 资产 3

### 输出
- 资产 X

## 3. 工作流

### 工作流 A：<场景描述>
步骤 1 ...
步骤 2 ...

### 工作流 B：<场景描述>
...

## 4. 关键规则

- 规则 1
- 规则 2

## 5. 与其他 skill 的协作

- 上游：xxx-skill 必须先做 ...
- 下游：xxx-skill 接手 ...

## 6. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| ... | ... |

## 7. 示例（可选）

完整对话或文件示例

## 8. 引用文档

- [`references/xxx.md`](./references/xxx.md)
```

---

## 6. 9 个 skill 的依赖图

```
                      novel-studio
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  market-radar      asset-vault        blueprint
        │                 │                 │
        └────────┬────────┘                 │
                 │                          ▼
                 │                    worldforge
                 │                          │
                 │                          ▼
                 │                  character-atelier
                 │                          │
                 │                          ▼
                 │                  outline-architect
                 │                          │
                 │                          ▼
                 └─────────────────► chapter-writer
                                            │
                                            ▼
                                    quality-auditor
                                            │
                                            └──── 写后回流 memory
```

### 6.1 依赖类型

- **强依赖（hard）**：上游 skill 必须先输出某资产
- **软依赖（soft）**：上游可选，没有也能跑（但质量会降）
- **互补（peer）**：两个 skill 平级，可以反复来回

### 6.2 9 个 skill 的依赖矩阵

| Skill | 强依赖（必须先有） | 软依赖（可选） |
|-------|------------------|---------------|
| `novel-studio` | — | — |
| `novel-market-radar` | — | `novel.json`（用于按方向定向扫） |
| `novel-blueprint` | — | `vault/inspirations/`、`audit/trends/` |
| `novel-worldforge` | `blueprint.md` | `vault/inspirations/`（找设定灵感） |
| `novel-character-atelier` | `blueprint.md`、`world/worldview.md` | `vault/inspirations/` |
| `novel-outline-architect` | `blueprint.md`、`world/*`、`characters/_index.json` | `memory/pending_hooks.json`（写后续章纲时） |
| `novel-chapter-writer` | `outline/chapters/chapter-NNNN.md`、`world/*`、`characters/*` | `memory/*`（写后续章节时必需）、`vault/snippets/`、`vault/style-fingerprints/` |
| `novel-quality-auditor` | `chapters/chapter-NNNN.md`、`outline/chapters/chapter-NNNN.md`、`memory/*`、`world/*` | `vault/style-fingerprints/`（启用文风指纹时必需） |
| `novel-asset-vault` | — | `chapters/*`（从已写章节抽好桥段时） |

---

## 7. 每个 skill 的 description 蓝本（v1 第一版）

下面给出每个 skill 的 description 范本，后续 SKILL.md 实现时可微调：

### 7.1 `novel-studio`（根）

> 网文创作 Studio 的根 skill 与导航中枢。当用户说"我要写本网文 / 看看这个项目什么状态 / 这本书写到哪了 / 整体导出 / 切换到另一本书 / 不知道下一步该做什么"时使用。负责项目初始化（创建 novel.json 与目录骨架）、读取并展示项目状态、根据当前阶段推荐下一步行动、跨 skill 编排（比如"开书一条龙"涵盖 blueprint → worldforge → character-atelier → outline-architect 全流程）。这是用户的默认入口，遇到不确定该用哪个 skill 时优先激活它。

### 7.2 `novel-market-radar`

> 用于网文平台热榜分析与选题建议的 skill。当用户说"起点最近什么火 / 番茄热门题材 / 我应该写什么 / 看看竞品 / 现在玄幻还能写吗 / 帮我做选题"时使用。能扫描起点 / 番茄 / 晋江 / 刺猬猫 / 知乎盐选等平台的新书榜、推荐榜、月票榜，提取题材分布、爽点关键词、卖点结构，输出 trend report 与适合切入的子赛道。需要联网搜索能力。结果可作为 blueprint 阶段的输入参考。

### 7.3 `novel-blueprint`

> 用于把模糊脑洞固化为开书蓝图（blueprint.md）的 skill。当用户说"我有个想法 / 帮我开一本书 / 给我几个开书方向 / 这个题材怎么开 / 主角设定 / 金手指设计 / 卖点 / 前 30 章承诺"时使用。覆盖 10 步定盘工作流（一句话定盘、题材定位、主角画像、金手指、卖点钩子、反 AI 味、文风指纹、排除项、章字数、长期意图），与用户协商而非 AI 单方面决定。开书完成后产出 novel.json 和 blueprint.md，blueprint.md 是后续所有 skill 的最高契约。

### 7.4 `novel-worldforge`

> 用于建世界观与设计金手指的 skill。当用户说"建世界 / 世界观 / 设定 / 体系 / 力量等级 / 设计金手指 / 主角的能力 / 解析流 / 系统流"时使用。需要 blueprint.md 已 approved。产出 world/worldview.md（世界观骨架）、world/cheat-system.md（金手指六要素：定义/触发/输出/升级阶梯/限制/节拍）、world/powers.md（境界 / 力量等级）。**金手指设计是中文网文核心差异化资产**，必须输出结构化 JSON 供 quality-auditor 后续校验"境界匹配"。

### 7.5 `novel-character-atelier`

> 用于设计角色与人设的 skill。当用户说"捏个主角 / 设计反派 / 这个 NPC 怎么写 / 角色卡 / 人设 / 关系网"时使用。需要 blueprint.md 与 world/worldview.md 已就绪。产出 characters/<role>-<slug>.md（每个角色一份卡，含一句话画像 / 基础档案 / 性格内核 / 能力成长 / 标志性细节 / 关系网 / 弧光设计 / 禁止写法）、characters/relationships.md（关系网）、characters/_index.json（索引）。一开书只先写主角 + 1-3 个反派 + 1-2 个核心配角，剩余按需补。

### 7.6 `novel-outline-architect`

> 用于设计三级大纲与单章意图的 skill。当用户说"写大纲 / 总纲 / 卷纲 / 细纲 / 章纲 / 章节细纲 / 节奏 / 卡点 / 高潮 / 下一卷怎么写 / 下一章写什么"时使用。需要 blueprint.md、world/*、characters/* 已就绪。产出 outline/master.md（5 幕主线）、outline/volumes/volume-NN.md（卷纲，5 段式节奏）、outline/chapters/chapter-NNNN.md（章纲，9 字段：一句话目标 / 必出场角色 / 必发生事件 / 钩子 / 爽点节拍 / 情绪曲线 / 字数节奏 / 不写 / 与状态耦合）。也负责写作期 PLAN 阶段的章意图编译（读 pending_hooks 决定开 / 进 / 收哪些钩子）。

### 7.7 `novel-chapter-writer`

> 用于写网文章节正文的 skill。当用户说"写下一章 / 写第 N 章 / 把这章写完 / 草稿 / 改一下这章 / 修订 / polish / 改写"时使用。需要 outline/chapters/chapter-NNNN.md 章纲就绪。覆盖 compose（运行时上下文编译，按相关性筛选避免上下文膨胀）→ write（创作期 0.7，内嵌反 AI 味、首屏钩子、爽点节拍、文风指纹注入）→ revise（5 种修订模式：polish / spot-fix / rewrite / rework / anti-detect）三个阶段。产出 chapters/chapter-NNNN.md。写完后必须由 quality-auditor 审稿与沉淀状态。

### 7.8 `novel-quality-auditor`

> 用于审稿、AIGC 检测与长期记忆沉淀的 skill。当用户说"审一下这章 / 检查前后矛盾 / 这章读起来怎么样 / AIGC 检测 / 反 AI 味 / 全书一致性 / 跑一遍审计"或写完一章准备 settle 时使用。覆盖 audit（33 维度连续性 + 设定一致 + 节奏爽点 + 文风 + 大纲遵从）和 settle（从正文过度提取 9 类事实、输出 JSON delta、应用到 memory/* 8 个真相文件）两个阶段。产出 audit/reports/chapter-NNNN.audit.md 与更新后的 memory/*。也支持全书复盘（full-book-audit）。

### 7.9 `novel-asset-vault`

> 用于参考素材库管理与素材沉淀的 skill。当用户说"把这段话存下来 / 给我找类似的桥段 / 整理参考资料 / 灵感 / 金句 / 桥段 / 素材 / 复盘 / 写法分析 / 文风指纹 / 提取写法"时使用。维护 vault/inspirations（灵感卡）、vault/snippets（段落级素材）、vault/references（参考作品片段）、vault/style-fingerprints（风格指纹）四类资产 + vault/_index.json 索引。支持三种使用模式：灵感模式（开书 / 卡文时检索）、写作辅助模式（chapter-writer compose 阶段 top-3 注入）、风格注入模式（启用文风指纹后影响 chapter-writer + quality-auditor）。也负责完书复盘时把好桥段沉淀为下本书的素材。

---

## 8. Skill 版本与兼容

### 8.1 版本号

每个 skill 独立 semver。第一版从 `0.1.0` 起步。

| 升级类型 | 影响 |
|---------|------|
| Patch（0.1.X） | bug 修复、文案优化 |
| Minor（0.X.0） | 新增工作流、向后兼容 |
| Major（X.0.0） | 破坏性变更（资产 schema 变了 / 依赖关系变了） |

### 8.2 跨 skill 兼容性

skill 之间通过资产文件契约通信。改 skill 时：

- 改输出资产的 schema = 破坏性，所有下游 skill 受影响
- 改自己内部工作流 = 兼容
- 改 description = 兼容

破坏性变更必须更新本仓库 `docs/design/01-asset-model.md` 的 schema 章节，并提升相关 skill 的主版本号。

---

## 9. 编写新 skill 的 checklist

写一个新 skill 之前 / 之中 / 之后，对照下面清单：

### Before（设计阶段）

- [ ] 这个能力是否真的不能用现有 skill 完成？
- [ ] 它的输入资产、输出资产是什么？是否需要新增资产类型？
- [ ] 它在 pipeline 5 阶段中处于哪个阶段？
- [ ] 它会和哪些 skill 协作？是依赖、被依赖还是平级？

### During（实现阶段）

- [ ] frontmatter 5 个字段都填了吗？
- [ ] description 满足"触发场景 / 能力范围 / 依赖前置"三类信号？
- [ ] 正文遵循统一骨架（1-8 节）？
- [ ] 强依赖 / 软依赖明确写了？
- [ ] 错误处理有覆盖到"上游资产缺失"场景？

### After（提交阶段）

- [ ] 是否更新了 `docs/design/01-asset-model.md`（如果有新资产）？
- [ ] 是否更新了 `docs/design/02-pipeline-architecture.md`（如果改了流程）？
- [ ] 是否在 README 的"能力地图"表里加了一行？
- [ ] 是否提供了 examples/？

---

## 10. 与 Anthropic Skills 规范的对齐

我们参考了 [Anthropic Agent Skills 官方规范](https://docs.claude.com/en/docs/claude-code/skills) 和 inkos 的 SKILL.md 实践，做了以下对齐：

| Anthropic 规范项 | 我们的处理 |
|------------------|----------|
| `name` frontmatter | ✅ 必需，与目录名一致 |
| `description` frontmatter | ✅ 必需，触发说明 |
| 单文件 SKILL.md 入口 | ✅ |
| `references/` 子目录 | ✅ 推荐，深度文档放这里 |
| 渐进式披露（progressive disclosure） | ✅ SKILL.md 简洁，详情走 references |
| 跨平台兼容（Claude Code / Cursor / Kiro / OpenClaw） | ✅ 不依赖任何客户端特定能力 |

---

下一节：[`../roadmap.md`](../roadmap.md) 演进路线。

# 系统总览 · Novel Studio

> 这份文档解释 Novel Studio 的设计哲学、分层架构、与现有三个参考项目（inkos / webnovel-writer / AI-Novel-Writing-Assistant）的能力对位，以及为什么这样切分。

---

## 1. 设计哲学

### 1.1 一句话定位

**把"写一本网文"还原成可被 AI 全程接管的产线，让任何兼容 Skill 协议的 Agent runtime 都能直接驱动。**

### 1.2 三条不动摇的原则

1. **资产中心化（Asset-First）**：所有创作产物都是结构化资产，不是 prompt 里的临时上下文。大纲、角色、世界观、金手指、章节细纲、正文、素材都有明确 schema，可被任何 skill 复用、版本化、检索。
2. **流水线可拆可合（Pipeline-Composable）**：每个 skill 是一个原子能力，既能独立用，也能被根 skill `novel-studio` 编排成完整流水线（开书 → 写大纲 → 写细纲 → 写正文 → 审稿 → 修订）。
3. **Runtime 无依赖（Runtime-Agnostic）**：v1 不绑定任何 CLI、后端、数据库。任何能读写文件的 Agent 客户端（Claude Code、Cursor、Kiro、OpenClaw）都能直接用。文件即数据库。

### 1.4 v1.3 增补：作者侧元数据独立分层

> v1.2《吞天魔帝》前 5 章实战暴露了一个盲区：写到中段时作者**不知道自己昨天做了什么决定 / 这周写了几章 / 还欠读者多少债**。memory/ 管的是"故事还没忘"，但作者侧的过程元数据没人管。
>
> v1.3 新增 **`progress/` 子系统**作为第 4 类项目级资产，与 memory/ / vault/ / audit/ 平级。详见 [`05-progress-tracking.md`](./05-progress-tracking.md)。

### 1.3 从三个参考项目继承什么、放弃什么

| 维度 | 选择 | 理由 |
|------|------|------|
| 多 Agent 流水线（来自 inkos） | ✅ 继承 | 已被验证可写出 31 章 / 45 万字 / 100% 审计通过率 |
| 真相文件（来自 inkos） | ✅ 继承 + 扩展 | 7 个核心 + 1 个 vault（素材库），共 8 类长期记忆 |
| 33 维度审稿（来自 inkos） | ✅ 继承 | 直接抄 + 适配中文网文 |
| Skill / SKILL.md 形态（来自 inkos） | ✅ 全面采纳 | 这是用户原始诉求的核心 |
| 追读力系统（来自 webnovel-writer） | ✅ 部分继承 | Hook / Cool-point / 微兑现 / 债务追踪 → 整合进 quality-auditor |
| RAG + Reranker（来自 webnovel-writer） | ⚠️ 延后到 v2 | v1 用文件全文 + 简单 grep，已够前 50 章；超长篇再上向量库 |
| Story System / Phase 5 主链（来自 webnovel-writer） | ✅ 借鉴 | 影响了我们的 pipeline 设计 |
| 自动导演（来自 AI-Novel-Writing-Assistant） | ✅ 提炼为 blueprint skill | "小白也能完书"是 v1 必须保留的体验 |
| 写法引擎（来自 AI-Novel-Writing-Assistant） | ✅ 内嵌 chapter-writer | 文风指纹 + 去 AI 味是写手 skill 的内建能力 |
| Creative Hub Web UI（来自 AI-Novel-Writing-Assistant） | ❌ v1 不做 | v3 再做 |
| Prisma + Qdrant + Express 重栈 | ❌ 全部不要 | 与 runtime-agnostic 原则冲突 |
| 资产管理 UI（来自 NovelCraft） | ❌ v1 不做 | 资产模型保留，UI 留给 v3 |
| 中文网文工业化资产（金手指 / 套路 / 爽点） | ✅ 重点强化 | 三个参考项目都没把"金手指"提到一等公民，这是我们的核心差异化 |

---

## 2. 分层架构

```
┌────────────────────────────────────────────────────────────────────┐
│                          User / Author                             │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                       Agent Runtime Layer                          │
│       (Claude Code / Cursor / Kiro / OpenClaw / 自研客户端)         │
│         能力：自然语言对话、工具调用、Skill 装载、文件读写            │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼  装载 skills/
┌────────────────────────────────────────────────────────────────────┐
│                       Skill Layer (v1 交付物)                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              novel-studio (root, 编排器)                     │  │
│  └────┬──────────┬──────────┬──────────┬──────────┬─────────────┘  │
│       │          │          │          │          │                │
│   ┌───▼──┐   ┌───▼──┐   ┌───▼──┐   ┌───▼──┐   ┌───▼──┐             │
│   │blue- │   │market│   │world │   │chara-│   │outline                │
│   │print │   │radar │   │forge │   │cter  │   │arch- │             │
│   │      │   │      │   │      │   │atelr │   │itect │             │
│   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘             │
│   ┌──────┐   ┌──────┐   ┌──────┐                                   │
│   │chapt-│   │qua-  │   │asset-│                                   │
│   │er-   │   │lity- │   │vault │                                   │
│   │writer│   │audit │   │      │                                   │
│   └──────┘   └──────┘   └──────┘                                   │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼  读 / 写
┌────────────────────────────────────────────────────────────────────┐
│                       Asset Layer (文件即数据库)                    │
│                                                                    │
│   novel.json  blueprint.md                                         │
│   outline/{master, volumes/, chapters/}                            │
│   world/{worldview, cheat-system, powers}                          │
│   characters/{protagonist, antagonists/, supporting/}              │
│   chapters/                                                        │
│   memory/  (真相文件: 8 类)                                         │
│   vault/   (参考素材库)                                             │
│   audit/   (审稿报告 + 雷达扫描)                                    │
└────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────┐
│                  External Capabilities (按需调用)                   │
│        Web Search / Web Fetch / LLM (任意 model) / Image Gen        │
└────────────────────────────────────────────────────────────────────┘
```

四层职责：

- **Agent Runtime**：负责对话、Skill 装载、工具调用，不感知业务。
- **Skill Layer**：业务逻辑全部在 SKILL.md 里，告诉 Agent 怎么读资产、怎么调外部能力、怎么写资产。
- **Asset Layer**：纯文件系统。Markdown + JSON。任何 skill 都能读写。
- **External Capabilities**：联网搜索、网页抓取、LLM、图像生成等，由 runtime 透明提供。

---

## 3. 能力矩阵：Skill × 资产 × 外部能力

| Skill | 主要读 | 主要写 | 外部能力 |
|-------|--------|--------|----------|
| `novel-studio` | 全部 | `novel.json` | — |
| `novel-blueprint` | `vault/inspirations/`、`audit/trends/` | `blueprint.md`、`novel.json` | LLM |
| `novel-market-radar` | `novel.json` | `audit/trends/`、`vault/inspirations/` | Web Search、Web Fetch |
| `novel-worldforge` | `blueprint.md` | `world/*` | LLM |
| `novel-character-atelier` | `blueprint.md`、`world/*` | `characters/*` | LLM |
| `novel-outline-architect` | `blueprint.md`、`world/*`、`characters/*` | `outline/*` | LLM |
| `novel-chapter-writer` | `outline/chapters/chapter-NNNN.md`、`memory/*`、`world/*`、`characters/*`、`vault/snippets/` | `chapters/chapter-NNNN.md` | LLM |
| `novel-quality-auditor` | `chapters/*`、`memory/*`、`outline/*`、`world/*`、`characters/*` | `audit/reports/`、`memory/*` | LLM |
| `novel-asset-vault` | `vault/*` | `vault/*` | LLM、Web Fetch |

---

## 4. 与三个参考项目的对位

### 4.1 vs inkos

| inkos 概念 | Novel Studio 对应 | 差异 |
|------------|---------------------|------|
| 单个 SKILL.md 包含所有 workflows | 拆成 9 个 skill | 更易组合、更易换装 |
| 7 个真相文件 | 8 类长期记忆（新增 `subplot_board`、`emotional_arcs` 已在 inkos 里有，新增 `vault/`） | 同源 + 扩展 |
| Architect / Planner / Composer / Writer / Observer / Reflector / Normalizer / Auditor / Reviser 9 个内部 agent | 3 个面向用户的 skill（outline-architect / chapter-writer / quality-auditor） | 用户视角更简单，内部细节封装在 SKILL.md 里 |
| 题材：xuanhuan / xianxia / urban / horror / litrpg ... | 题材：玄幻 / 仙侠 / 都市 / 历史 / 科幻 / 末世 / 游戏 / 无限流 / 言情 / 灵异 ... | 中文网文谱系完整 |
| 没有"金手指"专门资产 | `world/cheat-system.md` 是一等公民 | **核心差异化** |
| 没有"参考素材库" | `vault/` 是一等公民 | **核心差异化** |

### 4.2 vs webnovel-writer

| webnovel-writer 概念 | Novel Studio 对应 | 差异 |
|----------------------|---------------------|------|
| `.story-system/MASTER_SETTING.json` | `novel.json` + `blueprint.md` | 类似定位 |
| `volumes/` + `chapters/` | `outline/volumes/` + `chapters/` | 命名对齐 |
| 追读力（Hook / Cool-point / 微兑现 / 债务） | `quality-auditor` 的 33 维度中包含 hook-ledger | 同源理念 |
| RAG + Reranker | v1 不做，v2 加 | 取舍：v1 简单优先 |
| Phase 5 主链（写前注入 + 写后沉淀） | `chapter-writer` 写前读 memory，`quality-auditor` 写后更新 memory | 同源 |
| Claude Code Plugin + Python 依赖 | 纯 SKILL.md，无 Python | 更轻 |

### 4.3 vs AI-Novel-Writing-Assistant

| AI-Novel-Writing-Assistant 概念 | Novel Studio 对应 | 差异 |
|----------------------------------|---------------------|------|
| 自动导演（一句话 → 整本可写） | `novel-blueprint` skill 的核心工作流 | 概念继承，剥离了 React UI |
| Creative Hub | `novel-studio` 的对话式编排能力 | 由 Agent runtime 天然提供，无需 UI |
| 写法引擎（提取 → 绑定 → 复用） | `chapter-writer` 内置 style fingerprint workflow | 简化为 skill 内嵌能力 |
| 章节执行 → 审核 → 修复主链 | `chapter-writer` → `quality-auditor` → revise workflow | 流程对齐 |
| 知识库 + 拆书 | `asset-vault` skill | 概念合并 |
| 标题工坊 | `blueprint` 内嵌标题生成 | 不单独抽 skill |
| 流派 / 类型管理 | `templates/` 目录 + `blueprint` 引用 | 不单独抽 skill |
| pnpm + React + Express + Prisma + Qdrant + LangGraph + Plate Editor | **全部不要** | runtime-agnostic |

---

## 5. 关键决策

### 5.1 为什么是 9 个 skill 而不是 1 个大 SKILL.md？

inkos 把所有 workflow 塞进单个 SKILL.md（655 行）。优势是装载简单，劣势是：

1. **Context 浪费**：用户只想写一章，却要 LLM 读完整个 Skill 描述（包括开书、雷达、AIGC 检测等不相关章节）。
2. **职责模糊**：同一个 SKILL 既负责开书又负责审稿，迭代时容易互相牵扯。
3. **无法选装**：用户不想要市场雷达功能，没法只装载子集。

我们采纳 Anthropic Agent Skills 的官方推荐：**每个 skill 干一件事，根 skill 负责导航**。这样：

- LLM 在用户说"写下一章"时只激活 `novel-chapter-writer`。
- 用户可以只装载需要的 skill，比如不需要 `market-radar` 就不装。
- 每个 skill 单独迭代、单独测试、单独发版。

### 5.2 为什么金手指 / 章节细纲 / 参考素材是一等公民？

中文网文工业化的三个核心资产：

1. **金手指**：决定主角的差异化与爽点节拍。inkos 没有专门资产，AI-Novel 也只有"故事引擎"概念。我们把它独立为 `world/cheat-system.md`，并在 `worldforge` skill 里有专门工作流。
2. **章节细纲**：起点 / 番茄作者的标准工作流是"卷纲 → 章纲 → 正文"，章纲（细纲）是不可省略的中间产物。inkos 直接 outline → write，跳过了章纲。我们补齐为 `outline/chapters/chapter-NNNN.md`。
3. **参考素材**：起点编辑会强调"素材积累决定章节质量上限"。我们把素材库抽出独立 skill `asset-vault`，支持金句、桥段、灵感卡的沉淀与检索。

### 5.3 为什么不做向量数据库？

v1 目标是"任意 Agent runtime 可用"。向量库需要：

- 额外的二进制（Qdrant / Chroma / FAISS）
- 额外的 embedding 模型 API key
- 启动 / 持久化复杂度

而前 50 章的网文，全文 grep + 真相文件投影已经够用。等到了 100+ 章的中长篇，再在 v2 引入可选的向量层。

### 5.4 为什么 Markdown + JSON 双轨？

- **Markdown**：人类可读、可手动改、易在 Git 里 review。
- **JSON**：机器可读、schema 化、不需要 LLM 解析就能写代码生成统计。

inkos 在 0.6.0 之后做了同样的事：truth file 的权威源是 JSON，Markdown 作为人类投影。我们直接采纳。

---

## 6. 不在 v1 范围

明确剔除以下功能，留给 v2 / v3：

- **CLI 工具链**（v2）
- **Web Studio UI**（v3）
- **守护进程 / 后台批量写章**（v2）
- **向量索引 / RAG**（v2）
- **EPUB / 平台格式导出**（v2）
- **AIGC 第三方检测 API 集成**（v2，v1 只做规则检测）
- **图像生成 / 封面生成**（v3）
- **多人协作 / Git 集成**（v3）
- **互动小说 / 分支叙事**（v3）

---

## 7. 文档导航

- 资产模型详情：[`01-asset-model.md`](./01-asset-model.md)
- Pipeline 编排：[`02-pipeline-architecture.md`](./02-pipeline-architecture.md)
- 长期记忆与素材沉淀：[`03-memory-and-vault.md`](./03-memory-and-vault.md)
- Skill 规范：[`04-skill-spec.md`](./04-skill-spec.md)
- **长文写作进度控制（v1.3 新增）**：[`05-progress-tracking.md`](./05-progress-tracking.md)
- 演进路线（含 v1.3 节）：[`../roadmap.md`](../roadmap.md)

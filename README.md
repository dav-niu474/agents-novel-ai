# Novel Studio · AI 全流程网文写作工作室

> 一个面向中文网文 + 全流程的 AI 创作 Studio。
> 第一版以 **Agent Skills** 形态交付：可被 Claude Code、OpenClaw、Cursor、Kiro 等任意兼容 Agent 直接装载的 SKILL 包。

---

## 这是什么

我们正在做的 Studio 把"写一本网文"拆成一条**可被 AI 全程接管**的产线，包含：

- **资产管理体系**：大纲 / 角色 / 世界观 / 人设 / 金手指 / 细纲 / 章节细纲 / 正文 / 参考素材，9 类一等公民资产，统一 schema 和版本控制。
- **多 Agent 协作流水线**：从一句灵感 → 开书蓝图 → 大纲 → 章节细纲 → 正文 → 审稿 → 修订，全链路结构化。
- **长期记忆 + 素材沉淀**：真相文件（structured JSON + Markdown 投影）+ 向量索引 + 参考素材库，写到几百章不忘事、不矛盾。
- **平台热榜雷达**：分析起点、番茄、晋江、刺猬猫、知乎盐选等平台趋势，反哺选题、卡点、卖点。
- **灵感工坊**：从模糊脑洞 → 题材 / 主角 / 金手指 / 钩子 / 卖点的多套方案。

第一版只交付 **Skills**，不强制依赖 CLI 或后端服务。任何能读写文件的 Agent runtime 都能直接用。

---

## 为什么不直接用 inkos / webnovel-writer / AI-Novel-Writing-Assistant

我们认真读了三个参考项目的源码与文档（详见 `docs/design/00-system-overview.md` 的能力对位矩阵），结论是：

| 项目 | 核心强项 | 我们的差异化定位 |
|------|----------|------------------|
| [inkos](https://github.com/Narcooo/inkos) | 自动化多 Agent 流水线、33 维度审计、SKILL 化封装、CLI + Studio + TUI | 我们**保留 inkos 风格的 SKILL 形态和真相文件思路**，但把"资产"提到一等公民位置，新增**金手指 / 章节细纲 / 参考素材**专门的资产，更贴合中文网文工业链路 |
| [webnovel-writer](https://github.com/lingfengQAQ/webnovel-writer) | 追读力系统（Hook / Cool-point / 微兑现 / 债务）、RAG + Reranker、Phase 5 主链 | 我们**吸收追读力概念**到 quality-auditor，并把检索能力下沉到 asset-vault，但跳过 Python + Claude Code Plugin 的耦合，转向纯 Skill 形态 |
| [AI-Novel-Writing-Assistant](https://github.com/ExplosiveCoderflome/AI-Novel-Writing-Assistant) | 自动导演开书、Creative Hub、写法引擎、整本生产主链、Web Studio | 我们**借鉴自动导演的"小白也能完书"理念**到 blueprint skill，但不绑定 React + Express + Prisma + Qdrant 这套重栈，让 v1 在任意 Agent 客户端可用 |
| [NovelCraft](https://novelcraft.io/) | 资产管理 UI、章节编辑器、模板化 | 我们的资产模型更贴合**中文网文**（金手指、套路、爽点、追订率） |

简而言之：**inkos 教会我们怎么做 Skill 包，webnovel-writer 教会我们追读力，AI-Novel-Writing-Assistant 教会我们自动导演，NovelCraft 教会我们资产中心化。** 第一版 Skill 包是这四条经验的浓缩。

---

## 能力地图（v1）

```
┌─────────────────────────────────────────────────────────────────┐
│                       novel-studio (根 skill)                    │
│   项目初始化 / 总导航 / 资产索引 / 跨 skill 编排                  │
└──────┬──────────────────────────────────────────────────┬───────┘
       │                                                  │
       ▼                                                  ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   入口层     │  │     资产层       │  │     生产层           │
├──────────────┤  ├──────────────────┤  ├──────────────────────┤
│ blueprint    │  │ worldforge       │  │ outline-architect    │
│ market-radar │  │ character-       │  │ chapter-writer       │
│              │  │   atelier        │  │ quality-auditor      │
│              │  │ asset-vault      │  │                      │
└──────────────┘  └──────────────────┘  └──────────────────────┘
```

| Skill | 职能 | 触发场景 |
|-------|------|---------|
| `novel-studio` | 根 skill，初始化项目、导航、资产索引、跨 skill 编排 | "新建一本书 / 看看这个项目有什么 / 整体导出" |
| `novel-blueprint` | 灵感 → 开书蓝图（题材 / 主角 / 金手指 / 卖点 / 前 30 章承诺） | "我有个想法 / 帮我开一本书 / 给我几个开书方向" |
| `novel-market-radar` | 平台热榜分析、选题、爽点抽取 | "起点最近什么火 / 我应该写什么题材 / 看看竞品的卖点" |
| `novel-worldforge` | 世界观 + 金手指（中文网文核心差异化资产） | "建世界 / 设计一个金手指 / 体系怎么搭" |
| `novel-character-atelier` | 角色卡 + 人设（含主角、配角、反派、关系网） | "捏个主角 / 给我设计反派 / 这个 NPC 怎么写" |
| `novel-outline-architect` | 总纲 / 卷纲 / 章纲（细纲）三级大纲、节奏与卡点设计 | "写大纲 / 写细纲 / 给我这一卷 30 章的章纲" |
| `novel-chapter-writer` | 章节细纲 → 正文，含去 AI 味、首屏钩子、爽点节拍 | "写正文 / 写下一章 / 把这章写完" |
| `novel-quality-auditor` | 33 维度连续性审稿、追读力检查、AIGC 检测 | "审一下这章 / 帮我检查前后矛盾 / 这章读起来怎么样" |
| `novel-asset-vault` | 参考素材库 + 素材沉淀（金句、桥段、灵感卡） | "把这段话存下来 / 给我找类似的桥段 / 整理参考资料" |

---

## 目录结构

```
agents-novel-ai/
├── README.md                          # 你正在看
├── docs/
│   ├── design/
│   │   ├── 00-system-overview.md      # 系统总览 + 能力对位
│   │   ├── 01-asset-model.md          # 9 类资产 schema
│   │   ├── 02-pipeline-architecture.md# 多 Agent 流水线
│   │   ├── 03-memory-and-vault.md     # 长期记忆与素材沉淀
│   │   └── 04-skill-spec.md           # Skill 规范
│   └── roadmap.md                     # v1 → v2 → v3 演进
├── skills/                            # ← 第一版交付物
│   ├── novel-studio/SKILL.md
│   ├── novel-blueprint/SKILL.md
│   ├── novel-market-radar/SKILL.md
│   ├── novel-worldforge/SKILL.md
│   ├── novel-character-atelier/SKILL.md
│   ├── novel-outline-architect/SKILL.md
│   ├── novel-chapter-writer/SKILL.md
│   ├── novel-quality-auditor/SKILL.md
│   └── novel-asset-vault/SKILL.md
└── templates/                         # 资产模板（被 skills 引用）
    ├── outline.md
    ├── volume-outline.md
    ├── chapter-outline.md
    ├── character.md
    ├── worldview.md
    ├── cheat-system.md
    └── reference-card.md
```

每个 skill 是一个独立目录，遵循 Anthropic SKILL.md 规范（YAML frontmatter + Markdown 正文）。可以单独装载，也可以由 `novel-studio` 统一编排。

---

## 资产目录约定（运行时项目结构）

当一个 Agent 用这套 Skill 在某个工作目录创建一本书时，会生成下述结构：

```
my-novel/
├── novel.json                         # 项目元数据（书名、题材、平台、状态）
├── blueprint.md                       # 开书蓝图（人类可读）
├── outline/
│   ├── master.md                      # 总纲
│   ├── volumes/
│   │   ├── volume-01.md               # 第 1 卷细纲
│   │   └── ...
│   └── chapters/
│       ├── chapter-0001.md            # 第 1 章细纲
│       └── ...
├── world/
│   ├── worldview.md                   # 世界观
│   ├── cheat-system.md                # 金手指
│   └── powers.md                      # 体系 / 力量等级
├── characters/
│   ├── protagonist.md                 # 主角人设
│   ├── antagonists/
│   ├── supporting/
│   └── relationships.md               # 关系网
├── chapters/
│   ├── chapter-0001.md                # 第 1 章正文
│   └── ...
├── memory/                            # ← 长期记忆（由 quality-auditor 维护）
│   ├── current_state.json             # 当前世界状态（结构化）
│   ├── current_state.md               # 同源 Markdown 投影
│   ├── particle_ledger.json           # 资源 / 物品账本
│   ├── pending_hooks.json             # 未闭合伏笔
│   ├── chapter_summaries.json         # 章节摘要
│   ├── subplot_board.json             # 支线板
│   ├── emotional_arcs.json            # 情感弧
│   └── character_matrix.json          # 角色交互矩阵
├── vault/                             # ← 参考素材库（由 asset-vault 维护）
│   ├── inspirations/                  # 灵感卡
│   ├── snippets/                      # 桥段 / 金句
│   ├── references/                    # 参考作品片段
│   └── index.json                     # 素材索引（标签 + 摘要）
└── audit/
    ├── reports/                       # 审稿报告
    └── trends/                        # 雷达扫描结果
```

资产模型详见 `docs/design/01-asset-model.md`。

---

## 快速开始

### 1. 用 Claude Code / Cursor / Kiro 装载 Skill

把 `skills/` 下的任意 skill 目录复制到你的客户端 skill 注册路径（具体路径以客户端文档为准），或者整体复制：

```bash
# 示例：Claude Code 用户目录
cp -r skills/* ~/.claude/skills/
```

### 2. 在 Agent 对话里直接调用

```text
> 我有个脑洞想写一本玄幻：主角穿越到末法时代，捡到一本残卷，可以解析任何功法。
帮我开书。
```

`novel-blueprint` 会被自动激活，引导你完成题材 / 主角 / 金手指 / 卖点定盘，并落盘 `blueprint.md`。

```text
> 给我写第一章，就按现在的章纲来。
```

`novel-chapter-writer` 接管，读取章节细纲 + 真相文件 + 风格指纹 → 输出正文。

```text
> 审一下，特别注意角色记忆和金手指消耗。
```

`novel-quality-auditor` 跑 33 维度检查，输出报告。

完整工作流详见 `skills/novel-studio/SKILL.md`。

---

## 演进路线

- **v1（当前）**：纯 Skill 形态，文件即数据库，零外部依赖。
- **v2**：可选 CLI（`novel`），把 skill workflow 编译成命令行原子操作，支持守护进程批量写章。
- **v3**：Web Studio（仿 NovelCraft / inkos Studio 的可视化工作台）。

详见 `docs/roadmap.md`。

---

## 协议

待定（建议 AGPL-3.0 或 MIT，与上游参考项目兼容）。

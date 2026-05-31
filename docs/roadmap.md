# 演进路线 · Novel Studio

> v1 Skills → v2 CLI / Daemon → v3 Web Studio。
> 这份文档说明每一版的目标、范围、不做什么，以及 v1 → v2 → v3 的兼容策略。

---

## 总策略：Skill 永远是一等公民

不论是 v2 CLI 还是 v3 Web UI，**Skills 始终是最底层的可执行单元**。CLI 把 skill workflow 编译成命令行原子操作，Web UI 把 skill 包装成可视化按钮，但内核是同一组 SKILL.md。

这样可以保证：

- 任何一版引入的能力，都可以反向沉淀到 SKILL.md（让纯 Skill 用户也能用）
- Skill 是 source of truth，CLI / UI 是它的视图
- 用户从 v1 跳到 v3 时，已有的资产文件零迁移

---

## v1：Skills（当前）

### 目标
让任何兼容 Anthropic Skills 协议的 Agent runtime（Claude Code、Cursor、Kiro、OpenClaw）都能驱动一本网文从灵感写到完结。

### 范围（在做）

- ✅ 9 个 skill 的 SKILL.md 与基础引用文档
- ✅ 9 类资产的 schema 与目录约定
- ✅ 8 类真相文件的 schema 与 settle delta 协议
- ✅ vault 素材库 + 风格指纹格式
- ✅ 完整设计文档（5 篇）

### 不做（v1 明确不做）

- ❌ CLI 工具
- ❌ Web UI
- ❌ 后端服务 / 数据库
- ❌ 守护进程 / 后台批量
- ❌ 向量索引 / RAG
- ❌ EPUB / 平台格式导出
- ❌ AIGC 第三方检测 API
- ❌ 图像 / 封面生成
- ❌ 多人协作

### 验收标准

- 在 Claude Code 上从空目录开始，对话方式完成"开书 → 写 5 章 → 审稿 → 导出 markdown"全流程。
- 9 个 skill 都能被 description 正确触发，互不干扰。
- 资产文件结构符合 `docs/design/01-asset-model.md`。

### 已知短板（留给 v2）

- 没有跨章一致性自动验证（C1-C9 约束目前由 quality-auditor 在 SKILL.md 里要求 LLM 自检，缺乏代码强制）
- 真相文件 delta apply 没有 schema 强校验（依赖 LLM 自觉）
- 长上下文（100+ 章）下 grep 检索成本上升

---

## v2：CLI / Daemon

### 目标
把 v1 的 SKILL.md workflow 编译成一组命令行原子操作，让批量化、自动化、CI 集成成为可能。

### 范围

#### v2.1 基础 CLI（`novel`）

> **实现进度**：alpha-1（init / status / doctor / config / blueprint）✅ · alpha-2a（world：worldview / powers / cheat-system）✅ · alpha-2b（character：主角 / 反派 / 配角 + 关系网）✅ · **alpha-2c（outline：总纲 / 卷纲 / 章纲）✅** · alpha-2d（单章六阶段 + memory delta + C1-C9）⏳。详见 `cli/README.md`。

```bash
novel init <name>                       # 初始化项目
novel status [book-id]                  # 查看项目状态
novel doctor                            # 诊断配置

# 资产 CRUD
novel blueprint show / edit
novel world show / edit
novel character list / show / add / edit
novel outline show master / volume <n> / chapter <n>

# 章节生产
novel plan chapter [n] [--context "..."]
novel compose chapter [n]
novel write chapter [n] [--words 3500]
novel audit chapter <n>
novel revise chapter <n> --mode polish
novel settle chapter <n>
novel write-next [--count 5]            # 全流程

# 真相文件
novel memory show <type>
novel memory validate                   # C1-C9 强校验
novel memory rebuild-projections
novel memory rollback --to-chapter <n>

# 素材 / 雷达
novel vault list / add / search
novel radar scan [--platform qidian]

# 配置
novel config set-global ...
novel config set-model <skill> <model>  # 多模型路由
novel doctor

# 导出
novel export --format txt|md|epub
```

#### v2.2 Daemon（守护进程）

```bash
novel up                                # 启动后台
novel down                              # 停止
novel up --schedule "0 3 * * *"         # 凌晨 3 点写一章
```

#### v2.3 多模型路由

按 skill 分配模型，平衡成本与质量。详见 `02-pipeline-architecture.md` 第 10 节。

#### v2.4 真相文件代码层强制

把 v1 由 SKILL.md 约束 LLM 的"读 JSON、改、写、自检"流程，沉淀为 CLI 内部代码：

```typescript
const delta = parseLLMDelta(llmOutput);
validateDeltaSchema(delta);  // Zod
const newState = applyDelta(currentState, delta);  // immutable
validateConstraints(newState, prevState);  // C1-C9
writeAtomic(newState);
projectMarkdown(newState);
```

#### v2.5 向量索引（可选）

`novel memory index --enable` 后启用本地 sqlite-vec / lancedb。

#### v2.6 平台格式导出

- TXT：起点支持
- Markdown：本地阅读
- EPUB：Kindle / 手机阅读
- 起点 Word 格式（`novel export --format qidian-word`）

### 不做（v2 明确不做）

- ❌ Web UI
- ❌ 后端 SaaS 服务
- ❌ 多人实时协作
- ❌ 图像 / 封面生成

### 与 v1 的兼容

- 资产文件结构**完全兼容 v1**，无需迁移。
- v1 用户安装 CLI 后可以直接接管现有项目。
- SKILL.md 内嵌的工作流被 CLI 实现为子命令，但 SKILL.md 保留可被 Agent 直接使用。

### 技术栈候选

- 语言：Node.js（与 inkos 对齐，方便复用 / fork）或 Rust（性能 + 单二进制分发）
- LLM SDK：openai-node + anthropic-sdk（多 provider）
- 向量：sqlite-vec（轻、零依赖）
- 测试：vitest

---

## v3：Web Studio

> 详细架构设计见 [`design/05-web-studio.md`](design/05-web-studio.md)（本地优先、复用 `@novel/core`、文件兼容；MVP = 设定圣经上 Web）。

### 目标
做一个本地 Web UI（默认端口 4567），让用户在浏览器里管理书 / 写章 / 审稿 / 看雷达，相当于 inkos Studio + AI-Novel-Writing-Assistant Creative Hub 的结合。

### 范围

#### v3.1 项目管理

- 多本书切换
- 项目状态仪表盘（进度、字数、审计通过率）
- 资产导航树（左侧 sidebar：blueprint / world / characters / outline / chapters / memory / vault）

#### v3.2 章节编辑器

- 章纲（intent）与正文（draft）双栏对照
- 实时字数 / 段落节奏
- 内联审稿 issue 标注
- 5 种修订模式按钮
- 版本切换（diff view）

#### v3.3 长期记忆可视化

- 时间线视图（按章节展开）
- 角色关系图（force-directed graph）
- 伏笔看板（kanban 式：open / progressing / deferred / resolved）
- 支线进度甘特图

#### v3.4 实时写作进度（SSE）

- 写章时左下角状态栏：`正在 compose...` `正在 write... 1235/3500 字` `正在 audit...`
- 取消 / 重试按钮

#### v3.5 雷达视图

- 平台对比仪表盘（起点 vs 番茄 vs 晋江）
- 题材热度曲线
- 关键词云

#### v3.6 vault 资产浏览器

- 标签筛选 / 全文搜索
- 拖拽到章节编辑器自动注入

#### v3.7 配置面板

- 模型 provider / 路由
- 通知（Telegram / 飞书 webhook）
- 主题（明 / 暗）

### 不做（v3 明确不做）

- ❌ SaaS 部署 / 多人协作（保持本地优先）
- ❌ 移动 App
- ❌ 桌面打包（v3 完成后再考虑 Electron / Tauri）

### 与 v1/v2 的兼容

- Web UI 调用 v2 CLI 作为 backend（fork 子进程或 import library）
- 所有写操作仍走 CLI 的原子 / 校验逻辑
- 资产文件依然兼容

### 技术栈候选

- 前端：React + Vite + TanStack Query + shadcn/ui
- 编辑器：Plate（Plate.js）或 TipTap
- 后端：Hono（轻量 Node web 框架）/ Express
- SSE / WebSocket：用于实时进度

---

## 跨版本里程碑

| 时间 | 版本 | 里程碑 |
|------|------|--------|
| Now | v1.0 | 9 skill 与设计文档完成 |
| +1 月 | v1.1 | 在 Claude Code 上完整跑通"吞天魔帝"前 5 章实战 |
| +2 月 | v1.2 | 增加 templates/ 完整骨架 + examples/ 实战示例 |
| +3 月 | v2.0-alpha | CLI 基础（init / status / write-next） |
| +5 月 | v2.0 | CLI 完整 + 真相文件代码层强制 |
| +7 月 | v2.1 | Daemon + 多模型路由 |
| +9 月 | v2.2 | EPUB / 起点 Word 导出 |
| +12 月 | v3.0-alpha | Web Studio MVP（项目 / 编辑器 / 审稿） |
| +15 月 | v3.0 | Web Studio 完整 |

> 里程碑是参考节奏，实际节奏取决于反馈。

---

## 长期方向（v3 之后）

下面这些是 v3 之后的可选方向，**不在当前 roadmap**：

- 互动小说 / 分支叙事（参考 inkos 的"interactive fiction"路线图）
- 多人协作 / Git 集成（一个团队 / 工作室一起写）
- 自定义 agent 插件系统（用户自己写新 skill 加进来）
- 桌面客户端（Tauri 打包）
- AIGC 第三方检测 API 集成
- 封面 / 插图生成
- 起点 / 番茄等平台直发集成（取决于平台 API 是否开放）
- 数据分析仪表盘（订阅 / 追读 / 收藏曲线）

---

## 不会做的事（永久边界）

下面这些**永远不会做**，是产品设计的硬边界：

- ❌ **替用户做创作决策**：题材 / 主角 / 金手指必须用户选，AI 只能提候选。"自动导演"是参考项目的产品取舍，我们不复制。
- ❌ **绑定特定 LLM 供应商**：永远 provider-agnostic。
- ❌ **关闭式商业化**：核心 skill 永远开源。
- ❌ **强制注册 / 联网**：本地优先，离线可用（v1/v2 完全离线，仅 LLM 调用需要联网）。
- ❌ **对作者作品上传 / 训练**：不做模型训练，作者数据不出本地。
- ❌ **同质化"AI 写完一切"**：保留人工审稿门、章纲手编、修订模式选择，不变成"按一个按钮出整本书"的黑箱。

---

## 决策记录（ADR 简版）

为了让后续维护者理解关键选择，列出几个最重要的决策：

### ADR-001：v1 不做 CLI

**决策**：v1 仅交付 SKILL.md，不写任何执行代码。

**理由**：

1. SKILL.md 是用户的核心诉求
2. CLI 锁死技术栈，会限制 runtime-agnostic 原则
3. 先验证设计的正确性，再花时间写代码

**反对意见**：没有 CLI 强制约束，LLM 可能不严格遵守资产 schema。

**应对**：v1 在 SKILL.md 里加足够的"自检 / 严格遵守"约束语；v2 用代码强制。

### ADR-002：金手指作为一等公民资产

**决策**：`world/cheat-system.md` 与 `world/cheat-system.json` 独立于世界观。

**理由**：

1. 中文网文的爽点节拍由金手指阶梯驱动，不能埋在世界观里
2. 审稿要校验"境界匹配 / 消耗记账"，需要结构化字段
3. 这是与 inkos / webnovel-writer / AI-Novel-Writing-Assistant 的核心差异化

**反对意见**：英文奇幻 / 言情可能不需要金手指，做成一等公民是否泛化不足？

**应对**：金手指是可选的，奇幻 / 言情书可以让 cheat-system.md 留空或写作"主角差异化能力"。

### ADR-003：双轨 JSON + Markdown

**决策**：真相文件 JSON 权威，Markdown 投影只读。

**理由**：直接抄 inkos 0.6.0 的成功经验。LLM 直接重写 markdown 容易"创作性"破坏历史。

### ADR-004：9 个 skill 而非 1 个 mega-skill

**决策**：9 个独立 skill，根 skill `novel-studio` 做导航。

**理由**：详见 `00-system-overview.md` 第 5.1 节。

### ADR-005：v1 不引入向量库

**决策**：v1 用文件 + grep，v2 才考虑向量。

**理由**：

1. 前 50 章 grep 足够
2. 向量库引入外部二进制 / embedding API key，违反 runtime-agnostic
3. 保持 v1 装载零成本

---

## 反馈与迭代

- v1 落地后会在仓库里加 `examples/` 目录，跑一本完整的"吞天魔帝前 5 章"实战。
- 实战中暴露的问题会反馈到设计文档，迭代到 v1.1 / v1.2。
- 等 v1 在 3-5 本不同题材的书上验证稳定，再启动 v2 CLI。

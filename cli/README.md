# Novel Studio CLI

> v2 alpha-2a — AI 全流程网文写作 Studio 的命令行版。

## 安装

```bash
cd cli
npm install
npm run build
npm link    # 暴露全局 `novel` 命令；或直接用 `npm run novel -- <subcommand>`
```

## 当前版本（alpha-2a）能做什么

### 离线命令（无需 LLM）

- `novel init <name>` — 初始化项目骨架（novel.json + 全部子目录）
- `novel status` — 扫描项目状态，按 5 阶段 pipeline 判定，给下一步建议
- `novel doctor` — 诊断环境 / 配置 / skills 路径
- `novel config get|set|list` — 全局与项目级配置（含 LLM provider / model / API key）

### 蓝图（开书定盘）— alpha-1

- `novel blueprint show|edit|approve` — 开书蓝图 CRUD
- `novel blueprint start [--resume]` — 10 步交互定盘工作流（LLM 出 3 个候选 + 用户选 / refine）

### 世界三件套（worldforge）— alpha-2a 新增

- `novel world list` — 紧凑表格显示三件套（worldview / powers / cheat-system）的存在性 + status + version
- `novel world show [worldview|powers|cheat-system|all]` — 打印当前内容
- `novel world build [--resume]` — 启动 3 步交互式建世界工作流（每步可选 LLM 起草 / 编辑器手填 / 跳过占位）
- `novel world approve` — R2 强校验（金手指必有代价/限制/冷却之一）+ 翻 status=approved

#### 三件套依赖关系

```
blueprint approved  →  worldview      ← era / 时间线 / 势力 / 物理规则
                       ↓
                       powers         ← 境界体系 + 主角境界曲线（驱动每章主角能用什么）
                       ↓
                       cheat-system   ← 金手指（强依赖 powers 章节锚点）
                       ↓ approve
                       characters (alpha-2b)
```

每个资产都是 **JSON canonical + MD projection 双写**：JSON 是真相，MD 是给人看的渲染版本。

## 架构

```
src/
├── bin/novel.ts             # CLI 入口（commander）
├── commands/                # 每条子命令一个文件
├── workflows/               # 多步交互流程
│   ├── blueprint-flow.ts    # 10 步开书定盘
│   └── world-flow.ts        # 3 步建世界（worldview → powers → cheat-system）
└── core/
    ├── schemas/             # Zod schemas
    │   ├── common.ts        # AssetType / SkillName / ID / 时间戳
    │   ├── novel.ts         # novel.json
    │   ├── blueprint.ts     # blueprint.md frontmatter + 10 sections
    │   ├── world.ts         # worldview / powers / cheat-system + R2 helper
    │   └── skill.ts         # SKILL.md frontmatter
    ├── assets/              # 资产 IO（路径约定、frontmatter 解析、原子写入、scaffold）
    │   ├── world.ts         # JSON canonical + MD projection 双写
    │   └── world-render.ts  # 从结构化 data 渲染 MD body
    ├── status/              # 项目阶段判定
    ├── skills/              # 加载并编译 SKILL.md（v1 SKILL 仍是 source of truth）
    ├── llm/                 # provider 抽象（OpenAI / Anthropic / mock）
    ├── config/              # 全局 ~/.novel/config.json + 项目级 .novel/config.json
    └── utils/               # id / time / logger / errors
```

## 设计契约（必须遵守）

CLI 是 v1 SKILL 的"代码视图"，所有资产 schema 与 v1 完全兼容：

- 9 类一等公民资产 — 见 `../docs/design/01-asset-model.md`
- 5 阶段 pipeline — 见 `../docs/design/02-pipeline-architecture.md`
- 8 类真相文件 + delta 协议 — 见 `../docs/design/03-memory-and-vault.md`
- 9 个 skill 边界 — 见 `../docs/design/04-skill-spec.md`

CLI 写入资产时**先 read → 改 → 校验 → 原子写**，不允许跳过 schema 校验。

### Genre / Platform 是 lenient string（v2 alpha-2a 起）

`genre` 和 `platform_target` 是 `z.string().min(1)`，接受任何非空字符串。`KNOWN_GENRES` / `KNOWN_PLATFORMS` 常量只用于交互式选单的候选项。

理由：中文网文有大量小众分类（如「末法」`mofa` / 「无限流」`wuxianliu`）；严格 enum 会卡住真实数据（例：`examples/tunshi-mo-di/novel.json` 用了 `"moofa"`）。

## 配置

LLM provider 和 model 通过 `novel config` 设置，或环境变量：

```bash
# 全局（~/.novel/config.json）
novel config set provider openai --global
novel config set openai.apiKey sk-xxx --global
novel config set openai.model gpt-4o-mini --global

# 项目级（覆盖全局；./.novel/config.json）
novel config set anthropic.model claude-sonnet-4

# 环境变量（最高优先级）
export NOVEL_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-xxx
export OPENAI_API_KEY=sk-xxx
```

## 完整流程（alpha-2a 当前能跑到哪）

```bash
# 1. 新建一本书
mkdir my-novel && cd my-novel
novel init "吞天魔帝" --genre xuanhuan,mofa --platform qidian --yes

# 2. 开书定盘（10 步交互）
novel blueprint start
novel blueprint approve

# 3. 建世界三件套（每步可选 LLM / 编辑器 / 跳过）
novel world build
novel world show
novel world approve     # R2 校验 + 翻 status=approved

# 4. 看进度
novel status            # 应显示 stage='characters'，等 alpha-2b 接力

# 离线 / 不消耗 token 的场景
novel world build --mock-llm    # 用 mock provider，验证流程不调真 API
novel world build --no-llm      # 完全不调 LLM，只走编辑器手填模式
```

## 开发

```bash
npm run dev -- status              # tsx 直接跑，无需 build
npm run typecheck                  # 类型检查
npm run test                       # vitest（单 run 模式）
```

## 路线

详见 `../docs/roadmap.md`。

- **alpha-1**（已完成）：init / status / doctor / config / blueprint
- **alpha-2a**（本版本）：world（worldview / powers / cheat-system）
- **alpha-2b**（下一步）：character（protagonist / antagonists / supporting + relationships）
- **alpha-2c**：outline（master / volume / chapter outline）
- **alpha-2d**：单章六阶段循环（plan → compose → write → audit → revise → settle）+ memory delta apply + C1-C9 校验

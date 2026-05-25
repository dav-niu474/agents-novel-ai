# Novel Studio CLI

> v2 alpha-1 — AI 全流程网文写作 Studio 的命令行版。

## 安装

```bash
cd cli
npm install
npm run build
npm link    # 暴露全局 `novel` 命令；或直接用 `npm run novel -- <subcommand>`
```

## 当前版本（alpha-1）能做什么

- `novel init <name>` — 初始化项目骨架（novel.json + 全部子目录）
- `novel status` — 扫描项目状态，按 5 阶段 pipeline 判定，给下一步建议
- `novel doctor` — 诊断环境 / 配置 / skills 路径
- `novel config get|set|list` — 全局与项目级配置（含 LLM provider / model / API key）
- `novel blueprint show|edit|start|approve` — 开书蓝图 CRUD + 10 步交互定盘工作流（驱动 LLM 出候选 + 与用户协商）

## 架构

```
src/
├── bin/novel.ts             # CLI 入口（commander）
├── commands/                # 每条子命令一个文件
├── workflows/               # 多步交互流程（如 blueprint 10 步定盘）
└── core/
    ├── schemas/             # Zod schemas（novel.json / blueprint frontmatter / SKILL.md frontmatter / ...）
    ├── assets/              # 资产 IO（路径约定、frontmatter 解析、原子写入、scaffold）
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

## 配置

LLM provider 和 model 通过 `novel config` 设置，或环境变量：

```bash
# 全局（~/.novel/config.json）
novel config set provider openai --global
novel config set openai.apiKey sk-xxx --global
novel config set openai.model gpt-4o-mini --global

# 项目级（覆盖全局；./.novel/config.json）
novel config set anthropic.model claude-sonnet-4 --skill blueprint

# 环境变量（最高优先级）
export NOVEL_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-xxx
export OPENAI_API_KEY=sk-xxx
```

## 常见用法

```bash
# 1. 新建一本书
mkdir my-novel && cd my-novel
novel init "吞天魔帝" --genre xuanhuan --platform qidian

# 2. 看状态
novel status

# 3. 启动开书蓝图（10 步交互定盘）
novel blueprint start

# 4. 看蓝图当前内容
novel blueprint show

# 5. approve 蓝图（之后下游 skill 才能开始）
novel blueprint approve
```

## 开发

```bash
npm run dev -- status              # tsx 直接跑，无需 build
npm run typecheck                  # 类型检查
npm run test                       # vitest
```

## 路线

详见 `../docs/roadmap.md`。alpha-1 之后 alpha-2 会加单章六阶段循环（plan/compose/write/audit/revise/settle）。

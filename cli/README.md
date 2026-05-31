# Novel Studio CLI

> v2 alpha-2c — AI 全流程网文写作 Studio 的命令行版。

## 安装

```bash
cd cli
npm install
npm run build
npm link    # 暴露全局 `novel` 命令；或直接用 `npm run novel -- <subcommand>`
```

## 当前版本（alpha-2c）能做什么

### 离线命令（无需 LLM）

- `novel init <name>` — 初始化项目骨架（novel.json + 全部子目录）
- `novel status` — 扫描项目状态，按 5 阶段 pipeline 判定，给下一步建议
- `novel doctor` — 诊断环境 / 配置 / skills 路径
- `novel config get|set|list` — 全局与项目级配置（含 LLM provider / model / API key）

### 蓝图（开书定盘）— alpha-1

- `novel blueprint show|edit|approve` — 开书蓝图 CRUD
- `novel blueprint start [--resume]` — 10 步交互定盘工作流（LLM 出 3 个候选 + 用户选 / refine）

### 世界三件套（worldforge）— alpha-2a

- `novel world list` — 紧凑表格显示三件套（worldview / powers / cheat-system）的存在性 + status + version
- `novel world show [worldview|powers|cheat-system|all]` — 打印当前内容
- `novel world build [--resume]` — 启动 3 步交互式建世界工作流（每步可选 LLM 起草 / 编辑器手填 / 跳过占位）
- `novel world approve` — R2 强校验（金手指必有代价/限制/冷却之一）+ 翻 status=approved

### 角色套件（character-atelier）— alpha-2b 新增

- `novel character list` — 按主角 / 反派 / 配角分组的角色表 + 关系网状态
- `novel character show [<角色ID>|relationships|all]` — 打印角色卡（渲染版）或关系网（默认 all）
- `novel character build [--resume]` — 启动捏角色工作流：**主角 → 反派 → 配角 → 关系网**，每步可选 LLM 起草 / 编辑器手填
- `novel character add [protagonist|antagonist|supporting|minor]` — 增量补一个角色（写大纲时发现缺角色用）
- `novel character approve` — R1/R3 强校验（性格内核非空 + 核心角色 ≥ 3 标志性细节）+ R2 软警告（主角境界曲线对齐 powers）+ 翻 status=approved

#### 角色资产约定

```
characters/
├── _index.json                       # 角色注册表（JSON canonical）
├── protagonist-<slug>.{json,md}      # 主角卡（每角色 JSON canonical + MD projection）
├── antagonists/antagonist-<slug>.{json,md}
├── supporting/supporting-<slug>.{json,md}
└── relationships.{json,md}            # 关系网（JSON canonical + MD projection）
```

每张角色卡是 8 字段硬契约：一句话画像 / 基础档案 / **性格内核（不可破）** / 能力与成长（对齐 powers）/ 标志性细节 / 关系网指针 / 弧光设计 / 禁止写法。

> R7（不替用户取名）：`build` / `add` 会让你**自己输入角色中文名 + 文件 ID（拼音/英文 kebab-case）**，LLM 只负责把 8 字段填充成稿，不擅自起名。

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

### 三级大纲（outline-architect）— alpha-2c 新增

- `novel outline list` — 紧凑表格显示总纲 / 卷纲 / 章纲的存在性 + status + version + 完整度
- `novel outline show [master | volume <n> | chapter <n> | all]` — 打印某一级大纲内容
- `novel outline build [--resume] [--volume <n>] [--chapters <count>] [--range <a-b>]` — 启动三级大纲工作流（总纲 → 卷纲 → 前 N 章章纲，每步可选 LLM 起草 / 编辑器 / 跳过）
- `novel outline approve [master | volume <n> | chapter <n>]` — 完整度校验后翻 status=approved；不带 target 则批量 approve 所有完整资产

#### 三级大纲依赖关系

```
world approved  →  outline/master.md           ← 主题驱动 / 主线 N 幕 / 卷列表 / 长期伏笔
                   ↓
                   outline/volumes/volume-NN.md ← 卷主题 / 卷高潮 / 5 段式 / 必出桥段 / 卷末钩子
                   ↓
                   outline/chapters/chapter-NNNN.md ← 章纲 9 字段契约（R1）；chapter-writer 的唯一直接输入
```

> ⚠️ 与 world 不同，**大纲是 Markdown-canonical 单写**（无 JSON sidecar，见 `01-asset-model.md` §1）：
> Markdown 正文是真相，逐字保存；只有 YAML frontmatter 走 Zod 强校验。
> 章纲的 9 字段（R1）通过"按编号 1-9 解析二级标题"做完整度判定，`approve` 时强制全填。
>
> 角色索引（`characters/_index.json`，alpha-2b）目前是**软依赖**：缺失只警告不阻塞——
> 章纲里的"必出场角色"以角色 ID 文本引用，等 alpha-2b 落地后可补建索引。

## 架构

```
src/
├── bin/novel.ts             # CLI 入口（commander）
├── commands/                # 每条子命令一个文件（含 character.ts）
├── workflows/               # 多步交互流程
│   ├── blueprint-flow.ts    # 10 步开书定盘
│   ├── world-flow.ts        # 3 步建世界（worldview → powers → cheat-system）
│   ├── character-flow.ts    # 捏角色（主角 → 反派 → 配角 → 关系网）
│   ├── json-collect.ts      # 通用「LLM 起草 / 编辑器手填」结构化 JSON 收集器（world + character 共用）
│   └── outline-flow.ts      # 3 步建大纲（master → volume → 前 N 章 chapter）
└── core/
    ├── schemas/             # Zod schemas
    │   ├── common.ts        # AssetType / SkillName / ID / 时间戳
    │   ├── novel.ts         # novel.json
    │   ├── blueprint.ts     # blueprint.md frontmatter + 10 sections
    │   ├── world.ts         # worldview / powers / cheat-system + R2 helper
    │   ├── character.ts     # character / _index / relationships + R1/R2/R3 helper
    │   ├── outline.ts       # outline master/volume/chapter frontmatter + 9 字段常量
    │   └── skill.ts         # SKILL.md frontmatter
    ├── assets/              # 资产 IO（路径约定、frontmatter 解析、原子写入、scaffold）
    │   ├── world.ts         # JSON canonical + MD projection 双写
    │   ├── world-render.ts  # 从结构化 data 渲染 world MD body
    │   ├── character.ts     # 角色卡 / 索引 / 关系网 IO（JSON canonical + MD projection）
    │   ├── character-render.ts # 渲染角色卡 8 段 + 关系网 MD body
    │   ├── outline.ts       # Markdown-canonical（逐字保存）+ 9 字段完整度分析
    │   └── outline-render.ts# 大纲占位骨架生成
    ├── status/              # 项目阶段判定（含 character 子阶段）
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

## 完整流程（alpha-2c 当前能跑到哪）

```bash
# 1. 新建一本书
mkdir my-novel && cd my-novel
novel init "吞天魔帝" --genre xuanhuan,mofa --platform qidian --yes

# 2. 开书定盘（10 步交互）
novel blueprint start
novel blueprint approve

# 3. 建世界三件套（每步可选 LLM / 编辑器 / 跳过）
novel world build
novel world approve     # R2 校验 + 翻 status=approved

# 4. 捏角色（主角 → 反派 → 配角 → 关系网）
novel character build
novel character show            # 看渲染版角色卡
novel character approve         # R1/R3 校验 + 翻 status=approved

# 5. 写三级大纲（总纲 → 卷纲 → 前 5 章章纲）
novel outline build               # --range 1-50 可跳过卷范围询问
novel outline list                # 看完整度（章纲 R1 = 9/9）
novel outline approve chapter 1   # 章纲 9 字段齐全才能 approve

# 6. 看进度
novel status            # 应显示 writing 阶段，等 alpha-2d 接力

# 离线 / 不消耗 token 的场景
novel character build --mock-llm  # 用 mock provider 验证流程不调真 API
novel outline build --no-llm      # 完全不调 LLM，只走编辑器手写模式
novel character add antagonist    # 增量补一个反派
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
- **alpha-2a**（已完成）：world（worldview / powers / cheat-system）
- **alpha-2b**（已完成）：character（protagonist / antagonists / supporting + relationships）
- **alpha-2c**（已完成）：outline（master / volume / chapter 三级大纲，Markdown-canonical + 章纲 R1 九字段）
- **alpha-2d**：单章六阶段循环（plan → compose → write → audit → revise → settle）+ memory delta apply + C1-C9 校验

# Novel Studio CLI

> v2 alpha-2b — AI 全流程网文写作 Studio 的命令行版。

## 安装

```bash
cd cli
npm install
npm run build
npm link    # 暴露全局 `novel` 命令；或直接用 `npm run novel -- <subcommand>`
```

## 当前版本（alpha-2b）能做什么

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

### 角色 / 人设（character atelier）— alpha-2b 新增

- `novel character list` — 按 role 分组打印全部角色 + tier + 首登场章节，✓/✗ 标记卡片文件是否真存在
- `novel character show <id-or-name>` — 打印某个角色卡（id 形如 `protagonist-lin-jin`，或角色名子串）
- `novel character add` — 交互式捏一个角色（pick role → pick tier → LLM 起草 8 字段 → 写卡 + 更新 _index.json）
- `novel character approve [id]` — 把卡片 status 翻成 `approved`（性格内核锁定）；不带 id 时批量翻所有 drafting 卡

#### 8 字段角色卡

每张角色卡（MD canonical，由 LLM 输出 JSON → CLI 渲染 → 落 .md）必含 8 字段：

1. `one_line_portrait` — 一句话画像
2. `basic_profile` — 年龄 / 出身 / 外貌 / 服饰
3. `personality_core` — **核心驱动 / 决策模式 / 情绪锚点**（approved 后不可破，chapter-writer 严格遵守）
4. `ability_curve` — 境界 / 能力成长曲线（主角 / 关键反派必须对齐 `world/powers.json.protagonist_curve`）
5. `signature_details` — 标志性细节（核心角色 ≥ 3 个，反 AI 味关键）
6. `relationships` — 关系网指针（character_id 必须是 `<role>-<slug>` 格式）
7. `arc_design` — 弧光设计（按卷划分；渐变非突变）
8. `prohibited` — 禁止写法（chapter-writer 硬墙）

#### 4 种 role + tier 矩阵

| role | tier 选项 | 路径 | 说明 |
|------|----------|------|------|
| `protagonist` | `protagonist` | `characters/protagonist-<slug>.md` | 每本书 1 个，密度最高 |
| `antagonist` | `early` / `mid` / `late` / `meta` | `characters/antagonists/antagonist-<slug>.md` | 必有动机 + 弧光 |
| `supporting` | `core` / `important` / `minor` | `characters/supporting/supporting-<slug>.md` | 师妹 / 师傅 / 兄弟等 |
| `minor` | `minor` | `characters/supporting/minor-<slug>.md` | 出场 < 20 章功能位 |

#### 索引 + 关系网

- `characters/_index.json` — JSON canonical，下游 chapter-writer / quality-auditor 查"是否核心 / 何时登场"
- `characters/relationships.md` — 无向图，按主角圈 / 反派圈 / 配角圈 / 跨阵营分组（每条关系含 strength 0-5 + 关键章节）

#### 跨资产校验

- `checkRoleTierConsistency(role, tier)` — role↔tier 不匹配时提前 fail（CLI 层在解析 `--tier` 时调用）
- `checkCharacterPowersAlignment(character, powers.protagonist_curve)` — 主角 / 反派的 ability_curve 必须吻合 `world/powers` 在该章节的活跃境界
- `character add` 接受时会做 R3 软警告（核心角色 < 3 个标志性细节会提示，不阻止保存）

## 架构

```
src/
├── bin/novel.ts             # CLI 入口（commander）
├── commands/                # 每条子命令一个文件
│   ├── blueprint.ts
│   ├── character.ts         # alpha-2b
│   ├── config.ts
│   ├── doctor.ts
│   ├── init.ts
│   ├── status.ts
│   └── world.ts
├── workflows/               # 多步交互流程
│   ├── blueprint-flow.ts    # 10 步开书定盘
│   ├── character-flow.ts    # alpha-2b 角色 add 工作流
│   └── world-flow.ts        # 3 步建世界（worldview → powers → cheat-system）
└── core/
    ├── schemas/             # Zod schemas
    │   ├── common.ts        # AssetType / SkillName / ID / 时间戳
    │   ├── novel.ts         # novel.json
    │   ├── blueprint.ts     # blueprint.md frontmatter + 10 sections
    │   ├── world.ts         # worldview / powers / cheat-system + R2 helper
    │   ├── character.ts     # alpha-2b: character / index / relationships + powers-alignment helper
    │   └── skill.ts         # SKILL.md frontmatter
    ├── assets/              # 资产 IO（路径约定、frontmatter 解析、原子写入、scaffold）
    │   ├── world.ts         # world JSON canonical + MD projection 双写
    │   ├── world-render.ts
    │   ├── character.ts     # alpha-2b: character MD canonical + index JSON canonical
    │   └── character-render.ts
    ├── status/              # 项目阶段判定（含 alpha-2b 新增 characters-* 子阶段）
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

### Character 卡：MD canonical（v2 alpha-2b）

与 world 三件套不同，character 卡是 **MD canonical（无 JSON sidecar）**：

- 与 v1 SKILL 用户用 Claude Code / Cursor 直接装 SKILL 写出来的文件完全兼容
- LLM 仍输出结构化 JSON（CharacterData 8 字段），CLI 校验后渲染成 .md body
- 一旦写到磁盘，body 对 read 来说是 opaque（不会反向解析回 JSON）
- 编辑：`character add --force` 重新生成，或者直接 `$EDITOR` 改 .md（CLI 不会覆盖）
- _index.json 是 JSON canonical（roundtrippable），是下游所有"角色查询"的唯一真相

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

## 完整流程（alpha-2b 当前能跑到哪）

```bash
# 1. 新建一本书
mkdir my-novel && cd my-novel
novel init "吞天魔帝" --genre xuanhuan,mofa --platform qidian --yes

# 2. 开书定盘（10 步交互）
novel blueprint start
novel blueprint approve

# 3. 建世界三件套
novel world build
novel world approve

# 4. 捏 5-7 个核心角色（SKILL R6：先少后多）
novel character add --role protagonist
novel character add --role antagonist --tier early
novel character add --role antagonist --tier mid
novel character add --role supporting --tier core --name "苏婉柔" --first-chapter 1
novel character add --role supporting --tier important
novel character list                    # 表格预览
novel character approve                 # 性格内核锁定（chapter-writer 会读 approved 版）

# 5. 看下一步建议
novel status            # 应显示 stage='outline-master'，等 alpha-2c 接力

# 离线 / 不消耗 token 的场景
novel character add --role protagonist --mock-llm    # 用 mock provider，验证流程
novel character add --role protagonist --no-llm      # 完全不调 LLM，编辑器手填模式
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
- **alpha-2b**（本版本）：character（protagonist / antagonist / supporting / minor + relationships）
- **alpha-2c**（下一步）：outline（master / volume / chapter outline）
- **alpha-2d**：单章六阶段循环（plan → compose → write → audit → revise → settle）+ memory delta apply + C1-C9 校验

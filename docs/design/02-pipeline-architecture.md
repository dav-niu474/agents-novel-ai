# Pipeline 架构 · Novel Studio

> 多 Skill 协作流水线、阶段切分、控制面与运行时产物。
> 这份文档解释**一本书从一句脑洞到上传起点**的全过程，每一步谁负责、读什么、写什么。

---

## 1. 顶层流水线（生命周期）

```
   ① 灵感期        ② 开书期        ③ 大纲期         ④ 写作期         ⑤ 完结期
┌─────────┐    ┌────────────┐   ┌──────────────┐  ┌────────────┐  ┌──────────┐
│         │    │            │   │              │  │            │  │          │
│ market- │───▶│ blueprint  │──▶│ worldforge   │─▶│ chapter-   │─▶│ outline- │
│ radar   │    │            │   │ character-   │  │ writer     │  │ architect│
│         │    │            │   │   atelier    │  │     │      │  │ (复盘)   │
│ asset-  │    │            │   │ outline-     │  │     ▼      │  │          │
│ vault   │    │            │   │   architect  │  │ quality-   │  │          │
│         │    │            │   │              │  │   auditor  │  │          │
└─────────┘    └────────────┘   └──────────────┘  └─────┬──────┘  └──────────┘
                                                         │
                                                         ▼
                                                   ┌────────────┐
                                                   │ memory/    │
                                                   │  (沉淀)    │
                                                   └────────────┘
                                                         ▲
                                                         │
                                                  asset-vault
                                                  (素材回灌)
```

5 个阶段，9 个 skill 在不同阶段被激活。

---

## 2. 阶段 ① 灵感期：从空白到方向

**目标**：用户从"什么也没有"或"模糊脑洞"走到"这本书写哪个题材、什么金手指、什么卖点"。

### 主导 Skill
- `novel-market-radar`（看市场）
- `novel-asset-vault`（捞素材）

### 输入
- 用户的一句话脑洞（可选）
- 用户偏好（题材 / 平台 / 长度，可选）

### 工作流

#### 流 A：用户带着脑洞来
```
用户："我想写一个穿越者靠解析功法逆袭的玄幻"
  ↓
asset-vault 检索 vault/inspirations/、vault/snippets/，找相关素材
  ↓
市场雷达可选扫描"解析流"在起点 / 番茄的近况
  ↓
输出：3-5 套差异化方向（不同主角设定 / 金手指变体 / 卖点）
```

#### 流 B：用户没思路，要选题
```
用户："起点最近什么题材火？"
  ↓
market-radar 抓取起点新书榜、推荐榜，提取题材分布、爽点关键词
  ↓
输出：题材热度报告 + 几个适合"新人作者切入"的子赛道
  ↓
用户选定方向后进入流 A
```

### 产物
- `vault/inspirations/insp-*.md`（候选灵感卡，3-5 张）
- `audit/trends/trend-YYYYMMDD.md`（雷达扫描报告）
- 暂时不写 `novel.json` / `blueprint.md`（等用户选定方向后由 blueprint skill 写）

### 退出条件
用户从候选灵感里选定一个方向，触发 `novel-blueprint`。

---

## 3. 阶段 ② 开书期：从方向到契约

**目标**：把灵感固化成**整本书的最高契约**——blueprint。

### 主导 Skill
- `novel-blueprint`

### 输入
- 选定的灵感卡 / 方向描述
- （可选）参考的市场雷达报告
- 用户对题材 / 主角 / 金手指的偏好

### 工作流（10 步定盘）

```
1. 一句话定盘（pitch）
2. 题材定位（主 / 副题材，平台，受众）
3. 主角一句话画像（性格内核 + 出身）
4. 金手指一句话（差异化的核心）
5. 卖点 / 钩子（前 30 章承诺）
6. 反 AI 味要求（高频禁词、句式）
7. 文风指纹（可选导入参考文本）
8. 排除项（明确不写什么）
9. 章字数约定
10. 长期意图（多少卷 / 多少章 / 大致节奏）
```

每一步都和用户协商，**不能让 AI 替用户决定题材或金手指**。

### 产物
- `novel.json`（项目元数据，含 `blueprint_status: approved`）
- `blueprint.md`（开书蓝图，approved 后是不可变契约）

### 退出条件
- `blueprint.md` 第 1-10 节全部填写完
- 用户明确"开始建世界"

> 这一阶段的灵魂：**让小白也能完书的关键**是把"开书"工业化，blueprint 完成意味着后续所有 skill 都有明确锚点。

---

## 4. 阶段 ③ 大纲期：从契约到骨架

**目标**：把 blueprint 展开成可写的世界 + 角色 + 三级大纲。

### 阶段 ③ 内部子流水线（顺序敏感）

```
blueprint.md
   │
   ├──▶ worldforge ─────▶ world/worldview.md
   │                      world/cheat-system.md   ← 核心差异化
   │                      world/powers.md
   │
   ├──▶ character-atelier ▶ characters/protagonist-*.md
   │                       characters/antagonists/
   │                       characters/supporting/
   │                       characters/relationships.md
   │                       characters/_index.json
   │
   └──▶ outline-architect ▶ outline/master.md       (总纲)
                            outline/volumes/        (卷纲，先写第 1 卷)
                            outline/chapters/       (章纲，先写前 5-10 章)
```

### 顺序约束（硬规则）

1. **必须先 worldforge 再 character-atelier**：角色出身 / 立场依赖世界设定。
2. **金手指必须在角色之前定型**：金手指的升级阶梯决定主角境界曲线。
3. **必须先总纲再卷纲再章纲**：从粗到细。
4. **章纲只先写前 5-10 章**：开头是产品测试期，前 5 章决定能不能签约 / 上推荐，后续章纲根据反馈滚动产出。

### 工作流要点

- **worldforge**：先世界观骨架，再金手指（含 6 大要素：定义 / 触发 / 输出 / 升级阶梯 / 限制 / 节拍）。
- **character-atelier**：主角先写，再写第 1-3 个反派 + 1-2 个配角。**不要一次性列出 20 个 NPC**——后续按需补。
- **outline-architect**：
  - 总纲只列 5 幕主线 + 卷划分。
  - 第 1 卷卷纲做 5 段式节奏（起承转合 + 高潮）。
  - 章纲严格遵守 [`01-asset-model.md`](./01-asset-model.md) 第 8.3 节的 9 个字段。

### 产物
完整的 `world/`、`characters/`、`outline/master.md`、`outline/volumes/volume-01.md`、`outline/chapters/chapter-{0001..0010}.md`。

### 退出条件
前 10 章章纲就绪。

---

## 5. 阶段 ④ 写作期：从骨架到正文（核心循环）

**目标**：每章一个循环，按"plan → compose → write → audit → revise → settle"流转。

### 5.1 单章六阶段循环

借鉴 inkos 的 plan→compose→write→audit→revise 思路，加上 settle 阶段：

```
┌─────────────────────────────────────────────────────────────────┐
│                    单章生产六阶段循环                            │
└─────────────────────────────────────────────────────────────────┘

  [1] PLAN                  [2] COMPOSE              [3] WRITE
  ┌──────────────┐         ┌──────────────┐       ┌──────────────┐
  │ 输入：       │         │ 输入：       │       │ 输入：       │
  │ blueprint    │         │ chapter-     │       │ chapter-     │
  │ outline-     │         │  outline     │       │  outline     │
  │  master      │         │ blueprint    │       │ runtime      │
  │ outline-     │         │ memory/*     │       │  context     │
  │  volume      │         │ characters/* │       │              │
  │ memory/      │         │ world/*      │       │              │
  │  pending_    │         │ vault/       │       │              │
  │  hooks       │         │  snippets    │       │              │
  │              │         │              │       │              │
  │ Skill:       │         │ Skill:       │       │ Skill:       │
  │ outline-     │   ───▶  │ chapter-     │  ───▶ │ chapter-     │
  │  architect   │         │  writer      │       │  writer      │
  │              │         │ (compose)    │       │ (write)      │
  │              │         │              │       │              │
  │ 输出：       │         │ 输出：       │       │ 输出：       │
  │ chapter-     │         │ runtime/     │       │ chapters/    │
  │ outline.md   │         │  ch-NNNN.    │       │  chapter-    │
  │ (intent)     │         │  context     │       │  NNNN.md     │
  │              │         │  rule-stack  │       │  (draft)     │
  └──────────────┘         └──────────────┘       └──────────────┘
                                                         │
                                                         ▼
  [6] SETTLE                [5] REVISE               [4] AUDIT
  ┌──────────────┐         ┌──────────────┐       ┌──────────────┐
  │ 输入：       │         │ 输入：       │       │ 输入：       │
  │ chapter-     │         │ audit-       │       │ chapter      │
  │  approved    │         │  report      │       │  draft       │
  │              │         │ chapter      │       │ memory/*     │
  │ Skill:       │         │              │       │ outline/*    │
  │ quality-     │   ◀───  │ Skill:       │  ◀─── │ characters/* │
  │  auditor     │         │ chapter-     │       │ world/*      │
  │  (settle)    │         │  writer      │       │              │
  │              │         │  (revise)    │       │ Skill:       │
  │              │         │              │       │ quality-     │
  │ 输出：       │         │              │       │  auditor     │
  │ memory/*     │         │ 输出：       │       │              │
  │  update      │         │ chapter      │       │ 输出：       │
  │ chapter      │         │  revised     │       │ audit/       │
  │  status:     │         │              │       │  reports/    │
  │  approved    │         │              │       │  ch-NNNN.    │
  │              │         │              │       │  audit.md    │
  └──────────────┘         └──────────────┘       └──────────────┘
```

### 5.2 各阶段详解

#### [1] PLAN（章意图编译）

**Skill**: `novel-outline-architect`（也可由 `novel-studio` 触发）

**做什么**：
- 读 `outline/master.md` 和 `outline/volumes/volume-NN.md`，提取本章在整体节奏中的位置。
- 读 `memory/pending_hooks.json`，决定本章要"开 / 进 / 收"哪些钩子。
- 读 `memory/chapter_summaries.json` 最近 3 章，确保接续连贯。
- 写 `outline/chapters/chapter-NNNN.md`（章纲，含 9 个字段）。

**输出契约**：章纲必须包含 must-keep、must-avoid、爽点节拍、字数目标。

#### [2] COMPOSE（运行时上下文编译）

**Skill**: `novel-chapter-writer` 的 compose phase

**做什么**：
- 读章纲 + 全部上游资产，**按相关性筛选**最终注入 prompt 的上下文。
- 不是把所有真相文件塞进去，而是只选：
  - 本章必出场角色的卡片
  - 本章涉及的世界观切片
  - 本章必须遵守的金手指限制
  - 与本章主题相关的 vault snippets（最多 3 张）
- 编译"运行时上下文"包，落盘到 `outline/chapters/.runtime/chapter-NNNN.context.json`（可调试）。

**为什么独立这一步**：上下文膨胀是 LLM 写章质量崩盘的最常见原因。compose 阶段把"全量真相"压成"本章相关切片"。

#### [3] WRITE（创作期 / 高温 0.7）

**Skill**: `novel-chapter-writer`（temp 0.7）

**做什么**：
- 严格按章纲 9 个字段写。
- 控字数（target ± 15%）。
- 内嵌反 AI 味规则（高频禁词、句式多样性）。
- 内嵌首屏钩子规则（前 200 字必须有矛盾 / 悬念）。
- 输出到 `chapters/chapter-NNNN.md`，frontmatter `status: draft`。

**默认温度 0.7**。如果用户配置了"风格指纹"，温度会被降到 0.6。

#### [4] AUDIT（审稿 / 低温 0.3）

**Skill**: `novel-quality-auditor`（temp 0.3）

**做什么**：33 维度检查（详见 [`skills/novel-quality-auditor/SKILL.md`](../../skills/novel-quality-auditor/SKILL.md)）。

5 大类：
1. **连续性**：角色记忆、物品状态、地理位置、时间线
2. **设定一致**：金手指消耗、境界匹配、世界观规则
3. **节奏与爽点**：钩子兑现、首屏命中、爽点密度、对话占比
4. **文风**：去 AI 味、文风指纹偏离、句式重复
5. **大纲遵从**：章纲 must-keep / must-avoid 命中率

**输出**：`audit/reports/chapter-NNNN.audit.md`，包含 critical / major / minor 三级 issues。

#### [5] REVISE（修订 / 中温 0.5）

**Skill**: `novel-chapter-writer` 的 revise phase（temp 0.5）

**做什么**：
- 只修 critical 和 major issues（minor 留给人工）。
- 5 种修订模式（借鉴 inkos）：
  - `polish`：润色 / 减字 / 句式调整
  - `spot-fix`：定点修复（只改 issue 涉及的段落）
  - `rewrite`：整章重写（保留章纲）
  - `rework`：连章纲一起改（issue 太严重时）
  - `anti-detect`：专门去 AI 味
- 默认只跑 1 轮修订（避免无限循环），仍未解决的 issues 留给用户决策。

#### [6] SETTLE（沉淀 / 低温 0.3）

**Skill**: `novel-quality-auditor` 的 settle phase

**做什么**：
- 从 approved 章节中过度提取 9 类事实（角色、位置、物品、关系、情感、信息、伏笔、时间、金手指消耗）。
- 输出 JSON delta（不是全量 markdown），由代码层做 schema 校验后 immutable apply。
- 更新 `memory/*.json` 全部 8 个文件 + 同步生成 `.md` 投影。
- 章节 frontmatter status 变为 `approved`。

**为什么单独 settle**：write 阶段做太多事会让 LLM 同时承担"创作"和"档案管理"两个角色，质量都掉。settle 拆出来给低温模型独立做，准确率显著提升。

### 5.3 单章循环的 4 种触发模式

| 触发命令 | 经过的阶段 | 适用场景 |
|---------|-----------|---------|
| `write next` | PLAN → COMPOSE → WRITE → AUDIT → REVISE → SETTLE | 默认全流程 |
| `draft` | COMPOSE → WRITE | 只生成草稿，先看效果 |
| `audit` | AUDIT | 已写好的章节单独审稿 |
| `revise --mode <m>` | REVISE | 针对已审稿结果做特定模式修订 |

---

## 6. 阶段 ⑤ 完结期：从 N 章到一本书

**目标**：把分散的章节资产聚合成"可上传 / 可发布"的成品。

### 主导 Skill
- `novel-studio`（总编排）
- `novel-quality-auditor`（全书复盘）
- `novel-asset-vault`（沉淀经验）

### 工作流

```
1. 全书复盘（quality-auditor 跑全书一致性扫描）
   ↓
2. 修订报告生成（按章列出剩余 issues）
   ↓
3. 用户决定（人工修 / AI 修 / 接受）
   ↓
4. 导出（v1：txt / md，v2：epub / 起点 word 格式）
   ↓
5. 复盘（asset-vault 把这本书的好桥段 / 失败教训 沉淀到 vault）
```

### 产物
- `audit/reports/full-book-audit.md`
- `dist/<book>.txt` / `dist/<book>.md`
- `vault/inspirations/lessons-from-<book>.md`（复盘卡）

---

## 7. 控制面（Control Surface）

借鉴 inkos 的"控制面 vs 运行时"分离。**控制面**是用户长期可编辑的文档，所有 skill 在做决策前都要读。

| 控制面文档 | 含义 | 谁会读 |
|-----------|------|-------|
| `blueprint.md` | 整本书最高契约 | 全部 skill |
| `world/cheat-system.md` | 金手指阶梯（爽点节拍依据） | outline-architect、chapter-writer、quality-auditor |
| `outline/master.md` | 五幕主线（长期方向） | outline-architect |
| `outline/volumes/volume-NN.md` | 当前卷节奏（中期方向） | outline-architect、chapter-writer |
| `outline/chapters/chapter-NNNN.md` | 当前章意图（短期方向） | chapter-writer、quality-auditor |
| `audit/style-fingerprint.json`（如启用） | 文风指纹 | chapter-writer、quality-auditor |

控制面是"人工 + AI 协作的契约层"。**运行时产物**则是 skill 内部的中间文件：

| 运行时产物 | 路径 | 谁生成 |
|-----------|------|-------|
| 章节运行时上下文 | `outline/chapters/.runtime/chapter-NNNN.context.json` | chapter-writer (compose) |
| 章节规则栈 | `outline/chapters/.runtime/chapter-NNNN.rule-stack.yaml` | chapter-writer (compose) |
| 章节执行追踪 | `outline/chapters/.runtime/chapter-NNNN.trace.json` | chapter-writer (compose) |
| 审计报告 | `audit/reports/chapter-NNNN.audit.md` | quality-auditor |

运行时产物只用于调试 / 复盘，可以随时删除而不影响后续生产。

---

## 8. Skill 之间的调用关系（编排图）

```
                         ┌────────────────┐
                         │  novel-studio  │ ◀── 用户主入口
                         │   (root)       │
                         └───┬────┬────┬──┘
                             │    │    │
                ┌────────────┘    │    └──────────────┐
                ▼                 ▼                   ▼
       ┌─────────────────┐  ┌─────────────┐  ┌──────────────┐
       │ market-radar    │  │ blueprint   │  │ asset-vault  │
       └────────┬────────┘  └──────┬──────┘  └──────┬───────┘
                │                  │                │
                │  trend reports   │  blueprint     │  vault cards
                ▼                  ▼                ▼
                          ┌──────────────────┐
                          │  worldforge      │
                          └────────┬─────────┘
                                   │  worldview + cheat-system
                                   ▼
                          ┌──────────────────┐
                          │ character-atelier│
                          └────────┬─────────┘
                                   │  characters
                                   ▼
                          ┌──────────────────┐
                          │ outline-architect│
                          └────────┬─────────┘
                                   │  outlines
                                   ▼
                          ┌──────────────────┐
                          │ chapter-writer   │ ◀── 写章核心循环
                          └────────┬─────────┘
                                   │  chapters
                                   ▼
                          ┌──────────────────┐
                          │ quality-auditor  │
                          └────────┬─────────┘
                                   │  memory updates + audit reports
                                   │
                                   └──── (循环回 chapter-writer 修订)
```

### 调用规则

1. **`novel-studio` 是唯一可被用户直接呼叫的入口**（其他 skill 也可单点呼叫，但 studio 提供导航）。
2. **下游 skill 不主动激活上游 skill**，而是 fail-fast：如果 `chapter-writer` 发现章纲缺失，应该返回提示让用户回到 `outline-architect`，而不是自己去写章纲。
3. **跨 skill 共享状态全部通过文件**：没有"内存对象传递"。任何 skill 重启都能从文件恢复状态。
4. **写操作要原子化**：写正文时先写到 `chapters/.tmp/chapter-NNNN.md`，写完再 `mv` 到正式路径，避免半截文件污染。

---

## 9. 失败处理与回滚

| 失败场景 | 处理方式 |
|---------|---------|
| LLM 输出格式错误（章节正文带 markdown 代码块） | chapter-writer 内嵌 fallback parser，剥离围栏 |
| 章节字数严重超标 / 不足 | 单 pass 归一化（normalizer），>75% 内容损失则拒绝并报错 |
| 审稿发现 critical issue | revise 阶段尝试修复 1 轮；若仍失败，章节状态保留 `draft`，issue 留给用户 |
| 真相文件 schema 校验失败 | settle 阶段拒绝写入，保留旧 memory，输出错误供调试 |
| 用户想回滚已 approved 的章节 | 从 `chapters/.snapshots/` 恢复，并触发 quality-auditor 重新 settle 后续章节 |
| skill 之间检测到上游资产缺失 | 立即停止，返回"请先 X"提示，不自动补 |

---

## 10. 性能 / 成本控制

### 10.1 上下文长度控制

inkos 的经验：写到 100+ 章时，全量真相注入会让单章 token 成本爆炸到 5 万 +。

我们的应对：

- **compose 阶段做相关性筛选**：每章只注入"本章相关角色 / 世界 / 金手指 / 钩子"。
- **chapter_summaries 长度截断**：默认只注入最近 5 章摘要，更早的走"卷级总结"。
- **vault 检索默认 top-3**：不是把所有素材都塞进 prompt。

### 10.2 多模型路由（v2 实现，v1 仅文档化）

不同 skill 的模型推荐：

| Skill | 推荐模型档位 | 理由 |
|-------|-------------|------|
| `blueprint` | 强（Claude Sonnet / GPT-4o） | 创意 / 用户协商，质量优先 |
| `worldforge` | 强 | 设定深度，质量优先 |
| `outline-architect` | 中（GPT-4o-mini / DeepSeek） | 结构化输出，性价比 |
| `chapter-writer` | 强（Claude Sonnet） | 创作主链，质量决定一切 |
| `quality-auditor` | 中（GPT-4o-mini） | 量大，性价比 |
| `market-radar` | 弱（任意 fast 模型） | 摘要任务，速度优先 |
| `asset-vault` | 弱 | 检索 + 标签，速度优先 |

v1 不强制路由，由用户在 runtime 自己选模型。v2 加 CLI 后支持 per-skill 模型配置。

### 10.3 缓存

- 章纲 / 世界观 / 角色卡读取后可在单次 session 内缓存。
- 真相文件每章 settle 后必须重新读取，不能跨章缓存。

---

## 11. 可观测性

每个 skill 在执行前 / 后必须输出一段结构化日志（写到 `audit/logs/<date>.jsonl`）：

```jsonl
{"ts": "2026-05-24T15:30:00Z", "skill": "novel-chapter-writer", "phase": "write", "chapter": 31, "input_tokens": 8234, "output_tokens": 3892, "model": "claude-sonnet-4", "duration_ms": 18234}
{"ts": "2026-05-24T15:30:18Z", "skill": "novel-quality-auditor", "phase": "audit", "chapter": 31, "issues_critical": 0, "issues_major": 2, "issues_minor": 5}
```

v1 由各 skill 在 SKILL.md 里要求 LLM 主动写这条日志（人为约束）。v2 加 CLI 后强制写入。

---

## 12. 与三个参考项目的 pipeline 对位

| 阶段 | inkos | webnovel-writer | AI-Novel-Writing-Assistant | Novel Studio |
|------|-------|-----------------|---------------------------|--------------|
| 灵感 | radar | — | 自动导演输入 | market-radar + asset-vault |
| 开书 | architect | webnovel-init | 自动导演 | blueprint |
| 世界 | architect (story_bible) | story-system contract | 项目设定 + 故事宏观规划 | worldforge |
| 角色 | architect (character_matrix) | (隐含) | 角色准备 | character-atelier |
| 大纲 | architect (volume_outline) | webnovel-plan | 卷战略 + 节奏拆章 | outline-architect |
| 写章 | writer + observer + reflector + normalizer | webnovel-write | 章节执行 | chapter-writer |
| 审稿 | auditor | webnovel-review | 质量修复 | quality-auditor |
| 修订 | reviser | (合并到 review) | 质量修复 | chapter-writer (revise) |
| 沉淀 | reflector | commit projection writers | 状态同步 + 伏笔回填 | quality-auditor (settle) |

---

下一节：[`03-memory-and-vault.md`](./03-memory-and-vault.md) 讲长期记忆系统与素材沉淀。

---
name: novel-studio
description: 网文创作 Studio 的根 skill 与导航中枢。当用户说"我要写本网文 / 看看这个项目什么状态 / 这本书写到哪了 / 整体导出 / 切换到另一本书 / 不知道下一步该做什么 / 帮我捋一下 / 进度 / 速度 / 节奏 / todo / 待办 / 里程碑 / 决策 / 经验 / 周报 / 月报 / 卷末快照 / 复盘"或者用户当前不在某个具体子流程里时使用。负责项目初始化（创建 novel.json + 目录骨架含 progress/）、读取并展示项目状态、根据当前阶段推荐下一步行动、跨 skill 编排（"开书一条龙"）、**v1.3 起还负责长文写作进度控制（progress/ 子系统：timeline 事件流 / milestones 里程碑 / velocity 速度指标 / decisions 决策日志 / lessons 经验沉淀 / todo 待办清单 / logs 执行日志 / snapshots 周末卷末快照）**。这是用户的默认入口；遇到不确定该用哪个 skill 时优先激活它。
version: 0.1.3
maintained_by: novel-studio
depends_on:
  upstream_skills: []
  upstream_assets: []
  downstream_skills: [novel-blueprint, novel-market-radar, novel-asset-vault, novel-worldforge, novel-character-atelier, novel-outline-architect, novel-chapter-writer, novel-quality-auditor]
  downstream_assets: [novel.json, progress/timeline.{json,md}, progress/milestones.{json,md}, progress/velocity.{json,md}, progress/todo.md, progress/decisions.md, progress/lessons.md, progress/logs/, progress/snapshots/]
  external_capabilities: []
---

# Novel Studio · 根 Skill / 总导航

你是 Novel Studio 的总编排者。Studio 是一套 AI 全流程网文写作系统，由 9 个 skill 组成，全部通过文件协作（无后端、无数据库）。这个根 skill 负责：

1. **项目初始化**：在空目录创建一本新书的骨架。
2. **状态导航**：告诉用户"这本书现在在哪个阶段、下一步该做什么"。
3. **跨 skill 编排**：把用户的高层意图（"开一本玄幻"）拆成多个 skill 的调用序列。
4. **多书管理**：在一个工作目录下管理多本书。

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- 用户刚进来，对话还没确定要做什么（"帮我捋一下"、"我想写本网文"）
- 用户问项目级问题（"这本书写到哪了"、"还差什么"、"整体导出"）
- 用户给的指令需要跨多个子 skill 协调（"开书一条龙"、"写完前 5 章"）
- 用户想切换不同的书

❌ 不要使用，应该让对应 skill 接手：
- 用户已经明确说"写下一章" → 让 `novel-chapter-writer` 接管
- 用户已经在编辑章纲 → `novel-outline-architect`
- 用户问起点最近什么火 → `novel-market-radar`
- 用户在沉淀素材 → `novel-asset-vault`

---

## 2. 输入与输出契约

### 输入（必需）
- 工作目录的当前状态（可能为空，可能已有书）

### 输入（可选）
- 用户的高层意图

### 输出
- `novel.json`（新建项目时）
- 目录骨架（新建项目时，含 `progress/` v1.3）
- `progress/timeline.{json,md}` / `progress/milestones.{json,md}` / `progress/velocity.{json,md}` / `progress/todo.md` / `progress/decisions.md` / `progress/lessons.md` / `progress/logs/<date>.jsonl` / `progress/snapshots/snapshot-*.md`（v1.3）
- 自然语言的状态报告 / 下一步建议

---

## 3. 工作流

### 工作流 A：初始化新项目

触发：用户说"开一本新书 / 初始化 / 创建项目"或工作目录为空。

步骤：

1. **检查当前目录**：是否已经有 `novel.json`？
   - 有 → 询问用户是创建第二本还是继续现有书
   - 没有 → 走新建流程

2. **询问最少必要信息**（不要一次问太多）：
   - 临时书名（可后续改）
   - 大致题材方向（玄幻 / 仙侠 / 都市 / 历史 / 科幻 / 末世 / 游戏 / 无限流 / 言情 / 灵异 / 其他）
   - 目标平台（起点 / 番茄 / 晋江 / 刺猬猫 / 知乎 / 不确定）

3. **创建目录骨架**（实际去执行文件操作）：

```
my-novel/
├── novel.json
├── outline/
│   ├── volumes/
│   └── chapters/
├── world/
├── characters/
│   ├── antagonists/
│   └── supporting/
├── chapters/
├── memory/
├── vault/
│   ├── inspirations/
│   ├── snippets/
│   ├── references/
│   └── style-fingerprints/
├── audit/
│   ├── reports/
│   ├── trends/
│   └── logs/
└── progress/                  # v1.3 新增
    ├── timeline.{json,md}
    ├── milestones.{json,md}
    ├── velocity.{json,md}
    ├── decisions.md
    ├── lessons.md
    ├── todo.md
    ├── logs/
    │   └── <YYYY-MM-DD>.jsonl
    └── snapshots/
```

⚠️ **v1.3 起，初始化时 progress/ 必须建立并写入第一条 timeline 事件 type: project-init**。复制 templates/progress/ 全部模板到目标目录，frontmatter 占位填上 ISO 时间。

4. **写 `novel.json`**（最小骨架，后续 blueprint 会扩充）：

```json
{
  "schema_version": "1.0",
  "asset_type": "project",
  "id": "<slug>-<6位随机>",
  "title": "<临时书名>",
  "subtitle": "",
  "genre": ["<用户选定>"],
  "platform_target": ["<用户选定>"],
  "lang": "zh-CN",
  "audience": "",
  "blueprint_status": "pending",
  "outline_status": "pending",
  "current_chapter": 0,
  "target_chapters": null,
  "target_chapter_words": 3500,
  "current_total_words": 0,
  "tags": [],
  "core_pitch": "",
  "agents": {},
  "created_at": "<ISO 时间>",
  "updated_at": "<ISO 时间>",
  "version": 1
}
```

5. **告诉用户下一步**：

> 项目骨架就绪。建议下一步：
> - 如果你已经有想法 → 进入 blueprint 定盘（"帮我开书"）
> - 如果你只是想看看市场 → 先扫雷达（"起点最近什么火"）
> - 如果你有参考资料 → 先把素材丢进 vault（"把这段存下来"）

→ 触发 `novel-blueprint` / `novel-market-radar` / `novel-asset-vault` 中的一个。

### 工作流 B：状态导航 / 推荐下一步（v1.3 强化：接入 progress/）

触发：用户说"这本书写到哪了 / 接下来做什么 / 进度 / 状态"。

步骤：

1. **读取 `novel.json`**，获取 `blueprint_status` / `outline_status` / `current_chapter`。

2. **快速扫描资产**：
   - `blueprint.md` 是否存在且 status: approved？
   - `world/worldview.md` / `world/cheat-system.md` 是否存在？
   - `characters/` 是否有主角文件？
   - `outline/master.md` / `outline/volumes/` / `outline/chapters/` 各有多少？
   - `chapters/` 已写了多少章？多少 approved，多少 draft？
   - `memory/` 是否就绪？

3. **读 progress/（v1.3 新增）**：
   - `progress/velocity.json` → 速度指标（chapters/day、words/day、估算完结日期）
   - `progress/todo.md` → 待办清单（hooks 债务、章纲待写、修订待跑、漏卡角色）
   - `progress/milestones.json` → 下个里程碑（target_chapter 距当前距离）
   - `progress/timeline.json` 最近 10 条事件 → "最近做了什么"

4. **生成阶段判定**（按下表）：

| 当前状态 | 推荐下一步 | 触发的 skill |
|---------|-----------|-------------|
| 没有 blueprint.md | 先开书定盘 | `novel-blueprint` |
| blueprint approved 但没有 world | 建世界 + 设计金手指 | `novel-worldforge` |
| world 完成但没有主角 | 捏角色 | `novel-character-atelier` |
| 角色就绪但没有总纲 | 写总纲 | `novel-outline-architect` |
| 总纲就绪但没有第 1 卷卷纲 | 写卷纲 | `novel-outline-architect` |
| 卷纲就绪但没有前 10 章章纲 | 写章纲 | `novel-outline-architect` |
| 有章纲但 chapters/ 是空的 | 开始写第 1 章 | `novel-chapter-writer` |
| 已写 N 章但 audit 报告 < N | 还有 X 章未审稿 | `novel-quality-auditor` |
| current_chapter 接近卷末 | 准备卷末高潮 + 写下一卷卷纲 | `novel-outline-architect` |
| **progress/todo.md 紧急区有 length critical 章节** | extend 模式补字 | `novel-chapter-writer` revise extend |
| **progress/todo.md 有 stale > threshold 的 hook** | 下一章 PLAN 时 mention | `novel-outline-architect` |
| **progress/velocity 估算完结日期 > 用户预期** | 警告并建议提速 / 降目标 | `novel-blueprint` 调整第 10 节 |
| 全书已写完 | 全书复盘 + 导出 | `novel-quality-auditor` + 自身 export 流程 |

5. **以友好方式输出**（v1.3 强化：进度 + 节奏 + 待办 三段式）：

> **《吞天魔帝》进度**（炼气七层 → 筑基初期）
> - 已写 31 章（30 approved / 1 draft）
> - 当前第 1 卷《残卷初鸣》第 31 / 50 章
> - 卷末高潮在 45 章，距离 14 章
>
> **节奏**（最近 7 天）：
> - 1.2 章/天 / 3500 字/天 / 连续写作 streak 5 天 ✓
> - 估算 800 章完结：~2025-12-30（距今 1 年 8 月）
>
> **待办**（紧急 3 / 重要 5）：
> - 紧急：第 31 章 draft 待 audit
> - 紧急：hook-canjuan-origin 已 stale 4 章，建议第 32 章 mention
> - 重要：第 35 章前 张三长老阴谋揭露铺垫
>
> **建议下一步**（按 impact 排序）：
> 1. 审第 31 章（quality-auditor）
> 2. 写第 32 章（章纲已就绪）
> 3. 现在还没有第 2 卷的卷纲，等第 1 卷写完前 5 章再想

### 工作流 C：跨 skill 编排（"开书一条龙"）

触发：用户说"帮我开一本玄幻，主角是个程序员穿越，金手指是能调试任何功法 / 一条龙 / 整套来"。

步骤：

1. **拆解意图**为有序任务列表：

```
1. blueprint：开书定盘（题材 + 主角 + 金手指 + 卖点）
2. worldforge：建世界 + 详化金手指
3. character-atelier：捏主角 + 1-2 个反派 + 1-2 个配角
4. outline-architect：写总纲 → 第 1 卷卷纲 → 前 5-10 章章纲
5. chapter-writer：写第 1 章
6. quality-auditor：审第 1 章 + settle
7. ...继续写第 2、3 章
```

2. **明确告知用户**："好，我们走完整流程。每一步我会停下来确认。" 不要默默连 7 步。

3. **逐步触发对应 skill**，每一步完成后回到 studio 做"是否进入下一步"的判定。

4. **在每个 skill 调用前**：
   - 检查上游资产是否就绪（blueprint 在不在？world 在不在？）
   - 不就绪则提醒用户：必须先做某步
   - 就绪则触发对应 skill

### 工作流 D：多书管理

触发：用户在多本书的工作目录下，说"切换到《北境长枪》/ 列出所有书"。

步骤：

1. **扫描工作目录**找所有 `novel.json`（一层 + 两层子目录）。

2. **列出所有书**：

```
找到 3 本书：
  ① 吞天魔帝（玄幻，第 31 章 / 800 章，approved）
  ② 北境长枪（历史，第 8 章 / 500 章，draft 居多）
  ③ 春风渡（言情，蓝图刚定盘，0 章）
```

3. **要求用户选定一本**后，把后续工作目录切换到那本书的子目录。

> v1 没有真正的"工作目录切换"机制，所以这一步实际上是让 LLM 在后续操作里把所有路径加上书的子目录前缀。v2 CLI 会有正式的 `cd` 概念。

### 工作流 E：项目导出

触发：用户说"导出 / 整本下载 / 给我一个 txt"。

步骤：

1. **询问导出格式**（v1 只支持 `txt` / `md`，v2 加 `epub`）。
2. **询问是否只导出 approved 章节**（默认是）。
3. **拼接所有 `chapters/chapter-NNNN.md`**：
   - 提取标题（从 frontmatter 或 H1）
   - 剥离 frontmatter
   - 章与章之间加分隔（txt 用 `\n\n========\n\n`，md 用 `---`）
4. **写到 `dist/<book-slug>.txt`** 或 `.md`。
5. **报告字数 / 章节数**。

### 工作流 F：进度跟踪专项（v1.3 新增）

触发：用户说"进度 / 速度 / todo / 待办 / 里程碑 / 节奏 / 写到哪 / 决策 / 经验 / 沉淀经验 / 周报 / 月报 / 卷末快照 / 复盘"。

⚠️ 工作流 B 是"快速状态导航 + 推荐下一步"。工作流 F 是"深度进度报告 / 维护 progress/ 资产"。

#### F.1 进度报告（用户问"详细进度"）

读取 `progress/` 全部 + memory/ + audit/ 聚合：

```
1. progress/timeline.json 最近 30 条事件（按时间倒序）
2. progress/milestones.json 全部（reached + pending 分类）
3. progress/velocity.json （recompute 一次确保新鲜）
4. progress/todo.md 全部
5. memory/pending_hooks.json 中 stale > threshold 的 → 与 todo 交叉验证
6. audit/reports/full-book-audit.md（如有）
```

输出 5 段式：

```
## 当前
- 第 N / target_chapters 章 (X% 进度)
- 卷 V / target_volumes
- 主角境界 + 当前位置（从 memory/current_state.md）
- 总字数 / 均章字数

## 节奏（最近 7d / 30d / 全期）
- chapters/day, words/day, streak
- audit_pass_rate, length_warning_rate, length_critical_rate
- 估算完结日期 + 与用户预期对比

## 里程碑
- 已达成（最近 5 个）
- 待达成（按 target_chapter 升序，前 3 个）
- ⚠️ missed / deferred（如有）

## 待办
- 紧急 N / 重要 N / 长期 N

## 风险与建议
- 节奏偏慢 / length critical 累积 / hook 债务高
- 给出 2-3 条具体行动建议
```

#### F.2 维护决策日志（用户说"记一下这个决定"）

```
1. 询问决策的：标题 / 决策 / 原因 / 影响范围 / 反向决定的可能性
2. append 到 progress/decisions.md（日期 + 决策 4 段式）
3. 同步在 progress/timeline.json 写一条 type: decision-recorded 事件
```

#### F.3 沉淀经验（卷末 / 用户主动 / studio 主动建议）

触发条件：
- 用户说"沉淀经验 / 卷末复盘"
- 卷末（current_chapter 进入卷末范围）studio 主动询问
- 重要 spot-fix / rework 后 studio 询问"有什么想沉淀的吗"

```
1. 询问当下"现象 / 根因 / 改进策略 / 跨书可学" 4 段式
2. append 到 progress/lessons.md
3. 重要的 lesson 同步触发 asset-vault 沉淀为 inspiration card（可选）
```

#### F.4 周快照 / 卷末快照（用户主动触发）

触发：用户说"存个快照 / 周末了 / 卷末了 / 给我一份周报"。

```
1. 计算 period（weekly: 上周一 ~ 上周日；volume-end: 卷起始 ~ 卷末当章）
2. 拉取 period 内：
   - timeline 事件
   - 章节数 + 字数 + 评分变化
   - 新增的 decisions / lessons
   - 完成的 milestones
3. 按 templates/progress/snapshots/snapshot-template.md 模板填充
4. 写到 progress/snapshots/snapshot-<period-id>.md
5. timeline 写一条 type: snapshot-taken 事件
```

#### F.5 维护 todo.md（recompute）

触发：用户说"刷新 todo / 更新待办"或工作流 B 被调用时自动顺带。

```
1. 扫 memory/pending_hooks.json → stale 钩子加入紧急/重要
2. 扫 memory/subplot_board.json → stale 支线加入重要
3. 扫 outline/chapters/ → 已 PLAN 但 chapters/chapter-NNNN.md 不存在的 → 紧急
4. 扫 audit/reports/*.audit.md → length_critical 且 status: draft 的 → 紧急
5. 扫 characters/_index.json → memory 里 mentioned 但无 character file 的 → 重要
6. 扫 milestones.json → target_chapter 距当前 ≤ 5 章的 pending → 紧急
7. 保留用户手动添加的"自定义事项"（不覆盖）
8. 重写 todo.md
```

#### F.6 维护 milestones.json（upsert）

触发：用户说"加里程碑 / 这是个里程碑节点"或在 blueprint / outline / cheat-system 变更时自动同步。

```
1. 静态来源（写入时同步）：
   - blueprint.md 第 5 节钩子 → 一一映射 scene 类里程碑
   - outline/master.md 卷末 → volume 类里程碑
   - cheat-system.json.beats → power 类里程碑（type: stage-up）
   - powers.json.protagonist_curve → character-arc 类里程碑
2. 动态触发（事件发生时回填）：
   - chapter-settle 事件触发 → 检查里程碑是否 reached
   - 如果是，patch milestone status: reached + reached_at
   - timeline 写一条 type: milestone-reached
```

---

## 4. 关键规则

### R1：Studio 不直接写业务资产

`novel-studio` 自己只写 `novel.json`、目录骨架、`dist/<book>.{txt,md}`。其他资产（blueprint / world / characters / outline / chapters / memory / vault）一律由对应 skill 写。

### R2：阶段判定基于文件而非 novel.json 自报字段

`novel.json` 里的 `blueprint_status: approved` 是**记账字段**，但真正的判定要去看 `blueprint.md` 是否存在且 frontmatter 里 `status: approved`。文件是源头。

### R3：跨 skill 编排时显式告知步骤

不要默默连续触发 7 个 skill。每完成一步要：
- 总结刚才做了什么
- 把产物路径告诉用户
- 明确下一步将做什么
- 等用户确认（除非用户明确说"全自动跑"）

### R4：fail-fast，不替下游 skill 兜底

如果用户说"写下一章"但 `outline/chapters/` 是空的，studio 应该说"章纲不存在，请先写章纲"，而不是自己去写章纲。

### R5：不修改其他 skill 的产物

studio 不能直接编辑 `blueprint.md` / `world/*` / `chapters/*`。要修改去找对应 skill。

### R6：维护 progress/ 是 studio 的核心职责（v1.3 新增）

studio 是 progress/ 的总维护者。具体职责：

- **写 timeline**：自身执行的工作流（init / 项目级编排 / 导出 / decision / lesson / snapshot）必须 append 一条 timeline 事件
- **聚合 velocity**：用户问"进度"时 recompute（缓存 10 分钟）
- **聚合 todo**：每次工作流 B 被调用时顺带 recompute（不要等到用户问 todo）
- **upsert milestones**：blueprint / outline / cheat-system / powers 写入时被通知，同步插入对应里程碑（v1 由 LLM 主动协作；v2 CLI 强制）
- **响应 progress 查询**：用户用 F.1-F.6 任一触发语时，studio 是唯一处理者

### R7：所有 skill 必须 append progress/logs/<date>.jsonl（v1.3 全局约束）

每个 skill（含 studio 自身）在执行结束时必须写一条 jsonl 事件到 `progress/logs/YYYY-MM-DD.jsonl`：

```jsonl
{"ts":"<ISO>","skill":"<skill-name>","phase":"<phase>","event":"<event>","details":{...}}
```

studio 在加载项目时检查 logs/ 完整性。缺失的日期视为"那天没写作"，不强制补齐。

> v1 由 SKILL.md 约束 LLM 主动写。v2 引入 CLI 后由 wrapper 强制写。

---

## 5. 与其他 skill 的协作

| 触发场景 | studio 的行为 | 转交给 |
|---------|-------------|--------|
| 用户说"开书定盘 / 给我开书方向" | 检查 novel.json 存在性，如不存在先初始化 | `novel-blueprint` |
| 用户说"建世界 / 设计金手指" | 检查 blueprint 是否 approved | `novel-worldforge` |
| 用户说"捏主角 / 设计反派" | 检查 world 是否就绪 | `novel-character-atelier` |
| 用户说"写大纲 / 章纲" | 检查 characters 索引是否就绪 | `novel-outline-architect` |
| 用户说"写下一章 / 写第 N 章" | 检查章纲是否就绪 | `novel-chapter-writer` |
| 用户说"审稿 / 检查矛盾" | — | `novel-quality-auditor` |
| 用户说"起点最近什么火 / 选题" | — | `novel-market-radar` |
| 用户说"把这段存下来 / 灵感 / 桥段" | — | `novel-asset-vault` |
| **用户说"进度 / 速度 / 节奏 / todo / 里程碑"（v1.3）** | **由 studio 自身处理（工作流 F.1）** | — |
| **用户说"记一下这个决定"（v1.3）** | **studio 写 progress/decisions.md（工作流 F.2）** | — |
| **用户说"沉淀经验 / 复盘"（v1.3）** | **studio 写 progress/lessons.md（工作流 F.3），可选触发 asset-vault 沉淀 inspiration** | `novel-asset-vault`（可选） |
| **用户说"快照 / 周报 / 卷末报告"（v1.3）** | **studio 写 progress/snapshots/snapshot-*.md（工作流 F.4）** | — |

---

## 6. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 工作目录已有 novel.json，用户又说"开新书" | 询问是创建第二本还是继续现有书；不要直接覆盖 |
| `novel.json` schema 不对（手动改坏了） | 提示用户 schema 字段缺失，列出缺失字段，不自动修复 |
| 多本书的目录命名冲突 | 在 novel.json id 里追加随机后缀避免冲突 |
| `chapters/` 有但 `memory/` 缺失 | 提示用户："章节数 N 但 memory 为空，需要先 quality-auditor 重建 memory" |
| 用户在子书目录里却问"列出所有书" | 向上回到工作根目录扫描 |

---

## 7. 示例对话

### 示例 1：从空目录开始

```
用户：我要写本网文。

studio：好，先做最少必要的几个选择：
  - 大致题材？玄幻 / 仙侠 / 都市 / 历史 / 科幻 / 末世 / 游戏 / 无限流 / 言情 / 灵异
  - 目标平台？起点 / 番茄 / 晋江 / 刺猬猫 / 知乎 / 不确定
  - 临时书名？（可以后续改）

用户：玄幻，起点，临时叫《吞天魔帝》。

studio：[创建 novel.json + 目录骨架]
       骨架就绪。下一步建议：
       - 进入 blueprint 定盘（10 步把开书契约定下来）
       - 或先扫一下起点玄幻新书榜，找差异化方向
       你想哪个？

用户：开书。

→ 转交 novel-blueprint
```

### 示例 2：状态导航

```
用户：这本书写到哪了？

studio：[读 novel.json + 扫描资产]
       《吞天魔帝》进度：
       - 已写 31 章（30 approved，1 draft）
       - 第 1 卷《残卷初鸣》（共 50 章）的第 31 章
       - 卷末高潮在 45 章
       
       建议：
       1. 第 31 章是 draft，可以先审一下（quality-auditor）
       2. 然后写第 32 章
```

### 示例 3：开书一条龙

```
用户：帮我开一本玄幻，主角是个程序员穿越古代修真界，金手指是能"调试"功法找 bug。完整走一遍。

studio：好，完整流程会经过 5 步：
       1. blueprint 定盘
       2. worldforge 建世界 + 金手指
       3. character-atelier 捏主角 + 反派
       4. outline-architect 总纲 + 第 1 卷卷纲 + 前 5 章章纲
       5. chapter-writer 写第 1 章 + quality-auditor 审稿
       
       每一步我会停下来确认。开始第 1 步：
       
→ 转交 novel-blueprint，附上"程序员穿越 + 调试功法"作为初始灵感
```

---

## 8. 引用文档

- 9 类资产 schema：[`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md)
- 5 阶段 pipeline：[`docs/design/02-pipeline-architecture.md`](../../docs/design/02-pipeline-architecture.md)
- 演进路线：[`docs/roadmap.md`](../../docs/roadmap.md)

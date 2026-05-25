# 长文写作进度控制 · Novel Studio

> v1.3 新增子系统。在 memory/ / vault/ / audit/ 之外，独立第 4 类项目级资产 `progress/`。
> **解决的真问题**：写到 200+ 章时，作者忘了"我什么时候做了哪些决定 / 这个月写了几章 / 当前节奏跟得上吗 / 还欠读者多少债"。
>
> v1.2《吞天魔帝》前 5 章实战暴露了进度管理的盲区：5 次 settle 后 memory 演进良好，但**作者侧的元数据（写作速度、决策记录、债务清单）完全没有归档**——v1.3 由本子系统补齐。

---

## 1. 设计哲学

### 1.1 progress 与 memory / vault / audit 的边界

| 子系统 | 视角 | 颗粒度 | 写入方 |
|--------|------|--------|-------|
| `memory/` | **故事内**真相（角色、伏笔、世界状态） | 按章 settle | quality-auditor |
| `vault/` | **跨书素材库**（snippets / inspirations / references / fingerprints） | 按卡 | asset-vault（多 skill 共用） |
| `audit/reports/` | **一次性产出物**（每章审稿报告 + 雷达扫描） | 按章 / 按扫描 | quality-auditor / market-radar |
| `audit/logs/` | LLM 调用追踪（v1 简版） | 按事件 | 各 skill |
| **`progress/`（v1.3 新增）** | **作者侧的过程元数据**（速度、里程碑、决策、债务清单） | 跨章累积 | novel-studio（聚合）+ 各 skill（追加） |

一句话：**memory/ 管"故事还没忘"；progress/ 管"作者没忘自己写了什么"。**

### 1.2 三条不动摇

1. **追加 only**：progress/ 大部分文件是 append-only 的事件流，不重写历史
2. **去重组装**：聚合视图（velocity / milestones）从原始 timeline + logs 计算，**不能成为权威源**
3. **跨书可对比**：同一作者多本书的 progress/ 可以拿来横向对比"我写不同题材的速度差异"

---

## 2. 文件结构

```
my-novel/
└── progress/
    ├── timeline.{json,md}          # 全书时间轴（append-only 事件流）
    ├── milestones.{json,md}        # 里程碑（关键节点的"已达成 / 待达成"）
    ├── velocity.{json,md}          # 速度指标（按 7d / 30d / 全书 三档）
    ├── decisions.md                # 决策日志（手工 + AI 辅助记录的"重要选择"）
    ├── lessons.md                  # 经验沉淀（写完一卷复盘出来的可学教训）
    ├── todo.md                     # 待办清单（钩子债务 / 角色待补 / 章纲待写 / 修订待跑）
    ├── logs/                       # 详细执行日志（按日切分 jsonl）
    │   ├── 2026-05-01.jsonl
    │   ├── 2026-05-02.jsonl
    │   └── ...
    └── snapshots/                  # 周末 / 卷末快照（人工触发）
        ├── snapshot-2026-W18.md
        ├── snapshot-2026-W21-vol1-mid.md
        └── ...
```

---

## 3. 核心资产 schema

### 3.1 timeline.json（全书时间轴）

事件流，append-only。每个事件至少：

```json
{
  "schema_version": "1.0",
  "asset_type": "progress-timeline",
  "asset_id": "timeline",
  "version": 47,
  "created_at": "2026-05-01T00:00:00Z",
  "updated_at": "2026-05-24T18:00:00Z",
  "data": {
    "events": [
      {
        "ts": "2026-05-01T00:00:00Z",
        "type": "project-init",
        "skill": "novel-studio",
        "details": {"book_id": "tunshi-mo-di-a3f9c2"}
      },
      {
        "ts": "2026-05-01T18:00:00Z",
        "type": "blueprint-approved",
        "skill": "novel-blueprint",
        "details": {"version": 4}
      },
      {
        "ts": "2026-05-24T10:00:00Z",
        "type": "chapter-write",
        "skill": "novel-chapter-writer",
        "chapter": 1,
        "details": {
          "duration_ms": 18234,
          "tokens": {"in": 8234, "out": 3892},
          "model": "claude-sonnet-4",
          "word_count": 2757,
          "length_warning": true
        }
      },
      {
        "ts": "2026-05-24T10:30:00Z",
        "type": "chapter-audit",
        "skill": "novel-quality-auditor",
        "chapter": 1,
        "details": {"audit_score": 87, "aigc_score": 94, "issues": {"critical": 0, "major": 0, "minor": 1}}
      },
      {
        "ts": "2026-05-24T11:00:00Z",
        "type": "chapter-settle",
        "skill": "novel-quality-auditor",
        "chapter": 1,
        "details": {"deltas_applied": 7}
      }
    ]
  }
}
```

**事件类型枚举**：

| type | 触发方 | 备注 |
|------|--------|------|
| `project-init` | novel-studio | 项目创建 |
| `blueprint-drafting` / `blueprint-approved` | novel-blueprint | 蓝图状态变化 |
| `world-update` / `cheat-system-update` / `powers-update` | novel-worldforge | 世界 / 金手指 / 力量更新 |
| `character-add` / `character-update` | novel-character-atelier | 角色变更 |
| `outline-master-update` / `outline-volume-update` / `outline-chapter-add` | novel-outline-architect | 三级大纲变更 |
| `chapter-plan` / `chapter-compose` / `chapter-write` / `chapter-revise` | novel-chapter-writer | 单章六阶段 |
| `chapter-audit` / `chapter-settle` | novel-quality-auditor | 审稿 + 沉淀 |
| `vault-add` / `vault-use` | novel-asset-vault | 素材沉淀与使用 |
| `radar-scan` | novel-market-radar | 雷达扫描 |
| `decision-recorded` | 用户 + studio | 写到 decisions.md |
| `lesson-recorded` | 用户 + studio | 写到 lessons.md |
| `milestone-reached` | studio 推断 | 里程碑达成 |
| `snapshot-taken` | 用户触发 | 写一个快照 |

### 3.2 milestones.json（里程碑）

```json
{
  "schema_version": "1.0",
  "asset_type": "progress-milestones",
  "asset_id": "milestones",
  "data": {
    "milestones": [
      {
        "id": "m-blueprint-approved",
        "name": "蓝图定盘",
        "type": "phase",
        "status": "reached",
        "target_chapter": null,
        "reached_at": "2026-05-01T18:00:00Z"
      },
      {
        "id": "m-vol1-first-comeback",
        "name": "卷 1 第一爽点（七寸断反杀）",
        "type": "scene",
        "status": "reached",
        "target_chapter": 5,
        "reached_at": "2026-05-24T16:00:00Z",
        "promised_in": "blueprint.md 第 5 节",
        "audit_score": 89
      },
      {
        "id": "m-vol1-elder-conspiracy-revealed",
        "name": "卷 1 长老阴谋揭露",
        "type": "scene",
        "status": "pending",
        "target_chapter": 15,
        "promised_in": "blueprint.md 第 5 节"
      },
      {
        "id": "m-vol1-end",
        "name": "卷 1 末高潮（祭祀大典翻盘）",
        "type": "volume",
        "status": "pending",
        "target_chapter": 50,
        "promised_in": "outline/master.md + blueprint.md"
      },
      {
        "id": "m-tier-2",
        "name": "金手指 Tier 1 → Tier 2",
        "type": "power",
        "status": "pending",
        "target_chapter": 50,
        "promised_in": "world/cheat-system.json"
      }
    ]
  }
}
```

**里程碑类型枚举**：`phase` / `volume` / `scene` / `power` / `character-arc` / `audit-target`。

### 3.3 velocity.json（速度指标）

```json
{
  "schema_version": "1.0",
  "asset_type": "progress-velocity",
  "asset_id": "velocity",
  "computed_at": "2026-05-24T18:00:00Z",
  "data": {
    "all_time": {
      "chapters_written": 5,
      "total_words": 13078,
      "avg_words_per_chapter": 2616,
      "elapsed_days": 24,
      "writing_days": 5,
      "audit_pass_rate": 1.0,
      "revise_rate": 0.2,
      "length_warning_rate": 1.0,
      "length_critical_rate": 0.4
    },
    "last_7d": {
      "chapters_written": 5,
      "total_words": 13078,
      "writing_days": 5,
      "chapters_per_day": 1.0,
      "words_per_day": 2615.6
    },
    "last_30d": "same as all_time（项目刚开始）",
    "estimated_completion": {
      "target_chapters": 800,
      "remaining_chapters": 795,
      "current_chapters_per_day": 1.0,
      "estimated_days_to_finish": 795,
      "estimated_finish_date": "2028-07-27",
      "warning": "当前节奏 1 章/天 + 字数偏短，按 800 章 800 个工作日计算 → 需 ~3 年完结。建议提速到 2 章/天 或降目标章数"
    },
    "streak": {
      "current": 0,
      "longest": 5,
      "longest_window": "2026-05-20 ~ 2026-05-24"
    }
  }
}
```

### 3.4 decisions.md（决策日志）

人类可读的"重要选择记录"。粒度比 timeline 粗，但比 lessons 具体：

```markdown
---
asset_type: progress-decisions
asset_id: decisions
maintained_by: novel-studio
---

# 决策日志

## 2026-05-01 · blueprint v1 → v4 调整

**决策**：金手指 Tier 4 的代价从"精神力"改为"记忆"

**原因**：呼应"残卷会消失"的长期伏笔（卷 12），让 Tier 4 解锁的代价跟"残卷消失"在同一条主题线上

**影响范围**：
- world/cheat-system.json `stages[3]` + `alt_cost`
- 第 720+ 章关键节拍
- 不影响前 100 章

## 2026-05-03 · 角色阵容收紧

**决策**：第一次只捏 5 个角色（主角 + 早反 + 中反 + 核心配角 × 2），其他按需补

**原因**：v1 character-atelier R6 "先少后多"。前 5 章角色不超过 5 个能减少读者认知负担

**影响范围**：characters/ 5 个核心卡 + 关系网

## 2026-05-24 · 第 3 章 spot-fix v1 → v2

**决策**：师太对林烬"亲近度过快"，加一句"师太瞥了他一眼，不再多话" 反衬克制

**原因**：character.md 字段 3 性格内核"90% 装糊涂，10% 出手要止于分寸"——第 3 章 v1 师太给了第二次温和回应破坏了这个克制感

**影响范围**：仅第 3 章 v2，不影响其他章
```

### 3.5 lessons.md（经验沉淀）

```markdown
---
asset_type: progress-lessons
asset_id: lessons
maintained_by: novel-asset-vault + novel-studio
---

# 经验沉淀

## 写作 5 章后

### 字数控制（v1.3 学到的最大教训）

5 章实战中字数全部偏短（target 3500，实际均 2616）。根因是：5 个事件 × 500 字 = 2500，贴近软范围下沿。

**学到的**：章纲事件链 5 个事件不够撑 3500 字；要么加到 6-7 个事件，要么改 chapter_type。

**v1.3 修复**：outline-architect R8 强约束 + chapter-writer extend mode + auditor D33 严重度分级。

**跨书可学**：下本书一开始就按 `events ≥ ceil(target / 500)` 设事件链，避免反复触发 length warning。

### 反 AI 味词表起作用

5 章 AIGC 平均分 93。"缓缓 / 竟然 / 不可思议"的禁用确实拉开了和直接 GPT 输出（60-70）的差距。

**学到的**：题材专属 fatigue 词比通用词表更管用。下本书前期就要从参考作品提取风格指纹。

### 角色性格内核约束有效

第 4 章 audit 主动拦截"林烬主动找赵天霄报复"的 OOC 倾向，writer 自动改为"先观察后行动"。

**学到的**：character.md 字段 3 一旦 approved 就不要轻改。前 5 章实战证明"信用度高"的内核能反向约束 writer。
```

### 3.6 todo.md（待办清单）

聚合自 memory + outline + character_matrix + audit reports：

```markdown
---
asset_type: progress-todo
asset_id: todo
generated_at: 2026-05-24T18:00:00Z
---

# 待办清单（截至第 5 章末）

## 紧急（本周内）

- [ ] 写第 6 章正文（章纲未 PLAN，先回 outline-architect）
- [ ] 处理赵天霄医庐发酵（已 resolved hook，但事件后续没写）

## 重要（卷 1 内）

- [ ] mention `hook-canjuan-origin`（已 stale 3 章，第 6 或 7 章必须 mention）
- [ ] 第 15 章 张三长老首次正式出场，前置铺垫还差 2 章
- [ ] 第 25 章 cheat-system.beats[3] backlash 准备
- [ ] 第 30 章 cheat-system.beats[4] windfall（残卷浮现秘境信息）准备

## 长期（卷 2+）

- [ ] 卷 2 卷纲（不晚于第 45 章）
- [ ] 卷 1 末祭祀大典（第 45-50 章）的 stage-up 节拍

## 角色矩阵

- [ ] 苏婉柔母亲身份的 mid-tier hook（卷 2 揭示）
- [ ] 玉清师太真实身份的 mid-tier hook（卷 4 揭示）

## 修订待跑

- 无（5 章全部 approved）
```

### 3.7 logs/YYYY-MM-DD.jsonl

每日一文件，每行一个 JSON 事件。比 timeline.json 更细的执行日志：

```jsonl
{"ts":"2026-05-24T10:00:00Z","skill":"chapter-writer","phase":"compose","chapter":1,"input_tokens":8234,"model":"claude-sonnet-4","duration_ms":234}
{"ts":"2026-05-24T10:00:30Z","skill":"chapter-writer","phase":"write","chapter":1,"output_tokens":3892,"duration_ms":18234,"word_count":2757}
{"ts":"2026-05-24T10:01:00Z","skill":"chapter-writer","phase":"length-check","chapter":1,"actual":2757,"target":3500,"length_warning":true,"length_critical":false}
{"ts":"2026-05-24T10:30:00Z","skill":"quality-auditor","phase":"audit","chapter":1,"issues_critical":0,"issues_major":0,"issues_minor":1,"audit_score":87,"aigc_score":94}
{"ts":"2026-05-24T11:00:00Z","skill":"quality-auditor","phase":"settle","chapter":1,"deltas":{"current_state":2,"particle_ledger":3,"pending_hooks":4,"chapter_summaries":1,"emotional_arcs":2,"character_matrix":2}}
```

### 3.8 snapshots/snapshot-YYYY-WNN.md

每周或每卷末手动触发的"完整快照"——把当周 / 当卷的进度凝固成一份可读报告：

```markdown
---
asset_type: progress-snapshot
asset_id: snapshot-2026-W21
period: weekly
period_start: 2026-05-19
period_end: 2026-05-25
generated_at: 2026-05-24T20:00:00Z
---

# 周快照 · 2026-W21（v1.2 实战周）

## 本周完成

- 项目初始化 + blueprint v1-v4 定盘
- worldview / cheat-system / powers 三件套
- 5 个角色卡 + relationships
- 总纲 + 卷 1 卷纲 + 5 章纲
- 5 章正文 + 5 份 audit + 5 次 settle
- 全书复盘 + 4 张 vault 卡

## 数据

- 字数：13078（5 章）
- 均评分：85.8
- 速度：5 章 / 5 天 = 1.0 章/天

## 关键发现

字数控制偏短（74.7%）—— 见 [`lessons.md`](../lessons.md) 第一节。

## 下周计划

- 第 6-10 章（按 v1.3 修复后的字数预估走）
- 进入 PLAN 滚动模式
- 关注 hook-canjuan-origin 是否需要 mention
```

---

## 4. 维护协议

### 4.1 谁写 timeline / logs

**所有 skill** 在执行结束时**必须 append 一条日志**到当日 jsonl + 一条事件到 timeline.json。

格式由各 skill SKILL.md 在 v1.3 起强制要求。

> v1 没有代码层强校验。靠 SKILL.md 的"R10 必须写日志"约束。v2 引入 CLI 后变成代码强制。

### 4.2 谁聚合 velocity / milestones / todo

**`novel-studio`** 在用户问"进度"时**实时计算**：

- velocity：从 timeline 的 chapter-write 事件聚合
- milestones：从 blueprint + outline + cheat-system + powers 静态读 + 与 timeline.events 比对
- todo：从 pending_hooks（stale）+ subplot_board（stale）+ outline（待 PLAN）+ audit reports（length critical 待 extend）+ characters/_index 漏卡角色聚合

**计算结果不强制持久化**。但 studio 在每次输出时可选 `cache to progress/velocity.{json,md}`，下次直接用缓存（10 分钟过期）。

### 4.3 谁写 decisions / lessons

**用户 + studio 协商**：

- 用户主动说"记一下这个决定" → studio 写一条到 decisions.md
- 卷末 / 完书 → studio 主动询问"有什么想沉淀的教训吗"，引导用户填 lessons.md
- studio 也可以主动建议沉淀（如 spot-fix v1 → v2 这种重要修订）

### 4.4 谁写 snapshots

**只有用户主动触发**："存个快照 / 周末了 / 卷末了"。

studio 拉取当周 / 当卷的 timeline + velocity + milestones + 关键 audit 结果，生成一份 markdown。

---

## 5. 与 9 个 skill 的协作矩阵

| skill | 写 timeline 事件 | 写 logs jsonl | 读 progress 决策 |
|-------|----------------|--------------|---------------|
| `novel-studio` | ✅ project-init / milestone-reached / decision-recorded | ✅ | 全部读 |
| `novel-blueprint` | ✅ blueprint-* | ✅ | — |
| `novel-market-radar` | ✅ radar-scan | ✅ | — |
| `novel-worldforge` | ✅ world / cheat / powers update | ✅ | — |
| `novel-character-atelier` | ✅ character-add / update | ✅ | 读 todo（漏卡角色提醒） |
| `novel-outline-architect` | ✅ outline-* / chapter-add | ✅ | 读 todo（hook stale + 卷纲缺失） |
| `novel-chapter-writer` | ✅ chapter-plan / compose / write / revise | ✅ | 读 milestones（关键里程碑章节质量门槛 +1 级） |
| `novel-quality-auditor` | ✅ chapter-audit / settle | ✅ | 读 milestones（关键章 audit 严格度） |
| `novel-asset-vault` | ✅ vault-add / use | ✅ | — |

---

## 6. 实战示例：5 章末状态

回填到《吞天魔帝》实战项目（详见 `examples/tunshi-mo-di/progress/`）：

```
progress/
├── timeline.json            # 47 个事件（init + 4 setup + 5 章 × 6 阶段 + ...）
├── timeline.md              # 投影
├── milestones.json          # 18 个里程碑（5 reached + 13 pending）
├── milestones.md
├── velocity.json            # all_time + last_7d + estimated_completion
├── velocity.md
├── decisions.md             # 5 条决策（blueprint 调整 / 角色阵容 / 第 3 章 spot-fix / ...）
├── lessons.md               # 5 章实战沉淀 3 条经验
├── todo.md                  # 紧急 2 + 重要 4 + 长期 2 + 角色矩阵 2
├── logs/
│   ├── 2026-05-01.jsonl     # 项目初始化 + blueprint
│   ├── 2026-05-02.jsonl     # worldforge
│   ├── 2026-05-03.jsonl     # character + outline
│   ├── 2026-05-04.jsonl     # 章纲
│   └── 2026-05-24.jsonl     # 5 章实战日（密集）
└── snapshots/
    └── snapshot-2026-W21.md # 实战周末快照
```

---

## 7. v2 / v3 演进

### v2 CLI 强化
- `novel progress show` / `velocity` / `todo` / `milestones`
- `novel progress snapshot --period weekly`
- `novel progress validate`（timeline 顺序 + milestones 完整性）

### v3 Web Studio 可视化
- 时间线视图（horizontal timeline）
- 速度仪表盘（chapters per day 图表）
- 里程碑甘特图
- 决策日志的 commit-graph 风格视图
- 经验沉淀的 tag cloud

---

## 8. 引用文档

- 资产模型 9 类：[`01-asset-model.md`](./01-asset-model.md)
- pipeline：[`02-pipeline-architecture.md`](./02-pipeline-architecture.md)
- 真相文件：[`03-memory-and-vault.md`](./03-memory-and-vault.md)
- skill 规范：[`04-skill-spec.md`](./04-skill-spec.md)
- novel-studio 进度跟踪工作流 F：[`../../skills/novel-studio/SKILL.md`](../../skills/novel-studio/SKILL.md)
- v1.3 演进：[`../roadmap.md`](../roadmap.md)

# 长期记忆与素材沉淀 · Novel Studio

> 8 类真相文件 + 参考素材库（vault）的完整 schema 与维护协议。
> 这套系统是写作期质量的护城河，也是中长篇（100+ 章）不崩盘的关键。

---

## 1. 设计原则

### 1.1 双轨制：JSON 是权威源，Markdown 是投影

借鉴 inkos 0.6.0 的设计：

- **JSON**（`memory/*.json`）：schema 化、可被代码 / 校验器读、不可被 LLM 直接重写。
- **Markdown**（`memory/*.md`）：从 JSON 投影生成的人类可读视图。可被 LLM 读、不能直接被 LLM 写（必须走 JSON delta）。

**为什么不让 LLM 直接重写 Markdown？**

inkos 早期版本让 settler 直接生成全量 markdown，结果发现 LLM 经常"创作性"地重写已有的真相，导致前后矛盾。改成 LLM 只输出 JSON delta + 代码层 immutable apply 之后，准确率显著提升。

### 1.2 写入路径：delta-only

LLM 永远不直接写 `memory/*.json`。它只输出 delta，代码层 / Skill 内的工具层负责：

```
LLM 输出：JSON delta
   ↓
schema 校验（Zod-like）
   ↓
immutable apply（旧 state + delta = 新 state）
   ↓
原子写入 memory/*.json
   ↓
重新生成 memory/*.md 投影
```

v1 没有代码层，由 Skill 在 SKILL.md 里**约束 LLM 必须先 read JSON、修改后整体写回，并先做自检**。等 v2 引入 CLI 后这个流程会变成代码强制约束。

### 1.3 增量沉淀，不重写历史

每章 settle 阶段只追加 / 修改与本章相关的部分：

- `chapter_summaries.json` 只 append 一条
- `pending_hooks.json` 只对 hookOps 涉及的 hook 做 upsert / mention / resolve / defer
- `current_state.json` 只 patch 涉及的字段
- 已有的章节摘要 / 已 resolved 的钩子，**不允许被覆盖**

---

## 2. 8 类真相文件 schema

### 2.1 `current_state.json` — 当前世界状态

```json
{
  "schema_version": "1.0",
  "asset_type": "memory",
  "asset_id": "current-state",
  "last_settled_chapter": 31,
  "version": 31,
  "updated_at": "2026-05-24T15:30:00Z",
  "data": {
    "characters": [
      {
        "id": "protagonist-lin-jin",
        "location": "宗门后山·药圃",
        "stage": "炼气七层",
        "status": "健康",
        "carrying": ["天工残卷(贴身)", "玉佩(母亲遗物)"],
        "spirit_power_pct": 78,
        "mood": "警觉"
      }
    ],
    "world_clock": {
      "in_world_day": 47,
      "season": "暮春"
    },
    "active_factions": ["青云宗", "玄霄宗"],
    "known_to_protagonist": [
      "残卷可解析功法",
      "赵天霄是玄霄宗的内应",
      "玉清师太是中立但偏向自己"
    ],
    "unknown_to_protagonist": [
      "残卷的真正主人",
      "末法的真因",
      "苏婉柔的母亲身份"
    ]
  }
}
```

### 2.2 `particle_ledger.json` — 物品 / 资源账本

```json
{
  "asset_id": "particle-ledger",
  "data": {
    "items": [
      {
        "id": "item-tiangong-canjuan",
        "name": "天工残卷",
        "owner": "protagonist-lin-jin",
        "state": "贴身藏匿",
        "first_appear_chapter": 1,
        "last_used_chapter": 30,
        "use_count": 24
      },
      {
        "id": "item-yuepei-mother",
        "name": "玉佩(母亲遗物)",
        "owner": "protagonist-lin-jin",
        "state": "胸口悬挂",
        "first_appear_chapter": 1
      }
    ],
    "currencies": [
      {"id": "spirit-stone", "owner": "protagonist-lin-jin", "amount": 47, "currency": "下品灵石"}
    ],
    "consumables": [
      {"id": "elixir-jindan", "owner": "protagonist-lin-jin", "amount": 0, "max_seen": 1, "last_used_chapter": 18}
    ],
    "cheat_consumption": [
      {
        "chapter": 1,
        "operation": "解析野生灵草",
        "spirit_power_cost": 5,
        "outcome": "成功"
      },
      {
        "chapter": 28,
        "operation": "解析心魔功法",
        "spirit_power_cost": 80,
        "outcome": "反噬，昏迷",
        "side_effect": "失忆 3 天"
      }
    ]
  }
}
```

`cheat_consumption` 是中文网文专属字段，配合 `world/cheat-system.json` 的阶梯做"境界匹配校验"。

### 2.3 `pending_hooks.json` — 未闭合伏笔

```json
{
  "asset_id": "pending-hooks",
  "data": {
    "hooks": [
      {
        "id": "hook-canjuan-origin",
        "title": "残卷的真正主人",
        "planted_chapter": 1,
        "last_advanced_chapter": 25,
        "status": "progressing",
        "tier": "long",
        "promise_to_reader": "卷 5 末段揭示前置线索",
        "stale_warning_threshold": 30
      },
      {
        "id": "hook-su-wanrou-mother",
        "title": "苏婉柔的母亲是宗门二长老",
        "planted_chapter": 7,
        "last_advanced_chapter": 7,
        "status": "open",
        "tier": "mid",
        "promise_to_reader": "卷 2 中揭示"
      }
    ],
    "resolved": [
      {
        "id": "hook-zhao-tianxiao-betray",
        "title": "赵天霄是内应",
        "planted_chapter": 3,
        "resolved_chapter": 22,
        "tier": "short"
      }
    ]
  }
}
```

字段说明：

- `status` 枚举：`open`（已埋未推进） / `progressing`（推进中） / `deferred`（暂时搁置） / `resolved`（已收）
- `tier` 枚举：`short`（5-15 章兑现） / `mid`（15-50 章兑现） / `long`（50+ 章兑现）
- `last_advanced_chapter` 与当前章距离 > `stale_warning_threshold` 时，quality-auditor 会报"债务过旧"

这是借鉴 webnovel-writer 追读力系统的"债务追踪"思想。

### 2.4 `chapter_summaries.json` — 章节摘要

```json
{
  "asset_id": "chapter-summaries",
  "data": {
    "summaries": [
      {
        "chapter": 1,
        "title": "残卷",
        "summary_one_line": "林烬被欺凌后捡到玉简，识出'天工'二字并解析灵草。",
        "summary_3lines": [
          "外门弟子林烬被赵天霄当众罚跪，月例被抢。",
          "黄昏取水时在山涧捡到一块发烫的玉简，贴身后浮现'天工'。",
          "夜里偷偷研究，对杂草发动解析，确认这是一门可解析功法的能力。"
        ],
        "characters_present": ["protagonist-lin-jin", "antagonist-zhao-tianxiao", "supporting-su-wanrou"],
        "locations": ["宗门外门·演武场", "宗门后山·山涧"],
        "key_events": [
          {"type": "conflict", "desc": "被赵天霄欺凌"},
          {"type": "discovery", "desc": "捡到天工残卷"},
          {"type": "ability-first-use", "desc": "解析野生灵草"}
        ],
        "hooks_opened": ["hook-canjuan-origin"],
        "hooks_advanced": [],
        "hooks_resolved": [],
        "word_count": 3487,
        "audit_score": 92
      }
    ]
  }
}
```

### 2.5 `subplot_board.json` — 支线进度板

```json
{
  "asset_id": "subplot-board",
  "data": {
    "subplots": [
      {
        "id": "subplot-A-canjuan-origin",
        "name": "A 线：残卷来源",
        "tier": "main",
        "status": "active",
        "current_phase": "线索收集",
        "last_chapter_advance": 22,
        "next_milestone_chapter": 50
      },
      {
        "id": "subplot-B-su-wanrou-emotion",
        "name": "B 线：与苏婉柔的情感",
        "tier": "second",
        "status": "active",
        "current_phase": "好感累积",
        "last_chapter_advance": 27
      },
      {
        "id": "subplot-C-zongmen-power",
        "name": "C 线：宗门权力斗争",
        "tier": "third",
        "status": "dormant",
        "current_phase": "暂时搁置",
        "last_chapter_advance": 18,
        "stale_chapters": 13
      }
    ]
  }
}
```

quality-auditor 会基于 `last_chapter_advance` 检测"支线停滞"，给出"该回到 C 线了"之类的提示。

### 2.6 `emotional_arcs.json` — 情感弧线

```json
{
  "asset_id": "emotional-arcs",
  "data": {
    "arcs": [
      {
        "character_id": "protagonist-lin-jin",
        "trajectory": [
          {"chapter": 1, "state": "压抑/麻木", "trigger": "被欺凌"},
          {"chapter": 1, "state": "微光/谨慎兴奋", "trigger": "解析成功"},
          {"chapter": 5, "state": "首次复仇成就感", "trigger": "反杀师兄"},
          {"chapter": 28, "state": "崩溃/惊惧", "trigger": "首次反噬昏迷"},
          {"chapter": 31, "state": "坚定/警觉", "trigger": "决定离开外门"}
        ],
        "current_state": "坚定/警觉"
      },
      {
        "character_id": "supporting-su-wanrou",
        "trajectory": [
          {"chapter": 1, "state": "怜悯", "trigger": "看到林烬被罚"},
          {"chapter": 12, "state": "好奇", "trigger": "发现林烬实力变化"}
        ],
        "current_state": "好奇"
      }
    ]
  }
}
```

### 2.7 `character_matrix.json` — 角色交互矩阵

记录"谁见过谁、知道什么"。这是审稿"角色记忆"维度的依据。

```json
{
  "asset_id": "character-matrix",
  "data": {
    "encounters": [
      {
        "from": "protagonist-lin-jin",
        "to": "antagonist-zhao-tianxiao",
        "first_chapter": 1,
        "last_chapter": 22,
        "encounter_count": 8,
        "relation_type": "enemy",
        "info_known": [
          {"fact": "对方欺凌自己", "since_chapter": 1},
          {"fact": "对方是玄霄宗内应", "since_chapter": 22}
        ]
      },
      {
        "from": "protagonist-lin-jin",
        "to": "supporting-su-wanrou",
        "first_chapter": 1,
        "last_chapter": 27,
        "encounter_count": 12,
        "relation_type": "fond-of",
        "info_known": [
          {"fact": "她是同门师妹", "since_chapter": 1}
        ],
        "info_unknown": [
          "她母亲的真实身份"
        ]
      }
    ]
  }
}
```

**关键应用场景**：

> 写第 35 章时，主角不能说出"我知道苏婉柔的母亲是二长老"——因为 `info_unknown` 里这条还没被移除。auditor 会捕捉到这种"角色越权记忆"。

### 2.8 `vault_index.json` — 素材库索引

由 `novel-asset-vault` 维护，详见下文。

---

## 3. 真相文件的写入协议

每个真相文件都有一组**允许操作**，settle 阶段必须遵守。

### 3.1 `current_state.json`

允许操作：
- `patch_character(id, fields)`：修改某个角色的字段（位置、状态、携带物等）
- `add_character(...)`：新增角色（首次出场时）
- `set_world_clock(...)`：推进世界时间
- `add_known_to_protagonist(fact)`：主角获得新信息
- `move_to_unknown(fact)`：主角忘记 / 失去某信息

不允许：
- 直接删除已有角色（用 `set_character_status: "left"` / `"dead"`）
- 重写整个文件

### 3.2 `pending_hooks.json`

允许操作（借鉴 inkos 的 hookOps 语义）：
- `upsert(hook)`：新建或更新钩子
- `mention(hook_id, chapter)`：本章提及但未推进，更新 `last_advanced_chapter` 但不变 status
- `progress(hook_id, chapter)`：本章推进，status → progressing
- `defer(hook_id, chapter, reason)`：暂时搁置，status → deferred
- `resolve(hook_id, chapter)`：本章兑现，从 `hooks` 移到 `resolved`

不允许：
- 删除已 resolved 的钩子（永久档案）
- 把 resolved 重新打开

### 3.3 `chapter_summaries.json`

唯一允许操作：`append(summary)`。

每章只能 append 一次。如果章节被重写（rewrite），必须先 `pop_after(chapter)` 再 append（这是 chapter-writer 的 rewrite 模式才能做的事）。

### 3.4 `subplot_board.json`

允许：
- `add_subplot(...)`、`patch_subplot(id, fields)`、`set_status(id, status)`

### 3.5 `emotional_arcs.json`

唯一允许操作：`append_trajectory(character_id, point)`。

### 3.6 `character_matrix.json`

允许：
- `record_encounter(from, to, chapter)`：自动 +1 encounter_count
- `add_known(from, to, fact, chapter)`：双向都更新
- `move_to_unknown(from, to, fact)`：失去某信息

---

## 4. settle 阶段的 LLM 输出格式

quality-auditor 在 settle phase 让 LLM 输出**统一的 delta JSON**：

```json
{
  "chapter": 31,
  "deltas": {
    "current_state": [
      {"op": "patch_character", "id": "protagonist-lin-jin", "fields": {"location": "外门·西厢", "spirit_power_pct": 65}},
      {"op": "add_known_to_protagonist", "fact": "玉清师太怀疑赵天霄"}
    ],
    "particle_ledger": [
      {"op": "add_cheat_consumption", "data": {"chapter": 31, "operation": "解析符箓", "spirit_power_cost": 15, "outcome": "成功"}}
    ],
    "pending_hooks": [
      {"op": "progress", "id": "hook-canjuan-origin", "chapter": 31},
      {"op": "upsert", "hook": {"id": "hook-shitai-suspect", "title": "玉清师太对赵天霄的怀疑", "planted_chapter": 31, "tier": "short"}}
    ],
    "chapter_summaries": [
      {"op": "append", "summary": { /* 完整摘要对象 */ }}
    ],
    "subplot_board": [
      {"op": "patch_subplot", "id": "subplot-A-canjuan-origin", "fields": {"current_phase": "锁定怀疑对象"}}
    ],
    "emotional_arcs": [
      {"op": "append_trajectory", "character_id": "protagonist-lin-jin", "point": {"chapter": 31, "state": "坚定/警觉", "trigger": "决定离开外门"}}
    ],
    "character_matrix": [
      {"op": "record_encounter", "from": "protagonist-lin-jin", "to": "supporting-shitai-yu-qing", "chapter": 31}
    ]
  }
}
```

skill 层（v1 用 SKILL.md 约束 LLM 自检，v2 用代码）会做：

1. JSON 解析
2. schema 校验
3. 旧 state 读取
4. immutable apply
5. 写入新 state
6. 重新生成 markdown 投影

---

## 5. Markdown 投影协议

每个真相 JSON 都对应一个 `.md` 文件，由 settle 阶段在 JSON 写入后自动重生成。

### 5.1 投影是只读的

> Markdown 文件**永远不应被 LLM 或人手动修改**。要改，去改 JSON。

如果用户想直接编辑 markdown，应该走"修改章纲 → 重写章节 → 重 settle"路径，不直接动 memory。

### 5.2 投影格式示例 `memory/pending_hooks.md`

```markdown
---
asset_type: memory
asset_id: pending-hooks
last_settled_chapter: 31
generated: true
generated_at: 2026-05-24T15:30:00Z
---

# 未闭合伏笔（截至第 31 章）

## 长期（long）
- **残卷的真正主人**（埋于第 1 章，最近推进第 25 章，progressing）
  > 卷 5 末段揭示前置线索

## 中期（mid）
- **苏婉柔的母亲是宗门二长老**（埋于第 7 章，open）
  > 卷 2 中揭示

## 短期（short）
- **玉清师太对赵天霄的怀疑**（埋于第 31 章，open）

## 已闭合（最近 5 个）
- 赵天霄是内应（第 3 章 → 第 22 章兑现）
```

---

## 6. 检索：v1 全文 + v2 向量

### 6.1 v1 检索策略：文件全文 + 简单 grep

写第 N 章时，需要从历史里找上下文。v1 的策略是：

- **角色**：直接读 `characters/_index.json`，再选择性读 `characters/<role>.md`
- **世界**：直接读 `world/*.md`
- **金手指**：直接读 `world/cheat-system.json`（结构化字段查询）
- **历史摘要**：读最近 5 章 `chapter_summaries`，更早走 grep 关键词
- **vault 素材**：按标签筛选

这套策略对前 50 章足够。100+ 章时上下文压力会增加，进入 v2。

### 6.2 v2 向量索引（设计预留）

v2 会引入轻量级向量层（候选：lancedb / sqlite-vec / chromadb-embedded）：

```
memory/.vector/
├── chapter-summaries.lance/   # 摘要向量
├── characters.lance/          # 角色卡向量
├── snippets.lance/            # 素材向量
└── config.json                # 模型 / 维度配置
```

检索时：
1. `query → embedding`
2. 在对应向量集 top-k 召回
3. 配合 reranker（可选）做精排
4. 返回原文片段 + 元数据

但 v1 不引入这个，避免外部依赖。

---

## 7. 参考素材库（vault）

### 7.1 三类素材卡

| 类型 | 路径 | 含义 |
|------|------|------|
| 灵感（inspiration） | `vault/inspirations/` | 脑洞 / 设定碎片 / 选题想法 |
| 桥段（snippet） | `vault/snippets/` | 段落级写作素材（金句 / 场景示范 / 打斗结构） |
| 参考（reference） | `vault/references/` | 来自其他作品的片段，注明出处 |
| 风格指纹（style-fingerprint） | `vault/style-fingerprints/` | 文风分析结果 |

### 7.2 素材卡 schema

每张卡是一个 Markdown 文件 + 一行索引项。Markdown 详见 [`01-asset-model.md`](./01-asset-model.md) 第 11 节。

### 7.3 `vault/_index.json`

```json
{
  "schema_version": "1.0",
  "asset_type": "vault-index",
  "version": 18,
  "data": {
    "cards": [
      {
        "id": "snip-2a91ef03",
        "type": "snippet",
        "file": "snippets/snip-2a91ef03.md",
        "tags": ["打斗", "一招制敌", "短句快剪"],
        "summary": "高手过招、不见血但已分胜负的描写示范",
        "source": "original",
        "created_at": "2026-05-20T10:00:00Z",
        "use_count": 3,
        "last_used_chapter": 18
      },
      {
        "id": "insp-f3a92e1c",
        "type": "inspiration",
        "file": "inspirations/insp-f3a92e1c.md",
        "tags": ["金手指", "解析流", "代价机制"],
        "summary": "金手指反噬可以表现为'失忆'而非常见的'昏迷'",
        "source": "original"
      },
      {
        "id": "style-cangtian",
        "type": "style-fingerprint",
        "file": "style-fingerprints/style-cangtian.json",
        "tags": ["天蚕土豆风", "热血少年", "短句"],
        "summary": "短句多、动作描写干脆、对话带口头禅"
      }
    ]
  }
}
```

### 7.4 vault 的三种使用模式

| 模式 | 何时用 | Skill 调用方式 |
|------|--------|--------------|
| **灵感模式** | 开书阶段、卡文阶段 | `blueprint` / `outline-architect` 检索 inspirations |
| **写作辅助模式** | 写正文时遇到具体桥段需求 | `chapter-writer` compose 阶段检索 snippets（top-3） |
| **风格注入模式** | 启用文风指纹后 | `chapter-writer` 在 prompt 里注入 style-fingerprint |

### 7.5 vault 的沉淀来源

3 个入口：

1. **用户主动添加**：用户对话中说"把这段记下来"。
2. **chapter-writer 写得好的段落**：审稿评分 ≥ 95 时，asset-vault 自动建议用户"是否沉淀这段"。
3. **完结后复盘**：完书后从全书中抽取"高频好桥段"，成为下本书的素材。

### 7.6 风格指纹的特殊处理

风格指纹是 vault 里的特殊卡，不是写作素材而是**写作约束**。

```json
{
  "asset_type": "style-fingerprint",
  "data": {
    "name": "天蚕土豆·斗破苍穹风",
    "stats": {
      "avg_sentence_length_zh": 18.3,
      "sentence_length_distribution": {"<10": 0.22, "10-20": 0.45, "20-40": 0.28, ">40": 0.05},
      "dialogue_ratio": 0.42,
      "paragraph_avg_lines": 2.7,
      "first_person_intensity": 0.18
    },
    "vocabulary": {
      "high_freq": ["那是一种", "在他看来", "缓缓", "竟然"],
      "fatigue_zh": ["不可思议", "震撼", "目瞪口呆"],
      "mannerisms": ["摸了摸鼻子", "嘴角扯出一丝弧度"]
    },
    "patterns": {
      "preferred_action_template": "动作 + 拟声 + 结果",
      "avoid": ["大段心理独白", "长形容词堆砌"]
    },
    "samples": [
      "samples/sample-001.md",
      "samples/sample-002.md"
    ]
  }
}
```

`chapter-writer` 在 prompt 里把 stats / fatigue 注入；`quality-auditor` 在审稿时用 fatigue list 检测高频禁词。

---

## 8. 一致性约束（写章前后必看）

每章 settle 完后，下面 9 个约束必须全部满足：

| 约束 | 校验文件 | 校验内容 |
|------|---------|---------|
| C1 | `current_state.json` × `chapters/chapter-NNNN.md` | 章末状态与本章正文事件一致 |
| C2 | `particle_ledger.json` × `world/cheat-system.json` | 金手指消耗符合阶梯（不能超阶） |
| C3 | `pending_hooks.json` × `outline/master.md` | 长期伏笔的兑现章不能晚于总纲承诺 |
| C4 | `chapter_summaries.json` 顺序连贯 | chapter 序号无跳号 |
| C5 | `subplot_board.json` 无 stale > 30 章的主线支线 | 主线不能 30 章不推进 |
| C6 | `emotional_arcs.json` × `characters/<id>.md` 性格内核 | 不能 OOC |
| C7 | `character_matrix.json` info_known 不能"穿越" | 角色不能知道还没见到的事 |
| C8 | `chapter_summaries[N].hooks_resolved` ⊆ `pending_hooks[N-1]` | 只能收已埋的钩子 |
| C9 | 所有 JSON schema 校验通过 | 字段类型、枚举值合法 |

如果任一约束失败，settle 阶段拒绝写入，章节状态保留 `draft`，错误日志写到 `audit/logs/`。

---

## 9. 工具层（v2 提示）

v1 由 SKILL.md 约束 LLM 自己读 / 写 / 校验 JSON。v2 引入 CLI 后，会提供以下工具：

```bash
novel memory show current-state       # 读取并漂亮打印
novel memory apply-delta delta.json   # 应用 delta，含校验
novel memory validate                 # 9 大约束全量扫描
novel memory rebuild-projections      # 从 JSON 重新生成所有 .md
novel memory rollback --to-chapter 25 # 回滚记忆到第 25 章末状态
novel vault list --tag 打斗            # 检索素材
novel vault add snippet --from clipboard --tags "打斗,短句"
```

v1 暂未提供 CLI，但 skill 之间的契约和 v2 的 CLI 完全对齐，未来无需迁移成本。

---

## 10. 性能指标

预期容量（单本 800 章玄幻为例）：

| 文件 | v1 大小 | 性能 |
|------|---------|------|
| `current_state.json` | ~50KB | 全量加载 < 10ms |
| `particle_ledger.json` | ~80KB | 全量加载 < 15ms |
| `pending_hooks.json` | ~30KB | 全量加载 < 5ms |
| `chapter_summaries.json` | ~600KB | 全量加载 ~50ms，按需走索引 |
| `subplot_board.json` | ~10KB | 全量加载 < 5ms |
| `emotional_arcs.json` | ~100KB | 全量加载 ~10ms |
| `character_matrix.json` | ~150KB | 全量加载 ~20ms |
| `vault/_index.json` | ~50KB（500 张卡） | 全量加载 < 10ms |

写第 N 章注入到 prompt 的真相切片 ~3-5K tokens（compose 阶段筛选后），完全可控。

---

下一节：[`04-skill-spec.md`](./04-skill-spec.md) 讲 Skill 规范与命名。

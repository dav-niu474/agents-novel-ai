---
name: novel-quality-auditor
description: 用于审稿、AIGC 检测与长期记忆沉淀的 skill。当用户说"审一下这章 / 检查矛盾 / 这章读起来怎么样 / AIGC 检测 / 反 AI 味检查 / 全书一致性 / 跑一遍审计 / 全书复盘 / 看看有什么问题"或者写完一章准备 settle 时使用。覆盖 audit（5 大类 33 维度连续性 + 设定一致 + 节奏爽点 + 文风 + 大纲遵从）和 settle（从 approved 章节过度提取 9 类事实、输出 JSON delta、immutable apply 到 memory/* 8 个真相文件）两个阶段。产出 audit/reports/chapter-NNNN.audit.md（含 critical/major/minor 三级 issues）+ 更新后的 memory/*.json + memory/*.md 投影。也支持全书复盘（full-book-audit）和 AIGC 规则检测（11 条本地规则，零 LLM 成本）。是 chapter-writer 的下游必经环节。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: [novel-chapter-writer]
  upstream_assets: [chapters/chapter-NNNN.md, outline/chapters/chapter-NNNN.md, world/*, characters/*, memory/*, blueprint.md]
  downstream_skills: [novel-chapter-writer]
  downstream_assets: [audit/reports/chapter-NNNN.audit.md, memory/*.json, memory/*.md]
  external_capabilities: [llm]
soft_depends_on:
  upstream_assets: [vault/style-fingerprints/]
---

# Novel Quality Auditor · 审稿 + 长期记忆沉淀

写完一章不是结束，是开始。这个 skill 干两件事：

1. **AUDIT**：从 5 大类 33 个维度审稿，产出 critical / major / minor 三级 issues
2. **SETTLE**：把通过的章节翻译成 JSON delta，应用到 8 个真相文件

⚠️ **没有 SETTLE 的 audit 是空审**。memory/* 不更新，下一章 PLAN 阶段会用过时的状态做决策，质量螺旋下降。

⚠️ 借鉴 inkos：把 audit 与 settle 拆给低温模型独立做，不和 chapter-writer 的"创作"混温度，准确率显著提升。

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- 章节写完（status: draft），需要审稿
- 用户说"全书一致性 / 跑一遍审计 / 复盘"
- 用户说"AIGC 检测 / 反 AI 味检查"
- 修订后需要重新审稿
- 章节 approved 后做 settle（更新 memory）

❌ 不要使用：
- 写正文 → `novel-chapter-writer`
- 修订正文 → `novel-chapter-writer` 的 revise 模式
- 改章纲 / 大纲 → `novel-outline-architect`
- 改性格 / 角色 → `novel-character-atelier`

---

## 2. 输入与输出契约

### 输入（必需）

| 输入 | 用途 |
|------|------|
| `chapters/chapter-NNNN.md` | 被审章节 |
| `outline/chapters/chapter-NNNN.md` | 章纲（校验 must-keep / must-avoid） |
| `world/cheat-system.json` | 校验"境界匹配 / 消耗记账" |
| `world/powers.json` | 校验主角境界 |
| `characters/<必出场角色>.md` | 校验 OOC（性格内核） |
| `characters/_index.json` | 校验关系网穿越 |
| `memory/current_state.json` | 校验角色状态 |
| `memory/particle_ledger.json` | 校验物品 / 资源 |
| `memory/pending_hooks.json` | 校验钩子 hookOps 兑现 |
| `memory/character_matrix.json` | 校验"角色越权记忆" |
| `memory/chapter_summaries.json` 最近 3 章 | 校验时间线连续 |
| `blueprint.md` 第 6 节 | 反 AI 味词表 |

### 输入（可选）
- `vault/style-fingerprints/style-*.json`（启用文风指纹时必读）

### 输出
- `audit/reports/chapter-NNNN.audit.md`（审稿报告）
- `memory/*.json`（settle 后更新，8 个真相文件）
- `memory/*.md`（投影自动重建）
- 更新章节 frontmatter：`audit_score`、`status`（approved 或 draft）

---

## 3. AUDIT 阶段：5 大类 33 维度

**温度**：0.3（低温，要求严谨）

完整维度清单见 [`references/audit-dimensions.md`](./references/audit-dimensions.md)。这里给出主分类：

### 3.1 类 1：连续性（10 维）

校验"前后是否矛盾"。

| # | 维度 | 校验内容 |
|---|------|---------|
| 1 | 角色位置连续 | 角色不能瞬移（上章在外门，本章直接在长老阁） |
| 2 | 角色携带物连续 | 没拿剑就不能挥剑 |
| 3 | 角色境界连续 | 不能突然境界跳跃 |
| 4 | 时间线连续 | 时间不能倒退 / 跳过未交代时段 |
| 5 | 季节 / 天气连续 | 上章暮春，本章不能突然暴雪（除非情节交代） |
| 6 | 角色记忆连续 | 没见过的事不能引用为既往 |
| 7 | 角色受伤 / 状态连续 | 上章重伤本章生龙活虎要交代 |
| 8 | 资源 / 钱财连续 | 灵石数量不能凭空变化 |
| 9 | 物品状态连续 | 法宝级别 / 完整度 |
| 10 | 主线进度连续 | 不能"忽然忘了之前查的线索" |

### 3.2 类 2：设定一致（7 维）

校验"是否破了世界 / 体系 / 角色规则"。

| # | 维度 | 校验内容 |
|---|------|---------|
| 11 | 世界观规则 | 物理规则不能破（"灵气稀薄"章节里突然全在喝灵气） |
| 12 | 力量等级规则 | 境界 / 突破依据是否对 |
| 13 | 金手指 tier 匹配 | 主角是否超阶用能力 |
| 14 | 金手指消耗记账 | 用了金手指必须扣精神力 / 灵石（写到 ledger） |
| 15 | 金手指限制 | 限制条件不能被章节"忘记"（24h 冷却内不能再用） |
| 16 | 角色 OOC | 性格内核不能突破（决策模式 / 情绪锚点） |
| 17 | 信息边界 | 主角不能知道还没揭露的事（worldview 第 6 节） |

### 3.3 类 3：节奏爽点（7 维）

校验"读起来好不好看"。

| # | 维度 | 校验内容 |
|---|------|---------|
| 18 | 首屏钩子 | 前 200 字有冲突 / 悬念 / 承诺 / 场景钩子 |
| 19 | 爽点节拍 | 章纲第 5 字段命中 |
| 20 | 钩子 must-Open / Close | 章纲第 4 字段 hookOps 全部命中 |
| 21 | 钩子债务（追读力） | pending_hooks 中是否有 stale > threshold 的（提示用户） |
| 22 | 主线推进 | 本章是否真的让主线前进了一步（哪怕 0.1 步） |
| 23 | 支线节奏 | subplot_board 中各支线是否过久未推进 |
| 24 | 情绪曲线 | 章纲第 6 字段对照实际曲线 |

### 3.4 类 4：文风 / 反 AI 味（5 维）

校验 `references/anti-ai-patterns.md`。

| # | 维度 | 校验内容 |
|---|------|---------|
| 25 | 高频禁用词命中数 | 每章 ≤ 2 次 |
| 26 | 禁用句式命中数 | 0 次 |
| 27 | 必备元素 | ≥ 1 项 |
| 28 | 对话占比 | 30-45%（章纲允许时可放宽） |
| 29 | 段落 / 句长节奏 | 每段 2-4 句 / 单段 ≤ 120 字 / 句平均 < 25 字 |

### 3.5 类 5：大纲遵从（4 维）

校验"是否按章纲写了"。

| # | 维度 | 校验内容 |
|---|------|---------|
| 30 | 必出场角色全部出现 | 章纲第 2 字段 |
| 31 | 必发生事件全部命中 | 章纲第 3 字段（顺序可允许微调） |
| 32 | 不写禁忌全部规避 | 章纲第 8 字段 |
| 33 | 字数 / 节奏在范围 | 章纲第 7 字段 |

---

## 4. AIGC 规则检测（11 条本地规则）

⚠️ 这 11 条**不调 LLM**，只用程序规则统计。零成本，可以 standalone 跑。

| # | 规则 | 阈值 |
|---|------|------|
| 1 | 高频禁用词总命中 | ≤ 5 个 / 章 |
| 2 | "缓缓"+"竟然"+"忽然" 单词总频率 | ≤ 4 次 / 章 |
| 3 | 4 字成语连用 | ≤ 1 处 / 章 |
| 4 | "他眉头一皱" / "事情并不简单" 等万能侦探腔 | 0 次 |
| 5 | "X 是一种难以言喻的感觉" 模板 | 0 次 |
| 6 | 段落平均句数 | 在 [2, 4] |
| 7 | 单段最长字数 | ≤ 120 字 |
| 8 | 单句最长字数 | ≤ 40 字 |
| 9 | 对话占比 | 在章纲允许范围 |
| 10 | 连续 ≥ 5 段无对话 | 0 次（除非章纲允许独处章） |
| 11 | 形容词列举（≥3 个连用） | 0 次 |

每章自动跑 11 条规则，输出 AIGC 评分（满分 100，每违一条扣 5-10 分）。

> 这 11 条 AI 检测规则借鉴 inkos 的 deterministic detector，加入了对中文网文的具体适配。

---

## 5. 审稿报告格式

`audit/reports/chapter-NNNN.audit.md`：

```markdown
---
asset_type: audit-report
chapter_no: 31
audited_at: <ISO>
auditor_version: 0.1.0
---

# 第 31 章 审稿报告

## 总评
- 综合评分：87 / 100
- AIGC 检测分：92 / 100
- 大纲遵从度：100%
- 状态建议：approved 或 revise

## 维度命中

| 类别 | 维度 | 评分 | 备注 |
|------|------|------|------|
| 连续性 | 1 角色位置 | ✓ | |
| ... | ... | ... | |

## Critical Issues（必修）
（如果有）

## Major Issues（建议修）
- M1（维度 14）：本章主角解析了符箓但 particle_ledger 没记账
  - 建议：在章末加一句"残卷反应一沉，精神力又少了一截"
  - 推荐 revise 模式：spot-fix（在第 23 段插入）

## Minor Issues（可不修）
- N1（维度 25）："缓缓" 出现 3 次（限值 2）
  - 推荐 revise 模式：polish

## hookOps 命中
- mustOpen [hook-shitai-suspect]：✓ 命中（第 X 段）
- mustAdvance [hook-canjuan-origin]：✓ 命中（章末残卷反应）

## 反 AI 味命中
（11 条规则的命中详情）

## settle 阶段建议（如果 status approved）
应用以下 delta 到 memory/*：
- particle_ledger：add cheat_consumption + 1
- pending_hooks：upsert hook-shitai-suspect, progress hook-canjuan-origin
- chapter_summaries：append 31
- emotional_arcs：林烬 + (chapter:31, state:坚定/警觉)
- character_matrix：record_encounter 林烬-师太
```

---

## 6. SETTLE 阶段：状态沉淀

**温度**：0.3

**前置条件**：审稿后用户决定 approved（critical = 0，major 已修或用户接受）。

### 6.1 9 类事实过度提取

从章节正文 + 章纲第 9 字段（状态耦合预告）中提取：

| 类别 | 字段 |
|------|------|
| 1 角色 | 位置 / 状态 / 携带物 / 境界 / 心情 |
| 2 位置 | 哪些场景出现，新增 / 离开 |
| 3 物品 | 新得 / 失去 / 状态变化 |
| 4 关系 | 新认识 / 关系强度变化 |
| 5 情感 | 角色情感弧线节点 |
| 6 信息 | 角色获得 / 失去的信息 |
| 7 伏笔 | 新埋 / 推进 / 收 / 暂置 / 提及 |
| 8 时间 | 世界时钟推进 |
| 9 金手指 | 消耗事件（cheat_consumption） |

### 6.2 输出统一 delta JSON

格式见 [`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 4 节。

```json
{
  "chapter": 31,
  "deltas": {
    "current_state": [...],
    "particle_ledger": [...],
    "pending_hooks": [...],
    "chapter_summaries": [{"op": "append", "summary": {...}}],
    "subplot_board": [...],
    "emotional_arcs": [...],
    "character_matrix": [...]
  }
}
```

### 6.3 应用 delta（v1 由 LLM 自检 + 自写）

⚠️ v1 没有代码层强校验，由 LLM 严格遵守：

1. 读 `memory/<file>.json`
2. 应用对应 ops（按 [`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 3 节定义的允许操作）
3. 自检：
   - schema 合法
   - 不删除已 resolved 的 hooks
   - chapter_summaries 不跳号
   - 9 大约束 C1-C9（详见 03-memory-and-vault.md 第 8 节）
4. 写回 `memory/<file>.json`，version + 1
5. 重新生成 `memory/<file>.md` 投影

### 6.4 settle 失败处理

任一约束 C1-C9 失败：
- 拒绝写入 memory
- 章节状态保留 `draft`
- 错误细节写到 `audit/logs/settle-NNNN.error.json`
- 提示用户：通常是章节写得有矛盾，回 chapter-writer revise

---

## 7. 工作流

### 工作流 A：标准审稿 + settle（默认）

触发：`chapter-writer` 写完一章，或用户说"审 / 审稿"。

```
1. 检查 chapter-NNNN.md status: draft
2. AUDIT 阶段（温度 0.3）
   - 5 大类 33 维度扫描
   - 11 条 AIGC 规则跑
   - 输出 audit/reports/chapter-NNNN.audit.md
3. 用户决策：
   a. critical = 0, 用户 approve → 进入 SETTLE
   b. 有 critical → 转 chapter-writer revise（mode: rewrite / spot-fix）
   c. 用户接受当前状态但保留 issues → 进入 SETTLE，issues 留给后续
4. SETTLE 阶段（温度 0.3）
   - 提取 9 类事实
   - 输出 delta JSON
   - 应用到 memory/*
   - 校验 9 大约束
5. 章节 frontmatter 更新：audit_score / status: approved
```

### 工作流 B：单独 audit（不 settle）

触发：用户说"先审一下，别 settle"。

```
1. AUDIT 阶段
2. 输出报告
3. 不写 memory，章节状态保留 draft
```

适用：用户想先看问题再决定怎么改。

### 工作流 C：单独 settle（不 audit）

触发：用户说"audit 看过了，直接 settle"。

```
1. 检查 chapter 不在 draft 状态（应该在 reviewed 状态，但 v1 简化：用户说做就做）
2. SETTLE 阶段
3. 应用 memory delta
```

⚠️ 慎用：跳过 audit settle 可能引入矛盾到 memory，污染后续。

### 工作流 D：全书复盘

触发：用户说"全书一致性 / 跑一遍全书审 / 复盘"。

```
1. 列出所有 approved 章节
2. 对每章重跑 audit（不重跑 settle，避免覆盖 memory）
3. 累计统计：
   - 33 维度命中分布
   - AIGC 检测分布
   - 钩子债务（stale > threshold）
   - 支线停滞
4. 输出 audit/reports/full-book-audit.md
5. 给用户"哪几章建议重做 / 哪些钩子建议尽快收"的建议
```

### 工作流 E：仅 AIGC 规则检测（零 LLM 成本）

触发：用户说"快速检测 AI 味" / 批量扫所有章。

```
1. 跑 11 条规则
2. 输出每章 AIGC 评分（不调 LLM）
3. 识别出"AI 味重灾区"章节列表
4. 建议针对低分章跑 anti-detect revise
```

### 工作流 F：根据钩子债务 / 支线停滞主动提醒

触发：每次 settle 完后 / 用户说"下一章应该写什么"。

```
1. 扫 pending_hooks，找 stale > threshold 的钩子
2. 扫 subplot_board，找 stale > 30 章的主线支线
3. 输出"现在应该回头看的债务清单"
4. 这个清单会被 outline-architect 在 PLAN 阶段读取
```

---

## 8. 关键规则

### R1：critical = 0 才可 approved

任何"角色越权记忆 / 金手指超阶 / 信息边界穿越 / 时间线倒退"都是 critical，必须修。

### R2：major 由用户决策

major 不强制修，但要写到 audit 报告里供下一轮决策。

### R3：AUDIT 与 SETTLE 分阶段

不要在 AUDIT 阶段顺手改 memory。settle 必须显式触发。

### R4：SETTLE 失败保留 draft

memory 校验失败 → 章节不允许 approved，保留 draft，让用户去 chapter-writer revise。

### R5：chapter_summaries 不跳号

settle 必须按 chapter_no 顺序 append。如果第 30 章未 settle，跳到第 31 章 settle 应警告并阻止。

### R6：已 resolved 的 hook 不能再开

mustClose 已经 resolved 的 hook 是 issue（major），让用户决定。

### R7：v1 由 LLM 自觉走 9 大约束

v2 引入 CLI 后是代码强制。v1 必须在 settle prompt 里把约束逐条列出，让 LLM 自检。

---

## 9. 与其他 skill 的协作

### 上游
- `novel-chapter-writer`：写完即来审

### 下游
- `novel-chapter-writer`：发现问题转 revise
- `novel-outline-architect`：钩子债务 / 支线停滞反馈到 PLAN

### 旁支
- `novel-asset-vault`：审稿评分 ≥ 95 时建议把好桥段沉淀回 vault
- `novel-studio`：全书复盘是项目级操作，可由 studio 触发

---

## 10. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 章节 status 已经是 approved | 询问是否要重审 / 重 settle（重 settle 危险） |
| memory/* 不存在（导入历史项目） | 触发"反向工程 truth files"（v1 简化版：从 chapters/*.md 倒推生成 memory） |
| 章节正文与章纲偏离过大 | 在审稿报告里降大纲遵从分；不强制拒绝（写手有创作权） |
| AIGC 规则检测低于 60 分 | 在报告头部高亮警告；建议 anti-detect revise |
| settle 时章纲第 9 字段"状态耦合"为空 | 警告并尝试自动从正文提取，但更建议回 outline-architect 补 |
| 用户跳过 audit 直接要 approved | 警告 + 允许（用户自负责），但章节 frontmatter 会标记 audit_score: skipped |
| LLM 输出的 delta JSON schema 不合法 | settle 拒绝写入 memory，错误日志到 audit/logs/ |

---

## 11. 示例对话

### 示例 1：标准审稿 + settle

```
用户：审一下第 31 章。

auditor：[AUDIT 温度 0.3]
        [33 维度扫描 + 11 条 AIGC 规则]
        
        总评：综合 87 / AIGC 92 / 大纲遵从 100%
        
        Critical Issues（必修）：0
        
        Major Issues（建议修）：
        - M1（维度 14 金手指消耗记账）：
          本章主角第 4 段触动残卷感应，但 particle_ledger 没记一次"被动消耗"。
          建议：在 settle 阶段补 cheat_consumption（chapter:31, type:passive, cost:5）
          推荐 revise 模式：spot-fix（在第 23 段加一句"精神力又微微一沉"）
        
        Minor Issues（可不修）：
        - N1（维度 25）："缓缓" 出现 3 次（限值 2）
          推荐 polish
        - N2（维度 23 支线节奏）：subplot-C-zongmen-power 已停滞 13 章
          建议：下一章或下下一章拉回这条线
        
        hookOps 命中：
        - mustOpen [hook-shitai-suspect]：✓
        - mustAdvance [hook-canjuan-origin]：✓
        - mustClose: N/A
        
        状态建议：approved（major 1 条建议在 settle 阶段补，不必 revise）
        
        要 approved 进入 settle 吗？

用户：先 spot-fix 把 M1 修了再 settle。

auditor：[转 chapter-writer revise mode: spot-fix]
        
[chapter-writer spot-fix → 写新版本 chapter-0031.md v2]

用户：再审。

auditor：[AUDIT v2]
        Major: 0
        Minor: 1（N1 仍有但用户标记接受）
        总评 92 / 100
        建议 approved。
        
用户：approved，settle。

auditor：[SETTLE 温度 0.3]
        [提取 9 类事实]
        [输出 delta JSON]
        
        将应用以下 delta：
        - current_state: 林烬位置→外门西厢，spirit_power_pct 78→65
        - particle_ledger: 新增 cheat_consumption (chapter:31, type:passive, cost:5)
        - pending_hooks: progress hook-canjuan-origin, upsert hook-shitai-suspect, mention hook-su-wanrou-mother
        - chapter_summaries: append 第 31 章摘要
        - emotional_arcs: 林烬 + (31, "坚定/警觉", "决定离开外门")
        - character_matrix: record_encounter 林烬-师太
        - subplot_board: subplot-A patch current_phase "锁定怀疑对象"
        
        [9 约束自检]
        C1 角色位置 ✓
        C2 金手指 tier ✓（被动消耗在 Tier 1 限内）
        ...全部通过
        
        [写入 memory/*.json] 写完
        [重生 memory/*.md 投影] 完成
        
        chapter-0031.md frontmatter 更新：
        - audit_score: 92
        - status: approved
        
        ⚠️ 顺便提醒：subplot-C-zongmen-power 已停滞 13 章，下一章 PLAN 时可以考虑拉回。
        
        全部完成。下一步建议：写第 32 章。
```

### 示例 2：全书复盘

```
用户：全书复盘。

auditor：[列 31 章 approved 章节]
        [对每章重跑 AUDIT（不 settle）]
        
        全书复盘报告：
        
        总章节：31
        平均评分：85
        AIGC 平均分：88
        
        评分分布：
        - 90+：14 章
        - 80-90：12 章
        - 70-80：4 章 ⚠️ 第 7、12、19、25 章
        - <70：1 章 ⚠️ 第 28 章（首次反噬，写得仓促）
        
        建议重做：
        - 第 28 章（critical: 反噬代价没具体写）
        - 第 7、12 章（major: 多个高频词疲劳）
        
        钩子债务（stale > threshold）：
        - hook-old-village-mystery：埋于第 4 章，最近推进第 8 章，已 23 章未推（threshold 20）
        - hook-elder-zhao-secret：埋于第 15 章，never advanced
        
        支线停滞：
        - subplot-C-zongmen-power：13 章未推（接近 30 章警戒线）
        
        建议优先级：
        1. 修第 28 章（critical）
        2. 拉回 hook-old-village-mystery（stale）
        3. 第 35-40 章安排 subplot-C 回归
        4. 闲时 polish 第 7、12、19、25 章
        
        要先做哪个？
```

---

## 12. 引用文档

- 33 维度详细定义：[`references/audit-dimensions.md`](./references/audit-dimensions.md)
- 反 AI 味词表：[`../novel-chapter-writer/references/anti-ai-patterns.md`](../novel-chapter-writer/references/anti-ai-patterns.md)
- 真相文件 schema 与 delta 协议：[`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md)
- 9 大一致性约束 C1-C9：[`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 8 节

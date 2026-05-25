---
asset_type: progress-lessons
asset_id: lessons
created_at: 2026-05-01T00:00:00Z
updated_at: 2026-05-24T18:00:00Z
maintained_by: novel-asset-vault + novel-studio
---

# 经验沉淀

## 写作 5 章后（v1.2 实战 → v1.3 修复）

### 1. 字数控制（最大教训，已升级为 v1.3 R8）

**现象**：5 章字数全部偏短（target 3500，实际均 2616），74.7% 达成率。第 3、5 章跌出硬范围（length_critical）。

**根因**：
- 章纲第 3 字段事件链 5 个 × 500 字 = 2500，贴近软范围下沿 2975 但低于 target 3500
- chapter-writer v1.0 没有"事件链字数 pre-check"
- LLM 接到 5 个事件就开始写，没估算总和能不能撑到 target

**改进策略**：v1.3 三层兜底
1. outline-architect R8 强约束：events × per_event_words(chapter_type) ≥ target × 0.85
2. chapter-writer 3.2.1 写前自检第 7 项：事件链字数预检
3. chapter-writer 3.3 加 extend revise mode：保留事件链，只插入感官段补字

**跨书可学**：✅ 一开书就按 `events ≥ ceil(target / per_event_words)` 设事件链。下本书第 1 章直接按 6-7 个事件起步。

---

### 2. 反 AI 味词表确实管用

**现象**：5 章 AIGC 平均分 93，远高于直接 GPT 输出（典型 60-70）。"缓缓 / 竟然 / 不可思议"5 章累计才出现 7 次，且全部在限值内。

**根因**：
- chapter-writer SKILL.md 3.2.3 节硬编码禁用词
- blueprint.md 第 6 节作为题材专属 fatigue 列表
- 写前 self-check + 写后 D25-D26 双重审

**改进策略**：保持现状。对题材专属词补充到 references/anti-ai-patterns.md 第 6 节。

**跨书可学**：✅ 不同题材（玄幻 / 都市 / 言情）的高频禁用词不一样。下本书一开始就要扫参考作品提取专属词表。

---

### 3. 角色性格内核约束有效（最强证据）

**现象**：第 4 章 audit 主动拦截"林烬主动找赵天霄报复"的 OOC 倾向，writer 自动改为"先观察后行动"。第 3 章 spot-fix 修复"师太亲近度过快"——所有 OOC 边缘都被 character.md 字段 3 兜住了。

**根因**：
- character.md 字段 3 性格内核（核心驱动 + 决策模式 + 情绪锚点）三段写明确
- chapter-writer compose 阶段强制读字段 3
- quality-auditor D16 校验 OOC

**改进策略**：保持现状。下本书更要把字段 3 写得"具体到能反推角色下一秒会怎么反应"。

**跨书可学**：✅ character.md 字段 3 一旦 approved 不要轻改。前 5 章实战证明"信用度高"的内核能反向约束 writer。

---

### 4. 标志性细节 ≥ 3 是反 AI 味的最强武器

**现象**：林烬"数砖块 / 停顿半秒 / 拇指蹭衣襟内侧 / 看到电子产品会怔住"4 个标志性细节，5 章每章自然出现 1-2 个，让角色立体到读者会记住。师太"每隔七步杖落得轻 / 喝茶前敲杯沿 / 说话不超过三句一停"也同样。

**根因**：
- character.md 字段 5 强约束 ≥ 3 个
- chapter-writer 3.2.3 类 3 必备元素之一就是"不规则的小动作"
- 这些细节比"内心戏"更省字数 + 更有画面感

**改进策略**：保持。可在 character.md 字段 5 的注解里加"每个细节要可被反派 / 配角'认人'"提示

**跨书可学**：✅ 不规则小动作 > 心理独白。下本书的角色卡更要重视这条

---

### 5. 进度记录是写作工业化的真实需求（v1.3 progress 子系统的根因）

**现象**：5 章 settle 后 memory/* 7 类文件演进良好，但**作者侧的元数据（什么时候做了什么决定 / 这周写了几章 / 还欠多少债）完全没有归档**。第 5 章末复盘时回忆"什么时候改的金手指 Tier 4"已经要去 git log 翻。

**根因**：
- v1.0 设计只有 memory/（故事内）+ vault/（跨书素材）+ audit/（一次性产出）
- 没有"作者侧过程元数据"分层
- novel-studio 工作流 B 只读 novel.json，不聚合长期视图

**改进策略**：v1.3 新增 progress/ 子系统（timeline / milestones / velocity / decisions / lessons / todo / logs / snapshots），由 novel-studio 总维护

**跨书可学**：✅ 写到 200+ 章时进度管理是刚需。**memory/ 管"故事还没忘"，progress/ 管"作者没忘自己写了什么"**。

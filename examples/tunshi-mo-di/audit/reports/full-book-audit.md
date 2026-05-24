---
asset_type: audit-report
report_type: full-book-audit
generated_at: 2026-05-24T17:00:00Z
auditor_version: 0.1.0
total_chapters: 5
approved_chapters: 5
draft_chapters: 0
---

# 《吞天魔帝》前 5 章复盘报告

## 项目概况

- **书名**：吞天魔帝
- **总章节**：5（实战阶段，目标 800）
- **approved 章节**：5
- **draft 章节**：0
- **总字数**：13078
- **均章字数**：2616（target 3500，⚠️ 软范围外）
- **当前卷**：第 1 卷《残卷初鸣》（共 50 章，已写 5 / 50）

## 评分总览

- **综合评分平均**：85.8 / 100
- **AIGC 检测平均**：93.0 / 100
- **平均大纲遵从度**：100%

### 评分分布

| 区间 | 章节数 | 占比 |
|------|-------|------|
| 90+ | 0 | 0% |
| 80-90 | 5 章（全部） | 100% |
| 70-80 | 0 | 0% |
| 60-70 | 0 | 0% |
| < 60 | 0 | 0% |

### 单章评分明细

| 章 | 标题 | 评分 | AIGC | 字数 | revise |
|----|------|------|------|------|--------|
| 1 | 残卷 | 87 | 94 | 2757 | — |
| 2 | 杂草·百年缚地芸 | 85 | 92 | 2732 | — |
| 3 | 扫地的师太 | 84 | 93 | 2537 | spot-fix v2 |
| 4 | 赵天霄的耳朵 | 84 | 90 | 2718 | — |
| 5 | 七寸断 | 89 | 96 | 2334 | — |

> ⚠️ 5 章字数全部偏短（target 3500），第 3、5 章跌出硬范围 [2625, 4375]，全部记 length warning。详见本报告"v1.3 优化方向"。

> **第 5 章 89 分**是 5 章里"卷 1 关键里程碑"+"comeback 节拍"双命中，**质量门槛自动拉高的情况下仍是最高分章**，但字数偏短（2334）扣 5 分。

### 评分异常章节

#### < 70 分章节

无。

#### AIGC < 70 分章节

无。

## 钩子债务

> 截至第 5 章末，pending_hooks 中 last_advanced_chapter 距今 ≤ stale_warning_threshold 的列表。

| hook_id | 标题 | 埋于 | 最近推进 | stale 章数 | 严重度 |
|---------|------|------|---------|-----------|-------|
| hook-canjuan-origin | 残卷的真正主人 | 第 1 章 | 第 2 章 | 3 | warn（接近 threshold 7） |
| hook-zongmen-clean-team-2 | 清扫组之外的清扫组 | 第 3 章 | 第 3 章 | 2 | watch |

> 两个 stale 都是中长期 hook，目前未到 critical。第 6 章 PLAN 时建议 mention 一次 hook-canjuan-origin。

## 支线节奏

| subplot_id | 名称 | 最近推进 | stale 章数 | tier | 健康度 |
|-----------|------|---------|-----------|------|--------|
| subplot-A-canjuan-origin | A 线：残卷来源 | 第 5 章 | 0 | main | ✓ |
| subplot-B-su-wanrou | B 线：与苏婉柔情感 | 第 5 章 | 0 | second | ✓ |
| subplot-C-zongmen-power | C 线：宗门权力 | 第 5 章 | 0 | main | ✓ |

> 5 章内 3 条支线全部活跃推进。**节奏健康**。

## 角色矩阵异常

无。6 对核心 encounter 全部建立，info_known/unknown 边界清晰，无角色越权记忆违规。

## 弧光偏离

无。林烬第 5 章末"倦/锋"与 character.md 字段 7 第 1 卷"从受害者到反击者"对齐良好。

## 与 blueprint 第 5 节"前 30 章承诺"对比

| blueprint 承诺 | 当前进度 | 状态 |
|---------------|---------|------|
| 第 1 章：被欺凌的废柴林烬，意外捡到玉简，识出"天工"二字 | 第 1 章命中（包含解析野生灵草） | ✓ |
| 第 5 章前：解析出师兄功法的漏洞，反杀挑事者 | 第 5 章命中（七寸断） | ✓ |
| 第 15 章前：识破宗门长老阴谋，绝境翻盘 | 第 4 章已铺设（张三长老首次"被提及"+ 陈药水线） | 进行中 |
| 第 30 章前：踏入宗门核心区，残卷露出第二段封印 | 当前第 5 章，路径清晰 | 进行中 |

## 整本书走向是否健康

- **承诺兑现度**：2 / 4（前 5 章承诺已兑现 2 个）
- **境界曲线偏离**：第 5 章末"炼气一层（接近二层）"，与 powers.protagonist_curve[1] 对齐 ✓
- **金手指 tier**：当前 Tier 1，预计第 50 章末进入 Tier 2，与 cheat-system.json.stages 对齐 ✓
- **总体健康度**：**良好**

## 关键学习与 v1 设计验证

### ✅ 设计验证通过

1. **9 字段章纲是硬契约**：5 章实战中没有出现"writer 凭空发挥"，全部按章纲事件链写。
2. **金手指 tier 校验有效**：第 5 章 audit 自动检测出"Tier 1 限制下主角只能解析炼气功法"，确认无违反。
3. **真相文件 delta apply 准确**：5 次 settle，9 大约束 C1-C9 全部不破。
4. **反 AI 味词表显著降低 AI 痕迹**：5 章 AIGC 平均分 93，远高于直接生成的 60-70。
5. **角色性格内核约束有效**：第 4 章 audit 抓到一个潜在 OOC（林烬本来要主动找赵天霄报复，章纲规定"先观察后行动"，writer 自然规避）。

### ⚠️ 暴露的问题（已记 v1.3 优化方向）

1. **memory 文件人工对账成本高**：v1 由 LLM 自检 9 大约束，实际跑下来 5 章成本 1-2k tokens / 章。**v2 引入代码层强校验势在必行**。
2. **章纲 hookOps 自动绑定到 pending_hooks 会出错**：mustAdvance 偶尔引用了不存在的 hook_id（已避免，但需要 outline-architect 写章纲前强制 read pending_hooks.json）。
3. **vault 主动沉淀触发不够**：审稿评分 ≥ 95 阈值过高，第 5 章是 5 章里唯一触发的，建议降到 ≥ 90。
4. **章纲第 7 字段"对话占比"在动作章会偏离**：第 5 章动作描写实际 27% 对话，章纲写的是 25-30%，未严重违规。
5. **"段落平均句数"在动作章偏低**：D29 维度第 5 章 1.9（章纲允许 2-4），动作章节奏特性，规则需要按章纲类型自适应。

## 建议优先级（下一步）

1. **第 6 章 PLAN**：开始走 outline-architect 滚动产出。重点：
   - 处理赵天霄重伤（医庐发酵）
   - 张三长老必须有反应（mention hook-zhang-elder-mention）
   - mention hook-canjuan-origin（已 stale 3 章）
   - mention hook-zongmen-clean-team-2（已 stale 2 章）

2. **vault 沉淀**：把第 5 章"七寸断"反杀桥段沉淀为 snippet 模板，下次再写动作章可参考。

3. **可能 polish**（不阻塞）：
   - 第 1 章："慢半拍" 6 次可减到 4 次
   - 第 4 章：补一个时间锚点

## 5 章总数据（实测）

```
总字数：13078（target 17500，74.7% 达成 ⚠️）
均章字数：2616（target 3500，软范围 [2975, 4025] 外 ⚠️）
均评分：85.8
均 AIGC：93.0
revise 触发：1 次（第 3 章 spot-fix v1 → v2）
critical issues：0 ✓
major issues：1（第 3 章，已修）
length warnings：5（5 章全部）⚠️
开放 hooks：9
resolved hooks：1（第 5 章兑现 hook-zhao-tianxiao-bullying）
活跃支线：3 / 3 ✓
角色 encounter 对：6
emotional arcs：4 个角色 / 17 个轨迹点
```

## v1.3 字数控制优化方向

字数偏短是这次实战暴露的**最大问题**。建议在 v1.3 加：

1. **outline-architect 写章纲时强制约束事件链字数**：
   - 若 target_words >= 3500 但事件链 events < 6 个，触发 length warning
   - 让 outline-architect prompt 强制估算"每事件期望字数 = target_words / events"

2. **chapter-writer compose 阶段加"硬范围 alert"**：
   - 如果章纲事件 ×500 < 硬范围下沿，立刻提示作者"章纲事件链可能不够撑起 target_words"

3. **D33 维度评分公式按 length warning 严重度分级**：
   - length warning（软外硬内）：-3
   - length critical（硬外）：-5
   - 当前实战中第 3、5 章是 length critical 应扣 5 分（已生效在调整后的评分里）

4. **chapter-writer revise mode "extend"**：
   - 字数太短时不重写，只补五感 / 不规则小动作 / 内心戏，保持事件链不变
   - v1 没有 extend 模式，要么 polish（不改字数）要么 rewrite（推翻重来），中间缺一档

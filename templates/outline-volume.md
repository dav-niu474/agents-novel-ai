---
asset_type: outline-volume
asset_id: volume-NN
volume_no: <N>
chapter_range: [<start>, <end>]
target_chapters: <count>
created_at: <ISO>
updated_at: <ISO>
version: 1
status: drafting
maintained_by: novel-outline-architect
---

<!--
  卷纲（用户口中的"细纲"）。每卷一份。
  当前卷写完前 5 章前，必须就绪下一卷的卷纲。
  详见 docs/design/01-asset-model.md 第 8.2 节、skills/novel-outline-architect/SKILL.md 第 3.2 节。
  
  落点：outline/volumes/volume-<NN>.md（NN 为 2 位 0 填充）
-->

# 第 <N> 卷《<卷名>》卷纲

## 卷主题

<!--
  一句话总结这一卷在回答什么。
-->

<填卷主题>

## 卷高潮

<!--
  必填，章节 + 事件。不能"未来某天"。
-->

**第 <X> 章**：<高潮事件>

## 节奏分段（5 段式）

<!--
  比例参考：起 20% / 承 25% / 转 25% / 合 20% / 高潮 10%。
-->

- **起**（第 <a>-<b> 章）：<段目标>
- **承**（第 <b>-<c> 章）：<段目标>
- **转**（第 <c>-<d> 章）：<段目标>
- **合**（第 <d>-<e> 章）：<段目标>
- **高潮**（第 <e>-<end> 章）：<高潮 + 卷末钩子>

## 必出现的桥段（≥ 5 个，按章节排）

<!--
  ⚠️ 每个桥段必须对应：blueprint 钩子 / cheat-system.beats / character 弧光 中的至少一个。
  不能凭空加桥段。
-->

| 章节 | 桥段 | 来源 |
|------|------|------|
| <X> | <例：残卷第一次解析> | cheat-system.beats[0] (first-use) |
| <X> | <例：第一次反杀> | cheat-system.beats[1] (comeback) + 主角弧光起点 |
| <X> | <例：第一次反噬> | cheat-system.beats[2] (backlash) |
| <X> | <例：师妹救场> | character.<id>.弧光节点 |
| <X> | <例：大典翻盘> | 卷高潮（与 blueprint 第 5 节对齐） |

## 卷末钩子（给下一卷的承诺）

<!--
  新埋的伏笔 / 主角境界跃迁 / 场景切换。
-->

<填卷末钩子>

## 角色出场计划

<!--
  本卷新增 / 回归的角色。outline-architect 写章纲时按这表分配出场。
-->

| 章节 | 角色 ID | 状态 |
|------|---------|------|
| <X> | <character-id> | 首次 |
| <X> | <character-id> | 回归 |
| <X> | <character-id> | 离场 |

## 与金手指节拍的耦合

<!--
  从 cheat-system.json.beats 提取本卷范围内的 beat。
-->

| 章节 | beat type | event |
|------|-----------|-------|
| <X> | first-use | <event> |
| <X> | comeback | <event> |
| <X> | backlash | <event> |

## 支线推进计划

<!--
  本卷会推进 / 暂置的支线。与 memory/subplot_board.json 镜像。
-->

| 支线 ID | 本卷动作 | 推进章节 |
|---------|----------|---------|
| subplot-A-<slug> | progress | 第 X、Y 章 |
| subplot-B-<slug> | progress | 第 Z 章 |
| subplot-C-<slug> | dormant | — |

## 卷末状态预期

<!--
  卷末时 memory/current_state 期望的关键字段值。
-->

- 主角境界：<例：炼气九层 / 筑基初期>
- 主角位置：<例：宗门核心，准备离开>
- 关键物品：<例：残卷第二段封印浮现>
- 主要敌对：<例：玄霄宗已成首要威胁>

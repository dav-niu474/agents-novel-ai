---
asset_type: progress-decisions
asset_id: decisions
created_at: <ISO>
updated_at: <ISO>
maintained_by: novel-studio + 用户
---

<!--
  决策日志：人类可读的"重要选择记录"。粒度比 timeline 粗，比 lessons 具体。
  
  适合记什么：
  - blueprint / world / character / outline 的版本变更（v1 → v2 改了什么）
  - revise 的 spot-fix / rework 决策
  - 关键节奏选择（卷末高潮章节调整）
  - 角色阵容收紧 / 扩张
  - 金手指阶梯调整
  
  不适合记什么：
  - 单章 audit / settle 的细节（那是 timeline / audit reports 的事）
  - 设计文档中的 ADR（那是 docs/design/）
-->

# 决策日志

## <YYYY-MM-DD> · <决策标题>

**决策**：<一句话说清楚做了什么改动>

**原因**：<为什么这么改>

**影响范围**：
- <受影响的文件 1>
- <受影响的章节范围>
- <对长期意图的影响>

**反向决定的可能性**：<如果发现错了，回滚成本如何？>

---

## 模板示例（删除前请保留你的真实决策）

## 2026-05-XX · 金手指 Tier 4 代价机制调整

**决策**：Tier 4 的代价从"精神力"改为"记忆"

**原因**：呼应"残卷会消失"的长期伏笔（卷 12），让 Tier 4 解锁的代价跟"残卷消失"在同一条主题线上

**影响范围**：
- world/cheat-system.json `stages[3]` + `alt_cost`
- 第 720+ 章关键节拍
- 不影响前 100 章

**反向决定的可能性**：低 - 这条线在 blueprint 第 10 节已写明

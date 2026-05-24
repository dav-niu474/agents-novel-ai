---
asset_type: chapter
asset_id: chapter-<NNNN>
chapter_no: <N>
volume_no: <V>
title: <章节标题>
status: draft
version: 1
word_count: 0
written_at: <ISO>
maintained_by: novel-chapter-writer
audit_score: null
---

<!--
  正文。chapter-writer 写出来后落到这里。
  status 流转：draft → reviewed → approved（也可直接 draft → approved 跳审）
  
  ⚠️ 不要在正文里出现 markdown 围栏（```）或多余 frontmatter。
  ⚠️ 默认 status: draft，等待 quality-auditor 审稿后才能 approved。
  ⚠️ 旧版本归档到 chapters/.snapshots/chapter-<NNNN>.v<N>.md。
  
  详见 docs/design/01-asset-model.md 第 9 节、skills/novel-chapter-writer/SKILL.md。
  反 AI 味词表：skills/novel-chapter-writer/references/anti-ai-patterns.md
  
  落点：chapters/chapter-<NNNN>.md（NNNN 为 4 位 0 填充）
-->

# 第 <N> 章 · <章节标题>

<!-- 正文从这里开始。例（首屏钩子前 200 字内必须有冲突 / 悬念 / 承诺 / 场景钩子）： -->

<章节正文>

<!--
  写完后 chapter-writer 会更新 frontmatter 的 word_count，
  然后由 quality-auditor 审稿后填 audit_score 并切换 status。
-->

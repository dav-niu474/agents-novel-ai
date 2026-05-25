---
asset_type: progress-timeline
asset_id: timeline
last_event_at: <ISO>
generated: true
generated_at: <ISO>
maintained_by: novel-studio
---

<!--
  ⚠️ JSON 投影。永不手动编辑。要改去改 timeline.json，由 studio 重生成。
  ⚠️ append-only：永远不删除已有事件。
-->

# 全书时间轴

## <YYYY-MM-DD>

- **HH:MM** [`<skill>`] `<event_type>` <details>
- **HH:MM** [`novel-studio`] `project-init` 创建项目 `<book_id>`
- **HH:MM** [`novel-blueprint`] `blueprint-approved` 蓝图 v1
- ...

## <YYYY-MM-DD>

- **HH:MM** [`novel-chapter-writer`] `chapter-write` 第 1 章写完，2757 字 ⚠️ length_warning
- **HH:MM** [`novel-quality-auditor`] `chapter-audit` 第 1 章 87/100
- **HH:MM** [`novel-quality-auditor`] `chapter-settle` 第 1 章 settle，7 类 delta 应用

---

## 事件类型枚举

`project-init` / `blueprint-*` / `world-update` / `cheat-system-update` / `powers-update` / `character-*` / `outline-*` / `chapter-plan` / `chapter-compose` / `chapter-write` / `chapter-revise` / `chapter-audit` / `chapter-settle` / `vault-add` / `vault-use` / `radar-scan` / `decision-recorded` / `lesson-recorded` / `milestone-reached` / `snapshot-taken`

# Memory Templates · 长期记忆

> 7 类真相文件的骨架（第 8 类 `vault_index` 由 asset-vault 维护，见 `templates/vault/`）。
> 双轨制：JSON 是权威源，Markdown 是从 JSON 投影的人类可读视图。
>
> Schema 详见 [`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 2 节。
> 维护规则（delta-only / immutable apply / 9 大约束 C1-C9）见同文档第 3、8 节。

---

## 文件清单

| 文件 | 用途 | 写入方式 |
|------|------|---------|
| [`current_state.{json,md}`](.) | 当前世界状态：角色位置、关系、已知信息 | `patch_character` / `add_character` / `set_world_clock` / `add_known_to_protagonist` / `move_to_unknown` |
| [`particle_ledger.{json,md}`](.) | 物品 / 资源 / 金手指消耗账本 | append + 字段 patch |
| [`pending_hooks.{json,md}`](.) | 未闭合伏笔（追读力债务追踪） | `upsert` / `mention` / `progress` / `defer` / `resolve` |
| [`chapter_summaries.{json,md}`](.) | 每章 1 段摘要 | 仅 `append`（不允许跳号） |
| [`subplot_board.{json,md}`](.) | 支线进度板（A/B/C 线） | `add_subplot` / `patch_subplot` / `set_status` |
| [`emotional_arcs.{json,md}`](.) | 情感弧线（按角色） | 仅 `append_trajectory` |
| [`character_matrix.{json,md}`](.) | 角色交互矩阵（谁见过谁、知道什么） | `record_encounter` / `add_known` / `move_to_unknown` |

---

## 重要规则

1. **LLM 不直接写 Markdown**：要改去改 JSON，Markdown 由 settle 阶段从 JSON 自动投影。
2. **delta-only**：settle 阶段输出 JSON delta，由 skill 层应用，不做整文件覆盖。
3. **不删除已 resolved 的 hooks**：永久档案。
4. **chapter_summaries 不跳号**：发现跳号要先 quality-auditor 报错，不允许 append。
5. **9 大约束 C1-C9**：每次 settle 后必须自检全部通过，否则章节 status 保留 draft。

---

## 落点路径

把这些文件复制到目标小说项目的 `memory/` 目录：

```
my-novel/
└── memory/
    ├── current_state.json
    ├── current_state.md
    ├── particle_ledger.json
    ├── particle_ledger.md
    ├── pending_hooks.json
    ├── pending_hooks.md
    ├── chapter_summaries.json
    ├── chapter_summaries.md
    ├── subplot_board.json
    ├── subplot_board.md
    ├── emotional_arcs.json
    ├── emotional_arcs.md
    ├── character_matrix.json
    └── character_matrix.md
```

新建项目时 7 个 JSON 都先初始化为空（`data: {}` 或对应空数组），第一次 settle 时由 quality-auditor 填充。

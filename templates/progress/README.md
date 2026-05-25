# Progress Templates · 长文写作进度控制（v1.3 新增）

> 第 4 类项目级资产骨架。在 memory/ / vault/ / audit/ 之外，独立追踪**作者侧的过程元数据**。
>
> Schema 详见 [`docs/design/05-progress-tracking.md`](../../docs/design/05-progress-tracking.md)。

---

## 文件清单

| 模板 | 用途 | 写入方式 |
|------|------|---------|
| [`timeline.{json,md}`](.) | 全书时间轴（事件流） | append-only by 各 skill |
| [`milestones.{json,md}`](.) | 里程碑（关键节点已达成 / 待达成） | upsert by novel-studio |
| [`velocity.{json,md}`](.) | 速度指标（7d / 30d / 全书） | recompute by novel-studio |
| [`decisions.md`](./decisions.md) | 决策日志（重要选择） | append by 用户 + studio |
| [`lessons.md`](./lessons.md) | 经验沉淀（卷末复盘） | append by asset-vault + studio |
| [`todo.md`](./todo.md) | 待办清单（聚合 hooks/支线/章纲/修订） | recompute by novel-studio |
| [`logs/`](./logs/) | 详细执行日志（按日 jsonl） | append by all skills |
| [`snapshots/`](./snapshots/) | 周末 / 卷末快照 | manual by 用户 |

---

## 落点路径

```
my-novel/
└── progress/                            ← 与 memory/ vault/ audit/ 平级
    ├── timeline.{json,md}
    ├── milestones.{json,md}
    ├── velocity.{json,md}
    ├── decisions.md
    ├── lessons.md
    ├── todo.md
    ├── logs/
    │   └── YYYY-MM-DD.jsonl
    └── snapshots/
        └── snapshot-YYYY-WNN.md
```

---

## 重要规则

1. **timeline / logs 是 append-only**：永远不删除已有事件，只追加新事件
2. **velocity / todo / milestones 可以 recompute**：从 timeline + logs + memory 实时计算
3. **decisions / lessons 是人类协商写入**：studio 引导，但用户决定要不要记
4. **snapshots 不被自动改写**：写完即冻结，作为某周 / 卷末的"档案"

---

## 与 memory / vault / audit 的边界

| 子系统 | 视角 | 例子 |
|--------|------|------|
| `memory/` | **故事内**真相 | 林烬第 5 章末位置、苏婉柔的母亲身份 |
| `vault/` | 跨书素材库 | "七寸断"反杀桥段、风格指纹 |
| `audit/reports/` | 一次性产出 | 第 5 章审稿报告 |
| **`progress/`** | **作者侧**元数据 | "我什么时候改了 blueprint"、"这周写了几章"、"还欠读者多少债" |

简言之：**memory/ 管"故事还没忘"；progress/ 管"作者没忘自己写了什么"。**

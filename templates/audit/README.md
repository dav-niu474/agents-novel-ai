# Audit Templates · 审稿与雷达报告

> 审稿（quality-auditor）和市场雷达（market-radar）输出的报告骨架。
>
> 审稿维度详见 [`skills/novel-quality-auditor/references/audit-dimensions.md`](../../skills/novel-quality-auditor/references/audit-dimensions.md)。
> 雷达 3 类报告详见 [`skills/novel-market-radar/SKILL.md`](../../skills/novel-market-radar/SKILL.md) 第 4 节。

---

## 文件清单

| 模板 | 报告类型 | 输出方 |
|------|---------|-------|
| [`chapter-audit-report.md`](./chapter-audit-report.md) | 单章审稿报告 | `novel-quality-auditor` |
| [`full-book-audit.md`](./full-book-audit.md) | 全书复盘报告 | `novel-quality-auditor` |
| [`trend-report.md`](./trend-report.md) | 平台雷达报告（题材热度 / 竞品分析 / 子赛道空缺三合一） | `novel-market-radar` |

---

## 落点路径

```
my-novel/
└── audit/
    ├── reports/
    │   ├── chapter-NNNN.audit.md       ← chapter-audit-report 实例
    │   └── full-book-audit.md          ← full-book-audit 实例
    └── trends/
        └── trend-YYYYMMDD.md           ← trend-report 实例
```

---

## 评分公式（审稿）

```
audit_score = 100
  - critical_count × 20
  - major_count × 5
  - minor_count × 1
clamp to [0, 100]
```

参考阈值：

- ≥ 90：可发布
- 80-90：可发布但建议 polish
- 70-80：建议 spot-fix 后发布
- 60-70：建议 rewrite
- < 60：建议 rework（章纲层面也有问题）

# Vault Templates · 参考素材库

> 4 类素材卡的骨架 + 总索引。vault 是**全局共享资源**（跨书复用），不是 per-book 一份。
>
> Schema 详见 [`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 7 节。
> 维护逻辑见 [`skills/novel-asset-vault/SKILL.md`](../../skills/novel-asset-vault/SKILL.md)。

---

## 文件清单

| 模板 | 卡类型 | 用途 |
|------|-------|------|
| [`inspiration-card.md`](./inspiration-card.md) | inspiration | 脑洞 / 设定碎片 / 选题想法 |
| [`snippet-card.md`](./snippet-card.md) | snippet | 段落级写作素材（金句 / 桥段 / 描写示范） |
| [`reference-card.md`](./reference-card.md) | reference | 参考作品片段（必须注明出处，fair use） |
| [`style-fingerprint.json`](./style-fingerprint.json) | style-fingerprint | 风格指纹（写作约束） |
| [`vault-index.json`](./vault-index.json) | vault-index | 总索引（每次新增 / 修改后必更新） |

---

## 落点路径

```
my-novel-workspace/                ← 工作根目录（vault 是全局共享）
├── novel-1/
├── novel-2/
└── vault/                         ← 全局 vault
    ├── _index.json
    ├── inspirations/
    │   └── insp-<8位短码>.md
    ├── snippets/
    │   └── snip-<8位短码>.md
    ├── references/
    │   └── ref-<8位短码>.md
    └── style-fingerprints/
        ├── style-<name>.json
        └── samples/
            └── sample-001.md
```

⚠️ vault 在工作目录的根，不在某本书里。多本书共享。

---

## ID 规则

- 灵感卡：`insp-<8位 UUID v4 短码>`
- 桥段卡：`snip-<8位 UUID v4 短码>`
- 参考卡：`ref-<8位 UUID v4 短码>`
- 风格指纹：`style-<可读 slug>`（例：`style-cangtian-bagua`）

---

## 三种使用模式

| 模式 | 触发场景 | 调用方 |
|------|---------|-------|
| 灵感模式 | 开书 / 卡文时检索 | `novel-blueprint` / `novel-outline-architect` |
| 写作辅助模式 | chapter-writer compose 阶段按 tag top-3 注入 | `novel-chapter-writer` |
| 风格注入模式 | 启用文风指纹后影响 chapter-writer + auditor | `novel-chapter-writer` / `novel-quality-auditor` |

⚠️ **references 不进 compose**：参考片段（来自他人作品）只供作者人工查阅，不允许 chapter-writer 自动注入。

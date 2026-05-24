# Templates · 资产骨架库

> 所有 Skills 在创建资产文件时引用的"标准骨架"。
> 用法：复制对应模板到目标项目路径，按 `<...>` 占位与 `<!-- ... -->` 提示填写。
>
> Schema 权威源：[`docs/design/01-asset-model.md`](../docs/design/01-asset-model.md)。
> 模板与 schema 不一致时以 schema 为准，并以 PR 修正模板。

---

## 索引

| 模板文件 | 资产类型 | 维护方 Skill | 落点路径 |
|---------|---------|-------------|---------|
| [`novel.json`](./novel.json) | 项目元数据 | `novel-studio` | `novel.json` |
| [`blueprint.md`](./blueprint.md) | 开书蓝图 | `novel-blueprint` | `blueprint.md` |
| [`worldview.md`](./worldview.md) + [`worldview.json`](./worldview.json) | 世界观 | `novel-worldforge` | `world/worldview.{md,json}` |
| [`cheat-system.md`](./cheat-system.md) + [`cheat-system.json`](./cheat-system.json) | 金手指 | `novel-worldforge` | `world/cheat-system.{md,json}` |
| [`powers.md`](./powers.md) + [`powers.json`](./powers.json) | 力量等级 | `novel-worldforge` | `world/powers.{md,json}` |
| [`character.md`](./character.md) | 单个角色卡 | `novel-character-atelier` | `characters/<role>-<slug>.md` |
| [`characters-relationships.md`](./characters-relationships.md) | 关系网 | `novel-character-atelier` | `characters/relationships.md` |
| [`characters-index.json`](./characters-index.json) | 角色索引 | `novel-character-atelier` | `characters/_index.json` |
| [`outline-master.md`](./outline-master.md) | 总纲 | `novel-outline-architect` | `outline/master.md` |
| [`outline-volume.md`](./outline-volume.md) | 卷纲 / 细纲 | `novel-outline-architect` | `outline/volumes/volume-NN.md` |
| [`outline-chapter.md`](./outline-chapter.md) | 章纲 / 章节细纲 | `novel-outline-architect` | `outline/chapters/chapter-NNNN.md` |
| [`chapter.md`](./chapter.md) | 正文 | `novel-chapter-writer` | `chapters/chapter-NNNN.md` |
| [`memory/`](./memory/) | 8 类长期记忆 | `novel-quality-auditor` (settle) | `memory/*.{json,md}` |
| [`vault/`](./vault/) | 4 类素材卡 | `novel-asset-vault` | `vault/{inspirations,snippets,references,style-fingerprints}/` 与 `vault/_index.json` |
| [`audit/`](./audit/) | 审稿 / 雷达报告 | `novel-quality-auditor` / `novel-market-radar` | `audit/reports/` 与 `audit/trends/` |

---

## 通用约定

### Frontmatter

每个 Markdown 资产文件的 frontmatter 必须包含：

```yaml
---
asset_type: <enum>          # 见 01-asset-model.md 第 2.3 节
asset_id: <slug>            # 资产唯一 ID
created_at: <ISO 8601>
updated_at: <ISO 8601>
version: 1                  # 每次写入 +1
status: drafting            # drafting / approved / archived
maintained_by: <skill-name> # 维护这个文件的 skill
---
```

### JSON schema 通用字段

```json
{
  "schema_version": "1.0",
  "asset_type": "<enum>",
  "asset_id": "<slug>",
  "created_at": "<ISO>",
  "updated_at": "<ISO>",
  "version": 1,
  "data": { /* 资产具体内容 */ }
}
```

### 占位符约定

- `<...>` 必填占位，复制后用真实内容替换
- `<!-- 提示：xxx -->` HTML 注释，给填写者的指南，**保留即可**（Markdown 渲染时不显示）；如果嫌占空间也可以删
- `// ...` JSON 内的注释，**必须删除**才能成为合法 JSON
- 示例文本如「林烬」「天工残卷」「青云宗」是占位用例（统一用《吞天魔帝》虚构示例书），都需替换

### ID 命名规则（重要）

- 项目 ID：`<slug>-<6 位随机>`，例 `tunshi-mo-di-a3f9c2`
- 章节序号：4 位 0 填充，例 `chapter-0001`
- 卷序号：2 位 0 填充，例 `volume-01`
- 角色 ID：`<role>-<slug>`，例 `protagonist-lin-jin` / `antagonist-zhao-tianxiao` / `supporting-su-wanrou`
- 素材卡 ID：UUID v4 前 8 位，例 `f3a92e1c`，前缀 `insp-` / `snip-` / `ref-`
- 钩子 ID：`hook-<topic-slug>`，例 `hook-canjuan-origin`
- 支线 ID：`subplot-<tier>-<topic-slug>`，例 `subplot-A-canjuan-origin`

### 文件命名

- 一律小写、连字符分隔（kebab-case）
- 机器化资产（`chapter-NNNN.md` / `volume-NN.md` / `_index.json`）必须用英文 + 数字
- 角色文件名用 ASCII slug，避免跨平台编码问题

---

## 使用顺序

模板之间有依赖（详见 [`docs/design/01-asset-model.md`](../docs/design/01-asset-model.md) 第 12 节）。建议按下面顺序填写：

```
1. novel.json                    ← novel-studio 初始化
2. blueprint.md                  ← novel-blueprint 定盘
3. worldview.md + .json          ← novel-worldforge
4. powers.md + .json             ← novel-worldforge（必须先于 cheat-system）
5. cheat-system.md + .json       ← novel-worldforge
6. characters-index.json         ← novel-character-atelier
   characters/<role>-*.md
   characters/relationships.md
7. outline-master.md             ← novel-outline-architect
8. outline-volume.md             ← novel-outline-architect
9. outline-chapter.md            ← novel-outline-architect（先 5-10 章，后续滚动）
10. chapter.md                   ← novel-chapter-writer（写正文）
11. memory/*                     ← novel-quality-auditor settle 阶段写入
12. audit/reports/*              ← novel-quality-auditor 写入
13. vault/*                      ← novel-asset-vault 任意阶段沉淀
14. audit/trends/*               ← novel-market-radar 任意阶段输出
```

---

## 维护

- 模板字段变更需同步：`docs/design/01-asset-model.md` schema 章节 + 受影响 skill 的 SKILL.md
- 模板版本追随：每个模板顶部 frontmatter 的 `version` 表示**模板自身**的版本（v1 默认 1），与具体小说项目里实例的 version 无关
- 新增资产类型时：优先在 `01-asset-model.md` 加 schema 章节，再回到 `templates/` 加文件，最后更新本 README 索引

---

## 与三个参考项目模板的兼容

| 参考项目 | 模板形态 | 我们如何兼容 |
|---------|---------|-------------|
| inkos | 单 SKILL.md 内嵌示例 | 我们抽出独立 templates/，inkos 项目可以将其 truth files 路径直接对接到 `memory/` |
| webnovel-writer | `.story-system/MASTER_SETTING.json` + `volumes/` + `chapters/` | 命名风格与我们一致；可手动迁移 |
| AI-Novel-Writing-Assistant | 数据库驱动（Prisma schema） | 不直接兼容，但资产语义对位（详见 docs/design/00-system-overview.md 第 4.3 节） |

迁移指南将在 v1.2 补齐到 `docs/migration/`。

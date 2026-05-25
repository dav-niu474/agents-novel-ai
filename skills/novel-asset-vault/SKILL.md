---
name: novel-asset-vault
description: 用于参考素材库管理与素材沉淀的 skill。当用户说"把这段话存下来 / 给我找类似的桥段 / 整理参考资料 / 灵感 / 金句 / 桥段 / 素材 / 复盘 / 写法分析 / 文风指纹 / 提取写法 / 模仿这种风格"时使用。维护四类资产：vault/inspirations/（灵感卡）、vault/snippets/（段落级写作素材）、vault/references/（参考作品片段，注明出处）、vault/style-fingerprints/（风格指纹）。再加上 vault/_index.json 总索引。支持三种使用模式：灵感模式（开书 / 卡文时检索）、写作辅助模式（chapter-writer compose 阶段 top-3 注入 snippets）、风格注入模式（启用文风指纹后影响 chapter-writer + quality-auditor）。也负责完书复盘时把好桥段沉淀为下本书的素材。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: []
  upstream_assets: []
  downstream_skills: [novel-blueprint, novel-worldforge, novel-character-atelier, novel-outline-architect, novel-chapter-writer, novel-quality-auditor]
  downstream_assets: [vault/inspirations/, vault/snippets/, vault/references/, vault/style-fingerprints/, vault/_index.json]
  external_capabilities: [llm, web-fetch]
soft_depends_on:
  upstream_assets: [chapters/*, audit/reports/*]
---

# Novel Asset Vault · 参考素材库 + 素材沉淀

写网文最容易被忽视的资产是"长期沉淀的素材"。起点编辑常说"素材积累决定章节质量上限"。这个 skill 维护一个**长期可复用的素材库**，跨书复用（写完一本书再写第二本，vault 里的好桥段直接接着用）。

⚠️ vault 的核心是**索引 + 标签**，不是堆文件。每张素材卡都要有 tags / summary，方便 chapter-writer 的 compose 阶段做 top-3 召回。

⚠️ 与三个参考项目的差异化：

- **inkos** 没有专门的素材库
- **webnovel-writer** 有 RAG，但素材没拆类
- **AI-Novel-Writing-Assistant** 有"知识库 + 拆书"，但耦合 Qdrant
- **Novel Studio**：纯文件 + 索引 JSON，按四类拆，跨书可复用

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- 用户说"把这段记下来 / 这个写得好 / 沉淀一下"
- 用户说"给我找类似的桥段 / 找一段打斗示范 / 找师徒对话"
- 开书 / 卡文时需要灵感激发
- 用户提供参考文本，要做风格指纹
- 完书复盘，沉淀好桥段
- 章节审稿评分 ≥ 85（v1.3 从 95 调整），asset-vault 主动提议沉淀

❌ 不要使用：
- 写正文 → `novel-chapter-writer`
- 写大纲 → `novel-outline-architect`
- 写设定 → `novel-worldforge` / `novel-character-atelier`
- 用户想看市场趋势 → `novel-market-radar`

---

## 2. 输入与输出契约

### 输入（按场景）

| 场景 | 输入 |
|------|------|
| 沉淀新素材 | 用户提供原文或粘贴 |
| 检索素材 | 用户的 query（标签 / 关键词 / 场景描述） |
| 风格指纹提取 | 参考文本（≥ 5000 字） |
| 完书复盘 | `chapters/*` + `audit/reports/*` |

### 输出
- `vault/inspirations/insp-<id>.md`
- `vault/snippets/snip-<id>.md`
- `vault/references/ref-<id>.md`
- `vault/style-fingerprints/style-<name>.json`
- `vault/_index.json`（每次新增 / 修改后必更新）

---

## 3. 四类素材卡

### 3.1 灵感卡（inspirations）

**用途**：脑洞 / 设定碎片 / 选题想法 / 反向规则。开书前激发用，写到一半也可以倒回来翻。

**典型内容**：

- "金手指反噬可以是失忆而不是昏迷"
- "末法世界的真因可以是上古失败者刻意为之"
- "主角拒绝接受身份的反套路开局"

**模板**：

```markdown
---
asset_type: vault-card
card_type: inspiration
card_id: insp-<8 位短码>
tags: [金手指, 反噬, 解析流]
summary: 金手指反噬可以是失忆而不是昏迷
source: original | external
source_meta: { author?, url?, source_book? }
created_at: <ISO>
linked_books: [<book-id>]    # 这张卡被哪些书引用过
maintained_by: novel-asset-vault
---

# 灵感：金手指反噬之"失忆"

## 一句话
传统反噬是昏迷 / 走火入魔，过于物理。
失忆型反噬：每次超阶使用，会"忘记一段时光"——
可以是和重要人物的相处，可以是一段武学心得。

## 适用场景
- 解析流金手指
- 复制流金手指
- 任何"主角能力来自外物 / 外灵 / 残缺"的设定

## 改造方向
- 失去的记忆是否能找回？
- 主角是否会发现自己"忘了"？
- 别人会不会记得，反过来提醒主角？

## 反例（什么时候不要用）
- 模拟流（信息已通过模拟暴露过，失忆失去意义）
- 短篇（铺设时间不够）

## 备注
源自 ① 写《吞天魔帝》定盘时讨论的 7 个方向之一
② 后来又被《北境长枪》v2 借用作为"剑意会消磁"的变种
```

### 3.2 桥段（snippets）

**用途**：段落级的写作素材。打斗 / 试探 / 师徒对话 / 一招制敌 / 巧合救场 / 反派死前嘲讽 等场景的"参考写法"。

**典型内容**：风格示范片段 + 用法 + 改造方向。

**模板**：

```markdown
---
asset_type: vault-card
card_type: snippet
card_id: snip-<8 位短码>
tags: [打斗, 一招制敌, 短句快剪, 描写示范]
summary: 高手过招、不见血但已分胜负的描写示范
source: original | reference
source_meta: { author: "...", source_book: "...", url: "..." }
created_at: <ISO>
linked_books: []
use_count: 0
last_used_chapter: null
maintained_by: novel-asset-vault
---

# 桥段：剑落不见血

> 风停了。
>
> 老者抬手，剑没出鞘。
>
> 三十丈外，年轻人的衣襟开了一道线。
>
> 衣襟落地，年轻人才察觉脖子凉了一下。

## 用法
- 适用：高手过招、不见血但已分胜负
- 改造方向：把"剑没出鞘"换成你书里的功法名 / 法宝名
- 不要用在：双方境界差距小的对决（违和）

## 标签
打斗, 一招制敌, 短句快剪, 描写示范

## 改造示例
> 殿前的灯熄了一盏。
>
> 青衫客只是抬眼。
>
> 三步外，黑衣人脚下的青砖出现一道裂痕。
>
> 黑衣人后退半步，胸前的玉佩才碎成两截。
```

### 3.3 参考片段（references）

**用途**：来自其他作品的片段。**必须注明出处**。法律意义上的 fair use 引用，用于学习 / 改造，不直接抄到正文。

**典型内容**：从已发表的作品里抽一段做"反面教材"或"正面示范"。

**模板**：

```markdown
---
asset_type: vault-card
card_type: reference
card_id: ref-<8 位短码>
tags: [开局, 玄幻, 起点, 学习]
summary: 起点某玄幻文的开局示范（钩子 + 主角介绍）
source: external
source_meta: 
  author: "天蚕土豆"
  source_book: "《斗破苍穹》"
  url: "..."
  chapter: "第 1 章"
created_at: <ISO>
linked_books: []
maintained_by: novel-asset-vault
---

# 参考：《斗破苍穹》第 1 章开局

> （前 400 字）
> ...

## 学习点
- 开局直接进入冲突（被族中同辈嘲讽）
- 主角内心戏 + 现实反应交替
- 在第 200 字内出现"修炼系统"+"主角处境"

## 不要直接照抄
- 这段是已发表作品，仅做改造学习
- 改造时必须重写主角名 / 设定 / 文风

## 何时可以用
- 自己的开局结构卡住时翻一翻
- 写新书定盘时对照"前 200 字"该有的元素
```

⚠️ references 永不进入 chapter-writer compose 阶段（不允许参考片段直接被 LLM 当素材注入），只供作者人工查阅。

### 3.4 风格指纹（style-fingerprints）

**用途**：从参考文本提取统计 + 文风指南，让 chapter-writer 模仿。

详见 [`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 7.6 节。

**JSON 结构**：

```json
{
  "schema_version": "1.0",
  "asset_type": "style-fingerprint",
  "asset_id": "style-cangtian-bagua",
  "version": 1,
  "data": {
    "name": "天蚕土豆·斗破苍穹风",
    "stats": {
      "avg_sentence_length_zh": 18.3,
      "sentence_length_distribution": {"<10": 0.22, "10-20": 0.45, "20-40": 0.28, ">40": 0.05},
      "dialogue_ratio": 0.42,
      "paragraph_avg_lines": 2.7,
      "first_person_intensity": 0.18
    },
    "vocabulary": {
      "high_freq": ["那是一种", "在他看来", "缓缓", "竟然"],
      "fatigue_zh": ["不可思议", "震撼", "目瞪口呆"],
      "mannerisms": ["摸了摸鼻子", "嘴角扯出一丝弧度"]
    },
    "patterns": {
      "preferred_action_template": "动作 + 拟声 + 结果",
      "avoid": ["大段心理独白", "长形容词堆砌"]
    },
    "samples": [
      "samples/sample-001.md",
      "samples/sample-002.md"
    ]
  }
}
```

⚠️ **风格指纹是约束，不是素材**：注入到 chapter-writer 后影响**所有**章节。素材只是单点参考。

---

## 4. 工作流

### 工作流 A：沉淀新素材

触发：用户说"存下来 / 沉淀这段 / 这写得好"。

#### A.1 判定卡类型

问用户（或自己判断）：

- 这是**脑洞 / 设定**（不是具体写法）→ inspiration
- 这是**段落写法 / 描写示范**（自己的或开源 fair-use）→ snippet
- 这是**他人作品的片段**（学习用）→ reference
- 这是**整体文风分析**（≥ 5000 字源文本）→ style-fingerprint

#### A.2 提取关键字段

LLM 自动抽取，让用户确认：

- summary（一句话总结）
- tags（3-5 个标签）
- 适用场景
- 改造方向 / 学习点

#### A.3 落盘

- 生成短码 ID（前 8 位 UUID v4）
- 写到对应目录
- 更新 `vault/_index.json`

#### A.4 用户校对

```
新建素材：
  类型：snippet
  ID：snip-2a91ef03
  标签：打斗, 一招制敌, 短句快剪
  摘要：高手过招、不见血但已分胜负的描写示范
  路径：vault/snippets/snip-2a91ef03.md

ok？要改 tags / 摘要吗？
```

### 工作流 B：检索素材

触发：用户说"找一段打斗示范 / 给我类似的桥段 / 师徒对话怎么写"。

#### B.1 解析 query

把用户描述变成 tags + 关键词：

- "找一段打斗示范" → tags: [打斗, 描写示范]
- "师徒对话" → tags: [师徒, 对话]
- "类似上一章的智斗" → 读上一章章纲第 5 字段，提取爽点节拍 + 情绪曲线作为 tags

#### B.2 在索引里筛选

读 `vault/_index.json`，按 tags 求交集 → 得 N 张卡。

如果 N > 5，再按：
- use_count（用得少的优先 / 多的优先，由用户偏好决定）
- 创建时间
- linked_books（与当前书相关的优先）

排序后取 top-5。

#### B.3 给用户返回

```
找到 4 张相关素材：

1. snip-2a91ef03 ▸ 剑落不见血（打斗 / 一招制敌）
   预览：风停了。老者抬手，剑没出鞘 ...
   
2. snip-c4d8b2f1 ▸ 一拳的距离（打斗 / 近身）
   预览：他没抬手，但所有人都听见了对方左肩骨的脆响 ...
   
3. ...
```

让用户挑 / 看全文。

### 工作流 C：写作辅助（chapter-writer compose 阶段调用）

⚠️ 这是被 chapter-writer 自动调用的子流程。

#### C.1 输入

chapter-writer 给的 query：

- 章纲第 5 字段"爽点节拍"（如 "comeback / first-use"）
- 章纲第 6 字段"情绪曲线"
- 必出场角色 ID

#### C.2 召回 + 排序

- 按节拍标签筛 snippet
- 按情绪标签筛 snippet
- 同章已用过的不重复
- 取 top-3

#### C.3 返回结构化结果

返回给 chapter-writer 的 compose 阶段：

```json
{
  "snippets": [
    {"id": "snip-2a91ef03", "preview": "...", "tags": [...]},
    ...
  ]
}
```

⚠️ chapter-writer 把这 3 张卡作为"风格参考"注入 prompt，但**不直接复制**。

### 工作流 D：风格指纹提取

触发：用户提供参考文本（≥ 5000 字），说"提取风格 / 模仿这种文风"。

#### D.1 切片采样

如果文本 > 50000 字，随机抽 5 段 × 5000 字 = 25000 字做样本（避免单段偏差）。

#### D.2 统计提取

- 平均句长 / 句长分布
- 段落平均句数
- 对话占比
- 第一人称强度
- 高频词 top 30
- 高频疲劳词（与 anti-ai-patterns.md 对照）
- 习惯性手势 / 口头禅 mannerisms

#### D.3 写法规则提取

LLM 读样本，用约束格式输出：

- preferred_action_template（动作描写偏好）
- avoid（避免的写法）
- 题材定位（玄幻 / 都市 / 言情 ...）

#### D.4 生成 style-fingerprint

- 写到 `vault/style-fingerprints/style-<name>.json`
- 样本片段写到 `vault/style-fingerprints/samples/sample-N.md`
- 更新 `vault/_index.json`

#### D.5 提示用户启用

```
风格指纹 style-cangtian-bagua 已生成。
要在当前书启用吗？

启用后：
- chapter-writer 写每章时会读这个指纹（温度自动降到 0.6）
- quality-auditor 用 fatigue_zh 列表强化检测

启用方式：把 vault/style-fingerprints/style-cangtian-bagua.json 写到 blueprint.md 第 7 节"风格指纹文件"字段。
```

⚠️ 不要自动启用。让用户决定。

### 工作流 E：完书复盘沉淀

触发：用户说"复盘这本书 / 完书提取素材 / 这本书的好桥段都存下来"。

步骤：

1. **扫描所有 chapter-NNNN.md + audit/reports/chapter-NNNN.audit.md**
2. **筛选高分章节**：audit_score ≥ 85 的章节（v1.3 从 90 调整，与单章主动提议阈值对齐）
3. **从这些章节里抽段**：
   - 单段长度 100-300 字
   - 该段在审稿报告里被标记为"亮点"（如有）
   - 或自动用启发式：含必备元素 ≥ 2 项 + 0 个高频禁用词 + 0 个禁用句式
4. **批量生成 snippets**：每段 1 张 snippet 卡
5. **让用户审一遍**："建议沉淀这 12 段，要全选 / 选几段 / 不要？"
6. **写到 vault/snippets/**

### 工作流 F：素材修订 / 删除

触发：用户说"这张卡改一下 / 删了 / tags 错了"。

步骤：

1. 读卡 → 修改 → 写回
2. 同步更新 `vault/_index.json`

⚠️ 删除前**警告 linked_books**：如果这张卡被某本书引用过（在 chapter compose log 里有记录），删除会让该书的"风格延续"断掉。

### 工作流 G：跨书复用

触发：用户在新书里说"用上次那本的金句素材"。

步骤：

1. 列出 vault 中所有素材（不限 linked_books）
2. 让用户挑要在新书启用哪些
3. 在新书的 vault/_index.json 里链接（不复制实体文件，避免 vault 膨胀）
4. 标记 linked_books += 新书 ID

⚠️ vault 是**全局资源**（在 workspace 根 / 所有书的父目录共享），不是每本书一份。这是它和"per-book memory"的核心区别。

---

## 5. 关键规则

### R1：每张卡必须有 tags / summary

无 tags 卡无法被检索。无 summary 卡用户看不懂。两者都必填。

### R2：references 不进 compose

参考片段（来自他人作品）只供作者人工翻阅，不允许 chapter-writer compose 阶段自动注入。避免文字相似度过高。

### R3：风格指纹是约束，需明确启用

不自动让所有书继承。每本书在 blueprint.md 第 7 节显式写入。

### R4：use_count / last_used_chapter 必更新

chapter-writer 调用 vault 时（工作流 C），必须返回选用的 card_id 给 vault，让 vault 更新这两个字段。

### R5：跨书共享但不互相污染

vault 是全局资源，但每张卡的 linked_books 字段记录"被哪些书引用"，便于追踪。

### R6：删除前看 linked_books

警告影响范围。

### R7：sources 必须诚实

original / reference 不能错标。reference 必须有 source_meta（author / source_book / url 至少其一）。

---

## 6. 与其他 skill 的协作

### 上游 / 数据来源
- 用户主动添加（最常见）
- `novel-quality-auditor` 审稿评分 ≥ 85 时主动建议沉淀（v1.3 从 95 调整）
- `novel-chapter-writer` 写完后让 vault 自动扫亮点段（可选）

### 下游 / 数据消费
- `novel-blueprint`：开书阶段读 inspirations 给候选方向
- `novel-worldforge`：建世界时读 inspirations 找设定灵感
- `novel-character-atelier`：捏角色时读 inspirations 找角色原型
- `novel-outline-architect`：写章纲时读 snippets 找节奏示范
- `novel-chapter-writer`：compose 阶段 top-3 注入 snippets
- `novel-quality-auditor`：用 style-fingerprint 的 fatigue_zh 强化检测

### 旁支
- `novel-market-radar`：扫雷达时发现的"竞品的好桥段" → 提议沉淀为 reference

---

## 7. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 用户给的"参考文本"太短（< 1000 字）做风格指纹 | 警告样本不足，统计可能偏，但允许 |
| 用户提供了 reference 但没说出处 | 强制问出处。没出处的不存为 reference，存为"匿名 inspiration" |
| 标签太多（> 10 个） | 警告并建议精简到 3-5 个 |
| _index.json 损坏 | 从所有 vault/*/*.md 文件重建索引（v1 由 LLM 做，v2 CLI 自动） |
| 跨书检索拿到的卡 tags 不匹配新书题材 | 仍返回但标注"题材标签不一致" |
| 用户说"沉淀刚才聊的那段" 但没具体粘贴 | 让用户粘贴具体内容，不自己脑补 |

---

## 8. 示例对话

### 示例 1：沉淀一段写法

```
用户：刚才那段"风停了。老者抬手 ..."写得真好，存下来。

vault：[判定为 snippet]

      生成草稿：
      - 类型：snippet
      - 标签：打斗, 一招制敌, 短句快剪, 描写示范
      - 摘要：高手过招、不见血但已分胜负的描写示范
      - 用法：高境界差距对决；不要用在双方境界相近的对决
      - 改造方向：把"剑没出鞘"换成你书里的功法名
      - source：original
      - 路径：vault/snippets/snip-2a91ef03.md
      
      要改什么吗？

用户：tags 加一个"高境界差"。

vault：[更新 tags] [写盘 + 更新 _index.json]
      
      已沉淀。下次写打斗 / 一招制敌时会出现在 chapter-writer 的 top-3 备选。
```

### 示例 2：检索素材

```
用户：写第 31 章试探戏，给我找一段师徒对话的写法。

vault：[query 解析] tags: [师徒, 对话, 试探]
      [查 _index.json 求交集]
      
      找到 3 张：
      
      1. snip-c4d8b2f1 ▸ 老茶 / 三句话定立场
         "师太把茶碗推过来，没说一句。林烬端起，没喝。"
         tags: [师徒, 对话, 试探, 沉默运用]
      
      2. snip-7b21c4e9 ▸ 师傅的反问
         "你来找我，是为了功法，还是为了别的？"
         tags: [师徒, 对话, 反问, 信任试探]
      
      3. snip-9f8d6231 ▸ 三个不该问的
         师徒之间的对话不该问的三件事 ...
         tags: [师徒, 对话, 礼制, 古风]
      
      要看全文哪一张？或者全部展示？

用户：第 1 张全文。

vault：[展示完整 snip-c4d8b2f1.md]
      
      已记 use_count + 1。
```

### 示例 3：风格指纹

```
用户：这是我喜欢的作者写的几章（粘贴 8000 字），帮我提风格。

vault：[D.1 切片] 不需要切片（< 50000 字）
      [D.2 统计提取]
      平均句长 16.7 字 / 段落平均 2.4 句 / 对话占比 38%
      高频词：缓缓 (12), 那是一种 (6), 在他看来 (8)
      疲劳词命中：缓缓 12 次（远超 anti-ai 阈值）
      mannerisms：摸了摸鼻子（4 次）, 嘴角扯出一丝弧度（3 次）
      
      [D.3 写法提取]
      preferred_action_template: "动作 + 拟声 + 结果"
      avoid: 大段心理独白, 长形容词堆砌
      
      [D.4 生成]
      已生成：vault/style-fingerprints/style-myref.json
      样本：vault/style-fingerprints/samples/sample-001.md ~ sample-008.md
      
      ⚠️ 注意：这位作者的"缓缓"使用频率超过我们的反 AI 味阈值（12 vs 限值 2）。
      如果你启用这个指纹，写出来会偏 AI 味。建议：
      1. 启用指纹但保留我们的 anti-ai 词表（推荐）
      2. 完全继承指纹（不推荐）
      3. 只用指纹的 stats 和 mannerisms，不用 vocabulary（折中）
      
      要启用吗？
```

### 示例 4：完书复盘沉淀

```
用户：吞天魔帝刚写完 50 章（卷 1），把好桥段沉淀一下。

vault：[扫所有 chapter + audit_reports]
      
      高分章节（≥ 90）：18 / 50
      启发式抽段：找到 23 段候选
      
      Top 12 段建议沉淀：
      
      1. ch-0005 段 23-26：第一次反杀（comeback）
         "他没看赵天霄。只是抬手摸了一下胸口的残卷。三息后..."
         tags: [反杀, 第一次, 解析流]
      
      2. ch-0028 段 7-10：第一次反噬（backlash）
         "残卷烫了起来，烫得他眼前一黑..."
         tags: [反噬, 代价, 痛感]
      
      ... (10 more)
      
      要全选 / 挑几个 / 全部不要？

用户：1, 2, 5, 8 这四个。

vault：[生成 4 张 snippet 卡，写盘，更新 _index.json]
      
      已沉淀 4 张。下次开新书写"反杀 / 反噬"时会自动出现在备选。
```

---

## 9. 引用文档

- vault 设计：[`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 7 节
- 风格指纹格式：[`docs/design/03-memory-and-vault.md`](../../docs/design/03-memory-and-vault.md) 第 7.6 节
- 反 AI 味词表（fatigue_zh 来源）：[`../novel-chapter-writer/references/anti-ai-patterns.md`](../novel-chapter-writer/references/anti-ai-patterns.md)
- chapter-writer compose 阶段如何调用 vault：[`../novel-chapter-writer/SKILL.md`](../novel-chapter-writer/SKILL.md) 第 3.1 节

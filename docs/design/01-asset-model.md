# 资产模型 · Novel Studio

> 9 类一等公民资产的 schema、目录布局、ID 规则、版本与快照策略。
> 这份文档是所有 Skill 写文件时**必须遵守**的契约。

---

## 1. 资产分类

| # | 资产 | 路径 | 主格式 | 副格式 | 维护方 Skill |
|---|------|------|-------|-------|------|
| 1 | 项目元数据 | `novel.json` | JSON | — | `novel-studio` |
| 2 | 开书蓝图 | `blueprint.md` | Markdown | — | `novel-blueprint` |
| 3 | 世界观 | `world/worldview.md` + `world/worldview.json` | Markdown | JSON | `novel-worldforge` |
| 4 | 金手指 | `world/cheat-system.md` + `world/cheat-system.json` | Markdown | JSON | `novel-worldforge` |
| 5 | 角色 / 人设 | `characters/*.md` + `characters/_index.json` | Markdown | JSON | `novel-character-atelier` |
| 6 | 大纲（总纲 / 卷纲 / 章纲） | `outline/master.md`、`outline/volumes/volume-NN.md`、`outline/chapters/chapter-NNNN.md` | Markdown | — | `novel-outline-architect` |
| 7 | 正文 | `chapters/chapter-NNNN.md` | Markdown | — | `novel-chapter-writer` |
| 8 | 长期记忆（真相文件） | `memory/*.json` + `memory/*.md` | JSON | Markdown | `novel-quality-auditor` |
| 9 | 参考素材 | `vault/*` | Markdown + JSON | — | `novel-asset-vault` |

> 用户问题中的"细纲"和"章节细纲"我们统一归到 **#6 大纲**：细纲 = 卷纲，章节细纲 = 章纲。后文统一用"章纲（chapter-outline）"称呼。

---

## 2. 通用约定

### 2.1 ID 规则

- **小说项目 ID**：`novel.json` 里的 `id`，由 blueprint skill 创建时生成，格式：`<slug>-<6位随机>`（例：`tunshi-mo-di-a3f9c2`）。
- **章节序号**：4 位 0 填充，从 0001 起。例：`chapter-0001.md`。
- **卷序号**：2 位 0 填充，从 01 起。例：`volume-01.md`。
- **角色 ID**：在 `characters/_index.json` 里维护，格式：`<role>-<slug>`，例：`protagonist-lin-jin`、`supporting-zhao-yun`。
- **素材卡 ID**：UUID v4 短码（前 8 位），例：`f3a92e1c`。

### 2.2 文件命名

- 一律小写、连字符分隔（kebab-case）。
- 中文文件名也允许，但**机器化资产**（如 `chapter-0001.md`、`volume-01.md`）必须用英文 + 数字。
- 角色文件名用 ASCII slug，例：`protagonist-lin-jin.md`，避免跨平台编码问题。

### 2.3 文件头 frontmatter

所有 Markdown 资产文件必须有 YAML frontmatter，至少包含：

```yaml
---
asset_type: chapter            # 资产类型枚举
asset_id: chapter-0031         # 资产 ID
created_at: 2026-05-24T10:00:00Z
updated_at: 2026-05-24T15:30:00Z
version: 3                     # 版本号，每次重写 +1
status: draft                  # draft / approved / archived
maintained_by: novel-chapter-writer
---
```

`asset_type` 枚举值：`project` / `blueprint` / `worldview` / `cheat-system` / `character` / `outline-master` / `outline-volume` / `outline-chapter` / `chapter` / `memory` / `vault-card` / `audit-report` / `trend-report`。

### 2.4 JSON schema 通用字段

所有 JSON 资产文件必须包含：

```json
{
  "schema_version": "1.0",
  "asset_type": "worldview",
  "asset_id": "worldview-main",
  "created_at": "2026-05-24T10:00:00Z",
  "updated_at": "2026-05-24T15:30:00Z",
  "version": 1,
  "data": { /* 资产具体内容 */ }
}
```

### 2.5 版本与快照

- **行内版本**：每个文件 frontmatter 里的 `version` 字段，每次写入 +1。
- **章节快照**：写章节正文时，旧版本归档到 `chapters/.snapshots/chapter-NNNN.v{N}.md`，便于回滚。
- **大纲快照**：每次大纲大改前，归档到 `outline/.snapshots/`。
- **真相文件无快照**：因为每次都是 delta apply，错了直接看 git diff。
- **Git 友好**：所有资产都是文本，直接用 git 做版本控制，不引入额外快照系统。

---

## 3. 资产 #1：项目元数据 `novel.json`

```json
{
  "schema_version": "1.0",
  "asset_type": "project",
  "id": "tunshi-mo-di-a3f9c2",
  "title": "吞天魔帝",
  "subtitle": "末法时代的最后一缕魔气",
  "genre": ["xuanhuan", "yixie"],
  "platform_target": ["qidian", "fanqie"],
  "lang": "zh-CN",
  "audience": "male-young-adult",

  "blueprint_status": "approved",
  "outline_status": "in_progress",
  "current_chapter": 31,
  "target_chapters": 800,
  "target_chapter_words": 3500,
  "current_total_words": 105234,

  "tags": ["末法", "穿越", "解析流", "热血", "升级"],
  "core_pitch": "末法时代穿越者，靠一本残卷解析天地间所有功法，从废柴一步步成为吞天魔帝。",

  "agents": {
    "writer_voice": "热血少年向，多对话、爽点紧凑",
    "auditor_strictness": "high"
  },

  "created_at": "2026-05-01T00:00:00Z",
  "updated_at": "2026-05-24T15:30:00Z",
  "version": 12
}
```

字段说明见 `04-skill-spec.md` 第 2 节。

---

## 4. 资产 #2：开书蓝图 `blueprint.md`

蓝图是 `novel-blueprint` 与作者协商出的"开书契约"，定下后续所有 skill 都要遵守。

```markdown
---
asset_type: blueprint
asset_id: blueprint-main
created_at: 2026-05-01T00:00:00Z
updated_at: 2026-05-01T18:00:00Z
version: 4
status: approved
maintained_by: novel-blueprint
---

# 《吞天魔帝》开书蓝图

## 1. 一句话定盘
末法时代穿越者，靠一本残卷解析天地间所有功法，从废柴成长为吞天魔帝。

## 2. 题材定位
- 主题材：玄幻
- 副题材：末法 / 解析流
- 平台：起点（首选）/ 番茄（同步）
- 受众：男频青年向

## 3. 主角一句话画像
现代研究生穿越成宗门最末等弟子林烬，自卑、被欺、但有耐心和分析力。

## 4. 金手指一句话
《天工残卷》：可解析任何接触过的功法 / 法宝 / 灵植 / 气息，输出"原理 + 缺陷 + 优化方向"。

## 5. 卖点 / 钩子（前 30 章承诺）
- 第 1 章：被欺凌的废柴林烬，意外获得残卷。
- 第 5 章前：解析出第一门功法的缺陷，反杀挑事者。
- 第 15 章前：识破宗门长老阴谋，绝境翻盘。
- 第 30 章前：踏入宗门核心，残卷露出第二段封印。

## 6. 反 AI 味要求
- 不写"他眉头一皱，发现事情并不简单"这种 AI 高频句。
- 对话占比 ≥ 40%，少用 4 字成语堆砌。
- 每章必须有具体场景细节（味道 / 触感 / 不规则的小动作）。

## 7. 文风指纹
（可选）参考作者 / 文本：__________

## 8. 排除项
- 不写：种马、龙傲天到底、纯打脸爽文。
- 写：废柴翻身、智斗多于硬刚、师徒情线。

## 9. 章字数
3500 字 / 章。

## 10. 长期意图
800 章完结。前 30 章铺金手指 + 宗门，30-100 章离开宗门看世界，100+ 章进入末法真相。
```

蓝图是**整本书的最高契约**，下面所有资产必须不与之冲突。

---

## 5. 资产 #3：世界观 `world/worldview.md` + `.json`

### Markdown（人类可读）

```markdown
---
asset_type: worldview
asset_id: worldview-main
created_at: ...
updated_at: ...
version: 2
maintained_by: novel-worldforge
---

# 世界观：末法纪元

## 1. 大背景
五百年前，灵气枯竭，仙路断绝。残存修士退守九大宗门 ...

## 2. 时间线锚点
- 上古：群仙时代
- 远古：神魔大战
- 近古：仙路断绝
- 当代：末法纪元 500 年

## 3. 地理 / 势力
- 九大宗门：青云、玄霄、炼器阁 ...
- 三大世俗王朝：大乾、北凉、南楚
- 边荒：兽潮 / 古战场

## 4. 力量等级（详见 powers.md）
炼气 → 筑基 → 金丹 → 元婴 → 化神

## 5. 物理规则
- 灵气稀薄：日均吸纳量 = 上古 1/100。
- 法宝退化：上古法宝几乎全失效。
- 解析悖论：直接解析他人功法会反噬。

## 6. 信息边界
- 主角不知道：末法的真正原因（藏在 100+ 章）
- 主角误解：以为残卷是宗门遗物，实则来自上古某位失败者
```

### JSON（机器可读，给 quality-auditor 用）

```json
{
  "schema_version": "1.0",
  "asset_type": "worldview",
  "asset_id": "worldview-main",
  "version": 2,
  "data": {
    "era": "末法纪元",
    "year_anchor": 500,
    "factions": [
      {"id": "qingyun", "name": "青云宗", "type": "sect", "stance": "neutral"},
      {"id": "xuanxiao", "name": "玄霄宗", "type": "sect", "stance": "antagonist"}
    ],
    "regions": [
      {"id": "central", "name": "中州", "controlled_by": "九大宗门"}
    ],
    "physical_rules": [
      "灵气稀薄：日均吸纳量为上古 1%",
      "法宝退化：上古法宝几乎全失效"
    ],
    "info_boundaries": {
      "protagonist_unknown": ["末法真因", "残卷来源"],
      "protagonist_misknown": ["残卷是宗门遗物（实际来自上古失败者）"]
    }
  }
}
```

---

## 6. 资产 #4：金手指 `world/cheat-system.md` + `.json` 【中文网文核心差异化】

```markdown
---
asset_type: cheat-system
asset_id: cheat-tiangong-canjuan
version: 3
maintained_by: novel-worldforge
---

# 金手指：天工残卷

## 1. 一句话定义
可解析任何接触过的功法 / 法宝 / 灵植 / 气息，输出"原理 + 缺陷 + 优化方向"。

## 2. 触发条件
- 必须**亲自接触**目标对象（看到、摸到、闻到）。
- 解析需消耗精神力（按目标复杂度梯度）。
- 主角境界越高，能解析的对象上限越高。

## 3. 输出形式
浮现在脑海里的一段三层文字：
- 原理（描述其运作机制）
- 缺陷（找到漏洞）
- 优化方向（如何改进 / 反制）

## 4. 升级阶梯
- 第 1 阶（前 30 章）：只能解析炼气 / 筑基功法
- 第 2 阶（30-100 章）：可解析金丹期，但需消耗 3 倍精神力
- 第 3 阶（100-300 章）：可解析元婴 / 上古残卷
- 第 4 阶（300+ 章）：可主动改写 / 创造功法

## 5. 限制 / 代价（必须有）
- 精神力消耗：高频解析会昏迷
- 反噬条件：解析"血脉禁制"或"心魔功法"会被反向解析
- 时间冷却：同一目标 24 小时内只能解析一次

## 6. 与剧情的关系（爽点节拍）
- 第 1 章：解析出师兄功法漏洞，挫败欺凌
- 第 5 章：解析出禁地灵草用法，赚到第一桶金
- 第 15 章：解析出长老的心魔功法，绝境翻盘
- 第 30 章：触发第一次反噬，险些昏迷

## 7. 反例（避免破坏体系的写法）
- ❌ 主角随意解析任何东西不付代价
- ❌ 解析结果直接给出全部信息（必须分阶段揭示）
- ❌ 出现矛盾的解析能力（境界不到却能解析高阶）
```

```json
{
  "asset_type": "cheat-system",
  "asset_id": "cheat-tiangong-canjuan",
  "version": 3,
  "data": {
    "name": "天工残卷",
    "type": "analyzer",
    "trigger": ["physical-contact"],
    "cost": {
      "primary": "spiritual-power",
      "scaling": "complexity-tiered"
    },
    "stages": [
      {"tier": 1, "chapter_range": [1, 30], "cap": "qi-condensation+foundation"},
      {"tier": 2, "chapter_range": [30, 100], "cap": "golden-core", "extra_cost": "3x"},
      {"tier": 3, "chapter_range": [100, 300], "cap": "nascent-soul"},
      {"tier": 4, "chapter_range": [300, null], "cap": "creation", "modes": ["rewrite", "create"]}
    ],
    "limits": [
      "spirit-fatigue-coma",
      "blood-seal-backlash",
      "24h-cooldown-per-target"
    ],
    "beats": [
      {"chapter": 1, "event": "解析师兄功法漏洞", "type": "satisfy"},
      {"chapter": 5, "event": "解析禁地灵草", "type": "windfall"},
      {"chapter": 15, "event": "解析长老心魔功法", "type": "comeback"},
      {"chapter": 30, "event": "首次反噬昏迷", "type": "cost-reveal"}
    ]
  }
}
```

**为什么金手指必须独立资产 + JSON 化？**

因为它是**爽点节拍的物理基础**。quality-auditor 在审稿时会校验：
- 主角是否在境界不到时使用了高阶能力？
- 解析消耗是否被忽略？
- 是否长期没有给金手指设代价（导致龙傲天）？

没有结构化数据这些校验做不了。

---

## 7. 资产 #5：角色 / 人设

### `characters/_index.json`

```json
{
  "schema_version": "1.0",
  "asset_type": "character-index",
  "version": 8,
  "data": {
    "protagonist": [
      {"id": "protagonist-lin-jin", "name": "林烬", "file": "protagonist-lin-jin.md", "first_appear_chapter": 1}
    ],
    "antagonists": [
      {"id": "antagonist-zhao-tianxiao", "name": "赵天霄", "file": "antagonists/antagonist-zhao-tianxiao.md", "first_appear_chapter": 1, "tier": "early"}
    ],
    "supporting": [
      {"id": "supporting-shitai-yu-qing", "name": "玉清师太", "file": "supporting/supporting-shitai-yu-qing.md", "first_appear_chapter": 3}
    ],
    "minor": []
  }
}
```

### 单个角色文件 `characters/protagonist-lin-jin.md`

```markdown
---
asset_type: character
asset_id: protagonist-lin-jin
character_role: protagonist
version: 5
maintained_by: novel-character-atelier
---

# 林烬 · 主角人设

## 1. 一句话画像
现代研究生穿越成宗门最末等弟子，自卑、被欺、但有耐心和分析力。

## 2. 基础档案
- 年龄：原身 16 岁 / 穿越者 25 岁
- 出身：青云宗外门洒扫弟子
- 外貌：清瘦、眼神温和、左眉有疤（被欺凌留下）

## 3. 性格内核（不可被剧情打破）
- **核心驱动**：想活下去 + 想知道残卷的来源
- **决策模式**：先观察后行动、不轻易暴露底牌
- **情绪锚点**：对师妹苏婉柔有保护欲，对欺凌过他的人不主动报复但也不原谅

## 4. 能力与成长
- 起点：炼气一层（被压制）
- 第 1 卷末：炼气七层（解析出基础功法漏洞）
- 第 3 卷末：筑基中期

## 5. 标志性细节（每次出场可用）
- 习惯把残卷贴身藏在胸口（紧张时会摸一下）
- 说话前会停顿半秒（思考型）
- 不喝酒，反感烟味（穿越前后习惯延续）

## 6. 关系网（详见 relationships.md）
- 苏婉柔（师妹，朦胧情线）
- 赵天霄（同门反派，仇人）
- 玉清师太（外门管事，半师半敌）

## 7. 弧光设计
- 第 1 卷：从受害者到反击者
- 第 3 卷：从被动求生到主动求知
- 第 8 卷：从个人复仇到接受残卷使命

## 8. 禁止写法
- ❌ 突然变成口出狂言的少年豪侠
- ❌ 对苏婉柔产生 OOC 的强烈占有欲
- ❌ 忽然失去观察分析的习惯
```

`characters/relationships.md` 维护关系网（无向图，谁认识谁、关系强度 / 类型）。

---

## 8. 资产 #6：大纲（三级）

### 8.1 总纲 `outline/master.md`

整本书的主线骨架，按"卷"切分。

```markdown
---
asset_type: outline-master
version: 3
maintained_by: novel-outline-architect
---

# 总纲：吞天魔帝

## 主题驱动
末法时代下"个体如何重新接入失落的力量真相"。

## 主线五幕
1. 觉醒（卷 1-2）：得到残卷，立足宗门
2. 离巢（卷 3-4）：脱离宗门，看到末法世界全貌
3. 真相边缘（卷 5-7）：触碰末法成因，被各方追杀
4. 决断（卷 8-10）：与上古失败者建立联系
5. 吞天（卷 11-12）：重启灵气纪元

## 卷列表
- 第 1 卷《残卷初鸣》：1-50 章
- 第 2 卷《外门风云》：51-100 章
- ...

## 长期伏笔（在 `memory/pending_hooks.json` 镜像）
- 残卷的真正主人（卷 5 末段揭示前置线索）
- 苏婉柔的母亲是宗门二长老
- 末法成因（卷 7 揭示）
```

### 8.2 卷纲（细纲） `outline/volumes/volume-01.md`

每卷一份，30-50 章节奏图。

```markdown
---
asset_type: outline-volume
volume_no: 1
chapter_range: [1, 50]
version: 2
maintained_by: novel-outline-architect
---

# 第 1 卷《残卷初鸣》卷纲

## 卷主题
废柴林烬靠残卷在宗门站稳脚跟，识破第一个阴谋。

## 卷高潮
第 45 章：在祭祀大典上当众解析长老的禁忌功法，获得长老死敌的庇护。

## 节奏分段（5 段式）
- 起（1-10 章）：得卷、藏卷、试卷
- 承（11-20 章）：用卷反击师兄、立足外门
- 转（21-30 章）：被卷入更大的阴谋、第一次反噬
- 合（31-44 章）：调查阴谋、收集证据、与师太半结盟
- 高潮（45-50 章）：祭祀大典翻盘、卷末钩子（残卷露出第二段封印）

## 必须出现的桥段
- 残卷第一次解析：第 2 章
- 第一次反杀（小怪）：第 5 章
- 第一次反噬（昏迷）：第 28 章
- 师妹救场：第 33 章
- 大典翻盘：第 45 章

## 卷末钩子（给下一卷）
残卷第二段封印浮现，提到"中州之外"
```

### 8.3 章纲（章节细纲） `outline/chapters/chapter-0001.md`

每章一份。这是 `chapter-writer` 的**唯一直接输入**。

```markdown
---
asset_type: outline-chapter
chapter_no: 1
volume_no: 1
target_words: 3500
version: 1
maintained_by: novel-outline-architect
status: approved
---

# 第 1 章 · 残卷

## 1. 一句话目标
林烬在山涧捡到一块"会让脑袋发烫"的玉简，在被欺凌后独自破解出第一行字。

## 2. 必出场角色
- 林烬（POV）
- 赵天霄（欺凌方）
- 路过的师妹苏婉柔（一句话照面）

## 3. 必发生事件（按顺序）
1. 林烬被赵天霄当众罚跪、抢走月例
2. 黄昏独自下山取水，山涧里捡到玉简
3. 玉简贴身后头脑发烫，浮现"天工"二字
4. 夜里偷偷研究，识出"解析"二字
5. 试着对身边的杂草发动解析，得到"野生灵草·百年缚地芸"的判定

## 4. 钩子（mustOpen / mustClose）
- mustOpen：玉简会发烫的真正原因
- mustOpen：苏婉柔为什么对林烬有微妙的情绪
- mustClose：本章不收（卷末才收）

## 5. 爽点节拍
- 第一次解析成功的轻微"原来如此"快感（不要过度）

## 6. 情绪曲线
压抑（被欺凌）→ 麻木（独自取水）→ 微光（玉简发烫）→ 谨慎兴奋（解析成功）

## 7. 字数 / 节奏
- 总字数：3500 字（±15%）
- 对话占比：约 25%（第 1 章对白少正常，主角独处为主）
- 段落节奏：手机阅读，2-4 句一段

## 8. 不写
- ❌ 直接揭示残卷来源
- ❌ 让主角在第 1 章就立 flag 说要"踏破苍穹"
- ❌ 写苏婉柔的内心戏（她只是一句话照面）

## 9. 与状态的耦合
- 写完后，`memory/particle_ledger.json` 应增加：玉简（状态：贴身藏匿）、月例（被赵天霄抢走）
- 写完后，`memory/pending_hooks.json` 应增加：玉简发烫之谜、苏婉柔的微妙情绪
```

> 章纲是 chapter-writer 的硬契约。写正文时如果章纲缺字段，应先回到 outline-architect 补齐，不应让 writer 凭空发挥。

---

## 9. 资产 #7：正文 `chapters/chapter-NNNN.md`

```markdown
---
asset_type: chapter
chapter_no: 1
volume_no: 1
title: 残卷
status: draft       # draft / revised / approved
version: 1
word_count: 3487
written_at: 2026-05-24T15:30:00Z
maintained_by: novel-chapter-writer
audit_score: null   # 写完审稿后回填
---

# 第 1 章 · 残卷

林烬第三次跪下时，膝盖底下那块青石已经磨得温热。

赵天霄的影子横在他面前，鞋尖踩着他的手背，慢慢加力。"听说你这个月只领了七两银子？"

...
```

写完之后，`quality-auditor` 会更新 `audit_score`、并把摘要 / 状态变更同步到 `memory/`。

---

## 10. 资产 #8：长期记忆（真相文件）

8 类长期记忆文件，住在 `memory/` 下。每个都同时有 `.json`（权威源）和 `.md`（人类可读投影）。

| 文件 | 含义 |
|------|------|
| `current_state` | 当前世界状态：角色位置、关系、已知信息 |
| `particle_ledger` | 物品 / 资源账本（金手指消耗也记在这） |
| `pending_hooks` | 未闭合伏笔与"对读者的承诺" |
| `chapter_summaries` | 每章 1 段摘要 |
| `subplot_board` | 支线进度板（A/B/C 线） |
| `emotional_arcs` | 情感弧线（按角色） |
| `character_matrix` | 角色交互矩阵（谁见过谁、知道什么） |
| `vault_index` | 素材库索引（asset-vault 维护） |

详细 schema 见 [`03-memory-and-vault.md`](./03-memory-and-vault.md)。

---

## 11. 资产 #9：参考素材 `vault/`

```
vault/
├── inspirations/                  # 灵感卡：脑洞 / 设定碎片
│   ├── insp-f3a92e1c.md
│   └── insp-7b21c4e9.md
├── snippets/                      # 桥段 / 金句 / 段落级素材
│   ├── snip-2a91ef03.md
│   └── snip-c4d8b2f1.md
├── references/                    # 参考作品片段（注明出处）
│   ├── ref-qidian-douluo-001.md
│   └── ref-fanqie-jin-li-002.md
├── style-fingerprints/            # 风格指纹（chapter-writer 引用）
│   └── style-cangtian-bagua.json
└── _index.json                    # 全部素材索引（标签 + 摘要）
```

### 单卡示例 `vault/snippets/snip-2a91ef03.md`

```markdown
---
asset_type: vault-card
card_type: snippet
card_id: snip-2a91ef03
tags: [打斗, 一招制敌, 短句快剪]
source: original | reference
source_meta: { author: "x某", url: "..." }   # reference 时填
created_at: 2026-05-20T10:00:00Z
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
- 改造方向：把"剑没出鞘"换成你书里的功法名
- 不要用在：双方境界差距小的对决（违和）

## 标签
打斗, 一招制敌, 短句快剪, 描写示范
```

---

## 12. 资产之间的依赖关系（写作顺序）

```
                  ┌─────────────────────┐
                  │   blueprint.md      │
                  │   (开书最高契约)     │
                  └────────┬────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ world/worldview  │    │ characters/*     │
    │ world/cheat-     │◄───│ (引用世界观)     │
    │   system         │    └──────────────────┘
    └────────┬─────────┘             │
             │                       │
             └────────┬──────────────┘
                      ▼
              ┌──────────────────┐
              │ outline/master   │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ outline/volumes/ │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ outline/chapters │ ◄──── vault/snippets, vault/style-fingerprints
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ chapters/        │ ◄──── memory/* (写前注入)
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │ memory/* update  │ ◄──── (写后沉淀，由 quality-auditor)
              └──────────────────┘
```

**关键约束**：

- 没有 `blueprint.md` 不能开始 `world/`、`characters/`、`outline/`。
- 没有完整 `world/cheat-system.md` 不能写 `outline/chapters/*`（因为爽点节拍依赖金手指节拍）。
- 没有 `outline/chapters/chapter-NNNN.md` 不能写 `chapters/chapter-NNNN.md`。
- 写完 `chapters/chapter-NNNN.md` 必须更新 `memory/*`。

各 skill 在 SKILL.md 里都会显式声明上游依赖与下游产物，避免乱序。

---

## 13. 一致性校验责任划分

| 校验类型 | 由谁负责 |
|---------|---------|
| 蓝图 → 大纲一致性 | `outline-architect` 在写大纲前 read blueprint |
| 大纲 → 章纲一致性 | `outline-architect` 自校验 |
| 章纲 → 正文一致性 | `chapter-writer` 写时遵守，`quality-auditor` 审稿时复核 |
| 正文 → memory 一致性 | `quality-auditor` 写后更新 |
| 角色 OOC | `quality-auditor` 33 维度之一 |
| 金手指消耗 / 境界匹配 | `quality-auditor` 专项维度 |
| 文风 / 反 AI 味 | `chapter-writer` 写时控制，`quality-auditor` 写后检测 |

---

## 14. 模板（templates/）

`templates/` 目录提供可复制的资产骨架，被各 skill 引用：

```
templates/
├── novel.json                # #1 项目元数据骨架
├── blueprint.md              # #2 蓝图骨架
├── worldview.md              # #3 世界观骨架
├── cheat-system.md           # #4 金手指骨架（含中文网文常见 7 大类）
├── character.md              # #5 角色卡骨架
├── outline-master.md         # #6.1 总纲骨架
├── outline-volume.md         # #6.2 卷纲骨架
├── outline-chapter.md        # #6.3 章纲骨架
├── chapter.md                # #7 正文骨架
├── memory-current-state.md   # #8 真相文件骨架样例
└── vault-card.md             # #9 素材卡骨架
```

> v1 第一版 skills 落地后会在第二轮迭代中补齐 templates 全部内容。第一版 skills 内嵌足够的骨架示例，开发者可以直接照抄。

---

## 15. 与 inkos truth file 的对位

为了让从 inkos 迁移过来的项目零成本兼容：

| inkos 真相文件 | Novel Studio 路径 | 兼容性 |
|----------------|---------------------|--------|
| `current_state.md` | `memory/current_state.md` | ✅ 同名同义 |
| `particle_ledger.md` | `memory/particle_ledger.md` | ✅ 同名同义 |
| `pending_hooks.md` | `memory/pending_hooks.md` | ✅ 同名同义 |
| `chapter_summaries.md` | `memory/chapter_summaries.md` | ✅ 同名同义 |
| `subplot_board.md` | `memory/subplot_board.md` | ✅ 同名同义 |
| `emotional_arcs.md` | `memory/emotional_arcs.md` | ✅ 同名同义 |
| `character_matrix.md` | `memory/character_matrix.md` | ✅ 同名同义 |
| `story/state/*.json` | `memory/*.json` | ✅ 同 schema 思路 |
| `story/author_intent.md` | `blueprint.md` 第 10 节"长期意图" | 合并 |
| `story/current_focus.md` | 暂不引入（v1 简化） | — |
| `story/runtime/chapter-XXXX.intent.md` | `outline/chapters/chapter-NNNN.md` 中包含 | 合并 |

---

下一节：[`02-pipeline-architecture.md`](./02-pipeline-architecture.md) 讲多 Agent 协作流水线。

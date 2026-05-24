---
name: novel-character-atelier
description: 用于设计角色与人设的 skill。当用户说"捏个主角 / 设计反派 / 这个 NPC 怎么写 / 角色卡 / 人设 / 关系网 / 配角 / 师妹 / 师傅 / 红颜 / 兄弟 / 反派 / 给主角加个对手"时使用。需要 blueprint.md 与 world/worldview.md、world/cheat-system.md、world/powers.md 已就绪。产出 characters/<role>-<slug>.md（每个角色一份卡）、characters/relationships.md（关系网）、characters/_index.json（索引）。一开书只先写主角 + 1-3 个反派 + 1-2 个核心配角，剩余按需补。每张角色卡包含 8 个字段：一句话画像 / 基础档案 / 性格内核（不可被剧情打破）/ 能力与成长 / 标志性细节 / 关系网 / 弧光设计 / 禁止写法。完成后由 outline-architect 接手写大纲。
version: 0.1.0
maintained_by: novel-studio
depends_on:
  upstream_skills: [novel-blueprint, novel-worldforge]
  upstream_assets: [blueprint.md, world/worldview.md, world/cheat-system.md, world/powers.md]
  downstream_skills: [novel-outline-architect, novel-chapter-writer]
  downstream_assets: [characters/*.md, characters/_index.json, characters/relationships.md]
  external_capabilities: [llm]
soft_depends_on:
  upstream_assets: [vault/inspirations/, vault/snippets/]
---

# Novel Character Atelier · 角色 + 人设

把 blueprint 第 3 节"主角一句话画像"展开成可写正文的角色卡，并设计反派、配角、关系网。

⚠️ 角色不是 NPC 表格。角色卡的目标是"chapter-writer 在写每一章时，能从这张卡里查到主角下一秒会怎么反应"。

⚠️ 中文网文最容易翻车的两个地方：①主角 OOC（突然性格变了）②反派纸片化（只有立 flag 没有动机）。这个 skill 的设计就是防这两件事。

---

## 1. 何时使用 / 何时不要使用

✅ 使用：
- worldforge 完成后第一次捏角色
- 用户说"加个新角色 / 反派 / 配角"
- 用户想改某个角色的设定（"主角性格再内敛一点 / 反派加个动机"）
- 写到某章时发现某个 NPC 没卡（一个有名字 + 有出场 ≥ 2 章的 NPC 应有卡）

❌ 不要使用：
- 写大纲 → `novel-outline-architect`
- 在章节正文里描写角色外貌 / 服饰 → `novel-chapter-writer`
- 修改角色与情节的关系（关系是关系网，但情节进度由大纲管） → `novel-outline-architect`
- 没有 world → 先回 `novel-worldforge`

---

## 2. 输入与输出契约

### 输入（必需）
- `blueprint.md`（status: approved）
- `world/worldview.md`（势力 / 立场清单）
- `world/cheat-system.md`（金手指）
- `world/powers.md`（境界曲线）

### 输入（可选）
- `vault/inspirations/`（角色原型灵感）
- `vault/snippets/`（性格 / 对话示范桥段）
- `characters/_index.json`（已有角色，用于关系网衔接）

### 输出
- `characters/protagonist-<slug>.md`（主角）
- `characters/antagonists/antagonist-<slug>.md`（反派们）
- `characters/supporting/supporting-<slug>.md`（配角们）
- `characters/relationships.md`（关系网）
- `characters/_index.json`（索引）

---

## 3. 角色三层结构

按"主角 → 反派 → 配角"的顺序设计。**主角必须最先且最详细**。

### 3.1 主角（protagonist）

唯一性：每本书只有 1 个主角（双男主 / 双女主算 2 个主角）。

#### 信息密度要求（最详细）

8 个字段全部要有，且每个字段至少 50 字。

#### 关键约束

- **性格内核（第 3 字段）一旦确定，全书不可破**。性格可以演化（弧光），但内核（最深的渴望 / 最深的恐惧 / 决策模式）不能被剧情倒置。
- **境界曲线（第 4 字段）必须与 powers.json.protagonist_curve 严格一致**。
- **标志性细节（第 5 字段）至少 3 个**，每个细节是"读者记得住的小动作 / 习惯 / 物件"。

### 3.2 反派（antagonist）

按层级设计：

| 层级 | 章节区间 | 数量建议 |
|------|---------|---------|
| early（早期 / 杂兵反派） | 前 30 章 | 1-2 个（如同门欺凌者） |
| mid（中期反派 boss） | 30-200 章 | 2-3 个（如长老 / 敌对宗门首席） |
| late（后期 / 真 boss） | 200+ 章 | 1-2 个（卷末 / 全书 boss） |
| meta（背后操盘者） | 全书 | 0-1 个（最终反派，不到位关键节点不出场） |

**第一次只先做 early 反派**（前 30 章会出现的）。mid / late 等到接近时再补。

#### 关键约束

- **反派必须有动机**：不能只写"他想杀主角"，要写"为什么他想杀主角，他自己的目标是什么"。
- **反派也要有性格内核**：审稿会校验反派 OOC，但允许范围比主角宽。
- **反派的能力 / 立场要写到 worldview 的 factions 里**：如果反派属于某个势力，必须先去 worldforge 加这个势力。

### 3.3 配角（supporting）

包括师妹 / 师傅 / 兄弟 / 红颜 / 任务委托人等。

#### 配角分级

- **核心配角**（弧光重要，全书出场 ≥ 50 章）：信息密度同主角的 80%
- **重要配角**（弧光中等，出场 20-50 章）：信息密度 50%
- **普通配角**（功能位，出场 < 20 章）：信息密度 30%（只填 1-3 字段）
- **路人**（出场 < 5 章 / 不重要）：**不需要**写卡。在章纲里临时定即可。

#### 第一次只先做核心 + 重要配角

按 blueprint 第 5 节的钩子推断需要的角色：
- 比如"第 1 章被欺凌"→ 需要欺凌者（早期反派）
- 比如"第 33 章师妹救场"→ 需要师妹（核心配角）
- 比如"第 15 章长老阴谋翻盘"→ 需要长老（中期反派，但因为靠近前 30 章，可以提前做）

---

## 4. 工作流

### 工作流 A：完整初次设计（捏前 5-7 个角色）

#### A.1 清点需要哪些角色

读 `blueprint.md` 第 5 节钩子，列出前 30 章会出现的角色：

```
基于钩子：
- 第 1 章：被欺凌的废柴林烬 → 主角林烬 + 欺凌者赵天霄
- 第 5 章前：解析功法反杀师兄 → 师兄（可能与赵天霄合并）
- 第 15 章前：识破宗门长老阴谋 → 长老反派
- 第 30 章前：踏入宗门核心，残卷露出 → 接触核心人物，可能引入师太 / 师叔
- blueprint 第 3 节"师徒情线"→ 师妹苏婉柔（核心配角）
- 长期"对师傅有保护欲" → 师太玉清（重要配角）

合计 5-6 个：
1 主角 + 1-2 早期反派 + 1 中期反派 + 1 核心配角（师妹）+ 1 重要配角（师太）
```

明确告知用户清单，让用户确认增减。

#### A.2 先捏主角

按 8 字段顺序填，每个字段先给候选让用户确认。

##### 字段 1：一句话画像

模板：`<现实身份>` + `<出身 / 起点>` + `<性格关键词 1-2 个>` + `<最深的渴望或恐惧>`

例：现代研究生穿越成宗门最末等弟子林烬，自卑、被欺，但有耐心和分析力，最深的渴望是"被看见"。

##### 字段 2：基础档案

- 年龄（穿越 / 重生书要分原身和现代）
- 出身（家境 / 家人状况）
- 外貌（3-5 个特征，至少 1 个是"标志性"——例：左眉有疤）
- 服饰风格

##### 字段 3：性格内核（不可被剧情打破）

3 个子字段：

- **核心驱动**：最深的渴望 / 最深的恐惧（1-2 句）
- **决策模式**：遇事先怎么做（观察 / 直觉 / 询问 / 试探 / 硬刚）
- **情绪锚点**：哪几类事会让他失控（被人轻视 / 看到弱者被欺 / ...）

例（吞天魔帝林烬）：
- 核心驱动：想活下去 + 想知道残卷的来源（求知欲）
- 决策模式：先观察后行动、不轻易暴露底牌
- 情绪锚点：对师妹苏婉柔有保护欲；对欺凌过他的人不主动报复但也不原谅

⚠️ **后续 chapter-writer 会引用这 3 条**。例：写到主角面对挑衅时，必须先观察再反应（决策模式）；不能突然暴怒（情绪锚点没说会暴怒）。

##### 字段 4：能力与成长

引用 `world/powers.json.protagonist_curve`，复制到这个字段：

```
- 第 1 章：炼气一层（被压制）
- 第 30 章：炼气七层（解出师兄漏洞反杀）
- ...
- 第 800 章：化神 → 残卷消失
```

⚠️ 与 powers.json 严格一致，不能在角色卡里改境界。

##### 字段 5：标志性细节

至少 3 个**读者记得住的小动作 / 习惯 / 物件**。

例（吞天魔帝林烬）：
- 习惯把残卷贴身藏在胸口（紧张时会摸一下）
- 说话前会停顿半秒（思考型）
- 不喝酒，反感烟味（穿越前后习惯延续）

⚠️ 这些细节是反 AI 味的关键。每章正文必须自然出现 1-2 个，让角色"活"。

##### 字段 6：关系网（一句话指针）

只写"主角与谁有什么关系"，详细在 `relationships.md`。

例：
- 苏婉柔（师妹，朦胧情线）
- 赵天霄（同门反派，仇人）
- 玉清师太（外门管事，半师半敌）

##### 字段 7：弧光设计

按卷划分情感 / 认知 / 立场的演变。

例：
- 第 1 卷：从受害者到反击者（被动 → 主动）
- 第 3 卷：从被动求生到主动求知（求生 → 求真）
- 第 8 卷：从个人复仇到接受残卷使命（小我 → 大我）

⚠️ 弧光是渐变，不是突变。chapter-writer 不能让主角在某一章突然"想通了"。

##### 字段 8：禁止写法

明确不能让主角做什么。

例：
- ❌ 突然变成口出狂言的少年豪侠
- ❌ 对苏婉柔产生 OOC 的强烈占有欲
- ❌ 忽然失去观察分析的习惯
- ❌ 在 50 章前能解析金丹功法（违反 cheat-system tier）

#### A.3 写早期反派

8 字段同上，但内容更紧凑（每个字段 30 字+）。

##### 关键差异

- **字段 3 性格内核要写"反派为什么是反派"**：他自己的目标是什么。不能只写"嫉妒主角"。
- **字段 7 弧光设计**：反派也有弧光，但典型是"自我膨胀 → 被打脸 → 转化 / 死亡 / 出局"。

#### A.4 写核心配角（师妹 / 师傅）

8 字段同主角，但弧光设计可以简化。

#### A.5 写关系网 relationships.md

```markdown
---
asset_type: characters-relationships
version: 1
---

# 关系网

## 主角圈

- **林烬 ↔ 苏婉柔**：朦胧情线
  - 第 1 章：苏婉柔同情林烬被罚（旁观者视角）
  - 第 12 章：苏婉柔察觉林烬实力变化，好奇
  - 第 33 章：苏婉柔暗中救场（情感推进）
  - 第 50 章前：互相承认对方在自己心里

- **林烬 ↔ 赵天霄**：仇人
  - 第 1 章：赵天霄欺凌林烬
  - 第 5 章：林烬反杀赵天霄（小胜）
  - 第 22 章：赵天霄被揭露是玄霄宗内应
  - 第 30 章：赵天霄逃 / 死

## 反派圈

- **赵天霄 ↔ 玄霄宗某长老**：上下级 + 利用关系
- ...

## 配角圈

- **苏婉柔 ↔ 玉清师太**：师徒（隐藏：母女？暂列疑问）
- ...
```

#### A.6 写 _index.json

```json
{
  "schema_version": "1.0",
  "asset_type": "character-index",
  "version": 1,
  "data": {
    "protagonist": [
      {"id": "protagonist-lin-jin", "name": "林烬", "file": "protagonist-lin-jin.md", "first_appear_chapter": 1}
    ],
    "antagonists": [
      {"id": "antagonist-zhao-tianxiao", "name": "赵天霄", "file": "antagonists/antagonist-zhao-tianxiao.md", "first_appear_chapter": 1, "tier": "early"}
    ],
    "supporting": [
      {"id": "supporting-su-wanrou", "name": "苏婉柔", "file": "supporting/supporting-su-wanrou.md", "first_appear_chapter": 1, "tier": "core"},
      {"id": "supporting-shitai-yu-qing", "name": "玉清师太", "file": "supporting/supporting-shitai-yu-qing.md", "first_appear_chapter": 3, "tier": "important"}
    ],
    "minor": []
  }
}
```

### 工作流 B：增量补角色

触发：用户在写大纲 / 写章节时发现需要新角色。

#### B.1 判断角色等级

问用户：

- 出场章节区间？
- 出场频率？（< 5 章 / 5-20 章 / 20-50 章 / > 50 章）
- 决定弧光重要性？

按区间映射 tier：minor / important / core / antagonist。

#### B.2 按 tier 决定信息密度

- minor：不建卡，只在章纲里临时定即可
- important / core / antagonist：按工作流 A 的字段填，密度按 tier 调整

#### B.3 更新 _index.json + relationships.md

⚠️ 不要忘记更新关系网，特别是与已有角色的关系。

### 工作流 C：修订角色

触发：用户说"主角性格再内敛一点 / 反派改个动机"。

#### C.1 谨慎警告

如果是改性格内核（字段 3），警告：这会影响所有已写章节的合理性。

#### C.2 影响扫描

- 列出已写章节中提到该角色的章节
- 询问用户："改完后这些章是否需要 revise？"

#### C.3 更新

更新角色卡的对应字段，version + 1。

### 工作流 D：从素材激发角色

触发：用户没思路，说"给我几个反派候选"。

步骤：

1. 读 `vault/inspirations/`，按 tag `角色` / `反派` / `配角` 筛选
2. 给 4-6 个差异化反派候选（按"动机轴 / 立场轴 / 与主角关系轴"）
3. 让用户挑

---

## 5. 关键规则

### R1：性格内核不可破

字段 3 一旦 approved，全书不能让该角色违背。chapter-writer 会引用，quality-auditor 会校验"OOC"。修改性格内核需要走工作流 C 并明确影响范围。

### R2：境界曲线对齐 powers.json

主角 / 反派的境界进度必须与 `world/powers.json` 一致。不能在角色卡里写"主角第 100 章金丹"而 powers.json 写"第 300 章金丹"。

### R3：标志性细节 ≥ 3 个

每个核心角色（主角 / 核心反派 / 核心配角）字段 5 至少 3 个标志性细节。

### R4：禁止写法明确列出

字段 8 是给 chapter-writer 的"硬墙"。要列具体禁忌，不能只写"不要 OOC"这种空话。

### R5：关系网必同步更新

每加一个角色或改一个角色，relationships.md 与 _index.json 必同步。

### R6：先少后多

第一次只捏 5-7 个角色（主 + 早期反派 + 中期反派 + 核心配角 1-2 个）。**不要一次列 20 个 NPC**。后续按需补。

### R7：不替用户决定角色名

中文网文角色名是个文化敏感点。**让用户决定姓名**。AI 可以给候选，但默认不擅自给取名。

---

## 6. 与其他 skill 的协作

### 上游
- `novel-blueprint`：blueprint 第 3 节主角画像 + 第 5 节钩子 → 推断需要哪些角色
- `novel-worldforge`：worldview 的 factions 给角色立场，cheat-system 给主角能力，powers 给境界曲线

### 下游
- `novel-outline-architect`：拿角色卡设计章纲（"必出场角色"字段）
- `novel-chapter-writer`：写正文时 compose 阶段读相关角色卡（性格内核 / 标志性细节 / 禁止写法）
- `novel-quality-auditor`：校验 OOC、关系网穿越、境界匹配

### 旁支
- `novel-asset-vault`：可被 vault 中"角色原型"灵感激发；优秀的角色塑造可沉淀回 vault

---

## 7. 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| world/* 未就绪 | 拒绝，回到 `novel-worldforge` |
| 用户希望"AI 全自动捏 10 个角色" | 警告这违反 R6 + R7；建议先捏 5 个核心，其他按需补 |
| 用户给主角境界曲线与 powers.json 冲突 | 拒绝写入，让用户先去 worldforge 改 powers，或者改主角曲线 |
| 用户说"师妹是反派" | 允许，但要在关系网明确标注 + 在角色卡字段 3 写动机；这种"伪装反派"通常需要 mid-tier antagonist 处理 |
| 角色名重复 | 警告并自动加序号（赵天霄 / 赵天霄·二号），让用户选 |
| 角色性格内核与 blueprint 第 3 节不一致 | 拒绝，提示用户先改 blueprint |

---

## 8. 示例对话（吞天魔帝捏角色）

```
用户：worldforge 完成了，开始捏角色。

atelier：好。基于你 blueprint 第 5 节钩子和 world，前 30 章需要这些角色：
        
        1. 主角 林烬（必有）
        2. 早期反派 赵天霄（第 1 章欺凌者，第 22 章揭露内应）
        3. 中期反派 玄霄宗某长老（第 15 章阴谋）
        4. 核心配角 苏婉柔（师妹，朦胧情线）
        5. 重要配角 玉清师太（外门管事，第 3 章首次出场）
        
        共 5 个。要加吗？比如要不要加个室友 / 兄弟？

用户：先这 5 个。开始。

atelier：先捏主角林烬。从 blueprint 第 3 节出发：
        
        > 现代研究生穿越成宗门最末等弟子林烬，自卑、被欺，但有耐心和分析力。
        
        我把它扩成 8 字段。第 1 字段一句话画像，加一个"最深的渴望"：
        
        > 现代研究生穿越成宗门最末等弟子林烬，自卑、被欺，但有耐心和分析力，最深的渴望是"被看见"。
        
        ok？

用户：ok，但加一句"对穿越前的世界还有牵挂"。

atelier：[更新]
        字段 2 基础档案：
        - 年龄：原身 16 岁 / 穿越者 25 岁
        - 出身：青云宗外门洒扫弟子（祖籍待定）
        - 外貌：清瘦、眼神温和、左眉有疤（被欺凌留下）
        
        左眉的疤是个标志性细节，可以？

用户：可以。加一个"右手食指有薄茧（前世写代码留下）"。

atelier：[加]
        字段 3 性格内核（关键，全书不可破）：
        - 核心驱动：想活下去 + 想知道残卷的来源（求知欲）
        - 决策模式：先观察后行动、不轻易暴露底牌
        - 情绪锚点：对师妹苏婉柔有保护欲；对欺凌过他的人不主动报复但也不原谅
        
        加个"对穿越前世界的牵挂触发情绪"如何？

用户：好，加一句"看到电子产品 / 现代物会怔住"。

atelier：[加] 内核就位。⚠️ 这 3 条之后 chapter-writer 写正文会严格遵守，
       请确认 status 是否要 approved。

用户：approved。

atelier：字段 4 能力与成长，从 powers.json.protagonist_curve 复制：
        - 第 1 章：炼气一层（被欺凌）
        - 第 30 章：炼气七层（解出师兄漏洞反杀）
        - 第 50 章末：炼气九层（祭祀大典翻盘）
        - ... [全部复制]
        
        与 powers 一致，可以？

用户：可以。

atelier：字段 5 标志性细节（≥ 3 个）：
        1. 习惯把残卷贴身藏在胸口（紧张时会摸一下）
        2. 说话前会停顿半秒（思考型）
        3. 不喝酒，反感烟味（穿越前后习惯延续）
        4. 看到电子产品 / 现代物会怔住（第 3 段加的）
        5. 右手食指薄茧（外貌延续）
        
        5 个。够了？

用户：够。

atelier：字段 6 关系网指针：
        - 苏婉柔（师妹，朦胧情线）
        - 赵天霄（同门反派，仇人）
        - 玉清师太（外门管事，半师半敌）
        
        字段 7 弧光设计：
        - 第 1 卷：从受害者到反击者
        - 第 3 卷：从被动求生到主动求知
        - 第 8 卷：从个人复仇到接受残卷使命
        
        字段 8 禁止写法：
        - ❌ 突然变成口出狂言的少年豪侠
        - ❌ 对苏婉柔产生 OOC 的强烈占有欲
        - ❌ 忽然失去观察分析的习惯
        - ❌ 在 50 章前能解析金丹功法（违反 cheat-system tier）
        
        要加吗？

用户：再加"❌ 不能突然背刺师妹"。

atelier：[加]
        主角林烬完成。写到 characters/protagonist-lin-jin.md。
        
        下一个：早期反派赵天霄。要继续吗？

用户：继续。

→ ... 重复直到 5 个角色完成
→ relationships.md + _index.json 同步更新
```

---

## 9. 引用文档

- 角色卡 schema：[`docs/design/01-asset-model.md`](../../docs/design/01-asset-model.md) 第 7 节
- pipeline：[`docs/design/02-pipeline-architecture.md`](../../docs/design/02-pipeline-architecture.md) 第 4 节
- OOC 校验：[`skills/novel-quality-auditor/SKILL.md`](../novel-quality-auditor/SKILL.md)
- 性格塑造素材：[`skills/novel-asset-vault/SKILL.md`](../novel-asset-vault/SKILL.md)

---
asset_type: outline-master
asset_id: outline-master
created_at: <ISO>
updated_at: <ISO>
version: 1
status: drafting
maintained_by: novel-outline-architect
---

<!--
  总纲 = 整本书的脊柱。写完几乎不动（除非 blueprint 大改）。
  详见 docs/design/01-asset-model.md 第 8.1 节、skills/novel-outline-architect/SKILL.md 第 3.1 节。
  
  落点：outline/master.md
-->

# 总纲：《<书名>》

## 主题驱动（一句话）

<!--
  整本书要回答的核心命题。
  例：末法时代下"个体如何重新接入失落的力量真相"。
-->

<填主题驱动>

## 主线 N 幕

<!--
  建议 4-6 幕，每幕对应 2-4 卷。每幕写：标题 / 卷范围 / 章范围 / 目标 / 转折。
-->

1. **<幕 1 标题>**（卷 1-2 / 第 1-100 章）
   - 目标：<幕目标>
   - 转折：<幕末转折>

2. **<幕 2 标题>**（卷 3-4 / 第 101-200 章）
   - 目标：<...>
   - 转折：<...>

3. **<幕 3 标题>**（卷 5-7 / 第 201-400 章）
   - 目标：<...>
   - 转折：<...>

4. **<幕 4 标题>**（卷 8-10 / 第 401-600 章）
   - 目标：<...>
   - 转折：<...>

5. **<幕 5 标题>**（卷 11-15 / 第 601-end 章）
   - 目标：<...>
   - 终结：<...>

## 卷列表

<!--
  estimate 即可。可以前期粗、后期细。
-->

| 卷号 | 卷名 | 章节范围 | 卷主题 |
|------|------|---------|--------|
| 1 | 《<卷名>》 | 1-50 | <一句话> |
| 2 | 《<卷名>》 | 51-100 | <一句话> |
| 3 | 《<卷名>》 | 101-150 | <一句话> |
| ... | ... | ... | ... |

## 长期伏笔

<!--
  与 memory/pending_hooks.json 中的 long-tier 伏笔镜像。
  每条标记预计兑现卷。
-->

- **<伏笔 1>**（卷 X 末段揭示前置线索 / 卷 Y 全揭示）
  - hook_id：hook-<slug>
  - planted：第 N 章
  - tier：long
  - promise_to_reader：<给读者的承诺，例：卷 5 末段揭示前置线索>

- **<伏笔 2>**
  - hook_id：hook-<slug>
  - planted：第 N 章
  - tier：long
  - promise_to_reader：<...>

- **<伏笔 3>**
  - hook_id：hook-<slug>
  - planted：第 N 章
  - tier：long
  - promise_to_reader：<...>

## 关键里程碑章节

<!--
  全书最高级的"必爆"章。chapter-writer 写到这些章节时，质量门槛会自动拉高。
-->

- **第 1 章**：<开场首屏 / 拉新>
- **第 50 章末**：<第 1 卷高潮>
- **第 100 章**：<第 2 卷高潮 + 离开宗门>
- **第 300 章**：<进入新阶段>
- **第 800 章末**：<结局>

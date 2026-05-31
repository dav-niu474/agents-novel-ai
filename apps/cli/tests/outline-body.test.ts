/**
 * Tests for the Markdown section parsing / completeness analyzers in
 * core/assets/outline.ts (the part that is NOT file IO):
 *   - parseOutlineTitle
 *   - listMissingMasterSections / listMissingVolumeSections (keyword-based)
 *   - parseChapterOutlineFields / listMissingChapterFields / isChapterOutlineComplete (R1, by number)
 *   - real example chapter-0001.md parses as a complete 9-field contract
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isChapterOutlineComplete,
  listMissingChapterFields,
  listMissingMasterSections,
  listMissingVolumeSections,
  parseChapterOutlineFields,
  parseOutlineTitle,
  readChapterOutline,
} from '@novel/core/assets/outline.js';
import { renderChapterSkeleton, renderMasterSkeleton } from '@novel/core/assets/outline-render.js';
import { repoRoot } from './helpers.js';

const FULL_CHAPTER = `# 第 1 章 · 残卷

## 1. 一句话目标
林烬被欺凌后捡到玉简，识出第一行字。

## 2. 必出场角色
- protagonist-lin-jin（POV）
- antagonist-zhao-tianxiao

## 3. 必发生事件（按顺序）
1. 被罚跪
2. 捡到玉简
3. 解析杂草

## 4. 钩子（hookOps）
- mustOpen：玉简发烫之谜

## 5. 爽点节拍
first-use，强度 low。

## 6. 情绪曲线
压抑 → 微光 → 谨慎兴奋

## 7. 字数 / 节奏
总字数 3500；对话 25%。

## 8. 不写
- 不揭示残卷来源

## 9. 与状态的耦合（写完后该更新什么）
- particle_ledger：玉简贴身藏匿
`;

describe('parseOutlineTitle', () => {
  it('returns the first H1 line', () => {
    expect(parseOutlineTitle(FULL_CHAPTER)).toBe('第 1 章 · 残卷');
  });
  it('returns empty string when no H1', () => {
    expect(parseOutlineTitle('## 只有二级标题\n内容')).toBe('');
  });
});

describe('parseChapterOutlineFields (R1)', () => {
  it('maps all 9 numbered sections by their leading number', () => {
    const f = parseChapterOutlineFields(FULL_CHAPTER);
    expect(f.goal).toContain('玉简');
    expect(f.characters).toContain('POV');
    expect(f.events).toContain('解析杂草');
    expect(f.hooks).toContain('mustOpen');
    expect(f.coolBeat).toContain('first-use');
    expect(f.emotionCurve).toContain('压抑');
    expect(f.wordsRhythm).toContain('3500');
    expect(f.doNotWrite).toContain('残卷来源');
    expect(f.stateCoupling).toContain('particle_ledger');
  });

  it('a full chapter is complete; missing list is empty', () => {
    expect(isChapterOutlineComplete(FULL_CHAPTER)).toBe(true);
    expect(listMissingChapterFields(FULL_CHAPTER)).toEqual([]);
  });

  it('maps by number even when a heading title is reworded', () => {
    const reworded = FULL_CHAPTER.replace('## 4. 钩子（hookOps）', '## 4. 钩子');
    const f = parseChapterOutlineFields(reworded);
    expect(f.hooks).toContain('mustOpen');
  });

  it('drops a field when its numbered section is removed', () => {
    const missing5 = FULL_CHAPTER.replace('## 5. 爽点节拍\nfirst-use，强度 low。\n\n', '');
    const miss = listMissingChapterFields(missing5);
    expect(miss).toContain('coolBeat');
    expect(isChapterOutlineComplete(missing5)).toBe(false);
  });

  it('fresh skeleton is entirely unfilled (9 missing)', () => {
    const skeleton = renderChapterSkeleton(1);
    expect(listMissingChapterFields(skeleton)).toHaveLength(9);
    expect(isChapterOutlineComplete(skeleton)).toBe(false);
  });
});

describe('listMissingMasterSections / listMissingVolumeSections (keyword)', () => {
  it('fresh master skeleton reports all 4 required sections missing', () => {
    const skeleton = renderMasterSkeleton('总纲：《测试》');
    expect(listMissingMasterSections(skeleton).sort()).toEqual(
      ['主线', '主题驱动', '卷列表', '长期伏笔'].sort(),
    );
  });

  it('a filled master has no missing sections', () => {
    const filled = `# 总纲：《测试》

## 主题驱动（一句话）
个体如何重新接入失落的力量真相。

## 主线五幕
1. 觉醒（卷 1-2）

## 卷列表
| 1 | 《残卷初鸣》 | 1-50 |

## 长期伏笔
- 残卷的真正主人 hook-canjuan-origin
`;
    expect(listMissingMasterSections(filled)).toEqual([]);
  });

  it('volume keyword matcher catches the 5 段式 contract', () => {
    const partial = `# 第 1 卷《残卷初鸣》卷纲

## 卷主题
站稳脚跟。

## 卷高潮
第 45 章：祭祀大典翻盘。
`;
    const miss = listMissingVolumeSections(partial);
    // 卷主题 + 卷高潮 present; 节奏分段 / 必出现的桥段 / 卷末钩子 missing.
    expect(miss).toContain('节奏分段');
    expect(miss).toContain('必出现的桥段');
    expect(miss).toContain('卷末钩子');
    expect(miss).not.toContain('卷主题');
    expect(miss).not.toContain('卷高潮');
  });
});

describe('real example compatibility', () => {
  it('examples/tunshi-mo-di chapter-0001.md parses + validates as complete', async () => {
    const projectRoot = join(repoRoot(), 'examples', 'tunshi-mo-di');
    const doc = await readChapterOutline(projectRoot, 1);
    expect(doc.frontmatter.chapter_no).toBe(1);
    expect(doc.frontmatter.asset_id).toBe('chapter-0001');
    expect(isChapterOutlineComplete(doc.body)).toBe(true);
  });
});

/**
 * Tests for core/assets/outline-render.ts skeleton generators:
 *   - each skeleton carries its required H2 headings
 *   - each skeleton's section bodies are bare placeholders → classified "unfilled"
 */
import { describe, expect, it } from 'vitest';
import {
  renderChapterSkeleton,
  renderMasterSkeleton,
  renderVolumeSkeleton,
} from '../src/core/assets/outline-render.js';
import {
  listMissingChapterFields,
  listMissingMasterSections,
  listMissingVolumeSections,
  parseOutlineTitle,
} from '../src/core/assets/outline.js';

describe('renderMasterSkeleton', () => {
  const md = renderMasterSkeleton('总纲：《测试》');

  it('carries the H1 title and required headings', () => {
    expect(parseOutlineTitle(md)).toBe('总纲：《测试》');
    expect(md).toContain('## 主题驱动');
    expect(md).toContain('## 主线五幕');
    expect(md).toContain('## 卷列表');
    expect(md).toContain('## 长期伏笔');
  });

  it('is fully unfilled (all 4 required sections missing)', () => {
    expect(listMissingMasterSections(md)).toHaveLength(4);
  });
});

describe('renderVolumeSkeleton', () => {
  const md = renderVolumeSkeleton(1, [1, 50]);

  it('embeds the chapter range as a comment and required headings', () => {
    expect(md).toContain('第 1 卷');
    expect(md).toContain('第 1-50 章');
    expect(md).toContain('## 卷主题');
    expect(md).toContain('## 卷高潮');
    expect(md).toContain('## 节奏分段');
  });

  it('is fully unfilled (all 5 required sections missing)', () => {
    expect(listMissingVolumeSections(md)).toHaveLength(5);
  });
});

describe('renderChapterSkeleton', () => {
  const md = renderChapterSkeleton(1);

  it('carries all 9 numbered field headings', () => {
    for (let i = 1; i <= 9; i++) {
      expect(md).toContain(`## ${i}.`);
    }
  });

  it('is fully unfilled (all 9 fields missing)', () => {
    expect(listMissingChapterFields(md)).toHaveLength(9);
  });
});

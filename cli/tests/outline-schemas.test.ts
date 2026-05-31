/**
 * Tests for core/schemas/outline.ts:
 *   - ChapterRange tuple + refine
 *   - master / volume / chapter frontmatter (happy + failure)
 *   - asset_id pattern enforcement per level
 */
import { describe, expect, it } from 'vitest';
import {
  ChapterRange,
  OutlineChapterFrontmatter,
  OutlineMasterFrontmatter,
  OutlineVolumeFrontmatter,
  CHAPTER_OUTLINE_FIELD_KEYS,
  CHAPTER_OUTLINE_FIELD_TITLES,
} from '../src/core/schemas/outline.js';
import { AssetType } from '../src/core/schemas/common.js';

const TS = '2026-05-24T10:00:00Z';

describe('AssetType — outline (alpha-2c) members', () => {
  it('contains all three outline asset types', () => {
    expect(AssetType.options).toContain('outline-master');
    expect(AssetType.options).toContain('outline-volume');
    expect(AssetType.options).toContain('outline-chapter');
  });
});

describe('ChapterRange', () => {
  it('accepts a valid inclusive range', () => {
    expect(ChapterRange.safeParse([1, 50]).success).toBe(true);
    expect(ChapterRange.safeParse([51, 51]).success).toBe(true);
  });

  it('rejects end < start', () => {
    expect(ChapterRange.safeParse([50, 10]).success).toBe(false);
  });

  it('rejects non-positive chapters', () => {
    expect(ChapterRange.safeParse([0, 5]).success).toBe(false);
    expect(ChapterRange.safeParse([1, 0]).success).toBe(false);
  });
});

describe('OutlineMasterFrontmatter', () => {
  const ok = {
    asset_type: 'outline-master',
    asset_id: 'outline-master',
    created_at: TS,
    updated_at: TS,
    version: 1,
    status: 'drafting',
    maintained_by: 'novel-outline-architect',
  };

  it('parses a valid master frontmatter', () => {
    expect(OutlineMasterFrontmatter.safeParse(ok).success).toBe(true);
  });

  it('rejects a non-literal asset_id', () => {
    expect(OutlineMasterFrontmatter.safeParse({ ...ok, asset_id: 'master' }).success).toBe(false);
  });

  it('rejects missing status', () => {
    const { status, ...withoutStatus } = ok;
    void status;
    expect(OutlineMasterFrontmatter.safeParse(withoutStatus).success).toBe(false);
  });
});

describe('OutlineVolumeFrontmatter', () => {
  const ok = {
    asset_type: 'outline-volume',
    asset_id: 'volume-01',
    volume_no: 1,
    chapter_range: [1, 50],
    target_chapters: 50,
    created_at: TS,
    updated_at: TS,
    version: 1,
    status: 'approved',
    maintained_by: 'novel-outline-architect',
  };

  it('parses a valid volume frontmatter', () => {
    expect(OutlineVolumeFrontmatter.safeParse(ok).success).toBe(true);
  });

  it('accepts 3-digit volume ids (volume-100)', () => {
    expect(OutlineVolumeFrontmatter.safeParse({ ...ok, asset_id: 'volume-100' }).success).toBe(true);
  });

  it('rejects single-digit asset_id (volume-1)', () => {
    expect(OutlineVolumeFrontmatter.safeParse({ ...ok, asset_id: 'volume-1' }).success).toBe(false);
  });

  it('rejects an inverted chapter_range', () => {
    expect(
      OutlineVolumeFrontmatter.safeParse({ ...ok, chapter_range: [50, 10] }).success,
    ).toBe(false);
  });
});

describe('OutlineChapterFrontmatter', () => {
  const ok = {
    asset_type: 'outline-chapter',
    asset_id: 'chapter-0001',
    chapter_no: 1,
    volume_no: 1,
    target_words: 3500,
    created_at: TS,
    updated_at: TS,
    version: 1,
    status: 'drafting',
    maintained_by: 'novel-outline-architect',
  };

  it('parses a valid chapter frontmatter', () => {
    expect(OutlineChapterFrontmatter.safeParse(ok).success).toBe(true);
  });

  it('defaults target_words to 3500 when omitted', () => {
    const { target_words, ...withoutTW } = ok;
    void target_words;
    const parsed = OutlineChapterFrontmatter.parse(withoutTW);
    expect(parsed.target_words).toBe(3500);
  });

  it('rejects asset_id shorter than 4 digits (chapter-001)', () => {
    expect(OutlineChapterFrontmatter.safeParse({ ...ok, asset_id: 'chapter-001' }).success).toBe(false);
  });

  it('accepts 5-digit chapter ids (chapter-10000)', () => {
    expect(
      OutlineChapterFrontmatter.safeParse({ ...ok, asset_id: 'chapter-10000', chapter_no: 10000 }).success,
    ).toBe(true);
  });
});

describe('chapter 9-field constants', () => {
  it('has exactly 9 ordered field keys with titles', () => {
    expect(CHAPTER_OUTLINE_FIELD_KEYS).toHaveLength(9);
    for (const k of CHAPTER_OUTLINE_FIELD_KEYS) {
      expect(CHAPTER_OUTLINE_FIELD_TITLES[k]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

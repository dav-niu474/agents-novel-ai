import { describe, expect, it } from 'vitest';
import {
  AssetType,
  BLUEPRINT_REQUIRED_SECTIONS,
  BLUEPRINT_SECTION_KEYS,
  BlueprintFrontmatter,
  ISODateTime,
  Novel,
  NovelInitInput,
  ProjectId,
  SkillName,
} from '@novel/core/schemas/index.js';

describe('common schemas', () => {
  it('ProjectId accepts <slug>-<6位字母数字>', () => {
    expect(ProjectId.safeParse('tunshi-mo-di-a3f9c2').success).toBe(true);
    expect(ProjectId.safeParse('novel-abc123').success).toBe(true);
  });

  it('ProjectId rejects bad shapes', () => {
    expect(ProjectId.safeParse('Tunshi-MoDi-a3f9c2').success).toBe(false); // uppercase
    expect(ProjectId.safeParse('novel').success).toBe(false); // no suffix
    expect(ProjectId.safeParse('novel-abc').success).toBe(false); // suffix < 6
  });

  it('ISODateTime accepts both Z and ±HH:MM', () => {
    expect(ISODateTime.safeParse('2026-05-24T15:30:00Z').success).toBe(true);
    expect(ISODateTime.safeParse('2026-05-24T15:30:00.123Z').success).toBe(true);
    expect(ISODateTime.safeParse('2026-05-24T15:30:00+08:00').success).toBe(true);
  });

  it('ISODateTime rejects naive datetimes', () => {
    expect(ISODateTime.safeParse('2026-05-24 15:30:00').success).toBe(false);
    expect(ISODateTime.safeParse('2026-05-24T15:30').success).toBe(false);
  });

  it('AssetType / SkillName cover all expected values', () => {
    expect(AssetType.options).toContain('blueprint');
    expect(AssetType.options).toContain('chapter');
    expect(AssetType.options).toContain('memory');
    expect(SkillName.options).toContain('novel-studio');
    expect(SkillName.options.length).toBe(9);
  });
});

describe('Novel schema', () => {
  const ok = {
    schema_version: '1.0',
    asset_type: 'project',
    id: 'tunshi-mo-di-a3f9c2',
    title: '吞天魔帝',
    subtitle: '',
    genre: ['xuanhuan'],
    platform_target: ['qidian'],
    lang: 'zh-CN',
    audience: '',
    blueprint_status: 'pending',
    outline_status: 'pending',
    current_chapter: 0,
    target_chapters: null,
    target_chapter_words: 3500,
    current_total_words: 0,
    tags: [],
    core_pitch: '',
    agents: {},
    created_at: '2026-05-24T00:00:00Z',
    updated_at: '2026-05-24T00:00:00Z',
    version: 1,
  };

  it('parses a minimal valid novel.json', () => {
    expect(Novel.parse(ok).id).toBe('tunshi-mo-di-a3f9c2');
  });

  it('requires at least 1 genre and 1 platform', () => {
    expect(Novel.safeParse({ ...ok, genre: [] }).success).toBe(false);
    expect(Novel.safeParse({ ...ok, platform_target: [] }).success).toBe(false);
  });

  it('accepts custom genre values not in the KNOWN_GENRES list (lenient)', () => {
    // Real-world example: examples/tunshi-mo-di/novel.json uses "moofa" which isn't
    // in any canonical list. Schema should still pass.
    expect(Novel.safeParse({ ...ok, genre: ['xuanhuan', 'moofa'] }).success).toBe(true);
    expect(Novel.safeParse({ ...ok, genre: ['totally-custom-subgenre'] }).success).toBe(true);
  });

  it('rejects empty-string genre / platform values', () => {
    expect(Novel.safeParse({ ...ok, genre: [''] }).success).toBe(false);
    expect(Novel.safeParse({ ...ok, platform_target: [''] }).success).toBe(false);
  });

  it('NovelInitInput validates required fields', () => {
    expect(
      NovelInitInput.safeParse({
        title: '吞天魔帝',
        genre: ['xuanhuan'],
        platform_target: ['qidian'],
      }).success,
    ).toBe(true);
    expect(NovelInitInput.safeParse({ title: '', genre: ['xuanhuan'], platform_target: ['qidian'] }).success).toBe(
      false,
    );
  });
});

describe('Blueprint schemas', () => {
  it('exports 10 section keys', () => {
    expect(BLUEPRINT_SECTION_KEYS.length).toBe(10);
  });

  it('required sections are 9 (style_fingerprint optional)', () => {
    expect(BLUEPRINT_REQUIRED_SECTIONS.length).toBe(9);
    expect(BLUEPRINT_REQUIRED_SECTIONS).not.toContain('style_fingerprint');
  });

  it('frontmatter accepts a fresh drafting document', () => {
    const ok = BlueprintFrontmatter.safeParse({
      asset_type: 'blueprint',
      asset_id: 'blueprint-main',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      status: 'drafting',
      maintained_by: 'novel-blueprint',
    });
    expect(ok.success).toBe(true);
  });

  it('frontmatter rejects unknown maintained_by', () => {
    const bad = BlueprintFrontmatter.safeParse({
      asset_type: 'blueprint',
      asset_id: 'blueprint-main',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      status: 'drafting',
      maintained_by: 'novel-unknown',
    });
    expect(bad.success).toBe(false);
  });
});

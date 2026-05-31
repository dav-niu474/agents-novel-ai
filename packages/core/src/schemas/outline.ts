/**
 * Schemas for the 3-level outline assets (大纲三级):
 *   1. outline/master.md                 — 总纲 (5 幕主线 + 卷划分 + 长期伏笔)
 *   2. outline/volumes/volume-NN.md       — 卷纲 / 细纲 (5 段式 + 必出桥段 + 卷末钩子)
 *   3. outline/chapters/chapter-NNNN.md   — 章纲 / 章节细纲 (chapter-writer 的唯一直接输入)
 *
 * Pinned to:
 *   - docs/design/01-asset-model.md §8 (8.1 master / 8.2 volume / 8.3 chapter)
 *   - templates/outline-{master,volume,chapter}.md
 *   - skills/novel-outline-architect/SKILL.md §3
 *
 * Design notes (why Markdown-canonical, not JSON-canonical like world/*):
 *   - The asset-model table (§1) lists 大纲's 主格式 = Markdown with NO JSON sidecar.
 *     Outlines are authored prose with rich tables / nested lists; round-tripping
 *     them through a structured JSON shape would be lossy and brittle.
 *   - So we follow the *blueprint* pattern: the Markdown body is canonical and
 *     stored verbatim; only the YAML frontmatter is strictly Zod-validated.
 *   - The chapter outline additionally has a strict 9-field contract (R1 in the
 *     SKILL). We parse those 9 sections *by their leading number* (robust against
 *     parenthetical heading variations) to gate completeness — but we never
 *     re-render the body, so authored content is never mangled.
 */
import { z } from 'zod';
import { AssetStatus, BaseFrontmatter, PositiveInt, SkillName } from './common.js';

// =============================================================================
//  Shared
// =============================================================================

/**
 * Inclusive [start, end] chapter range used by volume outlines. end >= start.
 */
export const ChapterRange = z
  .tuple([PositiveInt, PositiveInt])
  .refine(([start, end]) => end >= start, {
    message: 'chapter_range 结束章必须 ≥ 起始章',
  });
export type ChapterRange = z.infer<typeof ChapterRange>;

// =============================================================================
//  3.1 — 总纲 (outline-master)
// =============================================================================

export const OutlineMasterFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('outline-master'),
  asset_id: z.literal('outline-master'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-outline-architect'),
});
export type OutlineMasterFrontmatter = z.infer<typeof OutlineMasterFrontmatter>;

/** Composite shape after reading outline/master.md (body kept verbatim). */
export const OutlineMaster = z.object({
  frontmatter: OutlineMasterFrontmatter,
  /** Title shown after H1 (e.g. "总纲：《吞天魔帝》"). */
  title: z.string(),
  /** Raw Markdown body (canonical). */
  body: z.string(),
});
export type OutlineMaster = z.infer<typeof OutlineMaster>;

/**
 * Heading keywords that a complete master outline must contain (as H2 sections).
 * Matched leniently by substring against H2 heading text, so "主线 5 幕" /
 * "主线 N 幕" both satisfy "主线".
 */
export const MASTER_REQUIRED_SECTIONS = [
  '主题驱动',
  '主线',
  '卷列表',
  '长期伏笔',
] as const;

// =============================================================================
//  3.2 — 卷纲 / 细纲 (outline-volume)
// =============================================================================

export const OutlineVolumeFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('outline-volume'),
  /** Pattern: volume-NN (2+ digit zero-padded). */
  asset_id: z
    .string()
    .regex(/^volume-\d{2,}$/, 'outline-volume asset_id 必须是 volume-NN（2 位起 0 填充）'),
  volume_no: PositiveInt,
  chapter_range: ChapterRange,
  target_chapters: PositiveInt,
  status: AssetStatus,
  maintained_by: SkillName.default('novel-outline-architect'),
});
export type OutlineVolumeFrontmatter = z.infer<typeof OutlineVolumeFrontmatter>;

export const OutlineVolume = z.object({
  frontmatter: OutlineVolumeFrontmatter,
  title: z.string(),
  body: z.string(),
});
export type OutlineVolume = z.infer<typeof OutlineVolume>;

/** H2 keywords required for a complete 卷纲 (5 段式 contract). */
export const VOLUME_REQUIRED_SECTIONS = [
  '卷主题',
  '卷高潮',
  '节奏分段',
  '必出现的桥段',
  '卷末钩子',
] as const;

// =============================================================================
//  3.3 — 章纲 / 章节细纲 (outline-chapter)  — chapter-writer 的唯一直接输入
// =============================================================================

export const OutlineChapterFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('outline-chapter'),
  /** Pattern: chapter-NNNN (4+ digit zero-padded). */
  asset_id: z
    .string()
    .regex(/^chapter-\d{4,}$/, 'outline-chapter asset_id 必须是 chapter-NNNN（4 位起 0 填充）'),
  chapter_no: PositiveInt,
  volume_no: PositiveInt,
  target_words: PositiveInt.default(3500),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-outline-architect'),
});
export type OutlineChapterFrontmatter = z.infer<typeof OutlineChapterFrontmatter>;

export const OutlineChapter = z.object({
  frontmatter: OutlineChapterFrontmatter,
  title: z.string(),
  body: z.string(),
});
export type OutlineChapter = z.infer<typeof OutlineChapter>;

/**
 * The 9 mandatory chapter-outline fields (R1: 章纲 9 字段零缺失).
 * Order matches the numbered headings in templates/outline-chapter.md.
 */
export const CHAPTER_OUTLINE_FIELD_KEYS = [
  'goal',
  'characters',
  'events',
  'hooks',
  'coolBeat',
  'emotionCurve',
  'wordsRhythm',
  'doNotWrite',
  'stateCoupling',
] as const;
export type ChapterOutlineFieldKey = (typeof CHAPTER_OUTLINE_FIELD_KEYS)[number];

/** Human-readable titles for the 9 fields (used in CLI output + skeletons). */
export const CHAPTER_OUTLINE_FIELD_TITLES: Record<ChapterOutlineFieldKey, string> = {
  goal: '一句话目标',
  characters: '必出场角色',
  events: '必发生事件（按顺序）',
  hooks: '钩子（hookOps）',
  coolBeat: '爽点节拍',
  emotionCurve: '情绪曲线',
  wordsRhythm: '字数 / 节奏',
  doNotWrite: '不写',
  stateCoupling: '与状态的耦合（写完后该更新什么）',
};

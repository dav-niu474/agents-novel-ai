/**
 * Schemas for blueprint.md.
 *
 * The Markdown body is the canonical surface (humans edit it, all downstream skills read it).
 * The 10 sections are loosely structured: we model them as free-form strings keyed by section,
 * so the workflow can render markdown deterministically and parse it back.
 *
 * Pinned to docs/design/01-asset-model.md §4 + skills/novel-blueprint/SKILL.md §3-4.
 */
import { z } from 'zod';
import { AssetStatus, BaseFrontmatter, SkillName } from './common.js';

// ---------- Frontmatter ----------

export const BlueprintFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('blueprint'),
  asset_id: z.literal('blueprint-main'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-blueprint'),
});
export type BlueprintFrontmatter = z.infer<typeof BlueprintFrontmatter>;

// ---------- 10-section structured body ----------

/**
 * The 10 sections of blueprint.md. Each is free-form Markdown text, but the workflow
 * collects them through a structured 10-step interaction (skills/novel-blueprint/SKILL.md §3.B).
 *
 * `null` means "not yet filled". Empty string means "explicitly cleared".
 */
export const BlueprintSections = z.object({
  /** §1 一句话定盘 */
  pitch: z.string().nullable(),
  /** §2 题材定位（主题材 / 副题材 / 平台 / 受众 / 标签） */
  positioning: z.string().nullable(),
  /** §3 主角一句话画像 */
  protagonist: z.string().nullable(),
  /** §4 金手指一句话（必须包含代价） */
  cheat_system: z.string().nullable(),
  /** §5 卖点 / 钩子（前 30 章承诺） */
  hooks: z.string().nullable(),
  /** §6 反 AI 味要求 */
  anti_ai: z.string().nullable(),
  /** §7 文风指纹（可选） */
  style_fingerprint: z.string().nullable(),
  /** §8 排除项 */
  exclusions: z.string().nullable(),
  /** §9 章字数 / 节奏 */
  chapter_rhythm: z.string().nullable(),
  /** §10 长期意图 */
  long_term_intent: z.string().nullable(),
});
export type BlueprintSections = z.infer<typeof BlueprintSections>;

/** Order of the 10 sections (drives workflow + markdown rendering). */
export const BLUEPRINT_SECTION_KEYS = [
  'pitch',
  'positioning',
  'protagonist',
  'cheat_system',
  'hooks',
  'anti_ai',
  'style_fingerprint',
  'exclusions',
  'chapter_rhythm',
  'long_term_intent',
] as const satisfies ReadonlyArray<keyof BlueprintSections>;

/** Human-readable section titles (used in markdown headings + CLI prompts). */
export const BLUEPRINT_SECTION_TITLES: Record<keyof BlueprintSections, string> = {
  pitch: '一句话定盘',
  positioning: '题材定位',
  protagonist: '主角一句话画像',
  cheat_system: '金手指一句话',
  hooks: '卖点 / 钩子（前 30 章承诺）',
  anti_ai: '反 AI 味要求',
  style_fingerprint: '文风指纹',
  exclusions: '排除项',
  chapter_rhythm: '章字数 / 节奏',
  long_term_intent: '长期意图',
};

/** Whether a section is mandatory for `approve` (R2/R3 in the SKILL). */
export const BLUEPRINT_REQUIRED_SECTIONS: ReadonlyArray<keyof BlueprintSections> = [
  'pitch',
  'positioning',
  'protagonist',
  'cheat_system',
  'hooks',
  'anti_ai',
  'exclusions',
  'chapter_rhythm',
  'long_term_intent',
] as const;

/** Composite shape after parsing a blueprint.md file. */
export const Blueprint = z.object({
  frontmatter: BlueprintFrontmatter,
  /** Title shown after H1 (e.g. "《吞天魔帝》开书蓝图"). */
  title: z.string(),
  sections: BlueprintSections,
});
export type Blueprint = z.infer<typeof Blueprint>;

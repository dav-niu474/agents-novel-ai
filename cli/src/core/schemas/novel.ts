/**
 * Schema for novel.json (project metadata).
 *
 * Pinned to docs/design/01-asset-model.md §3.
 */
import { z } from 'zod';
import { ISODateTime, NonNegativeInt, PositiveInt, ProjectId } from './common.js';

/** Genre enum — matches blueprint SKILL.md options (Chinese web-novel canon). */
export const Genre = z.enum([
  'xuanhuan', // 玄幻
  'xianxia', // 仙侠
  'urban', // 都市
  'lishi', // 历史
  'kehuan', // 科幻
  'moshi', // 末世
  'youxi', // 游戏
  'wuxianliu', // 无限流
  'yanqing', // 言情
  'lingyi', // 灵异
  'other',
]);
export type Genre = z.infer<typeof Genre>;

/** Target platforms in the Chinese web-novel ecosystem. */
export const Platform = z.enum(['qidian', 'fanqie', 'jinjiang', 'ciweimao', 'zhihu', 'other']);
export type Platform = z.infer<typeof Platform>;

/** Audience demographic. */
export const Audience = z.enum([
  '',
  'male-young-adult',
  'male-middle',
  'female-young-adult',
  'female-middle',
  'mixed',
]);
export type Audience = z.infer<typeof Audience>;

/** Pipeline stage status fields used by novel.json. */
export const StageStatus = z.enum(['pending', 'drafting', 'in_progress', 'approved', 'archived']);
export type StageStatus = z.infer<typeof StageStatus>;

/** Per-skill agent hints (free-form; expanded in v2.3 multi-model routing). */
export const AgentsConfig = z
  .object({
    writer_voice: z.string().optional(),
    auditor_strictness: z.enum(['low', 'medium', 'high']).optional(),
  })
  .partial()
  .passthrough();
export type AgentsConfig = z.infer<typeof AgentsConfig>;

/**
 * The full novel.json schema. The shape mirrors the example in 01-asset-model.md §3
 * verbatim except where types are tightened.
 */
export const Novel = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('project'),
  id: ProjectId,
  title: z.string().min(1),
  subtitle: z.string().default(''),
  genre: z.array(Genre).min(1),
  platform_target: z.array(Platform).min(1),
  lang: z.string().default('zh-CN'),
  audience: Audience.default(''),

  blueprint_status: StageStatus.default('pending'),
  outline_status: StageStatus.default('pending'),
  current_chapter: NonNegativeInt.default(0),
  target_chapters: PositiveInt.nullable().default(null),
  target_chapter_words: PositiveInt.default(3500),
  current_total_words: NonNegativeInt.default(0),

  tags: z.array(z.string()).default([]),
  core_pitch: z.string().default(''),

  agents: AgentsConfig.default({}),

  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
});
export type Novel = z.infer<typeof Novel>;

/** Partial input used by `novel init` (everything else is filled by defaults). */
export const NovelInitInput = z.object({
  title: z.string().min(1),
  genre: z.array(Genre).min(1),
  platform_target: z.array(Platform).min(1),
  audience: Audience.optional(),
  subtitle: z.string().optional(),
  target_chapter_words: PositiveInt.optional(),
});
export type NovelInitInput = z.infer<typeof NovelInitInput>;

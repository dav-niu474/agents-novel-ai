/**
 * Schema for novel.json (project metadata).
 *
 * Pinned to docs/design/01-asset-model.md §3.
 *
 * Genre / Platform are intentionally lenient (free-form strings) because
 * Chinese web novels have many niche subgenres that aren't worth strictly
 * enumerating. The KNOWN_* constants are used by interactive prompts to
 * suggest common values without rejecting custom ones.
 *
 * Real-world example: examples/tunshi-mo-di/novel.json uses `"moofa"` (末法)
 * which isn't in any canonical list — locking down the enum would break
 * compat with v1.2 release data.
 */
import { z } from 'zod';
import { ISODateTime, NonNegativeInt, PositiveInt, ProjectId } from './common.js';

// ---------- Genre ----------

/**
 * Common genre codes shown in interactive prompts. **NOT a closed set** —
 * users may pass any string. Display name in `name`, code in `value`.
 */
export const KNOWN_GENRES = [
  { value: 'xuanhuan', name: '玄幻' },
  { value: 'xianxia', name: '仙侠' },
  { value: 'mofa', name: '末法' },
  { value: 'urban', name: '都市' },
  { value: 'lishi', name: '历史' },
  { value: 'kehuan', name: '科幻' },
  { value: 'moshi', name: '末世' },
  { value: 'youxi', name: '游戏' },
  { value: 'wuxianliu', name: '无限流' },
  { value: 'yanqing', name: '言情' },
  { value: 'lingyi', name: '灵异' },
  { value: 'wuxia', name: '武侠' },
  { value: 'other', name: '其他' },
] as const;

/** Genre code — any non-empty string. Use `KNOWN_GENRES` in prompts. */
export const Genre = z.string().min(1, 'genre 不能为空');
export type Genre = z.infer<typeof Genre>;

// ---------- Platform ----------

export const KNOWN_PLATFORMS = [
  { value: 'qidian', name: '起点' },
  { value: 'fanqie', name: '番茄' },
  { value: 'jinjiang', name: '晋江' },
  { value: 'ciweimao', name: '刺猬猫' },
  { value: 'zhihu', name: '知乎盐选' },
  { value: 'qq', name: 'QQ 阅读' },
  { value: 'tangjia', name: '塔读' },
  { value: 'other', name: '其他' },
] as const;

export const Platform = z.string().min(1, 'platform 不能为空');
export type Platform = z.infer<typeof Platform>;

// ---------- Audience ----------

/** Audience is a small closed set; keep as enum. */
export const Audience = z.enum([
  '',
  'male-young-adult',
  'male-middle',
  'female-young-adult',
  'female-middle',
  'mixed',
]);
export type Audience = z.infer<typeof Audience>;

export const KNOWN_AUDIENCES = [
  { value: 'male-young-adult', name: '男频青年向' },
  { value: 'male-middle', name: '男频中年向' },
  { value: 'female-young-adult', name: '女频青年向' },
  { value: 'female-middle', name: '女频中年向' },
  { value: 'mixed', name: '不限性别' },
  { value: '', name: '不确定' },
] as const;

// ---------- Pipeline status ----------

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

// ---------- Novel ----------

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

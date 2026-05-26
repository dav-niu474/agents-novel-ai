/**
 * Schemas for the 3 world-building assets:
 *   1. worldview.{md,json}      — era / factions / regions / physical rules
 *   2. powers.{md,json}         — power tier system + protagonist progression curve
 *   3. cheat-system.{md,json}   — protagonist's cheat / 金手指 (depends on powers)
 *
 * Pinned to:
 *   - docs/design/01-asset-model.md §5 (worldview), §6 (powers + cheat-system)
 *   - templates/{worldview,powers,cheat-system}.{md,json}
 *   - skills/novel-worldforge/SKILL.md §3
 *
 * Design notes:
 *   - JSON file is the canonical source. The .md file is a re-rendered projection.
 *   - "Tag-like" fields (epoch, faction type) use lenient strings + KNOWN_* lists,
 *     because they vary by genre. "Behavioral" enums (stance, cheat type, beat type,
 *     limit category) stay strict — downstream skills branch on them.
 *   - `not_applicable: true` is supported on powers + cheat-system for genres that
 *     don't have either (e.g. literary fiction, slice-of-life).
 */
import { z } from 'zod';
import {
  AssetStatus,
  BaseFrontmatter,
  ISODateTime,
  KebabSlug,
  PositiveInt,
  SkillName,
} from './common.js';

// =============================================================================
//  Worldview
// =============================================================================

/** Common epoch tags (lenient — accept any non-empty string). */
export const KNOWN_EPOCHS = [
  { value: 'ancient', name: '上古' },
  { value: 'middle-ancient', name: '中古' },
  { value: 'remote', name: '远古' },
  { value: 'near', name: '近古' },
  { value: 'current', name: '当代' },
  { value: 'future', name: '未来' },
] as const;

/** Common faction types (lenient). */
export const KNOWN_FACTION_TYPES = [
  { value: 'sect', name: '宗门' },
  { value: 'kingdom', name: '王国/国家' },
  { value: 'clan', name: '家族' },
  { value: 'cult', name: '教派' },
  { value: 'guild', name: '行会' },
  { value: 'corp', name: '公司' },
  { value: 'order', name: '骑士团/教团' },
  { value: 'clan-cult', name: '家族 + 教派' },
  { value: 'family', name: '世家' },
  { value: 'other', name: '其他' },
] as const;

/** Faction stance — strict (downstream uses this to drive ally/enemy logic). */
export const FactionStance = z.enum(['ally', 'antagonist', 'neutral', 'fringe']);
export type FactionStance = z.infer<typeof FactionStance>;

export const Faction = z.object({
  id: KebabSlug,
  name: z.string().min(1),
  type: z.string().min(1),
  stance: FactionStance,
  key_traits: z.array(z.string()).default([]),
});
export type Faction = z.infer<typeof Faction>;

export const Region = z.object({
  id: KebabSlug,
  name: z.string().min(1),
  /** Either a faction-id reference or freeform description ("九大宗门联盟"). */
  controlled_by: z.string(),
});
export type Region = z.infer<typeof Region>;

export const TimelineEntry = z.object({
  epoch: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const WorldviewInfoBoundaries = z.object({
  protagonist_unknown: z.array(z.string()).default([]),
  protagonist_misknown: z.array(z.string()).default([]),
});
export type WorldviewInfoBoundaries = z.infer<typeof WorldviewInfoBoundaries>;

export const WorldviewData = z.object({
  era: z.string().min(1),
  /** Anchor year of the "current" epoch — counted from some in-world event. */
  year_anchor: z.number().int().nonnegative(),
  tagline: z.string().min(1),
  timeline: z.array(TimelineEntry).default([]),
  factions: z.array(Faction).default([]),
  regions: z.array(Region).default([]),
  physical_rules: z.array(z.string()).default([]),
  info_boundaries: WorldviewInfoBoundaries.default({
    protagonist_unknown: [],
    protagonist_misknown: [],
  }),
});
export type WorldviewData = z.infer<typeof WorldviewData>;

export const WorldviewFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('worldview'),
  asset_id: z.literal('worldview-main'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-worldforge'),
});
export type WorldviewFrontmatter = z.infer<typeof WorldviewFrontmatter>;

/** Full worldview.json document. */
export const Worldview = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('worldview'),
  asset_id: z.literal('worldview-main'),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: WorldviewData,
});
export type Worldview = z.infer<typeof Worldview>;

// =============================================================================
//  Powers
// =============================================================================

/** Genre-basis presets — strict because SKILL §3 branches on these. */
export const GenreBasis = z.enum([
  'xuanhuan-custom',
  'xianxia-classic',
  'xianxia-classic-simplified',
  'urban-tier',
  'urban-faction',
  'wuxia-traditional',
  'scifi-tech-tier',
  'scifi-civilization',
  'apocalypse-evolution',
  'game-leveled',
  'romance-not-applicable',
  'other',
]);
export type GenreBasis = z.infer<typeof GenreBasis>;

export const PowerStage = z.object({
  id: KebabSlug,
  name: z.string().min(1),
  /** 1-indexed position in the system. order=1 is the lowest tier. */
  order: PositiveInt,
  sub_levels: z.array(z.string()).default([]),
  core_features: z.array(z.string()).default([]),
  breakthrough_requires: z.array(z.string()).default([]),
  avg_breakthrough_years: z.number().nonnegative().optional(),
  lifespan_bonus_years: z.number().nonnegative().optional(),
  /** What % of cultivators reach this tier (informational). */
  population_pct_among_cultivators: z.number().nonnegative().optional(),
});
export type PowerStage = z.infer<typeof PowerStage>;

export const ProtagonistCurveEntry = z.object({
  chapter: PositiveInt,
  /** Stage name as appears in PowerStage.name + sub-level (e.g. "炼气七层"). */
  stage: z.string().min(1),
  context: z.string().default(''),
});
export type ProtagonistCurveEntry = z.infer<typeof ProtagonistCurveEntry>;

export const PowersInfoBoundaries = z.object({
  hidden_stages: z.array(z.string()).default([]),
  protagonist_unknown_until_chapter: z
    .array(
      z.object({
        fact: z.string().min(1),
        until_chapter: PositiveInt,
      }),
    )
    .default([]),
});
export type PowersInfoBoundaries = z.infer<typeof PowersInfoBoundaries>;

export const PowersData = z.object({
  system_name: z.string().min(1),
  genre_basis: GenreBasis,
  stages: z.array(PowerStage).default([]),
  protagonist_curve: z.array(ProtagonistCurveEntry).default([]),
  info_boundaries: PowersInfoBoundaries.default({
    hidden_stages: [],
    protagonist_unknown_until_chapter: [],
  }),
  /** True when the genre has no formal power system (e.g. romance, slice-of-life). */
  not_applicable: z.boolean().default(false),
});
export type PowersData = z.infer<typeof PowersData>;

export const PowersFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('powers'),
  asset_id: z.literal('powers-main'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-worldforge'),
});
export type PowersFrontmatter = z.infer<typeof PowersFrontmatter>;

export const Powers = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('powers'),
  asset_id: z.literal('powers-main'),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: PowersData,
});
export type Powers = z.infer<typeof Powers>;

// =============================================================================
//  Cheat-system (金手指)
// =============================================================================

/** 7 流派 + hybrid — strict, branches downstream cheat-system writing logic. */
export const CheatType = z.enum([
  'analyzer',
  'system',
  'simulator',
  'summoner',
  'copier',
  'evolver',
  'time',
  'hybrid',
]);
export type CheatType = z.infer<typeof CheatType>;

/** Trigger conditions — strict (audit logic checks these). */
export const CheatTrigger = z.enum([
  'physical-contact',
  'visual-line-of-sight',
  'voice-utterance',
  'mental-focus',
  'blood-ritual',
  'consume-resource',
  'time-based',
]);
export type CheatTrigger = z.infer<typeof CheatTrigger>;

/** Cost types — strict (audit checks "代价" rule R2). */
export const CostPrimary = z.enum([
  'spiritual-power',
  'qi',
  'lifespan',
  'blood',
  'memory',
  'currency',
  'none',
]);
export type CostPrimary = z.infer<typeof CostPrimary>;

export const CheatCost = z.object({
  primary: CostPrimary,
  /** "complexity-tiered" / "linear" / "exponential" — informational. */
  scaling: z.string().default(''),
});
export type CheatCost = z.infer<typeof CheatCost>;

/**
 * Tier-N stage of the cheat. chapter_range[1] may be null = "until end of book".
 */
export const CheatStage = z.object({
  tier: PositiveInt,
  chapter_range: z.tuple([
    PositiveInt,
    PositiveInt.nullable(),
  ]),
  /** Cap of what this tier can do. */
  cap: z.string().min(1),
  /** "natural" / freeform unlock condition. */
  unlock_condition: z.string().min(1),
  /** Cost relative to tier 1 (1, 3, 10, ...). 0 = no normal cost (use alt_cost). */
  cost_multiplier: z.number().nonnegative(),
  /** Special modes unlocked at this tier (e.g. "rewrite", "create"). */
  modes: z.array(z.string()).default([]),
  /** Alternative cost type when cost_multiplier=0 (e.g. "memory" for Tier 4). */
  alt_cost: CostPrimary.optional(),
});
export type CheatStage = z.infer<typeof CheatStage>;

/** Limit categories — strict (audit checks at least 1 of each major class). */
export const LimitCategory = z.enum([
  'resource',
  'backlash',
  'cooldown',
  'target',
  'public',
]);
export type LimitCategory = z.infer<typeof LimitCategory>;

export const CheatLimit = z.object({
  category: LimitCategory,
  rule: z.string().min(1),
  /** For cooldown limits. */
  duration_hours: z.number().positive().optional(),
  /** For backlash limits. */
  severity: z.string().optional(),
  /** For resource limits at tier 1. */
  tier1_daily_cap: z.number().positive().optional(),
});
export type CheatLimit = z.infer<typeof CheatLimit>;

/** Beat types — strict (outline-architect maps these to chapter beats). */
export const BeatType = z.enum([
  'first-use',
  'windfall',
  'comeback',
  'cost-reveal',
  'stage-up',
  'backlash',
  'transcend',
]);
export type BeatType = z.infer<typeof BeatType>;

export const CheatBeat = z.object({
  chapter: PositiveInt,
  type: BeatType,
  event: z.string().min(1),
});
export type CheatBeat = z.infer<typeof CheatBeat>;

export const CheatSystemData = z.object({
  name: z.string().min(1),
  type: CheatType,
  definition: z.string().min(1),
  trigger: z.array(CheatTrigger).min(1, 'cheat-system 必须至少声明 1 种触发条件'),
  cost: CheatCost,
  output_format: z.string().default(''),
  stages: z.array(CheatStage).default([]),
  limits: z.array(CheatLimit).default([]),
  beats: z.array(CheatBeat).default([]),
  anti_patterns: z.array(z.string()).default([]),
  not_applicable: z.boolean().default(false),
});
export type CheatSystemData = z.infer<typeof CheatSystemData>;

export const CheatSystemFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('cheat-system'),
  /** Pattern: cheat-<slug>. ID is set when build workflow knows the cheat name. */
  asset_id: z.string().regex(/^cheat-[a-z0-9]+(?:-[a-z0-9]+)*$/, 'cheat-system asset_id must be cheat-<slug>'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-worldforge'),
});
export type CheatSystemFrontmatter = z.infer<typeof CheatSystemFrontmatter>;

export const CheatSystem = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('cheat-system'),
  asset_id: z.string().min(1),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: CheatSystemData,
});
export type CheatSystem = z.infer<typeof CheatSystem>;

// =============================================================================
//  Cross-asset validation (R2 hard rule from blueprint workflow)
// =============================================================================

/**
 * Validate that the cheat-system has at least one limit category in the
 * "代价 / 限制 / 消耗 / 反噬 / 冷却" family. Mirrors the R2 strong constraint
 * from skills/novel-blueprint/SKILL.md §3.B.4.
 *
 * Returns a list of human-readable issues. Empty list = R2 satisfied.
 */
export function checkCheatSystemR2(cs: CheatSystemData): string[] {
  const issues: string[] = [];
  if (cs.not_applicable) return issues;

  if (cs.limits.length === 0) {
    issues.push('R2 违反：cheat-system 没有任何 limits（代价 / 限制 / 消耗 / 反噬 / 冷却）');
    return issues;
  }
  const categories = new Set(cs.limits.map((l) => l.category));
  // Must have at least one of: resource cost, backlash, or cooldown.
  if (!categories.has('resource') && !categories.has('backlash') && !categories.has('cooldown')) {
    issues.push(
      'R2 违反：cheat-system 必须包含 resource / backlash / cooldown 之一（不接受龙傲天式无代价金手指）',
    );
  }
  return issues;
}

/**
 * Validate that the cheat-system stages line up with the powers protagonist_curve.
 * Specifically: each cheat stage's chapter_range must overlap with at least one
 * protagonist curve entry, otherwise the cheat tier is unreachable.
 */
export function checkCheatPowersConsistency(
  cs: CheatSystemData,
  powers: PowersData,
): string[] {
  const issues: string[] = [];
  if (cs.not_applicable || powers.not_applicable) return issues;
  if (cs.stages.length === 0 || powers.protagonist_curve.length === 0) return issues;

  const maxCurveChapter = Math.max(...powers.protagonist_curve.map((p) => p.chapter));
  for (const stage of cs.stages) {
    const [start] = stage.chapter_range;
    if (start > maxCurveChapter) {
      issues.push(
        `cheat-system stage tier ${stage.tier} 起点章节 ${start} 超出 powers.protagonist_curve 最远章节 ${maxCurveChapter}`,
      );
    }
  }
  return issues;
}

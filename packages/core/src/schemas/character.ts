/**
 * Schemas for the character-atelier assets:
 *   1. characters/<role>-<slug>.{md,json}      — one card per character
 *   2. characters/_index.json                  — registry of all characters
 *   3. characters/relationships.{md,json}       — relationship graph
 *
 * Pinned to:
 *   - docs/design/01-asset-model.md §7 (character card)
 *   - templates/{character.md,characters-index.json,characters-relationships.md}
 *   - skills/novel-character-atelier/SKILL.md §3 (8-field card) + §4 (workflows)
 *   - examples/tunshi-mo-di/characters/* (real data shape)
 *
 * Design notes:
 *   - JSON file is canonical. The .md file is a re-rendered projection (lossy).
 *     This mirrors the alpha-2a worldforge contract so the same validation /
 *     atomic-write discipline applies to characters.
 *   - "Behavioral" enums (role, tier, relationship group) stay strict because
 *     downstream skills branch on them. Free-form prose (one-liner, arc change,
 *     forbidden writing) is lenient strings.
 *   - The 性格内核 (personality_core) is the immutable contract chapter-writer
 *     and quality-auditor enforce (SKILL R1). It is required + non-empty.
 */
import { z } from 'zod';
import {
  AssetStatus,
  BaseFrontmatter,
  ISODateTime,
  PositiveInt,
  SkillName,
} from './common.js';
import type { PowersData } from './world.js';

// =============================================================================
//  Role + tier
// =============================================================================

/** Character role — strict (drives file placement + index bucket). */
export const CharacterRole = z.enum([
  'protagonist',
  'antagonist',
  'supporting',
  'minor',
]);
export type CharacterRole = z.infer<typeof CharacterRole>;

/**
 * Character tier — strict union across all roles.
 *   - protagonist:           protagonist
 *   - antagonist:            early / mid / late / meta
 *   - supporting:            core / important / minor
 *   - minor (index-only):    minor
 *
 * `checkTierForRole` validates the role/tier pairing.
 */
export const CharacterTier = z.enum([
  'protagonist',
  'early',
  'mid',
  'late',
  'meta',
  'core',
  'important',
  'minor',
]);
export type CharacterTier = z.infer<typeof CharacterTier>;

/** Tiers that imply "core" information density (8 fields, ≥3 signature details). */
export const HIGH_DENSITY_TIERS: ReadonlySet<CharacterTier> = new Set<CharacterTier>([
  'protagonist',
  'core',
]);

/** Which tiers are legal for each role (SKILL §3.1-3.3). */
export const ROLE_TIERS: Record<CharacterRole, ReadonlyArray<CharacterTier>> = {
  protagonist: ['protagonist'],
  antagonist: ['early', 'mid', 'late', 'meta'],
  supporting: ['core', 'important', 'minor'],
  minor: ['minor'],
};

// =============================================================================
//  Character card fields (8 fields → structured)
// =============================================================================

/** Field 2 — 基础档案. All optional-ish prose; appearance is a list. */
export const CharacterProfile = z.object({
  /** May carry two ages for 穿越/重生 books, e.g. "原身 16 / 穿越者 25". */
  age: z.string().default(''),
  origin: z.string().default(''),
  /** 3-5 features, at least one should be a signature trait. */
  appearance: z.array(z.string()).default([]),
  attire: z.string().default(''),
});
export type CharacterProfile = z.infer<typeof CharacterProfile>;

/**
 * Field 3 — 性格内核（不可被剧情打破）.
 * The immutable contract. core_drive + decision_pattern are required.
 */
export const PersonalityCore = z.object({
  /** 最深的渴望 / 最深的恐惧（1-2 句）. */
  core_drive: z.string().min(1, '性格内核必须有核心驱动'),
  /** 遇事先怎么做：观察 / 直觉 / 询问 / 试探 / 硬刚. */
  decision_pattern: z.string().min(1, '性格内核必须有决策模式'),
  /** 哪几类事会让他失控. */
  emotional_anchors: z.array(z.string()).default([]),
});
export type PersonalityCore = z.infer<typeof PersonalityCore>;

/**
 * Field 4 — 能力与成长. For protagonist/antagonist this MUST mirror
 * world/powers.json.protagonist_curve (SKILL R2). Shape matches
 * world.ProtagonistCurveEntry on purpose.
 */
export const AbilityCurveEntry = z.object({
  chapter: PositiveInt,
  stage: z.string().min(1),
  context: z.string().default(''),
});
export type AbilityCurveEntry = z.infer<typeof AbilityCurveEntry>;

/** Field 6 — 关系网（一句话指针）. Detail lives in relationships.{json,md}. */
export const RelationshipPointer = z.object({
  /** Target character id (preferred) or display name. */
  target: z.string().min(1),
  /** One-liner relation label, e.g. "师妹，朦胧情线". */
  relation: z.string().min(1),
});
export type RelationshipPointer = z.infer<typeof RelationshipPointer>;

/** Field 7 — 弧光设计. Per-volume/phase change (gradual, never sudden). */
export const ArcEntry = z.object({
  /** e.g. "第 1 卷" or "第 1 卷（觉醒）". */
  phase: z.string().min(1),
  /** e.g. "从受害者到反击者（被动 → 主动）". */
  change: z.string().min(1),
});
export type ArcEntry = z.infer<typeof ArcEntry>;

export const CharacterData = z.object({
  name: z.string().min(1),
  role: CharacterRole,
  tier: CharacterTier,
  first_appear_chapter: PositiveInt.default(1),

  /** Field 1 — 一句话画像. */
  one_liner: z.string().min(1),
  /** Field 2 — 基础档案. */
  profile: CharacterProfile.default({
    age: '',
    origin: '',
    appearance: [],
    attire: '',
  }),
  /** Field 3 — 性格内核（不可破）. */
  personality_core: PersonalityCore,
  /** Field 4 — 能力与成长. */
  ability_curve: z.array(AbilityCurveEntry).default([]),
  /** Field 5 — 标志性细节（核心角色 ≥ 3）. */
  signature_details: z.array(z.string()).default([]),
  /** Field 6 — 关系网指针. */
  relationship_pointers: z.array(RelationshipPointer).default([]),
  /** Field 7 — 弧光设计. */
  arc_design: z.array(ArcEntry).default([]),
  /** Field 8 — 禁止写法（chapter-writer 硬墙）. */
  forbidden_writing: z.array(z.string()).default([]),
});
export type CharacterData = z.infer<typeof CharacterData>;

/** asset_id pattern: <role>-<slug>, slug is kebab. */
export const CHARACTER_ID_RE = /^(protagonist|antagonist|supporting|minor)-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CharacterFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('character'),
  asset_id: z.string().regex(CHARACTER_ID_RE, 'character asset_id must be <role>-<slug>'),
  character_role: CharacterRole,
  status: AssetStatus,
  maintained_by: SkillName.default('novel-character-atelier'),
});
export type CharacterFrontmatter = z.infer<typeof CharacterFrontmatter>;

/** Full <role>-<slug>.json document. */
export const Character = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('character'),
  asset_id: z.string().regex(CHARACTER_ID_RE),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: CharacterData,
});
export type Character = z.infer<typeof Character>;

// =============================================================================
//  Character index (_index.json)
// =============================================================================

export const CharacterIndexEntry = z.object({
  id: z.string().regex(CHARACTER_ID_RE),
  name: z.string().min(1),
  /** Path relative to characters/ dir, e.g. "antagonists/antagonist-zhao.md". */
  file: z.string().min(1),
  first_appear_chapter: PositiveInt.default(1),
  tier: CharacterTier,
});
export type CharacterIndexEntry = z.infer<typeof CharacterIndexEntry>;

export const CharacterIndexData = z.object({
  protagonist: z.array(CharacterIndexEntry).default([]),
  antagonists: z.array(CharacterIndexEntry).default([]),
  supporting: z.array(CharacterIndexEntry).default([]),
  minor: z.array(CharacterIndexEntry).default([]),
});
export type CharacterIndexData = z.infer<typeof CharacterIndexData>;

export const CharacterIndex = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('character-index'),
  asset_id: z.literal('characters-index'),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: CharacterIndexData,
});
export type CharacterIndex = z.infer<typeof CharacterIndex>;

/** Map a role to its index bucket key. */
export function indexBucketForRole(role: CharacterRole): keyof CharacterIndexData {
  switch (role) {
    case 'protagonist':
      return 'protagonist';
    case 'antagonist':
      return 'antagonists';
    case 'supporting':
      return 'supporting';
    case 'minor':
      return 'minor';
  }
}

// =============================================================================
//  Relationships (relationships.{md,json})
// =============================================================================

/** Relationship circle — strict (drives MD grouping). */
export const RelationshipGroup = z.enum([
  'protagonist', // 主角圈
  'antagonist', // 反派圈
  'supporting', // 配角圈
  'cross', // 跨阵营
]);
export type RelationshipGroup = z.infer<typeof RelationshipGroup>;

export const RelationshipNode = z.object({
  /** Optional — "future/planned" nodes may not have a fixed chapter yet. */
  chapter: PositiveInt.optional(),
  event: z.string().min(1),
});
export type RelationshipNode = z.infer<typeof RelationshipNode>;

export const RelationshipEdge = z.object({
  /** Character id (preferred) or display name. */
  from: z.string().min(1),
  to: z.string().min(1),
  group: RelationshipGroup,
  /** e.g. "朦胧情线" / "仇人" / "半师半敌". */
  type: z.string().min(1),
  /** 0 陌生 / 1 认识 / 2 熟悉 / 3 信任 / 4 紧密 / 5 生死. Optional. */
  strength: z.number().int().min(0).max(5).optional(),
  /** Key chapter milestones along the relationship. */
  nodes: z.array(RelationshipNode).default([]),
});
export type RelationshipEdge = z.infer<typeof RelationshipEdge>;

export const RelationshipsData = z.object({
  edges: z.array(RelationshipEdge).default([]),
});
export type RelationshipsData = z.infer<typeof RelationshipsData>;

export const RelationshipsFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('characters-relationships'),
  asset_id: z.literal('relationships-main'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-character-atelier'),
});
export type RelationshipsFrontmatter = z.infer<typeof RelationshipsFrontmatter>;

export const Relationships = z.object({
  schema_version: z.literal('1.0'),
  asset_type: z.literal('characters-relationships'),
  asset_id: z.literal('relationships-main'),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: RelationshipsData,
});
export type Relationships = z.infer<typeof Relationships>;

// =============================================================================
//  Validation helpers
// =============================================================================

/** Whether a string is an unfilled placeholder like "<待填>". */
export function isPlaceholderText(s: string): boolean {
  return /^<[^>]*>$/.test(s.trim());
}

/** Validate the role/tier pairing (SKILL §3). Empty list = ok. */
export function checkTierForRole(role: CharacterRole, tier: CharacterTier): string[] {
  const allowed = ROLE_TIERS[role];
  if (!allowed.includes(tier)) {
    return [`角色 role=${role} 不允许 tier=${tier}（允许：${allowed.join(' / ')}）`];
  }
  return [];
}

/**
 * Strong per-card check used at approve time (SKILL R1/R3/R4).
 * Returns human-readable issues; empty list = card passes.
 *
 * Hard requirements:
 *   - one_liner is filled (not placeholder)
 *   - personality_core.core_drive + decision_pattern filled (not placeholder)
 *   - high-density tiers (protagonist / core) have ≥ 3 signature_details (R3)
 *   - role/tier pairing is valid
 */
export function checkCharacterCardStrong(data: CharacterData): string[] {
  const issues: string[] = [];

  issues.push(...checkTierForRole(data.role, data.tier));

  if (isPlaceholderText(data.one_liner) || data.one_liner.trim().length === 0) {
    issues.push(`角色「${data.name}」一句话画像还是占位 / 空`);
  }
  if (
    isPlaceholderText(data.personality_core.core_drive) ||
    data.personality_core.core_drive.trim().length === 0
  ) {
    issues.push(`角色「${data.name}」性格内核·核心驱动缺失（R1：性格内核不可空）`);
  }
  if (
    isPlaceholderText(data.personality_core.decision_pattern) ||
    data.personality_core.decision_pattern.trim().length === 0
  ) {
    issues.push(`角色「${data.name}」性格内核·决策模式缺失（R1）`);
  }
  if (HIGH_DENSITY_TIERS.has(data.tier) && data.signature_details.length < 3) {
    issues.push(
      `角色「${data.name}」(tier=${data.tier}) 标志性细节只有 ${data.signature_details.length} 个，R3 要求 ≥ 3`,
    );
  }

  return issues;
}

/**
 * Validate that a character's ability_curve aligns with powers.protagonist_curve
 * (SKILL R2). Soft check (returns warnings): every ability_curve entry should
 * have a matching powers curve entry with the same chapter + stage. Only applies
 * to protagonist (and is skipped when powers is not_applicable / empty).
 */
export function checkAbilityCurveAlignment(
  data: CharacterData,
  powers: PowersData,
): string[] {
  const issues: string[] = [];
  if (data.role !== 'protagonist') return issues;
  if (powers.not_applicable) return issues;
  if (data.ability_curve.length === 0 || powers.protagonist_curve.length === 0) {
    return issues;
  }

  const curveByChapter = new Map<number, string>();
  for (const entry of powers.protagonist_curve) {
    curveByChapter.set(entry.chapter, entry.stage);
  }

  for (const entry of data.ability_curve) {
    const powersStage = curveByChapter.get(entry.chapter);
    if (powersStage === undefined) {
      issues.push(
        `主角「${data.name}」能力曲线第 ${entry.chapter} 章在 powers.protagonist_curve 中没有对应锚点`,
      );
    } else if (powersStage !== entry.stage) {
      issues.push(
        `主角「${data.name}」第 ${entry.chapter} 章境界「${entry.stage}」与 powers 的「${powersStage}」不一致（R2）`,
      );
    }
  }

  return issues;
}

/**
 * Schemas for the 3 character-atelier assets:
 *   1. character             — characters/<role>-<slug>.md (one card per character)
 *   2. character-index       — characters/_index.json (registry; JSON canonical)
 *   3. characters-           — characters/relationships.md (relationship graph)
 *      relationships
 *
 * Pinned to:
 *   - docs/design/01-asset-model.md §7
 *   - templates/{character.md,characters-index.json,characters-relationships.md}
 *   - skills/novel-character-atelier/SKILL.md §3 / §4 / §5
 *
 * Design notes:
 *   - Character cards are MD-canonical (no JSON sidecar) to stay 100% v1-SKILL
 *     compatible. The CLI writes the body via `renderCharacterBody(data)` from
 *     a structured `CharacterData` produced by LLM/editor at compose time, but
 *     once on disk the .md is opaque to read-back. Edits go via $EDITOR or a
 *     fresh `character add --refine`.
 *   - The `_index.json` IS round-trippable (JSON canonical) and is the registry
 *     downstream skills (chapter-writer, quality-auditor) consult.
 *   - relationships.md is also MD-canonical with frontmatter only.
 *   - character_role + character tier are strict enums: chapter-writer /
 *     auditor branches on these (e.g. OOC severity, must-appear lookup).
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
//  Roles & tiers
// =============================================================================

/** Top-level role bucket. Strict — drives directory placement + audit logic. */
export const CharacterRole = z.enum(['protagonist', 'antagonist', 'supporting', 'minor']);
export type CharacterRole = z.infer<typeof CharacterRole>;

/** Antagonist tier — strict, see SKILL §3.2. */
export const AntagonistTier = z.enum(['early', 'mid', 'late', 'meta']);
export type AntagonistTier = z.infer<typeof AntagonistTier>;

/** Supporting tier — strict, see SKILL §3.3 (drives info-density requirements). */
export const SupportingTier = z.enum(['core', 'important', 'minor']);
export type SupportingTier = z.infer<typeof SupportingTier>;

/**
 * Union character tier used in the index. The CLI asserts role↔tier consistency
 * at write time (e.g. supporting cannot use 'meta'); the schema itself is
 * permissive on the union since enforcement is downstream of role context.
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

/** Lenient relation-type tags (see SKILL §4 A.5). Audit doesn't branch on these. */
export const KNOWN_RELATIONSHIP_TYPES = [
  '朦胧情线',
  '师徒',
  '兄弟',
  '姐妹',
  '红颜',
  '挚友',
  '同门',
  '上下级',
  '利用',
  '共谋',
  '仇人',
  '宿敌',
  '怀疑',
  '暧昧',
  '旧识',
  '亲属',
  '主仆',
] as const;

/** Relationship group bucket — strict, drives the relationships.md sectioning. */
export const RelationshipGroup = z.enum([
  'protagonist',
  'antagonist',
  'supporting',
  'cross',
]);
export type RelationshipGroup = z.infer<typeof RelationshipGroup>;

// =============================================================================
//  Character card (8-field structured data, used at compose time)
// =============================================================================

/** Mirrors PowerStage curve format — for protagonist & key antagonists this MUST
 * align with `world/powers.json.protagonist_curve` (rule R2 in SKILL §5). */
export const CharacterCurveEntry = z.object({
  chapter: PositiveInt,
  stage: z.string().min(1),
  context: z.string().default(''),
});
export type CharacterCurveEntry = z.infer<typeof CharacterCurveEntry>;

export const CharacterBasicProfile = z.object({
  /** String (not number) so we can write "原身 16 岁 / 穿越者 25 岁". */
  age: z.string().min(1),
  origin: z.string().min(1),
  /** 3-5 features for core characters; at least 1 should be a "标志性" mark. */
  appearance: z.array(z.string()).default([]),
  clothing_style: z.string().default(''),
});
export type CharacterBasicProfile = z.infer<typeof CharacterBasicProfile>;

/**
 * Personality core. SKILL R1: once approved, this is immutable for the
 * character's lifetime. chapter-writer will read these 3 sub-fields verbatim;
 * auditor dimension D16 (OOC) checks against them.
 */
export const CharacterPersonalityCore = z.object({
  core_drive: z.string().min(1),
  decision_pattern: z.string().min(1),
  emotional_anchors: z
    .array(z.string())
    .min(1, 'personality_core.emotional_anchors 至少 1 条'),
});
export type CharacterPersonalityCore = z.infer<typeof CharacterPersonalityCore>;

/** Pointer to another character (fully resolved by id). */
export const CharacterRelationshipPointer = z.object({
  /** ID of the referenced character — must exist in characters-index. */
  character_id: z.string().regex(
    /^(?:protagonist|antagonist|supporting|minor)-[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'character_id must be <role>-<slug>',
  ),
  /** Free-form tag (see KNOWN_RELATIONSHIP_TYPES for inspiration). */
  relation_type: z.string().min(1),
});
export type CharacterRelationshipPointer = z.infer<typeof CharacterRelationshipPointer>;

export const CharacterArcEntry = z.object({
  /** "第 1 卷" / "第 1-2 卷" / "前 50 章" — free-form volume label. */
  volume: z.string().min(1),
  description: z.string().min(1),
});
export type CharacterArcEntry = z.infer<typeof CharacterArcEntry>;

export const CharacterData = z.object({
  one_line_portrait: z.string().min(1),
  basic_profile: CharacterBasicProfile,
  personality_core: CharacterPersonalityCore,
  ability_curve: z.array(CharacterCurveEntry).default([]),
  signature_details: z.array(z.string()).default([]),
  relationships: z.array(CharacterRelationshipPointer).default([]),
  arc_design: z.array(CharacterArcEntry).default([]),
  prohibited: z.array(z.string()).default([]),
});
export type CharacterData = z.infer<typeof CharacterData>;

// =============================================================================
//  Character frontmatter
// =============================================================================

export const CharacterFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('character'),
  /** Pattern: <role>-<slug>. Enforced strict because file path derives from it. */
  asset_id: z
    .string()
    .regex(
      /^(?:protagonist|antagonist|supporting|minor)-[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'character asset_id must be <role>-<slug>',
    ),
  character_role: CharacterRole,
  /** Tier within the role bucket. Optional for protagonist (always 'protagonist'). */
  character_tier: CharacterTier.optional(),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-character-atelier'),
});
export type CharacterFrontmatter = z.infer<typeof CharacterFrontmatter>;

// =============================================================================
//  Character index (JSON canonical)
// =============================================================================

const indexEntryBase = {
  id: z.string().min(1),
  name: z.string().min(1),
  /** Path relative to characters/ root. */
  file: z.string().min(1),
  first_appear_chapter: PositiveInt,
};

export const ProtagonistIndexEntry = z.object({
  ...indexEntryBase,
  tier: z.literal('protagonist'),
});
export type ProtagonistIndexEntry = z.infer<typeof ProtagonistIndexEntry>;

export const AntagonistIndexEntry = z.object({
  ...indexEntryBase,
  tier: AntagonistTier,
});
export type AntagonistIndexEntry = z.infer<typeof AntagonistIndexEntry>;

export const SupportingIndexEntry = z.object({
  ...indexEntryBase,
  tier: SupportingTier,
});
export type SupportingIndexEntry = z.infer<typeof SupportingIndexEntry>;

export const MinorIndexEntry = z.object({
  ...indexEntryBase,
  tier: z.literal('minor'),
});
export type MinorIndexEntry = z.infer<typeof MinorIndexEntry>;

export const CharacterIndexData = z.object({
  protagonist: z.array(ProtagonistIndexEntry).default([]),
  antagonists: z.array(AntagonistIndexEntry).default([]),
  supporting: z.array(SupportingIndexEntry).default([]),
  minor: z.array(MinorIndexEntry).default([]),
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

// =============================================================================
//  Relationships (MD canonical with structured frontmatter wrapper data)
// =============================================================================

export const RelationshipNote = z.object({
  chapter: PositiveInt,
  event: z.string().min(1),
});
export type RelationshipNote = z.infer<typeof RelationshipNote>;

export const Relationship = z.object({
  /** character_id of one end. */
  from: z.string().min(1),
  /** character_id of the other end. */
  to: z.string().min(1),
  /** Free-form tag (see KNOWN_RELATIONSHIP_TYPES). */
  relation_type: z.string().min(1),
  /** Closeness 0–5 (see SKILL §4.A.5). */
  strength: z.number().int().min(0).max(5),
  group: RelationshipGroup,
  notes: z.array(RelationshipNote).default([]),
});
export type Relationship = z.infer<typeof Relationship>;

export const RelationshipsData = z.object({
  relationships: z.array(Relationship).default([]),
});
export type RelationshipsData = z.infer<typeof RelationshipsData>;

export const RelationshipsFrontmatter = BaseFrontmatter.extend({
  asset_type: z.literal('characters-relationships'),
  asset_id: z.literal('relationships-main'),
  status: AssetStatus,
  maintained_by: SkillName.default('novel-character-atelier'),
});
export type RelationshipsFrontmatter = z.infer<typeof RelationshipsFrontmatter>;

// =============================================================================
//  Cross-asset validation helpers
// =============================================================================

/**
 * Verify that a character's `ability_curve` is a subset of the
 * `powers.protagonist_curve` (chapter / stage match).
 *
 * Returns an array of human-readable issues (empty list = compatible).
 *
 * Use for protagonist + early/mid/late antagonists where worldforge tracks
 * their progression. `supporting` characters are exempted by the caller.
 */
export function checkCharacterPowersAlignment(
  character: CharacterData,
  protagonistCurve: ReadonlyArray<CharacterCurveEntry>,
): string[] {
  const issues: string[] = [];
  if (character.ability_curve.length === 0) return issues;
  if (protagonistCurve.length === 0) return issues; // genre-not-applicable

  // Build a map keyed by chapter. The character may declare a *subset* of the
  // canonical curve; what's asserted here is that any chapter the character
  // names lines up with the canonical stage label at that chapter (or later).
  const canonicalByChapter = new Map<number, string>();
  for (const c of protagonistCurve) canonicalByChapter.set(c.chapter, c.stage);
  const canonicalChapters = [...canonicalByChapter.keys()].sort((a, b) => a - b);
  if (canonicalChapters.length === 0) return issues;

  for (const entry of character.ability_curve) {
    // Find the latest canonical anchor at-or-before this chapter.
    let activeStage: string | undefined;
    for (const ch of canonicalChapters) {
      if (ch <= entry.chapter) activeStage = canonicalByChapter.get(ch);
      else break;
    }
    if (activeStage === undefined) {
      issues.push(
        `章节 ${entry.chapter} 早于 powers.protagonist_curve 起点 ${canonicalChapters[0]}`,
      );
      continue;
    }
    if (activeStage !== entry.stage) {
      issues.push(
        `章节 ${entry.chapter} 角色境界 "${entry.stage}" 与 powers 在该章节的活跃境界 "${activeStage}" 不一致`,
      );
    }
  }
  return issues;
}

/**
 * Lightweight role↔tier consistency check.
 * Returns issues array; empty = ok.
 */
export function checkRoleTierConsistency(
  role: CharacterRole,
  tier: CharacterTier | undefined,
): string[] {
  const issues: string[] = [];
  switch (role) {
    case 'protagonist':
      if (tier !== undefined && tier !== 'protagonist') {
        issues.push(`protagonist 的 tier 必须是 'protagonist'，得到 '${tier}'`);
      }
      break;
    case 'antagonist': {
      const valid = ['early', 'mid', 'late', 'meta'];
      if (tier === undefined) {
        issues.push("antagonist 必须指定 tier（early / mid / late / meta）");
      } else if (!valid.includes(tier)) {
        issues.push(`antagonist tier 必须是 ${valid.join(' / ')}，得到 '${tier}'`);
      }
      break;
    }
    case 'supporting': {
      const valid = ['core', 'important', 'minor'];
      if (tier === undefined) {
        issues.push("supporting 必须指定 tier（core / important / minor）");
      } else if (!valid.includes(tier)) {
        issues.push(`supporting tier 必须是 ${valid.join(' / ')}，得到 '${tier}'`);
      }
      break;
    }
    case 'minor':
      if (tier !== undefined && tier !== 'minor') {
        issues.push(`minor 的 tier 必须是 'minor'，得到 '${tier}'`);
      }
      break;
  }
  return issues;
}

/** Re-export of the kebab-case slug primitive (used by character add). */
export { KebabSlug };

/**
 * Common Zod schemas shared across all asset types.
 *
 * Pinned to docs/design/01-asset-model.md §2 (通用约定).
 */
import { z } from 'zod';

// ---------- Primitives ----------

/** ISO-8601 timestamp string, e.g. 2026-05-24T15:30:00Z. */
export const ISODateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/,
    'must be ISO-8601 with timezone',
  );

/** kebab-case lowercase slug; used in IDs and filenames. */
export const KebabSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case (a-z, 0-9, -)');

/** Project ID pattern: <slug>-<6位 hex> (see 01-asset-model.md §2.1). */
export const ProjectId = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z0-9]{6}$/,
    'project id must be <slug>-<6位字母数字>',
  );

/** Positive integer used for asset version counters. */
export const PositiveInt = z.number().int().positive();
export const NonNegativeInt = z.number().int().nonnegative();

// ---------- Enums (asset_type and friends) ----------

/**
 * AssetType enum — kept identical to docs/design/01-asset-model.md §2.3.
 * If you add a new asset type, also update:
 *   1. docs/design/01-asset-model.md
 *   2. core/assets/paths.ts
 *   3. core/status/detector.ts (if it affects stage detection)
 */
export const AssetType = z.enum([
  'project',
  'blueprint',
  'worldview',
  'powers',
  'cheat-system',
  'character',
  'character-index',
  'characters-relationships',
  'outline-master',
  'outline-volume',
  'outline-chapter',
  'chapter',
  'memory',
  'vault-card',
  'vault-index',
  'audit-report',
  'trend-report',
]);
export type AssetType = z.infer<typeof AssetType>;

/** AssetStatus — workflow status field common to many markdown assets. */
export const AssetStatus = z.enum(['drafting', 'draft', 'approved', 'archived', 'revised']);
export type AssetStatus = z.infer<typeof AssetStatus>;

/** Maintainer — must reference one of the 9 v1 skills (see 04-skill-spec.md §1). */
export const SkillName = z.enum([
  'novel-studio',
  'novel-blueprint',
  'novel-market-radar',
  'novel-worldforge',
  'novel-character-atelier',
  'novel-outline-architect',
  'novel-chapter-writer',
  'novel-quality-auditor',
  'novel-asset-vault',
]);
export type SkillName = z.infer<typeof SkillName>;

// ---------- Shared frontmatter base ----------

/**
 * Base frontmatter every Markdown asset MUST carry.
 * Concrete asset frontmatters extend this via z.object({...}).merge(BaseFrontmatter).
 */
export const BaseFrontmatter = z.object({
  asset_type: AssetType,
  asset_id: z.string().min(1),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  maintained_by: SkillName,
});
export type BaseFrontmatter = z.infer<typeof BaseFrontmatter>;

/**
 * Base shape for every JSON asset file (memory/*.json, *.json sidecars).
 * The `data` payload is asset-specific.
 */
export const BaseJsonAsset = z.object({
  schema_version: z.literal('1.0'),
  asset_type: AssetType,
  asset_id: z.string().min(1),
  created_at: ISODateTime,
  updated_at: ISODateTime,
  version: PositiveInt,
  data: z.unknown(),
});
export type BaseJsonAsset = z.infer<typeof BaseJsonAsset>;

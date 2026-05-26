/**
 * Read / write helpers for the 3 worldforge assets.
 *
 * Pattern per asset:
 *   - JSON file is the canonical source (validated against full schema)
 *   - MD file is a re-rendered human-readable projection
 *   - On write: validate JSON → atomic JSON write → render MD → atomic MD write
 *   - On read: only read JSON; MD existence is incidental
 *   - frontmatter status is mirrored in MD; CLI reads it from JSON's wrapping
 *     metadata via a separate `*Status(root)` helper
 */
import { existsSync } from 'node:fs';
import {
  CheatSystem,
  CheatSystemFrontmatter,
  Powers,
  PowersFrontmatter,
  Worldview,
  WorldviewFrontmatter,
  type CheatSystem as TCheatSystem,
  type CheatSystemData,
  type Powers as TPowers,
  type PowersData,
  type Worldview as TWorldview,
  type WorldviewData,
} from '../schemas/world.js';
import type { AssetStatus } from '../schemas/common.js';
import { slugify } from '../utils/id.js';
import { nowISO } from '../utils/time.js';
import { readJsonAsset, writeJsonAsset, writeMarkdownAsset } from './io.js';
import { projectPaths } from './paths.js';
import {
  renderCheatSystemBody,
  renderPowersBody,
  renderWorldviewBody,
} from './world-render.js';

// =============================================================================
//  Worldview
// =============================================================================

export function worldviewExists(root: string): boolean {
  return existsSync(projectPaths(root).world.worldviewJson);
}

export async function readWorldview(root: string): Promise<TWorldview> {
  return readJsonAsset(projectPaths(root).world.worldviewJson, Worldview);
}

/**
 * Validate + atomically write both worldview.json (canonical) and worldview.md (projection).
 * Bumps version + updated_at on each write.
 *
 * `status` controls the frontmatter status of the .md projection. Pass
 * 'drafting' during build, 'approved' on approve.
 */
export async function writeWorldview(
  root: string,
  worldview: TWorldview,
  status: AssetStatus = 'drafting',
): Promise<TWorldview> {
  const next: TWorldview = {
    ...worldview,
    updated_at: nowISO(),
    version: worldview.version + 1,
  };
  const p = projectPaths(root);
  await writeJsonAsset(p.world.worldviewJson, Worldview, next);
  await writeMarkdownAsset(p.world.worldview, WorldviewFrontmatter, {
    frontmatter: WorldviewFrontmatter.parse({
      asset_type: 'worldview',
      asset_id: 'worldview-main',
      created_at: next.created_at,
      updated_at: next.updated_at,
      version: next.version,
      status,
      maintained_by: 'novel-worldforge',
    }),
    body: renderWorldviewBody(next.data, next.data.era || 'Untitled'),
  });
  return next;
}

/** Build a minimal valid Worldview as starting point for `world build`. */
export function buildInitialWorldview(): TWorldview {
  const ts = nowISO();
  const data: WorldviewData = {
    era: '<待 worldforge 填写>',
    year_anchor: 0,
    tagline: '<待 worldforge 填写一句话大背景>',
    timeline: [],
    factions: [],
    regions: [],
    physical_rules: [],
    info_boundaries: { protagonist_unknown: [], protagonist_misknown: [] },
  };
  return Worldview.parse({
    schema_version: '1.0',
    asset_type: 'worldview',
    asset_id: 'worldview-main',
    created_at: ts,
    updated_at: ts,
    version: 1,
    data,
  });
}

// =============================================================================
//  Powers
// =============================================================================

export function powersExists(root: string): boolean {
  return existsSync(projectPaths(root).world.powersJson);
}

export async function readPowers(root: string): Promise<TPowers> {
  return readJsonAsset(projectPaths(root).world.powersJson, Powers);
}

export async function writePowers(
  root: string,
  powers: TPowers,
  status: AssetStatus = 'drafting',
): Promise<TPowers> {
  const next: TPowers = {
    ...powers,
    updated_at: nowISO(),
    version: powers.version + 1,
  };
  const p = projectPaths(root);
  await writeJsonAsset(p.world.powersJson, Powers, next);
  await writeMarkdownAsset(p.world.powers, PowersFrontmatter, {
    frontmatter: PowersFrontmatter.parse({
      asset_type: 'powers',
      asset_id: 'powers-main',
      created_at: next.created_at,
      updated_at: next.updated_at,
      version: next.version,
      status,
      maintained_by: 'novel-worldforge',
    }),
    body: renderPowersBody(next.data, next.data.system_name),
  });
  return next;
}

/** Build a minimal valid Powers as starting point. */
export function buildInitialPowers(): TPowers {
  const ts = nowISO();
  const data: PowersData = {
    system_name: '<待 worldforge 填写>',
    genre_basis: 'other',
    stages: [],
    protagonist_curve: [],
    info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
    not_applicable: false,
  };
  return Powers.parse({
    schema_version: '1.0',
    asset_type: 'powers',
    asset_id: 'powers-main',
    created_at: ts,
    updated_at: ts,
    version: 1,
    data,
  });
}

// =============================================================================
//  Cheat-system
// =============================================================================

export function cheatSystemExists(root: string): boolean {
  return existsSync(projectPaths(root).world.cheatSystemJson);
}

export async function readCheatSystem(root: string): Promise<TCheatSystem> {
  return readJsonAsset(projectPaths(root).world.cheatSystemJson, CheatSystem);
}

export async function writeCheatSystem(
  root: string,
  cs: TCheatSystem,
  status: AssetStatus = 'drafting',
): Promise<TCheatSystem> {
  // Recompute asset_id from current name in case user renamed.
  const expectedId = `cheat-${slugify(cs.data.name, 'main')}`;
  const next: TCheatSystem = {
    ...cs,
    asset_id: expectedId,
    updated_at: nowISO(),
    version: cs.version + 1,
  };
  const p = projectPaths(root);
  await writeJsonAsset(p.world.cheatSystemJson, CheatSystem, next);
  await writeMarkdownAsset(p.world.cheatSystem, CheatSystemFrontmatter, {
    frontmatter: CheatSystemFrontmatter.parse({
      asset_type: 'cheat-system',
      asset_id: expectedId,
      created_at: next.created_at,
      updated_at: next.updated_at,
      version: next.version,
      status,
      maintained_by: 'novel-worldforge',
    }),
    body: renderCheatSystemBody(next.data, next.data.name),
  });
  return next;
}

/**
 * Build a minimal valid CheatSystem as starting point. The required fields
 * (trigger, cost) get sentinel values that pass schema but are obvious
 * placeholders for the build workflow to overwrite.
 */
export function buildInitialCheatSystem(name = '<待填金手指名>'): TCheatSystem {
  const ts = nowISO();
  const data: CheatSystemData = {
    name,
    type: 'analyzer',
    definition: '<待 worldforge 填写一句话定义>',
    trigger: ['mental-focus'],
    cost: { primary: 'none', scaling: '' },
    output_format: '',
    stages: [],
    limits: [],
    beats: [],
    anti_patterns: [],
    not_applicable: false,
  };
  const slug = slugify(name, 'main');
  return CheatSystem.parse({
    schema_version: '1.0',
    asset_type: 'cheat-system',
    asset_id: `cheat-${slug}`,
    created_at: ts,
    updated_at: ts,
    version: 1,
    data,
  });
}

// =============================================================================
//  Aggregate status
// =============================================================================

export interface WorldStatus {
  hasWorldview: boolean;
  hasPowers: boolean;
  hasCheatSystem: boolean;
  /** Count of assets present (0-3). */
  count: number;
  /** True iff all 3 required assets exist on disk (regardless of status). */
  allPresent: boolean;
}

export function worldStatus(root: string): WorldStatus {
  const hasWorldview = worldviewExists(root);
  const hasPowers = powersExists(root);
  const hasCheatSystem = cheatSystemExists(root);
  const count = [hasWorldview, hasPowers, hasCheatSystem].filter(Boolean).length;
  return {
    hasWorldview,
    hasPowers,
    hasCheatSystem,
    count,
    allPresent: count === 3,
  };
}

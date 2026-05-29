/**
 * Read / write helpers for character-atelier assets:
 *   - characters/<role>-<slug>.md       (single character card; MD canonical)
 *   - characters/_index.json            (registry; JSON canonical, round-trippable)
 *   - characters/relationships.md       (relationship graph; MD canonical)
 *
 * Design notes:
 *   - Character cards are MD-canonical to stay 100% v1-SKILL compatible.
 *     The body is rendered from a structured `CharacterData` at write time.
 *     We do NOT read structured data back from the .md (it's opaque post-write).
 *   - `_index.json` IS round-trippable — downstream skills (chapter-writer,
 *     quality-auditor) need it to look up "is character X core or minor?".
 *   - relationships.md frontmatter is read+validated; body is opaque.
 *   - All writes go through `writeFileAtomic` via io.ts helpers.
 */
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CharacterFrontmatter,
  CharacterIndex,
  CharacterIndexData,
  RelationshipsData,
  RelationshipsFrontmatter,
  type CharacterData,
  type CharacterIndex as TCharacterIndex,
  type CharacterIndexData as TCharacterIndexData,
  type CharacterRole,
  type CharacterTier,
  type RelationshipsData as TRelationshipsData,
} from '../schemas/character.js';
import type { AssetStatus } from '../schemas/common.js';
import { slugify } from '../utils/id.js';
import { nowISO } from '../utils/time.js';
import {
  readJsonAsset,
  readMarkdownAsset,
  writeJsonAsset,
  writeMarkdownAsset,
} from './io.js';
import { projectPaths } from './paths.js';
import {
  renderCharacterBody,
  renderRelationshipsBody,
} from './character-render.js';

// =============================================================================
//  Path helpers
// =============================================================================

/**
 * Resolve the on-disk path for a single character card.
 *   protagonist-<slug>.md   →  characters/protagonist-<slug>.md
 *   antagonist-<slug>.md    →  characters/antagonists/antagonist-<slug>.md
 *   supporting-<slug>.md    →  characters/supporting/supporting-<slug>.md
 *   minor-<slug>.md         →  characters/supporting/minor-<slug>.md
 */
export function characterFilePath(
  root: string,
  role: CharacterRole,
  slug: string,
): string {
  const p = projectPaths(root);
  switch (role) {
    case 'protagonist':
      return join(p.characters.dir, `protagonist-${slug}.md`);
    case 'antagonist':
      return join(p.characters.antagonists, `antagonist-${slug}.md`);
    case 'supporting':
      return join(p.characters.supporting, `supporting-${slug}.md`);
    case 'minor':
      return join(p.characters.supporting, `minor-${slug}.md`);
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/** Build a character ID from role + slug (matches the asset_id regex). */
export function buildCharacterId(role: CharacterRole, slug: string): string {
  return `${role}-${slug}`;
}

/** Slug derived from a free-form name (Chinese-friendly fallback). */
export function characterSlug(name: string, fallback = 'unnamed'): string {
  return slugify(name, fallback);
}

/** File path relative to characters/ — used as the `file` field in the index. */
function indexFilePathFor(role: CharacterRole, slug: string): string {
  switch (role) {
    case 'protagonist':
      return `protagonist-${slug}.md`;
    case 'antagonist':
      return `antagonists/antagonist-${slug}.md`;
    case 'supporting':
      return `supporting/supporting-${slug}.md`;
    case 'minor':
      return `supporting/minor-${slug}.md`;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

// =============================================================================
//  Index (JSON canonical)
// =============================================================================

export function characterIndexExists(root: string): boolean {
  return existsSync(projectPaths(root).characters.index);
}

export async function readCharacterIndex(root: string): Promise<TCharacterIndex> {
  return readJsonAsset(projectPaths(root).characters.index, CharacterIndex);
}

export async function writeCharacterIndex(
  root: string,
  index: TCharacterIndex,
): Promise<TCharacterIndex> {
  const next: TCharacterIndex = {
    ...index,
    updated_at: nowISO(),
    version: index.version + 1,
  };
  await writeJsonAsset(
    projectPaths(root).characters.index,
    CharacterIndex,
    next,
  );
  return next;
}

export function buildInitialCharacterIndex(): TCharacterIndex {
  const ts = nowISO();
  const data: TCharacterIndexData = CharacterIndexData.parse({
    protagonist: [],
    antagonists: [],
    supporting: [],
    minor: [],
  });
  return CharacterIndex.parse({
    schema_version: '1.0',
    asset_type: 'character-index',
    asset_id: 'characters-index',
    created_at: ts,
    updated_at: ts,
    version: 1,
    data,
  });
}

/**
 * Idempotent upsert of a character entry into the index.
 * Dedupes by `id`. Does NOT bump version (caller decides via writeCharacterIndex).
 */
export function upsertIndexEntry(
  index: TCharacterIndex,
  role: CharacterRole,
  entry: { id: string; name: string; file: string; first_appear_chapter: number; tier: CharacterTier },
): TCharacterIndex {
  // Cheap deep clone via JSON (entries are plain JSON-serializable shapes).
  const cloned = JSON.parse(JSON.stringify(index)) as TCharacterIndex;
  const bucket = bucketForRole(cloned.data, role);
  const filtered = bucket.filter((e: { id: string }) => e.id !== entry.id);
  // Push the typed-narrowed entry.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filtered.push(entry as any);
  setBucketForRole(cloned.data, role, filtered);
  return cloned;
}

/** Same shape, but for minor — accepts the literal-tier entry. */
function bucketForRole(
  data: TCharacterIndexData,
  role: CharacterRole,
): Array<{ id: string; name: string; file: string; first_appear_chapter: number; tier: string }> {
  switch (role) {
    case 'protagonist':
      return data.protagonist as unknown as Array<{
        id: string; name: string; file: string; first_appear_chapter: number; tier: string;
      }>;
    case 'antagonist':
      return data.antagonists as unknown as Array<{
        id: string; name: string; file: string; first_appear_chapter: number; tier: string;
      }>;
    case 'supporting':
      return data.supporting as unknown as Array<{
        id: string; name: string; file: string; first_appear_chapter: number; tier: string;
      }>;
    case 'minor':
      return data.minor as unknown as Array<{
        id: string; name: string; file: string; first_appear_chapter: number; tier: string;
      }>;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function setBucketForRole(
  data: TCharacterIndexData,
  role: CharacterRole,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: any[],
): void {
  switch (role) {
    case 'protagonist':
      data.protagonist = list;
      break;
    case 'antagonist':
      data.antagonists = list;
      break;
    case 'supporting':
      data.supporting = list;
      break;
    case 'minor':
      data.minor = list;
      break;
    default: {
      const _exhaustive: never = role;
      void _exhaustive;
    }
  }
}

/** Total count of characters across all role buckets. */
export function indexCount(index: TCharacterIndex): number {
  return (
    index.data.protagonist.length +
    index.data.antagonists.length +
    index.data.supporting.length +
    index.data.minor.length
  );
}

// =============================================================================
//  Single character card (MD canonical)
// =============================================================================

export interface WriteCharacterArgs {
  root: string;
  role: CharacterRole;
  /** Free-form display name (can be Chinese). */
  name: string;
  /** Existing slug to keep, otherwise derived from name. */
  slug?: string;
  tier: CharacterTier;
  data: CharacterData;
  status?: AssetStatus;
  /** Existing card metadata (for version bump). If omitted, treat as new. */
  existing?: {
    created_at: string;
    version: number;
  };
}

export interface WriteCharacterResult {
  filePath: string;
  /** Path relative to characters/ (for index `file` field). */
  indexFile: string;
  slug: string;
  id: string;
  version: number;
}

export async function writeCharacter(args: WriteCharacterArgs): Promise<WriteCharacterResult> {
  const slug = args.slug ?? characterSlug(args.name);
  const id = buildCharacterId(args.role, slug);
  const path = characterFilePath(args.root, args.role, slug);
  const indexFile = indexFilePathFor(args.role, slug);
  const ts = nowISO();
  const created_at = args.existing?.created_at ?? ts;
  const version = (args.existing?.version ?? 0) + 1;
  const status: AssetStatus = args.status ?? 'drafting';

  const fm = CharacterFrontmatter.parse({
    asset_type: 'character',
    asset_id: id,
    character_role: args.role,
    character_tier: args.tier,
    created_at,
    updated_at: ts,
    version,
    status,
    maintained_by: 'novel-character-atelier',
  });

  const body = renderCharacterBody({
    name: args.name,
    role: args.role,
    tier: args.tier,
    data: args.data,
  });

  await writeMarkdownAsset(path, CharacterFrontmatter, { frontmatter: fm, body });
  return { filePath: path, indexFile, slug, id, version };
}

/**
 * Read a character card's frontmatter (the body is opaque post-write, so this
 * only validates / returns frontmatter + raw body for display).
 */
export async function readCharacterCard(
  root: string,
  role: CharacterRole,
  slug: string,
): Promise<{ frontmatter: ReturnType<typeof CharacterFrontmatter.parse>; body: string }> {
  const path = characterFilePath(root, role, slug);
  return readMarkdownAsset(path, CharacterFrontmatter);
}

export function characterCardExists(
  root: string,
  role: CharacterRole,
  slug: string,
): boolean {
  return existsSync(characterFilePath(root, role, slug));
}

/** Convenience: lookup an index entry's role-bucket by id (returns role + entry). */
export function findIndexEntry(
  index: TCharacterIndex,
  id: string,
): { role: CharacterRole; entry: { id: string; name: string; file: string; first_appear_chapter: number; tier: string } } | null {
  for (const role of ['protagonist', 'antagonist', 'supporting', 'minor'] as CharacterRole[]) {
    const bucket = bucketForRole(index.data, role);
    const found = bucket.find((e: { id: string }) => e.id === id);
    if (found) return { role, entry: found };
  }
  return null;
}

/**
 * Convert an index `file` field (relative to characters/) into an absolute
 * path. Used by `character show <id>`.
 */
export function indexFileAbsolute(root: string, indexFile: string): string {
  return join(projectPaths(root).characters.dir, indexFile);
}

/** Inverse helper for tests: turn an absolute card path into the index `file` field. */
export function indexFileFor(root: string, absoluteFile: string): string {
  return relative(projectPaths(root).characters.dir, absoluteFile);
}

// =============================================================================
//  Relationships (MD canonical)
// =============================================================================

export function relationshipsExists(root: string): boolean {
  return existsSync(projectPaths(root).characters.relationships);
}

export async function readRelationships(
  root: string,
): Promise<{ frontmatter: ReturnType<typeof RelationshipsFrontmatter.parse>; body: string }> {
  return readMarkdownAsset(projectPaths(root).characters.relationships, RelationshipsFrontmatter);
}

export interface WriteRelationshipsArgs {
  data: TRelationshipsData;
  status?: AssetStatus;
  existing?: {
    created_at: string;
    version: number;
  };
}

export async function writeRelationships(
  root: string,
  args: WriteRelationshipsArgs,
): Promise<{ version: number }> {
  const ts = nowISO();
  const created_at = args.existing?.created_at ?? ts;
  const version = (args.existing?.version ?? 0) + 1;
  const status: AssetStatus = args.status ?? 'drafting';

  // Validate data first.
  const data = RelationshipsData.parse(args.data);

  const fm = RelationshipsFrontmatter.parse({
    asset_type: 'characters-relationships',
    asset_id: 'relationships-main',
    created_at,
    updated_at: ts,
    version,
    status,
    maintained_by: 'novel-character-atelier',
  });

  const body = renderRelationshipsBody(data);
  await writeMarkdownAsset(
    projectPaths(root).characters.relationships,
    RelationshipsFrontmatter,
    { frontmatter: fm, body },
  );
  return { version };
}

export function buildInitialRelationshipsData(): TRelationshipsData {
  return RelationshipsData.parse({ relationships: [] });
}

// =============================================================================
//  Aggregate status
// =============================================================================

export interface CharactersStatus {
  hasIndex: boolean;
  hasProtagonist: boolean;
  /** True iff index file exists AND at least one protagonist entry is registered. */
  ready: boolean;
  totalCount: number;
  protagonistCount: number;
  antagonistCount: number;
  supportingCount: number;
  minorCount: number;
}

export async function charactersStatus(root: string): Promise<CharactersStatus> {
  const hasIndex = characterIndexExists(root);
  if (!hasIndex) {
    return {
      hasIndex: false,
      hasProtagonist: false,
      ready: false,
      totalCount: 0,
      protagonistCount: 0,
      antagonistCount: 0,
      supportingCount: 0,
      minorCount: 0,
    };
  }
  let index: TCharacterIndex;
  try {
    index = await readCharacterIndex(root);
  } catch {
    return {
      hasIndex: true,
      hasProtagonist: false,
      ready: false,
      totalCount: 0,
      protagonistCount: 0,
      antagonistCount: 0,
      supportingCount: 0,
      minorCount: 0,
    };
  }
  const protagonistCount = index.data.protagonist.length;
  const hasProtagonist = protagonistCount > 0;
  // ready := index has at least 1 protagonist whose card file actually exists
  let ready = false;
  if (hasProtagonist) {
    ready = index.data.protagonist.every((e: { file: string }) =>
      existsSync(indexFileAbsolute(root, e.file)),
    );
  }
  return {
    hasIndex: true,
    hasProtagonist,
    ready,
    totalCount: indexCount(index),
    protagonistCount,
    antagonistCount: index.data.antagonists.length,
    supportingCount: index.data.supporting.length,
    minorCount: index.data.minor.length,
  };
}

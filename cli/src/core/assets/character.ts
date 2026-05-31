/**
 * Read / write helpers for the character-atelier assets:
 *   - characters/<role>-<slug>.{json,md}   (one card per character)
 *   - characters/_index.json               (registry)
 *   - characters/relationships.{json,md}    (relationship graph)
 *
 * Same contract as the alpha-2a worldforge assets:
 *   - JSON file is canonical (validated against full schema)
 *   - MD file is a re-rendered projection
 *   - On write: validate JSON → atomic JSON write → render MD → atomic MD write
 *   - On read: only read JSON; MD existence is incidental
 *   - frontmatter status is mirrored in MD via the `status` arg
 *
 * The _index.json is the only character asset that is JSON-only (no projection):
 * it is itself the machine-readable registry.
 */
import { existsSync } from 'node:fs';
import {
  Character,
  CharacterFrontmatter,
  CharacterIndex,
  Relationships,
  RelationshipsFrontmatter,
  indexBucketForRole,
  type Character as TCharacter,
  type CharacterData,
  type CharacterIndex as TCharacterIndex,
  type CharacterIndexData,
  type CharacterIndexEntry,
  type CharacterRole,
  type CharacterTier,
  type Relationships as TRelationships,
} from '../schemas/character.js';
import type { AssetStatus } from '../schemas/common.js';
import { NovelError } from '../utils/errors.js';
import { slugify } from '../utils/id.js';
import { nowISO } from '../utils/time.js';
import { renderCharacterBody, renderRelationshipsBody } from './character-render.js';
import { readJsonAsset, writeJsonAsset, writeMarkdownAsset } from './io.js';
import { characterCardPaths, projectPaths } from './paths.js';

// =============================================================================
//  ID helpers
// =============================================================================

/** Split a character asset_id ("<role>-<slug>") into role + slug. */
export function parseCharacterId(id: string): { role: CharacterRole; slug: string } {
  const m = id.match(/^(protagonist|antagonist|supporting|minor)-(.+)$/);
  if (!m || !m[1] || !m[2]) {
    throw new NovelError(`非法的角色 ID：${id}（应为 <role>-<slug>）`);
  }
  return { role: m[1] as CharacterRole, slug: m[2] };
}

/**
 * Derive a unique character id from a name (or explicit slug), avoiding
 * collisions with the ids already present in `existing`.
 *
 * Chinese-only names have no ASCII content, so `slugify` returns the `'role'`
 * fallback (producing e.g. `protagonist-role`). That fallback is mostly
 * defensive — the build / add workflows prompt for and validate an explicit
 * pinyin/ascii slug before calling this, so a meaningful id is the norm.
 */
export function deriveCharacterId(
  role: CharacterRole,
  nameOrSlug: string,
  existing: ReadonlySet<string>,
): string {
  const baseSlug = slugify(nameOrSlug, 'role');
  let candidate = `${role}-${baseSlug}`;
  if (!existing.has(candidate)) return candidate;
  for (let i = 2; i < 1000; i++) {
    candidate = `${role}-${baseSlug}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  // Extremely unlikely; keep types happy.
  return `${role}-${baseSlug}-${Date.now()}`;
}

// =============================================================================
//  Character card
// =============================================================================

export function characterCardExists(root: string, id: string): boolean {
  const { role, slug } = parseCharacterId(id);
  return existsSync(characterCardPaths(root, role, slug).json);
}

export async function readCharacter(root: string, id: string): Promise<TCharacter> {
  const { role, slug } = parseCharacterId(id);
  return readJsonAsset(characterCardPaths(root, role, slug).json, Character);
}

/**
 * Validate + atomically write both <role>-<slug>.json (canonical) and .md
 * (projection). Bumps version + updated_at. `status` controls the MD frontmatter.
 */
export async function writeCharacter(
  root: string,
  character: TCharacter,
  status: AssetStatus = 'drafting',
): Promise<TCharacter> {
  const { role, slug } = parseCharacterId(character.asset_id);
  if (role !== character.data.role) {
    throw new NovelError(
      `角色 asset_id 前缀 (${role}) 与 data.role (${character.data.role}) 不一致：${character.asset_id}`,
    );
  }
  const next: TCharacter = {
    ...character,
    updated_at: nowISO(),
    version: character.version + 1,
  };
  const paths = characterCardPaths(root, role, slug);
  await writeJsonAsset(paths.json, Character, next);
  await writeMarkdownAsset(paths.md, CharacterFrontmatter, {
    frontmatter: CharacterFrontmatter.parse({
      asset_type: 'character',
      asset_id: next.asset_id,
      character_role: next.data.role,
      created_at: next.created_at,
      updated_at: next.updated_at,
      version: next.version,
      status,
      maintained_by: 'novel-character-atelier',
    }),
    body: renderCharacterBody(next.data),
  });
  return next;
}

/**
 * Build a minimal schema-valid Character skeleton. Required fields (one_liner,
 * personality_core) get obvious `<...>` placeholders the build workflow / approve
 * check will reject until filled.
 */
export function buildInitialCharacter(
  role: CharacterRole,
  tier: CharacterTier,
  name: string,
  slug: string,
): TCharacter {
  const ts = nowISO();
  const data: CharacterData = {
    name,
    role,
    tier,
    first_appear_chapter: 1,
    one_liner: '<待填一句话画像>',
    profile: { age: '', origin: '', appearance: [], attire: '' },
    personality_core: {
      core_drive: '<待填核心驱动>',
      decision_pattern: '<待填决策模式>',
      emotional_anchors: [],
    },
    ability_curve: [],
    signature_details: [],
    relationship_pointers: [],
    arc_design: [],
    forbidden_writing: [],
  };
  return Character.parse({
    schema_version: '1.0',
    asset_type: 'character',
    asset_id: `${role}-${slug}`,
    created_at: ts,
    updated_at: ts,
    version: 1,
    data,
  });
}

// =============================================================================
//  Character index (_index.json)
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
  await writeJsonAsset(projectPaths(root).characters.index, CharacterIndex, next);
  return next;
}

export function buildInitialCharacterIndex(): TCharacterIndex {
  const ts = nowISO();
  return CharacterIndex.parse({
    schema_version: '1.0',
    asset_type: 'character-index',
    asset_id: 'characters-index',
    created_at: ts,
    updated_at: ts,
    version: 1,
    data: { protagonist: [], antagonists: [], supporting: [], minor: [] },
  });
}

/** Collect every character id across all index buckets. */
export function allIndexIds(data: CharacterIndexData): Set<string> {
  const ids = new Set<string>();
  for (const e of [
    ...data.protagonist,
    ...data.antagonists,
    ...data.supporting,
    ...data.minor,
  ]) {
    ids.add(e.id);
  }
  return ids;
}

/**
 * Pure helper: insert/replace an index entry in the bucket for `role`, sorted by
 * first_appear_chapter then id. Returns a new CharacterIndexData.
 */
export function upsertIndexEntry(
  data: CharacterIndexData,
  role: CharacterRole,
  entry: CharacterIndexEntry,
): CharacterIndexData {
  const bucket = indexBucketForRole(role);
  const list = data[bucket].filter((e) => e.id !== entry.id);
  list.push(entry);
  list.sort(
    (a, b) => a.first_appear_chapter - b.first_appear_chapter || a.id.localeCompare(b.id),
  );
  return { ...data, [bucket]: list };
}

/**
 * Read the index (or start a fresh one), upsert the entry for `character`, and
 * write it back. Returns the written index.
 */
export async function registerCharacterInIndex(
  root: string,
  character: TCharacter,
): Promise<TCharacterIndex> {
  const index = characterIndexExists(root)
    ? await readCharacterIndex(root)
    : buildInitialCharacterIndex();
  const { role, slug } = parseCharacterId(character.asset_id);
  const entry: CharacterIndexEntry = {
    id: character.asset_id,
    name: character.data.name,
    file: characterCardPaths(root, role, slug).relFile,
    first_appear_chapter: character.data.first_appear_chapter,
    tier: character.data.tier,
  };
  const nextData = upsertIndexEntry(index.data, role, entry);
  return writeCharacterIndex(root, { ...index, data: nextData });
}

// =============================================================================
//  Relationships
// =============================================================================

export function relationshipsExists(root: string): boolean {
  return existsSync(projectPaths(root).characters.relationshipsJson);
}

export async function readRelationships(root: string): Promise<TRelationships> {
  return readJsonAsset(projectPaths(root).characters.relationshipsJson, Relationships);
}

export async function writeRelationships(
  root: string,
  rel: TRelationships,
  status: AssetStatus = 'drafting',
): Promise<TRelationships> {
  const next: TRelationships = {
    ...rel,
    updated_at: nowISO(),
    version: rel.version + 1,
  };
  const p = projectPaths(root);
  await writeJsonAsset(p.characters.relationshipsJson, Relationships, next);
  await writeMarkdownAsset(p.characters.relationships, RelationshipsFrontmatter, {
    frontmatter: RelationshipsFrontmatter.parse({
      asset_type: 'characters-relationships',
      asset_id: 'relationships-main',
      created_at: next.created_at,
      updated_at: next.updated_at,
      version: next.version,
      status,
      maintained_by: 'novel-character-atelier',
    }),
    body: renderRelationshipsBody(next.data),
  });
  return next;
}

export function buildInitialRelationships(): TRelationships {
  const ts = nowISO();
  return Relationships.parse({
    schema_version: '1.0',
    asset_type: 'characters-relationships',
    asset_id: 'relationships-main',
    created_at: ts,
    updated_at: ts,
    version: 1,
    data: { edges: [] },
  });
}

// =============================================================================
//  Aggregate status
// =============================================================================

export interface CharactersStatus {
  hasIndex: boolean;
  hasProtagonist: boolean;
  antagonistCount: number;
  supportingCount: number;
  minorCount: number;
  hasRelationships: boolean;
  /** Total cards registered in the index. */
  total: number;
}

/**
 * Aggregate the character stage status from the index (canonical registry).
 * Returns all-empty when the index doesn't exist yet.
 */
export async function charactersStatus(root: string): Promise<CharactersStatus> {
  if (!characterIndexExists(root)) {
    return {
      hasIndex: false,
      hasProtagonist: false,
      antagonistCount: 0,
      supportingCount: 0,
      minorCount: 0,
      hasRelationships: relationshipsExists(root),
      total: 0,
    };
  }
  const index = await readCharacterIndex(root);
  const d = index.data;
  return {
    hasIndex: true,
    hasProtagonist: d.protagonist.length > 0,
    antagonistCount: d.antagonists.length,
    supportingCount: d.supporting.length,
    minorCount: d.minor.length,
    hasRelationships: relationshipsExists(root),
    total:
      d.protagonist.length + d.antagonists.length + d.supporting.length + d.minor.length,
  };
}

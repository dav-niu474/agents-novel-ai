/**
 * Tests for core/assets/character.ts:
 *   - characterFilePath / buildCharacterId / characterSlug routing per role
 *   - buildInitial* produce schema-valid skeletons
 *   - upsertIndexEntry idempotency + overwrite
 *   - writeCharacter persists .md and bumps version
 *   - readCharacterIndex / writeCharacterIndex roundtrip
 *   - charactersStatus aggregator transitions
 *   - readCharacterCard frontmatter post-write
 *   - relationships.md write/read cycle
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildCharacterId,
  buildInitialCharacterIndex,
  buildInitialRelationshipsData,
  characterCardExists,
  characterFilePath,
  characterIndexExists,
  characterSlug,
  charactersStatus,
  findIndexEntry,
  indexFileAbsolute,
  indexFileFor,
  readCharacterCard,
  readCharacterIndex,
  readRelationships,
  relationshipsExists,
  upsertIndexEntry,
  writeCharacter,
  writeCharacterIndex,
  writeRelationships,
} from '../src/core/assets/character.js';
import { buildInitialNovel } from '../src/core/assets/novel.js';
import { projectPaths } from '../src/core/assets/paths.js';
import { scaffoldProject } from '../src/core/assets/scaffold.js';
import {
  CharacterFrontmatter,
  CharacterIndex,
  RelationshipsFrontmatter,
  type CharacterData as TCharacterData,
} from '../src/core/schemas/character.js';
import { makeTmpDir, rmTmpDir } from './helpers.js';

async function freshProject(dir: string): Promise<void> {
  const novel = buildInitialNovel({
    title: '测试',
    genre: ['xuanhuan'],
    platform_target: ['qidian'],
  });
  await scaffoldProject({ root: dir, novel });
}

function sampleData(overrides: Partial<TCharacterData> = {}): TCharacterData {
  return {
    one_line_portrait: '主角林烬，废柴翻身。',
    basic_profile: {
      age: '原身 16 / 穿越者 25',
      origin: '青云宗外门',
      appearance: ['清瘦', '左眉有疤', '眼神温和'],
      clothing_style: '青布弟子服',
    },
    personality_core: {
      core_drive: '想活下去 + 想知道残卷的来源',
      decision_pattern: '先观察后行动',
      emotional_anchors: ['对师妹有保护欲', '看到现代物会怔住'],
    },
    ability_curve: [
      { chapter: 1, stage: '炼气一层', context: '被欺凌' },
      { chapter: 30, stage: '炼气七层', context: '反杀' },
    ],
    signature_details: [
      '把残卷贴身藏在胸口',
      '说话前停顿半秒',
      '不喝酒，反感烟味',
    ],
    relationships: [
      { character_id: 'supporting-su-wanrou', relation_type: '师妹 / 朦胧情线' },
    ],
    arc_design: [
      { volume: '第 1 卷', description: '从受害者到反击者' },
    ],
    prohibited: [
      '突然变成口出狂言的少年豪侠',
      '在 50 章前能解析金丹功法',
    ],
    ...overrides,
  };
}

// =============================================================================
//  Path / ID helpers
// =============================================================================

describe('characterFilePath', () => {
  it('protagonist routes to characters/protagonist-<slug>.md', () => {
    const root = '/tmp/x';
    expect(characterFilePath(root, 'protagonist', 'lin-jin')).toBe(
      '/tmp/x/characters/protagonist-lin-jin.md',
    );
  });

  it('antagonist routes to characters/antagonists/antagonist-<slug>.md', () => {
    const root = '/tmp/x';
    expect(characterFilePath(root, 'antagonist', 'zhao-tianxiao')).toBe(
      '/tmp/x/characters/antagonists/antagonist-zhao-tianxiao.md',
    );
  });

  it('supporting routes to characters/supporting/supporting-<slug>.md', () => {
    const root = '/tmp/x';
    expect(characterFilePath(root, 'supporting', 'su-wanrou')).toBe(
      '/tmp/x/characters/supporting/supporting-su-wanrou.md',
    );
  });

  it('minor routes to characters/supporting/minor-<slug>.md', () => {
    const root = '/tmp/x';
    expect(characterFilePath(root, 'minor', 'innkeeper')).toBe(
      '/tmp/x/characters/supporting/minor-innkeeper.md',
    );
  });
});

describe('buildCharacterId', () => {
  it('joins role + slug', () => {
    expect(buildCharacterId('protagonist', 'lin-jin')).toBe('protagonist-lin-jin');
    expect(buildCharacterId('antagonist', 'zhao-tianxiao')).toBe('antagonist-zhao-tianxiao');
  });
});

describe('characterSlug', () => {
  it('slugifies ASCII names', () => {
    expect(characterSlug('Lin Jin')).toBe('lin-jin');
  });

  it('falls back for all-Chinese names', () => {
    expect(characterSlug('林烬')).toBe('unnamed');
    expect(characterSlug('林烬', 'protagonist')).toBe('protagonist');
  });
});

// =============================================================================
//  buildInitial*
// =============================================================================

describe('buildInitial*', () => {
  it('buildInitialCharacterIndex passes its own schema', () => {
    const idx = buildInitialCharacterIndex();
    expect(CharacterIndex.safeParse(idx).success).toBe(true);
    expect(idx.data.protagonist).toEqual([]);
  });

  it('buildInitialRelationshipsData returns an empty list', () => {
    const r = buildInitialRelationshipsData();
    expect(r.relationships).toEqual([]);
  });
});

// =============================================================================
//  Index roundtrip
// =============================================================================

describe('CharacterIndex IO + upsert', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('characterIndexExists is false on fresh project', () => {
    expect(characterIndexExists(dir)).toBe(false);
  });

  it('writeCharacterIndex bumps version + sets updated_at', async () => {
    const initial = buildInitialCharacterIndex();
    expect(initial.version).toBe(1);
    const written = await writeCharacterIndex(dir, initial);
    expect(written.version).toBe(2);
    expect(characterIndexExists(dir)).toBe(true);

    const back = await readCharacterIndex(dir);
    expect(back.version).toBe(2);
  });

  it('upsertIndexEntry de-dupes by id', () => {
    let idx = buildInitialCharacterIndex();
    idx = upsertIndexEntry(idx, 'antagonist', {
      id: 'antagonist-foo',
      name: 'Foo',
      file: 'antagonists/antagonist-foo.md',
      first_appear_chapter: 5,
      tier: 'early',
    });
    expect(idx.data.antagonists.length).toBe(1);

    // Re-insert with new tier — should overwrite, not append.
    idx = upsertIndexEntry(idx, 'antagonist', {
      id: 'antagonist-foo',
      name: 'Foo Renamed',
      file: 'antagonists/antagonist-foo.md',
      first_appear_chapter: 5,
      tier: 'mid',
    });
    expect(idx.data.antagonists.length).toBe(1);
    expect(idx.data.antagonists[0]!.tier).toBe('mid');
    expect(idx.data.antagonists[0]!.name).toBe('Foo Renamed');
  });

  it('findIndexEntry locates an entry by id across buckets', () => {
    let idx = buildInitialCharacterIndex();
    idx = upsertIndexEntry(idx, 'protagonist', {
      id: 'protagonist-lin-jin',
      name: '林烬',
      file: 'protagonist-lin-jin.md',
      first_appear_chapter: 1,
      tier: 'protagonist',
    });
    idx = upsertIndexEntry(idx, 'supporting', {
      id: 'supporting-su-wanrou',
      name: '苏婉柔',
      file: 'supporting/supporting-su-wanrou.md',
      first_appear_chapter: 1,
      tier: 'core',
    });
    const found = findIndexEntry(idx, 'supporting-su-wanrou');
    expect(found).not.toBeNull();
    expect(found!.role).toBe('supporting');
    expect(found!.entry.name).toBe('苏婉柔');

    expect(findIndexEntry(idx, 'antagonist-nope')).toBeNull();
  });
});

// =============================================================================
//  writeCharacter
// =============================================================================

describe('writeCharacter', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('persists protagonist .md with version=1 and frontmatter intact', async () => {
    const result = await writeCharacter({
      root: dir,
      role: 'protagonist',
      name: 'Lin Jin',
      tier: 'protagonist',
      data: sampleData(),
    });
    expect(result.id).toBe('protagonist-lin-jin');
    expect(result.indexFile).toBe('protagonist-lin-jin.md');
    expect(result.version).toBe(1);
    expect(existsSync(result.filePath)).toBe(true);

    const card = await readCharacterCard(dir, 'protagonist', 'lin-jin');
    expect(card.frontmatter.character_role).toBe('protagonist');
    expect(card.frontmatter.character_tier).toBe('protagonist');
    expect(card.frontmatter.asset_id).toBe('protagonist-lin-jin');
    expect(card.frontmatter.version).toBe(1);
    expect(card.frontmatter.status).toBe('drafting');

    // Body should contain key section headings.
    expect(card.body).toContain('## 1. 一句话画像');
    expect(card.body).toContain('## 3. 性格内核');
    expect(card.body).toContain('## 8. 禁止写法');
    expect(card.body).toContain('林烬');
    expect(card.body).toContain('被欺凌'); // ability_curve context
    expect(card.body).toContain('师妹 / 朦胧情线'); // relationship pointer
  });

  it('persists antagonist with tier=early into antagonists/ subdirectory', async () => {
    await writeCharacter({
      root: dir,
      role: 'antagonist',
      name: 'Zhao Tian Xiao',
      tier: 'early',
      data: sampleData(),
    });
    const p = projectPaths(dir);
    expect(existsSync(`${p.characters.antagonists}/antagonist-zhao-tian-xiao.md`)).toBe(true);
  });

  it('overwrites with version+1 and preserves created_at when existing is supplied', async () => {
    const r1 = await writeCharacter({
      root: dir,
      role: 'protagonist',
      name: 'Foo',
      tier: 'protagonist',
      data: sampleData(),
    });
    const card1 = await readCharacterCard(dir, 'protagonist', 'foo');

    // Wait a millisecond so updated_at diverges (some filesystems cache mtimes).
    await new Promise((r) => setTimeout(r, 10));

    const r2 = await writeCharacter({
      root: dir,
      role: 'protagonist',
      name: 'Foo',
      slug: 'foo',
      tier: 'protagonist',
      data: sampleData({ one_line_portrait: '改写后的一句话画像。' }),
      existing: {
        created_at: card1.frontmatter.created_at,
        version: card1.frontmatter.version,
      },
    });
    expect(r2.version).toBe(r1.version + 1);

    const card2 = await readCharacterCard(dir, 'protagonist', 'foo');
    expect(card2.frontmatter.created_at).toBe(card1.frontmatter.created_at);
    expect(card2.frontmatter.version).toBe(2);
    expect(card2.body).toContain('改写后的一句话画像');
  });

  it('rejects writes when CharacterData fails schema (missing emotional_anchors)', async () => {
    const bad = sampleData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bad.personality_core as any).emotional_anchors = [];
    await expect(
      writeCharacter({
        root: dir,
        role: 'protagonist',
        name: 'Bad',
        tier: 'protagonist',
        data: bad,
      }),
    ).rejects.toThrow();
  });

  it('characterCardExists reports correctly', async () => {
    expect(characterCardExists(dir, 'protagonist', 'foo')).toBe(false);
    await writeCharacter({
      root: dir,
      role: 'protagonist',
      name: 'Foo',
      tier: 'protagonist',
      data: sampleData(),
    });
    expect(characterCardExists(dir, 'protagonist', 'foo')).toBe(true);
  });
});

// =============================================================================
//  charactersStatus
// =============================================================================

describe('charactersStatus', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('reports hasIndex=false on fresh project', async () => {
    const s = await charactersStatus(dir);
    expect(s.hasIndex).toBe(false);
    expect(s.ready).toBe(false);
    expect(s.totalCount).toBe(0);
  });

  it('reports hasIndex=true but ready=false when index has no protagonist', async () => {
    await writeCharacterIndex(dir, buildInitialCharacterIndex());
    const s = await charactersStatus(dir);
    expect(s.hasIndex).toBe(true);
    expect(s.hasProtagonist).toBe(false);
    expect(s.ready).toBe(false);
  });

  it('reports ready=true when protagonist card + index entry both exist', async () => {
    await writeCharacter({
      root: dir,
      role: 'protagonist',
      name: 'Foo',
      tier: 'protagonist',
      data: sampleData(),
    });
    let idx = buildInitialCharacterIndex();
    idx = upsertIndexEntry(idx, 'protagonist', {
      id: 'protagonist-foo',
      name: 'Foo',
      file: 'protagonist-foo.md',
      first_appear_chapter: 1,
      tier: 'protagonist',
    });
    await writeCharacterIndex(dir, idx);

    const s = await charactersStatus(dir);
    expect(s.hasIndex).toBe(true);
    expect(s.hasProtagonist).toBe(true);
    expect(s.ready).toBe(true);
    expect(s.totalCount).toBe(1);
    expect(s.protagonistCount).toBe(1);
  });

  it('reports ready=false when index references missing card file', async () => {
    let idx = buildInitialCharacterIndex();
    idx = upsertIndexEntry(idx, 'protagonist', {
      id: 'protagonist-ghost',
      name: 'Ghost',
      file: 'protagonist-ghost.md', // file never written
      first_appear_chapter: 1,
      tier: 'protagonist',
    });
    await writeCharacterIndex(dir, idx);
    const s = await charactersStatus(dir);
    expect(s.ready).toBe(false);
    expect(s.hasProtagonist).toBe(true);
  });
});

// =============================================================================
//  Index file path helpers
// =============================================================================

describe('indexFileFor / indexFileAbsolute (inverse pair)', () => {
  it('roundtrips a relative file through absolute and back', () => {
    const root = '/tmp/x';
    const rel = 'antagonists/antagonist-foo.md';
    const abs = indexFileAbsolute(root, rel);
    expect(abs).toBe('/tmp/x/characters/antagonists/antagonist-foo.md');
    expect(indexFileFor(root, abs)).toBe(rel);
  });
});

// =============================================================================
//  Relationships
// =============================================================================

describe('writeRelationships / readRelationships', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('writes a fresh relationships.md and bumps version', async () => {
    const data = {
      relationships: [
        {
          from: 'protagonist-foo',
          to: 'antagonist-bar',
          relation_type: '仇人',
          strength: 4,
          group: 'protagonist' as const,
          notes: [{ chapter: 1, event: '欺凌' }],
        },
      ],
    };
    const r1 = await writeRelationships(dir, { data });
    expect(r1.version).toBe(1);
    expect(relationshipsExists(dir)).toBe(true);

    const back = await readRelationships(dir);
    expect(back.frontmatter.asset_type).toBe('characters-relationships');
    expect(back.frontmatter.asset_id).toBe('relationships-main');
    expect(back.body).toContain('## 主角圈');
    expect(back.body).toContain('protagonist-foo');
    expect(back.body).toContain('强度');

    // Second write with existing → version bumps to 2 and created_at preserved.
    const r2 = await writeRelationships(dir, {
      data,
      existing: { created_at: back.frontmatter.created_at, version: back.frontmatter.version },
    });
    expect(r2.version).toBe(2);
  });

  it('rejects relationships with strength out of range', async () => {
    const bad = {
      relationships: [
        {
          from: 'protagonist-foo',
          to: 'antagonist-bar',
          relation_type: '仇人',
          strength: 99,
          group: 'protagonist' as const,
          notes: [],
        },
      ],
    };
    await expect(writeRelationships(dir, { data: bad })).rejects.toThrow();
  });

  it('renders empty group sections gracefully', async () => {
    await writeRelationships(dir, { data: { relationships: [] } });
    const path = projectPaths(dir).characters.relationships;
    const raw = await readFile(path, 'utf8');
    expect(raw).toContain('# 关系网');
    expect(raw).toContain('暂无关系条目');
  });
});

// =============================================================================
//  Frontmatter sanity (asserts CharacterFrontmatter & RelationshipsFrontmatter
//  remain importable + consistent — guards against accidental shape changes).
// =============================================================================

describe('frontmatter shape sanity', () => {
  it('CharacterFrontmatter accepts a minimal valid object', () => {
    expect(
      CharacterFrontmatter.safeParse({
        asset_type: 'character',
        asset_id: 'protagonist-x',
        character_role: 'protagonist',
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T00:00:00Z',
        version: 1,
        status: 'drafting',
        maintained_by: 'novel-character-atelier',
      }).success,
    ).toBe(true);
  });

  it('RelationshipsFrontmatter accepts a minimal valid object', () => {
    expect(
      RelationshipsFrontmatter.safeParse({
        asset_type: 'characters-relationships',
        asset_id: 'relationships-main',
        created_at: '2026-05-24T00:00:00Z',
        updated_at: '2026-05-24T00:00:00Z',
        version: 1,
        status: 'drafting',
        maintained_by: 'novel-character-atelier',
      }).success,
    ).toBe(true);
  });
});

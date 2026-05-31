/**
 * Tests for core/assets/character.ts:
 *   - buildInitial* produce schema-valid skeletons
 *   - writeCharacter roundtrip (JSON + MD projection, version bump, subdir placement)
 *   - characterCardExists / readCharacter
 *   - index registration + upsert + allIndexIds
 *   - relationships roundtrip
 *   - charactersStatus aggregator
 *   - id helpers: parseCharacterId / deriveCharacterId
 */
import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  allIndexIds,
  buildInitialCharacter,
  buildInitialRelationships,
  charactersStatus,
  characterCardExists,
  characterIndexExists,
  deriveCharacterId,
  parseCharacterId,
  readCharacter,
  readRelationships,
  registerCharacterInIndex,
  relationshipsExists,
  writeCharacter,
  writeRelationships,
} from '../src/core/assets/character.js';
import { buildInitialNovel } from '../src/core/assets/novel.js';
import { characterCardPaths, projectPaths } from '../src/core/assets/paths.js';
import { scaffoldProject } from '../src/core/assets/scaffold.js';
import { Character, Relationships } from '../src/core/schemas/character.js';
import { makeTmpDir, rmTmpDir } from './helpers.js';

async function freshProject(dir: string): Promise<void> {
  const novel = buildInitialNovel({
    title: '测试',
    genre: ['xuanhuan'],
    platform_target: ['qidian'],
  });
  await scaffoldProject({ root: dir, novel });
}

describe('buildInitialCharacter', () => {
  it('returns a schema-valid skeleton with <role>-<slug> id', () => {
    const c = buildInitialCharacter('protagonist', 'protagonist', '林烬', 'lin-jin');
    expect(Character.safeParse(c).success).toBe(true);
    expect(c.asset_id).toBe('protagonist-lin-jin');
    expect(c.data.role).toBe('protagonist');
    expect(c.version).toBe(1);
  });
});

describe('id helpers', () => {
  it('parseCharacterId splits role + slug', () => {
    expect(parseCharacterId('antagonist-zhao-tianxiao')).toEqual({
      role: 'antagonist',
      slug: 'zhao-tianxiao',
    });
  });

  it('parseCharacterId throws on a bad id', () => {
    expect(() => parseCharacterId('bogus')).toThrow();
  });

  it('deriveCharacterId dedupes against existing ids', () => {
    expect(deriveCharacterId('supporting', 'su-wanrou', new Set())).toBe('supporting-su-wanrou');
    expect(deriveCharacterId('antagonist', 'zhao', new Set(['antagonist-zhao']))).toBe(
      'antagonist-zhao-2',
    );
  });

  it('deriveCharacterId falls back for non-ascii names', () => {
    expect(deriveCharacterId('protagonist', '林烬', new Set())).toBe('protagonist-role');
  });
});

describe('writeCharacter roundtrip', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('persists JSON + MD, bumps version, and reads back', async () => {
    const c = buildInitialCharacter('protagonist', 'protagonist', '林烬', 'lin-jin');
    const written = await writeCharacter(dir, c);
    expect(written.version).toBe(2);

    const paths = characterCardPaths(dir, 'protagonist', 'lin-jin');
    expect(existsSync(paths.json)).toBe(true);
    expect(existsSync(paths.md)).toBe(true);

    expect(characterCardExists(dir, 'protagonist-lin-jin')).toBe(true);
    const back = await readCharacter(dir, 'protagonist-lin-jin');
    expect(back.data.name).toBe('林烬');
    expect(back.version).toBe(2);
  });

  it('places antagonist cards under antagonists/ subdir', async () => {
    await writeCharacter(dir, buildInitialCharacter('antagonist', 'early', '赵天霄', 'zhao'));
    const ap = characterCardPaths(dir, 'antagonist', 'zhao');
    expect(ap.json).toContain('antagonists');
    expect(ap.relFile).toBe('antagonists/antagonist-zhao.md');
    expect(existsSync(ap.json)).toBe(true);
  });

  it('places supporting cards under supporting/ subdir', async () => {
    await writeCharacter(dir, buildInitialCharacter('supporting', 'core', '苏婉柔', 'su-wanrou'));
    const sp = characterCardPaths(dir, 'supporting', 'su-wanrou');
    expect(sp.json).toContain('supporting');
    expect(existsSync(sp.json)).toBe(true);
  });

  it('rejects writing when asset_id role prefix mismatches data.role', async () => {
    const c = buildInitialCharacter('protagonist', 'protagonist', 'X', 'x');
    const broken = { ...c, data: { ...c.data, role: 'antagonist' as const } };
    await expect(writeCharacter(dir, broken)).rejects.toThrow();
  });
});

describe('index registration', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('creates the index and places the entry in the right bucket', async () => {
    expect(characterIndexExists(dir)).toBe(false);
    const written = await writeCharacter(
      dir,
      buildInitialCharacter('protagonist', 'protagonist', '林烬', 'lin-jin'),
    );
    const idx = await registerCharacterInIndex(dir, written);
    expect(idx.data.protagonist.length).toBe(1);
    expect(idx.data.protagonist[0]?.id).toBe('protagonist-lin-jin');
    expect(idx.data.protagonist[0]?.file).toBe('protagonist-lin-jin.md');
    expect(characterIndexExists(dir)).toBe(true);
  });

  it('upsert replaces an entry with the same id (no duplicates)', async () => {
    const c = await writeCharacter(dir, buildInitialCharacter('antagonist', 'early', '赵', 'zhao'));
    await registerCharacterInIndex(dir, c);
    const idx2 = await registerCharacterInIndex(dir, await writeCharacter(dir, c));
    expect(idx2.data.antagonists.length).toBe(1);

    const ids = allIndexIds(idx2.data);
    expect(ids.has('antagonist-zhao')).toBe(true);
  });
});

describe('relationships roundtrip', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('persists JSON + MD and bumps version', async () => {
    const rel = buildInitialRelationships();
    expect(Relationships.safeParse(rel).success).toBe(true);
    const written = await writeRelationships(dir, rel);
    expect(written.version).toBe(2);

    const p = projectPaths(dir);
    expect(existsSync(p.characters.relationshipsJson)).toBe(true);
    expect(existsSync(p.characters.relationships)).toBe(true);
    expect(relationshipsExists(dir)).toBe(true);

    const back = await readRelationships(dir);
    expect(back.data.edges).toEqual([]);
  });
});

describe('charactersStatus aggregator', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('reports empty on a fresh project', async () => {
    const st = await charactersStatus(dir);
    expect(st.hasIndex).toBe(false);
    expect(st.hasProtagonist).toBe(false);
    expect(st.total).toBe(0);
  });

  it('counts protagonist / antagonist / relationships after writes', async () => {
    await registerCharacterInIndex(
      dir,
      await writeCharacter(dir, buildInitialCharacter('protagonist', 'protagonist', 'A', 'a')),
    );
    await registerCharacterInIndex(
      dir,
      await writeCharacter(dir, buildInitialCharacter('antagonist', 'early', 'B', 'b')),
    );
    await writeRelationships(dir, buildInitialRelationships());

    const st = await charactersStatus(dir);
    expect(st.hasProtagonist).toBe(true);
    expect(st.antagonistCount).toBe(1);
    expect(st.hasRelationships).toBe(true);
    expect(st.total).toBe(2);
  });
});

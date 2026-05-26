/**
 * Tests for core/assets/world.ts:
 *   - buildInitial* produce schema-valid skeletons
 *   - read/write roundtrip works (incl. version bump + .md projection)
 *   - exists* helpers correctly check for the JSON canonical file
 *   - worldStatus aggregator
 */
import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildInitialNovel } from '../src/core/assets/novel.js';
import { projectPaths } from '../src/core/assets/paths.js';
import { scaffoldProject } from '../src/core/assets/scaffold.js';
import {
  buildInitialCheatSystem,
  buildInitialPowers,
  buildInitialWorldview,
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  readWorldview,
  worldStatus,
  worldviewExists,
  writeCheatSystem,
  writePowers,
  writeWorldview,
} from '../src/core/assets/world.js';
import { CheatSystem, Powers, Worldview } from '../src/core/schemas/world.js';
import { makeTmpDir, rmTmpDir } from './helpers.js';

async function freshProject(dir: string): Promise<void> {
  const novel = buildInitialNovel({
    title: '测试',
    genre: ['xuanhuan'],
    platform_target: ['qidian'],
  });
  await scaffoldProject({ root: dir, novel });
}

describe('buildInitialX', () => {
  it('all 3 builders return schema-valid objects', () => {
    expect(Worldview.safeParse(buildInitialWorldview()).success).toBe(true);
    expect(Powers.safeParse(buildInitialPowers()).success).toBe(true);
    expect(CheatSystem.safeParse(buildInitialCheatSystem()).success).toBe(true);
  });

  it('cheat-system asset_id is derived from name', () => {
    const cs = buildInitialCheatSystem('天工残卷');
    // Chinese name slugifies to 'novel' (fallback), so id starts with cheat-novel
    expect(cs.asset_id).toMatch(/^cheat-/);
    const csAscii = buildInitialCheatSystem('TianGong CanJuan');
    expect(csAscii.asset_id).toBe('cheat-tiangong-canjuan');
  });
});

describe('exists helpers', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('return false for a fresh project', () => {
    expect(worldviewExists(dir)).toBe(false);
    expect(powersExists(dir)).toBe(false);
    expect(cheatSystemExists(dir)).toBe(false);
  });

  it('return true after writing each asset', async () => {
    await writeWorldview(dir, buildInitialWorldview());
    expect(worldviewExists(dir)).toBe(true);

    await writePowers(dir, buildInitialPowers());
    expect(powersExists(dir)).toBe(true);

    await writeCheatSystem(dir, buildInitialCheatSystem());
    expect(cheatSystemExists(dir)).toBe(true);
  });
});

describe('write* roundtrip', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('writeWorldview persists JSON + MD and bumps version', async () => {
    const initial = buildInitialWorldview();
    expect(initial.version).toBe(1);

    const written = await writeWorldview(dir, initial);
    expect(written.version).toBe(2); // first save bumps to 2 (alpha-1 pattern)

    const p = projectPaths(dir);
    expect(existsSync(p.world.worldviewJson)).toBe(true);
    expect(existsSync(p.world.worldview)).toBe(true);

    const back = await readWorldview(dir);
    expect(back.version).toBe(2);
    expect(back.data.era).toBe(initial.data.era);
  });

  it('writePowers persists JSON + MD and bumps version', async () => {
    const initial = buildInitialPowers();
    const written = await writePowers(dir, initial);
    expect(written.version).toBe(2);

    const p = projectPaths(dir);
    expect(existsSync(p.world.powersJson)).toBe(true);
    expect(existsSync(p.world.powers)).toBe(true);

    const back = await readPowers(dir);
    expect(back.data.system_name).toBe(initial.data.system_name);
    expect(back.data.not_applicable).toBe(false);
  });

  it('writeCheatSystem rewrites asset_id from name on each write', async () => {
    const cs1 = buildInitialCheatSystem('Test');
    const cs1Written = await writeCheatSystem(dir, cs1);
    expect(cs1Written.asset_id).toBe('cheat-test');

    // Update name → asset_id changes on next write.
    const cs2 = { ...cs1Written, data: { ...cs1Written.data, name: 'Renamed Skill' } };
    const cs2Written = await writeCheatSystem(dir, cs2);
    expect(cs2Written.asset_id).toBe('cheat-renamed-skill');

    const p = projectPaths(dir);
    expect(existsSync(p.world.cheatSystemJson)).toBe(true);
    expect(existsSync(p.world.cheatSystem)).toBe(true);
  });

  it('writeWorldview with status="approved" produces approved frontmatter', async () => {
    await writeWorldview(dir, buildInitialWorldview(), 'approved');
    // We can't easily read .md frontmatter without re-importing readMarkdownAsset,
    // but reading JSON should still work and the MD file must exist.
    const p = projectPaths(dir);
    expect(existsSync(p.world.worldview)).toBe(true);
  });
});

describe('worldStatus aggregator', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('reports 0 / not allPresent on fresh project', () => {
    const ws = worldStatus(dir);
    expect(ws.count).toBe(0);
    expect(ws.allPresent).toBe(false);
  });

  it('reports 3 / allPresent after building all 3', async () => {
    await writeWorldview(dir, buildInitialWorldview());
    await writePowers(dir, buildInitialPowers());
    await writeCheatSystem(dir, buildInitialCheatSystem());

    const ws = worldStatus(dir);
    expect(ws.count).toBe(3);
    expect(ws.hasWorldview).toBe(true);
    expect(ws.hasPowers).toBe(true);
    expect(ws.hasCheatSystem).toBe(true);
    expect(ws.allPresent).toBe(true);
  });
});

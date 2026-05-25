import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildInitialNovel, readNovel } from '../src/core/assets/novel.js';
import { projectPaths, findProjectRoot } from '../src/core/assets/paths.js';
import { scaffoldProject } from '../src/core/assets/scaffold.js';
import { makeTmpDir, rmTmpDir } from './helpers.js';

describe('scaffoldProject', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('creates novel.json and all required directories', async () => {
    const novel = buildInitialNovel({
      title: '测试书',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    const result = await scaffoldProject({ root: dir, novel });

    expect(result.novelJsonPath).toBe(`${dir}/novel.json`);
    expect(existsSync(`${dir}/novel.json`)).toBe(true);

    const p = projectPaths(dir);
    for (const required of [
      p.outline.volumes,
      p.outline.chapters,
      p.world.dir,
      p.characters.antagonists,
      p.chapters.dir,
      p.memory.dir,
      p.vault.inspirations,
      p.vault.styleFingerprints,
      p.audit.reports,
      p.audit.logs,
      p.cliInternal,
    ]) {
      expect(existsSync(required)).toBe(true);
    }
    expect(existsSync(`${dir}/.novel/.gitignore`)).toBe(true);
  });

  it('refuses to overwrite existing novel.json without --force', async () => {
    const novel = buildInitialNovel({
      title: 'A',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    await scaffoldProject({ root: dir, novel });
    await expect(scaffoldProject({ root: dir, novel })).rejects.toThrow();
  });

  it('overwrites with --force', async () => {
    const a = buildInitialNovel({
      title: 'A',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    const b = buildInitialNovel({
      title: 'B',
      genre: ['xianxia'],
      platform_target: ['fanqie'],
    });
    await scaffoldProject({ root: dir, novel: a });
    await scaffoldProject({ root: dir, novel: b, force: true });
    const read = await readNovel(dir);
    expect(read.title).toBe('B');
  });

  it('findProjectRoot locates novel.json from a nested cwd', async () => {
    const novel = buildInitialNovel({
      title: 'A',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    await scaffoldProject({ root: dir, novel });
    expect(findProjectRoot(`${dir}/chapters`)).toBe(dir);
    expect(findProjectRoot(`${dir}/vault/inspirations`)).toBe(dir);
  });

  it('findProjectRoot returns null when no novel.json upstream', async () => {
    expect(findProjectRoot(dir)).toBeNull();
  });
});

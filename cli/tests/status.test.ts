import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { buildInitialBlueprint, writeBlueprint } from '../src/core/assets/blueprint.js';
import { buildInitialNovel } from '../src/core/assets/novel.js';
import { projectPaths } from '../src/core/assets/paths.js';
import { scaffoldProject } from '../src/core/assets/scaffold.js';
import { detectStatus } from '../src/core/status/detector.js';
import { makeTmpDir, rmTmpDir } from './helpers.js';

describe('status detector', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('returns no-project when there is no novel.json', async () => {
    const r = await detectStatus(null);
    expect(r.stage).toBe('no-project');
    expect(r.novel).toBeNull();
  });

  it('returns inspiration stage for fresh project', async () => {
    const novel = buildInitialNovel({
      title: '测试',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    await scaffoldProject({ root: dir, novel });
    const r = await detectStatus(dir);
    expect(r.stage).toBe('inspiration');
    expect(r.novel?.title).toBe('测试');
    expect(r.nextSteps[0]?.command).toContain('blueprint start');
  });

  it('returns blueprint-drafting after creating blueprint.md', async () => {
    const novel = buildInitialNovel({
      title: '测试',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    await scaffoldProject({ root: dir, novel });
    await writeBlueprint(dir, buildInitialBlueprint('测试'));
    const r = await detectStatus(dir);
    expect(r.stage).toBe('blueprint-drafting');
  });

  it('advances to world-building when blueprint approved but world missing', async () => {
    const novel = buildInitialNovel({
      title: '测试',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    await scaffoldProject({ root: dir, novel });
    let bp = buildInitialBlueprint('测试');
    bp = {
      ...bp,
      sections: {
        pitch: 'p',
        positioning: 'p',
        protagonist: 'p',
        cheat_system: 'p with 代价',
        hooks: 'p',
        anti_ai: 'p',
        style_fingerprint: null,
        exclusions: 'p',
        chapter_rhythm: 'p',
        long_term_intent: 'p',
      },
      frontmatter: { ...bp.frontmatter, status: 'approved' },
    };
    await writeBlueprint(dir, bp);
    const r = await detectStatus(dir);
    expect(r.stage).toBe('world-building');
  });

  it('progresses through outline-master / outline-volume', async () => {
    const novel = buildInitialNovel({
      title: '测试',
      genre: ['xuanhuan'],
      platform_target: ['qidian'],
    });
    await scaffoldProject({ root: dir, novel });
    let bp = buildInitialBlueprint('测试');
    bp = {
      ...bp,
      sections: {
        pitch: 'p',
        positioning: 'p',
        protagonist: 'p',
        cheat_system: 'p 代价',
        hooks: 'p',
        anti_ai: 'p',
        style_fingerprint: null,
        exclusions: 'p',
        chapter_rhythm: 'p',
        long_term_intent: 'p',
      },
      frontmatter: { ...bp.frontmatter, status: 'approved' },
    };
    await writeBlueprint(dir, bp);

    const p = projectPaths(dir);
    await writeFile(p.world.worldview, '# w', 'utf8');
    await writeFile(p.world.cheatSystem, '# c', 'utf8');
    await writeFile(p.characters.index, '{}', 'utf8');

    let r = await detectStatus(dir);
    expect(r.stage).toBe('outline-master');

    await writeFile(p.outline.master, '# m', 'utf8');
    r = await detectStatus(dir);
    expect(r.stage).toBe('outline-volume');
  });
});

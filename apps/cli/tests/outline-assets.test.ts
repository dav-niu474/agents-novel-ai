/**
 * Tests for core/assets/outline.ts file IO:
 *   - buildInitial* produce schema-valid skeleton docs
 *   - exists helpers gate on the .md file
 *   - read/write roundtrip (verbatim body + version bump + status flip)
 *   - list helpers + outlineStatus aggregator
 *   - syncOutlineStatus reconciles novel.json.outline_status (file-truth-first)
 */
import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildInitialNovel, readNovel } from '@novel/core/assets/novel.js';
import { projectPaths } from '@novel/core/assets/paths.js';
import { scaffoldProject } from '@novel/core/assets/scaffold.js';
import {
  buildInitialChapterOutline,
  buildInitialOutlineMaster,
  buildInitialVolumeOutline,
  chapterOutlineExists,
  isChapterOutlineComplete,
  listChapterOutlines,
  listVolumeOutlines,
  outlineMasterExists,
  outlineStatus,
  readChapterOutline,
  readOutlineMaster,
  readVolumeOutline,
  syncOutlineStatus,
  volumeOutlineExists,
  writeChapterOutline,
  writeOutlineMaster,
  writeVolumeOutline,
} from '@novel/core/assets/outline.js';
import {
  OutlineChapterFrontmatter,
  OutlineMasterFrontmatter,
  OutlineVolumeFrontmatter,
} from '@novel/core/schemas/outline.js';
import { makeTmpDir, rmTmpDir } from './helpers.js';

const FULL_CHAPTER_BODY = `# 第 1 章 · 残卷

## 1. 一句话目标
捡到玉简。

## 2. 必出场角色
- protagonist-lin-jin（POV）

## 3. 必发生事件（按顺序）
1. 被罚跪
2. 解析杂草

## 4. 钩子（hookOps）
- mustOpen：玉简发烫之谜

## 5. 爽点节拍
first-use。

## 6. 情绪曲线
压抑 → 微光

## 7. 字数 / 节奏
3500 字。

## 8. 不写
- 不揭示来源

## 9. 与状态的耦合（写完后该更新什么）
- particle_ledger：玉简贴身`;

async function freshProject(dir: string): Promise<void> {
  const novel = buildInitialNovel({
    title: '测试',
    genre: ['xuanhuan'],
    platform_target: ['qidian'],
  });
  await scaffoldProject({ root: dir, novel });
}

describe('buildInitial* skeletons', () => {
  it('produce schema-valid frontmatter', () => {
    expect(OutlineMasterFrontmatter.safeParse(buildInitialOutlineMaster('测试').frontmatter).success).toBe(true);
    expect(OutlineVolumeFrontmatter.safeParse(buildInitialVolumeOutline(1, [1, 50]).frontmatter).success).toBe(true);
    expect(OutlineChapterFrontmatter.safeParse(buildInitialChapterOutline(1, 1).frontmatter).success).toBe(true);
  });

  it('volume target_chapters is derived from the range', () => {
    expect(buildInitialVolumeOutline(2, [51, 100]).frontmatter.target_chapters).toBe(50);
    expect(buildInitialVolumeOutline(1, [1, 30]).frontmatter.target_chapters).toBe(30);
  });

  it('volume/chapter asset_id are zero-padded', () => {
    expect(buildInitialVolumeOutline(3, [101, 150]).frontmatter.asset_id).toBe('volume-03');
    expect(buildInitialChapterOutline(7, 1).frontmatter.asset_id).toBe('chapter-0007');
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

  it('return false on a fresh project', () => {
    expect(outlineMasterExists(dir)).toBe(false);
    expect(volumeOutlineExists(dir, 1)).toBe(false);
    expect(chapterOutlineExists(dir, 1)).toBe(false);
  });

  it('return true after writing each level', async () => {
    await writeOutlineMaster(dir, buildInitialOutlineMaster('测试'));
    expect(outlineMasterExists(dir)).toBe(true);

    await writeVolumeOutline(dir, buildInitialVolumeOutline(1, [1, 50]));
    expect(volumeOutlineExists(dir, 1)).toBe(true);

    await writeChapterOutline(dir, buildInitialChapterOutline(1, 1));
    expect(chapterOutlineExists(dir, 1)).toBe(true);
  });
});

describe('write/read roundtrip', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('writeOutlineMaster persists MD, bumps version, keeps body', async () => {
    const initial = buildInitialOutlineMaster('测试');
    expect(initial.frontmatter.version).toBe(1);

    const written = await writeOutlineMaster(dir, initial);
    expect(written.frontmatter.version).toBe(2);
    expect(existsSync(projectPaths(dir).outline.master)).toBe(true);

    const back = await readOutlineMaster(dir);
    expect(back.frontmatter.version).toBe(2);
    expect(back.frontmatter.status).toBe('drafting');
    expect(back.body).toContain('总纲：《测试》');
  });

  it('writeVolumeOutline lands at volume-NN.md and preserves range', async () => {
    await writeVolumeOutline(dir, buildInitialVolumeOutline(1, [1, 50]));
    const back = await readVolumeOutline(dir, 1);
    expect(back.frontmatter.volume_no).toBe(1);
    expect(back.frontmatter.chapter_range).toEqual([1, 50]);
    expect(back.frontmatter.target_chapters).toBe(50);
  });

  it('writeChapterOutline preserves a full 9-field body verbatim (R1 survives roundtrip)', async () => {
    const base = buildInitialChapterOutline(1, 1);
    await writeChapterOutline(dir, { frontmatter: base.frontmatter, body: FULL_CHAPTER_BODY });
    const back = await readChapterOutline(dir, 1);
    expect(back.frontmatter.chapter_no).toBe(1);
    expect(isChapterOutlineComplete(back.body)).toBe(true);
    expect(back.body).toContain('particle_ledger');
  });

  it('status="approved" is written into frontmatter', async () => {
    await writeChapterOutline(dir, buildInitialChapterOutline(2, 1), 'approved');
    const back = await readChapterOutline(dir, 2);
    expect(back.frontmatter.status).toBe('approved');
  });
});

describe('list helpers + outlineStatus', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('lists sorted volume + chapter numbers', async () => {
    await writeVolumeOutline(dir, buildInitialVolumeOutline(2, [51, 100]));
    await writeVolumeOutline(dir, buildInitialVolumeOutline(1, [1, 50]));
    await writeChapterOutline(dir, buildInitialChapterOutline(3, 1));
    await writeChapterOutline(dir, buildInitialChapterOutline(1, 1));

    expect(await listVolumeOutlines(dir)).toEqual([1, 2]);
    expect(await listChapterOutlines(dir)).toEqual([1, 3]);
  });

  it('outlineStatus aggregates correctly', async () => {
    let st = await outlineStatus(dir);
    expect(st.hasMaster).toBe(false);
    expect(st.volumeCount).toBe(0);
    expect(st.chapterOutlineCount).toBe(0);

    await writeOutlineMaster(dir, buildInitialOutlineMaster('测试'));
    await writeVolumeOutline(dir, buildInitialVolumeOutline(1, [1, 50]));
    await writeChapterOutline(dir, buildInitialChapterOutline(1, 1));

    st = await outlineStatus(dir);
    expect(st.hasMaster).toBe(true);
    expect(st.volumeNumbers).toEqual([1]);
    expect(st.chapterNumbers).toEqual([1]);
  });
});

describe('syncOutlineStatus', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await makeTmpDir();
    await freshProject(dir);
  });
  afterEach(async () => {
    await rmTmpDir(dir);
  });

  it('pending → drafting → in_progress as assets appear', async () => {
    await syncOutlineStatus(dir);
    expect((await readNovel(dir)).outline_status).toBe('pending');

    await writeOutlineMaster(dir, buildInitialOutlineMaster('测试'));
    await syncOutlineStatus(dir);
    expect((await readNovel(dir)).outline_status).toBe('drafting');

    await writeChapterOutline(dir, buildInitialChapterOutline(1, 1));
    await syncOutlineStatus(dir);
    expect((await readNovel(dir)).outline_status).toBe('in_progress');
  });

  it('does not bump novel version when status is unchanged', async () => {
    const before = (await readNovel(dir)).version;
    await syncOutlineStatus(dir); // pending → pending, no write
    const after = (await readNovel(dir)).version;
    expect(after).toBe(before);
  });
});

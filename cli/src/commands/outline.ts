/**
 * `novel outline <show|list|build|approve>` — 三级大纲 CRUD + build workflow.
 *
 * Three asset levels (all Markdown-canonical, no JSON sidecar):
 *   - 总纲  outline/master.md
 *   - 卷纲  outline/volumes/volume-NN.md
 *   - 章纲  outline/chapters/chapter-NNNN.md
 *
 * Completeness gates:
 *   - master / volume : required H2 sections present (soft at build, hard at approve)
 *   - chapter         : R1 = 9-field contract (hard at approve)
 */
import {
  chapterFieldLabel,
  chapterOutlineExists,
  isChapterOutlineComplete,
  listMissingChapterFields,
  listMissingMasterSections,
  listMissingVolumeSections,
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
} from '../core/assets/outline.js';
import { findProjectRoot } from '../core/assets/paths.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { chalk, log } from '../core/utils/logger.js';
import { runOutlineBuild, type OutlineBuildOptions } from '../workflows/outline-flow.js';

type OutlineTarget = 'master' | 'volume' | 'chapter' | 'all';

function requireRoot(): string {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());
  return root;
}

function statusColor(status: string): (s: string) => string {
  if (status === 'approved') return chalk.green;
  if (status === 'drafting' || status === 'draft') return chalk.yellow;
  return chalk.dim;
}

function parseTarget(raw: string): OutlineTarget {
  const t = raw.toLowerCase();
  if (t === 'master' || t === 'volume' || t === 'chapter' || t === 'all') return t;
  throw new NovelError(`非法的大纲层级：${raw}（允许 master / volume / chapter / all）`);
}

function requireNumber(label: string, n: string | undefined): number {
  if (n === undefined) {
    throw new NovelError(`${label} 需要一个序号`, {
      hint: label.includes('卷') ? '例：`novel outline show volume 1`' : '例：`novel outline show chapter 1`',
    });
  }
  const parsed = Number.parseInt(n, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new NovelError(`${label} 序号必须是正整数，收到：${n}`);
  }
  return parsed;
}

// ---------- show ----------

export async function outlineShow(targetRaw = 'all', nArg?: string): Promise<void> {
  const root = requireRoot();
  const target = parseTarget(targetRaw);

  if (target === 'master') {
    await showMaster(root);
    return;
  }
  if (target === 'volume') {
    await showVolume(root, requireNumber('卷纲', nArg));
    return;
  }
  if (target === 'chapter') {
    await showChapter(root, requireNumber('章纲', nArg));
    return;
  }

  // all — master + lists
  let printed = false;
  if (outlineMasterExists(root)) {
    await showMaster(root);
    printed = true;
  }
  const st = await outlineStatus(root);
  if (st.volumeCount > 0) {
    log.heading(`卷纲（${st.volumeCount}）`);
    log.plain(st.volumeNumbers.map((n) => `volume-${String(n).padStart(2, '0')}`).join('  '));
    printed = true;
  }
  if (st.chapterOutlineCount > 0) {
    log.heading(`章纲（${st.chapterOutlineCount}）`);
    log.plain(st.chapterNumbers.map((n) => `chapter-${String(n).padStart(4, '0')}`).join('  '));
    printed = true;
  }
  if (!printed) {
    log.warn('outline/ 目录下还没有任何大纲。');
    log.hint('运行 `novel outline build` 启动三级大纲工作流。');
  }
}

async function showMaster(root: string): Promise<void> {
  if (!outlineMasterExists(root)) {
    log.warn('总纲 outline/master.md 还未创建。');
    log.hint('运行 `novel outline build`。');
    return;
  }
  const m = await readOutlineMaster(root);
  log.heading(`==== 总纲 master (v${m.frontmatter.version}, ${m.frontmatter.status}) ====`);
  log.plain(m.body);
  const miss = listMissingMasterSections(m.body);
  if (miss.length > 0) log.warn(`缺少必填段落：${miss.join(' / ')}`);
}

async function showVolume(root: string, n: number): Promise<void> {
  if (!volumeOutlineExists(root, n)) {
    log.warn(`卷纲 volume-${String(n).padStart(2, '0')}.md 不存在。`);
    log.hint(`运行 \`novel outline build --volume ${n}\`。`);
    return;
  }
  const v = await readVolumeOutline(root, n);
  const [a, b] = v.frontmatter.chapter_range;
  log.heading(`==== 第 ${n} 卷卷纲 (v${v.frontmatter.version}, ${v.frontmatter.status}, 第 ${a}-${b} 章) ====`);
  log.plain(v.body);
  const miss = listMissingVolumeSections(v.body);
  if (miss.length > 0) log.warn(`缺少必填段落：${miss.join(' / ')}`);
}

async function showChapter(root: string, n: number): Promise<void> {
  if (!chapterOutlineExists(root, n)) {
    log.warn(`章纲 chapter-${String(n).padStart(4, '0')}.md 不存在。`);
    log.hint('运行 `novel outline build --resume` 或写作期 PLAN 阶段产出。');
    return;
  }
  const c = await readChapterOutline(root, n);
  log.heading(`==== 第 ${n} 章章纲 (v${c.frontmatter.version}, ${c.frontmatter.status}) ====`);
  log.plain(c.body);
  const miss = listMissingChapterFields(c.body);
  if (miss.length > 0) {
    log.warn(`R1 缺字段（${miss.length}/9）：${miss.map(chapterFieldLabel).join(' / ')}`);
  }
}

// ---------- list ----------

export async function outlineList(): Promise<void> {
  const root = requireRoot();
  const st = await outlineStatus(root);

  log.heading('三级大纲');

  // master
  if (st.hasMaster) {
    const m = await readOutlineMaster(root);
    const miss = listMissingMasterSections(m.body);
    const flag = miss.length === 0 ? chalk.green('完整') : chalk.yellow(`缺 ${miss.length} 段`);
    log.plain(
      `  ${chalk.green('✓')} 总纲 master      ${statusColor(m.frontmatter.status)(m.frontmatter.status)} ${chalk.dim(`v${m.frontmatter.version}`)}  ${flag}`,
    );
  } else {
    log.plain(`  ${chalk.red('✗')} 总纲 master      ${chalk.dim('未创建')}`);
  }

  // volumes
  log.plain('');
  log.plain(chalk.bold(`  卷纲（${st.volumeCount}）`));
  if (st.volumeCount === 0) {
    log.plain(`    ${chalk.dim('（无）')}`);
  } else {
    for (const n of st.volumeNumbers) {
      const v = await readVolumeOutline(root, n);
      const [a, b] = v.frontmatter.chapter_range;
      const miss = listMissingVolumeSections(v.body);
      const flag = miss.length === 0 ? chalk.green('完整') : chalk.yellow(`缺 ${miss.length} 段`);
      log.plain(
        `    volume-${String(n).padStart(2, '0')}  ${statusColor(v.frontmatter.status)(v.frontmatter.status)} ${chalk.dim(`v${v.frontmatter.version}`)}  第 ${a}-${b} 章  ${flag}`,
      );
    }
  }

  // chapters
  log.plain('');
  log.plain(chalk.bold(`  章纲（${st.chapterOutlineCount}）`));
  if (st.chapterOutlineCount === 0) {
    log.plain(`    ${chalk.dim('（无）')}`);
  } else {
    for (const n of st.chapterNumbers) {
      const c = await readChapterOutline(root, n);
      const miss = listMissingChapterFields(c.body);
      const flag = miss.length === 0 ? chalk.green('9/9') : chalk.yellow(`${9 - miss.length}/9`);
      log.plain(
        `    chapter-${String(n).padStart(4, '0')}  ${statusColor(c.frontmatter.status)(c.frontmatter.status)} ${chalk.dim(`v${c.frontmatter.version}`)}  R1 ${flag}`,
      );
    }
  }
}

// ---------- build ----------

export async function outlineBuild(opts: OutlineBuildOptions = {}): Promise<void> {
  await runOutlineBuild(opts);
}

// ---------- approve ----------

export async function outlineApprove(targetRaw = 'all', nArg?: string): Promise<void> {
  const root = requireRoot();
  const target = parseTarget(targetRaw);

  if (target === 'master') {
    await approveMaster(root);
  } else if (target === 'volume') {
    await approveVolume(root, requireNumber('卷纲', nArg));
  } else if (target === 'chapter') {
    await approveChapter(root, requireNumber('章纲', nArg));
  } else {
    await approveAll(root);
  }

  await syncOutlineStatus(root);
}

async function approveMaster(root: string): Promise<void> {
  if (!outlineMasterExists(root)) {
    throw new NovelError('总纲还未创建，无法 approve', { hint: '先 `novel outline build`。' });
  }
  const m = await readOutlineMaster(root);
  const miss = listMissingMasterSections(m.body);
  if (miss.length > 0) {
    throw new NovelError(`总纲缺少必填段落，无法 approve：${miss.join(' / ')}`, {
      hint: '运行 `novel outline build --resume` 补齐。',
    });
  }
  await writeOutlineMaster(root, m, 'approved');
  log.success('总纲 master 已标记 approved');
}

async function approveVolume(root: string, n: number): Promise<void> {
  if (!volumeOutlineExists(root, n)) {
    throw new NovelError(`第 ${n} 卷卷纲不存在，无法 approve`, {
      hint: `先 \`novel outline build --volume ${n}\`。`,
    });
  }
  const v = await readVolumeOutline(root, n);
  const miss = listMissingVolumeSections(v.body);
  if (miss.length > 0) {
    throw new NovelError(`第 ${n} 卷卷纲缺少必填段落，无法 approve：${miss.join(' / ')}`, {
      hint: `运行 \`novel outline build --volume ${n} --resume\` 补齐。`,
    });
  }
  await writeVolumeOutline(root, v, 'approved');
  log.success(`第 ${n} 卷卷纲已标记 approved`);
}

async function approveChapter(root: string, n: number): Promise<void> {
  if (!chapterOutlineExists(root, n)) {
    throw new NovelError(`第 ${n} 章章纲不存在，无法 approve`);
  }
  const c = await readChapterOutline(root, n);
  const miss = listMissingChapterFields(c.body);
  if (miss.length > 0) {
    throw new NovelError(
      `第 ${n} 章章纲未满足 R1（缺 ${miss.length}/9 字段）：${miss.map(chapterFieldLabel).join(' / ')}`,
      { hint: '章纲 9 字段必须全部填写后才能 approve（chapter-writer 的硬契约）。' },
    );
  }
  await writeChapterOutline(root, c, 'approved');
  log.success(`第 ${n} 章章纲已标记 approved（chapter-writer 可接手）`);
}

/** Approve every complete outline asset; report (don't fail) on incomplete ones. */
async function approveAll(root: string): Promise<void> {
  const st = await outlineStatus(root);
  let approved = 0;
  const skipped: string[] = [];

  if (st.hasMaster) {
    const m = await readOutlineMaster(root);
    if (listMissingMasterSections(m.body).length === 0) {
      await writeOutlineMaster(root, m, 'approved');
      approved++;
    } else {
      skipped.push('总纲（缺必填段落）');
    }
  }

  for (const n of st.volumeNumbers) {
    const v = await readVolumeOutline(root, n);
    if (listMissingVolumeSections(v.body).length === 0) {
      await writeVolumeOutline(root, v, 'approved');
      approved++;
    } else {
      skipped.push(`volume-${String(n).padStart(2, '0')}（缺必填段落）`);
    }
  }

  for (const n of st.chapterNumbers) {
    const c = await readChapterOutline(root, n);
    if (isChapterOutlineComplete(c.body)) {
      await writeChapterOutline(root, c, 'approved');
      approved++;
    } else {
      skipped.push(`chapter-${String(n).padStart(4, '0')}（R1 未满足）`);
    }
  }

  if (approved === 0 && skipped.length === 0) {
    log.warn('没有可 approve 的大纲资产。');
    log.hint('先 `novel outline build`。');
    return;
  }
  log.success(`已 approve ${approved} 个大纲资产`);
  if (skipped.length > 0) {
    log.warn(`跳过 ${skipped.length} 个未完成资产：`);
    for (const s of skipped) log.warn('  • ' + s);
    log.hint('补齐后再 `novel outline approve <target>`。');
  }
}

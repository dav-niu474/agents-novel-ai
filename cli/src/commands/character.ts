/**
 * `novel character <list|show|add|approve>` — character-atelier CRUD + add workflow.
 *
 * Pinned to skills/novel-character-atelier/SKILL.md §3 / §4.
 *
 * Note: edit is intentionally NOT exposed yet — the character card body is
 * regenerated from structured data each write, so direct $EDITOR edits to .md
 * would be lost on next `add --refine`. Use `add --force --name <existing>`
 * to regenerate, or hand-edit the .md and skip the CLI for that card.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  buildInitialCharacterIndex,
  characterCardExists,
  characterFilePath,
  characterIndexExists,
  charactersStatus,
  characterSlug,
  findIndexEntry,
  indexFileAbsolute,
  readCharacterCard,
  readCharacterIndex,
  writeCharacterIndex,
} from '../core/assets/character.js';
import { findProjectRoot } from '../core/assets/paths.js';
import {
  AntagonistTier,
  CharacterFrontmatter,
  CharacterRole,
  CharacterTier,
  SupportingTier,
} from '../core/schemas/character.js';
import { writeMarkdownAsset } from '../core/assets/io.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { nowISO } from '../core/utils/time.js';
import { chalk, log } from '../core/utils/logger.js';
import { runCharacterAdd, type CharacterAddOptions } from '../workflows/character-flow.js';

// =============================================================================
//  list
// =============================================================================

export async function characterList(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  if (!characterIndexExists(root)) {
    log.warn('characters/_index.json 还不存在。');
    log.hint('运行 `novel character add --role protagonist` 捏第一个主角。');
    return;
  }

  const index = await readCharacterIndex(root);
  const status = await charactersStatus(root);

  log.heading(`角色清单（共 ${status.totalCount} 个）`);
  log.plain('');

  printBucket('主角', index.data.protagonist, root);
  printBucket('反派', index.data.antagonists, root);
  printBucket('配角', index.data.supporting, root);
  printBucket('次要', index.data.minor, root);

  log.plain('');
  if (!status.hasProtagonist) {
    log.warn('⚠ 还没有主角。运行 `novel character add --role protagonist`。');
  } else if (status.totalCount < 5) {
    log.hint(`已 ${status.totalCount} 个。SKILL R6 建议先捏 5-7 个核心（主 + 早期反派 + 中期反派 + 核心配角 1-2）。`);
  } else {
    log.success(`角色就位（${status.totalCount} 个）。可进入 outline-architect 阶段（alpha-2c 实现）。`);
  }
}

function printBucket(
  label: string,
  list: ReadonlyArray<{ id: string; name: string; file: string; first_appear_chapter: number; tier: string }>,
  root: string,
): void {
  if (list.length === 0) {
    log.plain(`  ${chalk.dim('—')} ${label.padEnd(4)} ${chalk.dim('（空）')}`);
    return;
  }
  log.plain(`  ${chalk.bold(label)}（${list.length}）`);
  for (const e of list) {
    const exists = checkFileExists(root, e.file);
    const marker = exists ? chalk.green('✓') : chalk.red('✗');
    log.plain(
      `    ${marker} ${chalk.cyan(e.id.padEnd(36))} ${chalk.dim(`tier=${e.tier}`.padEnd(16))} ${chalk.dim(`第 ${e.first_appear_chapter} 章登场`)}  ${e.name}`,
    );
  }
}

function checkFileExists(root: string, indexFile: string): boolean {
  try {
    return existsSync(indexFileAbsolute(root, indexFile));
  } catch {
    return false;
  }
}

// =============================================================================
//  show
// =============================================================================

export async function characterShow(idOrName: string): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  if (!characterIndexExists(root)) {
    throw new NovelError('characters/_index.json 还不存在', {
      hint: '先运行 `novel character add --role protagonist`。',
    });
  }
  const index = await readCharacterIndex(root);

  // Resolve: if the input matches an id pattern, use directly; else search by name.
  const looksLikeId = /^(?:protagonist|antagonist|supporting|minor)-/.test(idOrName);
  let found = looksLikeId ? findIndexEntry(index, idOrName) : null;
  if (!found) {
    // Search by name (case-insensitive substring).
    const lower = idOrName.toLowerCase();
    for (const role of ['protagonist', 'antagonist', 'supporting', 'minor'] as CharacterRole[]) {
      const bucket =
        role === 'protagonist'
          ? index.data.protagonist
          : role === 'antagonist'
            ? index.data.antagonists
            : role === 'supporting'
              ? index.data.supporting
              : index.data.minor;
      const hit = bucket.find(
        (e: { id: string; name: string }) =>
          e.name.toLowerCase().includes(lower) || e.id.toLowerCase().includes(lower),
      );
      if (hit) {
        found = { role, entry: hit };
        break;
      }
    }
  }
  if (!found) {
    throw new NovelError(`找不到角色：${idOrName}`, {
      hint: '运行 `novel character list` 查看全部角色。',
    });
  }

  const path = indexFileAbsolute(root, found.entry.file);
  const raw = await readFile(path, 'utf8');
  log.heading(`${found.entry.name} (${found.entry.id}) · tier=${found.entry.tier}`);
  log.plain(chalk.dim(`文件：${path}`));
  log.plain('');
  log.plain(raw.trim());
}

// =============================================================================
//  add
// =============================================================================

export async function characterAdd(opts: CharacterAddOptions = {}): Promise<void> {
  await runCharacterAdd(opts);
}

// =============================================================================
//  approve
// =============================================================================

export interface ApproveOptions {
  /** Approve only a specific id; default: all drafting cards. */
  id?: string;
}

export async function characterApprove(opts: ApproveOptions = {}): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  if (!characterIndexExists(root)) {
    throw new NovelError('characters/_index.json 还不存在', {
      hint: '先运行 `novel character add --role protagonist`。',
    });
  }
  const index = await readCharacterIndex(root);
  const status = await charactersStatus(root);

  // Pre-flight: at least one protagonist must exist for global approve.
  if (!opts.id && !status.hasProtagonist) {
    throw new NovelError('approve 前必须至少有 1 个主角', {
      hint: '运行 `novel character add --role protagonist`。',
    });
  }

  // Collect targets.
  const targets: Array<{ role: CharacterRole; entry: { id: string; name: string; file: string; first_appear_chapter: number; tier: string } }> = [];
  if (opts.id) {
    const found = findIndexEntry(index, opts.id);
    if (!found) {
      throw new NovelError(`索引中找不到 id=${opts.id}`, {
        hint: '运行 `novel character list` 查看全部 id。',
      });
    }
    targets.push(found);
  } else {
    for (const e of index.data.protagonist) targets.push({ role: 'protagonist', entry: e });
    for (const e of index.data.antagonists) targets.push({ role: 'antagonist', entry: e });
    for (const e of index.data.supporting) targets.push({ role: 'supporting', entry: e });
    for (const e of index.data.minor) targets.push({ role: 'minor', entry: e });
  }

  let approved = 0;
  let skipped = 0;
  for (const t of targets) {
    const slug = t.entry.id.replace(/^(?:protagonist|antagonist|supporting|minor)-/, '');
    if (!characterCardExists(root, t.role, slug)) {
      log.warn(`跳过 ${t.entry.id}：卡片文件不存在 (${t.entry.file})`);
      skipped++;
      continue;
    }
    try {
      const card = await readCharacterCard(root, t.role, slug);
      if (card.frontmatter.status === 'approved') {
        skipped++;
        continue;
      }
      const ts = nowISO();
      const fm = CharacterFrontmatter.parse({
        ...card.frontmatter,
        status: 'approved',
        updated_at: ts,
        version: card.frontmatter.version + 1,
      });
      await writeMarkdownAsset(characterFilePath(root, t.role, slug), CharacterFrontmatter, {
        frontmatter: fm,
        body: card.body,
      });
      log.success(`approved ${t.entry.id}`);
      approved++;
    } catch (err) {
      log.warn(`跳过 ${t.entry.id}：${(err as Error).message}`);
      skipped++;
    }
  }

  log.plain('');
  log.success(`完成：${approved} 个 approved / ${skipped} 个跳过`);
  if (approved > 0) {
    log.hint('性格内核已锁定，chapter-writer / quality-auditor 会按 approved 版本工作。');
  }
}

// =============================================================================
//  Utility: parse role/tier CLI inputs
// =============================================================================

/** Parse a string into CharacterRole or throw. */
export function parseRole(s: string | undefined): CharacterRole | undefined {
  if (s === undefined) return undefined;
  const result = CharacterRole.safeParse(s);
  if (!result.success) {
    throw new NovelError(`非法 --role：${s}（允许 protagonist / antagonist / supporting / minor）`);
  }
  return result.data;
}

/** Parse a string into CharacterTier with role-context validation, or throw. */
export function parseTier(role: CharacterRole | undefined, s: string | undefined): CharacterTier | undefined {
  if (s === undefined) return undefined;
  const result = CharacterTier.safeParse(s);
  if (!result.success) {
    throw new NovelError(`非法 --tier：${s}`);
  }
  if (role) {
    if (role === 'protagonist' && result.data !== 'protagonist') {
      throw new NovelError("protagonist 的 tier 必须是 'protagonist'（也可以省略 --tier）");
    }
    if (role === 'antagonist' && !AntagonistTier.options.includes(result.data as never)) {
      throw new NovelError(`antagonist 的 tier 必须是 ${AntagonistTier.options.join(' / ')}`);
    }
    if (role === 'supporting' && !SupportingTier.options.includes(result.data as never)) {
      throw new NovelError(`supporting 的 tier 必须是 ${SupportingTier.options.join(' / ')}`);
    }
    if (role === 'minor' && result.data !== 'minor') {
      throw new NovelError("minor 的 tier 必须是 'minor'（也可以省略 --tier）");
    }
  }
  return result.data;
}

// Re-export the slug helper for tests + caller introspection.
export { characterSlug };

// Force-build the empty index file (used internally by `add` if missing).
// Exposed for completeness; not registered as a CLI subcommand.
export async function ensureEmptyIndex(root: string): Promise<void> {
  if (characterIndexExists(root)) return;
  await writeCharacterIndex(root, buildInitialCharacterIndex());
}

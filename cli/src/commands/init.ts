/**
 * `novel init` — initialize a new project skeleton.
 *
 * Maps to skills/novel-studio/SKILL.md §3 工作流 A.
 */
import { resolve, basename } from 'node:path';
import { confirm, select, checkbox, input } from '@inquirer/prompts';
import { buildInitialNovel } from '../core/assets/novel.js';
import { findProjectRoot } from '../core/assets/paths.js';
import { scaffoldProject } from '../core/assets/scaffold.js';
import {
  KNOWN_AUDIENCES,
  KNOWN_GENRES,
  KNOWN_PLATFORMS,
  type Audience,
} from '../core/schemas/novel.js';
import { NovelError } from '../core/utils/errors.js';
import { ensureDir } from '../core/utils/fs.js';
import { log } from '../core/utils/logger.js';

export interface InitOptions {
  /** Optional positional book name. Falls back to interactive prompt. */
  name?: string;
  /** --genre xuanhuan,xianxia (custom values allowed; warns if unknown) */
  genre?: string;
  /** --platform qidian,fanqie (custom values allowed; warns if unknown) */
  platform?: string;
  /** --audience male-young-adult (strict enum) */
  audience?: string;
  /** --in <dir> creates the project at <dir> instead of cwd. */
  inDir?: string;
  /** --force overwrite an existing novel.json. */
  force?: boolean;
  /** --yes skip all interactive prompts (CI mode). */
  yes?: boolean;
}

/**
 * Parse a comma-separated list. For lenient fields (genre/platform), we accept
 * any non-empty string but warn when the value isn't in the KNOWN list, so
 * users notice typos but aren't blocked from custom subgenres.
 */
function parseLenientList(
  raw: string | undefined,
  known: ReadonlyArray<{ value: string }>,
  label: string,
): string[] {
  if (!raw) return [];
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const knownValues = new Set(known.map((k) => k.value));
  for (const p of parts) {
    if (!knownValues.has(p)) {
      log.warn(`${label} 「${p}」不在常见列表中（允许，仅提醒）。常见值：${[...knownValues].join(', ')}`);
    }
  }
  return parts;
}

/** Strict variant for fields with a closed enum (audience). */
function parseStrictValue(
  raw: string | undefined,
  allowed: ReadonlyArray<string>,
  label: string,
): string | undefined {
  if (raw === undefined) return undefined;
  if (!allowed.includes(raw)) {
    throw new NovelError(`非法 ${label}: ${raw}（允许：${allowed.join(', ')}）`);
  }
  return raw;
}

export async function runInit(opts: InitOptions): Promise<void> {
  // Determine the target directory.
  const targetDir = opts.inDir ? resolve(opts.inDir) : process.cwd();
  await ensureDir(targetDir);

  // If the target dir is itself inside an existing project (and we're not at its root),
  // refuse — we don't want to nest novel.json files accidentally.
  const ancestor = findProjectRoot(targetDir);
  if (ancestor && ancestor !== targetDir) {
    throw new NovelError(
      `目标目录 ${targetDir} 已位于另一个 Novel Studio 项目内 (${ancestor})。\n请换一个独立目录，或显式 --in 指定。`,
    );
  }

  // Resolve the title.
  let title = opts.name?.trim();
  if (!title && opts.yes) {
    title = basename(targetDir);
  }
  if (!title) {
    title = await input({
      message: '书名（可后续在 blueprint 修改）：',
      default: basename(targetDir),
      validate: (v) => v.trim().length > 0 || '书名不能为空',
    });
  }
  title = title.trim();

  // Resolve genres (lenient: accept any non-empty string).
  let genres = parseLenientList(opts.genre, KNOWN_GENRES, '题材');
  if (genres.length === 0 && !opts.yes) {
    genres = await checkbox({
      message: '主题材（多选；至少 1 个；不在列表里的可以之后手动改 novel.json）：',
      choices: KNOWN_GENRES.map((c) => ({ value: c.value, name: c.name })),
      validate: (xs) => xs.length > 0 || '至少选 1 个',
    });
  }
  if (genres.length === 0) genres = ['xuanhuan']; // CI fallback

  // Resolve platforms (lenient).
  let platforms = parseLenientList(opts.platform, KNOWN_PLATFORMS, '平台');
  if (platforms.length === 0 && !opts.yes) {
    platforms = await checkbox({
      message: '目标平台（多选；至少 1 个）：',
      choices: KNOWN_PLATFORMS.map((c) => ({ value: c.value, name: c.name })),
      validate: (xs) => xs.length > 0 || '至少选 1 个',
    });
  }
  if (platforms.length === 0) platforms = ['qidian'];

  // Resolve audience (strict enum).
  const allowedAudiences = KNOWN_AUDIENCES.map((c) => c.value);
  let audience: string | undefined = parseStrictValue(opts.audience, allowedAudiences, 'audience');
  if (audience === undefined && !opts.yes) {
    audience = await select({
      message: '受众（可选）：',
      choices: KNOWN_AUDIENCES.map((c) => ({ value: c.value, name: c.name })),
      default: '',
    });
  }
  audience = audience ?? '';

  // Confirm before writing (skipped under --yes).
  if (!opts.yes) {
    log.info('');
    log.info(`即将在 ${targetDir} 创建：`);
    log.info(`  书名：${title}`);
    log.info(`  题材：${genres.join(', ')}`);
    log.info(`  平台：${platforms.join(', ')}`);
    log.info(`  受众：${audience || '不限'}`);
    const ok = await confirm({ message: '确认创建？', default: true });
    if (!ok) {
      log.warn('已取消。');
      return;
    }
  }

  const novel = buildInitialNovel({
    title,
    genre: genres,
    platform_target: platforms,
    ...(audience ? { audience: audience as Audience } : {}),
  });

  const spinner = log.spinner('创建项目骨架...').start();
  let result;
  try {
    result = await scaffoldProject({
      root: targetDir,
      novel,
      ...(opts.force !== undefined ? { force: opts.force } : {}),
    });
  } catch (err) {
    spinner.fail('创建失败');
    throw err;
  }
  spinner.succeed(`项目骨架已创建：${result.novelJsonPath}`);

  // Print "next steps" hint identical to studio SKILL workflow A step 5.
  log.heading('下一步建议：');
  log.info('  • novel blueprint start    # 启动 10 步开书定盘');
  log.info('  • novel status             # 看项目当前状态');
  log.info('  • novel doctor             # 检查 LLM 配置');

  // Friendly tail: show project ID for reference.
  log.plain('');
  log.plain(`项目 ID：${novel.id}`);
}

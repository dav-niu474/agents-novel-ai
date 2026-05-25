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
import { NovelError } from '../core/utils/errors.js';
import { ensureDir } from '../core/utils/fs.js';
import { log } from '../core/utils/logger.js';

export interface InitOptions {
  /** Optional positional book name. Falls back to interactive prompt. */
  name?: string;
  /** --genre xuanhuan,xianxia */
  genre?: string;
  /** --platform qidian,fanqie */
  platform?: string;
  /** --audience male-young-adult */
  audience?: string;
  /** --in <dir> creates the project at <dir> instead of cwd. */
  inDir?: string;
  /** --force overwrite an existing novel.json. */
  force?: boolean;
  /** --yes skip all interactive prompts (CI mode). */
  yes?: boolean;
}

const GENRE_CHOICES = [
  { value: 'xuanhuan', name: '玄幻' },
  { value: 'xianxia', name: '仙侠' },
  { value: 'urban', name: '都市' },
  { value: 'lishi', name: '历史' },
  { value: 'kehuan', name: '科幻' },
  { value: 'moshi', name: '末世' },
  { value: 'youxi', name: '游戏' },
  { value: 'wuxianliu', name: '无限流' },
  { value: 'yanqing', name: '言情' },
  { value: 'lingyi', name: '灵异' },
  { value: 'other', name: '其他' },
] as const;

const PLATFORM_CHOICES = [
  { value: 'qidian', name: '起点' },
  { value: 'fanqie', name: '番茄' },
  { value: 'jinjiang', name: '晋江' },
  { value: 'ciweimao', name: '刺猬猫' },
  { value: 'zhihu', name: '知乎盐选' },
  { value: 'other', name: '其他' },
] as const;

const AUDIENCE_CHOICES = [
  { value: 'male-young-adult', name: '男频青年向' },
  { value: 'male-middle', name: '男频中年向' },
  { value: 'female-young-adult', name: '女频青年向' },
  { value: 'female-middle', name: '女频中年向' },
  { value: 'mixed', name: '不限性别' },
  { value: '', name: '不确定' },
] as const;

function parseList<T>(raw: string | undefined, allowed: ReadonlyArray<T>, label: string): T[] {
  if (!raw) return [];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (!(allowed as readonly unknown[]).includes(p)) {
      throw new NovelError(`非法 ${label}: ${p}（允许：${allowed.join(', ')}）`);
    }
  }
  return parts as T[];
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

  // Resolve genres.
  const allowedGenres = GENRE_CHOICES.map((c) => c.value);
  let genres = parseList(opts.genre, allowedGenres, '题材');
  if (genres.length === 0 && !opts.yes) {
    genres = await checkbox({
      message: '主题材（多选；至少 1 个）：',
      choices: GENRE_CHOICES.map((c) => ({ value: c.value, name: c.name })),
      validate: (xs) => xs.length > 0 || '至少选 1 个',
    });
  }
  if (genres.length === 0) genres = ['xuanhuan']; // CI fallback

  // Resolve platforms.
  const allowedPlatforms = PLATFORM_CHOICES.map((c) => c.value);
  let platforms = parseList(opts.platform, allowedPlatforms, '平台');
  if (platforms.length === 0 && !opts.yes) {
    platforms = await checkbox({
      message: '目标平台（多选；至少 1 个）：',
      choices: PLATFORM_CHOICES.map((c) => ({ value: c.value, name: c.name })),
      validate: (xs) => xs.length > 0 || '至少选 1 个',
    });
  }
  if (platforms.length === 0) platforms = ['qidian'];

  // Resolve audience (optional).
  const allowedAudiences = AUDIENCE_CHOICES.map((c) => c.value);
  let audience: string | undefined = opts.audience;
  if (audience !== undefined && !allowedAudiences.includes(audience as (typeof allowedAudiences)[number])) {
    throw new NovelError(`非法 audience: ${audience}（允许：${allowedAudiences.join(', ')}）`);
  }
  if (audience === undefined && !opts.yes) {
    audience = await select({
      message: '受众（可选）：',
      choices: AUDIENCE_CHOICES.map((c) => ({ value: c.value, name: c.name })),
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
    genre: genres as Array<(typeof allowedGenres)[number]>,
    platform_target: platforms as Array<(typeof allowedPlatforms)[number]>,
    ...(audience ? { audience: audience as (typeof allowedAudiences)[number] } : {}),
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

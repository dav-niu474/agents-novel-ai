/**
 * Project skeleton scaffolding.
 *
 * Creates the directory layout described in README.md "资产目录约定" + writes the
 * initial novel.json. Does NOT write blueprint.md (that's blueprint skill's job).
 *
 * Pinned to skills/novel-studio/SKILL.md §3 工作流 A (项目初始化).
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Novel, type Novel as TNovel } from '../schemas/novel.js';
import { ensureDir, pathExists } from '../utils/fs.js';
import { writeJsonAsset } from './io.js';
import { projectPaths } from './paths.js';

/** All directories that must exist on a freshly-init'd project. */
function allDirs(p: ReturnType<typeof projectPaths>): string[] {
  return [
    p.cliInternal,
    p.outline.volumes,
    p.outline.chapters,
    p.world.dir,
    p.characters.dir,
    p.characters.antagonists,
    p.characters.supporting,
    p.chapters.dir,
    p.memory.dir,
    p.vault.inspirations,
    p.vault.snippets,
    p.vault.references,
    p.vault.styleFingerprints,
    p.audit.reports,
    p.audit.trends,
    p.audit.logs,
  ];
}

export interface ScaffoldOptions {
  /** Project root directory (must exist; usually cwd or `path.join(cwd, name)`). */
  root: string;
  /** Validated novel.json content. */
  novel: TNovel;
  /** Whether to overwrite an existing novel.json (init `--force`). */
  force?: boolean;
}

export interface ScaffoldResult {
  createdDirs: string[];
  novelJsonPath: string;
}

export async function scaffoldProject(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const p = projectPaths(opts.root);

  // Refuse to overwrite unless --force.
  if (pathExists(p.novelJson) && !opts.force) {
    throw new Error(
      `novel.json 已存在于 ${p.root}。如需覆盖请加 --force（会版本归档而不是删除）。`,
    );
  }

  // Create all directories (idempotent).
  const dirs = [p.root, ...allDirs(p)];
  for (const d of dirs) {
    await ensureDir(d);
  }

  // Write novel.json.
  await writeJsonAsset(p.novelJson, Novel, opts.novel);

  // Write a friendly .gitignore inside .novel/ so CLI internal state isn't committed.
  const cliGitignore = join(p.cliInternal, '.gitignore');
  if (!pathExists(cliGitignore)) {
    await writeFile(cliGitignore, '*\n!.gitignore\n', 'utf8');
  }

  return {
    createdDirs: dirs,
    novelJsonPath: p.novelJson,
  };
}

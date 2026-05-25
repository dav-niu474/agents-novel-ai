/**
 * `novel blueprint <show|edit|start|approve>` — Open-book contract CRUD.
 */
import { spawn } from 'node:child_process';
import { blueprintExists, readBlueprint } from '../core/assets/blueprint.js';
import { findProjectRoot, projectPaths } from '../core/assets/paths.js';
import {
  BLUEPRINT_SECTION_KEYS,
  BLUEPRINT_SECTION_TITLES,
} from '../core/schemas/blueprint.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { chalk, log } from '../core/utils/logger.js';
import { approveBlueprint, runBlueprintStart, type BlueprintFlowOptions } from '../workflows/blueprint-flow.js';

export async function blueprintShow(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());
  if (!blueprintExists(root)) {
    log.warn('blueprint.md 还没创建。');
    log.hint('运行 `novel blueprint start` 启动 10 步定盘。');
    return;
  }
  const bp = await readBlueprint(root);
  log.heading(`${bp.title}  ${chalk.dim(`(v${bp.frontmatter.version}, ${bp.frontmatter.status})`)}`);
  for (const key of BLUEPRINT_SECTION_KEYS) {
    log.heading(BLUEPRINT_SECTION_TITLES[key]);
    const v = bp.sections[key];
    if (v && v.trim().length > 0) {
      log.plain(v);
    } else {
      log.plain(chalk.dim('(未填)'));
    }
  }
}

export async function blueprintEdit(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());
  if (!blueprintExists(root)) {
    throw new NovelError('blueprint.md 还没创建', {
      hint: '运行 `novel blueprint start`。',
    });
  }
  const editor = process.env.VISUAL ?? process.env.EDITOR ?? 'vi';
  const path = projectPaths(root).blueprintMd;
  log.info(`在 ${editor} 中打开 ${path} ...`);
  await new Promise<void>((resolveP, rejectP) => {
    const proc = spawn(editor, [path], { stdio: 'inherit' });
    proc.on('exit', (code) => {
      if (code === 0) resolveP();
      else rejectP(new NovelError(`编辑器退出码 ${code}`));
    });
    proc.on('error', rejectP);
  });
  log.success('编辑完成');
  log.hint('如果改了 frontmatter，运行 `novel blueprint show` 校验。');
}

export async function blueprintStart(opts: BlueprintFlowOptions = {}): Promise<void> {
  await runBlueprintStart(opts);
}

export async function blueprintApprove(): Promise<void> {
  await approveBlueprint();
}

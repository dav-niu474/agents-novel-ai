/**
 * `novel status` — show project pipeline stage + recommended next steps.
 *
 * Maps to skills/novel-studio/SKILL.md §3 工作流 B.
 */
import { findProjectRoot } from '@novel/core/assets/paths.js';
import { detectStatus } from '@novel/core/status/detector.js';
import { chalk, log } from '@novel/core/utils/logger.js';

export interface StatusOptions {
  /** --json — emit machine-readable output instead of human prose. */
  json?: boolean;
}

export async function runStatus(opts: StatusOptions = {}): Promise<void> {
  const root = findProjectRoot(process.cwd());
  const report = await detectStatus(root);

  if (opts.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }

  log.plain(chalk.bold(report.headline));
  log.plain('');
  for (const line of report.details) log.plain('  ' + line);

  if (report.nextSteps.length > 0) {
    log.heading('建议下一步：');
    for (const step of report.nextSteps) {
      const cmd = step.command ? `  ${chalk.cyan(step.command)}` : '';
      const skill = step.skill ? chalk.dim(`  [${step.skill}]`) : '';
      log.plain(`  • ${step.title}${cmd}${skill}`);
    }
  }
}

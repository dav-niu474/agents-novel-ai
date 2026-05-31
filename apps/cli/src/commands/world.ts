/**
 * `novel world <show|build|approve|list>` — 世界观三件套 CRUD + build workflow.
 *
 * 三个资产：worldview / powers / cheat-system
 * 每个资产都是 JSON canonical + MD projection 双写。
 */
import {
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  readWorldview,
  worldStatus,
  worldviewExists,
  writeCheatSystem,
  writePowers,
  writeWorldview,
} from '@novel/core/assets/world.js';
import {
  renderCheatSystemBody,
  renderPowersBody,
  renderWorldviewBody,
} from '@novel/core/assets/world-render.js';
import { readMarkdownAsset } from '@novel/core/assets/io.js';
import { findProjectRoot, projectPaths } from '@novel/core/assets/paths.js';
import {
  CheatSystemFrontmatter,
  PowersFrontmatter,
  WorldviewFrontmatter,
  checkCheatPowersConsistency,
  checkCheatSystemR2,
} from '@novel/core/schemas/world.js';
import { NotInProjectError, NovelError } from '@novel/core/utils/errors.js';
import { chalk, log } from '@novel/core/utils/logger.js';
import { runWorldBuild, type WorldBuildOptions } from '../workflows/world-flow.js';

type WorldAsset = 'worldview' | 'powers' | 'cheat-system' | 'all';

// ---------- show ----------

export async function worldShow(asset: string = 'all'): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const which = asset.toLowerCase() as WorldAsset;
  if (!['worldview', 'powers', 'cheat-system', 'all'].includes(which)) {
    throw new NovelError(
      `非法的资产名：${asset}（允许 worldview / powers / cheat-system / all）`,
    );
  }

  let printed = 0;

  if ((which === 'all' || which === 'worldview') && worldviewExists(root)) {
    const w = await readWorldview(root);
    log.heading(`==== worldview (v${w.version}) ====`);
    log.plain(renderWorldviewBody(w.data, w.data.era));
    printed++;
  }

  if ((which === 'all' || which === 'powers') && powersExists(root)) {
    const p = await readPowers(root);
    log.heading(`==== powers (v${p.version}) ====`);
    log.plain(renderPowersBody(p.data, p.data.system_name));
    printed++;
  }

  if ((which === 'all' || which === 'cheat-system') && cheatSystemExists(root)) {
    const cs = await readCheatSystem(root);
    log.heading(`==== cheat-system (v${cs.version}) ====`);
    log.plain(renderCheatSystemBody(cs.data, cs.data.name));
    printed++;
  }

  if (printed === 0) {
    log.warn(
      which === 'all'
        ? 'world/ 目录下没有任何资产。'
        : `${which} 还未创建。`,
    );
    log.hint('运行 `novel world build` 启动建世界三步工作流。');
  }
}

// ---------- list ----------

interface AssetRow {
  name: string;
  exists: boolean;
  /** MD frontmatter status (only when MD exists). */
  status?: string;
  /** Asset version from JSON. */
  version?: number;
}

export async function worldList(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const p = projectPaths(root);
  const rows: AssetRow[] = [];

  // worldview
  if (worldviewExists(root)) {
    const json = await readWorldview(root);
    let mdStatus = '?';
    try {
      const md = await readMarkdownAsset(p.worldview, WorldviewFrontmatter);
      mdStatus = md.frontmatter.status;
    } catch {
      /* ignore */
    }
    rows.push({ name: 'worldview', exists: true, status: mdStatus, version: json.version });
  } else {
    rows.push({ name: 'worldview', exists: false });
  }

  // powers
  if (powersExists(root)) {
    const json = await readPowers(root);
    let mdStatus = '?';
    try {
      const md = await readMarkdownAsset(p.powers, PowersFrontmatter);
      mdStatus = md.frontmatter.status;
    } catch {
      /* ignore */
    }
    rows.push({ name: 'powers', exists: true, status: mdStatus, version: json.version });
  } else {
    rows.push({ name: 'powers', exists: false });
  }

  // cheat-system
  if (cheatSystemExists(root)) {
    const json = await readCheatSystem(root);
    let mdStatus = '?';
    try {
      const md = await readMarkdownAsset(p.cheatSystem, CheatSystemFrontmatter);
      mdStatus = md.frontmatter.status;
    } catch {
      /* ignore */
    }
    rows.push({ name: 'cheat-system', exists: true, status: mdStatus, version: json.version });
  } else {
    rows.push({ name: 'cheat-system', exists: false });
  }

  log.heading('世界三件套');
  for (const row of rows) {
    if (!row.exists) {
      log.plain(`  ${chalk.red('✗')} ${row.name.padEnd(14)} ${chalk.dim('未创建')}`);
    } else {
      const statusColor =
        row.status === 'approved' ? chalk.green : row.status === 'drafting' ? chalk.yellow : chalk.dim;
      log.plain(
        `  ${chalk.green('✓')} ${row.name.padEnd(14)} ${statusColor(row.status ?? '?')} ${chalk.dim(`v${row.version}`)}`,
      );
    }
  }

  const ws = worldStatus(root);
  log.plain('');
  if (ws.allPresent) {
    log.success('三件套齐全。运行 `novel character build` 进入角色阶段。');
  } else {
    log.hint(`已建 ${ws.count}/3。运行 \`novel world build${ws.count > 0 ? ' --resume' : ''}\` 继续。`);
  }
}

// ---------- build ----------

export async function worldBuild(opts: WorldBuildOptions = {}): Promise<void> {
  await runWorldBuild(opts);
}

// ---------- approve ----------

export async function worldApprove(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  // R1: all 3 assets must exist.
  const ws = worldStatus(root);
  if (!ws.allPresent) {
    throw new NovelError(
      `还差 ${3 - ws.count} 个 world 资产未创建（worldview/powers/cheat-system）`,
      {
        hint: '先运行 `novel world build` 把三件套建齐。',
      },
    );
  }

  // Read all 3 (re-validates schema).
  const [w, p, cs] = await Promise.all([
    readWorldview(root),
    readPowers(root),
    readCheatSystem(root),
  ]);

  // R2: cheat-system 必须包含代价/限制/冷却之一。
  const r2Issues = checkCheatSystemR2(cs.data);
  if (r2Issues.length > 0) {
    throw new NovelError(`approve 失败：cheat-system R2 强约束未满足\n${r2Issues.map((s) => '  • ' + s).join('\n')}`, {
      hint: '运行 `novel world build --resume` 补齐 cheat-system 的限制条目。',
    });
  }

  // R3: cheat-system stages 不能超出 powers.protagonist_curve 范围（informational hard check）。
  const consistencyIssues = checkCheatPowersConsistency(cs.data, p.data);
  if (consistencyIssues.length > 0) {
    log.warn('cheat-system 与 powers 一致性问题（不阻止 approve，但建议修复）：');
    for (const issue of consistencyIssues) {
      log.warn('  • ' + issue);
    }
  }

  // Re-write each asset with status='approved'. This bumps version + updated_at.
  await writeWorldview(root, w, 'approved');
  await writePowers(root, p, 'approved');
  await writeCheatSystem(root, cs, 'approved');

  log.success('worldview / powers / cheat-system 已全部标记 approved');
  log.hint('下一步：设计角色（`novel character build`）');
}

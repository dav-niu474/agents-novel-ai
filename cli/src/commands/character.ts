/**
 * `novel character <list|show|build|add|approve>` — character-atelier CRUD.
 *
 * Assets:
 *   - characters/<role>-<slug>.{json,md}  (one card per character)
 *   - characters/_index.json              (registry)
 *   - characters/relationships.{json,md}   (relationship graph)
 *
 * Each card is JSON canonical + MD projection (same contract as worldforge).
 */
import {
  charactersStatus,
  characterCardExists,
  characterIndexExists,
  readCharacter,
  readCharacterIndex,
  readRelationships,
  relationshipsExists,
  writeCharacter,
  writeRelationships,
} from '../core/assets/character.js';
import {
  renderCharacterBody,
  renderRelationshipsBody,
} from '../core/assets/character-render.js';
import { powersExists, readPowers } from '../core/assets/world.js';
import { findProjectRoot } from '../core/assets/paths.js';
import {
  checkAbilityCurveAlignment,
  checkCharacterCardStrong,
  type CharacterIndexEntry,
} from '../core/schemas/character.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { chalk, log } from '../core/utils/logger.js';
import {
  runCharacterAdd,
  runCharacterBuild,
  type CharacterAddOptions,
  type CharacterFlowOptions,
} from '../workflows/character-flow.js';

// ---------- list ----------

export async function characterList(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  if (!characterIndexExists(root)) {
    log.warn('characters/_index.json 还未创建（没有任何角色）。');
    log.hint('运行 `novel character build` 启动捏角色工作流。');
    return;
  }

  const index = await readCharacterIndex(root);
  const d = index.data;

  log.heading('角色清单');
  printBucket('主角', d.protagonist);
  printBucket('反派', d.antagonists);
  printBucket('配角', d.supporting);
  printBucket('其他', d.minor);

  const st = await charactersStatus(root);
  log.plain('');
  log.plain(`关系网：${st.hasRelationships ? chalk.green('✓') : chalk.red('✗')}  ` + chalk.dim(`共 ${st.total} 个角色`));
  log.plain('');
  if (!st.hasProtagonist) {
    log.hint('还没有主角。运行 `novel character build` 先捏主角。');
  } else {
    log.hint('角色齐了就运行 `novel character approve` 校验并定稿；之后进入大纲阶段（alpha-2c）。');
  }
}

function printBucket(label: string, entries: ReadonlyArray<CharacterIndexEntry>): void {
  if (entries.length === 0) return;
  log.plain(chalk.bold(`  ${label}（${entries.length}）`));
  for (const e of entries) {
    log.plain(
      `    ${chalk.green('•')} ${e.name.padEnd(10)} ${chalk.dim(e.id)} ` +
        `${chalk.cyan(e.tier)} ${chalk.dim(`首次第 ${e.first_appear_chapter} 章`)}`,
    );
  }
}

// ---------- show ----------

export async function characterShow(target: string = 'all'): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const which = target.toLowerCase();

  if (which === 'relationships' || which === 'rel') {
    await showRelationships(root);
    return;
  }

  if (which === 'all') {
    if (!characterIndexExists(root)) {
      log.warn('还没有任何角色。运行 `novel character build`。');
      return;
    }
    const index = await readCharacterIndex(root);
    const all = [
      ...index.data.protagonist,
      ...index.data.antagonists,
      ...index.data.supporting,
      ...index.data.minor,
    ];
    if (all.length === 0) {
      log.warn('_index.json 里没有角色。');
      return;
    }
    for (const entry of all) {
      await printCard(root, entry.id);
    }
    if (relationshipsExists(root)) await showRelationships(root);
    return;
  }

  // Otherwise treat the argument as a character id.
  let exists = false;
  try {
    exists = characterCardExists(root, target);
  } catch {
    exists = false; // malformed id → treated as "not found" below
  }
  if (!exists) {
    throw new NovelError(`找不到角色：${target}`, {
      hint: '用 `novel character list` 查看所有角色 ID，或 `novel character show all`。',
    });
  }
  await printCard(root, target);
}

async function printCard(root: string, id: string): Promise<void> {
  const c = await readCharacter(root, id);
  log.heading(`==== ${id} (v${c.version}) ====`);
  log.plain(renderCharacterBody(c.data));
}

async function showRelationships(root: string): Promise<void> {
  if (!relationshipsExists(root)) {
    log.warn('relationships 还未创建。');
    log.hint('运行 `novel character build` 或 `novel character add` 后选择更新关系网。');
    return;
  }
  const rel = await readRelationships(root);
  log.heading(`==== relationships (v${rel.version}) ====`);
  log.plain(renderRelationshipsBody(rel.data));
}

// ---------- build / add ----------

export async function characterBuild(opts: CharacterFlowOptions = {}): Promise<void> {
  await runCharacterBuild(opts);
}

export async function characterAdd(opts: CharacterAddOptions = {}): Promise<void> {
  await runCharacterAdd(opts);
}

// ---------- approve ----------

export async function characterApprove(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const st = await charactersStatus(root);
  if (!st.hasProtagonist) {
    throw new NovelError('还没有主角，无法 approve', {
      hint: '先运行 `novel character build` 至少捏出主角。',
    });
  }

  const index = await readCharacterIndex(root);
  const entries = [
    ...index.data.protagonist,
    ...index.data.antagonists,
    ...index.data.supporting,
    ...index.data.minor,
  ];

  // Hard check: every card must pass the strong completeness rules (R1/R3/R4).
  const blocking: string[] = [];
  for (const entry of entries) {
    const c = await readCharacter(root, entry.id);
    blocking.push(...checkCharacterCardStrong(c.data));
  }
  if (blocking.length > 0) {
    throw new NovelError(
      `approve 失败：${blocking.length} 个角色完整度问题\n${blocking.map((s) => '  • ' + s).join('\n')}`,
      { hint: '运行 `novel character build --resume` 或 `novel character add` 补齐后重试。' },
    );
  }

  // Soft check: protagonist ability curve vs powers.protagonist_curve (R2).
  if (powersExists(root)) {
    const powers = (await readPowers(root)).data;
    for (const entry of index.data.protagonist) {
      const c = await readCharacter(root, entry.id);
      const align = checkAbilityCurveAlignment(c.data, powers);
      if (align.length > 0) {
        log.warn('主角能力曲线与 powers 不完全对齐（不阻止 approve，但建议修复）：');
        for (const a of align) log.warn('  • ' + a);
      }
    }
  }

  if (!st.hasRelationships) {
    log.warn('还没有 relationships（关系网）。建议补一个，但不阻止 approve。');
  }

  // Flip every card (and relationships) to approved. Each write bumps version.
  for (const entry of entries) {
    const c = await readCharacter(root, entry.id);
    await writeCharacter(root, c, 'approved');
  }
  if (relationshipsExists(root)) {
    const rel = await readRelationships(root);
    await writeRelationships(root, rel, 'approved');
  }

  log.success(`已将 ${entries.length} 个角色卡标记 approved`);
  log.hint('下一步：写大纲（alpha-2c 实现 `novel outline ...`）');
}

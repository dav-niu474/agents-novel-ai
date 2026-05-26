/**
 * Worldforge 三阶段交互式 build 工作流。
 *
 * Pinned to skills/novel-worldforge/SKILL.md §3 (3 个 sub-workflow A.1/A.2/A.3).
 *
 * 三个子流程顺序执行（强依赖 - cheat-system 引用 powers 的境界曲线）：
 *   1. worldview     — 世界观（era / factions / regions / physical rules）
 *   2. powers        — 力量等级（境界 + 主角曲线）
 *   3. cheat-system  — 金手指（依赖前两步的章节锚点）
 *
 * 每个资产 3 种填写模式：
 *   - llm-draft：让 LLM 一次性产出整份 JSON data（带 schema 提示），用户审校
 *   - editor：把当前 JSON 丢进 $EDITOR 让用户手编（适合喜欢全控制的人）
 *   - skip：写一个最小占位（schema 通过但内容是 <待填>）
 *
 * 与 blueprint workflow 的核心差异：blueprint 是 10 段自由文本，逐步收集；
 * world 是结构化嵌套数据，整体生成 + 编辑更高效。
 */
import { confirm, editor, select } from '@inquirer/prompts';
import type { ZodType } from 'zod';
import { readBlueprint } from '../core/assets/blueprint.js';
import { readNovel } from '../core/assets/novel.js';
import { findProjectRoot } from '../core/assets/paths.js';
import {
  buildInitialCheatSystem,
  buildInitialPowers,
  buildInitialWorldview,
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  readWorldview,
  worldviewExists,
  writeCheatSystem,
  writePowers,
  writeWorldview,
} from '../core/assets/world.js';
import { createProvider } from '../core/llm/factory.js';
import type { LLMProvider } from '../core/llm/provider.js';
import type { Blueprint } from '../core/schemas/blueprint.js';
import {
  CheatSystem,
  CheatSystemData,
  Powers,
  PowersData,
  Worldview,
  WorldviewData,
  type CheatSystem as TCheatSystem,
  type Powers as TPowers,
  type Worldview as TWorldview,
} from '../core/schemas/world.js';
import type { Novel } from '../core/schemas/novel.js';
import { compileSystemPrompt } from '../core/skills/compiler.js';
import { loadSkill } from '../core/skills/loader.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { nowISO } from '../core/utils/time.js';
import { formatZodError } from '../core/utils/zod-format.js';
import { chalk, log } from '../core/utils/logger.js';

// =============================================================================
//  Public entry
// =============================================================================

export interface WorldBuildOptions {
  /** Only fill assets that are still missing or in 'drafting' status. */
  resume?: boolean;
  /** Force the mock LLM provider. */
  mockLLM?: boolean;
  /** Skip LLM entirely; only editor / skip modes available. */
  noLLM?: boolean;
  /** Initial brain dump fed into LLM prompts (additive context). */
  hint?: string;
}

export async function runWorldBuild(opts: WorldBuildOptions = {}): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  // Pre-flight checks: blueprint must be approved.
  const novel = await readNovel(root);
  let blueprint: Blueprint;
  try {
    blueprint = await readBlueprint(root);
  } catch {
    throw new NovelError('blueprint.md 还未创建', {
      hint: '先跑 `novel blueprint start` 完成 10 步定盘。',
    });
  }
  if (blueprint.frontmatter.status !== 'approved') {
    const goAhead = await confirm({
      message: 'blueprint 还不是 approved 状态。世界观会基于未定稿的蓝图生成，可能需要返工。继续？',
      default: false,
    });
    if (!goAhead) {
      log.hint('运行 `novel blueprint approve` 先定稿蓝图。');
      return;
    }
  }

  // Resolve LLM provider (optional).
  let provider: LLMProvider | null = null;
  if (!opts.noLLM) {
    try {
      provider = await createProvider({
        projectRoot: root,
        skill: 'novel-worldforge',
        ...(opts.mockLLM ? { mock: true } : {}),
      });
      log.info(`LLM provider: ${provider.name}/${provider.model}`);
    } catch (err) {
      log.warn(`LLM provider 不可用：${(err as Error).message}`);
      log.hint('继续以纯手工 / 编辑器模式运行。');
    }
  } else {
    log.info('已 --no-llm，纯手工模式');
  }

  // Compile a base system prompt from the worldforge skill.
  const skill = await loadSkill('novel-worldforge');
  const systemPrompt = compileSystemPrompt(skill, {
    projectRoot: root,
    extraRules: [
      'CLI 调用：你必须只输出**纯 JSON**（没有 markdown fence、没有注释、没有前后说明）。',
      'JSON 必须严格匹配 schema，所有必填字段都要有值。',
      '你输出的是 `data` 字段的内容（不要包外层的 schema_version / asset_type 等元数据）。',
    ],
  });

  // Each step is a fully self-contained sub-workflow.
  await runWorldviewStep({ root, novel, blueprint, opts, provider, systemPrompt });
  await runPowersStep({ root, novel, blueprint, opts, provider, systemPrompt });
  await runCheatSystemStep({ root, novel, blueprint, opts, provider, systemPrompt });

  log.heading('🎉 三件套完成');
  log.info('运行 `novel world list` 查看摘要，`novel world approve` 锁定 status=approved。');
}

// =============================================================================
//  Step context (shared across 3 sub-workflows)
// =============================================================================

interface StepCtx {
  root: string;
  novel: Novel;
  blueprint: Blueprint;
  opts: WorldBuildOptions;
  provider: LLMProvider | null;
  systemPrompt: string;
}

type Mode = 'llm-draft' | 'editor' | 'skip' | 'keep';

async function chooseMode(
  assetLabel: string,
  hasExisting: boolean,
  hasProvider: boolean,
): Promise<Mode> {
  type Choice = { value: Mode; name: string; disabled?: boolean };
  const choices: Choice[] = [];
  choices.push({ value: 'llm-draft', name: '让 LLM 起草整份 JSON', disabled: !hasProvider });
  choices.push({ value: 'editor', name: '打开编辑器手动编辑 JSON' });
  if (hasExisting) {
    choices.push({ value: 'keep', name: '保留现有内容，下一步' });
  }
  choices.push({ value: 'skip', name: '跳过（写一个占位，之后再 build --resume）' });

  return select<Mode>({
    message: `${assetLabel} 怎么处理？`,
    choices,
  });
}

// =============================================================================
//  Step 1 — worldview
// =============================================================================

async function runWorldviewStep(ctx: StepCtx): Promise<void> {
  log.heading('第 1/3 步 · 世界观（worldview）');
  log.plain(chalk.dim('era / 时间线 / 势力 / 地理 / 物理规则 / 信息边界'));

  const exists = worldviewExists(ctx.root);
  if (exists && ctx.opts.resume) {
    const w = await readWorldview(ctx.root);
    if (!isPlaceholder(w.data.era)) {
      log.info(chalk.dim('worldview.json 已存在且非占位，--resume 模式下跳过。'));
      return;
    }
  }

  let mode = await chooseMode('worldview', exists, ctx.provider !== null);
  if (mode === 'skip') {
    if (!exists) {
      const initial = buildInitialWorldview();
      await writeWorldview(ctx.root, initial, 'drafting');
      log.warn('已写占位 worldview.json，下次跑 `novel world build --resume` 继续。');
    }
    return;
  }
  if (mode === 'keep') return;

  const userPrompt = buildWorldviewUserPrompt(ctx);

  while (true) {
    const data = await collectAssetData<WorldviewData>({
      mode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      schema: WorldviewData,
      currentJson: exists ? JSON.stringify((await readWorldview(ctx.root)).data, null, 2) : WORLDVIEW_TEMPLATE_JSON,
      assetLabel: 'worldview.data',
    });
    if (data === null) return;

    log.heading('worldview 草稿预览');
    log.plain(`era: ${data.era}`);
    log.plain(`tagline: ${data.tagline}`);
    log.plain(`timeline: ${data.timeline.length} 个锚点`);
    log.plain(`factions: ${data.factions.length} 个势力 (${countByStance(data.factions)})`);
    log.plain(`regions: ${data.regions.length} 个区域`);
    log.plain(`physical_rules: ${data.physical_rules.length} 条`);

    const next = await select<'accept' | 'refine' | 'cancel'>({
      message: '满意吗？',
      choices: [
        { value: 'accept', name: '✓ 接受并保存' },
        { value: 'refine', name: '✏ 还想改（重新进编辑器或问 LLM）' },
        { value: 'cancel', name: '✗ 退出（这一步不保存）' },
      ],
    });

    if (next === 'cancel') return;
    if (next === 'accept') {
      const ts = nowISO();
      const w: TWorldview = Worldview.parse({
        schema_version: '1.0',
        asset_type: 'worldview',
        asset_id: 'worldview-main',
        created_at: ts,
        updated_at: ts,
        version: 1,
        data,
      });
      await writeWorldview(ctx.root, w, 'drafting');
      log.success('worldview.json + worldview.md 已写入');
      return;
    }
    // refine — pick mode again and loop with updated mode
    const newMode = await chooseMode('worldview（refine）', true, ctx.provider !== null);
    if (newMode === 'skip' || newMode === 'keep') return;
    mode = newMode;
  }
}

function buildWorldviewUserPrompt(ctx: StepCtx): string {
  const sections = ctx.blueprint.sections;
  return `当前任务：建世界观 worldview。

书名：${ctx.novel.title}
题材：${ctx.novel.genre.join(', ')}
平台：${ctx.novel.platform_target.join(', ')}

【蓝图关键信息】
- 一句话定盘：${nonEmpty(sections.pitch)}
- 题材定位：${nonEmpty(sections.positioning)}
- 主角画像：${nonEmpty(sections.protagonist)}
- 金手指：${nonEmpty(sections.cheat_system)}
- 长期意图：${nonEmpty(sections.long_term_intent)}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}
请按下面 schema 输出**纯 JSON 对象**（即 worldview.data 字段的内容），不要 markdown fence，不要注释，不要前后说明。

JSON 必须包含字段：
- era (string): 时代名，如 "末法纪元"
- year_anchor (number): 当代锚点年份
- tagline (string): 大背景一句话
- timeline (array): 至少 3 个锚点 {epoch, name, summary}，epoch 可用 ancient/middle-ancient/remote/near/current
- factions (array): 2-4 个势力 {id, name, type, stance, key_traits[]}，stance 必须是 ally/antagonist/neutral/fringe
- regions (array): 2-4 个地理 {id, name, controlled_by}
- physical_rules (array of string): 3-7 条物理规则，每条要能解释/限制金手指
- info_boundaries: {protagonist_unknown[], protagonist_misknown[]}

参考示例（《吞天魔帝》）：
${WORLDVIEW_EXAMPLE_JSON}

只输出最终 JSON 对象。`;
}

// =============================================================================
//  Step 2 — powers
// =============================================================================

async function runPowersStep(ctx: StepCtx): Promise<void> {
  log.heading('第 2/3 步 · 力量等级（powers）');
  log.plain(chalk.dim('境界体系 + 主角境界曲线（驱动每章主角能用什么招）'));

  const exists = powersExists(ctx.root);
  if (exists && ctx.opts.resume) {
    const p = await readPowers(ctx.root);
    if (p.data.not_applicable || !isPlaceholder(p.data.system_name)) {
      log.info(chalk.dim('powers.json 已存在且非占位，--resume 模式下跳过。'));
      return;
    }
  }

  let mode = await chooseMode('powers', exists, ctx.provider !== null);
  if (mode === 'skip') {
    if (!exists) {
      const initial = buildInitialPowers();
      await writePowers(ctx.root, initial, 'drafting');
      log.warn('已写占位 powers.json，下次跑 `novel world build --resume` 继续。');
    }
    return;
  }
  if (mode === 'keep') return;

  // Read worldview for context (assumed present after step 1; if user skipped it, we just don't include).
  const worldviewSnippet = worldviewExists(ctx.root)
    ? JSON.stringify((await readWorldview(ctx.root)).data, null, 2)
    : '（尚未建 worldview）';

  const userPrompt = buildPowersUserPrompt(ctx, worldviewSnippet);

  while (true) {
    const data = await collectAssetData<PowersData>({
      mode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      schema: PowersData,
      currentJson: exists ? JSON.stringify((await readPowers(ctx.root)).data, null, 2) : POWERS_TEMPLATE_JSON,
      assetLabel: 'powers.data',
    });
    if (data === null) return;

    log.heading('powers 草稿预览');
    log.plain(`体系：${data.system_name} (${data.genre_basis})`);
    log.plain(`境界数：${data.stages.length}`);
    log.plain(`主角曲线锚点：${data.protagonist_curve.length}`);
    if (data.not_applicable) log.warn('not_applicable=true（本书无力量等级体系）');

    const next = await select<'accept' | 'refine' | 'cancel'>({
      message: '满意吗？',
      choices: [
        { value: 'accept', name: '✓ 接受并保存' },
        { value: 'refine', name: '✏ 重新生成 / 编辑' },
        { value: 'cancel', name: '✗ 退出' },
      ],
    });
    if (next === 'cancel') return;
    if (next === 'accept') {
      const ts = nowISO();
      const p: TPowers = Powers.parse({
        schema_version: '1.0',
        asset_type: 'powers',
        asset_id: 'powers-main',
        created_at: ts,
        updated_at: ts,
        version: 1,
        data,
      });
      await writePowers(ctx.root, p, 'drafting');
      log.success('powers.json + powers.md 已写入');
      return;
    }
    const newMode = await chooseMode('powers（refine）', true, ctx.provider !== null);
    if (newMode === 'skip' || newMode === 'keep') return;
    mode = newMode;
  }
}

function buildPowersUserPrompt(ctx: StepCtx, worldviewSnippet: string): string {
  const sections = ctx.blueprint.sections;
  const target = ctx.novel.target_chapters ?? 800;
  return `当前任务：建力量等级体系 powers。

【书名】${ctx.novel.title}（目标 ${target} 章）
【题材】${ctx.novel.genre.join(', ')}
【蓝图金手指】${nonEmpty(sections.cheat_system)}
【蓝图长期意图】${nonEmpty(sections.long_term_intent)}

【已建好的 worldview.data】
${worldviewSnippet}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}

请输出 powers.data JSON。要求：

- system_name (string)
- genre_basis (enum)：根据题材选 xuanhuan-custom / xianxia-classic / xianxia-classic-simplified / urban-tier / urban-faction / wuxia-traditional / scifi-tech-tier / scifi-civilization / apocalypse-evolution / game-leveled / romance-not-applicable / other
- stages (array)：5-8 个境界，按 order 升序。每个 {id, name, order, sub_levels[], core_features[], breakthrough_requires[], avg_breakthrough_years?, lifespan_bonus_years?, population_pct_among_cultivators?}
- protagonist_curve (array)：5-9 个锚点 {chapter, stage, context}，章节必须在 [1, ${target}] 范围内，且严格递增
- info_boundaries: {hidden_stages[], protagonist_unknown_until_chapter[{fact, until_chapter}]}
- not_applicable (boolean)：题材不需要力量体系（言情等）置 true，其他置 false

不要 markdown fence，不要注释，只输出纯 JSON 对象。

参考结构（《吞天魔帝》）：
${POWERS_EXAMPLE_JSON}`;
}

// =============================================================================
//  Step 3 — cheat-system
// =============================================================================

async function runCheatSystemStep(ctx: StepCtx): Promise<void> {
  log.heading('第 3/3 步 · 金手指（cheat-system）');
  log.plain(chalk.dim('网文核心差异化资产；必须有代价 / 限制 / 冷却 之一（R2 强约束）'));

  const exists = cheatSystemExists(ctx.root);
  if (exists && ctx.opts.resume) {
    const cs = await readCheatSystem(ctx.root);
    if (cs.data.not_applicable || !isPlaceholder(cs.data.name)) {
      log.info(chalk.dim('cheat-system.json 已存在且非占位，--resume 模式下跳过。'));
      return;
    }
  }

  let mode = await chooseMode('cheat-system', exists, ctx.provider !== null);
  if (mode === 'skip') {
    if (!exists) {
      const initial = buildInitialCheatSystem();
      await writeCheatSystem(ctx.root, initial, 'drafting');
      log.warn('已写占位 cheat-system.json，下次跑 `novel world build --resume` 继续。');
    }
    return;
  }
  if (mode === 'keep') return;

  const worldviewSnippet = worldviewExists(ctx.root)
    ? JSON.stringify((await readWorldview(ctx.root)).data, null, 2)
    : '（无）';
  const powersSnippet = powersExists(ctx.root)
    ? JSON.stringify((await readPowers(ctx.root)).data, null, 2)
    : '（无）';

  const userPrompt = buildCheatSystemUserPrompt(ctx, worldviewSnippet, powersSnippet);

  while (true) {
    const data = await collectAssetData<CheatSystemData>({
      mode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      schema: CheatSystemData,
      currentJson: exists ? JSON.stringify((await readCheatSystem(ctx.root)).data, null, 2) : CHEAT_SYSTEM_TEMPLATE_JSON,
      assetLabel: 'cheat-system.data',
    });
    if (data === null) return;

    log.heading('cheat-system 草稿预览');
    log.plain(`名字：${data.name} (${data.type})`);
    log.plain(`触发：${data.trigger.join(', ')}`);
    log.plain(`代价：${data.cost.primary} (${data.cost.scaling || 'n/a'})`);
    log.plain(`阶梯：${data.stages.length} tiers`);
    log.plain(`限制：${data.limits.length} 条 [${data.limits.map((l) => l.category).join(', ')}]`);
    log.plain(`节拍：${data.beats.length} 个`);

    // R2 hard check before allowing accept
    const r2 = checkR2Local(data);
    if (r2.length > 0) {
      log.warn('⚠ R2 校验失败：');
      for (const issue of r2) log.warn('  ' + issue);
      log.hint('请回到编辑器/LLM 补充 limits（resource/backlash/cooldown 至少一项），否则 approve 会被拒。');
    }

    const next = await select<'accept' | 'refine' | 'cancel'>({
      message: r2.length > 0 ? '有 R2 警告，仍要保存草稿？' : '满意吗？',
      choices: [
        { value: 'accept', name: r2.length > 0 ? '⚠ 仍保存（drafting，需修复后才能 approve）' : '✓ 接受并保存' },
        { value: 'refine', name: '✏ 重新生成 / 编辑' },
        { value: 'cancel', name: '✗ 退出' },
      ],
    });
    if (next === 'cancel') return;
    if (next === 'accept') {
      const ts = nowISO();
      const cs: TCheatSystem = CheatSystem.parse({
        schema_version: '1.0',
        asset_type: 'cheat-system',
        asset_id: `cheat-${data.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'main'}`,
        created_at: ts,
        updated_at: ts,
        version: 1,
        data,
      });
      await writeCheatSystem(ctx.root, cs, 'drafting');
      log.success('cheat-system.json + cheat-system.md 已写入');
      return;
    }
    const newMode = await chooseMode('cheat-system（refine）', true, ctx.provider !== null);
    if (newMode === 'skip' || newMode === 'keep') return;
    mode = newMode;
  }
}

function buildCheatSystemUserPrompt(ctx: StepCtx, worldviewSnippet: string, powersSnippet: string): string {
  const sections = ctx.blueprint.sections;
  const target = ctx.novel.target_chapters ?? 800;
  return `当前任务：建金手指 cheat-system（中文网文核心差异化资产）。

【书名】${ctx.novel.title}（目标 ${target} 章）
【蓝图金手指（用户已确认）】${nonEmpty(sections.cheat_system)}
【蓝图卖点钩子】${nonEmpty(sections.hooks)}

【worldview.data】
${worldviewSnippet}

【powers.data】
${powersSnippet}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}

请输出 cheat-system.data JSON。**强约束 R2**：limits 数组必须至少包含 1 个 category 为 resource / backlash / cooldown 的条目，否则会被 approve 时拒绝。

字段：
- name (string)
- type (enum): analyzer / system / simulator / summoner / copier / evolver / time / hybrid
- definition (string): 一句话
- trigger (array of enum): 至少 1 个，从 physical-contact / visual-line-of-sight / voice-utterance / mental-focus / blood-ritual / consume-resource / time-based 选
- cost: {primary: enum, scaling: string}
  primary: spiritual-power / qi / lifespan / blood / memory / currency / none
- output_format (string)
- stages (array): 至少 3 个 tier，每个 {tier, chapter_range:[start, end|null], cap, unlock_condition, cost_multiplier, modes[], alt_cost?}
  chapter_range 必须落在 [1, ${target}]，且 stages 之间章节区间应顺序衔接
- limits (array): 至少 3 条，每条 {category, rule, ...}
  category 必须包含 resource / backlash / cooldown 之一（R2 硬约束）
- beats (array): 关键章节节拍 {chapter, type, event}
  type: first-use / windfall / comeback / cost-reveal / stage-up / backlash / transcend
- anti_patterns (array of string): 至少 3 条 chapter-writer 禁止的写法
- not_applicable (boolean): 题材无金手指置 true，否则 false

不要 markdown fence，不要注释，只输出纯 JSON 对象。

参考（《吞天魔帝·天工残卷》）：
${CHEAT_SYSTEM_EXAMPLE_JSON}`;
}

// =============================================================================
//  Generic asset-data collector (LLM or editor mode)
// =============================================================================

interface CollectArgs<T> {
  mode: Mode;
  provider: LLMProvider | null;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  currentJson: string;
  assetLabel: string;
}

async function collectAssetData<T>(args: CollectArgs<T>): Promise<T | null> {
  if (args.mode === 'editor') {
    return collectViaEditor(args);
  }
  if (args.mode === 'llm-draft') {
    if (!args.provider) {
      log.warn('LLM provider 不可用，回退到 editor 模式');
      return collectViaEditor(args);
    }
    return collectViaLLM({ ...args, provider: args.provider });
  }
  return null;
}

async function collectViaEditor<T>(args: CollectArgs<T>): Promise<T | null> {
  let attempt = 0;
  let draft = args.currentJson;
  while (attempt < 3) {
    attempt++;
    const text = await editor({
      message: `编辑 ${args.assetLabel}（保存退出后会校验 schema）`,
      default: draft,
      postfix: '.json',
    });
    const parsed = tryParseJson(text);
    if (parsed === null) {
      log.warn('JSON 解析失败，请检查语法。');
      const retry = await confirm({ message: '再编辑一次？', default: true });
      if (!retry) return null;
      draft = text; // keep their attempt for re-edit
      continue;
    }
    const result = args.schema.safeParse(parsed);
    if (!result.success) {
      log.warn(`Schema 校验失败：\n${formatZodError(result.error)}`);
      const retry = await confirm({ message: '再编辑一次？', default: true });
      if (!retry) return null;
      draft = text;
      continue;
    }
    return result.data;
  }
  log.error('连续 3 次校验失败，放弃这一步。');
  return null;
}

async function collectViaLLM<T>(args: CollectArgs<T> & { provider: LLMProvider }): Promise<T | null> {
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const spinner = log.spinner(`询问 ${args.provider.name}/${args.provider.model}（第 ${attempt} 次）...`).start();
    let response: string;
    try {
      const res = await args.provider.chat(
        [
          { role: 'system', content: args.systemPrompt },
          { role: 'user', content: args.userPrompt },
        ],
        { temperature: 0.7, maxTokens: 4096 },
      );
      response = res.content;
      spinner.stop();
    } catch (err) {
      spinner.fail('LLM 调用失败');
      log.error(`LLM 错误：${(err as Error).message}`);
      const retry = await confirm({ message: '再试一次？', default: true });
      if (!retry) return null;
      continue;
    }

    const parsed = extractJsonFromLLMResponse(response);
    if (parsed === null) {
      log.warn('LLM 响应里找不到合法 JSON。原始片段：');
      log.plain(chalk.dim(response.slice(0, 400)));
      const choice = await select<'retry' | 'editor' | 'cancel'>({
        message: '怎么办？',
        choices: [
          { value: 'retry', name: '让 LLM 再生成一次' },
          { value: 'editor', name: '直接打开编辑器手填' },
          { value: 'cancel', name: '退出这一步' },
        ],
      });
      if (choice === 'retry') continue;
      if (choice === 'editor') return collectViaEditor(args);
      return null;
    }

    const result = args.schema.safeParse(parsed);
    if (!result.success) {
      log.warn(`LLM 输出 schema 校验失败：\n${formatZodError(result.error)}`);
      const choice = await select<'retry' | 'editor' | 'cancel'>({
        message: '怎么办？',
        choices: [
          { value: 'retry', name: '让 LLM 重新生成（可能修好）' },
          { value: 'editor', name: '把当前输出导入编辑器手动修' },
          { value: 'cancel', name: '退出这一步' },
        ],
      });
      if (choice === 'retry') continue;
      if (choice === 'editor') {
        return collectViaEditor({ ...args, currentJson: JSON.stringify(parsed, null, 2) });
      }
      return null;
    }
    return result.data;
  }
  log.error('连续 3 次 LLM 输出都不合格，放弃这一步。');
  return null;
}

// =============================================================================
//  Helpers
// =============================================================================

function nonEmpty(s: string | null | undefined): string {
  return s && s.trim().length > 0 ? s : '（蓝图未填）';
}

function isPlaceholder(s: string): boolean {
  return /^<[^>]+>$/.test(s.trim());
}

function countByStance(factions: ReadonlyArray<{ stance: string }>): string {
  const counts: Record<string, number> = {};
  for (const f of factions) counts[f.stance] = (counts[f.stance] ?? 0) + 1;
  return Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Extract a JSON object/array from an LLM response that may contain prose / fences. */
function extractJsonFromLLMResponse(text: string): unknown {
  const trimmed = text.trim();
  // Direct
  const direct = tryParseJson(trimmed);
  if (direct !== null) return direct;

  // Markdown fence
  const fence = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) {
    const fenced = tryParseJson(fence[1]!);
    if (fenced !== null) return fenced;
  }

  // First { ... last }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    const obj = tryParseJson(slice);
    if (obj !== null) return obj;
  }

  return null;
}

/** Local R2 check (mirrors core/schemas/world.ts:checkCheatSystemR2 but inline). */
function checkR2Local(data: CheatSystemData): string[] {
  if (data.not_applicable) return [];
  if (data.limits.length === 0) {
    return ['cheat-system 没有任何 limits（必须至少 1 个 resource/backlash/cooldown）'];
  }
  const cats = new Set(data.limits.map((l) => l.category));
  if (!cats.has('resource') && !cats.has('backlash') && !cats.has('cooldown')) {
    return [
      'cheat-system limits 缺少 resource/backlash/cooldown 之一（仅 target/public 不够，那是龙傲天式无代价）',
    ];
  }
  return [];
}

// Suppress unused variable warning — kept for future expansion
// (currently no inline use; type imports are kept for the strict prompt mode soon).

// =============================================================================
//  Schema reference templates (embedded in LLM prompts as examples)
// =============================================================================

const WORLDVIEW_TEMPLATE_JSON = JSON.stringify(
  {
    era: '<待填>',
    year_anchor: 0,
    tagline: '<一句话大背景>',
    timeline: [],
    factions: [],
    regions: [],
    physical_rules: [],
    info_boundaries: { protagonist_unknown: [], protagonist_misknown: [] },
  },
  null,
  2,
);

const WORLDVIEW_EXAMPLE_JSON = JSON.stringify(
  {
    era: '末法纪元',
    year_anchor: 500,
    tagline: '末法纪元，灵气枯竭五百年；但上古的力量正在悄悄回归。',
    timeline: [
      { epoch: 'ancient', name: '上古', summary: '群仙时代' },
      { epoch: 'near', name: '近古', summary: '仙路断绝（500 年前）' },
      { epoch: 'current', name: '当代', summary: '末法纪元 500 年' },
    ],
    factions: [
      { id: 'qingyun', name: '青云宗', type: 'sect', stance: 'neutral', key_traits: ['剑修传承', '九大宗门之一'] },
      { id: 'xuanxiao', name: '玄霄宗', type: 'sect', stance: 'antagonist', key_traits: ['阴谋深远'] },
    ],
    regions: [{ id: 'central', name: '中州', controlled_by: '九大宗门联盟' }],
    physical_rules: ['灵气稀薄：当代日均吸纳量为上古 1%', '法宝退化：上古法宝几乎全失效', '解析悖论：直接解析他人功法会反噬'],
    info_boundaries: {
      protagonist_unknown: ['末法的真正原因（卷 7 揭示）'],
      protagonist_misknown: ['以为残卷是青云宗祖师遗物（实则来自上古失败者）'],
    },
  },
  null,
  2,
);

const POWERS_TEMPLATE_JSON = JSON.stringify(
  {
    system_name: '<待填>',
    genre_basis: 'other',
    stages: [],
    protagonist_curve: [],
    info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
    not_applicable: false,
  },
  null,
  2,
);

const POWERS_EXAMPLE_JSON = JSON.stringify(
  {
    system_name: '末法纪元修真体系',
    genre_basis: 'xianxia-classic-simplified',
    stages: [
      {
        id: 'lianqi',
        name: '炼气',
        order: 1,
        sub_levels: ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层'],
        core_features: ['灵气吸纳', '肉身强化'],
        breakthrough_requires: ['灵气池满', '顿悟'],
        avg_breakthrough_years: 4,
      },
      {
        id: 'zhuji',
        name: '筑基',
        order: 2,
        sub_levels: ['初期', '中期', '后期', '圆满'],
        core_features: ['凝聚法力', '可御物'],
        breakthrough_requires: ['筑基丹'],
        avg_breakthrough_years: 15,
      },
    ],
    protagonist_curve: [
      { chapter: 1, stage: '炼气一层', context: '被欺凌' },
      { chapter: 30, stage: '炼气七层', context: '解出师兄漏洞反杀' },
      { chapter: 100, stage: '筑基中期', context: '脱离宗门' },
    ],
    info_boundaries: {
      hidden_stages: ['化神之上还有逆天 / 证道两境'],
      protagonist_unknown_until_chapter: [{ fact: '化神不是终点', until_chapter: 800 }],
    },
    not_applicable: false,
  },
  null,
  2,
);

const CHEAT_SYSTEM_TEMPLATE_JSON = JSON.stringify(
  {
    name: '<待填>',
    type: 'analyzer',
    definition: '<一句话定义>',
    trigger: ['mental-focus'],
    cost: { primary: 'spiritual-power', scaling: 'complexity-tiered' },
    output_format: '',
    stages: [],
    limits: [],
    beats: [],
    anti_patterns: [],
    not_applicable: false,
  },
  null,
  2,
);

const CHEAT_SYSTEM_EXAMPLE_JSON = JSON.stringify(
  {
    name: '天工残卷',
    type: 'analyzer',
    definition: '可解析任何亲自接触过的功法 / 法宝 / 灵植 / 气息，输出原理 + 缺陷 + 优化方向。',
    trigger: ['physical-contact', 'mental-focus', 'consume-resource'],
    cost: { primary: 'spiritual-power', scaling: 'complexity-tiered' },
    output_format: '三层文字浮现脑海：原理 → 缺陷 → 优化方向',
    stages: [
      { tier: 1, chapter_range: [1, 30], cap: '炼气-筑基初期功法', unlock_condition: 'natural', cost_multiplier: 1, modes: [] },
      { tier: 2, chapter_range: [30, 100], cap: '金丹功法', unlock_condition: '主角达筑基初期', cost_multiplier: 3, modes: [] },
      { tier: 4, chapter_range: [300, null], cap: '可改写 / 创造', unlock_condition: '主角元婴后期', cost_multiplier: 0, alt_cost: 'memory', modes: ['rewrite', 'create'] },
    ],
    limits: [
      { category: 'resource', rule: '高频解析消耗精神力，过量会昏迷' },
      { category: 'backlash', rule: '解析血脉禁制 / 心魔功法会被反向解析' },
      { category: 'cooldown', rule: '同一目标 24 小时内只能解析一次', duration_hours: 24 },
    ],
    beats: [
      { chapter: 1, type: 'first-use', event: '解析野生灵草' },
      { chapter: 5, type: 'comeback', event: '解析师兄漏洞反杀' },
      { chapter: 50, type: 'stage-up', event: '一阶封印解开' },
    ],
    anti_patterns: ['主角随意解析任何东西不付代价', 'Tier 1 解析金丹功法', '解析三层文字一次出全'],
    not_applicable: false,
  },
  null,
  2,
);

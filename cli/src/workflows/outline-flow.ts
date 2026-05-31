/**
 * Outline-architect interactive build workflow.
 *
 * Pinned to skills/novel-outline-architect/SKILL.md §4 工作流 A (首次写大纲):
 *   总纲 (master) → 第 1 卷卷纲 (volume) → 前 5-10 章章纲 (chapters)
 *
 * Three fill modes per asset (same vocabulary as world-flow):
 *   - llm-draft : ask the LLM to draft the full Markdown body, user reviews
 *   - editor    : open $EDITOR seeded with the current body / skeleton
 *   - skip      : write a placeholder skeleton (status=drafting) for later resume
 *
 * Difference from world-flow: outline assets are Markdown-canonical (no JSON
 * sidecar), so the collector returns a Markdown *body* (the CLI attaches the
 * validated frontmatter) rather than a JSON `data` object. Completeness is a
 * soft warning at build time and a hard gate at `novel outline approve`.
 *
 * Per .kiro steering: the SKILL.md body is the source of truth for *how* to
 * design outlines; this file only injects runtime context + an output-format
 * reminder, never a copy of the workflow narrative.
 */
import { confirm, editor, input, select } from '@inquirer/prompts';
import { readBlueprint } from '../core/assets/blueprint.js';
import { readNovel } from '../core/assets/novel.js';
import { findProjectRoot, projectPaths } from '../core/assets/paths.js';
import {
  buildInitialChapterOutline,
  buildInitialOutlineMaster,
  buildInitialVolumeOutline,
  chapterFieldLabel,
  chapterOutlineExists,
  listMissingChapterFields,
  listMissingMasterSections,
  listMissingVolumeSections,
  outlineMasterExists,
  readChapterOutline,
  readOutlineMaster,
  readVolumeOutline,
  syncOutlineStatus,
  volumeOutlineExists,
  writeChapterOutline,
  writeOutlineMaster,
  writeVolumeOutline,
  type ChapterOutlineDoc,
  type OutlineMasterDoc,
  type VolumeOutlineDoc,
} from '../core/assets/outline.js';
import {
  renderChapterSkeleton,
  renderMasterSkeleton,
  renderVolumeSkeleton,
} from '../core/assets/outline-render.js';
import {
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  readWorldview,
  worldviewExists,
} from '../core/assets/world.js';
import { existsSync } from 'node:fs';
import { createProvider } from '../core/llm/factory.js';
import type { LLMProvider } from '../core/llm/provider.js';
import type { Blueprint } from '../core/schemas/blueprint.js';
import type { Novel } from '../core/schemas/novel.js';
import type { ChapterRange } from '../core/schemas/outline.js';
import type { CheatSystemData, PowersData, WorldviewData } from '../core/schemas/world.js';
import { compileSystemPrompt } from '../core/skills/compiler.js';
import { loadSkill } from '../core/skills/loader.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { chalk, log } from '../core/utils/logger.js';

// =============================================================================
//  Public entry
// =============================================================================

export interface OutlineBuildOptions {
  /** Only (re)fill assets that are missing or still incomplete. */
  resume?: boolean;
  /** Force the mock LLM provider. */
  mockLLM?: boolean;
  /** Skip LLM entirely; editor / skip modes only. */
  noLLM?: boolean;
  /** Extra brain-dump fed into LLM prompts. */
  hint?: string;
  /** Which volume to draft chapters for (default 1). */
  volume?: number;
  /** How many chapter outlines to draft in this pass (default 5). */
  chapters?: number;
  /** Explicit chapter range "a-b" for the volume (skips the interactive prompt). */
  range?: string;
}

export async function runOutlineBuild(opts: OutlineBuildOptions = {}): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const novel = await readNovel(root);

  // Pre-flight: blueprint must exist (approved preferred).
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
      message: 'blueprint 还不是 approved。大纲会基于未定稿的蓝图生成，可能返工。继续？',
      default: false,
    });
    if (!goAhead) {
      log.hint('运行 `novel blueprint approve` 先定稿蓝图。');
      return;
    }
  }

  // Pre-flight: world 三件套必须就绪（章纲的爽点节拍依赖 cheat-system.beats）。
  if (!worldviewExists(root) || !powersExists(root) || !cheatSystemExists(root)) {
    throw new NovelError('world/ 三件套未就绪（worldview / powers / cheat-system）', {
      hint: '先跑 `novel world build` 把世界三件套建齐，再写大纲。',
    });
  }

  // Soft pre-flight: characters/_index.json（alpha-2b 尚未实现 `novel character`）。
  // 章纲会以纯文本引用角色 ID，不强制要求角色索引存在，但提醒用户。
  if (!existsSync(projectPaths(root).characters.index)) {
    log.warn('characters/_index.json 不存在（character-atelier 是 alpha-2b，尚未实现 CLI）。');
    log.hint('章纲里的"必出场角色"会以角色 ID 文本引用；等 alpha-2b 落地后可补建角色索引。');
  }

  // Resolve LLM provider (optional).
  let provider: LLMProvider | null = null;
  if (!opts.noLLM) {
    try {
      provider = await createProvider({
        projectRoot: root,
        skill: 'novel-outline-architect',
        ...(opts.mockLLM ? { mock: true } : {}),
      });
      log.info(`LLM provider: ${provider.name}/${provider.model}`);
    } catch (err) {
      log.warn(`LLM provider 不可用：${errMessage(err)}`);
      log.hint('继续以编辑器 / skip 模式运行。');
    }
  } else {
    log.info('已 --no-llm，编辑器 / skip 模式');
  }

  const skill = await loadSkill('novel-outline-architect');
  const systemPrompt = compileSystemPrompt(skill, {
    projectRoot: root,
    extraRules: [
      'CLI 调用：你只输出**纯 Markdown 正文**（从一级标题 `#` 开始），不要 YAML frontmatter，不要 ```fence```，不要前后说明——frontmatter 由 CLI 自动写。',
      '严格使用模板要求的二级标题（## ...）结构；章纲必须包含编号 1-9 的全部九个字段。',
    ],
  });

  // Load world context once for prompt building.
  const worldview = (await readWorldview(root)).data;
  const powers = (await readPowers(root)).data;
  const cheat = (await readCheatSystem(root)).data;

  const ctx: StepCtx = {
    root,
    novel,
    blueprint,
    opts,
    provider,
    systemPrompt,
    worldview,
    powers,
    cheat,
  };

  await runMasterStep(ctx);
  const range = await runVolumeStep(ctx);
  if (range) await runChaptersStep(ctx, range);

  await syncOutlineStatus(root);

  log.heading('🎉 大纲首批完成');
  log.info('运行 `novel outline list` 查看摘要；`novel outline approve ...` 锁定 status=approved。');
  log.hint('第 6 章起建议走写作期 PLAN 阶段滚动产出（alpha-2d `novel plan` 实现）。');
}

// =============================================================================
//  Step context + shared helpers
// =============================================================================

interface StepCtx {
  root: string;
  novel: Novel;
  blueprint: Blueprint;
  opts: OutlineBuildOptions;
  provider: LLMProvider | null;
  systemPrompt: string;
  worldview: WorldviewData;
  powers: PowersData;
  cheat: CheatSystemData;
}

type Mode = 'llm-draft' | 'editor' | 'skip' | 'keep';

async function chooseMode(label: string, hasExisting: boolean, hasProvider: boolean): Promise<Mode> {
  type Choice = { value: Mode; name: string; disabled?: boolean };
  const choices: Choice[] = [];
  choices.push({ value: 'llm-draft', name: '让 LLM 起草整份 Markdown', disabled: !hasProvider });
  choices.push({ value: 'editor', name: '打开编辑器手写 / 编辑 Markdown' });
  if (hasExisting) choices.push({ value: 'keep', name: '保留现有内容，下一步' });
  choices.push({ value: 'skip', name: '跳过（写占位骨架，之后 build --resume）' });
  return select<Mode>({ message: `${label} 怎么处理？`, choices });
}

type Decision = 'accept' | 'refine' | 'cancel';

async function askDecision(hasWarnings: boolean): Promise<Decision> {
  return select<Decision>({
    message: hasWarnings ? '有缺失段落警告，仍要保存草稿（drafting）？' : '满意吗？',
    choices: [
      { value: 'accept', name: hasWarnings ? '⚠ 仍保存（drafting，需补齐后才能 approve）' : '✓ 接受并保存' },
      { value: 'refine', name: '✏ 重新生成 / 编辑' },
      { value: 'cancel', name: '✗ 退出这一步' },
    ],
  });
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function nonEmpty(s: string | null | undefined): string {
  return s && s.trim().length > 0 ? s : '（蓝图未填）';
}

function previewBody(body: string, maxLines = 16): string {
  const lines = body.split('\n');
  if (lines.length <= maxLines) return body;
  return lines.slice(0, maxLines).join('\n') + '\n' + chalk.dim(`… (+${lines.length - maxLines} 行)`);
}

/** Brief, factual world context for prompts (NOT a copy of SKILL workflow text). */
function worldContextBlock(ctx: StepCtx): string {
  const beats = ctx.cheat.not_applicable
    ? '（无金手指）'
    : ctx.cheat.beats.map((b) => `  - 第 ${b.chapter} 章 [${b.type}] ${b.event}`).join('\n') || '（cheat-system 未列 beats）';
  const curve = ctx.powers.not_applicable
    ? '（题材无境界体系）'
    : ctx.powers.protagonist_curve.map((p) => `  - 第 ${p.chapter} 章：${p.stage}`).join('\n') || '（未列主角曲线）';
  return [
    `世界纪元：${ctx.worldview.era}`,
    `金手指：${ctx.cheat.not_applicable ? '（无）' : ctx.cheat.name}`,
    `金手指节拍（beats）：\n${beats}`,
    `主角境界曲线：\n${curve}`,
  ].join('\n');
}

// =============================================================================
//  Markdown body collector (LLM or editor)
// =============================================================================

interface CollectArgs {
  mode: Mode;
  provider: LLMProvider | null;
  systemPrompt: string;
  userPrompt: string;
  currentBody: string;
  assetLabel: string;
}

async function collectMarkdownBody(args: CollectArgs): Promise<string | null> {
  if (args.mode === 'editor') {
    return collectViaEditor(args.assetLabel, args.currentBody);
  }
  if (args.mode === 'llm-draft') {
    if (!args.provider) {
      log.warn('LLM provider 不可用，回退到编辑器模式。');
      return collectViaEditor(args.assetLabel, args.currentBody);
    }
    return collectViaLLM(args, args.provider);
  }
  // 'skip' / 'keep' never reach here (handled by callers), but stay total.
  return null;
}

async function collectViaEditor(assetLabel: string, currentBody: string): Promise<string | null> {
  const text = await editor({
    message: `编辑 ${assetLabel}（Markdown 正文，保存退出后预览）`,
    default: currentBody,
    postfix: '.md',
  });
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    log.warn('正文为空，放弃这一步。');
    return null;
  }
  return trimmed;
}

async function collectViaLLM(args: CollectArgs, provider: LLMProvider): Promise<string | null> {
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const spinner = log.spinner(`询问 ${provider.name}/${provider.model}（第 ${attempt} 次）...`).start();
    let response: string;
    try {
      const res = await provider.chat(
        [
          { role: 'system', content: args.systemPrompt },
          { role: 'user', content: args.userPrompt },
        ],
        { temperature: 0.8, maxTokens: 4096 },
      );
      response = res.content;
      spinner.stop();
    } catch (err) {
      spinner.fail('LLM 调用失败');
      log.error(`LLM 错误：${errMessage(err)}`);
      const retry = await confirm({ message: '再试一次？', default: true });
      if (!retry) return null;
      continue;
    }

    const body = stripToMarkdownBody(response);
    if (body.length === 0) {
      log.warn('LLM 没有产出可用正文。原始片段：');
      log.plain(chalk.dim(response.slice(0, 300)));
      const choice = await select<'retry' | 'editor' | 'cancel'>({
        message: '怎么办？',
        choices: [
          { value: 'retry', name: '让 LLM 再生成一次' },
          { value: 'editor', name: '打开编辑器手写' },
          { value: 'cancel', name: '退出这一步' },
        ],
      });
      if (choice === 'retry') continue;
      if (choice === 'editor') return collectViaEditor(args.assetLabel, args.currentBody);
      return null;
    }
    return body;
  }
  log.error('连续 3 次 LLM 输出都不可用，放弃这一步。');
  return null;
}

/** Strip a wrapping code fence and any LLM-added YAML frontmatter; return body. */
function stripToMarkdownBody(text: string): string {
  let t = text.trim();
  const fence = t.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/);
  if (fence) t = (fence[1] ?? '').trim();
  const fm = t.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  if (fm) t = (fm[1] ?? '').trim();
  return t;
}

// =============================================================================
//  Step 1 — 总纲 (master)
// =============================================================================

async function runMasterStep(ctx: StepCtx): Promise<void> {
  log.heading('第 1/3 步 · 总纲（master）');
  log.plain(chalk.dim('主题驱动 / 主线 N 幕 / 卷列表 / 长期伏笔 / 关键里程碑'));

  const exists = outlineMasterExists(ctx.root);
  if (exists && ctx.opts.resume) {
    const cur = await readOutlineMaster(ctx.root);
    if (listMissingMasterSections(cur.body).length === 0) {
      log.info(chalk.dim('master.md 已完整，--resume 跳过。'));
      return;
    }
  }

  let mode = await chooseMode('总纲 master', exists, ctx.provider !== null);
  if (mode === 'skip') {
    if (!exists) {
      await writeOutlineMaster(ctx.root, buildInitialOutlineMaster(ctx.novel.title), 'drafting');
      log.warn('已写占位 master.md，下次 `novel outline build --resume` 继续。');
    }
    return;
  }
  if (mode === 'keep') return;

  const base: OutlineMasterDoc = exists
    ? await readOutlineMaster(ctx.root)
    : buildInitialOutlineMaster(ctx.novel.title);
  const userPrompt = buildMasterUserPrompt(ctx);
  let currentBody = exists ? base.body : renderMasterSkeleton(`总纲：《${ctx.novel.title}》`);

  while (true) {
    const body = await collectMarkdownBody({
      mode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      currentBody,
      assetLabel: 'outline/master.md',
    });
    if (body === null) return;
    currentBody = body;

    const missing = listMissingMasterSections(body);
    log.heading('总纲预览');
    log.plain(previewBody(body));
    if (missing.length > 0) log.warn(`缺少必填段落：${missing.join(' / ')}`);

    const decision = await askDecision(missing.length > 0);
    if (decision === 'cancel') return;
    if (decision === 'accept') {
      await writeOutlineMaster(ctx.root, { frontmatter: base.frontmatter, body }, 'drafting');
      log.success('outline/master.md 已写入（drafting）');
      return;
    }
    const newMode = await chooseMode('总纲（refine）', true, ctx.provider !== null);
    if (newMode === 'skip' || newMode === 'keep') return;
    mode = newMode;
  }
}

function buildMasterUserPrompt(ctx: StepCtx): string {
  const s = ctx.blueprint.sections;
  const target = ctx.novel.target_chapters ?? 800;
  return `任务：写整本书的总纲（outline/master.md）。

书名：${ctx.novel.title}（目标约 ${target} 章）
题材：${ctx.novel.genre.join(', ')}

【蓝图关键信息】
- 一句话定盘：${nonEmpty(s.pitch)}
- 主角画像：${nonEmpty(s.protagonist)}
- 金手指：${nonEmpty(s.cheat_system)}
- 前 30 章承诺 / 钩子：${nonEmpty(s.hooks)}
- 长期意图：${nonEmpty(s.long_term_intent)}

【世界上下文】
${worldContextBlock(ctx)}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}
输出 Markdown 正文，必须包含这些二级标题：
## 主题驱动（一句话）
## 主线五幕   （4-6 幕，每幕标注卷范围 + 章范围 + 目标 + 转折）
## 卷列表     （表格：卷号 / 卷名 / 章节范围 / 卷主题）
## 长期伏笔   （≥ 3 条，每条标 hook_id + 预计兑现卷）
## 关键里程碑章节

从一级标题 \`# 总纲：《${ctx.novel.title}》\` 开始，只输出正文。`;
}

// =============================================================================
//  Step 2 — 卷纲 (volume)
// =============================================================================

/** Returns the chapter range that was set for the volume (for the chapters step), or null if skipped/cancelled. */
async function runVolumeStep(ctx: StepCtx): Promise<ChapterRange | null> {
  const volumeNo = ctx.opts.volume ?? 1;
  log.heading(`第 2/3 步 · 卷纲（volume-${String(volumeNo).padStart(2, '0')}）`);
  log.plain(chalk.dim('卷主题 / 卷高潮 / 5 段式 / 必出桥段 / 卷末钩子'));

  const exists = volumeOutlineExists(ctx.root, volumeNo);

  if (exists && ctx.opts.resume) {
    const cur = await readVolumeOutline(ctx.root, volumeNo);
    if (listMissingVolumeSections(cur.body).length === 0) {
      log.info(chalk.dim(`volume-${String(volumeNo).padStart(2, '0')}.md 已完整，--resume 跳过。`));
      return cur.frontmatter.chapter_range;
    }
  }

  // Resolve chapter range.
  let range: ChapterRange;
  if (exists) {
    range = (await readVolumeOutline(ctx.root, volumeNo)).frontmatter.chapter_range;
  } else {
    range = await resolveVolumeRange(ctx, volumeNo);
  }

  let mode = await chooseMode(`卷纲 volume-${String(volumeNo).padStart(2, '0')}`, exists, ctx.provider !== null);
  if (mode === 'skip') {
    if (!exists) {
      await writeVolumeOutline(ctx.root, buildInitialVolumeOutline(volumeNo, range), 'drafting');
      log.warn('已写占位卷纲，下次 `novel outline build --resume` 继续。');
    }
    return range;
  }
  if (mode === 'keep') return range;

  const base: VolumeOutlineDoc = exists
    ? await readVolumeOutline(ctx.root, volumeNo)
    : buildInitialVolumeOutline(volumeNo, range);
  const userPrompt = buildVolumeUserPrompt(ctx, volumeNo, range);
  let currentBody = exists ? base.body : renderVolumeSkeleton(volumeNo, range);

  while (true) {
    const body = await collectMarkdownBody({
      mode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      currentBody,
      assetLabel: `outline/volumes/volume-${String(volumeNo).padStart(2, '0')}.md`,
    });
    if (body === null) return range;
    currentBody = body;

    const missing = listMissingVolumeSections(body);
    log.heading('卷纲预览');
    log.plain(previewBody(body));
    if (missing.length > 0) log.warn(`缺少必填段落：${missing.join(' / ')}`);

    const decision = await askDecision(missing.length > 0);
    if (decision === 'cancel') return range;
    if (decision === 'accept') {
      await writeVolumeOutline(ctx.root, { frontmatter: base.frontmatter, body }, 'drafting');
      log.success('卷纲已写入（drafting）');
      return range;
    }
    const newMode = await chooseMode('卷纲（refine）', true, ctx.provider !== null);
    if (newMode === 'skip' || newMode === 'keep') return range;
    mode = newMode;
  }
}

async function resolveVolumeRange(ctx: StepCtx, volumeNo: number): Promise<ChapterRange> {
  if (ctx.opts.range) {
    const parsed = parseRange(ctx.opts.range);
    if (parsed) return parsed;
    log.warn(`--range "${ctx.opts.range}" 格式不对（应如 1-50），改为交互询问。`);
  }
  const defaultStart = (volumeNo - 1) * 50 + 1;
  const answer = await input({
    message: `第 ${volumeNo} 卷章节范围（如 ${defaultStart}-${defaultStart + 49}）`,
    default: `${defaultStart}-${defaultStart + 49}`,
    validate: (v) => (parseRange(v) ? true : '格式应为 起始-结束，且结束 ≥ 起始'),
  });
  // validate() guarantees parseRange succeeds here.
  return parseRange(answer) ?? [defaultStart, defaultStart + 49];
}

function parseRange(s: string): ChapterRange | null {
  const m = s.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  const start = Number.parseInt(m[1] ?? '', 10);
  const end = Number.parseInt(m[2] ?? '', 10);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) return null;
  return [start, end];
}

function buildVolumeUserPrompt(ctx: StepCtx, volumeNo: number, range: ChapterRange): string {
  const s = ctx.blueprint.sections;
  const beatsInRange = ctx.cheat.not_applicable
    ? '（无）'
    : ctx.cheat.beats
        .filter((b) => b.chapter >= range[0] && b.chapter <= range[1])
        .map((b) => `  - 第 ${b.chapter} 章 [${b.type}] ${b.event}`)
        .join('\n') || '（本卷范围内 cheat-system 未列 beats）';
  return `任务：写第 ${volumeNo} 卷卷纲（第 ${range[0]}-${range[1]} 章）。

书名：${ctx.novel.title}
【蓝图前 30 章承诺】${nonEmpty(s.hooks)}
【本卷范围内的金手指节拍】
${beatsInRange}
【主角境界曲线】见下
${worldContextBlock(ctx)}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}
输出 Markdown 正文，必须包含这些二级标题：
## 卷主题
## 卷高潮          （明确章节 + 事件，不能"未来某天"）
## 节奏分段（5 段式）  （起/承/转/合/高潮，标章节区间）
## 必出现的桥段     （≥ 5 个表格行，每行标来源：blueprint 钩子 / cheat beats / 角色弧光）
## 卷末钩子（给下一卷的承诺）
## 角色出场计划
## 与金手指节拍的耦合

从一级标题 \`# 第 ${volumeNo} 卷《卷名》卷纲\` 开始，只输出正文。`;
}

// =============================================================================
//  Step 3 — 前 N 章章纲 (chapters)
// =============================================================================

async function runChaptersStep(ctx: StepCtx, range: ChapterRange): Promise<void> {
  const count = ctx.opts.chapters ?? 5;
  const startCh = range[0];
  const endCh = Math.min(range[0] + count - 1, range[1]);

  log.heading(`第 3/3 步 · 章纲（第 ${startCh}-${endCh} 章，共 ${endCh - startCh + 1} 章）`);
  log.plain(chalk.dim('9 字段契约（R1）；这是 chapter-writer 的唯一直接输入'));
  log.hint('SKILL 建议：第一次只写前 5-10 章，剩下走写作期 PLAN 滚动产出。');

  for (let ch = startCh; ch <= endCh; ch++) {
    const done = await runOneChapter(ctx, ch);
    if (done === 'cancel-all') {
      log.warn('已退出章纲阶段（剩余章节未产出）。');
      return;
    }
  }
}

async function runOneChapter(ctx: StepCtx, ch: number): Promise<'next' | 'cancel-all'> {
  const volumeNo = ctx.opts.volume ?? 1;
  log.heading(`章纲 · 第 ${ch} 章`);

  const exists = chapterOutlineExists(ctx.root, ch);
  if (exists && ctx.opts.resume) {
    const cur = await readChapterOutline(ctx.root, ch);
    if (listMissingChapterFields(cur.body).length === 0) {
      log.info(chalk.dim(`chapter-${String(ch).padStart(4, '0')}.md 9 字段齐全，--resume 跳过。`));
      return 'next';
    }
  }

  let mode = await chooseMode(`第 ${ch} 章章纲`, exists, ctx.provider !== null);
  if (mode === 'skip') {
    if (!exists) {
      await writeChapterOutline(
        ctx.root,
        buildInitialChapterOutline(ch, volumeNo, ctx.novel.target_chapter_words),
        'drafting',
      );
      log.warn(`已写占位 chapter-${String(ch).padStart(4, '0')}.md。`);
    }
    return 'next';
  }
  if (mode === 'keep') return 'next';

  const base: ChapterOutlineDoc = exists
    ? await readChapterOutline(ctx.root, ch)
    : buildInitialChapterOutline(ch, volumeNo, ctx.novel.target_chapter_words);
  const userPrompt = buildChapterUserPrompt(ctx, ch, volumeNo);
  let currentBody = exists ? base.body : renderChapterSkeleton(ch);

  while (true) {
    const body = await collectMarkdownBody({
      mode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      currentBody,
      assetLabel: `outline/chapters/chapter-${String(ch).padStart(4, '0')}.md`,
    });
    if (body === null) return 'next';
    currentBody = body;

    const missing = listMissingChapterFields(body);
    log.heading(`第 ${ch} 章章纲预览`);
    log.plain(previewBody(body));
    if (missing.length > 0) {
      log.warn(`R1 缺字段（共 ${missing.length}）：${missing.map(chapterFieldLabel).join(' / ')}`);
    }

    const decision = await select<'accept' | 'refine' | 'cancel-step' | 'cancel-all'>({
      message: missing.length > 0 ? 'R1 未满足（9 字段不全），仍保存草稿？' : '满意吗？',
      choices: [
        { value: 'accept', name: missing.length > 0 ? '⚠ 仍保存（drafting）' : '✓ 接受并保存（drafting）' },
        { value: 'refine', name: '✏ 重新生成 / 编辑' },
        { value: 'cancel-step', name: '↷ 跳过这一章' },
        { value: 'cancel-all', name: '✗ 退出整个章纲阶段' },
      ],
    });
    if (decision === 'cancel-all') return 'cancel-all';
    if (decision === 'cancel-step') return 'next';
    if (decision === 'accept') {
      await writeChapterOutline(ctx.root, { frontmatter: base.frontmatter, body }, 'drafting');
      log.success(`chapter-${String(ch).padStart(4, '0')}.md 已写入（drafting）`);
      if (ch === 1 || ch === 5) {
        log.hint(`第 ${ch} 章是关键章（开场 / 第一爽点），建议 \`novel outline approve chapter ${ch}\` 明确定稿。`);
      }
      return 'next';
    }
    const newMode = await chooseMode(`第 ${ch} 章（refine）`, true, ctx.provider !== null);
    if (newMode === 'skip' || newMode === 'keep') return 'next';
    mode = newMode;
  }
}

function buildChapterUserPrompt(ctx: StepCtx, ch: number, volumeNo: number): string {
  const s = ctx.blueprint.sections;
  const beatHere = ctx.cheat.not_applicable
    ? null
    : ctx.cheat.beats.find((b) => b.chapter === ch);
  const stageHere = ctx.powers.not_applicable
    ? null
    : ctx.powers.protagonist_curve.find((p) => p.chapter === ch);
  const beatLine = beatHere ? `本章对应金手指节拍：[${beatHere.type}] ${beatHere.event}` : '本章无预设金手指节拍（参考前后章）';
  const stageLine = stageHere ? `本章主角境界锚点：${stageHere.stage}（${stageHere.context}）` : '本章无境界锚点（沿用上一锚点，不可越阶）';

  return `任务：写第 ${ch} 章章纲（属于第 ${volumeNo} 卷），target_words=${ctx.novel.target_chapter_words}。

书名：${ctx.novel.title}
【蓝图前 30 章承诺】${nonEmpty(s.hooks)}
【反 AI 味要求】${nonEmpty(s.anti_ai)}
${beatLine}
${stageLine}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}
输出 Markdown 正文，从 \`# 第 ${ch} 章 · 暂定标题\` 开始，必须包含编号 1-9 的全部九个二级标题：
## 1. 一句话目标
## 2. 必出场角色      （含 POV，用角色 ID）
## 3. 必发生事件（按顺序）  （3-5 条）
## 4. 钩子（hookOps）   （mustOpen / mustAdvance / mustClose / mention）
## 5. 爽点节拍         （类型用 first-use/windfall/comeback/cost-reveal/stage-up/backlash/transcend）
## 6. 情绪曲线
## 7. 字数 / 节奏
## 8. 不写
## 9. 与状态的耦合（写完后该更新什么）

R5：主角境界不可超出上面的境界锚点。只输出正文。`;
}

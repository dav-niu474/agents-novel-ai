/**
 * Blueprint 10-step interactive workflow.
 *
 * Pinned to skills/novel-blueprint/SKILL.md §3 工作流 B (10 步定盘).
 *
 * Per step:
 *  1. Print step header + instruction.
 *  2. Show current value (resume mode).
 *  3. Ask user: input directly / ask LLM for candidates / skip / quit.
 *  4. If LLM: call provider with compiled system prompt, render N candidates,
 *     let user pick / refine / redo / type-in.
 *  5. Validate the chosen value (e.g. step 4 must mention 代价/限制).
 *  6. Persist to blueprint.md (atomic write, version-bumped).
 */
import { confirm, editor, input, select } from '@inquirer/prompts';
import {
  buildInitialBlueprint,
  blueprintExists,
  isBlueprintComplete,
  listMissingSections,
  readBlueprint,
  writeBlueprint,
} from '@novel/core/assets/blueprint.js';
import { patchNovel, readNovel } from '@novel/core/assets/novel.js';
import { findProjectRoot } from '@novel/core/assets/paths.js';
import { createProvider } from '@novel/core/llm/factory.js';
import type { LLMProvider } from '@novel/core/llm/provider.js';
import {
  BLUEPRINT_SECTION_KEYS,
  BLUEPRINT_SECTION_TITLES,
  type Blueprint,
  type BlueprintSections,
} from '@novel/core/schemas/blueprint.js';
import { compileSystemPrompt } from '@novel/core/skills/compiler.js';
import { loadSkill } from '@novel/core/skills/loader.js';
import { NotInProjectError, NovelError } from '@novel/core/utils/errors.js';
import { chalk, log } from '@novel/core/utils/logger.js';

// ---------- Step definitions ----------

interface StepDef {
  key: keyof BlueprintSections;
  /** 1-indexed step number for UI. */
  no: number;
  /** Short hint shown above the prompt. */
  instruction: string;
  /** Build the LLM user-prompt for this step. */
  buildPrompt: (ctx: PromptContext) => string;
  /** Optional validation; return error message string to reject. */
  validate?: (value: string) => string | null;
}

interface PromptContext {
  novelTitle: string;
  novelGenre: readonly string[];
  novelPlatforms: readonly string[];
  /** Sections completed so far. Useful so later steps stay consistent. */
  filledSections: Partial<BlueprintSections>;
  /** Optional initial brain dump from `--hint`. */
  hint: string | null;
}

function fmtFilledSections(sections: Partial<BlueprintSections>): string {
  const parts: string[] = [];
  for (const k of BLUEPRINT_SECTION_KEYS) {
    const v = sections[k];
    if (v && v.trim().length > 0) {
      parts.push(`### ${BLUEPRINT_SECTION_TITLES[k]}\n${v.trim()}`);
    }
  }
  return parts.length > 0 ? parts.join('\n\n') : '（暂无）';
}

const STEPS: StepDef[] = [
  {
    key: 'pitch',
    no: 1,
    instruction:
      '一句话定盘：用 1-2 句话写出"这本书是什么书"。建议结构：<主角身份> + <核心冲突 / 处境> + <金手指或差异化> + <最终目标 / 看点>。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 1 步「一句话定盘」。

书名：${ctx.novelTitle}
题材：${ctx.novelGenre.join(', ')}
平台：${ctx.novelPlatforms.join(', ')}
${ctx.hint ? `\n用户的初始想法：\n${ctx.hint}\n` : ''}
请按 SKILL §3.B.1 给我 **3 个候选**「一句话定盘」，每个 1-2 句，差异化体现在不同的"主角身份 / 冲突 / 金手指"。
输出格式：
1. <候选 1>
2. <候选 2>
3. <候选 3>
不要任何前后说明。`,
  },
  {
    key: 'positioning',
    no: 2,
    instruction:
      '题材定位：主题材 / 副题材 / 平台 / 受众 / 标签。novel.json 里的 genre / platform_target 已经填过；这里补充更细的副题材和标签。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 2 步「题材定位」。

书名：${ctx.novelTitle}
已选主题材：${ctx.novelGenre.join(', ')}
已选平台：${ctx.novelPlatforms.join(', ')}
已确定的一句话定盘：
${ctx.filledSections.pitch ?? '（未填）'}

请按 SKILL §3.B.2 输出**一个**最贴合的题材定位段落，包含：
- 主题材（已知）
- 副题材（建议 1-2 个）
- 平台（已知）
- 受众（建议）
- 标签（5-8 个网文常用 tag）

直接输出最终段落，不要候选列表。`,
  },
  {
    key: 'protagonist',
    no: 3,
    instruction:
      '主角一句话画像：现实身份 + 出身/起点 + 性格内核（1-2 个关键词）+ 最深的渴望 / 恐惧。注意 R1：不要 AI 替用户决定主角性格。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 3 步「主角一句话画像」。

书名：${ctx.novelTitle}
已确定：
${fmtFilledSections(ctx.filledSections)}

请按 SKILL §3.B.3 给我 **3 个候选**主角画像，每个一句话。差异化体现在不同的"出身锚点 / 性格内核 / 渴望"。
不要写"天选之子 / 龙傲天"。
输出格式：
1. <候选 1>
2. <候选 2>
3. <候选 3>
不要任何前后说明。`,
  },
  {
    key: 'cheat_system',
    no: 4,
    instruction:
      '【中文网文核心】金手指一句话：<名字> + <能做什么> + <触发条件> + <核心代价 / 限制>。⚠ 必须包含代价 / 限制（R2 强约束），不接受龙傲天式无代价金手指。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 4 步「金手指一句话」。

书名：${ctx.novelTitle}
已确定：
${fmtFilledSections(ctx.filledSections)}

按 SKILL §3.B.4 给我 **3 个候选**金手指。每个候选必须明确包含：
1. 名字
2. 能做什么
3. 触发条件
4. 核心代价 / 限制（**强约束：每个候选必须有代价**）

输出格式：
1. <候选 1>
2. <候选 2>
3. <候选 3>
不要任何前后说明。`,
    validate: (v) => {
      const lower = v;
      if (!/(代价|限制|消耗|反噬|冷却|副作用|时间冷却|代偿|cost)/.test(lower)) {
        return '⚠ 金手指必须明确包含代价 / 限制 / 消耗 / 反噬 / 冷却（R2 强约束）。请补充。';
      }
      return null;
    },
  },
  {
    key: 'hooks',
    no: 5,
    instruction:
      '卖点 / 钩子（前 30 章承诺）：4-5 个具体钩子，每个挂到具体章节。第 1 章 / 第 5 章前 / 第 15 章前 / 第 30 章前。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 5 步「卖点 / 钩子（前 30 章承诺）」。

已确定：
${fmtFilledSections(ctx.filledSections)}

按 SKILL §3.B.5 给我 **一个**最终卖点钩子段落。要求：
- 4-5 个钩子
- 每个钩子挂到具体章节（第 1 章 / 第 5 章前 / 第 15 章前 / 第 30 章前）
- 与前面已确定的金手指 / 主角画像逻辑一致

输出 Markdown 列表格式：
- 第 1 章：<…>
- 第 5 章前：<…>
- 第 15 章前：<…>
- 第 30 章前：<…>

不要候选列表，直接输出最终。`,
  },
  {
    key: 'anti_ai',
    no: 6,
    instruction: '反 AI 味要求：高频禁用词 / 禁用句式 / 必备元素。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 6 步「反 AI 味要求」。

已确定：
${fmtFilledSections(ctx.filledSections)}

按 SKILL §3.B.6 直接给出**最终内容**，分 3 小节：
- 高频禁用词：<5-8 个 LLM 高频套话词，如"眉头一皱"、"事情并不简单"、"震撼"、"不可思议">
- 禁用句式：<3-4 项，如"四字成语堆砌"、"过度心理独白">
- 必备元素：<3-5 项，如"具体场景细节"、"五感描写"、"对话占比 30-45%"、"段落 2-4 句">

输出 Markdown 列表，不要候选。`,
  },
  {
    key: 'style_fingerprint',
    no: 7,
    instruction:
      '文风指纹（可选）：是否要导入参考作者 / 文本？如果不导入，直接写"通用网文风"+ 一句话偏好即可。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 7 步「文风指纹」。

已确定：
${fmtFilledSections(ctx.filledSections)}

按 SKILL §3.B.7 提供一段文风指纹描述（200 字内）。
如果用户没指定参考作者，给出"通用网文风"的默认描述（动作干脆 / 对话 30-45% / 段落 2-4 句 / 反 AI 味）。
直接输出最终段落。`,
  },
  {
    key: 'exclusions',
    no: 8,
    instruction: '排除项：明确不写什么、写什么。比"写什么"更重要。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 8 步「排除项」。

已确定：
${fmtFilledSections(ctx.filledSections)}

按 SKILL §3.B.8 给出最终排除项，分两组：
- 不写：<3-5 项，例如"种马"、"龙傲天到底"、"纯打脸爽文">
- 写：<3-5 项，例如"废柴翻身"、"智斗多于硬刚"、"师徒情线">

输出 Markdown 列表，不要候选。`,
  },
  {
    key: 'chapter_rhythm',
    no: 9,
    instruction: '章字数 / 节奏：章字数 / 对话占比 / 段落节奏。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 9 步「章字数 / 节奏」。

已确定：
${fmtFilledSections(ctx.filledSections)}
平台：${ctx.novelPlatforms.join(', ')}

按 SKILL §3.B.9 给出最终章字数与节奏配置：
- 章字数：<起点 / 番茄 推荐 2500-4000，建议默认 3500>
- 对话占比目标：<例如 30-45%>
- 段落节奏：<例如 手机阅读，2-4 句一段>

输出 Markdown 列表。`,
  },
  {
    key: 'long_term_intent',
    no: 10,
    instruction: '长期意图：计划多少卷 / 多少章，整体节奏，结局倾向。',
    buildPrompt: (ctx) => `当前任务：blueprint 第 10 步「长期意图」。

已确定：
${fmtFilledSections(ctx.filledSections)}

按 SKILL §3.B.10 给出最终长期意图，3 项：
- 计划：<X 卷 / Y 章>
- 整体节奏：<前期铺垫 X 章 → 中期 Y 章 → 后期 Z 章>
- 结局倾向：<开放式 / 圆满 / 悲壮 / 反转 / 选 1>

输出 Markdown 列表。`,
  },
];

// ---------- LLM helpers ----------

interface CallLLMOptions {
  provider: LLMProvider;
  systemPrompt: string;
  userPrompt: string;
}

async function callLLM(opts: CallLLMOptions): Promise<string> {
  const spinner = log.spinner(`询问 ${opts.provider.name}/${opts.provider.model}...`).start();
  try {
    const res = await opts.provider.chat(
      [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      { temperature: 0.7, maxTokens: 1024 },
    );
    spinner.stop();
    return res.content.trim();
  } catch (err) {
    spinner.fail('LLM 调用失败');
    throw err;
  }
}

/**
 * Parse an LLM response that's expected to contain numbered candidates
 * `1. ... 2. ... 3. ...`. If no numbered candidates are detected, returns
 * the entire response as a single candidate.
 *
 * JS regex has no `\Z`, so we walk lines manually instead of trying to do it
 * in a single regex.
 */
function parseCandidates(text: string): string[] {
  const numberedLine = /^\s*\d+[.、)]\s*/;
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (numberedLine.test(line)) {
      if (current) blocks.push(current.join('\n').trim());
      current = [line.replace(numberedLine, '')];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current.join('\n').trim());
  const filtered = blocks.filter((b) => b.length > 0);
  if (filtered.length === 0) return [text.trim()];
  return filtered;
}

// ---------- Per-step interaction ----------

type StepDecision =
  | { kind: 'value'; value: string }
  | { kind: 'skip' }
  | { kind: 'quit' };

async function runStep(
  step: StepDef,
  ctx: PromptContext,
  systemPrompt: string,
  provider: LLMProvider | null,
): Promise<StepDecision> {
  log.heading(`第 ${step.no}/10 步 · ${BLUEPRINT_SECTION_TITLES[step.key]}`);
  log.plain(chalk.dim(step.instruction));

  const current = ctx.filledSections[step.key];
  if (current && current.trim().length > 0) {
    log.plain(chalk.dim('\n当前内容：'));
    log.plain(current);
    log.plain('');
  }

  while (true) {
    const hasCurrent = current !== null && current !== undefined && current.trim().length > 0;
    type ActionChoice = 'llm' | 'edit' | 'keep' | 'skip' | 'quit';
    const actionChoices: Array<{ value: ActionChoice; name: string; disabled?: boolean }> = [
      { value: 'llm', name: '让 LLM 出候选', disabled: !provider },
      { value: 'edit', name: '我直接写' },
    ];
    if (hasCurrent) {
      actionChoices.push({ value: 'keep', name: '保留当前内容，下一步' });
    }
    actionChoices.push({ value: 'skip', name: '跳过这一步' });
    actionChoices.push({ value: 'quit', name: '退出（已填部分会保存）' });

    const action = await select<ActionChoice>({
      message: '怎么处理这一步？',
      choices: actionChoices,
    });

    if (action === 'quit') return { kind: 'quit' };
    if (action === 'skip') return { kind: 'skip' };
    if (action === 'keep') {
      if (hasCurrent) return { kind: 'value', value: current as string };
      return { kind: 'skip' };
    }

    if (action === 'edit') {
      const value = await editor({
        message: `直接编辑【${BLUEPRINT_SECTION_TITLES[step.key]}】`,
        default: current ?? '',
        postfix: '.md',
      });
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        log.warn('内容为空，重新选择。');
        continue;
      }
      const err = step.validate?.(trimmed);
      if (err) {
        log.warn(err);
        continue;
      }
      return { kind: 'value', value: trimmed };
    }

    if (action === 'llm') {
      if (!provider) {
        log.warn('LLM provider 未配置，回到选择。');
        continue;
      }
      const userPrompt = step.buildPrompt(ctx);
      const llmResponse = await callLLM({ provider, systemPrompt, userPrompt });
      const candidates = parseCandidates(llmResponse);

      // Show candidates.
      log.heading(`LLM 给出 ${candidates.length} 个候选`);
      candidates.forEach((c, i) => {
        log.plain(chalk.cyan(`\n[${i + 1}] `) + c);
      });

      // Decide what to do with them.
      const pick = await select<number | 'refine' | 'redo' | 'edit' | 'cancel'>({
        message: '选哪个 / 怎么改？',
        choices: [
          ...candidates.map((_, i) => ({
            value: i,
            name: `选用候选 ${i + 1}`,
          })),
          { value: 'refine' as const, name: '让 LLM 基于反馈再生成' },
          { value: 'redo' as const, name: '让 LLM 重新生成（不带反馈）' },
          { value: 'edit' as const, name: '我直接改写' },
          { value: 'cancel' as const, name: '回到上一层选择' },
        ],
      });

      if (pick === 'cancel') continue;
      if (pick === 'redo') continue; // Loop with same prompt; LLM samples again.
      if (pick === 'refine') {
        const feedback = await input({
          message: '告诉 LLM 哪里不对 / 想要什么方向：',
          validate: (v) => v.trim().length > 0 || '反馈不能为空',
        });
        const refinedPrompt = `${userPrompt}\n\n用户对刚才候选的反馈：\n${feedback}\n\n请基于反馈重新给 3 个候选。`;
        const refined = await callLLM({ provider, systemPrompt, userPrompt: refinedPrompt });
        const refinedCandidates = parseCandidates(refined);
        log.heading('LLM 反馈后的候选');
        refinedCandidates.forEach((c, i) => log.plain(chalk.cyan(`\n[${i + 1}] `) + c));
        const pickIdx = await select<number | 'edit' | 'cancel'>({
          message: '选哪个？',
          choices: [
            ...refinedCandidates.map((_, i) => ({
              value: i,
              name: `选用候选 ${i + 1}`,
            })),
            { value: 'edit' as const, name: '我直接改写' },
            { value: 'cancel' as const, name: '回到主选择' },
          ],
        });
        if (pickIdx === 'cancel') continue;
        if (pickIdx === 'edit') {
          const v = await editor({
            message: `编辑【${BLUEPRINT_SECTION_TITLES[step.key]}】`,
            default: refinedCandidates[0] ?? '',
            postfix: '.md',
          });
          const trimmed = v.trim();
          const err = step.validate?.(trimmed);
          if (err) {
            log.warn(err);
            continue;
          }
          return { kind: 'value', value: trimmed };
        }
        const chosen = refinedCandidates[pickIdx];
        if (!chosen) continue;
        const err = step.validate?.(chosen);
        if (err) {
          log.warn(err);
          continue;
        }
        return { kind: 'value', value: chosen };
      }
      if (pick === 'edit') {
        const v = await editor({
          message: `编辑【${BLUEPRINT_SECTION_TITLES[step.key]}】`,
          default: candidates[0] ?? '',
          postfix: '.md',
        });
        const trimmed = v.trim();
        if (trimmed.length === 0) continue;
        const err = step.validate?.(trimmed);
        if (err) {
          log.warn(err);
          continue;
        }
        return { kind: 'value', value: trimmed };
      }
      // Numeric pick: a candidate index.
      const chosen = candidates[pick];
      if (!chosen) continue;
      const err = step.validate?.(chosen);
      if (err) {
        log.warn(err);
        continue;
      }
      return { kind: 'value', value: chosen };
    }
  }
}

// ---------- Public entry ----------

export interface BlueprintFlowOptions {
  /** Only fill missing required sections (default: false → walk all 10). */
  resume?: boolean;
  /** Initial brain dump text, fed into step 1 LLM prompt. */
  hint?: string;
  /** Force the mock LLM provider (for testing / offline use). */
  mockLLM?: boolean;
  /** Skip LLM entirely; user fills everything by hand. */
  noLLM?: boolean;
}

export async function runBlueprintStart(opts: BlueprintFlowOptions = {}): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const novel = await readNovel(root);

  // Load or create the blueprint document.
  let bp: Blueprint;
  if (blueprintExists(root)) {
    bp = await readBlueprint(root);
    log.info(`读取现有 blueprint.md (version ${bp.frontmatter.version}, status ${bp.frontmatter.status})`);
  } else {
    bp = buildInitialBlueprint(novel.title);
    bp = await writeBlueprint(root, bp);
    log.success('blueprint.md 骨架已创建');
  }

  if (bp.frontmatter.status === 'approved') {
    const ok = await confirm({
      message: 'blueprint 已 approved。继续修改会触发 R4（明示影响范围），确认继续？',
      default: false,
    });
    if (!ok) return;
  }

  // Resolve provider.
  let provider: LLMProvider | null = null;
  if (!opts.noLLM) {
    try {
      provider = await createProvider({
        projectRoot: root,
        skill: 'novel-blueprint',
        ...(opts.mockLLM ? { mock: true } : {}),
      });
      log.info(`LLM provider: ${provider.name}/${provider.model}`);
    } catch (err) {
      log.warn(`LLM provider 不可用：${(err as Error).message}`);
      log.hint('继续以纯手工模式运行；想用 LLM 请先 `novel doctor` 修配置。');
    }
  } else {
    log.info('已 --no-llm，纯手工模式');
  }

  // Compile system prompt from skills/novel-blueprint/SKILL.md.
  const skill = await loadSkill('novel-blueprint');
  const systemPrompt = compileSystemPrompt(skill, {
    projectRoot: root,
    extraRules: [
      'CLI 会逐步收集 10 个字段，请只针对当前步骤回答。',
      'R1：不要替用户决定题材 / 主角 / 金手指。给候选，让用户挑。',
      'R2：金手指必须有代价 / 限制 / 消耗 / 反噬 / 冷却 之一。',
      'R3：第 5 步钩子必须挂到具体章节（不晚于 30 章）。',
    ],
  });

  // Determine which steps to run.
  const startFromIdx = opts.resume
    ? Math.max(
        0,
        STEPS.findIndex((s) =>
          listMissingSections(bp.sections).includes(s.key),
        ),
      )
    : 0;

  let aborted = false;
  for (let i = startFromIdx; i < STEPS.length; i++) {
    const step = STEPS[i]!;
    const ctx: PromptContext = {
      novelTitle: novel.title,
      novelGenre: novel.genre,
      novelPlatforms: novel.platform_target,
      filledSections: bp.sections,
      hint: opts.hint ?? null,
    };
    const decision = await runStep(step, ctx, systemPrompt, provider);
    if (decision.kind === 'quit') {
      aborted = true;
      break;
    }
    if (decision.kind === 'skip') {
      log.warn(`已跳过第 ${step.no} 步「${BLUEPRINT_SECTION_TITLES[step.key]}」`);
      continue;
    }
    // Persist after each step.
    bp = {
      ...bp,
      sections: { ...bp.sections, [step.key]: decision.value },
    };
    bp = await writeBlueprint(root, bp);
    log.success(`第 ${step.no} 步已写入 blueprint.md (v${bp.frontmatter.version})`);
  }

  if (aborted) {
    log.warn('\n已退出。已填部分已落盘，下次跑 `novel blueprint start --resume` 继续。');
    return;
  }

  // After step 10: ask whether to approve.
  const missing = listMissingSections(bp.sections);
  if (missing.length > 0) {
    log.warn(
      `\n仍有未填的必填项：${missing
        .map((k) => BLUEPRINT_SECTION_TITLES[k])
        .join(' / ')}`,
    );
    log.hint('用 `novel blueprint start --resume` 补齐。');
    return;
  }

  if (!isBlueprintComplete(bp.sections)) {
    log.warn('blueprint 还未完整，跳过 approve');
    return;
  }

  const ok = await confirm({
    message: '10 步已全部完成。是否标记 status: approved？approved 后下游 skill 才能基于它工作。',
    default: true,
  });
  if (!ok) {
    log.info('保持 drafting 状态。后续可运行 `novel blueprint approve` 提交。');
    return;
  }
  await approveBlueprint();
}

/** Mark the blueprint as approved + sync novel.json.blueprint_status. */
export async function approveBlueprint(): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const bp = await readBlueprint(root);
  const missing = listMissingSections(bp.sections);
  if (missing.length > 0) {
    throw new NovelError(
      `还有必填项未完成：${missing
        .map((k) => BLUEPRINT_SECTION_TITLES[k])
        .join(' / ')}`,
      {
        hint: '运行 `novel blueprint start --resume` 补齐，再 approve。',
      },
    );
  }

  await writeBlueprint(root, {
    ...bp,
    frontmatter: { ...bp.frontmatter, status: 'approved' },
  });
  await patchNovel(root, { blueprint_status: 'approved' });

  log.success('blueprint 已标记 approved，novel.json.blueprint_status 已同步');
  log.hint('下一步：建世界 + 设计金手指（alpha-2 实现 `novel world ...`）');
}

/** Walk the user back through edit/show/start/approve subcommands. */
export type BlueprintExports = typeof STEPS;
export const __steps_for_test__ = STEPS;

/**
 * Shared "collect a structured JSON asset from LLM or editor" helper.
 *
 * Both the worldforge build (alpha-2a) and the character-atelier build
 * (alpha-2b) need the same loop: ask the LLM for a pure-JSON `data` object (or
 * drop the user into $EDITOR), parse it tolerantly, Zod-validate it, and offer
 * retry / editor-fallback / cancel when it doesn't pass.
 *
 * Keeping this in one place means the JSON-extraction tolerance and the
 * validation-retry UX stay consistent across every structured asset.
 */
import { confirm, editor, select } from '@inquirer/prompts';
import type { ZodType } from 'zod';
import type { LLMProvider } from '../core/llm/provider.js';
import { formatZodError } from '../core/utils/zod-format.js';
import { chalk, log } from '../core/utils/logger.js';

/** Fill mode chosen for a single asset. */
export type CollectMode = 'llm-draft' | 'editor' | 'skip' | 'keep';

export interface CollectArgs<T> {
  /** Only 'editor' / 'llm-draft' actually collect; other modes return null. */
  mode: CollectMode;
  provider: LLMProvider | null;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  /** Seed JSON shown in the editor / used as fallback. */
  currentJson: string;
  /** Label shown in prompts, e.g. "worldview.data". */
  assetLabel: string;
}

/**
 * Collect a validated `T` via the chosen mode. Returns null when the user
 * cancels, when the mode is skip/keep, or after repeated validation failures.
 */
export async function collectAssetData<T>(args: CollectArgs<T>): Promise<T | null> {
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

async function collectViaLLM<T>(
  args: CollectArgs<T> & { provider: LLMProvider },
): Promise<T | null> {
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const spinner = log
      .spinner(`询问 ${args.provider.name}/${args.provider.model}（第 ${attempt} 次）...`)
      .start();
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
//  JSON extraction
// =============================================================================

export function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Extract a JSON object/array from an LLM response that may contain prose / fences. */
export function extractJsonFromLLMResponse(text: string): unknown {
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

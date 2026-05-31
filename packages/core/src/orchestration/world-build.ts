/**
 * Runtime-agnostic world-build engine.
 *
 * The CLI drives the worldforge build through an inquirer loop (world-flow.ts);
 * the Web Studio drives it through HTTP endpoints. Both need the same
 * non-UI logic: build a draft prompt from the skill, ask the LLM, extract +
 * Zod-validate the `data`, and write via the canonical `writeX` helpers.
 *
 * This module is that shared core. It has NO inquirer / HTTP dependency.
 * Per steering: validation lives here (core); the Q&A/UX stays per-frontend.
 *
 * Scope: `world` stage (worldview → powers → cheat-system). blueprint /
 * character / outline engines + converging the CLI flows onto this are
 * follow-ups (see docs/design/05-web-studio.md M3).
 */
import { readNovel } from '../assets/novel.js';
import {
  buildInitialCheatSystem,
  buildInitialPowers,
  buildInitialWorldview,
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
} from '../assets/world.js';
import type { LLMProvider } from '../llm/provider.js';
import {
  CheatSystemData,
  PowersData,
  WorldviewData,
  checkCheatSystemR2,
} from '../schemas/world.js';
import { extractJsonFromLLMResponse } from '../utils/json-extract.js';
import { compileSystemPrompt } from '../skills/compiler.js';
import { loadSkill } from '../skills/loader.js';
import { formatZodError } from '../utils/zod-format.js';

export const WORLD_STEPS = ['worldview', 'powers', 'cheat-system'] as const;
export type WorldStepKey = (typeof WORLD_STEPS)[number];

const STEP_LABEL: Record<WorldStepKey, string> = {
  worldview: '世界观',
  powers: '力量体系',
  'cheat-system': '金手指',
};

const STEP_FIELDS: Record<WorldStepKey, string> = {
  worldview: 'era, year_anchor, tagline, timeline[], factions[], regions[], physical_rules[], info_boundaries',
  powers: 'system_name, genre_basis, stages[], protagonist_curve[], info_boundaries, not_applicable',
  'cheat-system':
    'name, type, definition, trigger[], cost{primary,scaling}, output_format, stages[], limits[], beats[], anti_patterns[], not_applicable',
};

// =============================================================================
//  Build state (derived from on-disk truth — no server session needed)
// =============================================================================

export interface WorldStepState {
  key: WorldStepKey;
  label: string;
  exists: boolean;
}

export interface WorldBuildState {
  steps: WorldStepState[];
  allPresent: boolean;
}

export function worldBuildState(root: string): WorldBuildState {
  const st = worldStatus(root);
  const exists: Record<WorldStepKey, boolean> = {
    worldview: st.hasWorldview,
    powers: st.hasPowers,
    'cheat-system': st.hasCheatSystem,
  };
  return {
    steps: WORLD_STEPS.map((key) => ({ key, label: STEP_LABEL[key], exists: exists[key] })),
    allPresent: st.allPresent,
  };
}

// =============================================================================
//  Draft (LLM → extract → validate). Never writes.
// =============================================================================

export interface DraftResult {
  step: WorldStepKey;
  ok: boolean;
  /** Validated `data` object when ok. */
  data?: unknown;
  /** Extraction / validation issues when !ok. */
  issues?: string[];
  /** First chars of raw LLM output, surfaced when !ok for debugging. */
  rawPreview?: string;
}

export interface DraftArgs {
  root: string;
  step: WorldStepKey;
  provider: LLMProvider;
  hint?: string;
  /** Prior draft to refine (sent back to the LLM as a starting point). */
  currentData?: unknown;
}

export async function draftWorldStep(args: DraftArgs): Promise<DraftResult> {
  const { root, step, provider, hint, currentData } = args;

  const skill = await loadSkill('novel-worldforge');
  const systemPrompt = compileSystemPrompt(skill, {
    projectRoot: root,
    extraRules: [
      `本次只产出 ${STEP_LABEL[step]}（${step}）的 JSON data 对象：不要 frontmatter、不要解释、不要代码围栏，直接输出 JSON。`,
      `字段：${STEP_FIELDS[step]}。`,
    ],
  });
  const userPrompt = await buildWorldUserPrompt(root, step, hint, currentData);

  let raw: string;
  try {
    const res = await provider.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.7, maxTokens: 4096 },
    );
    raw = res.content;
  } catch (err) {
    return { step, ok: false, issues: [`LLM 调用失败：${errMsg(err)}`] };
  }

  const parsed = extractJsonFromLLMResponse(raw);
  if (parsed === null) {
    return { step, ok: false, issues: ['LLM 响应里找不到合法 JSON'], rawPreview: raw.slice(0, 400) };
  }
  const result = validateStep(step, parsed);
  if (!result.ok) {
    return { step, ok: false, issues: result.issues, rawPreview: raw.slice(0, 400) };
  }
  return { step, ok: true, data: parsed };
}

async function buildWorldUserPrompt(
  root: string,
  step: WorldStepKey,
  hint: string | undefined,
  currentData: unknown,
): Promise<string> {
  const novel = await readNovel(root);
  const lines: string[] = [`书名：${novel.title}`, `题材：${novel.genre.join(', ')}`];

  // cheat-system must align to the powers curve.
  if (step === 'cheat-system' && powersExists(root)) {
    const pw = await readPowers(root);
    if (!pw.data.not_applicable && pw.data.protagonist_curve.length > 0) {
      lines.push('【力量体系主角境界曲线（金手指节拍需对齐）】');
      lines.push(pw.data.protagonist_curve.map((p) => `第 ${p.chapter} 章：${p.stage}`).join('；'));
    }
  }
  if (hint && hint.trim().length > 0) lines.push(`用户补充：${hint.trim()}`);
  if (currentData != null) {
    lines.push('在以下草稿基础上改进（保留合理部分，修正问题）：');
    lines.push(JSON.stringify(currentData));
  }
  lines.push(`只输出 ${step} 的 JSON data 对象。`);
  return lines.join('\n');
}

// =============================================================================
//  Accept (validate → merge into canonical doc → write, status=drafting)
// =============================================================================

export type AcceptResult = { ok: true } | { ok: false; issues: string[] };

export async function acceptWorldStep(
  root: string,
  step: WorldStepKey,
  data: unknown,
): Promise<AcceptResult> {
  if (step === 'worldview') {
    const r = WorldviewData.safeParse(data);
    if (!r.success) return { ok: false, issues: splitZod(r.error) };
    const base = worldviewExists(root) ? await readWorldview(root) : buildInitialWorldview();
    await writeWorldview(root, { ...base, data: r.data }, 'drafting');
    return { ok: true };
  }
  if (step === 'powers') {
    const r = PowersData.safeParse(data);
    if (!r.success) return { ok: false, issues: splitZod(r.error) };
    const base = powersExists(root) ? await readPowers(root) : buildInitialPowers();
    await writePowers(root, { ...base, data: r.data }, 'drafting');
    return { ok: true };
  }
  const r = CheatSystemData.safeParse(data);
  if (!r.success) return { ok: false, issues: splitZod(r.error) };
  const base = cheatSystemExists(root) ? await readCheatSystem(root) : buildInitialCheatSystem();
  await writeCheatSystem(root, { ...base, data: r.data }, 'drafting');
  return { ok: true };
}

// =============================================================================
//  Skip (write a placeholder skeleton if the asset doesn't exist yet)
// =============================================================================

export async function skipWorldStep(root: string, step: WorldStepKey): Promise<void> {
  if (step === 'worldview') {
    if (!worldviewExists(root)) await writeWorldview(root, buildInitialWorldview(), 'drafting');
    return;
  }
  if (step === 'powers') {
    if (!powersExists(root)) await writePowers(root, buildInitialPowers(), 'drafting');
    return;
  }
  if (!cheatSystemExists(root)) await writeCheatSystem(root, buildInitialCheatSystem(), 'drafting');
}

// =============================================================================
//  Approve (R2 hard gate → flip all three to approved)
// =============================================================================

export interface ApproveResult {
  ok: boolean;
  issues: string[];
}

export async function approveWorld(root: string): Promise<ApproveResult> {
  const st = worldStatus(root);
  if (!st.allPresent) {
    return { ok: false, issues: ['world 三件套未齐（需 worldview + powers + cheat-system 都存在）'] };
  }
  const cs = await readCheatSystem(root);
  const r2 = checkCheatSystemR2(cs.data);
  if (r2.length > 0) return { ok: false, issues: r2 };

  const wv = await readWorldview(root);
  const pw = await readPowers(root);
  await writeWorldview(root, wv, 'approved');
  await writePowers(root, pw, 'approved');
  await writeCheatSystem(root, cs, 'approved');
  return { ok: true, issues: [] };
}

// =============================================================================
//  Helpers
// =============================================================================

function validateStep(step: WorldStepKey, data: unknown): { ok: true } | { ok: false; issues: string[] } {
  const schema =
    step === 'worldview' ? WorldviewData : step === 'powers' ? PowersData : CheatSystemData;
  const r = schema.safeParse(data);
  return r.success ? { ok: true } : { ok: false, issues: splitZod(r.error) };
}

function splitZod(error: Parameters<typeof formatZodError>[0]): string[] {
  return formatZodError(error)
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Compile a LoadedSkill into a system prompt for the LLM.
 *
 * In v1, the SKILL.md body IS the system prompt — Anthropic Skills protocol
 * expects the runtime to inject the body verbatim. We follow the same
 * convention so behavior matches Claude Code / Cursor / Kiro / OpenClaw.
 *
 * The compiler adds a small CLI-runtime header so the LLM knows it's being
 * driven by the CLI (not a chat agent), plus optional dynamic context (such
 * as the resolved project root, current chapter, or a per-step hint for the
 * blueprint workflow).
 */
import type { LoadedSkill } from '../schemas/skill.js';

export interface CompileContext {
  /** Project root if the user is inside a project. */
  projectRoot?: string;
  /** Optional structured hint, e.g. "now executing step 4 of blueprint". */
  taskHint?: string;
  /** Optional extra rules appended to the system prompt. */
  extraRules?: string[];
}

const RUNTIME_HEADER = `# 你正在被 Novel Studio CLI 驱动

注意：
- 你的输出会被 CLI 解析（不是直接对话界面）。请严格按照 SKILL.md 的工作流给出结构化、可机器解析的回复。
- 当 CLI 询问"出 N 个候选"时，每个候选用清晰的 Markdown 列表 / 编号；不要混入闲聊。
- 当 CLI 询问"refine 某个字段"时，只返回该字段的最终建议文本，不要带前后说明。
- 不要假装去读 / 写文件——CLI 会负责所有 IO。你只输出文本。
- 永远使用中文回答（除非用户明确要求英文）。
`;

/**
 * Compile a LoadedSkill into a single system-prompt string for an LLM call.
 */
export function compileSystemPrompt(skill: LoadedSkill, ctx: CompileContext = {}): string {
  const parts: string[] = [];
  parts.push(RUNTIME_HEADER);

  if (ctx.projectRoot) {
    parts.push(`# 当前项目根目录\n${ctx.projectRoot}\n`);
  }
  if (ctx.taskHint) {
    parts.push(`# 当前任务\n${ctx.taskHint}\n`);
  }

  parts.push('# Skill 内容\n');
  parts.push(skill.body);

  if (ctx.extraRules && ctx.extraRules.length > 0) {
    parts.push('\n# 额外约束（来自 CLI 当前上下文）');
    for (const r of ctx.extraRules) parts.push(`- ${r}`);
  }

  return parts.join('\n').trim() + '\n';
}

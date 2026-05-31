/**
 * Configuration schemas (global + project).
 *
 * Resolution order (highest wins):
 *   1. Command-line flags (handled at command layer)
 *   2. Environment variables (NOVEL_PROVIDER / OPENAI_API_KEY / ANTHROPIC_API_KEY / etc.)
 *   3. Project-level per-skill override (.novel/config.json → skills.<name>)
 *   4. Project-level defaults (.novel/config.json → top-level)
 *   5. Global per-skill override (~/.novel/config.json → skills.<name>)
 *   6. Global defaults (~/.novel/config.json → top-level)
 *   7. Built-in defaults
 */
import { z } from 'zod';
import { SkillName } from '../schemas/common.js';

export const Provider = z.enum(['openai', 'anthropic', 'mock']);
export type Provider = z.infer<typeof Provider>;

const OpenAIBlock = z
  .object({
    apiKey: z.string().min(1).optional(),
    baseURL: z.string().url().optional(),
    model: z.string().min(1).optional(),
  })
  .partial();

const AnthropicBlock = z
  .object({
    apiKey: z.string().min(1).optional(),
    baseURL: z.string().url().optional(),
    model: z.string().min(1).optional(),
  })
  .partial();

/** Per-skill override of provider+model (used by v2.3 multi-model routing). */
const SkillOverride = z
  .object({
    provider: Provider.optional(),
    model: z.string().min(1).optional(),
  })
  .partial();

export const NovelConfig = z
  .object({
    schema_version: z.literal('1.0').default('1.0'),
    provider: Provider.optional(),
    openai: OpenAIBlock.default({}),
    anthropic: AnthropicBlock.default({}),
    /** Map of skill-name → override. Keys are constrained to known skills. */
    skills: z.record(SkillName, SkillOverride).default({}),
  })
  .strict();
export type NovelConfig = z.infer<typeof NovelConfig>;

/** Empty config used when no file exists yet. */
export const EMPTY_CONFIG: NovelConfig = NovelConfig.parse({});

/** Resolved config for a single skill invocation. All fields concrete. */
export interface ResolvedLLMConfig {
  provider: Provider;
  apiKey?: string;
  baseURL?: string;
  model: string;
}

/**
 * Config resolver: merge global + project + env into a `ResolvedLLMConfig`
 * for a given skill invocation.
 */
import type { SkillName } from '../schemas/common.js';
import { ConfigError } from '../utils/errors.js';
import { EMPTY_CONFIG, type NovelConfig, type Provider, type ResolvedLLMConfig } from './schema.js';
import { readGlobalConfig, readProjectConfig } from './store.js';

/** Built-in default models per provider (changeable via `novel config set`). */
const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-20250514',
  mock: 'mock-model',
};

/** Read and merge two NovelConfig objects with project taking precedence over global. */
export function mergeConfigs(global: NovelConfig, project: NovelConfig): NovelConfig {
  return {
    schema_version: '1.0',
    provider: project.provider ?? global.provider,
    openai: { ...global.openai, ...project.openai },
    anthropic: { ...global.anthropic, ...project.anthropic },
    skills: { ...global.skills, ...project.skills },
  };
}

export interface ResolveOptions {
  /** Project root (optional — `null` if not in a project). */
  root: string | null;
  /** Which skill is asking (drives per-skill override lookup). */
  skill: SkillName;
  /** Process env (defaults to process.env). */
  env?: NodeJS.ProcessEnv;
  /** Pre-loaded merged config (mostly for tests). */
  preMerged?: NovelConfig;
}

/**
 * Resolve the final LLM config for a skill invocation, applying the precedence
 * chain documented in core/config/schema.ts.
 */
export async function resolveLLMConfig(opts: ResolveOptions): Promise<ResolvedLLMConfig> {
  const env = opts.env ?? process.env;

  let merged: NovelConfig;
  if (opts.preMerged) {
    merged = opts.preMerged;
  } else {
    const global = await readGlobalConfig();
    const project = opts.root ? await readProjectConfig(opts.root) : EMPTY_CONFIG;
    merged = mergeConfigs(global, project);
  }

  // 1. Resolve provider.
  const envProvider = env.NOVEL_PROVIDER;
  const skillOverride = merged.skills[opts.skill];
  const provider = (envProvider ??
    skillOverride?.provider ??
    merged.provider ??
    'openai') as Provider;

  // 2. Resolve api key (env > config; no per-skill override for keys).
  const block = provider === 'openai' ? merged.openai : provider === 'anthropic' ? merged.anthropic : {};
  const envKey =
    provider === 'openai'
      ? env.OPENAI_API_KEY
      : provider === 'anthropic'
        ? env.ANTHROPIC_API_KEY
        : undefined;
  const apiKey = envKey ?? block.apiKey;

  // 3. Resolve baseURL (env > config).
  const envBaseURL =
    provider === 'openai'
      ? env.OPENAI_BASE_URL
      : provider === 'anthropic'
        ? env.ANTHROPIC_BASE_URL
        : undefined;
  const baseURL = envBaseURL ?? block.baseURL;

  // 4. Resolve model (env > skill > config > default).
  const envModel =
    provider === 'openai'
      ? env.OPENAI_MODEL
      : provider === 'anthropic'
        ? env.ANTHROPIC_MODEL
        : undefined;
  const model =
    envModel ?? skillOverride?.model ?? block.model ?? DEFAULT_MODELS[provider];

  // 5. Validate the result (provider must have an API key unless mock).
  if (provider !== 'mock' && !apiKey) {
    throw new ConfigError(
      `${provider} provider 缺少 API key。`,
      provider === 'openai'
        ? '设置环境变量 OPENAI_API_KEY 或运行 `novel config set openai.apiKey <key> --global`。'
        : '设置环境变量 ANTHROPIC_API_KEY 或运行 `novel config set anthropic.apiKey <key> --global`。',
    );
  }

  return {
    provider,
    ...(apiKey !== undefined ? { apiKey } : {}),
    ...(baseURL !== undefined ? { baseURL } : {}),
    model,
  };
}

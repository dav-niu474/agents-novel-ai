/**
 * LLM provider factory.
 *
 * Given a SkillName + project root, resolve the merged config and instantiate
 * the right provider. This is the only function commands should call to get
 * an LLMProvider.
 */
import type { SkillName } from '../schemas/common.js';
import { resolveLLMConfig, type ResolvedLLMConfig } from '../config/resolver.js';
import { ConfigError } from '../utils/errors.js';
import { AnthropicProvider } from './anthropic.js';
import { MockProvider } from './mock.js';
import { OpenAIProvider } from './openai.js';
import type { LLMProvider } from './provider.js';

export interface CreateProviderOptions {
  /** Project root if the caller is inside a project; otherwise `null`. */
  projectRoot: string | null;
  /** Which skill is asking. Drives per-skill model routing. */
  skill: SkillName;
  /** Force the mock provider (test mode, `--mock-llm`). */
  mock?: boolean;
}

export async function createProvider(opts: CreateProviderOptions): Promise<LLMProvider> {
  if (opts.mock) {
    return new MockProvider();
  }
  const cfg = await resolveLLMConfig({ root: opts.projectRoot, skill: opts.skill });
  return providerFromResolved(cfg);
}

/** Construct a provider directly from a resolved config (used by tests). */
export function providerFromResolved(cfg: ResolvedLLMConfig): LLMProvider {
  switch (cfg.provider) {
    case 'openai':
      if (!cfg.apiKey) throw new ConfigError('openai provider 缺少 apiKey');
      return new OpenAIProvider({
        apiKey: cfg.apiKey,
        ...(cfg.baseURL !== undefined ? { baseURL: cfg.baseURL } : {}),
        model: cfg.model,
      });
    case 'anthropic':
      if (!cfg.apiKey) throw new ConfigError('anthropic provider 缺少 apiKey');
      return new AnthropicProvider({
        apiKey: cfg.apiKey,
        ...(cfg.baseURL !== undefined ? { baseURL: cfg.baseURL } : {}),
        model: cfg.model,
      });
    case 'mock':
      return new MockProvider({ model: cfg.model });
    default: {
      const exhaustive: never = cfg.provider;
      throw new ConfigError(`unknown provider: ${String(exhaustive)}`);
    }
  }
}

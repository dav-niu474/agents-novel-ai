import { describe, expect, it } from 'vitest';
import {
  EMPTY_CONFIG,
  mergeConfigs,
  type NovelConfig,
  resolveLLMConfig,
} from '@novel/core/config/index.js';

const baseEnv: NodeJS.ProcessEnv = {};

describe('config resolver', () => {
  it('falls back to built-in defaults when nothing set', async () => {
    await expect(
      resolveLLMConfig({ root: null, skill: 'novel-blueprint', env: baseEnv, preMerged: EMPTY_CONFIG }),
    ).rejects.toThrow(/缺少 API key/);
  });

  it('uses env var for API key', async () => {
    const cfg = await resolveLLMConfig({
      root: null,
      skill: 'novel-blueprint',
      env: { OPENAI_API_KEY: 'sk-test' },
      preMerged: EMPTY_CONFIG,
    });
    expect(cfg.provider).toBe('openai');
    expect(cfg.apiKey).toBe('sk-test');
    expect(cfg.model).toBe('gpt-4o-mini');
  });

  it('NOVEL_PROVIDER overrides default provider', async () => {
    const cfg = await resolveLLMConfig({
      root: null,
      skill: 'novel-blueprint',
      env: { NOVEL_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant' },
      preMerged: EMPTY_CONFIG,
    });
    expect(cfg.provider).toBe('anthropic');
    expect(cfg.apiKey).toBe('sk-ant');
  });

  it('per-skill model override beats global', async () => {
    const merged: NovelConfig = {
      schema_version: '1.0',
      provider: 'openai',
      openai: { apiKey: 'sk-x', model: 'gpt-4o-mini' },
      anthropic: {},
      skills: { 'novel-blueprint': { model: 'gpt-4o' } },
    };
    const cfg = await resolveLLMConfig({
      root: null,
      skill: 'novel-blueprint',
      env: baseEnv,
      preMerged: merged,
    });
    expect(cfg.model).toBe('gpt-4o');
  });

  it('per-skill provider override re-routes', async () => {
    const merged: NovelConfig = {
      schema_version: '1.0',
      provider: 'openai',
      openai: { apiKey: 'sk-x' },
      anthropic: { apiKey: 'sk-y', model: 'claude-test' },
      skills: { 'novel-blueprint': { provider: 'anthropic' } },
    };
    const cfg = await resolveLLMConfig({
      root: null,
      skill: 'novel-blueprint',
      env: baseEnv,
      preMerged: merged,
    });
    expect(cfg.provider).toBe('anthropic');
    expect(cfg.model).toBe('claude-test');
  });

  it('mergeConfigs gives project priority over global', () => {
    const global: NovelConfig = {
      schema_version: '1.0',
      provider: 'openai',
      openai: { apiKey: 'sk-global', model: 'gpt-4o-mini' },
      anthropic: {},
      skills: {},
    };
    const project: NovelConfig = {
      schema_version: '1.0',
      provider: 'anthropic',
      openai: {},
      anthropic: { apiKey: 'sk-project' },
      skills: {},
    };
    const merged = mergeConfigs(global, project);
    expect(merged.provider).toBe('anthropic');
    // Global model survives because project didn't override.
    expect(merged.openai.model).toBe('gpt-4o-mini');
    expect(merged.anthropic.apiKey).toBe('sk-project');
  });
});

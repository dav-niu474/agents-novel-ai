/**
 * `novel config get|set|unset|list` — global / project config CRUD.
 *
 * Key paths use dot notation: `provider`, `openai.apiKey`, `anthropic.model`,
 * `skills.novel-blueprint.provider`, etc.
 */
import { findProjectRoot } from '@novel/core/assets/paths.js';
import {
  NovelConfig,
  globalConfigPath,
  projectConfigPath,
  readGlobalConfig,
  readProjectConfig,
  writeGlobalConfig,
  writeProjectConfig,
} from '@novel/core/config/index.js';
import { ConfigError, NotInProjectError, NovelError } from '@novel/core/utils/errors.js';
import { formatZodError } from '@novel/core/utils/zod-format.js';
import { log } from '@novel/core/utils/logger.js';

export interface ConfigOptions {
  /** --global writes to ~/.novel/config.json. Defaults to project. */
  global?: boolean;
}

function splitKey(key: string): string[] {
  // skills.novel-blueprint.provider must split into 3 parts (the skill name has a hyphen
  // but we don't split on hyphens), so split on dots only.
  return key.split('.');
}

function getDeep(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function setDeep(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]!;
    const next = cur[seg];
    if (next === undefined || next === null || typeof next !== 'object') {
      cur[seg] = {};
    }
    cur = cur[seg] as Record<string, unknown>;
  }
  const lastSeg = path[path.length - 1];
  if (lastSeg === undefined) throw new NovelError('config 键不能为空');
  cur[lastSeg] = value;
}

function unsetDeep(obj: Record<string, unknown>, path: string[]): boolean {
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]!;
    const next = cur[seg];
    if (next === undefined || next === null || typeof next !== 'object') return false;
    cur = next as Record<string, unknown>;
  }
  const lastSeg = path[path.length - 1];
  if (lastSeg === undefined) return false;
  if (lastSeg in cur) {
    delete cur[lastSeg];
    return true;
  }
  return false;
}

type LoadedConfig = { cfg: NovelConfig; path: string; root?: string };

async function loadScopedConfig(scope: 'global' | 'project'): Promise<LoadedConfig> {
  if (scope === 'global') {
    return { cfg: await readGlobalConfig(), path: globalConfigPath() };
  }
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());
  return { cfg: await readProjectConfig(root), path: projectConfigPath(root), root };
}

async function saveScopedConfig(
  scope: 'global' | 'project',
  cfg: NovelConfig,
  root: string | undefined,
): Promise<void> {
  if (scope === 'global') {
    await writeGlobalConfig(cfg);
  } else {
    if (!root) throw new ConfigError('内部错误：project scope 缺少 root');
    await writeProjectConfig(root, cfg);
  }
}

function validateAndCoerce(cfg: Record<string, unknown>): NovelConfig {
  const result = NovelConfig.safeParse(cfg);
  if (!result.success) {
    throw new ConfigError(`config 校验失败：\n${formatZodError(result.error)}`);
  }
  return result.data;
}

// ---------- subcommands ----------

export async function configGet(key: string, opts: ConfigOptions = {}): Promise<void> {
  const scope: 'global' | 'project' = opts.global ? 'global' : 'project';
  const { cfg, path } = await loadScopedConfig(scope);
  const value = getDeep(cfg, splitKey(key));
  if (value === undefined) {
    log.warn(`键 "${key}" 在 ${path} 中未设置`);
    process.exitCode = 1;
    return;
  }
  if (typeof value === 'string') log.plain(value);
  else log.plain(JSON.stringify(value, null, 2));
}

export async function configSet(key: string, value: string, opts: ConfigOptions = {}): Promise<void> {
  const scope: 'global' | 'project' = opts.global ? 'global' : 'project';
  const { cfg, path, root } = await loadScopedConfig(scope);

  // Coerce value:
  //   - "true"/"false" → boolean
  //   - numeric strings → number (only if key explicitly numeric — for now keep string)
  //   - JSON-like values starting with `{` or `[` → parsed
  let coerced: unknown = value;
  const trimmed = value.trim();
  if (trimmed === 'true') coerced = true;
  else if (trimmed === 'false') coerced = false;
  else if (trimmed === 'null') coerced = null;
  else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      coerced = JSON.parse(trimmed);
    } catch {
      coerced = value;
    }
  }

  const draft = JSON.parse(JSON.stringify(cfg)) as Record<string, unknown>;
  setDeep(draft, splitKey(key), coerced);

  const validated = validateAndCoerce(draft);
  await saveScopedConfig(scope, validated, root);

  log.success(`已设置 ${key} → ${path}`);
}

export async function configUnset(key: string, opts: ConfigOptions = {}): Promise<void> {
  const scope: 'global' | 'project' = opts.global ? 'global' : 'project';
  const { cfg, path, root } = await loadScopedConfig(scope);
  const draft = JSON.parse(JSON.stringify(cfg)) as Record<string, unknown>;
  const removed = unsetDeep(draft, splitKey(key));
  if (!removed) {
    log.warn(`键 "${key}" 在 ${path} 中未设置`);
    return;
  }
  const validated = validateAndCoerce(draft);
  await saveScopedConfig(scope, validated, root);
  log.success(`已删除 ${key} ← ${path}`);
}

export async function configList(opts: ConfigOptions = {}): Promise<void> {
  if (opts.global) {
    const cfg = await readGlobalConfig();
    log.heading(`全局配置 ${globalConfigPath()}`);
    log.plain(JSON.stringify(cfg, null, 2));
    return;
  }
  const root = findProjectRoot(process.cwd());
  log.heading(`全局配置 ${globalConfigPath()}`);
  const global = await readGlobalConfig();
  log.plain(JSON.stringify(global, null, 2));

  if (root) {
    log.heading(`项目配置 ${projectConfigPath(root)}`);
    log.plain(JSON.stringify(await readProjectConfig(root), null, 2));
  } else {
    log.heading('项目配置');
    log.plain('  (当前目录不是 Novel Studio 项目，跳过)');
  }
}



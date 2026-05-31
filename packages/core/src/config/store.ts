/**
 * Global + project config file IO.
 *
 * Global: `~/.novel/config.json` (cross-project defaults).
 * Project: `<root>/.novel/config.json` (per-project overrides).
 *
 * Both files are optional; missing → EMPTY_CONFIG.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ConfigError } from '../utils/errors.js';
import { writeFileAtomic } from '../utils/fs.js';
import { formatZodError } from '../utils/zod-format.js';
import { EMPTY_CONFIG, NovelConfig } from './schema.js';

export type ConfigScope = 'global' | 'project';

export function globalConfigPath(): string {
  return join(homedir(), '.novel', 'config.json');
}

export function projectConfigPath(root: string): string {
  return join(root, '.novel', 'config.json');
}

async function readConfig(path: string): Promise<NovelConfig> {
  if (!existsSync(path)) return EMPTY_CONFIG;
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(`配置文件 JSON 解析失败 (${path})：${(err as Error).message}`);
  }
  const result = NovelConfig.safeParse(parsed);
  if (!result.success) {
    throw new ConfigError(
      `配置文件 schema 校验失败 (${path}):\n${formatZodError(result.error)}`,
      '直接编辑文件修复，或运行 `novel config set ...` 重新写入合法值。',
    );
  }
  return result.data;
}

export async function readGlobalConfig(): Promise<NovelConfig> {
  return readConfig(globalConfigPath());
}

export async function readProjectConfig(root: string): Promise<NovelConfig> {
  return readConfig(projectConfigPath(root));
}

async function writeConfig(path: string, cfg: NovelConfig): Promise<void> {
  const result = NovelConfig.safeParse(cfg);
  if (!result.success) {
    throw new ConfigError(`config 校验失败：\n${formatZodError(result.error)}`);
  }
  await writeFileAtomic(path, JSON.stringify(result.data, null, 2) + '\n');
}

export async function writeGlobalConfig(cfg: NovelConfig): Promise<void> {
  await writeConfig(globalConfigPath(), cfg);
}

export async function writeProjectConfig(root: string, cfg: NovelConfig): Promise<void> {
  await writeConfig(projectConfigPath(root), cfg);
}

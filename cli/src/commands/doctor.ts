/**
 * `novel doctor` — diagnose environment, configuration, and skills resolution.
 *
 * Goal: when something doesn't work, the user runs `novel doctor` and gets a
 * clear list of green ✓ / yellow ⚠ / red ✗ checks with remediation hints.
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { findProjectRoot } from '../core/assets/paths.js';
import { mergeConfigs, readGlobalConfig, readProjectConfig } from '../core/config/index.js';
import { resolveSkillsDir, loadAllSkills } from '../core/skills/loader.js';
import { chalk, log } from '../core/utils/logger.js';

type CheckStatus = 'ok' | 'warn' | 'fail';

interface Check {
  label: string;
  status: CheckStatus;
  detail?: string;
  hint?: string;
}

function symbol(s: CheckStatus): string {
  return s === 'ok' ? chalk.green('✓') : s === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
}

async function checkNode(): Promise<Check> {
  const v = process.versions.node;
  const major = Number.parseInt(v.split('.')[0] ?? '0', 10);
  if (major >= 20) {
    return { label: `Node.js ${v}`, status: 'ok' };
  }
  return {
    label: `Node.js ${v}`,
    status: 'fail',
    detail: '需要 Node 20+',
    hint: '使用 nvm/fnm 切换到 Node 20 或更高版本。',
  };
}

async function checkSkills(): Promise<Check> {
  try {
    const dir = resolveSkillsDir();
    const skills = await loadAllSkills();
    if (skills.length === 0) {
      return {
        label: 'skills/ 目录',
        status: 'warn',
        detail: dir,
        hint: '目录存在但没有任何 SKILL.md 通过 schema 校验。',
      };
    }
    return {
      label: `skills/ 目录（${skills.length} 个 skill）`,
      status: 'ok',
      detail: dir,
    };
  } catch (err) {
    return {
      label: 'skills/ 目录',
      status: 'fail',
      detail: (err as Error).message,
      hint: '设置 NOVEL_SKILLS_DIR 指向 agents-novel-ai/skills/。',
    };
  }
}

async function checkGlobalConfig(): Promise<Check> {
  const path = join(homedir(), '.novel', 'config.json');
  if (!existsSync(path)) {
    return {
      label: '全局配置 ~/.novel/config.json',
      status: 'warn',
      detail: '不存在（可选；用环境变量也行）',
      hint: '运行 `novel config set provider openai --global` 来生成。',
    };
  }
  try {
    await readGlobalConfig();
    return { label: '全局配置 ~/.novel/config.json', status: 'ok', detail: path };
  } catch (err) {
    return {
      label: '全局配置 ~/.novel/config.json',
      status: 'fail',
      detail: (err as Error).message,
    };
  }
}

async function checkProjectConfig(root: string | null): Promise<Check> {
  if (!root) {
    return {
      label: '项目配置 .novel/config.json',
      status: 'warn',
      detail: '当前目录不是项目，跳过',
    };
  }
  const path = join(root, '.novel', 'config.json');
  if (!existsSync(path)) {
    return {
      label: '项目配置 .novel/config.json',
      status: 'ok',
      detail: '不存在（用全局即可）',
    };
  }
  try {
    await readProjectConfig(root);
    return { label: '项目配置 .novel/config.json', status: 'ok', detail: path };
  } catch (err) {
    return {
      label: '项目配置 .novel/config.json',
      status: 'fail',
      detail: (err as Error).message,
    };
  }
}

async function checkLLM(root: string | null): Promise<Check> {
  try {
    const global = await readGlobalConfig();
    const project = root ? await readProjectConfig(root) : global;
    const merged = mergeConfigs(global, project);
    const env = process.env;
    const provider =
      env.NOVEL_PROVIDER ?? merged.provider ?? 'openai';
    const apiKey =
      provider === 'openai'
        ? (env.OPENAI_API_KEY ?? merged.openai.apiKey)
        : provider === 'anthropic'
          ? (env.ANTHROPIC_API_KEY ?? merged.anthropic.apiKey)
          : 'not-required';
    if (!apiKey) {
      return {
        label: `LLM provider = ${provider}`,
        status: 'warn',
        detail: 'API key 未配置（开离线命令仍可用）',
        hint:
          provider === 'openai'
            ? '设置 OPENAI_API_KEY 或 `novel config set openai.apiKey <key> --global`'
            : '设置 ANTHROPIC_API_KEY 或 `novel config set anthropic.apiKey <key> --global`',
      };
    }
    return { label: `LLM provider = ${provider}`, status: 'ok', detail: 'API key 已配置' };
  } catch (err) {
    return {
      label: 'LLM provider',
      status: 'fail',
      detail: (err as Error).message,
    };
  }
}

export async function runDoctor(): Promise<void> {
  const root = findProjectRoot(process.cwd());

  log.heading('Novel Studio 环境诊断');

  const checks: Check[] = [
    await checkNode(),
    await checkSkills(),
    await checkGlobalConfig(),
    await checkProjectConfig(root),
    await checkLLM(root),
  ];

  for (const c of checks) {
    const detail = c.detail ? chalk.dim(`  (${c.detail})`) : '';
    log.plain(`  ${symbol(c.status)} ${c.label}${detail}`);
    if (c.hint) log.plain(`    ${chalk.dim('↪ ' + c.hint)}`);
  }

  const failed = checks.filter((c) => c.status === 'fail').length;
  const warned = checks.filter((c) => c.status === 'warn').length;
  log.plain('');
  if (failed > 0) {
    log.plain(chalk.red(`✗ ${failed} 项失败`) + (warned > 0 ? chalk.yellow(`，${warned} 项警告`) : ''));
    process.exitCode = 1;
  } else if (warned > 0) {
    log.plain(chalk.yellow(`⚠ ${warned} 项警告（功能可用，但可能影响体验）`));
  } else {
    log.plain(chalk.green('✓ 全部检查通过'));
  }
}

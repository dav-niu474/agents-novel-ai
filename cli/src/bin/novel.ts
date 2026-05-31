#!/usr/bin/env node
/**
 * CLI entrypoint. Wires Commander → command modules.
 *
 * Top-level layout:
 *   novel init [name]       commands/init.ts
 *   novel status            commands/status.ts
 *   novel doctor            commands/doctor.ts
 *   novel config <op> ...   commands/config.ts
 *   novel blueprint <op>    commands/blueprint.ts
 *   novel world <op>        commands/world.ts
 *   novel character <op>    commands/character.ts
 *   novel outline <op>      commands/outline.ts
 *
 * Errors:
 *   - NovelError → friendly chalk-red message + optional hint, exit code 1+
 *   - other → full stack trace
 */
import { Command } from 'commander';
import {
  blueprintApprove,
  blueprintEdit,
  blueprintShow,
  blueprintStart,
} from '../commands/blueprint.js';
import {
  characterAdd,
  characterApprove,
  characterBuild,
  characterList,
  characterShow,
} from '../commands/character.js';
import {
  configGet,
  configList,
  configSet,
  configUnset,
} from '../commands/config.js';
import { runDoctor } from '../commands/doctor.js';
import { runInit } from '../commands/init.js';
import {
  outlineApprove,
  outlineBuild,
  outlineList,
  outlineShow,
} from '../commands/outline.js';
import { runStatus } from '../commands/status.js';
import {
  worldApprove,
  worldBuild,
  worldList,
  worldShow,
} from '../commands/world.js';
import { NovelError } from '../core/utils/errors.js';
import type { CharacterRole } from '../core/schemas/character.js';
import { chalk, log } from '../core/utils/logger.js';

// -------------------------------------------------------------------------
// CLI version — keep in sync with package.json. Hardcoded to avoid runtime
// JSON import quirks under NodeNext + ESM.
// -------------------------------------------------------------------------
const CLI_VERSION = '0.2.0-alpha.3';

/** Validate a `character add [role]` argument into a CharacterRole. */
function parseRoleArg(role: string): CharacterRole {
  const allowed = ['protagonist', 'antagonist', 'supporting', 'minor'] as const;
  if ((allowed as readonly string[]).includes(role)) {
    return role as CharacterRole;
  }
  throw new NovelError(`非法的 role：${role}（允许 ${allowed.join(' / ')}）`);
}

// -------------------------------------------------------------------------
// Build the program
// -------------------------------------------------------------------------

function buildProgram(): Command {
  const program = new Command();

  program
    .name('novel')
    .description('Novel Studio CLI — AI 全流程网文写作工作室（v2 alpha-2b + 2c）')
    .version(CLI_VERSION, '-v, --version')
    .option('-q, --quiet', '抑制非关键输出')
    .option('--debug', '打开 debug 日志');

  program.hook('preAction', (thisCmd) => {
    const opts = thisCmd.optsWithGlobals() as { quiet?: boolean; debug?: boolean };
    log.configure({
      ...(opts.quiet !== undefined ? { quiet: opts.quiet } : {}),
      ...(opts.debug !== undefined ? { debug: opts.debug } : {}),
    });
  });

  // ---------- novel init ----------
  program
    .command('init')
    .description('初始化新项目骨架（创建 novel.json + 全部子目录）')
    .argument('[name]', '书名（可省略，进入交互式询问）')
    .option('--genre <list>', '主题材，逗号分隔（如 xuanhuan,xianxia）')
    .option('--platform <list>', '目标平台，逗号分隔（如 qidian,fanqie）')
    .option('--audience <code>', '受众（male-young-adult / female-young-adult / mixed ...）')
    .option('--in <dir>', '在指定目录创建（默认 cwd）')
    .option('--force', '强制覆盖已有 novel.json（小心）')
    .option('-y, --yes', '跳过所有交互式确认（CI 模式）')
    .action(async (name: string | undefined, cmdOpts) => {
      await runInit({
        ...(name !== undefined ? { name } : {}),
        ...(cmdOpts.genre !== undefined ? { genre: cmdOpts.genre } : {}),
        ...(cmdOpts.platform !== undefined ? { platform: cmdOpts.platform } : {}),
        ...(cmdOpts.audience !== undefined ? { audience: cmdOpts.audience } : {}),
        ...(cmdOpts.in !== undefined ? { inDir: cmdOpts.in } : {}),
        ...(cmdOpts.force !== undefined ? { force: cmdOpts.force } : {}),
        ...(cmdOpts.yes !== undefined ? { yes: cmdOpts.yes } : {}),
      });
    });

  // ---------- novel status ----------
  program
    .command('status')
    .description('查看项目状态 + 推荐下一步')
    .option('--json', '机器可读 JSON 输出')
    .action(async (cmdOpts) => {
      await runStatus({
        ...(cmdOpts.json !== undefined ? { json: cmdOpts.json } : {}),
      });
    });

  // ---------- novel doctor ----------
  program
    .command('doctor')
    .description('诊断 Node / 网络 / 配置 / skills 路径')
    .action(async () => {
      await runDoctor();
    });

  // ---------- novel config ... ----------
  const config = program
    .command('config')
    .description('全局 / 项目级配置 CRUD');

  config
    .command('get <key>')
    .description('读取一个配置值（默认从项目级；--global 读全局）')
    .option('-g, --global', '从全局 ~/.novel/config.json 读')
    .action(async (key: string, cmdOpts) => {
      await configGet(key, {
        ...(cmdOpts.global !== undefined ? { global: cmdOpts.global } : {}),
      });
    });

  config
    .command('set <key> <value>')
    .description('设置一个配置值（默认写到项目级；--global 写全局）')
    .option('-g, --global', '写到全局 ~/.novel/config.json')
    .action(async (key: string, value: string, cmdOpts) => {
      await configSet(key, value, {
        ...(cmdOpts.global !== undefined ? { global: cmdOpts.global } : {}),
      });
    });

  config
    .command('unset <key>')
    .description('删除一个配置值')
    .option('-g, --global', '从全局 ~/.novel/config.json 删')
    .action(async (key: string, cmdOpts) => {
      await configUnset(key, {
        ...(cmdOpts.global !== undefined ? { global: cmdOpts.global } : {}),
      });
    });

  config
    .command('list')
    .description('打印全部配置（global + project）')
    .option('-g, --global', '只打印全局')
    .action(async (cmdOpts) => {
      await configList({
        ...(cmdOpts.global !== undefined ? { global: cmdOpts.global } : {}),
      });
    });

  // ---------- novel blueprint ... ----------
  const bp = program
    .command('blueprint')
    .description('开书蓝图 CRUD + 10 步定盘交互');

  bp.command('show')
    .description('打印当前 blueprint.md 内容（带版本与 status）')
    .action(async () => {
      await blueprintShow();
    });

  bp.command('edit')
    .description('用 $EDITOR 打开 blueprint.md 直接编辑')
    .action(async () => {
      await blueprintEdit();
    });

  bp.command('start')
    .description('启动 10 步交互式定盘工作流（含 LLM 出候选）')
    .option('--resume', '只填还缺的必填字段（断点续传）')
    .option('--hint <text>', '初始脑洞 / 想法（会被注入到 LLM prompt）')
    .option('--no-llm', '完全不调用 LLM，纯手工填')
    .option('--mock-llm', '使用 mock provider（离线测试用）')
    .action(async (cmdOpts) => {
      await blueprintStart({
        ...(cmdOpts.resume !== undefined ? { resume: cmdOpts.resume } : {}),
        ...(cmdOpts.hint !== undefined ? { hint: cmdOpts.hint } : {}),
        ...(cmdOpts.llm === false ? { noLLM: true } : {}),
        ...(cmdOpts.mockLlm !== undefined ? { mockLLM: cmdOpts.mockLlm } : {}),
      });
    });

  bp.command('approve')
    .description('把 blueprint.md status 标为 approved + 同步 novel.json')
    .action(async () => {
      await blueprintApprove();
    });

  // ---------- novel world ... ----------
  const world = program
    .command('world')
    .description('世界三件套 CRUD + 交互式 build 工作流（worldview / powers / cheat-system）');

  world
    .command('show [asset]')
    .description('打印 world 资产内容；asset 可选 worldview / powers / cheat-system / all（默认 all）')
    .action(async (asset: string | undefined) => {
      await worldShow(asset ?? 'all');
    });

  world
    .command('list')
    .description('紧凑表格显示三件套存在性 + status + version')
    .action(async () => {
      await worldList();
    });

  world
    .command('build')
    .description('启动 3 步建世界工作流（worldview → powers → cheat-system，每步可选 LLM 起草 / 编辑器 / 跳过）')
    .option('--resume', '只填还缺或仍是占位的资产')
    .option('--hint <text>', '初始想法 / 偏好（会注入到每步的 LLM prompt）')
    .option('--no-llm', '完全不调用 LLM，编辑器模式手填')
    .option('--mock-llm', '使用 mock provider（离线测试用）')
    .action(async (cmdOpts) => {
      await worldBuild({
        ...(cmdOpts.resume !== undefined ? { resume: cmdOpts.resume } : {}),
        ...(cmdOpts.hint !== undefined ? { hint: cmdOpts.hint } : {}),
        ...(cmdOpts.llm === false ? { noLLM: true } : {}),
        ...(cmdOpts.mockLlm !== undefined ? { mockLLM: cmdOpts.mockLlm } : {}),
      });
    });

  world
    .command('approve')
    .description('校验三件套（含 R2 强约束）+ 把三个 .md 的 status 翻成 approved')
    .action(async () => {
      await worldApprove();
    });

  // ---------- novel character ... ----------
  const character = program
    .command('character')
    .description('角色 CRUD + 交互式 build 工作流（主角 / 反派 / 配角 + 关系网）');

  character
    .command('list')
    .description('表格显示所有角色（按主角 / 反派 / 配角分组）+ 关系网状态')
    .action(async () => {
      await characterList();
    });

  character
    .command('show [target]')
    .description('打印角色卡；target 可选 <角色ID> / relationships / all（默认 all）')
    .action(async (target: string | undefined) => {
      await characterShow(target ?? 'all');
    });

  character
    .command('build')
    .description('启动捏角色工作流（主角 → 反派 → 配角 → 关系网，每步可选 LLM 起草 / 编辑器手填）')
    .option('--resume', '只补还缺的（跳过已建主角 / 已有关系网）')
    .option('--hint <text>', '初始想法 / 偏好（注入到每步 LLM prompt）')
    .option('--no-llm', '完全不调用 LLM，编辑器模式手填')
    .option('--mock-llm', '使用 mock provider（离线测试用）')
    .action(async (cmdOpts) => {
      await characterBuild({
        ...(cmdOpts.resume !== undefined ? { resume: cmdOpts.resume } : {}),
        ...(cmdOpts.hint !== undefined ? { hint: cmdOpts.hint } : {}),
        ...(cmdOpts.llm === false ? { noLLM: true } : {}),
        ...(cmdOpts.mockLlm !== undefined ? { mockLLM: cmdOpts.mockLlm } : {}),
      });
    });

  character
    .command('add [role]')
    .description('增量添加单个角色；role 可选 protagonist / antagonist / supporting / minor')
    .option('--hint <text>', '初始想法（注入到 LLM prompt）')
    .option('--no-llm', '完全不调用 LLM，编辑器模式手填')
    .option('--mock-llm', '使用 mock provider（离线测试用）')
    .action(async (role: string | undefined, cmdOpts) => {
      await characterAdd({
        ...(role !== undefined ? { role: parseRoleArg(role) } : {}),
        ...(cmdOpts.hint !== undefined ? { hint: cmdOpts.hint } : {}),
        ...(cmdOpts.llm === false ? { noLLM: true } : {}),
        ...(cmdOpts.mockLlm !== undefined ? { mockLLM: cmdOpts.mockLlm } : {}),
      });
    });

  character
    .command('approve')
    .description('校验所有角色卡（R1/R3 强约束 + R2 软警告）+ 把卡片 status 翻成 approved')
    .action(async () => {
      await characterApprove();
    });

  // ---------- novel outline ... ----------
  const outline = program
    .command('outline')
    .description('三级大纲 CRUD + 交互式 build 工作流（总纲 / 卷纲 / 章纲）');

  outline
    .command('show [target] [n]')
    .description('打印大纲：target 可选 master / volume <n> / chapter <n> / all（默认 all）')
    .action(async (target: string | undefined, n: string | undefined) => {
      await outlineShow(target ?? 'all', n);
    });

  outline
    .command('list')
    .description('紧凑表格显示总纲 / 卷纲 / 章纲的存在性 + status + version + 完整度')
    .action(async () => {
      await outlineList();
    });

  outline
    .command('build')
    .description('启动三级大纲工作流（总纲 → 卷纲 → 前 N 章章纲，每步可选 LLM 起草 / 编辑器 / 跳过）')
    .option('--resume', '只填还缺或仍不完整的大纲资产')
    .option('--volume <n>', '为第 n 卷写卷纲 + 章纲（默认 1）', (v) => Number.parseInt(v, 10))
    .option('--chapters <count>', '本次产出多少章章纲（默认 5）', (v) => Number.parseInt(v, 10))
    .option('--range <a-b>', '本卷章节范围（如 1-50），跳过交互询问')
    .option('--hint <text>', '初始想法 / 偏好（注入到每步的 LLM prompt）')
    .option('--no-llm', '完全不调用 LLM，编辑器模式手写')
    .option('--mock-llm', '使用 mock provider（离线测试用）')
    .action(async (cmdOpts) => {
      await outlineBuild({
        ...(cmdOpts.resume !== undefined ? { resume: cmdOpts.resume } : {}),
        ...(cmdOpts.volume !== undefined && !Number.isNaN(cmdOpts.volume) ? { volume: cmdOpts.volume } : {}),
        ...(cmdOpts.chapters !== undefined && !Number.isNaN(cmdOpts.chapters) ? { chapters: cmdOpts.chapters } : {}),
        ...(cmdOpts.range !== undefined ? { range: cmdOpts.range } : {}),
        ...(cmdOpts.hint !== undefined ? { hint: cmdOpts.hint } : {}),
        ...(cmdOpts.llm === false ? { noLLM: true } : {}),
        ...(cmdOpts.mockLlm !== undefined ? { mockLLM: cmdOpts.mockLlm } : {}),
      });
    });

  outline
    .command('approve [target] [n]')
    .description('校验完整度后把大纲 status 翻成 approved（章纲强制 R1 九字段）；不带 target 则批量 approve 所有完整资产')
    .action(async (target: string | undefined, n: string | undefined) => {
      await outlineApprove(target ?? 'all', n);
    });

  return program;
}

// -------------------------------------------------------------------------
// Run
// -------------------------------------------------------------------------

async function main(): Promise<void> {
  const program = buildProgram();
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof NovelError) {
      log.error(err.message);
      if (err.hint) log.hint(err.hint);
      process.exit(err.exitCode);
    }
    // Inquirer raises this when the user hits ^C in a prompt; treat as graceful exit.
    if (err instanceof Error && err.name === 'ExitPromptError') {
      log.warn('已中断。');
      process.exit(130);
    }
    log.error('未知错误：');
    if (err instanceof Error) {
      log.plain(chalk.red(err.stack ?? err.message));
    } else {
      log.plain(String(err));
    }
    process.exit(1);
  }
}

void main();

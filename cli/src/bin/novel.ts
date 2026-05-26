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
  characterList,
  characterShow,
  parseRole,
  parseTier,
} from '../commands/character.js';
import {
  configGet,
  configList,
  configSet,
  configUnset,
} from '../commands/config.js';
import { runDoctor } from '../commands/doctor.js';
import { runInit } from '../commands/init.js';
import { runStatus } from '../commands/status.js';
import {
  worldApprove,
  worldBuild,
  worldList,
  worldShow,
} from '../commands/world.js';
import { NovelError } from '../core/utils/errors.js';
import { chalk, log } from '../core/utils/logger.js';

// -------------------------------------------------------------------------
// CLI version — keep in sync with package.json. Hardcoded to avoid runtime
// JSON import quirks under NodeNext + ESM.
// -------------------------------------------------------------------------
const CLI_VERSION = '0.2.0-alpha.3';

// -------------------------------------------------------------------------
// Build the program
// -------------------------------------------------------------------------

function buildProgram(): Command {
  const program = new Command();

  program
    .name('novel')
    .description('Novel Studio CLI — AI 全流程网文写作工作室（v2 alpha-2b）')
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
    .description('角色 / 人设 CRUD + 交互式 add 工作流（protagonist / antagonist / supporting / minor）');

  character
    .command('list')
    .description('紧凑表格显示全部角色（按 role 分组 + tier + 首登场章节）')
    .action(async () => {
      await characterList();
    });

  character
    .command('show <id-or-name>')
    .description('打印某个角色的整张卡（id 形如 protagonist-lin-jin，或角色名子串）')
    .action(async (idOrName: string) => {
      await characterShow(idOrName);
    });

  character
    .command('add')
    .description('交互式捏一个角色（pick role + tier → LLM 起草 8 字段 → 写卡 + 更新索引）')
    .option('--role <role>', '角色定位（protagonist / antagonist / supporting / minor）')
    .option('--tier <tier>', '角色 tier（antagonist: early/mid/late/meta；supporting: core/important/minor）')
    .option('--name <name>', '角色名（可中文）')
    .option('--first-chapter <n>', '首次登场章节号', (v) => Number.parseInt(v, 10))
    .option('--hint <text>', '初始想法 / 偏好（注入到 LLM prompt）')
    .option('--no-llm', '完全不调用 LLM，编辑器模式手填')
    .option('--mock-llm', '使用 mock provider（离线测试用）')
    .option('--force', '强制覆盖已存在的同 id 角色卡')
    .action(async (cmdOpts) => {
      const role = parseRole(cmdOpts.role);
      const tier = parseTier(role, cmdOpts.tier);
      await characterAdd({
        ...(role !== undefined ? { role } : {}),
        ...(tier !== undefined ? { tier } : {}),
        ...(cmdOpts.name !== undefined ? { name: cmdOpts.name } : {}),
        ...(cmdOpts.firstChapter !== undefined && !Number.isNaN(cmdOpts.firstChapter)
          ? { firstAppearChapter: cmdOpts.firstChapter }
          : {}),
        ...(cmdOpts.hint !== undefined ? { hint: cmdOpts.hint } : {}),
        ...(cmdOpts.llm === false ? { noLLM: true } : {}),
        ...(cmdOpts.mockLlm !== undefined ? { mockLLM: cmdOpts.mockLlm } : {}),
        ...(cmdOpts.force !== undefined ? { force: cmdOpts.force } : {}),
      });
    });

  character
    .command('approve [id]')
    .description('把角色卡 status 翻成 approved（性格内核锁定）；不带 id 时 approve 所有 drafting 卡')
    .action(async (id: string | undefined) => {
      await characterApprove({
        ...(id !== undefined ? { id } : {}),
      });
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

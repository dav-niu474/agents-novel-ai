/**
 * Character-atelier 交互式 add 工作流。
 *
 * Pinned to skills/novel-character-atelier/SKILL.md §3 (3 层结构) / §4 (4 个 sub-workflow).
 *
 * 核心流程：
 *   1. Pre-flight：blueprint approved + world 三件套齐全
 *   2. 选 role + tier（CLI 已传则跳过）
 *   3. 用户给 name + first_appear_chapter
 *   4. 检查重名 / 已有同 id（提供 overwrite / refine 选项）
 *   5. 选填写模式：llm-draft / editor / skip
 *   6. LLM 接收 blueprint + world + 现有角色索引作为上下文，输出 CharacterData JSON
 *   7. 用户审稿（accept / refine / cancel）
 *   8. 写 .md 卡 + 更新 _index.json + （可选）追加 relationships.md
 */
import { confirm, editor, input, select } from '@inquirer/prompts';
import type { ZodType } from 'zod';
import { readBlueprint } from '../core/assets/blueprint.js';
import {
  buildInitialCharacterIndex,
  characterCardExists,
  characterFilePath,
  characterIndexExists,
  characterSlug,
  readCharacterCard,
  readCharacterIndex,
  upsertIndexEntry,
  writeCharacter,
  writeCharacterIndex,
} from '../core/assets/character.js';
import { readNovel } from '../core/assets/novel.js';
import { findProjectRoot } from '../core/assets/paths.js';
import {
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  readWorldview,
  worldviewExists,
} from '../core/assets/world.js';
import { createProvider } from '../core/llm/factory.js';
import type { LLMProvider } from '../core/llm/provider.js';
import type { Blueprint } from '../core/schemas/blueprint.js';
import {
  CharacterData,
  checkCharacterPowersAlignment,
  checkRoleTierConsistency,
  type CharacterRole,
  type CharacterTier,
} from '../core/schemas/character.js';
import type { Novel } from '../core/schemas/novel.js';
import { compileSystemPrompt } from '../core/skills/compiler.js';
import { loadSkill } from '../core/skills/loader.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { chalk, log } from '../core/utils/logger.js';
import { formatZodError } from '../core/utils/zod-format.js';

// =============================================================================
//  Public entry
// =============================================================================

export interface CharacterAddOptions {
  role?: CharacterRole;
  tier?: CharacterTier;
  /** Display name (Chinese OK). If omitted, prompt interactively. */
  name?: string;
  /** First appearance chapter. If omitted, prompt interactively. */
  firstAppearChapter?: number;
  mockLLM?: boolean;
  noLLM?: boolean;
  /** Initial brain dump fed into LLM prompt. */
  hint?: string;
  /** Force overwrite if a card with the same id exists. */
  force?: boolean;
}

export async function runCharacterAdd(opts: CharacterAddOptions = {}): Promise<void> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  // ---------- Pre-flight ----------
  const novel = await readNovel(root);
  let blueprint: Blueprint;
  try {
    blueprint = await readBlueprint(root);
  } catch {
    throw new NovelError('blueprint.md 还未创建', {
      hint: '先跑 `novel blueprint start` 完成 10 步定盘。',
    });
  }
  if (blueprint.frontmatter.status !== 'approved') {
    const goAhead = await confirm({
      message: 'blueprint 还不是 approved。角色会基于未定稿的蓝图生成，可能需要返工。继续？',
      default: false,
    });
    if (!goAhead) {
      log.hint('运行 `novel blueprint approve` 先定稿。');
      return;
    }
  }
  // World 三件套（可选——supporting/minor 不强依赖，protagonist/antagonist 强依赖）
  const hasWorld = worldviewExists(root) && powersExists(root) && cheatSystemExists(root);
  if (!hasWorld) {
    const goAhead = await confirm({
      message: 'world 三件套尚未齐全。捏角色（特别是主角 / 反派）会缺乏境界曲线参考。继续？',
      default: false,
    });
    if (!goAhead) {
      log.hint('运行 `novel world build` 把三件套建齐。');
      return;
    }
  }

  // ---------- Resolve role + tier ----------
  const role = await resolveRole(opts.role);
  const tier = await resolveTier(role, opts.tier);
  const tierIssues = checkRoleTierConsistency(role, tier);
  if (tierIssues.length > 0) {
    throw new NovelError(`role / tier 不一致：${tierIssues.join('; ')}`);
  }

  // ---------- Name + first_appear_chapter ----------
  const name = opts.name?.trim() || await input({
    message: '角色名（中文 / 英文均可）：',
    validate: (s: string) => s.trim().length > 0 || '不能为空',
  });
  const slug = characterSlug(name, `unnamed-${Date.now().toString(36)}`);
  const id = `${role}-${slug}`;

  // For protagonist/antagonist with role-aware default chapter; supporting/minor default 1.
  const firstAppearChapter = opts.firstAppearChapter ?? Number.parseInt(
    await input({
      message: '首次登场章节（≥ 1）：',
      default: '1',
      validate: (s: string) => {
        const n = Number.parseInt(s, 10);
        return Number.isInteger(n) && n >= 1 ? true : '必须是 ≥1 的整数';
      },
    }),
    10,
  );

  // ---------- Conflict check ----------
  if (characterCardExists(root, role, slug) && !opts.force) {
    const choice = await select<'overwrite' | 'cancel'>({
      message: `已存在 ${id}。怎么办？`,
      choices: [
        { value: 'overwrite', name: '覆盖（保留 created_at + 版本号 +1）' },
        { value: 'cancel', name: '取消' },
      ],
    });
    if (choice === 'cancel') return;
  }

  // ---------- LLM provider (optional) ----------
  let provider: LLMProvider | null = null;
  if (!opts.noLLM) {
    try {
      provider = await createProvider({
        projectRoot: root,
        skill: 'novel-character-atelier',
        ...(opts.mockLLM ? { mock: true } : {}),
      });
      log.info(`LLM provider: ${provider.name}/${provider.model}`);
    } catch (err) {
      log.warn(`LLM provider 不可用：${(err as Error).message}`);
      log.hint('继续以纯手工 / 编辑器模式运行。');
    }
  } else {
    log.info('已 --no-llm，纯手工模式');
  }

  const skill = await loadSkill('novel-character-atelier');
  const systemPrompt = compileSystemPrompt(skill, {
    projectRoot: root,
    extraRules: [
      'CLI 调用：你必须只输出**纯 JSON**（没有 markdown fence、没有注释、没有前后说明）。',
      'JSON 必须严格匹配 schema，所有必填字段都要有值。',
      '你输出的是 character.data 字段的内容，不要包外层的 schema_version / asset_type 等元数据。',
    ],
  });

  // ---------- Build context for prompt ----------
  const ctx: AddCtx = {
    root,
    novel,
    blueprint,
    role,
    tier,
    name,
    firstAppearChapter,
    hint: opts.hint,
  };
  const userPrompt = await buildAddUserPrompt(ctx);

  // ---------- Pick mode + collect ----------
  let mode = await chooseMode(provider !== null);
  if (mode === 'skip') {
    log.warn('已跳过；没有创建 / 修改任何角色卡。');
    return;
  }

  while (true) {
    const data = await collectAssetData<CharacterData>({
      mode,
      provider,
      systemPrompt,
      userPrompt,
      schema: CharacterData,
      currentJson: CHARACTER_TEMPLATE_JSON,
      assetLabel: `character.data (${id})`,
    });
    if (data === null) return;

    log.heading(`${name} · ${id} 草稿预览`);
    log.plain(`一句话画像：${data.one_line_portrait}`);
    log.plain(`基础档案：年龄=${data.basic_profile.age}；外貌=${data.basic_profile.appearance.length} 条`);
    log.plain(`性格内核：core=${truncate(data.personality_core.core_drive, 40)}`);
    log.plain(`境界曲线：${data.ability_curve.length} 个锚点`);
    log.plain(`标志性细节：${data.signature_details.length} 条`);
    log.plain(`关系网指针：${data.relationships.length} 条`);
    log.plain(`弧光设计：${data.arc_design.length} 卷`);
    log.plain(`禁止写法：${data.prohibited.length} 条`);

    // R3 soft check: core 角色 ≥ 3 个标志性细节
    if (isCoreLevel(role, tier) && data.signature_details.length < 3) {
      log.warn('⚠ R3 警告：核心角色应有 ≥ 3 个标志性细节（chapter-writer 反 AI 味关键）。');
    }
    // Cross-check ability curve against powers (protagonist + antagonist).
    if ((role === 'protagonist' || role === 'antagonist') && powersExists(root)) {
      const powers = await readPowers(root);
      const issues = checkCharacterPowersAlignment(data, powers.data.protagonist_curve);
      if (issues.length > 0) {
        log.warn('⚠ ability_curve 与 powers.protagonist_curve 不一致：');
        for (const i of issues) log.warn(`  • ${i}`);
        log.hint('可以接受（drafting），但 quality-auditor 会复核。');
      }
    }

    const next = await select<'accept' | 'refine' | 'cancel'>({
      message: '满意吗？',
      choices: [
        { value: 'accept', name: '✓ 接受并保存' },
        { value: 'refine', name: '✏ 重新生成 / 编辑' },
        { value: 'cancel', name: '✗ 退出（不保存）' },
      ],
    });
    if (next === 'cancel') return;
    if (next === 'accept') {
      await persistCharacter({ root, role, tier, name, slug, firstAppearChapter, data });
      log.success(`已写入 ${characterFilePath(root, role, slug)}`);
      log.hint('运行 `novel character list` 查看；下一步：补反派 / 配角，或 `novel character approve` 锁定。');
      return;
    }
    // refine — reuse current mode
    const newMode = await chooseMode(provider !== null);
    if (newMode === 'skip') return;
    mode = newMode;
  }
}

// =============================================================================
//  Sub-helpers
// =============================================================================

interface AddCtx {
  root: string;
  novel: Novel;
  blueprint: Blueprint;
  role: CharacterRole;
  tier: CharacterTier;
  name: string;
  firstAppearChapter: number;
  hint: string | undefined;
}

type Mode = 'llm-draft' | 'editor' | 'skip';

async function chooseMode(hasProvider: boolean): Promise<Mode> {
  type Choice = { value: Mode; name: string; disabled?: boolean };
  const choices: Choice[] = [
    { value: 'llm-draft', name: '让 LLM 起草整份 8 字段 JSON', disabled: !hasProvider },
    { value: 'editor', name: '打开编辑器手填 JSON' },
    { value: 'skip', name: '跳过（不创建任何东西）' },
  ];
  return select<Mode>({ message: '怎么处理？', choices });
}

async function resolveRole(provided: CharacterRole | undefined): Promise<CharacterRole> {
  if (provided) return provided;
  return select<CharacterRole>({
    message: '角色定位？',
    choices: [
      { value: 'protagonist', name: 'protagonist · 主角（每本书 1 个）' },
      { value: 'antagonist', name: 'antagonist · 反派' },
      { value: 'supporting', name: 'supporting · 配角（师妹 / 师傅 / 兄弟 / 红颜 ...）' },
      { value: 'minor', name: 'minor · 次要角色（出场 < 20 章）' },
    ],
  });
}

async function resolveTier(
  role: CharacterRole,
  provided: CharacterTier | undefined,
): Promise<CharacterTier> {
  if (provided) return provided;
  switch (role) {
    case 'protagonist':
      return 'protagonist';
    case 'minor':
      return 'minor';
    case 'antagonist':
      return select<CharacterTier>({
        message: '反派 tier？',
        choices: [
          { value: 'early', name: 'early · 早期反派（前 30 章）' },
          { value: 'mid', name: 'mid · 中期 boss（30–200 章）' },
          { value: 'late', name: 'late · 后期 / 真 boss（200+ 章）' },
          { value: 'meta', name: 'meta · 幕后操盘者（全书 0-1 个）' },
        ],
      });
    case 'supporting':
      return select<CharacterTier>({
        message: '配角 tier？',
        choices: [
          { value: 'core', name: 'core · 核心配角（≥ 50 章出场，密度 80%）' },
          { value: 'important', name: 'important · 重要配角（20-50 章，密度 50%）' },
          { value: 'minor', name: 'minor · 普通配角（< 20 章，密度 30%）' },
        ],
      });
  }
}

function isCoreLevel(role: CharacterRole, tier: CharacterTier): boolean {
  if (role === 'protagonist') return true;
  // All antagonist tiers (early/mid/late/meta) need full 8-field density per SKILL §3.2.
  if (role === 'antagonist') return true;
  if (role === 'supporting') return tier === 'core' || tier === 'important';
  return false;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

async function buildAddUserPrompt(ctx: AddCtx): Promise<string> {
  const sections = ctx.blueprint.sections;
  const target = ctx.novel.target_chapters ?? 800;

  let worldviewSnippet = '（未建）';
  let powersSnippet = '（未建）';
  let cheatSystemSnippet = '（未建）';
  if (worldviewExists(ctx.root)) {
    worldviewSnippet = JSON.stringify((await readWorldview(ctx.root)).data, null, 2);
  }
  if (powersExists(ctx.root)) {
    powersSnippet = JSON.stringify((await readPowers(ctx.root)).data, null, 2);
  }
  if (cheatSystemExists(ctx.root)) {
    cheatSystemSnippet = JSON.stringify((await readCheatSystem(ctx.root)).data, null, 2);
  }

  // Existing character names for relationship pointer reference.
  let existingChars = '（暂无）';
  if (characterIndexExists(ctx.root)) {
    const idx = await readCharacterIndex(ctx.root);
    const flat = [
      ...idx.data.protagonist.map(
        (e: { id: string; name: string }) => `${e.id} · ${e.name}（主角）`,
      ),
      ...idx.data.antagonists.map(
        (e: { id: string; name: string; tier: string }) => `${e.id} · ${e.name}（反派/${e.tier}）`,
      ),
      ...idx.data.supporting.map(
        (e: { id: string; name: string; tier: string }) => `${e.id} · ${e.name}（配角/${e.tier}）`,
      ),
      ...idx.data.minor.map(
        (e: { id: string; name: string }) => `${e.id} · ${e.name}（次要）`,
      ),
    ];
    if (flat.length > 0) existingChars = flat.join('\n- ');
  }

  return `当前任务：捏一个角色卡（character.data，8 字段）。

【书名】${ctx.novel.title}（目标 ${target} 章）
【题材】${ctx.novel.genre.join(', ')}
【这次要捏的角色】
- 名字：${ctx.name}
- 定位：${ctx.role}（tier: ${ctx.tier}）
- 首次登场章节：第 ${ctx.firstAppearChapter} 章

【blueprint 关键信息】
- 一句话定盘：${nonEmpty(sections.pitch)}
- 主角画像：${nonEmpty(sections.protagonist)}
- 金手指：${nonEmpty(sections.cheat_system)}
- 钩子：${nonEmpty(sections.hooks)}
- 排除项：${nonEmpty(sections.exclusions)}
- 长期意图：${nonEmpty(sections.long_term_intent)}

【world/worldview.data】
${worldviewSnippet}

【world/powers.data】
${powersSnippet}

【world/cheat-system.data】
${cheatSystemSnippet}

【已有角色（用于 relationships 字段引用 character_id）】
- ${existingChars}
${ctx.hint ? `\n【用户补充】\n${ctx.hint}\n` : ''}
请输出 character.data JSON。要求：

字段：
- one_line_portrait (string)：一句话画像，模板=<现实身份>+<出身/起点>+<性格关键词1-2个>+<最深的渴望或恐惧>
- basic_profile: { age, origin, appearance[3-5], clothing_style }
- personality_core: { core_drive, decision_pattern, emotional_anchors[≥1] }
  ⚠️ 这 3 条一旦 approved 不可破，全书都会读它。
- ability_curve (array of {chapter, stage, context})：
  ${ctx.role === 'protagonist' || ctx.role === 'antagonist'
    ? '主角 / 关键反派必须严格对照 powers.protagonist_curve 抄过来，章节 / 境界字段一致；至少 3 个锚点。'
    : '配角可以为空数组（无境界曲线时直接 []）。'}
- signature_details (array of string)：${isCoreLevel(ctx.role, ctx.tier) ? '核心角色 ≥ 3 条' : '可选'}，读者记得住的小动作 / 习惯 / 物件
- relationships (array of {character_id, relation_type})：
  character_id 必须是 <role>-<slug> 格式，且最好在【已有角色】中存在；relation_type 可用 朦胧情线 / 师徒 / 仇人 / 利用 / 共谋 / 怀疑 等
- arc_design (array of {volume, description})：按"第 X 卷"标号；弧光是渐变不是突变
- prohibited (array of string)：明确不能让该角色做什么；要列具体禁忌（如"突然变成口出狂言的少年豪侠"）

不要 markdown fence，不要注释，只输出纯 JSON 对象。

参考结构（《吞天魔帝·林烬》）：
${CHARACTER_EXAMPLE_JSON}`;
}

interface PersistArgs {
  root: string;
  role: CharacterRole;
  tier: CharacterTier;
  name: string;
  slug: string;
  firstAppearChapter: number;
  data: CharacterData;
}

async function persistCharacter(args: PersistArgs): Promise<void> {
  const { root, role, tier, name, slug, firstAppearChapter, data } = args;

  // Read existing card metadata for version bump (if overwrite).
  let existing: { created_at: string; version: number } | undefined;
  if (characterCardExists(root, role, slug)) {
    try {
      const card = await readCharacterCard(root, role, slug);
      existing = {
        created_at: card.frontmatter.created_at,
        version: card.frontmatter.version,
      };
    } catch {
      /* corrupted .md — start fresh */
    }
  }

  // Write the .md card.
  const result = await writeCharacter({
    root,
    role,
    name,
    slug,
    tier,
    data,
    status: 'drafting',
    ...(existing ? { existing } : {}),
  });

  // Update _index.json (create if missing).
  let index = characterIndexExists(root)
    ? await readCharacterIndex(root)
    : buildInitialCharacterIndex();
  index = upsertIndexEntry(index, role, {
    id: result.id,
    name,
    file: result.indexFile,
    first_appear_chapter: firstAppearChapter,
    tier,
  });
  await writeCharacterIndex(root, index);
}

function nonEmpty(s: string | null | undefined): string {
  return s && s.trim().length > 0 ? s : '（蓝图未填）';
}

// =============================================================================
//  Generic asset-data collector (shared with world-flow's pattern)
// =============================================================================

interface CollectArgs<T> {
  mode: Mode;
  provider: LLMProvider | null;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  currentJson: string;
  assetLabel: string;
}

async function collectAssetData<T>(args: CollectArgs<T>): Promise<T | null> {
  if (args.mode === 'editor') return collectViaEditor(args);
  if (args.mode === 'llm-draft') {
    if (!args.provider) {
      log.warn('LLM provider 不可用，回退到 editor 模式');
      return collectViaEditor(args);
    }
    return collectViaLLM({ ...args, provider: args.provider });
  }
  return null;
}

async function collectViaEditor<T>(args: CollectArgs<T>): Promise<T | null> {
  let attempt = 0;
  let draft = args.currentJson;
  while (attempt < 3) {
    attempt++;
    const text = await editor({
      message: `编辑 ${args.assetLabel}（保存退出后会校验 schema）`,
      default: draft,
      postfix: '.json',
    });
    const parsed = tryParseJson(text);
    if (parsed === null) {
      log.warn('JSON 解析失败，请检查语法。');
      const retry = await confirm({ message: '再编辑一次？', default: true });
      if (!retry) return null;
      draft = text;
      continue;
    }
    const result = args.schema.safeParse(parsed);
    if (!result.success) {
      log.warn(`Schema 校验失败：\n${formatZodError(result.error)}`);
      const retry = await confirm({ message: '再编辑一次？', default: true });
      if (!retry) return null;
      draft = text;
      continue;
    }
    return result.data;
  }
  log.error('连续 3 次校验失败，放弃这一步。');
  return null;
}

async function collectViaLLM<T>(args: CollectArgs<T> & { provider: LLMProvider }): Promise<T | null> {
  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    const spinner = log
      .spinner(`询问 ${args.provider.name}/${args.provider.model}（第 ${attempt} 次）...`)
      .start();
    let response: string;
    try {
      const res = await args.provider.chat(
        [
          { role: 'system', content: args.systemPrompt },
          { role: 'user', content: args.userPrompt },
        ],
        { temperature: 0.7, maxTokens: 4096 },
      );
      response = res.content;
      spinner.stop();
    } catch (err) {
      spinner.fail('LLM 调用失败');
      log.error(`LLM 错误：${(err as Error).message}`);
      const retry = await confirm({ message: '再试一次？', default: true });
      if (!retry) return null;
      continue;
    }

    const parsed = extractJsonFromLLMResponse(response);
    if (parsed === null) {
      log.warn('LLM 响应里找不到合法 JSON。原始片段：');
      log.plain(chalk.dim(response.slice(0, 400)));
      const choice = await select<'retry' | 'editor' | 'cancel'>({
        message: '怎么办？',
        choices: [
          { value: 'retry', name: '让 LLM 再生成一次' },
          { value: 'editor', name: '直接打开编辑器手填' },
          { value: 'cancel', name: '退出这一步' },
        ],
      });
      if (choice === 'retry') continue;
      if (choice === 'editor') return collectViaEditor(args);
      return null;
    }

    const result = args.schema.safeParse(parsed);
    if (!result.success) {
      log.warn(`LLM 输出 schema 校验失败：\n${formatZodError(result.error)}`);
      const choice = await select<'retry' | 'editor' | 'cancel'>({
        message: '怎么办？',
        choices: [
          { value: 'retry', name: '让 LLM 重新生成（可能修好）' },
          { value: 'editor', name: '把当前输出导入编辑器手动修' },
          { value: 'cancel', name: '退出这一步' },
        ],
      });
      if (choice === 'retry') continue;
      if (choice === 'editor') {
        return collectViaEditor({ ...args, currentJson: JSON.stringify(parsed, null, 2) });
      }
      return null;
    }
    return result.data;
  }
  log.error('连续 3 次 LLM 输出都不合格，放弃这一步。');
  return null;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonFromLLMResponse(text: string): unknown {
  const trimmed = text.trim();
  const direct = tryParseJson(trimmed);
  if (direct !== null) return direct;
  const fence = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fence) {
    const fenced = tryParseJson(fence[1]!);
    if (fenced !== null) return fenced;
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const obj = tryParseJson(trimmed.slice(start, end + 1));
    if (obj !== null) return obj;
  }
  return null;
}

// =============================================================================
//  Embedded templates / examples (LLM prompt aids)
// =============================================================================

const CHARACTER_TEMPLATE_JSON = JSON.stringify(
  {
    one_line_portrait: '<一句话画像>',
    basic_profile: {
      age: '<例：原身 16 岁 / 穿越者 25 岁>',
      origin: '<出身 / 家境>',
      appearance: ['<3-5 个特征，至少 1 个标志性>'],
      clothing_style: '<服饰风格>',
    },
    personality_core: {
      core_drive: '<核心驱动 1-2 句>',
      decision_pattern: '<决策模式：观察 / 直觉 / 询问 / 试探 / 硬刚>',
      emotional_anchors: ['<情绪锚点 1>', '<情绪锚点 2>'],
    },
    ability_curve: [],
    signature_details: [],
    relationships: [],
    arc_design: [],
    prohibited: [],
  },
  null,
  2,
);

const CHARACTER_EXAMPLE_JSON = JSON.stringify(
  {
    one_line_portrait:
      '现代研究生穿越成宗门最末等弟子林烬，自卑、被欺，但有耐心和分析力，最深的渴望是"被看见"。',
    basic_profile: {
      age: '原身 16 岁 / 穿越者 25 岁（穿越前是研究生）',
      origin: '青云宗外门洒扫弟子，三年前从江南溪村被宗门"清扫"招收',
      appearance: ['清瘦中等身高', '眼神温和但偶尔锋利', '左眉外侧一道淡疤（被赵天霄踩成）'],
      clothing_style: '洗得发白的青布外门弟子服，腰间挂未开光的木牌',
    },
    personality_core: {
      core_drive: '想活下去 + 想知道残卷的来源（求知欲）',
      decision_pattern: '先观察后行动、不轻易暴露底牌',
      emotional_anchors: [
        '对师妹苏婉柔有保护欲',
        '对欺凌过他的人不主动报复但也不原谅',
        '看到电子产品 / 现代物会怔住',
      ],
    },
    ability_curve: [
      { chapter: 1, stage: '炼气一层', context: '被欺凌' },
      { chapter: 30, stage: '炼气七层', context: '解出师兄漏洞反杀' },
      { chapter: 100, stage: '筑基中期', context: '脱离宗门' },
    ],
    signature_details: [
      '习惯把残卷贴身藏在胸口（紧张时会摸一下）',
      '说话前会停顿半秒（思考型）',
      '不喝酒，反感烟味（穿越前后习惯延续）',
      '右手食指有薄茧（前世写代码留下）',
    ],
    relationships: [
      { character_id: 'supporting-su-wanrou', relation_type: '师妹 / 朦胧情线' },
      { character_id: 'antagonist-zhao-tianxiao', relation_type: '同门反派 / 仇人' },
    ],
    arc_design: [
      { volume: '第 1 卷', description: '从受害者到反击者（被动 → 主动）' },
      { volume: '第 3 卷', description: '从被动求生到主动求知' },
      { volume: '第 8 卷', description: '从个人复仇到接受残卷使命' },
    ],
    prohibited: [
      '突然变成口出狂言的少年豪侠',
      '对师妹产生 OOC 的强烈占有欲',
      '忽然失去观察分析的习惯',
      '在 50 章前能解析金丹功法（违反 cheat-system tier）',
    ],
  },
  null,
  2,
);

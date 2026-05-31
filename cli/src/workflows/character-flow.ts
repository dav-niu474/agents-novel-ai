/**
 * Character-atelier interactive build workflow (alpha-2b).
 *
 * Pinned to skills/novel-character-atelier/SKILL.md §4 (workflow A 初次设计 / B 增量补角色).
 *
 * Order (SKILL §3 "主角 → 反派 → 配角"):
 *   1. protagonist   (required, exactly 1)
 *   2. antagonists   (loop; first pass usually just the early-tier ones)
 *   3. supporting    (loop; core / important)
 *   4. relationships (graph referencing the roster)
 *
 * Each character card is collected as structured JSON (LLM draft or $EDITOR),
 * Zod-validated, written as JSON canonical + MD projection, then registered in
 * characters/_index.json. Relationships are a separate structured asset.
 *
 * Constraints enforced here / at approve:
 *   - R1 性格内核不可空（core_drive + decision_pattern required）
 *   - R2 主角能力曲线对齐 powers.protagonist_curve（软警告）
 *   - R3 核心角色 ≥ 3 标志性细节
 *   - R7 不替用户取名（name 必须由用户输入；slug 也由用户给定）
 */
import { confirm, input, select } from '@inquirer/prompts';
import { readBlueprint } from '../core/assets/blueprint.js';
import { readNovel } from '../core/assets/novel.js';
import { findProjectRoot } from '../core/assets/paths.js';
import {
  allIndexIds,
  buildInitialCharacter,
  buildInitialRelationships,
  charactersStatus,
  characterIndexExists,
  deriveCharacterId,
  parseCharacterId,
  readCharacterIndex,
  readRelationships,
  registerCharacterInIndex,
  relationshipsExists,
  writeCharacter,
  writeRelationships,
} from '../core/assets/character.js';
import {
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  worldStatus,
} from '../core/assets/world.js';
import { createProvider } from '../core/llm/factory.js';
import type { LLMProvider } from '../core/llm/provider.js';
import type { Blueprint } from '../core/schemas/blueprint.js';
import {
  Character,
  CharacterData,
  RelationshipsData,
  checkAbilityCurveAlignment,
  checkCharacterCardStrong,
  type Character as TCharacter,
  type CharacterRole,
  type CharacterTier,
} from '../core/schemas/character.js';
import type { Novel } from '../core/schemas/novel.js';
import type { PowersData } from '../core/schemas/world.js';
import { compileSystemPrompt } from '../core/skills/compiler.js';
import { loadSkill } from '../core/skills/loader.js';
import { NotInProjectError, NovelError } from '../core/utils/errors.js';
import { nowISO } from '../core/utils/time.js';
import { chalk, log } from '../core/utils/logger.js';
import { collectAssetData } from './json-collect.js';

// =============================================================================
//  Options + entry points
// =============================================================================

export interface CharacterFlowOptions {
  /** Only fill what's missing (skip an already-built protagonist). */
  resume?: boolean;
  mockLLM?: boolean;
  noLLM?: boolean;
  hint?: string;
}

export interface CharacterAddOptions extends CharacterFlowOptions {
  /** Pre-selected role (skips the role prompt). */
  role?: CharacterRole;
}

/** `novel character build` — full first-pass roster + relationships. */
export async function runCharacterBuild(opts: CharacterFlowOptions = {}): Promise<void> {
  const ctx = await preflight(opts);

  // Step 1 — protagonist (required, exactly 1).
  await buildProtagonistStep(ctx);

  // Step 2 — antagonists (loop).
  await buildRoleLoop(ctx, 'antagonist');

  // Step 3 — supporting (loop).
  await buildRoleLoop(ctx, 'supporting');

  // Step 4 — relationships.
  await buildRelationshipsStep(ctx);

  await printSummary(ctx.root);
  log.info('运行 `novel character list` 查看角色，`novel character approve` 校验并定稿。');
}

/** `novel character add [role]` — incrementally add a single character. */
export async function runCharacterAdd(opts: CharacterAddOptions = {}): Promise<void> {
  const ctx = await preflight(opts);

  const role: CharacterRole =
    opts.role ??
    (await select<CharacterRole>({
      message: '要添加哪类角色？',
      choices: [
        { value: 'protagonist', name: '主角（每本书仅 1 个）' },
        { value: 'antagonist', name: '反派' },
        { value: 'supporting', name: '配角' },
      ],
    }));

  if (role === 'protagonist') {
    await buildProtagonistStep(ctx);
  } else if (role === 'antagonist' || role === 'supporting') {
    const tier = await chooseTier(role);
    await collectAndSaveCharacter(ctx, role, tier);
  } else {
    // role === 'minor' — a sparse card under supporting/.
    await collectAndSaveCharacter(ctx, 'minor', 'minor');
  }

  const wantRel = await confirm({
    message: '现在更新关系网吗？',
    default: true,
  });
  if (wantRel) await buildRelationshipsStep(ctx);

  await printSummary(ctx.root);
}

// =============================================================================
//  Shared context + preflight
// =============================================================================

interface FlowCtx {
  root: string;
  novel: Novel;
  blueprint: Blueprint;
  opts: CharacterFlowOptions;
  provider: LLMProvider | null;
  systemPrompt: string;
  /** Powers data when present (for R2 alignment + prompt context). */
  powers: PowersData | null;
  /** cheat-system tier summary string for prompts (forbidden-writing hints). */
  cheatSummary: string;
}

async function preflight(opts: CharacterFlowOptions): Promise<FlowCtx> {
  const root = findProjectRoot(process.cwd());
  if (!root) throw new NotInProjectError(process.cwd());

  const novel = await readNovel(root);

  // blueprint must exist; warn (but allow) if not approved.
  let blueprint: Blueprint;
  try {
    blueprint = await readBlueprint(root);
  } catch {
    throw new NovelError('blueprint.md 还未创建', {
      hint: '先跑 `novel blueprint start` 完成 10 步定盘。',
    });
  }
  if (blueprint.frontmatter.status !== 'approved') {
    const go = await confirm({
      message: 'blueprint 还不是 approved。角色会基于未定稿的蓝图设计，可能返工。继续？',
      default: false,
    });
    if (!go) {
      log.hint('运行 `novel blueprint approve` 先定稿蓝图。');
      throw new NovelError('已取消', { exitCode: 0 });
    }
  }

  // world should be present (powers + cheat-system drive R2 / forbidden-writing).
  const ws = worldStatus(root);
  if (!ws.allPresent) {
    const go = await confirm({
      message: `世界三件套未建齐（${ws.count}/3）。角色能力曲线无法对齐 powers。仍继续？`,
      default: false,
    });
    if (!go) {
      log.hint('运行 `novel world build` 把世界建齐，再回来捏角色。');
      throw new NovelError('已取消', { exitCode: 0 });
    }
  }

  const powers = powersExists(root) ? (await readPowers(root)).data : null;
  const cheatSummary = await buildCheatSummary(root);

  // LLM provider (optional).
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
      log.hint('继续以编辑器 / 手填模式运行。');
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
      '你输出的是 `data` 字段的内容（不要包外层 schema_version / asset_type 等元数据）。',
      'R7：不要擅自给角色改名 —— name 字段必须保持 CLI 提供的姓名。',
    ],
  });

  return { root, novel, blueprint, opts, provider, systemPrompt, powers, cheatSummary };
}

async function buildCheatSummary(root: string): Promise<string> {
  if (!cheatSystemExists(root)) return '（无金手指资产）';
  try {
    const cs = (await readCheatSystem(root)).data;
    if (cs.not_applicable) return '（本书无金手指）';
    const tiers = cs.stages
      .map((s) => {
        const [a, b] = s.chapter_range;
        const range = b === null ? `${a}–end` : `${a}–${b}`;
        return `Tier${s.tier}(第${range}章): ${s.cap}`;
      })
      .join('; ');
    return `${cs.name}（${cs.type}）阶梯：${tiers || '（未填）'}`;
  } catch {
    return '（金手指读取失败）';
  }
}

// =============================================================================
//  Step 1 — protagonist
// =============================================================================

async function buildProtagonistStep(ctx: FlowCtx): Promise<void> {
  log.heading('主角（protagonist）');
  log.plain(chalk.dim('每本书只有 1 个主角；信息密度最高，性格内核全书不可破。'));

  const status = await charactersStatus(ctx.root);
  if (status.hasProtagonist) {
    if (ctx.opts.resume) {
      log.info(chalk.dim('主角已存在，--resume 模式跳过。'));
      return;
    }
    const again = await confirm({
      message: '主角已存在。要再捏一个 / 覆盖吗？（注意：每本书应只有 1 主角）',
      default: false,
    });
    if (!again) return;
  }

  await collectAndSaveCharacter(ctx, 'protagonist', 'protagonist');
}

// =============================================================================
//  Step 2/3 — antagonist / supporting loops
// =============================================================================

async function buildRoleLoop(ctx: FlowCtx, role: 'antagonist' | 'supporting'): Promise<void> {
  const label = role === 'antagonist' ? '反派' : '配角';
  log.heading(`${label}（${role}）`);
  log.plain(
    chalk.dim(
      role === 'antagonist'
        ? '第一次只先做前 30 章会出现的早期反派（SKILL R6：先少后多）。'
        : '第一次只先做核心 / 重要配角（师妹 / 师傅 / 兄弟等）。',
    ),
  );

  while (true) {
    const add = await confirm({ message: `添加一个${label}？`, default: false });
    if (!add) break;
    const tier = await chooseTier(role);
    const saved = await collectAndSaveCharacter(ctx, role, tier);
    if (!saved) {
      // user cancelled this one; ask whether to keep looping.
      const cont = await confirm({ message: '继续添加？', default: false });
      if (!cont) break;
    }
  }
}

async function chooseTier(role: 'antagonist' | 'supporting'): Promise<CharacterTier> {
  if (role === 'antagonist') {
    return select<CharacterTier>({
      message: '反派层级？',
      choices: [
        { value: 'early', name: 'early — 早期 / 杂兵反派（前 30 章）' },
        { value: 'mid', name: 'mid — 中期反派 boss（30-200 章）' },
        { value: 'late', name: 'late — 后期 / 真 boss（200+ 章）' },
        { value: 'meta', name: 'meta — 幕后操盘者（全书）' },
      ],
    });
  }
  return select<CharacterTier>({
    message: '配角层级？',
    choices: [
      { value: 'core', name: 'core — 核心配角（出场 ≥ 50 章，信息密度高）' },
      { value: 'important', name: 'important — 重要配角（出场 20-50 章）' },
      { value: 'minor', name: 'minor — 普通配角（出场 < 20 章，1-3 字段即可）' },
    ],
  });
}

// =============================================================================
//  Collect + save a single character card
// =============================================================================

async function collectAndSaveCharacter(
  ctx: FlowCtx,
  role: CharacterRole,
  tier: CharacterTier,
): Promise<TCharacter | null> {
  // R7: the user names the character.
  const name = (await input({ message: '角色名（中文，用户决定）：' })).trim();
  if (name.length === 0) {
    log.warn('未提供角色名，跳过。');
    return null;
  }

  // slug / file id — also user-decided (Chinese names can't auto-romanize).
  const existing = characterIndexExists(ctx.root)
    ? allIndexIds((await readCharacterIndex(ctx.root)).data)
    : new Set<string>();
  const slugInput = (
    await input({
      message: '角色文件 ID（小写英文 / 拼音，kebab-case，如 lin-jin）：',
      validate: validateSlug,
    })
  ).trim();
  const id = deriveCharacterId(role, slugInput, existing);
  const slug = parseCharacterId(id).slug;
  if (id !== `${role}-${slugInput}`) {
    log.warn(`ID 冲突或被规整，最终使用：${id}`);
  }

  const firstAppear = await promptChapter('首次出场章节', 1);

  const mode = await chooseCharacterMode(ctx.provider !== null);
  if (mode === 'cancel') return null;

  const seed = buildInitialCharacter(role, tier, name, slug);
  seed.data.first_appear_chapter = firstAppear;
  const userPrompt = buildCharacterUserPrompt(ctx, { role, tier, name, firstAppear });

  let activeMode = mode;
  while (true) {
    const collected = await collectAssetData<CharacterData>({
      mode: activeMode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      schema: CharacterData,
      currentJson: JSON.stringify(seed.data, null, 2),
      assetLabel: `${id}.data`,
    });
    if (collected === null) return null;

    // Force the CLI-decided identity fields (R7 + consistency).
    const data: CharacterData = {
      ...collected,
      name,
      role,
      tier,
      first_appear_chapter: firstAppear,
    };

    previewCharacter(data);

    const strong = checkCharacterCardStrong(data);
    if (strong.length > 0) {
      log.warn('⚠ 卡片完整度问题（approve 时会拦截）：');
      for (const s of strong) log.warn('  • ' + s);
    }
    if (role === 'protagonist' && ctx.powers) {
      const align = checkAbilityCurveAlignment(data, ctx.powers);
      for (const a of align) log.warn('  • ' + a);
    }

    const next = await select<'accept' | 'refine' | 'cancel'>({
      message: strong.length > 0 ? '有完整度警告，仍保存草稿？' : '满意吗？',
      choices: [
        {
          value: 'accept',
          name: strong.length > 0 ? '⚠ 仍保存（drafting，需补齐后才能 approve）' : '✓ 接受并保存',
        },
        { value: 'refine', name: '✏ 重新生成 / 编辑' },
        { value: 'cancel', name: '✗ 退出（不保存这个角色）' },
      ],
    });
    if (next === 'cancel') return null;
    if (next === 'accept') {
      const ts = nowISO();
      const character = Character.parse({
        schema_version: '1.0',
        asset_type: 'character',
        asset_id: id,
        created_at: ts,
        updated_at: ts,
        version: 1,
        data,
      });
      const written = await writeCharacter(ctx.root, character, 'drafting');
      await registerCharacterInIndex(ctx.root, written);
      log.success(`已写入 ${id}（卡 + _index.json 已更新）`);
      return written;
    }
    // refine — re-choose mode (seed editor with the just-collected data).
    const m = await chooseCharacterMode(ctx.provider !== null);
    if (m === 'cancel') return null;
    activeMode = m;
    seed.data = data; // editor mode reseeds from current draft
  }
}

type CharacterMode = 'llm-draft' | 'editor' | 'cancel';

async function chooseCharacterMode(hasProvider: boolean): Promise<CharacterMode> {
  return select<CharacterMode>({
    message: '怎么填这张卡？',
    choices: [
      { value: 'llm-draft', name: '让 LLM 起草整张卡 JSON', disabled: !hasProvider },
      { value: 'editor', name: '打开编辑器手填 JSON' },
      { value: 'cancel', name: '取消这个角色' },
    ],
  });
}

function previewCharacter(data: CharacterData): void {
  log.heading('角色草稿预览');
  log.plain(`姓名 / 定位：${data.name} · ${data.role}/${data.tier}（首次第 ${data.first_appear_chapter} 章）`);
  log.plain(`一句话：${truncate(data.one_liner, 80)}`);
  log.plain(`核心驱动：${truncate(data.personality_core.core_drive, 60)}`);
  log.plain(`决策模式：${truncate(data.personality_core.decision_pattern, 60)}`);
  log.plain(
    `能力曲线：${data.ability_curve.length} 锚点 · 标志细节：${data.signature_details.length} · ` +
      `弧光：${data.arc_design.length} · 禁止写法：${data.forbidden_writing.length}`,
  );
}

// =============================================================================
//  Step 4 — relationships
// =============================================================================

async function buildRelationshipsStep(ctx: FlowCtx): Promise<void> {
  log.heading('关系网（relationships）');
  log.plain(chalk.dim('无向图，分主角圈 / 反派圈 / 配角圈 / 跨阵营；每条边含关键章节节点。'));

  if (!characterIndexExists(ctx.root)) {
    log.warn('还没有任何角色，跳过关系网。');
    return;
  }
  const index = await readCharacterIndex(ctx.root);
  const roster = [
    ...index.data.protagonist,
    ...index.data.antagonists,
    ...index.data.supporting,
    ...index.data.minor,
  ];
  if (roster.length < 2) {
    log.info(chalk.dim('角色少于 2 个，暂不需要关系网。'));
    return;
  }

  if (relationshipsExists(ctx.root) && ctx.opts.resume) {
    const rel = await readRelationships(ctx.root);
    if (rel.data.edges.length > 0) {
      log.info(chalk.dim('relationships.json 已有内容，--resume 模式跳过。'));
      return;
    }
  }

  const mode = await chooseCharacterMode(ctx.provider !== null);
  if (mode === 'cancel') return;

  const rosterLines = roster
    .map((e) => `- ${e.id}（${e.name}, tier=${e.tier}, 首次第 ${e.first_appear_chapter} 章）`)
    .join('\n');
  const userPrompt = buildRelationshipsUserPrompt(ctx, rosterLines);
  const seedJson = relationshipsExists(ctx.root)
    ? JSON.stringify((await readRelationships(ctx.root)).data, null, 2)
    : JSON.stringify({ edges: [] }, null, 2);

  let activeMode = mode;
  while (true) {
    const data = await collectAssetData<RelationshipsData>({
      mode: activeMode,
      provider: ctx.provider,
      systemPrompt: ctx.systemPrompt,
      userPrompt,
      schema: RelationshipsData,
      currentJson: seedJson,
      assetLabel: 'relationships.data',
    });
    if (data === null) return;

    log.heading('关系网草稿预览');
    log.plain(`关系数：${data.edges.length}`);
    for (const e of data.edges.slice(0, 8)) {
      log.plain(`  ${e.from} ↔ ${e.to}（${e.group} · ${e.type}${e.strength !== undefined ? ` · 强度${e.strength}` : ''}）`);
    }
    if (data.edges.length > 8) log.plain(chalk.dim(`  ... 共 ${data.edges.length} 条`));

    const unknownRefs = relationshipRefIssues(data, new Set(roster.map((r) => r.id)));
    if (unknownRefs.length > 0) {
      log.warn('部分关系引用了不在 _index.json 的角色 ID（可能是名字而非 ID）：');
      for (const u of unknownRefs.slice(0, 6)) log.warn('  • ' + u);
    }

    const next = await select<'accept' | 'refine' | 'cancel'>({
      message: '满意吗？',
      choices: [
        { value: 'accept', name: '✓ 接受并保存' },
        { value: 'refine', name: '✏ 重新生成 / 编辑' },
        { value: 'cancel', name: '✗ 退出' },
      ],
    });
    if (next === 'cancel') return;
    if (next === 'accept') {
      const existing = relationshipsExists(ctx.root)
        ? await readRelationships(ctx.root)
        : buildInitialRelationships();
      await writeRelationships(ctx.root, { ...existing, data }, 'drafting');
      log.success('relationships.json + relationships.md 已写入');
      return;
    }
    const m = await chooseCharacterMode(ctx.provider !== null);
    if (m === 'cancel') return;
    activeMode = m;
  }
}

/** Relationship edges whose endpoints aren't known character ids (informational). */
function relationshipRefIssues(data: RelationshipsData, ids: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  for (const e of data.edges) {
    if (!ids.has(e.from)) issues.push(`from="${e.from}" 不是已知角色 ID`);
    if (!ids.has(e.to)) issues.push(`to="${e.to}" 不是已知角色 ID`);
  }
  return issues;
}

// =============================================================================
//  Prompt builders
// =============================================================================

function buildCharacterUserPrompt(
  ctx: FlowCtx,
  meta: { role: CharacterRole; tier: CharacterTier; name: string; firstAppear: number },
): string {
  const s = ctx.blueprint.sections;
  const target = ctx.novel.target_chapters ?? 800;
  const powersCurve = ctx.powers
    ? JSON.stringify(ctx.powers.protagonist_curve, null, 2)
    : '（无 powers 资产）';

  const roleGuidance =
    meta.role === 'protagonist'
      ? '这是主角：8 字段全部要详细。ability_curve 必须严格抄自下方 powers.protagonist_curve（章节 + 境界一字不差）。'
      : meta.role === 'antagonist'
        ? '这是反派：性格内核要写清"他自己的目标是什么"，不能只写"想杀主角"。弧光典型为 自我膨胀 → 被打脸 → 转化/死亡/出局。'
        : '这是配角：按 tier 调整密度；core 接近主角，important 适中。';

  return `当前任务：设计一张角色卡（character.data）。

【书名】${ctx.novel.title}（目标 ${target} 章）
【题材】${ctx.novel.genre.join(', ')}

【本角色固定信息（不可改）】
- name: ${meta.name}
- role: ${meta.role}
- tier: ${meta.tier}
- first_appear_chapter: ${meta.firstAppear}

【蓝图关键信息】
- 主角画像：${nonEmpty(s.protagonist)}
- 金手指：${nonEmpty(s.cheat_system)}
- 卖点 / 钩子：${nonEmpty(s.hooks)}
- 长期意图：${nonEmpty(s.long_term_intent)}

【金手指阶梯（用于 forbidden_writing：禁止越级用金手指）】
${ctx.cheatSummary}

【powers.protagonist_curve（主角能力曲线对齐基准）】
${powersCurve}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}
${roleGuidance}

请输出 character.data JSON，字段：
- name / role / tier / first_appear_chapter：保持上面的固定值
- one_liner (string)：一句话画像（现实身份 + 出身 + 性格关键词 + 最深渴望/恐惧）
- profile: {age, origin, appearance[3-5], attire}
- personality_core: {core_drive(必填), decision_pattern(必填), emotional_anchors[]}（这是全书不可破的内核）
- ability_curve: [{chapter, stage, context}]（主角必须对齐 powers.protagonist_curve）
- signature_details (string[])：核心角色 ≥ 3 个读者记得住的小动作 / 习惯 / 物件
- relationship_pointers: [{target, relation}]（一句话指针）
- arc_design: [{phase, change}]（按卷渐变，不能突变）
- forbidden_writing (string[])：明确禁忌（含"X 章前不能越级用金手指"之类）

不要 markdown fence，不要注释，只输出纯 JSON 对象。

参考结构（《吞天魔帝》主角林烬，节选）：
${CHARACTER_EXAMPLE_JSON}`;
}

function buildRelationshipsUserPrompt(ctx: FlowCtx, rosterLines: string): string {
  return `当前任务：构建角色关系网（relationships.data）。

【已有角色（用这些 ID 作为 edge 的 from/to）】
${rosterLines}
${ctx.opts.hint ? `\n用户补充：${ctx.opts.hint}\n` : ''}
请输出 relationships.data JSON：{ "edges": [...] }。每条 edge：
- from / to：必须是上面列出的角色 ID
- group：protagonist（主角圈）/ antagonist（反派圈）/ supporting（配角圈）/ cross（跨阵营）
- type：关系类型，如 "朦胧情线" / "仇人" / "半师半敌" / "上下级"
- strength (0-5，可选)：0 陌生 / 3 信任 / 5 生死
- nodes: [{chapter?, event}]：关键章节节点（推进关系的事件）

至少覆盖主角与每个已有角色的关系。不要 markdown fence，只输出纯 JSON 对象。

参考：
${RELATIONSHIPS_EXAMPLE_JSON}`;
}

// =============================================================================
//  Summary
// =============================================================================

async function printSummary(root: string): Promise<void> {
  const st = await charactersStatus(root);
  log.heading('🎭 角色阶段小结');
  log.plain(
    `主角：${st.hasProtagonist ? '✓' : '✗'}  反派：${st.antagonistCount}  ` +
      `配角：${st.supportingCount}  关系网：${st.hasRelationships ? '✓' : '✗'}`,
  );
}

// =============================================================================
//  Helpers
// =============================================================================

function nonEmpty(s: string | null | undefined): string {
  return s && s.trim().length > 0 ? s : '（蓝图未填）';
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function validateSlug(s: string): true | string {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.trim())
    ? true
    : '请用小写字母 / 数字 / 连字符（kebab-case，如 lin-jin）';
}

async function promptChapter(message: string, def: number): Promise<number> {
  const raw = await input({
    message: `${message}（正整数）：`,
    default: String(def),
    validate: (v) => (/^\d+$/.test(v.trim()) && Number(v) >= 1 ? true : '请输入 ≥ 1 的整数'),
  });
  return Number(raw.trim());
}

// =============================================================================
//  Embedded examples (for LLM prompts)
// =============================================================================

const CHARACTER_EXAMPLE_JSON = JSON.stringify(
  {
    name: '林烬',
    role: 'protagonist',
    tier: 'protagonist',
    first_appear_chapter: 1,
    one_liner: '现代研究生穿越成宗门最末等弟子林烬，自卑、被欺，但有耐心和分析力，最深的渴望是"被看见"。',
    profile: {
      age: '原身 16 / 穿越者 25',
      origin: '青云宗外门洒扫弟子',
      appearance: ['清瘦', '眼神温和偶尔锋利', '左眉外侧淡疤'],
      attire: '洗得发白的青布外门弟子服',
    },
    personality_core: {
      core_drive: '想活下去 + 想知道残卷的来源（求知欲）',
      decision_pattern: '先观察后行动、不轻易暴露底牌',
      emotional_anchors: ['对师妹有保护欲', '看到现代物会怔住'],
    },
    ability_curve: [
      { chapter: 1, stage: '炼气一层', context: '被欺凌' },
      { chapter: 30, stage: '炼气七层', context: '解出师兄漏洞反杀' },
    ],
    signature_details: ['紧张时摸胸口残卷', '说话前停顿半秒', '不喝酒反感烟味'],
    relationship_pointers: [
      { target: 'supporting-su-wanrou', relation: '师妹，朦胧情线' },
      { target: 'antagonist-zhao-tianxiao', relation: '同门反派，仇人' },
    ],
    arc_design: [
      { phase: '第 1 卷', change: '从受害者到反击者（被动 → 主动）' },
      { phase: '第 8 卷', change: '从个人复仇到接受残卷使命（小我 → 大我）' },
    ],
    forbidden_writing: [
      '突然变成口出狂言的少年豪侠',
      '在 50 章前能解析金丹功法（违反 cheat-system Tier 1）',
    ],
  },
  null,
  2,
);

const RELATIONSHIPS_EXAMPLE_JSON = JSON.stringify(
  {
    edges: [
      {
        from: 'protagonist-lin-jin',
        to: 'supporting-su-wanrou',
        group: 'protagonist',
        type: '朦胧情线',
        strength: 3,
        nodes: [
          { chapter: 1, event: '苏婉柔旁观林烬被罚' },
          { chapter: 33, event: '苏婉柔暗中救场' },
        ],
      },
      {
        from: 'protagonist-lin-jin',
        to: 'antagonist-zhao-tianxiao',
        group: 'protagonist',
        type: '仇人',
        strength: 4,
        nodes: [{ chapter: 1, event: '赵天霄欺凌林烬' }],
      },
    ],
  },
  null,
  2,
);

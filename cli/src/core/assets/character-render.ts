/**
 * Render structured character data → Markdown body.
 *
 * The character card .md file IS the canonical (no JSON sidecar) — but at write
 * time the CLI builds a strict 8-section body from a validated `CharacterData`
 * object. Once on disk, the .md is opaque to read-back (users edit via
 * $EDITOR or `character add --refine`).
 *
 * Pinned to `templates/character.md` and `examples/tunshi-mo-di/characters/protagonist-lin-jin.md`.
 */
import type {
  CharacterData,
  CharacterRole,
  CharacterTier,
  RelationshipsData,
} from '../schemas/character.js';

// =============================================================================
//  Character card body
// =============================================================================

/** Lookup display label for the role + optional tier line at the top of the card. */
function roleLabel(role: CharacterRole, tier: CharacterTier | undefined): string {
  switch (role) {
    case 'protagonist':
      return '主角人设';
    case 'antagonist': {
      const t: Record<string, string> = {
        early: '早期反派',
        mid: '中期反派',
        late: '后期反派',
        meta: '幕后反派',
      };
      return tier && t[tier] ? t[tier]! : '反派';
    }
    case 'supporting': {
      const t: Record<string, string> = {
        core: '核心配角',
        important: '重要配角',
        minor: '普通配角',
      };
      return tier && t[tier] ? t[tier]! : '配角';
    }
    case 'minor':
      return '次要角色';
    default: {
      // Exhaustiveness guard — TS sees `role` narrowed to `never` here.
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export interface RenderCharacterArgs {
  name: string;
  role: CharacterRole;
  tier: CharacterTier | undefined;
  data: CharacterData;
}

export function renderCharacterBody(args: RenderCharacterArgs): string {
  const { name, role, tier, data } = args;
  const out: string[] = [];

  out.push(`# ${name} · ${roleLabel(role, tier)}`);
  out.push('');

  // 1. one-line portrait
  out.push('## 1. 一句话画像');
  out.push('');
  out.push(data.one_line_portrait);
  out.push('');

  // 2. basic profile
  out.push('## 2. 基础档案');
  out.push('');
  out.push(`- **年龄**：${data.basic_profile.age}`);
  out.push(`- **出身**：${data.basic_profile.origin}`);
  if (data.basic_profile.appearance.length > 0) {
    out.push(`- **外貌**：${data.basic_profile.appearance.join('；')}`);
  } else {
    out.push('- **外貌**：（待填）');
  }
  if (data.basic_profile.clothing_style) {
    out.push(`- **服饰风格**：${data.basic_profile.clothing_style}`);
  }
  out.push('');

  // 3. personality core (immutable once approved)
  out.push('## 3. 性格内核（不可被剧情打破）');
  out.push('');
  out.push('> ⚠️ 一旦 approved，全书不能让该角色违背这 3 条。chapter-writer 会读取，quality-auditor 会校验 OOC。');
  out.push('');
  out.push(`- **核心驱动**：${data.personality_core.core_drive}`);
  out.push(`- **决策模式**：${data.personality_core.decision_pattern}`);
  out.push('- **情绪锚点**：');
  for (const a of data.personality_core.emotional_anchors) {
    out.push(`  - ${a}`);
  }
  out.push('');

  // 4. ability curve
  out.push('## 4. 能力与成长');
  out.push('');
  if (data.ability_curve.length === 0) {
    if (role === 'protagonist' || role === 'antagonist') {
      out.push('（待填 — 主角 / 关键反派必须严格对照 `world/powers.json.protagonist_curve`）');
    } else {
      out.push('（不适用 / 待填）');
    }
  } else {
    out.push('> 与 `world/powers.json.protagonist_curve` 严格对齐。');
    out.push('');
    out.push('| 章节 | 境界 | 触发上下文 |');
    out.push('|------|------|-----------|');
    for (const e of data.ability_curve) {
      out.push(`| ${e.chapter} | ${e.stage} | ${e.context || '—'} |`);
    }
  }
  out.push('');

  // 5. signature details
  out.push('## 5. 标志性细节');
  out.push('');
  if (data.signature_details.length === 0) {
    out.push('（待填，核心角色 ≥ 3 个）');
  } else {
    let i = 0;
    for (const d of data.signature_details) {
      i++;
      out.push(`${i}. ${d}`);
    }
  }
  out.push('');

  // 6. relationship pointers (one-liners; full graph lives in relationships.md)
  out.push('## 6. 关系网（一句话指针）');
  out.push('');
  out.push('详见 [`relationships.md`](./relationships.md)。');
  out.push('');
  if (data.relationships.length === 0) {
    out.push('（待填）');
  } else {
    for (const r of data.relationships) {
      out.push(`- \`${r.character_id}\`（${r.relation_type}）`);
    }
  }
  out.push('');

  // 7. arc design
  out.push('## 7. 弧光设计');
  out.push('');
  out.push('> 弧光是渐变，不是突变。chapter-writer 不能让角色某章突然"想通了"。');
  out.push('');
  if (data.arc_design.length === 0) {
    out.push('（待填）');
  } else {
    for (const a of data.arc_design) {
      out.push(`- **${a.volume}**：${a.description}`);
    }
  }
  out.push('');

  // 8. prohibited writing
  out.push('## 8. 禁止写法');
  out.push('');
  out.push('> chapter-writer 读这一节作为硬墙。');
  out.push('');
  if (data.prohibited.length === 0) {
    out.push('（待填）');
  } else {
    for (const p of data.prohibited) {
      out.push(`- ❌ ${p}`);
    }
  }
  out.push('');

  return out.join('\n').trimEnd();
}

// =============================================================================
//  Relationships body
// =============================================================================

const GROUP_LABEL: Record<string, string> = {
  protagonist: '主角圈',
  antagonist: '反派圈',
  supporting: '配角圈',
  cross: '跨阵营',
};

const GROUP_ORDER = ['protagonist', 'antagonist', 'supporting', 'cross'] as const;

export function renderRelationshipsBody(data: RelationshipsData): string {
  const out: string[] = [];
  out.push('# 关系网');
  out.push('');
  out.push('> 由 `novel-character-atelier` 维护。每加 / 改一个角色，关系网必须同步（SKILL §5 R5）。');
  out.push('');

  const grouped = new Map<string, typeof data.relationships>();
  for (const g of GROUP_ORDER) grouped.set(g, []);
  for (const r of data.relationships) {
    grouped.get(r.group)?.push(r);
  }

  let printed = 0;
  for (const g of GROUP_ORDER) {
    const list = grouped.get(g) ?? [];
    if (list.length === 0) continue;
    out.push(`## ${GROUP_LABEL[g]}`);
    out.push('');
    for (const r of list) {
      out.push(`### \`${r.from}\` ↔ \`${r.to}\``);
      out.push('');
      out.push(`- **关系类型**：${r.relation_type}`);
      out.push(`- **强度**：${r.strength}/5`);
      if (r.notes.length === 0) {
        out.push('- **关键节点**：（待填）');
      } else {
        out.push('- **关键节点**：');
        for (const n of r.notes) {
          out.push(`  - 第 ${n.chapter} 章：${n.event}`);
        }
      }
      out.push('');
      printed++;
    }
  }

  if (printed === 0) {
    out.push('（暂无关系条目；运行 `novel character add` 时会引导补充）');
    out.push('');
  }

  return out.join('\n').trimEnd();
}

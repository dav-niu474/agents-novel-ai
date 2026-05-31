/**
 * Render structured character data into Markdown body for human reading.
 *
 * The JSON sidecar is canonical; the .md file is a lossy projection. Never parse
 * the .md back to recover data.
 *
 * Pinned to:
 *   - templates/character.md (8-section card)
 *   - templates/characters-relationships.md (relationship graph)
 *   - examples/tunshi-mo-di/characters/* (real output shape)
 */
import type {
  CharacterData,
  CharacterRole,
  CharacterTier,
  RelationshipsData,
  RelationshipGroup,
} from '../schemas/character.js';

// =============================================================================
//  Labels
// =============================================================================

const ANTAGONIST_TIER_LABEL: Record<string, string> = {
  early: '早期反派',
  mid: '中期反派',
  late: '后期反派',
  meta: '幕后反派',
};

const SUPPORTING_TIER_LABEL: Record<string, string> = {
  core: '核心配角',
  important: '重要配角',
  minor: '配角',
};

/** Human-readable "<name> · <这是谁>" subtitle for the card H1. */
export function roleTierLabel(role: CharacterRole, tier: CharacterTier): string {
  switch (role) {
    case 'protagonist':
      return '主角人设';
    case 'antagonist':
      return ANTAGONIST_TIER_LABEL[tier] ?? '反派';
    case 'supporting':
      return SUPPORTING_TIER_LABEL[tier] ?? '配角';
    case 'minor':
      return '配角';
  }
}

const RELATIONSHIP_GROUP_LABEL: Record<RelationshipGroup, string> = {
  protagonist: '主角圈',
  antagonist: '反派圈',
  supporting: '配角圈',
  cross: '跨阵营',
};

const RELATIONSHIP_GROUP_ORDER: ReadonlyArray<RelationshipGroup> = [
  'protagonist',
  'antagonist',
  'supporting',
  'cross',
];

// =============================================================================
//  Character card
// =============================================================================

export function renderCharacterBody(data: CharacterData): string {
  const out: string[] = [];
  out.push(`# ${data.name} · ${roleTierLabel(data.role, data.tier)}`);
  out.push('');

  // 1. 一句话画像
  out.push('## 1. 一句话画像');
  out.push('');
  out.push(data.one_liner.trim().length > 0 ? data.one_liner : '（待填）');
  out.push('');

  // 2. 基础档案
  out.push('## 2. 基础档案');
  out.push('');
  out.push(`- **年龄**：${orPlaceholder(data.profile.age)}`);
  out.push(`- **出身**：${orPlaceholder(data.profile.origin)}`);
  out.push(
    `- **外貌**：${data.profile.appearance.length > 0 ? data.profile.appearance.join('；') : '（待填）'}`,
  );
  out.push(`- **服饰风格**：${orPlaceholder(data.profile.attire)}`);
  out.push('');

  // 3. 性格内核
  out.push('## 3. 性格内核（不可被剧情打破）');
  out.push('');
  out.push(`- **核心驱动**：${orPlaceholder(data.personality_core.core_drive)}`);
  out.push(`- **决策模式**：${orPlaceholder(data.personality_core.decision_pattern)}`);
  out.push(
    `- **情绪锚点**：${
      data.personality_core.emotional_anchors.length > 0
        ? data.personality_core.emotional_anchors.join('；')
        : '（待填）'
    }`,
  );
  out.push('');

  // 4. 能力与成长
  out.push('## 4. 能力与成长');
  out.push('');
  if (data.role === 'protagonist' || data.role === 'antagonist') {
    out.push('> 与 `world/powers.json.protagonist_curve` 严格对齐（SKILL R2）。');
    out.push('');
  }
  if (data.ability_curve.length === 0) {
    out.push('（待填）');
  } else {
    out.push('| 章节 | 境界 | 触发上下文 |');
    out.push('|------|------|-----------|');
    for (const c of data.ability_curve) {
      out.push(`| ${c.chapter} | ${c.stage} | ${c.context || '—'} |`);
    }
  }
  out.push('');

  // 5. 标志性细节
  out.push('## 5. 标志性细节');
  out.push('');
  if (data.signature_details.length === 0) {
    out.push('（待填）');
  } else {
    data.signature_details.forEach((d, i) => {
      out.push(`${i + 1}. ${d}`);
    });
  }
  out.push('');

  // 6. 关系网指针
  out.push('## 6. 关系网（一句话指针）');
  out.push('');
  out.push('详见 [`relationships.md`](./relationships.md)。');
  out.push('');
  if (data.relationship_pointers.length === 0) {
    out.push('（待填）');
  } else {
    for (const r of data.relationship_pointers) {
      out.push(`- ${r.target}（${r.relation}）`);
    }
  }
  out.push('');

  // 7. 弧光设计
  out.push('## 7. 弧光设计');
  out.push('');
  if (data.arc_design.length === 0) {
    out.push('（待填）');
  } else {
    for (const a of data.arc_design) {
      out.push(`- **${a.phase}**：${a.change}`);
    }
  }
  out.push('');

  // 8. 禁止写法
  out.push('## 8. 禁止写法');
  out.push('');
  if (data.forbidden_writing.length === 0) {
    out.push('（待填）');
  } else {
    for (const f of data.forbidden_writing) {
      out.push(`- ❌ ${f}`);
    }
  }
  out.push('');

  return out.join('\n').trimEnd();
}

// =============================================================================
//  Relationships
// =============================================================================

export function renderRelationshipsBody(data: RelationshipsData): string {
  const out: string[] = [];
  out.push('# 关系网');
  out.push('');

  if (data.edges.length === 0) {
    out.push('（待填）');
    out.push('');
    return out.join('\n').trimEnd();
  }

  // Group edges by relationship circle.
  const grouped: Record<RelationshipGroup, RelationshipsData['edges']> = {
    protagonist: [],
    antagonist: [],
    supporting: [],
    cross: [],
  };
  for (const e of data.edges) {
    (grouped[e.group] ?? grouped.cross).push(e);
  }

  for (const group of RELATIONSHIP_GROUP_ORDER) {
    const edges = grouped[group] ?? [];
    if (edges.length === 0) continue;
    out.push(`## ${RELATIONSHIP_GROUP_LABEL[group]}`);
    out.push('');
    for (const e of edges) {
      out.push(`### ${e.from} ↔ ${e.to}`);
      out.push('');
      out.push(`- **关系类型**：${e.type}`);
      if (e.strength !== undefined) {
        out.push(`- **强度**：${e.strength}`);
      }
      if (e.nodes.length > 0) {
        out.push('- **关键节点**：');
        for (const n of e.nodes) {
          const prefix = n.chapter !== undefined ? `第 ${n.chapter} 章：` : '';
          out.push(`  - ${prefix}${n.event}`);
        }
      }
      out.push('');
    }
  }

  return out.join('\n').trimEnd();
}

// =============================================================================
//  Helpers
// =============================================================================

function orPlaceholder(s: string): string {
  return s.trim().length > 0 ? s : '（待填）';
}

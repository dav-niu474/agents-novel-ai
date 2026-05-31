/**
 * Tests for core/assets/character-render.ts:
 *   - renderCharacterBody: 8 sections, role/tier label, placeholders, tables
 *   - renderRelationshipsBody: grouping, node chapter prefixes, empty state
 *   - roleTierLabel mapping
 */
import { describe, expect, it } from 'vitest';
import {
  renderCharacterBody,
  renderRelationshipsBody,
  roleTierLabel,
} from '@novel/core/assets/character-render.js';
import type {
  CharacterData,
  RelationshipsData,
} from '@novel/core/schemas/character.js';

function card(overrides: Partial<CharacterData> = {}): CharacterData {
  return {
    name: '林烬',
    role: 'protagonist',
    tier: 'protagonist',
    first_appear_chapter: 1,
    one_liner: '现代研究生穿越成宗门最末等弟子。',
    profile: { age: '原身 16 / 穿越者 25', origin: '青云宗外门', appearance: ['清瘦', '左眉有疤'], attire: '青布弟子服' },
    personality_core: { core_drive: '想活下去 + 求知', decision_pattern: '先观察后行动', emotional_anchors: ['保护师妹'] },
    ability_curve: [{ chapter: 1, stage: '炼气一层', context: '被欺凌' }],
    signature_details: ['摸胸口残卷', '说话前停顿', '不喝酒'],
    relationship_pointers: [{ target: 'antagonist-zhao', relation: '仇人' }],
    arc_design: [{ phase: '第 1 卷', change: '从受害者到反击者' }],
    forbidden_writing: ['50 章前解析金丹功法'],
    ...overrides,
  };
}

describe('roleTierLabel', () => {
  it('maps roles + tiers to human labels', () => {
    expect(roleTierLabel('protagonist', 'protagonist')).toBe('主角人设');
    expect(roleTierLabel('antagonist', 'early')).toBe('早期反派');
    expect(roleTierLabel('antagonist', 'meta')).toBe('幕后反派');
    expect(roleTierLabel('supporting', 'core')).toBe('核心配角');
    expect(roleTierLabel('supporting', 'important')).toBe('重要配角');
  });
});

describe('renderCharacterBody', () => {
  it('renders all 8 sections with the name + role label in the H1', () => {
    const md = renderCharacterBody(card());
    expect(md).toContain('# 林烬 · 主角人设');
    expect(md).toContain('## 1. 一句话画像');
    expect(md).toContain('## 2. 基础档案');
    expect(md).toContain('## 3. 性格内核（不可被剧情打破）');
    expect(md).toContain('## 4. 能力与成长');
    expect(md).toContain('## 5. 标志性细节');
    expect(md).toContain('## 6. 关系网（一句话指针）');
    expect(md).toContain('## 7. 弧光设计');
    expect(md).toContain('## 8. 禁止写法');
  });

  it('renders content fields', () => {
    const md = renderCharacterBody(card());
    expect(md).toContain('现代研究生穿越成宗门最末等弟子。');
    expect(md).toContain('- **核心驱动**：想活下去 + 求知');
    expect(md).toContain('| 1 | 炼气一层 | 被欺凌 |');
    expect(md).toContain('1. 摸胸口残卷');
    expect(md).toContain('- ❌ 50 章前解析金丹功法');
    expect(md).toContain('antagonist-zhao（仇人）');
  });

  it('shows the powers-alignment note for protagonist/antagonist', () => {
    expect(renderCharacterBody(card())).toContain('powers.protagonist_curve');
    expect(renderCharacterBody(card({ role: 'antagonist', tier: 'early' }))).toContain(
      'powers.protagonist_curve',
    );
  });

  it('renders placeholders for empty fields', () => {
    const empty = card({
      one_liner: '',
      profile: { age: '', origin: '', appearance: [], attire: '' },
      ability_curve: [],
      signature_details: [],
      relationship_pointers: [],
      arc_design: [],
      forbidden_writing: [],
    });
    const md = renderCharacterBody(empty);
    expect(md).toMatch(/（待填）/);
  });
});

describe('renderRelationshipsBody', () => {
  it('renders the empty state', () => {
    const md = renderRelationshipsBody({ edges: [] });
    expect(md).toContain('# 关系网');
    expect(md).toContain('（待填）');
  });

  it('groups edges by circle and renders nodes', () => {
    const data: RelationshipsData = {
      edges: [
        {
          from: 'protagonist-lin-jin',
          to: 'supporting-su-wanrou',
          group: 'protagonist',
          type: '朦胧情线',
          strength: 3,
          nodes: [
            { chapter: 1, event: '旁观被罚' },
            { event: '未来：离开宗门' },
          ],
        },
        {
          from: 'antagonist-zhao',
          to: 'antagonist-zhang',
          group: 'antagonist',
          type: '上下级',
          nodes: [],
        },
      ],
    };
    const md = renderRelationshipsBody(data);
    expect(md).toContain('## 主角圈');
    expect(md).toContain('### protagonist-lin-jin ↔ supporting-su-wanrou');
    expect(md).toContain('- **关系类型**：朦胧情线');
    expect(md).toContain('- **强度**：3');
    expect(md).toContain('  - 第 1 章：旁观被罚');
    expect(md).toContain('  - 未来：离开宗门');
    expect(md).toContain('## 反派圈');
    expect(md).toContain('### antagonist-zhao ↔ antagonist-zhang');
  });
});

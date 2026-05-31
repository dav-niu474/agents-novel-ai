/**
 * Tests for core/schemas/character.ts:
 *   - CharacterData (happy + failure)
 *   - CharacterFrontmatter / Character asset_id pattern
 *   - CharacterIndex + Relationships schemas
 *   - validation helpers: checkTierForRole / checkCharacterCardStrong /
 *     checkAbilityCurveAlignment / isPlaceholderText / indexBucketForRole
 */
import { describe, expect, it } from 'vitest';
import {
  Character,
  CharacterData,
  CharacterFrontmatter,
  CharacterIndex,
  Relationships,
  RelationshipsData,
  checkAbilityCurveAlignment,
  checkCharacterCardStrong,
  checkTierForRole,
  indexBucketForRole,
  isPlaceholderText,
  type CharacterData as TCharacterData,
} from '../src/core/schemas/character.js';
import { AssetType } from '../src/core/schemas/common.js';
import type { PowersData as TPowersData } from '../src/core/schemas/world.js';

function fullProtagonist(overrides: Partial<TCharacterData> = {}): TCharacterData {
  return {
    name: '林烬',
    role: 'protagonist',
    tier: 'protagonist',
    first_appear_chapter: 1,
    one_liner: '现代研究生穿越成宗门最末等弟子，最深的渴望是被看见。',
    profile: { age: '原身 16 / 穿越者 25', origin: '青云宗外门', appearance: ['清瘦', '左眉有疤'], attire: '青布弟子服' },
    personality_core: {
      core_drive: '想活下去 + 求知',
      decision_pattern: '先观察后行动',
      emotional_anchors: ['对师妹有保护欲'],
    },
    ability_curve: [{ chapter: 1, stage: '炼气一层', context: '被欺凌' }],
    signature_details: ['摸胸口残卷', '说话前停顿', '不喝酒'],
    relationship_pointers: [{ target: 'antagonist-zhao', relation: '仇人' }],
    arc_design: [{ phase: '第 1 卷', change: '从受害者到反击者' }],
    forbidden_writing: ['50 章前解析金丹功法'],
    ...overrides,
  };
}

describe('AssetType — character assets', () => {
  it('contains character / character-index / characters-relationships', () => {
    expect(AssetType.options).toContain('character');
    expect(AssetType.options).toContain('character-index');
    expect(AssetType.options).toContain('characters-relationships');
  });
});

describe('CharacterData', () => {
  it('parses a complete protagonist', () => {
    expect(CharacterData.safeParse(fullProtagonist()).success).toBe(true);
  });

  it('parses a minimal card (defaults fill the rest)', () => {
    const minimal = {
      name: 'x',
      role: 'supporting',
      tier: 'important',
      one_liner: 'o',
      personality_core: { core_drive: 'c', decision_pattern: 'd' },
    };
    const res = CharacterData.safeParse(minimal);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.first_appear_chapter).toBe(1);
      expect(res.data.signature_details).toEqual([]);
      expect(res.data.profile.appearance).toEqual([]);
    }
  });

  it('rejects missing personality_core.core_drive', () => {
    const bad = fullProtagonist();
    // @ts-expect-error intentional invalid shape
    bad.personality_core = { decision_pattern: 'd' };
    expect(CharacterData.safeParse(bad).success).toBe(false);
  });

  it('rejects unknown role', () => {
    expect(CharacterData.safeParse(fullProtagonist({ role: 'sidekick' as never })).success).toBe(false);
  });

  it('rejects unknown tier', () => {
    expect(CharacterData.safeParse(fullProtagonist({ tier: 'legendary' as never })).success).toBe(false);
  });
});

describe('Character / CharacterFrontmatter asset_id', () => {
  const base = {
    asset_type: 'character' as const,
    character_role: 'protagonist' as const,
    created_at: '2026-05-24T00:00:00Z',
    updated_at: '2026-05-24T00:00:00Z',
    version: 1,
    status: 'drafting' as const,
    maintained_by: 'novel-character-atelier' as const,
  };

  it('accepts <role>-<slug> id', () => {
    expect(CharacterFrontmatter.safeParse({ ...base, asset_id: 'protagonist-lin-jin' }).success).toBe(true);
  });

  it('rejects an id without a role prefix', () => {
    expect(CharacterFrontmatter.safeParse({ ...base, asset_id: 'lin-jin' }).success).toBe(false);
  });

  it('full Character doc parses', () => {
    const doc = {
      schema_version: '1.0',
      asset_type: 'character',
      asset_id: 'protagonist-lin-jin',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      data: fullProtagonist(),
    };
    expect(Character.safeParse(doc).success).toBe(true);
  });
});

describe('CharacterIndex', () => {
  it('parses the template-shaped index', () => {
    const idx = {
      schema_version: '1.0',
      asset_type: 'character-index',
      asset_id: 'characters-index',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      data: {
        protagonist: [
          { id: 'protagonist-lin-jin', name: '林烬', file: 'protagonist-lin-jin.md', first_appear_chapter: 1, tier: 'protagonist' },
        ],
        antagonists: [],
        supporting: [],
        minor: [],
      },
    };
    expect(CharacterIndex.safeParse(idx).success).toBe(true);
  });
});

describe('Relationships', () => {
  it('parses an edge with nodes + strength', () => {
    const data = {
      edges: [
        {
          from: 'protagonist-lin-jin',
          to: 'supporting-su-wanrou',
          group: 'protagonist',
          type: '朦胧情线',
          strength: 3,
          nodes: [{ chapter: 1, event: '旁观被罚' }, { event: '未来：离开宗门' }],
        },
      ],
    };
    expect(RelationshipsData.safeParse(data).success).toBe(true);
  });

  it('rejects unknown relationship group', () => {
    const data = {
      edges: [{ from: 'a', to: 'b', group: 'frenemy', type: 'x', nodes: [] }],
    };
    expect(RelationshipsData.safeParse(data).success).toBe(false);
  });

  it('rejects strength out of 0-5 range', () => {
    const data = {
      edges: [{ from: 'a', to: 'b', group: 'cross', type: 'x', strength: 9, nodes: [] }],
    };
    expect(RelationshipsData.safeParse(data).success).toBe(false);
  });

  it('full Relationships doc parses', () => {
    const doc = {
      schema_version: '1.0',
      asset_type: 'characters-relationships',
      asset_id: 'relationships-main',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      data: { edges: [] },
    };
    expect(Relationships.safeParse(doc).success).toBe(true);
  });
});

describe('isPlaceholderText', () => {
  it('detects <...> placeholders', () => {
    expect(isPlaceholderText('<待填>')).toBe(true);
    expect(isPlaceholderText('  <x>  ')).toBe(true);
    expect(isPlaceholderText('真实内容')).toBe(false);
  });
});

describe('checkTierForRole', () => {
  it('accepts valid pairings', () => {
    expect(checkTierForRole('protagonist', 'protagonist')).toEqual([]);
    expect(checkTierForRole('antagonist', 'early')).toEqual([]);
    expect(checkTierForRole('supporting', 'core')).toEqual([]);
  });

  it('flags illegal pairings', () => {
    expect(checkTierForRole('protagonist', 'early').length).toBe(1);
    expect(checkTierForRole('antagonist', 'core').length).toBe(1);
  });
});

describe('indexBucketForRole', () => {
  it('maps role to index bucket', () => {
    expect(indexBucketForRole('protagonist')).toBe('protagonist');
    expect(indexBucketForRole('antagonist')).toBe('antagonists');
    expect(indexBucketForRole('supporting')).toBe('supporting');
    expect(indexBucketForRole('minor')).toBe('minor');
  });
});

describe('checkCharacterCardStrong', () => {
  it('passes a complete protagonist', () => {
    expect(checkCharacterCardStrong(fullProtagonist())).toEqual([]);
  });

  it('flags placeholder one_liner', () => {
    const issues = checkCharacterCardStrong(fullProtagonist({ one_liner: '<待填一句话画像>' }));
    expect(issues.length).toBeGreaterThan(0);
  });

  it('flags missing core_drive', () => {
    const issues = checkCharacterCardStrong(
      fullProtagonist({ personality_core: { core_drive: '<待填核心驱动>', decision_pattern: 'd', emotional_anchors: [] } }),
    );
    expect(issues.some((s) => s.includes('核心驱动'))).toBe(true);
  });

  it('flags < 3 signature details for high-density tiers', () => {
    const issues = checkCharacterCardStrong(fullProtagonist({ signature_details: ['only one'] }));
    expect(issues.some((s) => s.includes('标志性细节'))).toBe(true);
  });

  it('does NOT require 3 details for an important supporting', () => {
    const data = fullProtagonist({
      role: 'supporting',
      tier: 'important',
      signature_details: ['one'],
    });
    expect(checkCharacterCardStrong(data)).toEqual([]);
  });
});

describe('checkAbilityCurveAlignment', () => {
  const powers: TPowersData = {
    system_name: '末法修真',
    genre_basis: 'xianxia-classic-simplified',
    stages: [],
    protagonist_curve: [
      { chapter: 1, stage: '炼气一层', context: '' },
      { chapter: 30, stage: '炼气七层', context: '' },
    ],
    info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
    not_applicable: false,
  };

  it('passes when curve matches powers', () => {
    const data = fullProtagonist({
      ability_curve: [
        { chapter: 1, stage: '炼气一层', context: 'x' },
        { chapter: 30, stage: '炼气七层', context: 'y' },
      ],
    });
    expect(checkAbilityCurveAlignment(data, powers)).toEqual([]);
  });

  it('flags a chapter not present in powers curve', () => {
    const data = fullProtagonist({ ability_curve: [{ chapter: 5, stage: '炼气三层', context: '' }] });
    expect(checkAbilityCurveAlignment(data, powers).length).toBe(1);
  });

  it('flags a stage mismatch at the same chapter', () => {
    const data = fullProtagonist({ ability_curve: [{ chapter: 1, stage: '炼气九层', context: '' }] });
    const issues = checkAbilityCurveAlignment(data, powers);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain('不一致');
  });

  it('skips non-protagonist roles', () => {
    const data = fullProtagonist({ role: 'antagonist', tier: 'early', ability_curve: [{ chapter: 999, stage: 'x', context: '' }] });
    expect(checkAbilityCurveAlignment(data, powers)).toEqual([]);
  });

  it('skips when powers is not_applicable', () => {
    const data = fullProtagonist({ ability_curve: [{ chapter: 999, stage: 'x', context: '' }] });
    expect(checkAbilityCurveAlignment(data, { ...powers, not_applicable: true })).toEqual([]);
  });
});

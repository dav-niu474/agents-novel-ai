/**
 * Tests for core/schemas/character.ts:
 *   - Character / CharacterIndex / CharactersRelationships schemas (happy + failure)
 *   - role↔tier consistency helper
 *   - character ↔ powers protagonist_curve alignment helper
 */
import { describe, expect, it } from 'vitest';
import { AssetType } from '../src/core/schemas/common.js';
import {
  AntagonistTier,
  CharacterData,
  CharacterFrontmatter,
  CharacterIndex,
  CharacterIndexData,
  CharacterRole,
  CharacterTier,
  Relationship,
  RelationshipsData,
  RelationshipsFrontmatter,
  SupportingTier,
  checkCharacterPowersAlignment,
  checkRoleTierConsistency,
  type CharacterCurveEntry,
  type CharacterData as TCharacterData,
} from '../src/core/schemas/character.js';

// =============================================================================
//  AssetType — alpha-2b additions
// =============================================================================

describe('AssetType — alpha-2b additions', () => {
  it('contains character + character-index + characters-relationships', () => {
    expect(AssetType.options).toContain('character');
    expect(AssetType.options).toContain('character-index');
    expect(AssetType.options).toContain('characters-relationships');
  });
});

// =============================================================================
//  Role + tier enums
// =============================================================================

describe('Role / Tier enums', () => {
  it('CharacterRole has 4 entries', () => {
    expect(CharacterRole.options).toEqual([
      'protagonist',
      'antagonist',
      'supporting',
      'minor',
    ]);
  });

  it('AntagonistTier has 4 entries', () => {
    expect(AntagonistTier.options).toEqual(['early', 'mid', 'late', 'meta']);
  });

  it('SupportingTier has 3 entries', () => {
    expect(SupportingTier.options).toEqual(['core', 'important', 'minor']);
  });

  it('CharacterTier union covers all role-specific tiers', () => {
    expect(CharacterTier.options).toEqual([
      'protagonist',
      'early',
      'mid',
      'late',
      'meta',
      'core',
      'important',
      'minor',
    ]);
  });
});

// =============================================================================
//  CharacterData
// =============================================================================

describe('CharacterData', () => {
  function minimal(): TCharacterData {
    return {
      one_line_portrait: '现代研究生穿越成宗门最末等弟子林烬。',
      basic_profile: {
        age: '原身 16 岁 / 穿越者 25 岁',
        origin: '青云宗外门洒扫弟子',
        appearance: ['清瘦', '左眉有疤'],
        clothing_style: '青布弟子服',
      },
      personality_core: {
        core_drive: '想活下去',
        decision_pattern: '先观察后行动',
        emotional_anchors: ['对师妹有保护欲'],
      },
      ability_curve: [],
      signature_details: [],
      relationships: [],
      arc_design: [],
      prohibited: [],
    };
  }

  it('passes minimal valid', () => {
    expect(CharacterData.safeParse(minimal()).success).toBe(true);
  });

  it('rejects empty one_line_portrait', () => {
    const bad = { ...minimal(), one_line_portrait: '' };
    expect(CharacterData.safeParse(bad).success).toBe(false);
  });

  it('rejects empty emotional_anchors (R1: at least 1 required)', () => {
    const bad: unknown = {
      ...minimal(),
      personality_core: {
        ...minimal().personality_core,
        emotional_anchors: [],
      },
    };
    expect(CharacterData.safeParse(bad).success).toBe(false);
  });

  it('rejects empty core_drive', () => {
    const bad: unknown = {
      ...minimal(),
      personality_core: { ...minimal().personality_core, core_drive: '' },
    };
    expect(CharacterData.safeParse(bad).success).toBe(false);
  });

  it('relationship pointer character_id must be <role>-<slug>', () => {
    const goodRel = { ...minimal(), relationships: [{ character_id: 'supporting-su-wanrou', relation_type: '师妹' }] };
    expect(CharacterData.safeParse(goodRel).success).toBe(true);

    const badRel = { ...minimal(), relationships: [{ character_id: 'random-id-xyz', relation_type: '师妹' }] };
    expect(CharacterData.safeParse(badRel).success).toBe(false);

    const camelRel = { ...minimal(), relationships: [{ character_id: 'Protagonist-Foo', relation_type: 'X' }] };
    expect(CharacterData.safeParse(camelRel).success).toBe(false);
  });

  it('ability_curve entries require positive int chapters', () => {
    const negative = {
      ...minimal(),
      ability_curve: [{ chapter: 0, stage: '炼气', context: '' }],
    };
    expect(CharacterData.safeParse(negative).success).toBe(false);

    const ok = {
      ...minimal(),
      ability_curve: [{ chapter: 1, stage: '炼气一层', context: '被欺凌' }],
    };
    expect(CharacterData.safeParse(ok).success).toBe(true);
  });
});

// =============================================================================
//  CharacterFrontmatter
// =============================================================================

describe('CharacterFrontmatter', () => {
  const base = {
    asset_type: 'character' as const,
    created_at: '2026-05-24T00:00:00Z',
    updated_at: '2026-05-24T00:00:00Z',
    version: 1,
    status: 'drafting' as const,
    maintained_by: 'novel-character-atelier' as const,
  };

  it('accepts valid <role>-<slug> asset_id', () => {
    expect(
      CharacterFrontmatter.safeParse({
        ...base,
        asset_id: 'protagonist-lin-jin',
        character_role: 'protagonist',
        character_tier: 'protagonist',
      }).success,
    ).toBe(true);

    expect(
      CharacterFrontmatter.safeParse({
        ...base,
        asset_id: 'antagonist-zhao-tianxiao',
        character_role: 'antagonist',
        character_tier: 'early',
      }).success,
    ).toBe(true);
  });

  it('rejects asset_id without proper prefix', () => {
    const r = CharacterFrontmatter.safeParse({
      ...base,
      asset_id: 'random-xyz',
      character_role: 'protagonist',
    });
    expect(r.success).toBe(false);
  });

  it('rejects asset_id with uppercase', () => {
    const r = CharacterFrontmatter.safeParse({
      ...base,
      asset_id: 'protagonist-LinJin',
      character_role: 'protagonist',
    });
    expect(r.success).toBe(false);
  });

  it('character_tier is optional (protagonist may omit)', () => {
    const r = CharacterFrontmatter.safeParse({
      ...base,
      asset_id: 'protagonist-foo',
      character_role: 'protagonist',
    });
    expect(r.success).toBe(true);
  });
});

// =============================================================================
//  CharacterIndex
// =============================================================================

describe('CharacterIndex', () => {
  it('parses an empty index', () => {
    const idx = CharacterIndex.safeParse({
      schema_version: '1.0',
      asset_type: 'character-index',
      asset_id: 'characters-index',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      data: {
        protagonist: [],
        antagonists: [],
        supporting: [],
        minor: [],
      },
    });
    expect(idx.success).toBe(true);
  });

  it('IndexData applies defaults for missing arrays', () => {
    const r = CharacterIndexData.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.protagonist).toEqual([]);
      expect(r.data.antagonists).toEqual([]);
    }
  });

  it('protagonist tier must be literal "protagonist"', () => {
    const bad = CharacterIndexData.safeParse({
      protagonist: [
        {
          id: 'protagonist-foo',
          name: 'Foo',
          file: 'protagonist-foo.md',
          first_appear_chapter: 1,
          tier: 'core', // wrong
        },
      ],
    });
    expect(bad.success).toBe(false);
  });

  it('antagonist tier must be one of early/mid/late/meta', () => {
    const ok = CharacterIndexData.safeParse({
      antagonists: [
        {
          id: 'antagonist-foo',
          name: 'Foo',
          file: 'antagonists/antagonist-foo.md',
          first_appear_chapter: 5,
          tier: 'mid',
        },
      ],
    });
    expect(ok.success).toBe(true);

    const bad = CharacterIndexData.safeParse({
      antagonists: [
        {
          id: 'antagonist-foo',
          name: 'Foo',
          file: 'antagonists/antagonist-foo.md',
          first_appear_chapter: 5,
          tier: 'core',
        },
      ],
    });
    expect(bad.success).toBe(false);
  });
});

// =============================================================================
//  Relationships
// =============================================================================

describe('RelationshipsData / Relationship', () => {
  it('Relationship requires strength in [0,5]', () => {
    const ok = Relationship.safeParse({
      from: 'protagonist-foo',
      to: 'supporting-bar',
      relation_type: '师妹',
      strength: 3,
      group: 'protagonist',
      notes: [],
    });
    expect(ok.success).toBe(true);

    const bad = Relationship.safeParse({
      from: 'protagonist-foo',
      to: 'supporting-bar',
      relation_type: '师妹',
      strength: 7,
      group: 'protagonist',
      notes: [],
    });
    expect(bad.success).toBe(false);

    const negative = Relationship.safeParse({
      from: 'protagonist-foo',
      to: 'supporting-bar',
      relation_type: '师妹',
      strength: -1,
      group: 'protagonist',
      notes: [],
    });
    expect(negative.success).toBe(false);
  });

  it('Relationship.notes chapter must be positive int', () => {
    const bad = Relationship.safeParse({
      from: 'a',
      to: 'b',
      relation_type: 'x',
      strength: 1,
      group: 'cross',
      notes: [{ chapter: 0, event: 'meet' }],
    });
    expect(bad.success).toBe(false);
  });

  it('RelationshipsData defaults relationships to []', () => {
    const r = RelationshipsData.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.relationships).toEqual([]);
  });

  it('frontmatter requires asset_id literal "relationships-main"', () => {
    const bad = RelationshipsFrontmatter.safeParse({
      asset_type: 'characters-relationships',
      asset_id: 'something-else',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      status: 'drafting',
      maintained_by: 'novel-character-atelier',
    });
    expect(bad.success).toBe(false);
  });
});

// =============================================================================
//  checkRoleTierConsistency
// =============================================================================

describe('checkRoleTierConsistency', () => {
  it('protagonist with tier=protagonist is OK', () => {
    expect(checkRoleTierConsistency('protagonist', 'protagonist')).toEqual([]);
  });

  it('protagonist with no tier is OK', () => {
    expect(checkRoleTierConsistency('protagonist', undefined)).toEqual([]);
  });

  it('protagonist with tier=core is rejected', () => {
    const issues = checkRoleTierConsistency('protagonist', 'core');
    expect(issues.length).toBe(1);
  });

  it('antagonist requires tier', () => {
    const issues = checkRoleTierConsistency('antagonist', undefined);
    expect(issues.length).toBe(1);
  });

  it('antagonist with tier=early is OK', () => {
    expect(checkRoleTierConsistency('antagonist', 'early')).toEqual([]);
  });

  it('antagonist with tier=core is rejected', () => {
    const issues = checkRoleTierConsistency('antagonist', 'core');
    expect(issues.length).toBe(1);
  });

  it('supporting with tier=core is OK', () => {
    expect(checkRoleTierConsistency('supporting', 'core')).toEqual([]);
  });

  it('supporting with tier=early is rejected', () => {
    const issues = checkRoleTierConsistency('supporting', 'early');
    expect(issues.length).toBe(1);
  });

  it('minor with tier=minor is OK', () => {
    expect(checkRoleTierConsistency('minor', 'minor')).toEqual([]);
    expect(checkRoleTierConsistency('minor', undefined)).toEqual([]);
  });
});

// =============================================================================
//  checkCharacterPowersAlignment
// =============================================================================

describe('checkCharacterPowersAlignment', () => {
  const protagCurve: CharacterCurveEntry[] = [
    { chapter: 1, stage: '炼气一层', context: '' },
    { chapter: 30, stage: '炼气七层', context: '' },
    { chapter: 100, stage: '筑基中期', context: '' },
  ];

  function withCurve(curve: CharacterCurveEntry[]): TCharacterData {
    return {
      one_line_portrait: 'p',
      basic_profile: { age: 'a', origin: 'o', appearance: [], clothing_style: '' },
      personality_core: {
        core_drive: 'd',
        decision_pattern: 'p',
        emotional_anchors: ['e'],
      },
      ability_curve: curve,
      signature_details: [],
      relationships: [],
      arc_design: [],
      prohibited: [],
    };
  }

  it('character curve subset that matches canonical → no issues', () => {
    const sub: CharacterCurveEntry[] = [
      { chapter: 1, stage: '炼气一层', context: '被欺凌' },
      { chapter: 30, stage: '炼气七层', context: '反杀' },
    ];
    expect(checkCharacterPowersAlignment(withCurve(sub), protagCurve)).toEqual([]);
  });

  it('character curve at intermediate chapter inherits the latest anchor stage', () => {
    // Chapter 50 should match stage at chapter 30 (latest <= 50).
    const between: CharacterCurveEntry[] = [
      { chapter: 50, stage: '炼气七层', context: 'mid-arc' },
    ];
    expect(checkCharacterPowersAlignment(withCurve(between), protagCurve)).toEqual([]);
  });

  it('mismatched stage at known chapter → issue', () => {
    const mismatched: CharacterCurveEntry[] = [
      { chapter: 30, stage: '筑基初期', context: 'wrong' },
    ];
    const issues = checkCharacterPowersAlignment(withCurve(mismatched), protagCurve);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain('30');
  });

  it('character curve before earliest powers anchor → issue', () => {
    const early: CharacterCurveEntry[] = [
      { chapter: 1, stage: '炼气一层', context: '' },
    ];
    const lateProtagCurve: CharacterCurveEntry[] = [
      { chapter: 10, stage: '炼气一层', context: '' },
      { chapter: 100, stage: '筑基', context: '' },
    ];
    const issues = checkCharacterPowersAlignment(withCurve(early), lateProtagCurve);
    expect(issues.length).toBe(1);
  });

  it('empty curves on either side → no issues (genre-not-applicable bypass)', () => {
    expect(checkCharacterPowersAlignment(withCurve([]), protagCurve)).toEqual([]);
    expect(
      checkCharacterPowersAlignment(
        withCurve([{ chapter: 1, stage: '炼气一层', context: '' }]),
        [],
      ),
    ).toEqual([]);
  });
});

/**
 * Tests for core/schemas/world.ts:
 *   - Worldview / Powers / CheatSystem core schemas (happy + failure)
 *   - Cross-asset helpers: checkCheatSystemR2 + checkCheatPowersConsistency
 */
import { describe, expect, it } from 'vitest';
import {
  CheatSystemData,
  CheatSystemFrontmatter,
  PowersData,
  PowersFrontmatter,
  WorldviewData,
  WorldviewFrontmatter,
  checkCheatPowersConsistency,
  checkCheatSystemR2,
  type CheatSystemData as TCheatSystemData,
  type PowersData as TPowersData,
} from '../src/core/schemas/world.js';
import { AssetType } from '../src/core/schemas/common.js';

describe('AssetType — alpha-2a additions', () => {
  it('contains powers and characters-relationships', () => {
    expect(AssetType.options).toContain('powers');
    expect(AssetType.options).toContain('characters-relationships');
  });
});

describe('WorldviewData', () => {
  const ok = {
    era: '末法纪元',
    year_anchor: 500,
    tagline: '末法纪元，灵气枯竭五百年。',
    timeline: [{ epoch: 'current', name: '当代', summary: '500 年' }],
    factions: [
      { id: 'qingyun', name: '青云宗', type: 'sect', stance: 'neutral', key_traits: ['剑修传承'] },
    ],
    regions: [],
    physical_rules: ['灵气稀薄'],
    info_boundaries: { protagonist_unknown: [], protagonist_misknown: [] },
  };

  it('parses a complete worldview', () => {
    expect(WorldviewData.safeParse(ok).success).toBe(true);
  });

  it('rejects missing era', () => {
    expect(WorldviewData.safeParse({ ...ok, era: '' }).success).toBe(false);
  });

  it('strict stance enum: rejects unknown stance', () => {
    const bad = {
      ...ok,
      factions: [
        { id: 'x', name: 'X', type: 'sect', stance: 'sometimes-friend', key_traits: [] },
      ],
    };
    expect(WorldviewData.safeParse(bad).success).toBe(false);
  });

  it('lenient faction type: accepts custom string', () => {
    const custom = {
      ...ok,
      factions: [{ id: 'x', name: 'X', type: 'mecha-corporation', stance: 'neutral', key_traits: [] }],
    };
    expect(WorldviewData.safeParse(custom).success).toBe(true);
  });

  it('frontmatter requires status field', () => {
    const fm = WorldviewFrontmatter.safeParse({
      asset_type: 'worldview',
      asset_id: 'worldview-main',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      maintained_by: 'novel-worldforge',
    });
    expect(fm.success).toBe(false); // status missing
  });
});

describe('PowersData', () => {
  it('passes minimal valid (not_applicable=false)', () => {
    expect(
      PowersData.safeParse({
        system_name: '末法修真',
        genre_basis: 'xianxia-classic-simplified',
      }).success,
    ).toBe(true);
  });

  it('passes not_applicable=true (e.g. romance)', () => {
    expect(
      PowersData.safeParse({
        system_name: 'N/A',
        genre_basis: 'romance-not-applicable',
        not_applicable: true,
      }).success,
    ).toBe(true);
  });

  it('rejects unknown genre_basis', () => {
    expect(
      PowersData.safeParse({
        system_name: 'X',
        genre_basis: 'made-up-basis',
      }).success,
    ).toBe(false);
  });

  it('powers frontmatter requires asset_id literal', () => {
    const fm = PowersFrontmatter.safeParse({
      asset_type: 'powers',
      asset_id: 'powers-other', // not the literal 'powers-main'
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      status: 'drafting',
      maintained_by: 'novel-worldforge',
    });
    expect(fm.success).toBe(false);
  });
});

describe('CheatSystemData', () => {
  const minimal: TCheatSystemData = {
    name: '天工残卷',
    type: 'analyzer',
    definition: '解析任何接触过的功法',
    trigger: ['mental-focus'],
    cost: { primary: 'spiritual-power', scaling: '' },
    output_format: '',
    stages: [],
    limits: [],
    beats: [],
    anti_patterns: [],
    not_applicable: false,
  };

  it('passes minimal valid', () => {
    expect(CheatSystemData.safeParse(minimal).success).toBe(true);
  });

  it('rejects empty trigger array', () => {
    expect(CheatSystemData.safeParse({ ...minimal, trigger: [] }).success).toBe(false);
  });

  it('rejects unknown trigger value', () => {
    expect(
      CheatSystemData.safeParse({ ...minimal, trigger: ['typing-speed'] as unknown as string[] }).success,
    ).toBe(false);
  });

  it('cheat-system frontmatter requires asset_id matching cheat-<slug>', () => {
    const fm = CheatSystemFrontmatter.safeParse({
      asset_type: 'cheat-system',
      asset_id: 'random-id', // doesn't start with cheat-
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      status: 'drafting',
      maintained_by: 'novel-worldforge',
    });
    expect(fm.success).toBe(false);

    const fmOk = CheatSystemFrontmatter.safeParse({
      asset_type: 'cheat-system',
      asset_id: 'cheat-tiangong-canjuan',
      created_at: '2026-05-24T00:00:00Z',
      updated_at: '2026-05-24T00:00:00Z',
      version: 1,
      status: 'drafting',
      maintained_by: 'novel-worldforge',
    });
    expect(fmOk.success).toBe(true);
  });
});

describe('checkCheatSystemR2', () => {
  function withLimits(limits: TCheatSystemData['limits']): TCheatSystemData {
    return {
      name: 'X',
      type: 'analyzer',
      definition: 'd',
      trigger: ['mental-focus'],
      cost: { primary: 'spiritual-power', scaling: '' },
      output_format: '',
      stages: [],
      limits,
      beats: [],
      anti_patterns: [],
      not_applicable: false,
    };
  }

  it('empty limits → R2 violated', () => {
    const issues = checkCheatSystemR2(withLimits([]));
    expect(issues.length).toBeGreaterThan(0);
  });

  it('only target/public limits → R2 violated (Mary-Sue check)', () => {
    const issues = checkCheatSystemR2(
      withLimits([
        { category: 'target', rule: '不能解析自己' },
        { category: 'public', rule: '被高阶看到能识破' },
      ]),
    );
    expect(issues.length).toBeGreaterThan(0);
  });

  it('with at least one resource limit → R2 satisfied', () => {
    const issues = checkCheatSystemR2(
      withLimits([{ category: 'resource', rule: '消耗精神力' }]),
    );
    expect(issues.length).toBe(0);
  });

  it('with at least one cooldown limit → R2 satisfied', () => {
    const issues = checkCheatSystemR2(
      withLimits([{ category: 'cooldown', rule: '24h cooldown', duration_hours: 24 }]),
    );
    expect(issues.length).toBe(0);
  });

  it('not_applicable=true skips R2', () => {
    const data: TCheatSystemData = { ...withLimits([]), not_applicable: true };
    expect(checkCheatSystemR2(data).length).toBe(0);
  });
});

describe('checkCheatPowersConsistency', () => {
  it('passes when stage chapter_range is within protagonist_curve range', () => {
    const cs: TCheatSystemData = {
      name: 'X',
      type: 'analyzer',
      definition: 'd',
      trigger: ['mental-focus'],
      cost: { primary: 'spiritual-power', scaling: '' },
      output_format: '',
      stages: [
        { tier: 1, chapter_range: [1, 30], cap: 'low', unlock_condition: 'natural', cost_multiplier: 1, modes: [] },
      ],
      limits: [],
      beats: [],
      anti_patterns: [],
      not_applicable: false,
    };
    const powers: TPowersData = {
      system_name: 'X',
      genre_basis: 'xianxia-classic',
      stages: [],
      protagonist_curve: [
        { chapter: 1, stage: 'a', context: '' },
        { chapter: 100, stage: 'b', context: '' },
      ],
      info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
      not_applicable: false,
    };
    expect(checkCheatPowersConsistency(cs, powers).length).toBe(0);
  });

  it('flags when stage chapter_range starts past max curve chapter', () => {
    const cs: TCheatSystemData = {
      name: 'X',
      type: 'analyzer',
      definition: 'd',
      trigger: ['mental-focus'],
      cost: { primary: 'spiritual-power', scaling: '' },
      output_format: '',
      stages: [
        { tier: 4, chapter_range: [500, null], cap: 'high', unlock_condition: 'natural', cost_multiplier: 0, modes: [] },
      ],
      limits: [],
      beats: [],
      anti_patterns: [],
      not_applicable: false,
    };
    const powers: TPowersData = {
      system_name: 'X',
      genre_basis: 'xianxia-classic',
      stages: [],
      protagonist_curve: [
        { chapter: 1, stage: 'a', context: '' },
        { chapter: 100, stage: 'b', context: '' },
      ],
      info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
      not_applicable: false,
    };
    const issues = checkCheatPowersConsistency(cs, powers);
    expect(issues.length).toBe(1);
    expect(issues[0]).toContain('500');
  });

  it('skips when either side is not_applicable', () => {
    const empty: TCheatSystemData = {
      name: 'X',
      type: 'analyzer',
      definition: 'd',
      trigger: ['mental-focus'],
      cost: { primary: 'none', scaling: '' },
      output_format: '',
      stages: [],
      limits: [],
      beats: [],
      anti_patterns: [],
      not_applicable: true,
    };
    const powers: TPowersData = {
      system_name: 'X',
      genre_basis: 'romance-not-applicable',
      stages: [],
      protagonist_curve: [],
      info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
      not_applicable: true,
    };
    expect(checkCheatPowersConsistency(empty, powers).length).toBe(0);
  });
});

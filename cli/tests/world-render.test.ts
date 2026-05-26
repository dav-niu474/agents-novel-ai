/**
 * Tests for core/assets/world-render.ts:
 *   - Empty data renders without crashing and shows placeholder markers
 *   - not_applicable=true variants short-circuit
 *   - cheat-system with no limits emits R2 warning text
 *   - Full data (mirroring examples/tunshi-mo-di) renders with expected sections
 */
import { describe, expect, it } from 'vitest';
import {
  renderCheatSystemBody,
  renderPowersBody,
  renderWorldviewBody,
} from '../src/core/assets/world-render.js';
import type {
  CheatSystemData,
  PowersData,
  WorldviewData,
} from '../src/core/schemas/world.js';

describe('renderWorldviewBody', () => {
  const empty: WorldviewData = {
    era: '末法纪元',
    year_anchor: 0,
    tagline: '占位',
    timeline: [],
    factions: [],
    regions: [],
    physical_rules: [],
    info_boundaries: { protagonist_unknown: [], protagonist_misknown: [] },
  };

  it('renders empty data with placeholder markers', () => {
    const md = renderWorldviewBody(empty, '末法纪元');
    expect(md).toContain('# 世界观：末法纪元');
    expect(md).toMatch(/（待填）/);
    expect(md).toContain('详见 [`powers.md`]');
  });

  it('renders factions grouped by stance', () => {
    const data: WorldviewData = {
      ...empty,
      factions: [
        { id: 'a', name: 'Ally Sect', type: 'sect', stance: 'ally', key_traits: ['x'] },
        { id: 'b', name: 'Bad Sect', type: 'sect', stance: 'antagonist', key_traits: [] },
        { id: 'c', name: 'Neutral Sect', type: 'sect', stance: 'neutral', key_traits: [] },
      ],
    };
    const md = renderWorldviewBody(data, 'X');
    expect(md).toContain('### 主角阵营');
    expect(md).toContain('Ally Sect');
    expect(md).toContain('### 敌对阵营');
    expect(md).toContain('Bad Sect');
    expect(md).toContain('### 中立');
    expect(md).toContain('Neutral Sect');
  });

  it('renders timeline + physical_rules + info_boundaries when present', () => {
    const data: WorldviewData = {
      ...empty,
      timeline: [{ epoch: 'current', name: '当代', summary: '500 年' }],
      physical_rules: ['rule 1', 'rule 2'],
      info_boundaries: {
        protagonist_unknown: ['secret 1'],
        protagonist_misknown: ['mistake 1'],
      },
    };
    const md = renderWorldviewBody(data, 'X');
    expect(md).toContain('当代');
    expect(md).toContain('rule 1');
    expect(md).toContain('secret 1');
    expect(md).toContain('mistake 1');
  });
});

describe('renderPowersBody', () => {
  it('not_applicable=true short-circuits with explanation', () => {
    const data: PowersData = {
      system_name: 'N/A',
      genre_basis: 'romance-not-applicable',
      stages: [],
      protagonist_curve: [],
      info_boundaries: { hidden_stages: [], protagonist_unknown_until_chapter: [] },
      not_applicable: true,
    };
    const md = renderPowersBody(data, 'N/A');
    expect(md).toContain('本书无正式力量等级体系');
    expect(md).not.toContain('## 1. 体系骨架');
  });

  it('full data renders all sections', () => {
    const data: PowersData = {
      system_name: '末法修真',
      genre_basis: 'xianxia-classic-simplified',
      stages: [
        {
          id: 'lianqi',
          name: '炼气',
          order: 1,
          sub_levels: ['一层', '九层'],
          core_features: ['灵气吸纳'],
          breakthrough_requires: ['顿悟'],
          avg_breakthrough_years: 4,
          lifespan_bonus_years: 30,
          population_pct_among_cultivators: 80,
        },
      ],
      protagonist_curve: [{ chapter: 1, stage: '炼气一层', context: '被欺凌' }],
      info_boundaries: {
        hidden_stages: ['化神之上'],
        protagonist_unknown_until_chapter: [{ fact: '化神不是终点', until_chapter: 800 }],
      },
      not_applicable: false,
    };
    const md = renderPowersBody(data, '末法修真');
    expect(md).toContain('# 力量等级体系：末法修真');
    expect(md).toContain('xianxia-classic-simplified');
    expect(md).toContain('1. 炼气');
    expect(md).toContain('一层 / 九层');
    expect(md).toContain('| 1 | 炼气一层 | 被欺凌 |');
    expect(md).toContain('化神之上');
    expect(md).toContain('800');
  });
});

describe('renderCheatSystemBody', () => {
  const minimal: CheatSystemData = {
    name: '天工残卷',
    type: 'analyzer',
    definition: '解析任何接触过的功法',
    trigger: ['mental-focus'],
    cost: { primary: 'spiritual-power', scaling: 'complexity-tiered' },
    output_format: '三层文字',
    stages: [],
    limits: [],
    beats: [],
    anti_patterns: [],
    not_applicable: false,
  };

  it('not_applicable=true short-circuits', () => {
    const md = renderCheatSystemBody({ ...minimal, not_applicable: true }, 'X');
    expect(md).toContain('本书无金手指');
    expect(md).not.toContain('## 1. 定义');
  });

  it('renders R2 warning when limits is empty', () => {
    const md = renderCheatSystemBody(minimal, '天工残卷');
    expect(md).toContain('违反 R2');
  });

  it('renders limits when provided', () => {
    const data: CheatSystemData = {
      ...minimal,
      limits: [
        { category: 'resource', rule: '消耗精神力' },
        { category: 'cooldown', rule: '24h cooldown', duration_hours: 24 },
      ],
    };
    const md = renderCheatSystemBody(data, '天工残卷');
    expect(md).toContain('[resource]');
    expect(md).toContain('消耗精神力');
    expect(md).toContain('[cooldown]');
    expect(md).toContain('冷却 24h');
    expect(md).not.toContain('违反 R2');
  });

  it('renders stages table with chapter range and alt_cost', () => {
    const data: CheatSystemData = {
      ...minimal,
      stages: [
        {
          tier: 1,
          chapter_range: [1, 30],
          cap: 'low',
          unlock_condition: 'natural',
          cost_multiplier: 1,
          modes: [],
        },
        {
          tier: 4,
          chapter_range: [300, null],
          cap: 'high',
          unlock_condition: 'final',
          cost_multiplier: 0,
          modes: ['rewrite'],
          alt_cost: 'memory',
        },
      ],
    };
    const md = renderCheatSystemBody(data, 'X');
    expect(md).toContain('1 | 1–30');
    expect(md).toContain('300–end');
    expect(md).toContain('alt: memory');
    expect(md).toContain('rewrite');
  });

  it('renders trigger codes with backticks', () => {
    const data: CheatSystemData = {
      ...minimal,
      trigger: ['physical-contact', 'mental-focus'],
    };
    const md = renderCheatSystemBody(data, 'X');
    expect(md).toContain('`physical-contact`');
    expect(md).toContain('`mental-focus`');
  });
});

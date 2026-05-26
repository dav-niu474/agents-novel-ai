/**
 * Render structured world-data into Markdown body for human reading.
 *
 * The JSON sidecar is the canonical source; the .md file is just a projection.
 * The render output is intentionally lossy (drops information density for
 * readability) — never parse the .md to recover data.
 *
 * Pinned to the shape of templates/{worldview,powers,cheat-system}.md.
 */
import type {
  CheatSystemData,
  PowersData,
  WorldviewData,
} from '../schemas/world.js';

// =============================================================================
//  Worldview
// =============================================================================

export function renderWorldviewBody(data: WorldviewData, title: string): string {
  const out: string[] = [];
  out.push(`# 世界观：${title}`);
  out.push('');

  out.push('## 1. 大背景');
  out.push('');
  out.push(data.tagline);
  out.push('');
  out.push(`**纪元**：${data.era} · **锚点年份**：${data.year_anchor}`);
  out.push('');

  out.push('## 2. 时间线');
  out.push('');
  if (data.timeline.length === 0) {
    out.push('（待填）');
  } else {
    for (const t of data.timeline) {
      out.push(`- **${t.name}**（${t.epoch}）：${t.summary}`);
    }
  }
  out.push('');

  out.push('## 3. 势力');
  out.push('');
  const grouped: Record<string, typeof data.factions> = {
    ally: [],
    antagonist: [],
    neutral: [],
    fringe: [],
  };
  for (const f of data.factions) {
    (grouped[f.stance] ?? []).push(f);
  }
  const stanceLabel: Record<string, string> = {
    ally: '主角阵营',
    antagonist: '敌对阵营',
    neutral: '中立',
    fringe: '边缘 / 化外',
  };
  for (const stance of ['ally', 'antagonist', 'neutral', 'fringe']) {
    const list = grouped[stance] ?? [];
    if (list.length === 0) continue;
    out.push(`### ${stanceLabel[stance]}`);
    out.push('');
    for (const f of list) {
      out.push(`- **${f.name}**（id: \`${f.id}\` · type: ${f.type}）`);
      if (f.key_traits.length > 0) {
        out.push(`  - 特色：${f.key_traits.join(' / ')}`);
      }
    }
    out.push('');
  }
  if (data.factions.length === 0) {
    out.push('（待填）');
    out.push('');
  }

  out.push('## 4. 地理');
  out.push('');
  if (data.regions.length === 0) {
    out.push('（待填）');
  } else {
    for (const r of data.regions) {
      out.push(`- **${r.name}**（id: \`${r.id}\`）— 控制方：${r.controlled_by}`);
    }
  }
  out.push('');

  out.push('## 5. 物理规则');
  out.push('');
  if (data.physical_rules.length === 0) {
    out.push('（待填）');
  } else {
    for (const rule of data.physical_rules) {
      out.push(`- ${rule}`);
    }
  }
  out.push('');

  out.push('## 6. 力量等级');
  out.push('');
  out.push('详见 [`powers.md`](./powers.md)。');
  out.push('');

  out.push('## 7. 信息边界');
  out.push('');
  out.push('### 主角不知道');
  out.push('');
  if (data.info_boundaries.protagonist_unknown.length === 0) {
    out.push('（待填）');
  } else {
    for (const item of data.info_boundaries.protagonist_unknown) {
      out.push(`- ${item}`);
    }
  }
  out.push('');
  out.push('### 主角误解');
  out.push('');
  if (data.info_boundaries.protagonist_misknown.length === 0) {
    out.push('（待填）');
  } else {
    for (const item of data.info_boundaries.protagonist_misknown) {
      out.push(`- ${item}`);
    }
  }
  out.push('');

  return out.join('\n').trimEnd();
}

// =============================================================================
//  Powers
// =============================================================================

export function renderPowersBody(data: PowersData, title: string): string {
  const out: string[] = [];
  out.push(`# 力量等级体系：${title}`);
  out.push('');

  if (data.not_applicable) {
    out.push('> **本书无正式力量等级体系**（题材不适用）。');
    out.push('');
    out.push(`体系名称（占位）：${data.system_name}`);
    out.push('');
    return out.join('\n').trimEnd();
  }

  out.push(`**体系基底**：\`${data.genre_basis}\``);
  out.push('');

  out.push('## 1. 体系骨架');
  out.push('');
  if (data.stages.length === 0) {
    out.push('（待填）');
    out.push('');
  } else {
    for (const s of data.stages) {
      out.push(`### ${s.order}. ${s.name}（id: \`${s.id}\`）`);
      out.push('');
      if (s.sub_levels.length > 0) {
        out.push(`- **阶段细分**：${s.sub_levels.join(' / ')}`);
      }
      if (s.core_features.length > 0) {
        out.push(`- **核心特征**：${s.core_features.join(' / ')}`);
      }
      if (s.breakthrough_requires.length > 0) {
        out.push(`- **突破依据**：${s.breakthrough_requires.join(' / ')}`);
      }
      if (s.avg_breakthrough_years !== undefined) {
        out.push(`- **平均年限**：${s.avg_breakthrough_years} 年`);
      }
      if (s.lifespan_bonus_years !== undefined) {
        out.push(`- **寿命增益**：+${s.lifespan_bonus_years} 年`);
      }
      if (s.population_pct_among_cultivators !== undefined) {
        out.push(`- **人口占比**：${s.population_pct_among_cultivators}%`);
      }
      out.push('');
    }
  }

  out.push('## 2. 主角境界曲线');
  out.push('');
  if (data.protagonist_curve.length === 0) {
    out.push('（待填）');
  } else {
    out.push('| 章节 | 境界 | 触发上下文 |');
    out.push('|------|------|----------|');
    for (const p of data.protagonist_curve) {
      out.push(`| ${p.chapter} | ${p.stage} | ${p.context || '—'} |`);
    }
  }
  out.push('');

  out.push('## 3. 信息边界');
  out.push('');
  out.push('### 隐藏境界');
  out.push('');
  if (data.info_boundaries.hidden_stages.length === 0) {
    out.push('（无）');
  } else {
    for (const item of data.info_boundaries.hidden_stages) {
      out.push(`- ${item}`);
    }
  }
  out.push('');
  out.push('### 主角分阶段揭示');
  out.push('');
  if (data.info_boundaries.protagonist_unknown_until_chapter.length === 0) {
    out.push('（无）');
  } else {
    for (const item of data.info_boundaries.protagonist_unknown_until_chapter) {
      out.push(`- 第 ${item.until_chapter} 章前主角不知道：${item.fact}`);
    }
  }
  out.push('');

  return out.join('\n').trimEnd();
}

// =============================================================================
//  Cheat-system
// =============================================================================

export function renderCheatSystemBody(data: CheatSystemData, title: string): string {
  const out: string[] = [];
  out.push(`# 金手指：${title}`);
  out.push('');

  if (data.not_applicable) {
    out.push('> **本书无金手指**（题材不适用）。');
    out.push('');
    return out.join('\n').trimEnd();
  }

  out.push(`> **流派**：\`${data.type}\``);
  out.push('');

  out.push('## 1. 定义');
  out.push('');
  out.push(data.definition);
  out.push('');

  out.push('## 2. 触发条件');
  out.push('');
  for (const t of data.trigger) {
    out.push(`- \`${t}\``);
  }
  out.push('');

  out.push('## 3. 输出形式');
  out.push('');
  out.push(data.output_format || '（待填）');
  out.push('');

  out.push('## 4. 代价');
  out.push('');
  out.push(`- **主代价**：\`${data.cost.primary}\``);
  if (data.cost.scaling) out.push(`- **代价规模**：${data.cost.scaling}`);
  out.push('');

  out.push('## 5. 升级阶梯');
  out.push('');
  if (data.stages.length === 0) {
    out.push('（待填）');
  } else {
    out.push('| Tier | 章节区间 | Cap | 解锁条件 | 消耗倍数 | 模式 |');
    out.push('|------|---------|-----|---------|---------|------|');
    for (const s of data.stages) {
      const [start, end] = s.chapter_range;
      const range = end === null ? `${start}–end` : `${start}–${end}`;
      const cost = s.cost_multiplier === 0 && s.alt_cost ? `0 (alt: ${s.alt_cost})` : `x${s.cost_multiplier}`;
      const modes = s.modes.length > 0 ? s.modes.join(', ') : '—';
      out.push(`| ${s.tier} | ${range} | ${s.cap} | ${s.unlock_condition} | ${cost} | ${modes} |`);
    }
  }
  out.push('');

  out.push('## 6. 限制');
  out.push('');
  if (data.limits.length === 0) {
    out.push('⚠️ **没有任何限制 — 违反 R2 强约束！**');
  } else {
    for (const l of data.limits) {
      const extras: string[] = [];
      if (l.duration_hours !== undefined) extras.push(`冷却 ${l.duration_hours}h`);
      if (l.severity !== undefined) extras.push(`严重程度: ${l.severity}`);
      if (l.tier1_daily_cap !== undefined) extras.push(`Tier1 每日上限 ${l.tier1_daily_cap}`);
      const tail = extras.length > 0 ? `（${extras.join(' · ')}）` : '';
      out.push(`- **[${l.category}]** ${l.rule}${tail}`);
    }
  }
  out.push('');

  out.push('## 7. 关键节拍');
  out.push('');
  if (data.beats.length === 0) {
    out.push('（待填）');
  } else {
    out.push('| 章节 | 类型 | 事件 |');
    out.push('|------|------|------|');
    for (const b of data.beats) {
      out.push(`| ${b.chapter} | ${b.type} | ${b.event} |`);
    }
  }
  out.push('');

  out.push('## 8. 反例（chapter-writer 禁止写法）');
  out.push('');
  if (data.anti_patterns.length === 0) {
    out.push('（待填）');
  } else {
    for (const ap of data.anti_patterns) {
      out.push(`- ❌ ${ap}`);
    }
  }
  out.push('');

  return out.join('\n').trimEnd();
}

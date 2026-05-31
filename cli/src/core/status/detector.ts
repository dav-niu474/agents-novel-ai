/**
 * Project status detector.
 *
 * Scans a project root and returns a structured report aligned with
 * skills/novel-studio/SKILL.md §3 工作流 B (状态导航).
 *
 * The detector is **file-truth-first** (R2 in the studio SKILL): it derives the
 * stage by checking actual files, not by trusting `novel.json.blueprint_status`.
 */
import { existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { readBlueprint } from '../assets/blueprint.js';
import {
  charactersStatus,
  relationshipsExists,
  type CharactersStatus,
} from '../assets/character.js';
import { readNovel } from '../assets/novel.js';
import { projectPaths } from '../assets/paths.js';
import {
  cheatSystemExists,
  powersExists,
  worldviewExists,
} from '../assets/world.js';
import type { Novel } from '../schemas/novel.js';

export type Stage =
  | 'no-project'
  | 'inspiration'
  | 'blueprint-drafting'
  | 'blueprint-approved'
  // Worldforge substages — alpha-2a granularity
  | 'world-worldview'
  | 'world-powers'
  | 'world-cheat-system'
  | 'world-approve'
  // Character-atelier substages — alpha-2b granularity
  | 'character-protagonist'
  | 'character-antagonists'
  | 'character-relationships'
  | 'character-approve'
  // Downstream stages (alpha-2c+)
  | 'outline-master'
  | 'outline-volume'
  | 'outline-chapters'
  | 'writing'
  | 'completed';

export interface StatusReport {
  stage: Stage;
  /** Top-level dashboard string (one line). */
  headline: string;
  /** Detailed bullet list. */
  details: string[];
  /** Concrete next-step suggestions (CLI commands). */
  nextSteps: NextStep[];
  /** Raw novel.json (null if no project). */
  novel: Novel | null;
}

export interface NextStep {
  title: string;
  command?: string;
  /** Skill responsible for this step (purely informational). */
  skill?: string;
}

async function countFilesIn(dir: string, ext = '.md'): Promise<number> {
  if (!existsSync(dir)) return 0;
  const entries = await readdir(dir);
  return entries.filter((e) => e.endsWith(ext)).length;
}

function safeIsFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

const EMPTY_CHARACTERS: CharactersStatus = {
  hasIndex: false,
  hasProtagonist: false,
  antagonistCount: 0,
  supportingCount: 0,
  minorCount: 0,
  hasRelationships: false,
  total: 0,
};

/** Read character status without letting a corrupt index crash the detector. */
async function safeCharactersStatus(root: string): Promise<CharactersStatus> {
  try {
    return await charactersStatus(root);
  } catch {
    // A corrupt/invalid _index.json zeroes the counts, but relationships
    // presence is pure file-existence and shouldn't be masked by the index read.
    return { ...EMPTY_CHARACTERS, hasRelationships: relationshipsExists(root) };
  }
}

type AssetStatusLite = 'missing' | 'drafting' | 'approved' | 'archived';

export async function detectStatus(root: string | null): Promise<StatusReport> {
  if (!root) {
    return {
      stage: 'no-project',
      headline: '当前目录不是 Novel Studio 项目',
      details: ['未在当前目录及上级目录找到 novel.json'],
      nextSteps: [
        {
          title: '在当前目录初始化新项目',
          command: 'novel init "<书名>"',
          skill: 'novel-studio',
        },
      ],
      novel: null,
    };
  }

  const p = projectPaths(root);
  const novel = await readNovel(root);

  // Asset existence checks (file-first, novel.json fields ignored on purpose).
  const hasBlueprint = safeIsFile(p.blueprintMd);
  const hasWorldview = worldviewExists(root);
  const hasPowers = powersExists(root);
  const hasCheatSystem = cheatSystemExists(root);
  const chars = await safeCharactersStatus(root);
  const hasOutlineMaster = safeIsFile(p.outline.master);
  const volumeCount = await countFilesIn(p.outline.volumes);
  const chapterOutlineCount = await countFilesIn(p.outline.chapters);
  const chapterCount = await countFilesIn(p.chapters.dir);

  // Blueprint status (gate for moving past inspiration stage).
  let blueprintStatus: AssetStatusLite = 'missing';
  if (hasBlueprint) {
    try {
      const bp = await readBlueprint(root);
      const s = bp.frontmatter.status;
      blueprintStatus = s === 'approved' ? 'approved' : s === 'archived' ? 'archived' : 'drafting';
    } catch {
      blueprintStatus = 'drafting';
    }
  }

  // Stage decision tree (mirrors studio SKILL §3.B table). Like alpha-2a, the
  // *-approve substages are kept in the type for symmetry but the detector
  // advances on file presence; `novel character list` nudges toward approve.
  let stage: Stage;
  if (!hasBlueprint || blueprintStatus !== 'approved') {
    stage = blueprintStatus === 'drafting' ? 'blueprint-drafting' : 'inspiration';
  } else if (!hasWorldview) {
    stage = 'world-worldview';
  } else if (!hasPowers) {
    stage = 'world-powers';
  } else if (!hasCheatSystem) {
    stage = 'world-cheat-system';
  } else if (!chars.hasProtagonist) {
    stage = 'character-protagonist';
  } else if (!chars.hasRelationships && chars.antagonistCount === 0) {
    // Suggest building antagonists first — but once a relationships graph exists
    // we advance regardless of antagonist count (antagonist-less genres, e.g. 言情).
    stage = 'character-antagonists';
  } else if (!chars.hasRelationships) {
    stage = 'character-relationships';
  } else if (!hasOutlineMaster) {
    stage = 'outline-master';
  } else if (volumeCount === 0) {
    stage = 'outline-volume';
  } else if (chapterOutlineCount < 5) {
    stage = 'outline-chapters';
  } else if (chapterCount === 0 || chapterCount < (novel.target_chapters ?? Infinity)) {
    stage = 'writing';
  } else {
    stage = 'completed';
  }

  const headline = buildHeadline(novel, stage, chapterCount);
  const details = buildDetails(novel, {
    hasBlueprint,
    blueprintStatus,
    hasWorldview,
    hasPowers,
    hasCheatSystem,
    chars,
    hasOutlineMaster,
    volumeCount,
    chapterOutlineCount,
    chapterCount,
  });
  const nextSteps = buildNextSteps(stage);

  return { stage, headline, details, nextSteps, novel };
}

interface Counts {
  hasBlueprint: boolean;
  blueprintStatus: AssetStatusLite;
  hasWorldview: boolean;
  hasPowers: boolean;
  hasCheatSystem: boolean;
  chars: CharactersStatus;
  hasOutlineMaster: boolean;
  volumeCount: number;
  chapterOutlineCount: number;
  chapterCount: number;
}

const STAGE_LABEL: Record<Stage, string> = {
  'no-project': '无项目',
  inspiration: '灵感期',
  'blueprint-drafting': '开书蓝图（撰写中）',
  'blueprint-approved': '开书蓝图（已定稿）',
  'world-worldview': '建世界（worldview）',
  'world-powers': '建世界（powers 力量等级）',
  'world-cheat-system': '建世界（cheat-system 金手指）',
  'world-approve': '建世界（待 approve）',
  'character-protagonist': '角色（主角）',
  'character-antagonists': '角色（反派）',
  'character-relationships': '角色（关系网）',
  'character-approve': '角色（待 approve）',
  'outline-master': '总纲',
  'outline-volume': '卷纲',
  'outline-chapters': '章纲',
  writing: '写作期',
  completed: '完结',
};

function buildHeadline(novel: Novel, stage: Stage, chapterCount: number): string {
  const target = novel.target_chapters ?? '?';
  return `《${novel.title}》· 阶段：${STAGE_LABEL[stage]}（已写 ${chapterCount} / 目标 ${target} 章）`;
}

function buildDetails(novel: Novel, c: Counts): string[] {
  const out: string[] = [];
  out.push(`项目 ID：${novel.id}`);
  out.push(`题材：${novel.genre.join(', ')}`);
  out.push(`平台：${novel.platform_target.join(', ')}`);
  out.push('');
  out.push(`蓝图：${c.hasBlueprint ? c.blueprintStatus : '未创建'}`);
  out.push(
    `世界观：${c.hasWorldview ? '✓' : '✗'}  ` +
      `力量等级：${c.hasPowers ? '✓' : '✗'}  ` +
      `金手指：${c.hasCheatSystem ? '✓' : '✗'}`,
  );
  out.push(
    `角色：主角 ${c.chars.hasProtagonist ? '✓' : '✗'}  ` +
      `反派 ${c.chars.antagonistCount}  配角 ${c.chars.supportingCount}  ` +
      `关系网 ${c.chars.hasRelationships ? '✓' : '✗'}`,
  );
  out.push(`总纲：${c.hasOutlineMaster ? '✓' : '✗'}`);
  out.push(`卷纲数：${c.volumeCount}  章纲数：${c.chapterOutlineCount}`);
  out.push(`已写章节数：${c.chapterCount}`);
  return out;
}

function buildNextSteps(stage: Stage): NextStep[] {
  switch (stage) {
    case 'inspiration':
      return [
        {
          title: '启动开书蓝图（10 步定盘）',
          command: 'novel blueprint start',
          skill: 'novel-blueprint',
        },
      ];
    case 'blueprint-drafting':
      return [
        {
          title: '继续完成蓝图剩余部分',
          command: 'novel blueprint start --resume',
          skill: 'novel-blueprint',
        },
        {
          title: '直接查看当前蓝图',
          command: 'novel blueprint show',
        },
      ];
    case 'blueprint-approved':
    case 'world-worldview':
      return [
        {
          title: '建世界观（worldview）',
          command: 'novel world build',
          skill: 'novel-worldforge',
        },
      ];
    case 'world-powers':
      return [
        {
          title: '继续建力量等级（powers）',
          command: 'novel world build --resume',
          skill: 'novel-worldforge',
        },
      ];
    case 'world-cheat-system':
      return [
        {
          title: '继续建金手指（cheat-system）',
          command: 'novel world build --resume',
          skill: 'novel-worldforge',
        },
      ];
    case 'world-approve':
      return [
        {
          title: '把世界三件套标记为 approved',
          command: 'novel world approve',
          skill: 'novel-worldforge',
        },
      ];
    case 'character-protagonist':
      return [
        {
          title: '捏主角 + 反派 + 配角 + 关系网',
          command: 'novel character build',
          skill: 'novel-character-atelier',
        },
      ];
    case 'character-antagonists':
      return [
        {
          title: '继续添加反派（前 30 章会出现的）',
          command: 'novel character build --resume',
          skill: 'novel-character-atelier',
        },
        { title: '或单独加一个反派', command: 'novel character add antagonist' },
      ];
    case 'character-relationships':
      return [
        {
          title: '构建角色关系网',
          command: 'novel character build --resume',
          skill: 'novel-character-atelier',
        },
      ];
    case 'character-approve':
      return [
        {
          title: '校验并定稿角色卡',
          command: 'novel character approve',
          skill: 'novel-character-atelier',
        },
      ];
    case 'outline-master':
    case 'outline-volume':
    case 'outline-chapters':
      return [{ title: '写大纲 / 章纲（alpha-2c 实现）', skill: 'novel-outline-architect' }];
    case 'writing':
      return [{ title: '写下一章（alpha-2d 实现）', skill: 'novel-chapter-writer' }];
    case 'completed':
      return [{ title: '导出全书（alpha-3 实现）', command: 'novel export --format md' }];
    case 'no-project':
      return [{ title: '初始化新项目', command: 'novel init "<书名>"' }];
  }
}

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
import { charactersStatus, type CharactersStatus } from '../assets/character.js';
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
  // Characters substages — alpha-2b granularity
  | 'characters-empty'
  | 'characters-protagonist'
  | 'characters-grow'
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
  const charsStatus = await charactersStatus(root);
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

  // World asset presence (status field comes from MD frontmatter; we don't read
  // it here because alpha-2a treats JSON presence as the gate for stage advance).
  // alpha-2a's `novel world approve` flips status to 'approved'; future alpha
  // iterations may upgrade this detector to also gate on status.

  // Stage decision tree (mirrors studio SKILL §3.B table).
  let stage: Stage;
  if (!hasBlueprint || blueprintStatus !== 'approved') {
    stage = blueprintStatus === 'drafting' ? 'blueprint-drafting' : 'inspiration';
  } else if (!hasWorldview) {
    stage = 'world-worldview';
  } else if (!hasPowers) {
    stage = 'world-powers';
  } else if (!hasCheatSystem) {
    stage = 'world-cheat-system';
  } else if (!charsStatus.hasIndex) {
    // World 三件套齐了，但角色索引还没创建。
    stage = 'characters-empty';
  } else if (!charsStatus.ready) {
    // Index 存在但缺主角卡（或主角条目指向的文件不存在）。
    stage = 'characters-protagonist';
  } else if (charsStatus.totalCount < 5) {
    // 主角已就绪但还差关键反派 / 配角（SKILL R6：先少后多，5-7 个起步）。
    stage = 'characters-grow';
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
    chars: charsStatus,
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
  'characters-empty': '角色人设（待创建索引）',
  'characters-protagonist': '角色人设（待捏主角）',
  'characters-grow': '角色人设（补反派 / 配角）',
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
  out.push(`角色索引：${c.chars.hasIndex ? '✓' : '✗'}  主角卡：${c.chars.hasProtagonist ? '✓' : '✗'}  共 ${c.chars.totalCount} 个角色（主 ${c.chars.protagonistCount} / 反 ${c.chars.antagonistCount} / 配 ${c.chars.supportingCount} / 次 ${c.chars.minorCount}）`);
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
    case 'characters-empty':
      return [
        {
          title: '捏主角（创建第一张角色卡 + 索引）',
          command: 'novel character add --role protagonist',
          skill: 'novel-character-atelier',
        },
      ];
    case 'characters-protagonist':
      return [
        {
          title: '主角索引存在但卡片缺失，重新创建主角卡',
          command: 'novel character add --role protagonist',
          skill: 'novel-character-atelier',
        },
      ];
    case 'characters-grow':
      return [
        {
          title: '加早期反派（前 30 章会出现）',
          command: 'novel character add --role antagonist --tier early',
          skill: 'novel-character-atelier',
        },
        {
          title: '加核心配角',
          command: 'novel character add --role supporting --tier core',
          skill: 'novel-character-atelier',
        },
        {
          title: '把已有角色全部 approve（性格内核锁定）',
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

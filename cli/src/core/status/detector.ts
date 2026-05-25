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
import { join } from 'node:path';
import { readBlueprint } from '../assets/blueprint.js';
import { readNovel } from '../assets/novel.js';
import { projectPaths } from '../assets/paths.js';
import type { Novel } from '../schemas/novel.js';

export type Stage =
  | 'no-project'
  | 'inspiration'
  | 'blueprint-drafting'
  | 'blueprint-approved'
  | 'world-building'
  | 'characters'
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
  const hasWorldview = safeIsFile(p.world.worldview);
  const hasCheatSystem = safeIsFile(p.world.cheatSystem);
  const hasCharIndex = safeIsFile(p.characters.index);
  const hasOutlineMaster = safeIsFile(p.outline.master);
  const volumeCount = await countFilesIn(p.outline.volumes);
  const chapterOutlineCount = await countFilesIn(p.outline.chapters);
  const chapterCount = await countFilesIn(p.chapters.dir);

  let blueprintStatus: 'missing' | 'drafting' | 'approved' | 'archived' = 'missing';
  if (hasBlueprint) {
    try {
      const bp = await readBlueprint(root);
      blueprintStatus =
        bp.frontmatter.status === 'approved'
          ? 'approved'
          : bp.frontmatter.status === 'archived'
            ? 'archived'
            : 'drafting';
    } catch {
      blueprintStatus = 'drafting';
    }
  }

  // Stage decision tree (mirrors studio SKILL §3.B table).
  let stage: Stage;
  if (!hasBlueprint || blueprintStatus !== 'approved') {
    stage = blueprintStatus === 'drafting' ? 'blueprint-drafting' : 'inspiration';
  } else if (!hasWorldview || !hasCheatSystem) {
    stage = 'world-building';
  } else if (!hasCharIndex) {
    stage = 'characters';
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
    hasCheatSystem,
    hasCharIndex,
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
  blueprintStatus: 'missing' | 'drafting' | 'approved' | 'archived';
  hasWorldview: boolean;
  hasCheatSystem: boolean;
  hasCharIndex: boolean;
  hasOutlineMaster: boolean;
  volumeCount: number;
  chapterOutlineCount: number;
  chapterCount: number;
}

function buildHeadline(novel: Novel, stage: Stage, chapterCount: number): string {
  const stageLabel: Record<Stage, string> = {
    'no-project': '无项目',
    inspiration: '灵感期',
    'blueprint-drafting': '开书蓝图（撰写中）',
    'blueprint-approved': '开书蓝图（已定稿）',
    'world-building': '建世界 / 金手指',
    characters: '角色人设',
    'outline-master': '总纲',
    'outline-volume': '卷纲',
    'outline-chapters': '章纲',
    writing: '写作期',
    completed: '完结',
  };
  const target = novel.target_chapters ?? '?';
  return `《${novel.title}》· 阶段：${stageLabel[stage]}（已写 ${chapterCount} / 目标 ${target} 章）`;
}

function buildDetails(novel: Novel, c: Counts): string[] {
  const out: string[] = [];
  out.push(`项目 ID：${novel.id}`);
  out.push(`题材：${novel.genre.join(', ')}`);
  out.push(`平台：${novel.platform_target.join(', ')}`);
  out.push('');
  out.push(`蓝图：${c.hasBlueprint ? c.blueprintStatus : '未创建'}`);
  out.push(`世界观：${c.hasWorldview ? '✓' : '✗'}  金手指：${c.hasCheatSystem ? '✓' : '✗'}`);
  out.push(`角色索引：${c.hasCharIndex ? '✓' : '✗'}`);
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
    case 'world-building':
      return [
        {
          title: '建世界观 + 金手指（alpha-2 实现）',
          skill: 'novel-worldforge',
        },
      ];
    case 'characters':
      return [{ title: '设计角色（alpha-2 实现）', skill: 'novel-character-atelier' }];
    case 'outline-master':
    case 'outline-volume':
    case 'outline-chapters':
      return [{ title: '写大纲 / 章纲（alpha-2 实现）', skill: 'novel-outline-architect' }];
    case 'writing':
      return [{ title: '写下一章（alpha-2 实现）', skill: 'novel-chapter-writer' }];
    case 'completed':
      return [{ title: '导出全书（alpha-3 实现）', command: 'novel export --format md' }];
    case 'no-project':
      return [{ title: '初始化新项目', command: 'novel init "<书名>"' }];
  }
}

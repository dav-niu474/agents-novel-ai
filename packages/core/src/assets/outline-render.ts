/**
 * Skeleton body generators for the 3 outline assets.
 *
 * Unlike world-render.ts (which projects canonical JSON into Markdown), outline
 * bodies are *authored Markdown* — they're stored verbatim. These helpers only
 * produce the minimal placeholder skeletons used by `buildInitial*` and the
 * `skip` mode of the build workflow.
 *
 * Each section body is intentionally a bare `<待填...>` placeholder (no literal
 * prose), so the completeness analyzer in outline.ts reliably classifies a
 * fresh skeleton as "unfilled" and `approve` refuses to bless it.
 *
 * The rich, human-facing reference lives in templates/outline-*.md.
 */
import type { ChapterRange } from '../schemas/outline.js';
import { CHAPTER_OUTLINE_FIELD_KEYS, CHAPTER_OUTLINE_FIELD_TITLES } from '../schemas/outline.js';

const TODO = '<待 outline-architect 填写>';

// =============================================================================
//  总纲
// =============================================================================

export function renderMasterSkeleton(title: string): string {
  return [
    `# ${title}`,
    '',
    '## 主题驱动（一句话）',
    '',
    TODO,
    '',
    '## 主线五幕',
    '',
    TODO,
    '',
    '## 卷列表',
    '',
    TODO,
    '',
    '## 长期伏笔',
    '',
    TODO,
    '',
    '## 关键里程碑章节',
    '',
    TODO,
    '',
  ].join('\n');
}

// =============================================================================
//  卷纲
// =============================================================================

export function renderVolumeSkeleton(volumeNo: number, range: ChapterRange): string {
  return [
    `# 第 ${volumeNo} 卷《<卷名>》卷纲`,
    '',
    `<!-- 章节范围：第 ${range[0]}-${range[1]} 章 -->`,
    '',
    '## 卷主题',
    '',
    TODO,
    '',
    '## 卷高潮',
    '',
    TODO,
    '',
    '## 节奏分段（5 段式）',
    '',
    TODO,
    '',
    '## 必出现的桥段',
    '',
    TODO,
    '',
    '## 卷末钩子（给下一卷的承诺）',
    '',
    TODO,
    '',
    '## 角色出场计划',
    '',
    TODO,
    '',
    '## 与金手指节拍的耦合',
    '',
    TODO,
    '',
  ].join('\n');
}

// =============================================================================
//  章纲（9 字段）
// =============================================================================

export function renderChapterSkeleton(chapterNo: number, title = '<暂定标题>'): string {
  const lines: string[] = [`# 第 ${chapterNo} 章 · ${title}`, ''];
  CHAPTER_OUTLINE_FIELD_KEYS.forEach((key, idx) => {
    lines.push(`## ${idx + 1}. ${CHAPTER_OUTLINE_FIELD_TITLES[key]}`);
    lines.push('');
    lines.push(TODO);
    lines.push('');
  });
  return lines.join('\n');
}

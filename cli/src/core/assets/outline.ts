/**
 * Read / write / parse helpers for the 3-level outline assets.
 *
 * Pattern (mirrors blueprint.ts, NOT world.ts):
 *   - The Markdown body is the canonical source and is stored VERBATIM.
 *   - Only the YAML frontmatter is strictly Zod-validated.
 *   - On write: bump version + stamp updated_at, then atomic-write.
 *   - Completeness is analyzed by parsing H2 sections (by keyword for
 *     master/volume; by leading number 1-9 for the chapter 9-field contract),
 *     but the body is never re-rendered, so authored content is never mangled.
 */
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { AssetStatus } from '../schemas/common.js';
import {
  CHAPTER_OUTLINE_FIELD_KEYS,
  CHAPTER_OUTLINE_FIELD_TITLES,
  MASTER_REQUIRED_SECTIONS,
  OutlineChapterFrontmatter,
  OutlineMasterFrontmatter,
  OutlineVolumeFrontmatter,
  VOLUME_REQUIRED_SECTIONS,
  type ChapterOutlineFieldKey,
  type ChapterRange,
  type OutlineChapterFrontmatter as TOutlineChapterFrontmatter,
  type OutlineMasterFrontmatter as TOutlineMasterFrontmatter,
  type OutlineVolumeFrontmatter as TOutlineVolumeFrontmatter,
} from '../schemas/outline.js';
import { nowISO } from '../utils/time.js';
import { readMarkdownAsset, writeMarkdownAsset } from './io.js';
import { readNovel, patchNovel } from './novel.js';
import { chapterFilename, projectPaths, volumeFilename } from './paths.js';
import {
  renderChapterSkeleton,
  renderMasterSkeleton,
  renderVolumeSkeleton,
} from './outline-render.js';

// =============================================================================
//  In-memory document shapes (frontmatter + verbatim body)
// =============================================================================

export interface OutlineMasterDoc {
  frontmatter: TOutlineMasterFrontmatter;
  body: string;
}
export interface VolumeOutlineDoc {
  frontmatter: TOutlineVolumeFrontmatter;
  body: string;
}
export interface ChapterOutlineDoc {
  frontmatter: TOutlineChapterFrontmatter;
  body: string;
}

// =============================================================================
//  Markdown section parsing
// =============================================================================

interface H2Section {
  /** Full heading text after "## " (e.g. "1. 一句话目标" or "卷主题"). */
  heading: string;
  /** Leading number if heading is "N. ..." (chapter fields use this). */
  numberPrefix: number | null;
  /** Raw content between this heading and the next H2 (trimmed). */
  content: string;
}

const H2_RE = /^##\s+(.+?)\s*$/gm;

function splitH2Sections(body: string): H2Section[] {
  const heads: { heading: string; index: number; lineEnd: number }[] = [];
  const re = new RegExp(H2_RE.source, 'gm');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    heads.push({ heading: (m[1] ?? '').trim(), index: m.index, lineEnd: m.index + m[0].length });
  }
  const out: H2Section[] = [];
  for (let i = 0; i < heads.length; i++) {
    const cur = heads[i];
    if (!cur) continue;
    const next = heads[i + 1];
    const content = body.slice(cur.lineEnd, next ? next.index : body.length).trim();
    const numMatch = cur.heading.match(/^(\d+)\.\s*/);
    out.push({
      heading: cur.heading,
      numberPrefix: numMatch ? Number.parseInt(numMatch[1] ?? '', 10) : null,
      content,
    });
  }
  return out;
}

/** Extract the first H1 title line (without the leading "# "). */
export function parseOutlineTitle(body: string): string {
  return body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';
}

/**
 * Count of "meaningful" characters in a section body, after stripping HTML
 * comments and `<placeholder>` tokens. CJK ideographs + ASCII alphanumerics
 * count as signal; markdown scaffolding / punctuation does not. A fresh
 * skeleton (only `<待填>` tokens) returns 0 → "unfilled".
 */
function meaningfulLen(content: string): number {
  const cleaned = content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>\n]+>/g, '');
  const matched = cleaned.match(/[\u4e00-\u9fffA-Za-z0-9]/g);
  return matched ? matched.length : 0;
}

function sectionByKeyword(sections: H2Section[], keyword: string): H2Section | undefined {
  return sections.find((s) => s.heading.includes(keyword));
}

/** Required master sections still unfilled (heading missing or placeholder-only). */
export function listMissingMasterSections(body: string): string[] {
  const sections = splitH2Sections(body);
  return MASTER_REQUIRED_SECTIONS.filter((kw) => {
    const hit = sectionByKeyword(sections, kw);
    return !hit || meaningfulLen(hit.content) === 0;
  });
}

/** Required volume sections still unfilled. */
export function listMissingVolumeSections(body: string): string[] {
  const sections = splitH2Sections(body);
  return VOLUME_REQUIRED_SECTIONS.filter((kw) => {
    const hit = sectionByKeyword(sections, kw);
    return !hit || meaningfulLen(hit.content) === 0;
  });
}

/**
 * Parse the 9 chapter-outline fields by their leading number (1-9), robust to
 * parenthetical heading variations. Each value is the raw content slice, or
 * `null` when the field is missing / placeholder-only.
 */
export function parseChapterOutlineFields(
  body: string,
): Record<ChapterOutlineFieldKey, string | null> {
  const sections = splitH2Sections(body);
  const byNum = new Map<number, string>();
  for (const s of sections) {
    if (s.numberPrefix !== null && s.numberPrefix >= 1 && s.numberPrefix <= 9 && !byNum.has(s.numberPrefix)) {
      byNum.set(s.numberPrefix, s.content);
    }
  }
  const out: Record<ChapterOutlineFieldKey, string | null> = {
    goal: null,
    characters: null,
    events: null,
    hooks: null,
    coolBeat: null,
    emotionCurve: null,
    wordsRhythm: null,
    doNotWrite: null,
    stateCoupling: null,
  };
  CHAPTER_OUTLINE_FIELD_KEYS.forEach((key, idx) => {
    const content = byNum.get(idx + 1);
    if (content !== undefined && meaningfulLen(content) > 0) {
      out[key] = content;
    }
  });
  return out;
}

/** R1: list the chapter-outline fields (of 9) that are still missing. */
export function listMissingChapterFields(body: string): ChapterOutlineFieldKey[] {
  const fields = parseChapterOutlineFields(body);
  return CHAPTER_OUTLINE_FIELD_KEYS.filter((k) => fields[k] === null);
}

/** R1: whether all 9 chapter-outline fields are present and non-placeholder. */
export function isChapterOutlineComplete(body: string): boolean {
  return listMissingChapterFields(body).length === 0;
}

/** Human label for a chapter field key (re-exported convenience). */
export function chapterFieldLabel(key: ChapterOutlineFieldKey): string {
  return CHAPTER_OUTLINE_FIELD_TITLES[key];
}

// =============================================================================
//  总纲 (master)
// =============================================================================

export function outlineMasterExists(root: string): boolean {
  return existsSync(projectPaths(root).outline.master);
}

export async function readOutlineMaster(root: string): Promise<OutlineMasterDoc> {
  const md = await readMarkdownAsset(projectPaths(root).outline.master, OutlineMasterFrontmatter);
  return { frontmatter: md.frontmatter, body: md.body.trim() };
}

export async function writeOutlineMaster(
  root: string,
  doc: OutlineMasterDoc,
  status: AssetStatus = 'drafting',
): Promise<OutlineMasterDoc> {
  const next: TOutlineMasterFrontmatter = {
    ...doc.frontmatter,
    updated_at: nowISO(),
    version: doc.frontmatter.version + 1,
    status,
  };
  await writeMarkdownAsset(projectPaths(root).outline.master, OutlineMasterFrontmatter, {
    frontmatter: OutlineMasterFrontmatter.parse(next),
    body: doc.body,
  });
  return { frontmatter: next, body: doc.body };
}

export function buildInitialOutlineMaster(novelTitle: string): OutlineMasterDoc {
  const ts = nowISO();
  const frontmatter = OutlineMasterFrontmatter.parse({
    asset_type: 'outline-master',
    asset_id: 'outline-master',
    created_at: ts,
    updated_at: ts,
    version: 1,
    status: 'drafting',
    maintained_by: 'novel-outline-architect',
  });
  return { frontmatter, body: renderMasterSkeleton(`总纲：《${novelTitle}》`) };
}

// =============================================================================
//  卷纲 (volume)
// =============================================================================

export function volumeOutlinePath(root: string, volumeNo: number): string {
  return join(projectPaths(root).outline.volumes, volumeFilename(volumeNo));
}

export function volumeOutlineExists(root: string, volumeNo: number): boolean {
  return existsSync(volumeOutlinePath(root, volumeNo));
}

export async function readVolumeOutline(root: string, volumeNo: number): Promise<VolumeOutlineDoc> {
  const md = await readMarkdownAsset(volumeOutlinePath(root, volumeNo), OutlineVolumeFrontmatter);
  return { frontmatter: md.frontmatter, body: md.body.trim() };
}

export async function writeVolumeOutline(
  root: string,
  doc: VolumeOutlineDoc,
  status: AssetStatus = 'drafting',
): Promise<VolumeOutlineDoc> {
  const next: TOutlineVolumeFrontmatter = {
    ...doc.frontmatter,
    updated_at: nowISO(),
    version: doc.frontmatter.version + 1,
    status,
  };
  await writeMarkdownAsset(volumeOutlinePath(root, next.volume_no), OutlineVolumeFrontmatter, {
    frontmatter: OutlineVolumeFrontmatter.parse(next),
    body: doc.body,
  });
  return { frontmatter: next, body: doc.body };
}

export function buildInitialVolumeOutline(volumeNo: number, range: ChapterRange): VolumeOutlineDoc {
  const ts = nowISO();
  const frontmatter = OutlineVolumeFrontmatter.parse({
    asset_type: 'outline-volume',
    asset_id: `volume-${String(volumeNo).padStart(2, '0')}`,
    volume_no: volumeNo,
    chapter_range: range,
    target_chapters: range[1] - range[0] + 1,
    created_at: ts,
    updated_at: ts,
    version: 1,
    status: 'drafting',
    maintained_by: 'novel-outline-architect',
  });
  return { frontmatter, body: renderVolumeSkeleton(volumeNo, range) };
}

/** Sorted list of volume numbers that have an outline file on disk. */
export async function listVolumeOutlines(root: string): Promise<number[]> {
  const dir = projectPaths(root).outline.volumes;
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const nums: number[] = [];
  for (const e of entries) {
    const m = e.match(/^volume-(\d+)\.md$/);
    if (m) nums.push(Number.parseInt(m[1] ?? '', 10));
  }
  return nums.sort((a, b) => a - b);
}

// =============================================================================
//  章纲 (chapter)
// =============================================================================

export function chapterOutlinePath(root: string, chapterNo: number): string {
  return join(projectPaths(root).outline.chapters, chapterFilename(chapterNo));
}

export function chapterOutlineExists(root: string, chapterNo: number): boolean {
  return existsSync(chapterOutlinePath(root, chapterNo));
}

export async function readChapterOutline(root: string, chapterNo: number): Promise<ChapterOutlineDoc> {
  const md = await readMarkdownAsset(chapterOutlinePath(root, chapterNo), OutlineChapterFrontmatter);
  return { frontmatter: md.frontmatter, body: md.body.trim() };
}

export async function writeChapterOutline(
  root: string,
  doc: ChapterOutlineDoc,
  status: AssetStatus = 'drafting',
): Promise<ChapterOutlineDoc> {
  const next: TOutlineChapterFrontmatter = {
    ...doc.frontmatter,
    updated_at: nowISO(),
    version: doc.frontmatter.version + 1,
    status,
  };
  await writeMarkdownAsset(chapterOutlinePath(root, next.chapter_no), OutlineChapterFrontmatter, {
    frontmatter: OutlineChapterFrontmatter.parse(next),
    body: doc.body,
  });
  return { frontmatter: next, body: doc.body };
}

export function buildInitialChapterOutline(
  chapterNo: number,
  volumeNo: number,
  targetWords = 3500,
): ChapterOutlineDoc {
  const ts = nowISO();
  const frontmatter = OutlineChapterFrontmatter.parse({
    asset_type: 'outline-chapter',
    asset_id: `chapter-${String(chapterNo).padStart(4, '0')}`,
    chapter_no: chapterNo,
    volume_no: volumeNo,
    target_words: targetWords,
    created_at: ts,
    updated_at: ts,
    version: 1,
    status: 'drafting',
    maintained_by: 'novel-outline-architect',
  });
  return { frontmatter, body: renderChapterSkeleton(chapterNo) };
}

/** Sorted list of chapter numbers that have an outline file on disk. */
export async function listChapterOutlines(root: string): Promise<number[]> {
  const dir = projectPaths(root).outline.chapters;
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  const nums: number[] = [];
  for (const e of entries) {
    const m = e.match(/^chapter-(\d+)\.md$/);
    if (m) nums.push(Number.parseInt(m[1] ?? '', 10));
  }
  return nums.sort((a, b) => a - b);
}

// =============================================================================
//  Aggregate status
// =============================================================================

export interface OutlineStatus {
  hasMaster: boolean;
  volumeNumbers: number[];
  chapterNumbers: number[];
  volumeCount: number;
  chapterOutlineCount: number;
}

export async function outlineStatus(root: string): Promise<OutlineStatus> {
  const hasMaster = outlineMasterExists(root);
  const volumeNumbers = await listVolumeOutlines(root);
  const chapterNumbers = await listChapterOutlines(root);
  return {
    hasMaster,
    volumeNumbers,
    chapterNumbers,
    volumeCount: volumeNumbers.length,
    chapterOutlineCount: chapterNumbers.length,
  };
}

/**
 * Reconcile novel.json's `outline_status` with the actual on-disk outline state
 * (file-truth-first). Only writes (bumping novel version) when the value changes.
 *   no master         → pending
 *   master only       → drafting
 *   master + chapters → in_progress
 */
export async function syncOutlineStatus(root: string): Promise<void> {
  const st = await outlineStatus(root);
  const desired: 'pending' | 'drafting' | 'in_progress' = !st.hasMaster
    ? 'pending'
    : st.chapterOutlineCount > 0
      ? 'in_progress'
      : 'drafting';
  const novel = await readNovel(root);
  if (novel.outline_status !== desired) {
    await patchNovel(root, { outline_status: desired });
  }
}

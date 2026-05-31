/**
 * Workspace / book resolution.
 *
 * A "workspace" is a directory containing one or more book projects. A "book"
 * is a directory with a `novel.json`. The workspace root itself may be a book
 * (single-book mode), and/or its immediate children may be books (multi-book).
 *
 * `bookId` is the directory basename — the stable filesystem key the URL uses.
 * It is validated against traversal before being joined to the workspace.
 */
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { readNovel } from '@novel/core/assets/novel.js';
import { HttpError } from './errors.js';

const ID_RE = /^[A-Za-z0-9._-]+$/;

function hasNovelJson(dir: string): boolean {
  return existsSync(join(dir, 'novel.json'));
}

export interface BookSummary {
  /** URL key = directory basename. */
  id: string;
  /** Absolute path on disk. */
  path: string;
  /** novel.json's own ProjectId (may differ from the directory name). */
  projectId: string;
  title: string;
  genre: string[];
  blueprintStatus: string;
  outlineStatus: string;
  targetChapters: number | null;
  currentChapter: number;
}

/** List every book under the workspace (root-as-book + immediate children). */
export async function listBooks(workspaceRoot: string): Promise<BookSummary[]> {
  const ws = resolve(workspaceRoot);
  const roots: string[] = [];
  if (hasNovelJson(ws)) roots.push(ws);
  if (existsSync(ws)) {
    for (const entry of await readdir(ws, { withFileTypes: true })) {
      if (entry.isDirectory() && hasNovelJson(join(ws, entry.name))) {
        roots.push(join(ws, entry.name));
      }
    }
  }

  const out: BookSummary[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    const id = basename(root);
    if (seen.has(id)) continue;
    try {
      const n = await readNovel(root);
      out.push({
        id,
        path: root,
        projectId: n.id,
        title: n.title,
        genre: n.genre,
        blueprintStatus: n.blueprint_status,
        outlineStatus: n.outline_status,
        targetChapters: n.target_chapters,
        currentChapter: n.current_chapter,
      });
      seen.add(id);
    } catch {
      // Skip a directory whose novel.json is unreadable/invalid.
    }
  }
  return out;
}

/** Resolve a book id to its absolute root, guarding against path traversal. */
export async function requireBookRoot(workspaceRoot: string, id: string): Promise<string> {
  const ws = resolve(workspaceRoot);
  if (!ID_RE.test(id)) {
    throw new HttpError(400, `非法的 book id：${id}`, '只允许字母 / 数字 / . _ -');
  }
  if (basename(ws) === id && hasNovelJson(ws)) return ws;
  const candidate = join(ws, id);
  // Must be a *direct* child of the workspace and contain a novel.json.
  if (dirname(candidate) === ws && hasNovelJson(candidate)) return candidate;
  throw new HttpError(404, `找不到书：${id}`, '确认 NOVEL_WORKSPACE 指向包含该项目目录的工作区。');
}

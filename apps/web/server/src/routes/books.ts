/**
 * Workspace + book routes, mounted at /api.
 *
 *   GET /api/workspace/books      — list books in the workspace
 *   GET /api/books/:id            — raw novel.json
 *   GET /api/books/:id/status     — status detector report
 *   GET /api/books/:id/assets/... — see routes/assets.ts
 */
import { Hono } from 'hono';
import { readNovel } from '@novel/core/assets/novel.js';
import { detectStatus } from '@novel/core/status/detector.js';
import { assetRoutes } from './assets.js';
import { listBooks, requireBookRoot } from '../workspace.js';

export function apiRoutes(workspaceRoot: string): Hono {
  const api = new Hono();

  api.get('/workspace/books', async (c) => {
    return c.json({ workspace: workspaceRoot, books: await listBooks(workspaceRoot) });
  });

  const books = new Hono();

  books.get('/:id', async (c) => {
    const root = await requireBookRoot(workspaceRoot, c.req.param('id') ?? '');
    return c.json(await readNovel(root));
  });

  books.get('/:id/status', async (c) => {
    const root = await requireBookRoot(workspaceRoot, c.req.param('id') ?? '');
    return c.json(await detectStatus(root));
  });

  books.route('/:id/assets', assetRoutes(workspaceRoot));

  api.route('/books', books);
  return api;
}

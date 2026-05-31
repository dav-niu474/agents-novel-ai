/**
 * M1 read-only API tests — exercised against the real `examples/tunshi-mo-di`
 * fixture via Hono's `app.request()` (no socket needed).
 *
 * Verifies the M1 acceptance: the server can surface an existing book's
 * setting-bible assets.
 */
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const workspaceRoot = join(repoRoot, 'examples');

let app: ReturnType<typeof buildApp>;

beforeAll(() => {
  app = buildApp({ workspaceRoot });
});

async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await app.request(path);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

describe('health', () => {
  it('GET /api/health → ok', async () => {
    const { status, body } = await get('/api/health');
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

describe('workspace + books', () => {
  it('lists tunshi-mo-di in the examples workspace', async () => {
    const { status, body } = await get('/api/workspace/books');
    expect(status).toBe(200);
    expect(Array.isArray(body.books)).toBe(true);
    const ids = body.books.map((b: { id: string }) => b.id);
    expect(ids).toContain('tunshi-mo-di');
    const book = body.books.find((b: { id: string }) => b.id === 'tunshi-mo-di');
    expect(typeof book.title).toBe('string');
    expect(book.title.length).toBeGreaterThan(0);
  });

  it('GET /api/books/:id → novel.json', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di');
    expect(status).toBe(200);
    expect(body.asset_type).toBe('project');
    expect(typeof body.title).toBe('string');
  });

  it('GET /api/books/:id/status → status report', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di/status');
    expect(status).toBe(200);
    expect(typeof body.stage).toBe('string');
    expect(body.novel).not.toBeNull();
    expect(Array.isArray(body.nextSteps)).toBe(true);
  });

  it('unknown book → 404', async () => {
    const { status, body } = await get('/api/books/no-such-book/status');
    expect(status).toBe(404);
    expect(typeof body.error).toBe('string');
  });

  it('invalid book id → 400', async () => {
    const { status } = await get('/api/books/bad$id/status');
    expect(status).toBe(400);
  });
});

describe('assets (envelope: { exists, data? })', () => {
  it('blueprint exists', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di/assets/blueprint');
    expect(status).toBe(200);
    expect(typeof body.exists).toBe('boolean');
  });

  it('world/worldview returns an envelope', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di/assets/world/worldview');
    expect(status).toBe(200);
    expect(typeof body.exists).toBe('boolean');
  });

  it('unknown world asset → 400', async () => {
    const { status } = await get('/api/books/tunshi-mo-di/assets/world/bogus');
    expect(status).toBe(400);
  });

  it('characters envelope has status + index slots', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di/assets/characters');
    expect(status).toBe(200);
    expect(body.data).toHaveProperty('status');
    expect(body.data).toHaveProperty('index');
  });

  it('outline summary returns counts', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di/assets/outline');
    expect(status).toBe(200);
    expect(body.exists).toBe(true);
    expect(body.data).toHaveProperty('chapterOutlineCount');
  });

  it('chapter-0001 outline exists in the fixture', async () => {
    const { status, body } = await get('/api/books/tunshi-mo-di/assets/outline/chapters/1');
    expect(status).toBe(200);
    expect(body.exists).toBe(true);
    expect(body.data.frontmatter.chapter_no).toBe(1);
  });

  it('non-numeric chapter → 400', async () => {
    const { status } = await get('/api/books/tunshi-mo-di/assets/outline/chapters/abc');
    expect(status).toBe(400);
  });
});

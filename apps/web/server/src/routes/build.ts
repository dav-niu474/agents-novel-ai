/**
 * Build (write) routes for the `world` stage, mounted at /api/books/:id/build.
 *
 *   GET  /world                     derived build state (which steps exist)
 *   POST /world/step/:key/draft     { hint?, currentData?, mock? } -> DraftResult (no write)
 *   POST /world/step/:key/accept    { data } -> validate + write (status=drafting)
 *   POST /world/step/:key/skip      write a placeholder skeleton
 *   POST /world/approve             R2 gate -> flip all three to approved
 *   GET  /events                    SSE progress channel (server -> client)
 *
 * Stateless w.r.t. drafts: the in-progress draft lives in the client; progress
 * is derived from on-disk truth. Only the SSE emitter holds (ephemeral) state.
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createProvider } from '@novel/core/llm/factory.js';
import type { LLMProvider } from '@novel/core/llm/provider.js';
import {
  acceptWorldStep,
  approveWorld,
  draftWorldStep,
  skipWorldStep,
  worldBuildState,
  type WorldStepKey,
} from '@novel/core/orchestration/world-build.js';
import { HttpError } from '../errors.js';
import { emitBuildEvent, subscribeBuildEvents } from '../events.js';
import { requireBookRoot } from '../workspace.js';

function parseStep(raw: string | undefined): WorldStepKey {
  if (raw === 'worldview' || raw === 'powers' || raw === 'cheat-system') return raw;
  throw new HttpError(400, `未知 world 步骤：${raw}`, '允许 worldview / powers / cheat-system');
}

async function readBody(c: Context): Promise<Record<string, unknown>> {
  try {
    const body = (await c.req.json()) as unknown;
    return body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function buildRoutes(workspaceRoot: string): Hono {
  const b = new Hono();
  const root = (c: Context): Promise<string> => requireBookRoot(workspaceRoot, c.req.param('id') ?? '');

  // SSE progress channel. One global stream; client filters by bookId.
  b.get('/events', (c) =>
    streamSSE(c, async (stream) => {
      const unsub = subscribeBuildEvents((e) => {
        void stream.writeSSE({ event: 'build', data: JSON.stringify(e) });
      });
      stream.onAbort(() => unsub());
      await stream.writeSSE({ event: 'open', data: '{}' });
      while (!stream.aborted) {
        await stream.sleep(15_000);
        if (stream.aborted) break;
        await stream.writeSSE({ event: 'ping', data: '{}' });
      }
      unsub();
    }),
  );

  b.get('/world', async (c) => {
    const r = await root(c);
    return c.json(worldBuildState(r));
  });

  b.post('/world/step/:key/draft', async (c) => {
    const r = await root(c);
    const bookId = c.req.param('id') ?? '';
    const step = parseStep(c.req.param('key'));
    const body = await readBody(c);
    const mock = body.mock === true;

    let provider: LLMProvider;
    try {
      provider = await createProvider({
        projectRoot: r,
        skill: 'novel-worldforge',
        ...(mock ? { mock: true } : {}),
      });
    } catch (err) {
      throw new HttpError(
        400,
        `LLM provider 不可用：${err instanceof Error ? err.message : String(err)}`,
        '用 novel config 配置 provider/key，或在请求里传 { "mock": true }',
      );
    }

    emitBuildEvent({ bookId, type: 'draft-start', step });
    const result = await draftWorldStep({
      root: r,
      step,
      provider,
      ...(typeof body.hint === 'string' ? { hint: body.hint } : {}),
      ...(body.currentData !== undefined ? { currentData: body.currentData } : {}),
    });
    emitBuildEvent({ bookId, type: 'draft-done', step, ok: result.ok });
    return c.json(result);
  });

  b.post('/world/step/:key/accept', async (c) => {
    const r = await root(c);
    const bookId = c.req.param('id') ?? '';
    const step = parseStep(c.req.param('key'));
    const body = await readBody(c);
    if (body.data === undefined) throw new HttpError(400, '缺少 data 字段');
    const res = await acceptWorldStep(r, step, body.data);
    if (!res.ok) throw new HttpError(400, `校验失败：${res.issues.join('；')}`);
    emitBuildEvent({ bookId, type: 'saved', step });
    return c.json({ ok: true });
  });

  b.post('/world/step/:key/skip', async (c) => {
    const r = await root(c);
    const bookId = c.req.param('id') ?? '';
    const step = parseStep(c.req.param('key'));
    await skipWorldStep(r, step);
    emitBuildEvent({ bookId, type: 'saved', step, message: 'skip' });
    return c.json({ ok: true });
  });

  b.post('/world/approve', async (c) => {
    const r = await root(c);
    const bookId = c.req.param('id') ?? '';
    const res = await approveWorld(r);
    if (!res.ok) throw new HttpError(400, `无法 approve：${res.issues.join('；')}`);
    emitBuildEvent({ bookId, type: 'approved' });
    return c.json({ ok: true });
  });

  return b;
}

/**
 * Build the Hono app. The workspace root is injected (not read from env here)
 * so tests can point it at a fixture directory.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler } from './errors.js';
import { apiRoutes } from './routes/books.js';

export interface AppOptions {
  workspaceRoot: string;
}

export function buildApp(opts: AppOptions): Hono {
  const app = new Hono();

  // Local-first single-user: CORS is permissive (server binds 127.0.0.1 only).
  app.use('/api/*', cors());

  app.get('/api/health', (c) =>
    c.json({ ok: true, service: 'novel-studio-web-server', workspace: opts.workspaceRoot }),
  );

  app.route('/api', apiRoutes(opts.workspaceRoot));

  app.notFound((c) => c.json({ error: '未找到该接口', path: c.req.path }, 404));
  app.onError(errorHandler);

  return app;
}

#!/usr/bin/env node
/**
 * Web Studio server entrypoint. Local-first, single-user: binds 127.0.0.1 only.
 *
 *   NOVEL_WORKSPACE   workspace dir containing book project(s); default: cwd
 *   NOVEL_WEB_PORT    listen port; default: 4567
 */
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { buildApp } from './app.js';

const workspaceRoot = resolve(process.env.NOVEL_WORKSPACE ?? process.cwd());
const port = Number.parseInt(process.env.NOVEL_WEB_PORT ?? '4567', 10);

const app = buildApp({ workspaceRoot });

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
  // eslint-disable-next-line no-console
  console.log(
    `Novel Studio web server → http://127.0.0.1:${info.port}\n` +
      `  workspace: ${workspaceRoot}\n` +
      `  try: GET /api/health · /api/workspace/books`,
  );
});

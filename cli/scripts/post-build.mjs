#!/usr/bin/env node
// Post-build: chmod +x the CLI entry so `npm link` / `npx` work directly.
import { chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const entry = new URL('../dist/bin/novel.js', import.meta.url);

if (existsSync(entry)) {
  await chmod(entry, 0o755);
  console.log('[post-build] chmod +x dist/bin/novel.js');
} else {
  console.warn('[post-build] dist/bin/novel.js not found, skipped chmod');
}

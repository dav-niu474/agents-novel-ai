import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Make a unique temp dir under os.tmpdir, return its absolute path. */
export async function makeTmpDir(prefix = 'novel-cli-'): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

export async function rmTmpDir(p: string): Promise<void> {
  await rm(p, { recursive: true, force: true });
}

/**
 * Path to the repo root (agents-novel-ai/) — useful when tests need to read
 * the actual /skills/* SKILL.md files.
 *
 * Lives at agents-novel-ai/cli/tests/, so go up 2 levels.
 */
export function repoRoot(): string {
  // import.meta.url is file:///.../cli/tests/helpers.ts
  const url = new URL('../..', import.meta.url);
  return new URL(url).pathname;
}

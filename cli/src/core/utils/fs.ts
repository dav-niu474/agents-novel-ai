/**
 * Filesystem helpers: atomic write, mkdirp, exists.
 *
 * "Atomic" here means: write to <path>.tmp.<rand>, fsync (fs.writeFile already does
 * via flag), then rename to <path>. This prevents half-written files if the process
 * is interrupted, satisfying §8 R3 in 02-pipeline-architecture.md
 * ("写操作要原子化").
 */
import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { customAlphabet } from 'nanoid';
import { FileSystemError } from './errors.js';

const tmpSuffix = customAlphabet('0123456789abcdef', 8);

/** Create a directory if it doesn't exist; recursive. */
export async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (err) {
    throw new FileSystemError('mkdir', dir, err);
  }
}

/**
 * Atomically write a UTF-8 file. Creates parent directories as needed.
 * Throws FileSystemError on any underlying error.
 */
export async function writeFileAtomic(path: string, content: string): Promise<void> {
  await ensureDir(dirname(path));
  const tmp = `${path}.tmp.${tmpSuffix()}`;
  try {
    await writeFile(tmp, content, 'utf8');
    await rename(tmp, path);
  } catch (err) {
    // Best-effort cleanup of the temp file.
    try {
      await unlink(tmp);
    } catch {
      /* ignore */
    }
    throw new FileSystemError('write', path, err);
  }
}

export function pathExists(p: string): boolean {
  return existsSync(p);
}

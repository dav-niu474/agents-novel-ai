/**
 * High-level read/write for JSON and Markdown assets, with Zod validation
 * baked in. Always go through these helpers; never call fs.readFile/writeFile
 * for asset paths directly.
 */
import { readFile } from 'node:fs/promises';
import type { z } from 'zod';
import { FileSystemError, SchemaError } from '../utils/errors.js';
import { writeFileAtomic } from '../utils/fs.js';
import { formatZodError } from '../utils/zod-format.js';
import { parseMarkdown, serializeMarkdown } from './frontmatter.js';

// ---------- JSON ----------

/** Read + parse + Zod-validate a JSON asset. */
export async function readJsonAsset<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    throw new FileSystemError('read', path, err);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SchemaError(path, `JSON parse 失败：${(err as Error).message}`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new SchemaError(path, formatZodError(result.error));
  }
  return result.data;
}

/** Validate + atomically write a JSON asset (2-space indent, trailing newline). */
export async function writeJsonAsset<T>(
  path: string,
  schema: z.ZodType<T>,
  data: T,
): Promise<void> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new SchemaError(path, formatZodError(result.error));
  }
  const serialized = JSON.stringify(result.data, null, 2) + '\n';
  await writeFileAtomic(path, serialized);
}

// ---------- Markdown (frontmatter + body) ----------

export interface MarkdownAsset<F> {
  frontmatter: F;
  body: string;
}

/**
 * Read + parse + validate a Markdown asset. The body is returned untouched (caller
 * is free to parse sections downstream).
 */
export async function readMarkdownAsset<F>(
  path: string,
  frontmatterSchema: z.ZodType<F>,
): Promise<MarkdownAsset<F>> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    throw new FileSystemError('read', path, err);
  }
  const { frontmatter: rawFm, body } = parseMarkdown<unknown>(raw);
  if (rawFm === null || typeof rawFm !== 'object') {
    throw new SchemaError(path, 'Markdown 文件缺少 YAML frontmatter');
  }
  const result = frontmatterSchema.safeParse(rawFm);
  if (!result.success) {
    throw new SchemaError(path, formatZodError(result.error));
  }
  return { frontmatter: result.data, body };
}

/** Validate + atomically write a Markdown asset. */
export async function writeMarkdownAsset<F>(
  path: string,
  frontmatterSchema: z.ZodType<F>,
  asset: MarkdownAsset<F>,
): Promise<void> {
  const result = frontmatterSchema.safeParse(asset.frontmatter);
  if (!result.success) {
    throw new SchemaError(path, formatZodError(result.error));
  }
  // Re-serialize using validated frontmatter to drop unknown keys cleanly.
  const serialized = serializeMarkdown(
    result.data as Record<string, unknown>,
    asset.body,
  );
  await writeFileAtomic(path, serialized);
}

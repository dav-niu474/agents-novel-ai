/**
 * SKILL.md loader.
 *
 * Reads a skill's SKILL.md file, parses YAML frontmatter, validates against
 * SkillFrontmatter schema, and returns a LoadedSkill.
 *
 * The skills directory is resolved by:
 *   1. NOVEL_SKILLS_DIR env var (absolute path)
 *   2. Walk up from import.meta.url (handles both dev `cli/src/...` and
 *      compiled `cli/dist/...`) looking for a sibling `skills/` directory
 *      that contains `novel-studio/SKILL.md`.
 *   3. Throw a helpful ConfigError.
 */
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LoadedSkill, type LoadedSkill as TLoadedSkill, SkillFrontmatter } from '../schemas/skill.js';
import type { SkillName } from '../schemas/common.js';
import { ConfigError, FileSystemError, SchemaError } from '../utils/errors.js';
import { formatZodError } from '../utils/zod-format.js';
import { parseMarkdown } from '../assets/frontmatter.js';

let cachedSkillsDir: string | null = null;

/** Resolve the skills/ directory; cached after first success. */
export function resolveSkillsDir(env: NodeJS.ProcessEnv = process.env): string {
  if (cachedSkillsDir) return cachedSkillsDir;

  // 1. Env override.
  const envDir = env.NOVEL_SKILLS_DIR;
  if (envDir) {
    const abs = isAbsolute(envDir) ? envDir : resolve(envDir);
    if (!existsSync(join(abs, 'novel-studio', 'SKILL.md'))) {
      throw new ConfigError(
        `NOVEL_SKILLS_DIR=${abs} 不是合法的 skills 目录（缺少 novel-studio/SKILL.md）。`,
      );
    }
    cachedSkillsDir = abs;
    return abs;
  }

  // 2. Walk up from this file's location.
  const here = dirname(fileURLToPath(import.meta.url));
  let cur = here;
  for (let i = 0; i < 8; i++) {
    const candidate = join(cur, 'skills');
    if (existsSync(join(candidate, 'novel-studio', 'SKILL.md'))) {
      cachedSkillsDir = candidate;
      return candidate;
    }
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }

  throw new ConfigError(
    `找不到 skills/ 目录（从 ${here} 起向上 8 层都没找到）。`,
    '设置环境变量 NOVEL_SKILLS_DIR 指向 agents-novel-ai/skills 目录。',
  );
}

/** Override (for tests) or reset (for reloading). */
export function setSkillsDir(dir: string | null): void {
  cachedSkillsDir = dir;
}

/** Load + parse + validate one SKILL.md by skill name. */
export async function loadSkill(name: SkillName): Promise<TLoadedSkill> {
  const path = join(resolveSkillsDir(), name, 'SKILL.md');
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    throw new FileSystemError('read', path, err);
  }
  const { frontmatter: rawFm, body } = parseMarkdown<unknown>(raw);
  if (rawFm === null || typeof rawFm !== 'object') {
    throw new SchemaError(path, 'SKILL.md 缺少 YAML frontmatter');
  }
  const result = SkillFrontmatter.safeParse(rawFm);
  if (!result.success) {
    throw new SchemaError(path, formatZodError(result.error));
  }
  return LoadedSkill.parse({
    frontmatter: result.data,
    body: body.trim(),
    path,
  });
}

/** Load all 9 skills present in the skills/ directory. */
export async function loadAllSkills(): Promise<TLoadedSkill[]> {
  const dir = resolveSkillsDir();
  const entries = await readdir(dir, { withFileTypes: true });
  const out: TLoadedSkill[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (!e.name.startsWith('novel-')) continue;
    if (!existsSync(join(dir, e.name, 'SKILL.md'))) continue;
    // Cast is safe: SkillFrontmatter parsing inside loadSkill validates the name.
    out.push(await loadSkill(e.name as SkillName));
  }
  return out;
}

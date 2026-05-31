/**
 * novel.json CRUD — the project metadata file.
 */
import { Novel, type Novel as TNovel, type NovelInitInput } from '../schemas/novel.js';
import { generateProjectId } from '../utils/id.js';
import { nowISO } from '../utils/time.js';
import { readJsonAsset, writeJsonAsset } from './io.js';
import { projectPaths } from './paths.js';

/** Read + validate novel.json from a project root. */
export async function readNovel(root: string): Promise<TNovel> {
  return readJsonAsset(projectPaths(root).novelJson, Novel);
}

/** Write novel.json (validated, version-bumped, updated_at-stamped). */
export async function writeNovel(root: string, novel: TNovel): Promise<TNovel> {
  const next: TNovel = {
    ...novel,
    updated_at: nowISO(),
    version: novel.version + 1,
  };
  await writeJsonAsset(projectPaths(root).novelJson, Novel, next);
  return next;
}

/** Build the initial novel.json from `novel init` input. */
export function buildInitialNovel(input: NovelInitInput): TNovel {
  const ts = nowISO();
  return Novel.parse({
    schema_version: '1.0',
    asset_type: 'project',
    id: generateProjectId(input.title),
    title: input.title,
    subtitle: input.subtitle ?? '',
    genre: input.genre,
    platform_target: input.platform_target,
    lang: 'zh-CN',
    audience: input.audience ?? '',
    blueprint_status: 'pending',
    outline_status: 'pending',
    current_chapter: 0,
    target_chapters: null,
    target_chapter_words: input.target_chapter_words ?? 3500,
    current_total_words: 0,
    tags: [],
    core_pitch: '',
    agents: {},
    created_at: ts,
    updated_at: ts,
    version: 1,
  });
}

/** Update specific fields in novel.json (read → patch → version-bump → write). */
export async function patchNovel(
  root: string,
  patch: Partial<Omit<TNovel, 'id' | 'created_at' | 'version' | 'schema_version' | 'asset_type'>>,
): Promise<TNovel> {
  const current = await readNovel(root);
  return writeNovel(root, { ...current, ...patch });
}

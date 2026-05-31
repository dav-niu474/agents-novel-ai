/**
 * Read-only asset endpoints, mounted at /api/books/:id/assets.
 *
 * Envelope convention: every asset endpoint returns `{ exists, data? }`.
 * "Not built yet" is the *normal* state mid-pipeline, so a missing asset is a
 * 200 `{ exists: false }` (not a 404) — the UI greys it out rather than erroring.
 */
import { existsSync } from 'node:fs';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { readBlueprint } from '@novel/core/assets/blueprint.js';
import {
  characterCardExists,
  characterIndexExists,
  charactersStatus,
  readCharacter,
  readCharacterIndex,
  readRelationships,
  relationshipsExists,
} from '@novel/core/assets/character.js';
import {
  chapterOutlineExists,
  outlineMasterExists,
  outlineStatus,
  readChapterOutline,
  readOutlineMaster,
  readVolumeOutline,
  volumeOutlineExists,
} from '@novel/core/assets/outline.js';
import { projectPaths } from '@novel/core/assets/paths.js';
import {
  cheatSystemExists,
  powersExists,
  readCheatSystem,
  readPowers,
  readWorldview,
  worldviewExists,
} from '@novel/core/assets/world.js';
import { HttpError } from '../errors.js';
import { requireBookRoot } from '../workspace.js';

function parsePositiveInt(raw: string | undefined, label: string): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, `${label} 必须是正整数，收到：${raw}`);
  }
  return n;
}

export function assetRoutes(workspaceRoot: string): Hono {
  const a = new Hono();
  const root = (c: Context): Promise<string> =>
    requireBookRoot(workspaceRoot, c.req.param('id') ?? '');

  // ---- blueprint ----
  a.get('/blueprint', async (c) => {
    const r = await root(c);
    if (!existsSync(projectPaths(r).blueprintMd)) return c.json({ exists: false });
    return c.json({ exists: true, data: await readBlueprint(r) });
  });

  // ---- world: worldview / powers / cheat-system ----
  a.get('/world/:asset', async (c) => {
    const r = await root(c);
    const asset = c.req.param('asset');
    if (asset === 'worldview') {
      return worldviewExists(r)
        ? c.json({ exists: true, data: await readWorldview(r) })
        : c.json({ exists: false });
    }
    if (asset === 'powers') {
      return powersExists(r)
        ? c.json({ exists: true, data: await readPowers(r) })
        : c.json({ exists: false });
    }
    if (asset === 'cheat-system') {
      return cheatSystemExists(r)
        ? c.json({ exists: true, data: await readCheatSystem(r) })
        : c.json({ exists: false });
    }
    throw new HttpError(400, `未知 world 资产：${asset}`, '允许 worldview / powers / cheat-system');
  });

  // ---- characters ----
  a.get('/characters', async (c) => {
    const r = await root(c);
    const status = await charactersStatus(r);
    const index = characterIndexExists(r) ? await readCharacterIndex(r) : null;
    return c.json({ exists: index !== null || status.total > 0, data: { status, index } });
  });

  a.get('/characters/:charId', async (c) => {
    const r = await root(c);
    const charId = c.req.param('charId') ?? '';
    if (!characterCardExists(r, charId)) return c.json({ exists: false });
    return c.json({ exists: true, data: await readCharacter(r, charId) });
  });

  a.get('/relationships', async (c) => {
    const r = await root(c);
    if (!relationshipsExists(r)) return c.json({ exists: false });
    return c.json({ exists: true, data: await readRelationships(r) });
  });

  // ---- outline ----
  a.get('/outline', async (c) => {
    const r = await root(c);
    return c.json({ exists: true, data: await outlineStatus(r) });
  });

  a.get('/outline/master', async (c) => {
    const r = await root(c);
    if (!outlineMasterExists(r)) return c.json({ exists: false });
    return c.json({ exists: true, data: await readOutlineMaster(r) });
  });

  a.get('/outline/volumes/:n', async (c) => {
    const r = await root(c);
    const n = parsePositiveInt(c.req.param('n'), '卷号');
    if (!volumeOutlineExists(r, n)) return c.json({ exists: false });
    return c.json({ exists: true, data: await readVolumeOutline(r, n) });
  });

  a.get('/outline/chapters/:n', async (c) => {
    const r = await root(c);
    const n = parsePositiveInt(c.req.param('n'), '章号');
    if (!chapterOutlineExists(r, n)) return c.json({ exists: false });
    return c.json({ exists: true, data: await readChapterOutline(r, n) });
  });

  return a;
}

/**
 * Asset path conventions.
 *
 * Pinned to README.md "资产目录约定" + 01-asset-model.md §1.
 *
 * The functions here NEVER do I/O. They are pure path math. I/O lives in `io.ts`.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** All resolvable asset paths anchored at a project root. */
export interface ProjectPaths {
  root: string;
  novelJson: string;
  blueprintMd: string;

  /** CLI-internal directory (config, transient state). NOT in v1 contract. */
  cliInternal: string;
  cliConfig: string;

  outline: {
    master: string;
    volumes: string;
    chapters: string;
  };
  world: {
    dir: string;
    /** Markdown projection (human-readable). */
    worldview: string;
    /** JSON canonical source. */
    worldviewJson: string;
    cheatSystem: string;
    cheatSystemJson: string;
    powers: string;
    powersJson: string;
  };
  characters: {
    dir: string;
    index: string;
    antagonists: string;
    supporting: string;
    /** Markdown projection (human-readable relationship graph). */
    relationships: string;
    /** JSON canonical source for the relationship graph. */
    relationshipsJson: string;
  };
  chapters: {
    dir: string;
    snapshots: string;
  };
  memory: {
    dir: string;
  };
  vault: {
    dir: string;
    inspirations: string;
    snippets: string;
    references: string;
    styleFingerprints: string;
    index: string;
  };
  audit: {
    dir: string;
    reports: string;
    trends: string;
    logs: string;
  };
  dist: string;
}

export function projectPaths(root: string): ProjectPaths {
  const r = resolve(root);
  return {
    root: r,
    novelJson: join(r, 'novel.json'),
    blueprintMd: join(r, 'blueprint.md'),

    cliInternal: join(r, '.novel'),
    cliConfig: join(r, '.novel', 'config.json'),

    outline: {
      master: join(r, 'outline', 'master.md'),
      volumes: join(r, 'outline', 'volumes'),
      chapters: join(r, 'outline', 'chapters'),
    },
    world: {
      dir: join(r, 'world'),
      worldview: join(r, 'world', 'worldview.md'),
      worldviewJson: join(r, 'world', 'worldview.json'),
      cheatSystem: join(r, 'world', 'cheat-system.md'),
      cheatSystemJson: join(r, 'world', 'cheat-system.json'),
      powers: join(r, 'world', 'powers.md'),
      powersJson: join(r, 'world', 'powers.json'),
    },
    characters: {
      dir: join(r, 'characters'),
      index: join(r, 'characters', '_index.json'),
      antagonists: join(r, 'characters', 'antagonists'),
      supporting: join(r, 'characters', 'supporting'),
      relationships: join(r, 'characters', 'relationships.md'),
      relationshipsJson: join(r, 'characters', 'relationships.json'),
    },
    chapters: {
      dir: join(r, 'chapters'),
      snapshots: join(r, 'chapters', '.snapshots'),
    },
    memory: {
      dir: join(r, 'memory'),
    },
    vault: {
      dir: join(r, 'vault'),
      inspirations: join(r, 'vault', 'inspirations'),
      snippets: join(r, 'vault', 'snippets'),
      references: join(r, 'vault', 'references'),
      styleFingerprints: join(r, 'vault', 'style-fingerprints'),
      index: join(r, 'vault', '_index.json'),
    },
    audit: {
      dir: join(r, 'audit'),
      reports: join(r, 'audit', 'reports'),
      trends: join(r, 'audit', 'trends'),
      logs: join(r, 'audit', 'logs'),
    },
    dist: join(r, 'dist'),
  };
}

/**
 * Walk up from `from` looking for novel.json. Returns the directory containing
 * novel.json, or `null` if none is found within `maxDepth` levels.
 *
 * `maxDepth=8` covers the realistic case (book inside a few nested dirs) without
 * scanning the entire filesystem.
 */
export function findProjectRoot(from: string, maxDepth = 8): string | null {
  let cur = resolve(from);
  for (let i = 0; i < maxDepth; i++) {
    if (existsSync(join(cur, 'novel.json'))) return cur;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

/** Format an asset filename for chapter N (4-digit zero-padded). */
export function chapterFilename(n: number): string {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`chapter number must be positive integer, got ${n}`);
  }
  return `chapter-${String(n).padStart(4, '0')}.md`;
}

/** Format an asset filename for volume N (2-digit zero-padded). */
export function volumeFilename(n: number): string {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`volume number must be positive integer, got ${n}`);
  }
  return `volume-${String(n).padStart(2, '0')}.md`;
}

/** Resolved paths for a single character card. */
export interface CharacterCardPaths {
  /** Absolute path to the canonical JSON. */
  json: string;
  /** Absolute path to the MD projection. */
  md: string;
  /** MD path relative to the characters/ dir (used in _index.json `file`). */
  relFile: string;
  /** Directory the card lives in. */
  dir: string;
}

/**
 * Resolve the {json, md, relFile, dir} paths for a character card.
 *
 * Layout (README "资产目录约定"):
 *   protagonist → characters/protagonist-<slug>.{json,md}
 *   antagonist  → characters/antagonists/antagonist-<slug>.{json,md}
 *   supporting  → characters/supporting/supporting-<slug>.{json,md}
 *   minor       → characters/supporting/minor-<slug>.{json,md}
 *
 * Uses a local literal union (not the CharacterRole schema type) to keep paths.ts
 * free of schema imports.
 */
export function characterCardPaths(
  root: string,
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor',
  slug: string,
): CharacterCardPaths {
  const charactersDir = join(resolve(root), 'characters');
  const base = `${role}-${slug}`;
  const { dir, relDir } = ((): { dir: string; relDir: string } => {
    switch (role) {
      case 'protagonist':
        return { dir: charactersDir, relDir: '' };
      case 'antagonist':
        return { dir: join(charactersDir, 'antagonists'), relDir: 'antagonists' };
      case 'supporting':
      case 'minor':
        return { dir: join(charactersDir, 'supporting'), relDir: 'supporting' };
    }
  })();
  const relFile = relDir.length > 0 ? `${relDir}/${base}.md` : `${base}.md`;
  return {
    json: join(dir, `${base}.json`),
    md: join(dir, `${base}.md`),
    relFile,
    dir,
  };
}

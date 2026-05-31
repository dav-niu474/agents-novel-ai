/**
 * @novel/core — root barrel.
 *
 * Most consumers should import the precise subpath they need, e.g.
 *   import { readNovel } from '@novel/core/assets/novel.js';
 *   import { NovelError } from '@novel/core/utils/errors.js';
 * (subpath exports are declared in package.json `exports`).
 *
 * This root entry re-exports the schema surface for convenience (collision-free
 * barrel). It is intentionally minimal; widen it deliberately if the Web server
 * benefits from a single import site.
 */
export * from './schemas/index.js';

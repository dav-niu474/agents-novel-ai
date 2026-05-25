/**
 * ID and slug generation utilities.
 *
 * Pinned to docs/design/01-asset-model.md §2.1:
 *   project id = <slug>-<6位字母数字>
 */
import { customAlphabet } from 'nanoid';

/** 6-char lowercase alphanumeric suffix (matches ProjectId regex). */
const suffix6 = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 6);

/**
 * Slugify a title to ASCII kebab-case.
 *
 * Strategy:
 *  1. Lowercase + NFKD normalize
 *  2. Strip diacritics
 *  3. Keep only [a-z0-9] and replace runs of anything else with `-`
 *  4. Trim leading/trailing `-`
 *  5. If the result is empty (e.g. all-Chinese title), fall back to `novel`
 */
export function slugify(input: string, fallback = 'novel'): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii.length > 0 ? ascii : fallback;
}

/**
 * Generate a project id from the title.
 * Always produces a string that matches the ProjectId regex (`<slug>-<6位字母数字>`).
 */
export function generateProjectId(title: string, fallback = 'novel'): string {
  return `${slugify(title, fallback)}-${suffix6()}`;
}

/** Generate a short id (8 chars) for vault cards etc. */
const vault8 = customAlphabet('0123456789abcdef', 8);
export function generateVaultCardId(): string {
  return vault8();
}

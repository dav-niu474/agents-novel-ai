/**
 * YAML frontmatter parsing & serialization for Markdown assets.
 *
 * Format (per 01-asset-model.md §2.3):
 *
 *   ---
 *   key: value
 *   ---
 *   # Body
 *
 * We use `yaml` directly rather than gray-matter to:
 *   1. Avoid the CommonJS/ESM interop quirk
 *   2. Have full control over serialization (key order, indent, quoting)
 */
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ParsedMarkdown<T = unknown> {
  /** Parsed YAML frontmatter (raw object; caller validates with Zod). */
  frontmatter: T;
  /** Markdown body after the closing `---`. Trailing newline preserved. */
  body: string;
}

/**
 * Parse a Markdown file with YAML frontmatter.
 * If no frontmatter is present, `frontmatter` is `null` and `body` is the full input.
 */
export function parseMarkdown<T = unknown>(input: string): ParsedMarkdown<T | null> {
  const m = input.match(FRONT_MATTER_RE);
  if (!m) {
    return { frontmatter: null, body: input };
  }
  const yamlSrc = m[1] ?? '';
  const body = m[2] ?? '';
  const parsed = (yamlParse(yamlSrc) ?? {}) as T;
  return { frontmatter: parsed, body };
}

/**
 * Serialize frontmatter + body back into a Markdown file string.
 *
 * Conventions:
 *  - Always ends with a trailing newline
 *  - YAML uses 2-space indent, single-quoted strings where needed
 */
export function serializeMarkdown(frontmatter: Record<string, unknown>, body: string): string {
  const yaml = yamlStringify(frontmatter, {
    indent: 2,
    lineWidth: 0, // never auto-wrap
    defaultStringType: 'PLAIN',
  }).trimEnd();
  const trimmedBody = body.replace(/^\n+/, '').replace(/\n+$/, '');
  return `---\n${yaml}\n---\n\n${trimmedBody}\n`;
}

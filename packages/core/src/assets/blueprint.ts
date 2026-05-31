/**
 * blueprint.md CRUD — the open-book contract.
 *
 * The Markdown body is the canonical source. We parse 10 well-known section
 * headings into a structured `BlueprintSections` shape, and re-render the body
 * deterministically when writing.
 *
 * Pinned to skills/novel-blueprint/SKILL.md §4 (blueprint.md template).
 */
import { existsSync } from 'node:fs';
import {
  BLUEPRINT_REQUIRED_SECTIONS,
  BLUEPRINT_SECTION_KEYS,
  BLUEPRINT_SECTION_TITLES,
  Blueprint,
  BlueprintFrontmatter,
  type Blueprint as TBlueprint,
  type BlueprintFrontmatter as TBlueprintFrontmatter,
  type BlueprintSections,
} from '../schemas/blueprint.js';
import { nowISO } from '../utils/time.js';
import { readMarkdownAsset, writeMarkdownAsset } from './io.js';
import { projectPaths } from './paths.js';

const SECTION_HEADING_RE = /^##\s+\d+\.\s+(.+)$/gm;

/** Reverse-lookup: human title → section key. */
const TITLE_TO_KEY = (() => {
  const m = new Map<string, keyof BlueprintSections>();
  for (const k of BLUEPRINT_SECTION_KEYS) {
    m.set(BLUEPRINT_SECTION_TITLES[k], k);
  }
  return m;
})();

/**
 * Parse the 10-section body into a structured shape.
 * Any unrecognized section is ignored (forward-compat). Missing sections become null.
 */
export function parseBlueprintBody(
  body: string,
): { title: string; sections: BlueprintSections } {
  // Title is the first H1 line.
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? '';

  // Find all H2 headings of the form "## N. <title>" and slice the body.
  type Hit = { key: keyof BlueprintSections; start: number; end: number };
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SECTION_HEADING_RE.source, 'gm');
  const headings: { title: string; index: number; lineEnd: number }[] = [];
  while ((m = re.exec(body)) !== null) {
    const headingTitle = (m[1] ?? '').trim();
    headings.push({
      title: headingTitle,
      index: m.index,
      lineEnd: m.index + m[0].length,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (!h) continue;
    const key = TITLE_TO_KEY.get(h.title);
    if (!key) continue;
    const start = h.lineEnd;
    const end = i + 1 < headings.length ? (headings[i + 1]?.index ?? body.length) : body.length;
    hits.push({ key, start, end });
  }

  const sections: BlueprintSections = {
    pitch: null,
    positioning: null,
    protagonist: null,
    cheat_system: null,
    hooks: null,
    anti_ai: null,
    style_fingerprint: null,
    exclusions: null,
    chapter_rhythm: null,
    long_term_intent: null,
  };
  for (const hit of hits) {
    const slice = body.slice(hit.start, hit.end).trim();
    sections[hit.key] = slice.length > 0 ? slice : null;
  }
  return { title, sections };
}

/**
 * Render the structured blueprint back to Markdown body.
 * Empty sections still emit the heading + a placeholder line so the file remains
 * a valid template even before all 10 steps are filled.
 */
export function renderBlueprintBody(title: string, sections: BlueprintSections): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  BLUEPRINT_SECTION_KEYS.forEach((key, idx) => {
    const heading = `## ${idx + 1}. ${BLUEPRINT_SECTION_TITLES[key]}`;
    lines.push(heading);
    const v = sections[key];
    if (v === null || v === '') {
      lines.push('<!-- 待 `novel blueprint start` 填写 -->');
    } else {
      lines.push(v);
    }
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

/** Whether all required sections have non-empty content. */
export function isBlueprintComplete(sections: BlueprintSections): boolean {
  return BLUEPRINT_REQUIRED_SECTIONS.every((k) => {
    const v = sections[k];
    return v !== null && v.trim().length > 0;
  });
}

/** List required sections that still need filling. */
export function listMissingSections(
  sections: BlueprintSections,
): Array<keyof BlueprintSections> {
  return BLUEPRINT_REQUIRED_SECTIONS.filter((k) => {
    const v = sections[k];
    return v === null || v.trim().length === 0;
  });
}

// ---------- File I/O ----------

export function blueprintExists(root: string): boolean {
  return existsSync(projectPaths(root).blueprintMd);
}

/** Read + parse + validate blueprint.md. */
export async function readBlueprint(root: string): Promise<TBlueprint> {
  const path = projectPaths(root).blueprintMd;
  const md = await readMarkdownAsset(path, BlueprintFrontmatter);
  const { title, sections } = parseBlueprintBody(md.body);
  return Blueprint.parse({
    frontmatter: md.frontmatter,
    title,
    sections,
  });
}

/** Atomically write blueprint.md (re-rendered from the structured shape). */
export async function writeBlueprint(root: string, bp: TBlueprint): Promise<TBlueprint> {
  const path = projectPaths(root).blueprintMd;
  const next: TBlueprint = {
    ...bp,
    frontmatter: {
      ...bp.frontmatter,
      updated_at: nowISO(),
      version: bp.frontmatter.version + 1,
    },
  };
  const body = renderBlueprintBody(next.title, next.sections);
  await writeMarkdownAsset(path, BlueprintFrontmatter, {
    frontmatter: next.frontmatter,
    body,
  });
  return next;
}

/** Build a fresh blueprint scaffold (status: drafting, all sections null). */
export function buildInitialBlueprint(novelTitle: string): TBlueprint {
  const ts = nowISO();
  const fm: TBlueprintFrontmatter = BlueprintFrontmatter.parse({
    asset_type: 'blueprint',
    asset_id: 'blueprint-main',
    created_at: ts,
    updated_at: ts,
    version: 1,
    status: 'drafting',
    maintained_by: 'novel-blueprint',
  });
  return {
    frontmatter: fm,
    title: `《${novelTitle}》开书蓝图`,
    sections: {
      pitch: null,
      positioning: null,
      protagonist: null,
      cheat_system: null,
      hooks: null,
      anti_ai: null,
      style_fingerprint: null,
      exclusions: null,
      chapter_rhythm: null,
      long_term_intent: null,
    },
  };
}

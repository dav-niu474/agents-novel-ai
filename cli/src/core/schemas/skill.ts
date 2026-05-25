/**
 * Schema for SKILL.md frontmatter.
 *
 * Pinned to docs/design/04-skill-spec.md §4.
 *
 * Every SKILL.md in /skills/<name>/ has a YAML frontmatter that we parse to drive
 * dependency checks, system-prompt compilation, and per-skill model routing (v2.3).
 */
import { z } from 'zod';
import { SkillName } from './common.js';

/** Semver string — relaxed regex (we don't enforce pre-release tags). */
const SemverString = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[\w.]+)?$/, 'expected semver "X.Y.Z" or "X.Y.Z-tag"');

/** External capability tags used by skills (see 04-skill-spec.md examples). */
const ExternalCapability = z.enum(['llm', 'web-search', 'web-fetch', 'image-gen']);

/**
 * Dependency declaration: hard upstream / downstream skills + asset paths + external caps.
 *
 * Asset paths are kept as raw strings (globs OK), validated only by the consumer
 * (e.g. status detector resolves them to actual files).
 */
const DependencyBlock = z.object({
  upstream_skills: z.array(SkillName).default([]),
  upstream_assets: z.array(z.string()).default([]),
  downstream_skills: z.array(SkillName).default([]),
  downstream_assets: z.array(z.string()).default([]),
  external_capabilities: z.array(ExternalCapability).default([]),
});

export const SkillFrontmatter = z
  .object({
    name: SkillName,
    description: z.string().min(1, 'description is the trigger signal — must not be empty'),
    version: SemverString,
    maintained_by: SkillName,
    depends_on: DependencyBlock,
    /** Optional secondary deps (see novel-blueprint SKILL.md as an example). */
    soft_depends_on: DependencyBlock.partial().optional(),
  })
  .strict();
export type SkillFrontmatter = z.infer<typeof SkillFrontmatter>;

/** A loaded SKILL.md = parsed frontmatter + raw markdown body. */
export const LoadedSkill = z.object({
  frontmatter: SkillFrontmatter,
  /** Markdown body after the closing `---`. Used by the prompt compiler. */
  body: z.string(),
  /** Absolute path on disk; useful for resolving `references/...`. */
  path: z.string(),
});
export type LoadedSkill = z.infer<typeof LoadedSkill>;

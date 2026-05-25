import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileSystemPrompt } from '../src/core/skills/compiler.js';
import { loadAllSkills, loadSkill, resolveSkillsDir, setSkillsDir } from '../src/core/skills/loader.js';
import { repoRoot } from './helpers.js';

describe('skills loader', () => {
  it('resolves the skills directory from a repo checkout', () => {
    setSkillsDir(null);
    const dir = resolveSkillsDir();
    expect(existsSync(join(dir, 'novel-studio', 'SKILL.md'))).toBe(true);
  });

  it('loads every shipped SKILL.md and validates frontmatter', async () => {
    setSkillsDir(null);
    const all = await loadAllSkills();
    expect(all.length).toBeGreaterThanOrEqual(9);
    for (const s of all) {
      expect(s.frontmatter.name).toMatch(/^novel-/);
      expect(s.frontmatter.description.length).toBeGreaterThan(50);
      expect(s.body.length).toBeGreaterThan(100);
    }
  });

  it('NOVEL_SKILLS_DIR overrides discovery', () => {
    setSkillsDir(null);
    const dir = join(repoRoot(), 'skills');
    const cur = process.env.NOVEL_SKILLS_DIR;
    process.env.NOVEL_SKILLS_DIR = dir;
    try {
      setSkillsDir(null);
      expect(resolveSkillsDir()).toBe(dir);
    } finally {
      if (cur === undefined) delete process.env.NOVEL_SKILLS_DIR;
      else process.env.NOVEL_SKILLS_DIR = cur;
      setSkillsDir(null);
    }
  });

  it('compileSystemPrompt embeds the SKILL body verbatim', async () => {
    setSkillsDir(null);
    const skill = await loadSkill('novel-blueprint');
    const prompt = compileSystemPrompt(skill, {
      projectRoot: '/tmp/x',
      taskHint: 'unit-test hint',
      extraRules: ['rule 1', 'rule 2'],
    });
    expect(prompt).toContain('Novel Studio CLI 驱动');
    expect(prompt).toContain('/tmp/x');
    expect(prompt).toContain('unit-test hint');
    expect(prompt).toContain('Novel Blueprint');
    expect(prompt).toContain('rule 1');
    expect(prompt).toContain('rule 2');
  });
});

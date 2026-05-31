import { describe, expect, it } from 'vitest';
import { generateProjectId, slugify } from '@novel/core/utils/id.js';
import { ProjectId } from '@novel/core/schemas/index.js';

describe('slugify', () => {
  it('handles ASCII titles', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Mr. Robinson  ')).toBe('mr-robinson');
  });

  it('falls back when title is all-Chinese', () => {
    expect(slugify('吞天魔帝')).toBe('novel');
    expect(slugify('吞天魔帝', 'tunshi')).toBe('tunshi');
  });

  it('strips diacritics', () => {
    expect(slugify('Café au lait')).toBe('cafe-au-lait');
  });

  it('handles mixed ASCII + Chinese', () => {
    expect(slugify('Project Tunshi 吞天')).toBe('project-tunshi');
  });
});

describe('generateProjectId', () => {
  it('always matches ProjectId pattern', () => {
    for (let i = 0; i < 50; i++) {
      const id = generateProjectId(`book ${i}`);
      const ok = ProjectId.safeParse(id);
      expect(ok.success).toBe(true);
    }
  });
  it('falls back gracefully for non-ASCII titles', () => {
    const id = generateProjectId('吞天魔帝');
    expect(id.startsWith('novel-')).toBe(true);
    expect(ProjectId.safeParse(id).success).toBe(true);
  });
});

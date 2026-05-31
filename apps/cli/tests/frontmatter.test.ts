import { describe, expect, it } from 'vitest';
import { parseMarkdown, serializeMarkdown } from '@novel/core/assets/frontmatter.js';

describe('frontmatter parser', () => {
  it('parses a typical markdown asset', () => {
    const input = [
      '---',
      'asset_type: blueprint',
      'version: 3',
      'status: approved',
      '---',
      '',
      '# Title',
      '',
      'Body line 1',
      'Body line 2',
      '',
    ].join('\n');
    const { frontmatter, body } = parseMarkdown<{
      asset_type: string;
      version: number;
      status: string;
    }>(input);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.asset_type).toBe('blueprint');
    expect(frontmatter!.version).toBe(3);
    expect(body.startsWith('\n# Title')).toBe(true);
  });

  it('returns null frontmatter when no leading ---', () => {
    const { frontmatter, body } = parseMarkdown('# No fm\n\nbody only');
    expect(frontmatter).toBeNull();
    expect(body).toContain('# No fm');
  });

  it('serialize → parse roundtrip preserves keys', () => {
    const fm = {
      asset_type: 'blueprint',
      version: 5,
      status: 'drafting',
      tags: ['xuanhuan', '末法'],
    };
    const md = serializeMarkdown(fm, '# Hello\n\nworld');
    const out = parseMarkdown<typeof fm>(md);
    expect(out.frontmatter).toEqual(fm);
    expect(out.body.trim()).toBe('# Hello\n\nworld');
  });

  it('always ends with a single trailing newline', () => {
    const md = serializeMarkdown({ a: 1 }, '# x');
    expect(md.endsWith('\n')).toBe(true);
    expect(md.endsWith('\n\n')).toBe(false);
  });
});

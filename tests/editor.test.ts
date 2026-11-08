import { describe, it, expect } from 'vitest';
import { slugFromName, publicationDate } from '../apps/cms/src/editor-utils';
describe('story editor values', () => {
  it('copies names into lowercase hyphenated slugs and preserves Unicode', () => {
    expect(slugFromName('  The Little   Fox! ')).toBe('the-little-fox');
    expect(slugFromName('პატარა მელა')).toBe('პატარა-მელა');
    expect(slugFromName('Bedtime')).toBe(slugFromName(' bedtime '));
  });
  it('preserves an explicit publication date through later saves', () => {
    const chosen = '2025-06-03T10:00:00.000Z',
      now = '2026-11-07T12:00:00.000Z';
    expect(publicationDate('published', chosen, undefined, now)).toBe(chosen);
    expect(publicationDate('published', undefined, chosen, now)).toBe(chosen);
    expect(publicationDate('published', undefined, undefined, now)).toBe(now);
    expect(publicationDate('draft', undefined, undefined, now)).toBeUndefined();
  });
});

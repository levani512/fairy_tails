import { expect, it } from 'vitest';
import {
  normalizeStoryMetadata,
  storyMetadataLanguages,
} from '../apps/cms/src/story-metadata';
it('preserves existing default and additional language content', () => {
  const source = {
    defaultCover: 1,
    translations: [
      { language: 'en', title: 'Fox', description: 'English', cover: 2 },
      { language: 'ka', title: 'მელა', description: 'ქართული', cover: 3 },
    ],
  };
  const migrated = normalizeStoryMetadata(source);
  expect(migrated.title).toBe('Fox');
  expect(migrated.defaultCover).toBe(2);
  expect(migrated.translations).toHaveLength(1);
  expect(storyMetadataLanguages(migrated).map((t) => t.language)).toEqual([
    'en',
    'ka',
  ]);
  expect(source.translations).toHaveLength(2);
});
it('uses the selected default language and its own metadata', () => {
  const source = {
    defaultLanguage: 'ka',
    title: 'მელა',
    description: 'ქართული',
    defaultCover: 4,
    defaultThumbnail: 5,
    translations: [{ language: 'en', title: 'Fox', description: 'English' }],
  };
  expect(storyMetadataLanguages(source)[0]).toEqual({
    language: 'ka',
    title: 'მელა',
    description: 'ქართული',
    cover: 4,
    thumbnail: 5,
  });
  expect(normalizeStoryMetadata(source)).toEqual(source);
});

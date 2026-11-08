import { expect, it } from 'vitest';
import {
  normalizePageNarration,
  pageNarrationLanguages,
} from '../apps/cms/src/page-narration';

it('lifts default narration and preserves audio, timings, visuals and other languages', () => {
  const english = {
    language: 'en',
    text: 'Fox',
    narration: 3,
    durationMs: 1000,
    delayMs: 10,
    timings: [{ text: 'Fox' }],
    illustration: 4,
  };
  const spanish = { language: 'es', text: 'Zorro', narration: 5 };
  const source = {
    defaultLanguage: 'en',
    pages: [{ translations: [english, spanish] }],
  };
  const result = normalizePageNarration(source);
  expect(result.pages[0].defaultNarration.narration).toBe(3);
  expect(result.pages[0].defaultNarration.timings).toEqual(english.timings);
  expect(result.pages[0].defaultNarration.illustration).toBe(4);
  expect(result.pages[0].translations).toEqual([spanish]);
  expect(pageNarrationLanguages(result.pages[0], 'en')).toEqual([
    english,
    spanish,
  ]);
  expect(source.pages[0].translations).toHaveLength(2);
  expect(normalizePageNarration(result)).toEqual(result);
});

it('uses the story default language and keeps explicit default edits', () => {
  const source = {
    defaultLanguage: 'ka',
    pages: [
      {
        defaultNarration: { text: 'მელა', narration: 8 },
        translations: [{ language: 'es', text: 'Zorro' }],
      },
    ],
  };
  expect(normalizePageNarration(source)).toEqual(source);
  expect(pageNarrationLanguages(source.pages[0], 'ka')[0].language).toBe('ka');
});

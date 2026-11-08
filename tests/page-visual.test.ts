import { expect, it } from 'vitest';
import { pageVisual, normalizePageVisuals } from '../apps/cms/src/page-visual';
import { manifest } from './fixtures';
const cover = manifest.pages[0].illustration;
it('detects video and uses the story cover without a separate page poster', () => {
  const video = { ...cover, id: 'video', mime: 'video/mp4' };
  expect(pageVisual(video, cover)).toEqual({
    illustration: cover,
    video,
    poster: cover,
  });
  expect(pageVisual(cover, cover).video).toBeUndefined();
  expect(() => pageVisual({ ...cover, mime: 'audio/wav' }, cover)).toThrow();
});
it('presents legacy videos in the single selector and permits replacing with an image', () => {
  const doc = normalizePageVisuals({
    pages: [
      {
        illustration: 1,
        video: 2,
        translations: [{ illustration: 3, video: 4 }],
      },
    ],
  });
  expect(doc.pages[0].illustration).toBe(2);
  expect(doc.pages[0].translations[0].illustration).toBe(4);
  expect(doc.pages[0].video).toBeNull();
  doc.pages[0].illustration = 5;
  expect(normalizePageVisuals(doc).pages[0].illustration).toBe(5);
});

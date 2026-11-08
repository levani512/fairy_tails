import { validatePublished, type Manifest } from '../packages/shared/src/index';
export const manifest: Manifest = validatePublished({
  id: 's',
  updatedAt: '2026-11-07T00:00:00.000Z',
  language: 'en',
  title: 'Test',
  access: 'free',
  pages: [
    {
      id: 'p',
      name: 'Page',
      text: 'Hello,  world!\n',
      illustration: {
        id: 'a',
        url: 'https://test.invalid/a',
        hash: 'a'.repeat(64),
        bytes: 4,
        mime: 'image/webp',
        ready: true,
      },
      narration: {
        id: 'a',
        url: 'https://test.invalid/a',
        hash: 'a'.repeat(64),
        bytes: 4,
        mime: 'audio/wav',
        ready: true,
      },
      durationMs: 1000,
      timings: [
        { index: 0, text: 'Hello', offset: 0, startMs: 0, endMs: 300 },
        { index: 1, text: 'world', offset: 8, startMs: 500, endMs: 900 },
      ],
      effects: [],
    },
  ],
});

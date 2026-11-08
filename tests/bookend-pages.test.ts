import { describe, expect, it } from 'vitest';
import { validatePublished, assetsOf } from '../packages/shared/src/index';
import { toStory } from '../apps/cms/src/content';

const image = {
  id: 'image',
  hash: 'image-hash',
  filesize: 10,
  mimeType: 'image/png',
  processing: 'ready',
};
const audio = {
  id: 'audio',
  hash: 'audio-hash',
  filesize: 10,
  mimeType: 'audio/mpeg',
  processing: 'ready',
};
const doc = {
  id: 'test',
  slug: 'test',
  status: 'published',
  defaultLanguage: 'en',
  title: 'Test',
  description: 'Test story',
  defaultCover: image,
  updatedAt: '2026-11-08T00:00:00.000Z',
  minAge: 2,
  maxAge: 6,
  access: 'free',
  pages: [
    {
      id: 'p1',
      name: 'page_1',
      illustration: image,
      defaultNarration: {
        text: 'Hello',
        narration: audio,
        durationMs: 1000,
        timings: [
          { index: 0, text: 'Hello', offset: 0, startMs: 0, endMs: 1000 },
        ],
      },
    },
  ],
};
describe('story bookends', () => {
  it('delivers quiz choices and the correct answer, and rejects invalid quiz content', async () => {
    const question = {
      question: 'Who says hello?',
      answers: [
        { text: 'Bear', correct: false },
        { text: 'Pig', correct: true },
      ],
      explanation: 'The pig greets us.',
    };
    const story = await toStory({ ...doc, quiz: [question] }, {} as any, true);
    expect(story.translations.en!.manifest.quiz).toEqual([
      {
        question: question.question,
        answers: ['Bear', 'Pig'],
        correctAnswer: 1,
        explanation: question.explanation,
      },
    ]);
    await expect(
      toStory(
        {
          ...doc,
          quiz: [{ ...question, answers: [{ text: 'Bear', correct: false }] }],
        },
        {} as any,
        true,
      ),
    ).rejects.toThrow();
    await expect(
      toStory(
        { ...doc, quiz: [{ ...question, question: ' ' }] },
        {} as any,
        true,
      ),
    ).rejects.toThrow();
  });
  it('publishes open-ended questions without answers or a correct choice', async () => {
    const story = await toStory(
      {
        ...doc,
        quiz: [
          { question: 'What would you build?', answers: [] },
          { question: 'Why?' },
        ],
      },
      {} as any,
      true,
    );
    expect(story.translations.en!.manifest.quiz).toEqual([
      {
        question: 'What would you build?',
        answers: [],
        correctAnswer: undefined,
        explanation: undefined,
      },
      {
        question: 'Why?',
        answers: [],
        correctAnswer: undefined,
        explanation: undefined,
      },
    ]);
  });
  it('wraps existing stories in silent cover/end pages without changing their content', async () => {
    const story = await toStory(doc, {} as any, true);
    const m = story.translations.en!.manifest;
    expect(m.pages.map((p) => p.kind)).toEqual(['cover', undefined, 'end']);
    expect(m.pages[1].text).toBe('Hello');
    expect(m.pages[0].text).toBe('');
    expect(m.pages[0].narration).toBeUndefined();
    expect(m.pages[2].illustration.id).toBe('image');
    expect(assetsOf(m)).toHaveLength(2);
  });
  it('includes bookend voice over, localized illustration, music and effects without timings', async () => {
    const localized = { ...image, id: 'localized', hash: 'localized-hash' };
    const story = await toStory(
      {
        ...doc,
        translations: [
          {
            language: 'es',
            title: 'Test ES',
            description: 'Test ES',
            cover: image,
          },
        ],
        pages: doc.pages.map((p) => ({
          ...p,
          translations: [{ ...p.defaultNarration, language: 'es' }],
        })),
        coverPage: {
          illustration: image,
          defaultNarration: { narration: audio, durationMs: 1000 },
          music: { asset: audio },
          effects: [{ asset: audio, atMs: 0, volume: 0.5, animation: true }],
        },
        endPage: {
          translations: [
            {
              language: 'es',
              illustration: localized,
              narration: audio,
              durationMs: 1000,
            },
          ],
        },
      },
      {} as any,
      true,
    );
    const m = story.translations.en!.manifest;
    expect(m.pages[0].narration?.id).toBe('audio');
    expect(m.pages[0].timings).toEqual([]);
    expect(m.pages[0].music?.asset.id).toBe('audio');
    expect(m.pages[0].effects).toHaveLength(1);
    expect(story.translations.es!.manifest.pages[2].illustration.id).toBe(
      'localized',
    );
    expect(() =>
      validatePublished({
        ...m,
        pages: [{ ...m.pages[1], narration: undefined }],
      }),
    ).toThrow();
    expect(() =>
      validatePublished({
        ...m,
        pages: [
          {
            ...m.pages[0],
            narration: {
              ...m.pages[0].narration,
              id: 'pending',
              hash: 'pending-hash',
              ready: false,
            },
          },
        ],
      }),
    ).toThrow();
  });
});

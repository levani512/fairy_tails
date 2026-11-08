import { describe, it, expect } from 'vitest';
import {
  catalog,
  authorize,
  resolveVariant,
  decision,
  type AccessContext,
} from '../packages/access/src/index';
import {
  validatePublished,
  type Asset,
  type Story,
  type HomeVariant,
  type Manifest,
} from '../packages/shared/src/index';
import {
  activeWord,
  textSegments,
  CueTimeline,
  nextPage,
} from '../packages/story-player/src/index';
import { apiData, allowedAsset } from '../apps/cms/src/api';
export const asset: Asset = {
  id: 'a',
  url: 'https://test.invalid/a',
  hash: 'a'.repeat(64),
  bytes: 4,
  mime: 'image/webp',
  ready: true,
};
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
      illustration: asset,
      narration: { ...asset, mime: 'audio/wav' },
      durationMs: 1000,
      timings: [
        { index: 0, text: 'Hello', offset: 0, startMs: 0, endMs: 300 },
        { index: 1, text: 'world', offset: 8, startMs: 500, endMs: 900 },
      ],
      effects: [],
    },
  ],
});
export const story: Story = {
  id: 's',
  slug: 'test',
  status: 'published',
  updatedAt: '2026-11-07T00:00:00.000Z',
  minAge: 2,
  maxAge: 4,
  tags: ['magic'],
  access: 'free',
  translations: {
    en: { title: 'Test', description: 'Test', cover: asset, manifest },
  },
};
export const home: HomeVariant = {
  id: 'global',
  name: 'Global',
  active: true,
  countries: [],
  channels: ['web'],
  priority: 0,
  fallback: true,
  include: [],
  exclude: [],
  entries: [],
};
const context: AccessContext = {
  country: 'US',
  channel: 'web',
  premium: false,
  language: 'en',
};
describe('content validation', () => {
  it('authorizes distinct media records with identical content hashes', () => {
    const copy = structuredClone(story);
    copy.translations.en!.manifest.pages[0].poster = {
      ...asset,
      id: 'duplicate',
    };
    expect(allowedAsset(copy, context, [home], 'a')?.id).toBe('a');
    expect(allowedAsset(copy, context, [home], 'duplicate')?.id).toBe(
      'duplicate',
    );
    expect(allowedAsset(copy, context, [home], 'unrelated')).toBeUndefined();
  });
  it('rejects invalid token offsets', () => {
    const m = structuredClone(manifest);
    m.pages[0].timings[1].offset = 7;
    expect(() => validatePublished(m)).toThrow();
  });
  it('rejects overlapping audio timings', () => {
    const m = structuredClone(manifest);
    m.pages[0].timings[1].startMs = 200;
    expect(() => validatePublished(m)).toThrow();
  });
  it('rejects unready media and duplicate pages', () => {
    const m = structuredClone(manifest);
    m.pages[0].narration!.ready = false;
    expect(() => validatePublished(m)).toThrow();
    m.pages[0].narration!.ready = true;
    m.pages.push(m.pages[0]);
    expect(() => validatePublished(m)).toThrow();
  });
});
describe('regional catalog and enforcement', () => {
  it('uses global fallback and deterministic priority ties', () => {
    expect(resolveVariant([home], context)).toBe(home);
    const v = { ...home, id: 'a', countries: ['US'], priority: 2 };
    expect(resolveVariant([{ ...v, id: 'b' }, home, v], context).id).toBe('a');
  });
  it('filters before paginating and never skips the eleventh item', () => {
    const stories = Array.from({ length: 23 }, (_, i) => ({
      ...story,
      id: `s${i.toString().padStart(2, '0')}`,
      minAge: i % 2 ? 5 : 2,
    }));
    const first = catalog(stories, [home], context, {
      age: 3,
      tags: ['magic'],
    });
    expect(first.items).toHaveLength(10);
    const second = catalog(stories, [home], context, {
      age: 3,
      tags: ['magic'],
      cursor: first.nextCursor!,
    });
    expect(second.items).toHaveLength(2);
    expect(
      new Set([...first.items, ...second.items].map((i) => i.id)).size,
    ).toBe(12);
  });
  it('requires all selected tags', () =>
    expect(
      catalog([story], [home], context, { tags: ['missing'] }).items,
    ).toHaveLength(0));
  it('never allows premium to override geography', () =>
    expect(() =>
      authorize(
        story,
        { ...home, exclude: ['s'] },
        { ...context, premium: true },
      ),
    ).toThrow('region'));
  it('denies missing language and drafts', () => {
    expect(() =>
      decision(story, home, { ...context, language: 'es' }),
    ).toThrow();
    expect(() =>
      authorize({ ...story, status: 'draft' }, home, context),
    ).toThrow();
  });
  it('applies regional Free override to manifest and preview', () => {
    const s = { ...story, access: 'premium' as const };
    expect(() => authorize(s, home, context)).toThrow();
    expect(
      authorize(
        s,
        {
          ...home,
          entries: [
            { storyId: 's', access: 'free', featured: false, order: 0 },
          ],
        },
        context,
      ).access,
    ).toBe('free');
  });
  it('protects both manifest endpoints against client premium query', async () => {
    const repo = {
      stories: async () => [{ ...story, access: 'premium' as const }],
      homes: async () => [home],
      tags: async () => [],
    };
    for (const path of ['manifest', 'download-manifest'])
      await expect(
        apiData(
          `stories/s/${path}`,
          new URL('https://test.invalid?premium=true'),
          repo,
          context,
        ),
      ).rejects.toThrow('Premium');
  });
});
describe('playback timeline', () => {
  it('preserves punctuation, double spaces and line breaks exactly', () =>
    expect(
      textSegments(manifest.pages[0].text, manifest.pages[0].timings)
        .map((s) => s.text)
        .join(''),
    ).toBe(manifest.pages[0].text));
  it('follows position after seeking backwards and pauses', () => {
    const t = manifest.pages[0].timings;
    expect(activeWord(t, 600)).toBe(1);
    expect(activeWord(t, 600)).toBe(1);
    expect(activeWord(t, 100)).toBe(0);
    expect(activeWord(t, 400)).toBe(-1);
    expect(activeWord(t, 1000)).toBe(-1);
  });
  it('replays animation cues independently of narration', () => {
    const animation = new CueTimeline(),
      narration = new CueTimeline(),
      cues = [{ atMs: 100 }];
    expect(animation.advance(200, cues)).toEqual([0]);
    expect(narration.advance(200, cues)).toEqual([0]);
    animation.reset();
    expect(animation.advance(200, cues)).toEqual([0]);
    expect(narration.advance(250, cues)).toEqual([]);
  });
  it('finishes only after the final page', () => {
    expect(nextPage(0, 2)).toEqual({ complete: false, index: 1 });
    expect(nextPage(1, 2)).toEqual({ complete: true, index: 1 });
  });
});

import 'dotenv/config';
import { getPayload } from 'payload';
import config from './payload.config';
import { generateDemo } from '../../../scripts/demo-data';
import { resolve } from 'node:path';
const cmsDirectory = process.cwd();
process.chdir(resolve(cmsDirectory, '../..'));
const demo = await generateDemo();
process.chdir(cmsDirectory);
const payload = await getPayload({ config });
if ((await payload.count({ collection: 'stories' })).totalDocs)
  throw new Error(
    'Seed only runs on an empty story collection; existing content was left untouched.',
  );
const media = new Map<string, number | string>();
for (const [key, item] of demo.assets) {
  const kind = item.asset.mime.startsWith('image')
    ? 'image'
    : item.asset.mime.startsWith('video')
      ? 'video'
      : key.startsWith('voice')
        ? 'narration'
        : key === 'music.wav'
          ? 'music'
          : 'effect';
  const doc = await payload.create({
    collection: 'media',
    data: { alt: key, kind, processing: 'ready' },
    filePath: item.file,
    context: { processed: true },
  });
  media.set(key, doc.id);
}
const tags = new Map<string, number | string>();
for (const t of demo.tags) {
  const d = await payload.create({
    collection: 'tags',
    locale: 'en',
    data: {
      identifier: t.id,
      label: t.labels.en ?? t.id,
      active: true,
      order: t.order,
    },
  });
  tags.set(t.id, d.id);
  for (const language of ['es', 'ka'] as const)
    await payload.update({
      collection: 'tags',
      id: d.id,
      locale: language,
      data: { label: t.labels[language] },
    });
}
const stories = new Map<string, number | string>();
for (const s of demo.stories) {
  const t = s.translations.en!,
    m = t.manifest;
  const d = await payload.create({
    collection: 'stories',
    data: {
      name: t.title,
      slug: s.slug,
      status: 'draft',
      minAge: s.minAge,
      maxAge: s.maxAge,
      tags: s.tags.map((t) => tags.get(t)),
      access: s.access,
      defaultCover: media.get(t.cover.id),
      translations: Object.entries(s.translations).map(([language, t]) => ({
        language,
        title: t.title,
        description: t.description,
      })),
      music: m.music
        ? { ...m.music, asset: media.get(m.music.asset.id) }
        : undefined,
      pages: m.pages.map((p, pageIndex) => ({
        name: p.name,
        illustration: media.get(p.illustration.id),
        video: p.video ? media.get(p.video.id) : undefined,
        poster: p.poster ? media.get(p.poster.id) : undefined,
        fit: p.fit,
        layout: p.layout,
        transition: p.transition,
        transitionMs: p.transitionMs,
        effects: p.effects.map((e) => ({ ...e, asset: media.get(e.asset.id) })),
        translations: Object.entries(s.translations).map(([language, t]) => {
          const localized = t.manifest.pages[pageIndex];
          return {
            language,
            text: localized.text,
            narration: localized.narration ? media.get(localized.narration.id) : undefined,
            durationMs: localized.durationMs,
            delayMs: localized.delayMs,
            timings: localized.timings,
          };
        }),
      })),
    } as any,
  });
  await payload.update({
    collection: 'stories',
    id: d.id,
    data: { status: 'published' },
  });
  stories.set(s.id, d.id);
}
for (const h of demo.homes)
  await payload.create({
    collection: 'homes',
    data: {
      ...h,
      id: undefined,
      include: h.include.map((id) => stories.get(id)),
      exclude: h.exclude.map((id) => stories.get(id)),
      entries: h.entries.map((e) => ({ ...e, story: stories.get(e.storyId) })),
    } as any,
  });
console.log(
  'Seeded 12 playable fixtures in English, Spanish and Georgian, 3 multilingual tags, and 3 Home variants. Create the first admin at /admin.',
);
await payload.destroy();

process.exit(0);

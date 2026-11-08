import 'dotenv/config';
import { getPayload } from 'payload';
import config from './payload.config';
import { generateDemo } from '../../../scripts/demo-data';
const demo = await generateDemo(),
  payload = await getPayload({ config });
try {
  const media = new Map<string, number>();
  for (const [key, item] of demo.assets) {
    if (!/^voice-(es|ka)-/.test(key)) continue;
    const existing = await payload.find({
      collection: 'media',
      where: { hash: { equals: item.asset.hash } },
      limit: 1,
    });
    const doc =
      existing.docs[0] ??
      (await payload.create({
        collection: 'media',
        data: { alt: key, kind: 'narration', processing: 'ready' },
        filePath: item.file,
        context: { processed: true },
      }));
    media.set(key, doc.id);
  }
  for (const source of demo.stories) {
    const existing = await payload.find({
      collection: 'stories',
      where: { slug: { equals: source.slug } },
      depth: 0,
      limit: 1,
    });
    const story = existing.docs[0];
    if (!story) continue;
    if (
      (story.translations ?? []).every(
        (t) => t.language !== 'es' && t.language !== 'ka',
      ) &&
      'contentVersion' in story &&
      story.contentVersion === 2
    ) {
      const translations = [
        ...(story.translations ?? []),
        ...(['es', 'ka'] as const).map((language) => ({
          language,
          title: source.translations[language]!.title,
          description: source.translations[language]!.description,
        })),
      ];
      const pages = (story.pages ?? []).map((p, index) => ({
        ...p,
        translations: [
          ...(p.translations ?? []),
          ...(['es', 'ka'] as const).map((language) => {
            const page = source.translations[language]!.manifest.pages[index];
            return {
              language,
              text: page.text,
              narration: page.narration ? media.get(page.narration.id) : undefined,
              durationMs: page.durationMs,
              delayMs: page.delayMs,
              timings: page.timings,
            };
          }),
        ],
      }));
      await payload.update({
        collection: 'stories',
        id: story.id,
        data: { translations, pages } as any,
      });
      console.log(`Added Spanish/Georgian to ${story.slug}`);
    } else console.log(`Preserved ${story.slug}: already localized or edited`);
  }
} finally {
  await payload.destroy();
}

process.exit(0);

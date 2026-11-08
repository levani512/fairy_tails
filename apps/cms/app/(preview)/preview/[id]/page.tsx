import { headers } from 'next/headers';
import { getPayload } from 'payload';
import config from '@payload-config';
import { toStory } from '../../../../src/content';
import Preview from './preview';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  if (!user) return <a href="/admin/login">Sign in to preview drafts</a>;
  const doc = await payload.findByID({
    collection: 'stories',
    id: (await params).id,
    depth: 3,
    user,
    overrideAccess: false,
  });
  const story = await toStory(doc, payload);
  const translations = Object.values(story.translations);
  for (const t of translations)
    for (const p of t.manifest.pages) {
      for (const a of [p.illustration, p.video, p.poster, p.narration])
        if (a) {
          const m: any = await payload.findByID({
            collection: 'media',
            id: a.id,
            user,
            overrideAccess: false,
          });
          a.url = m.url;
        }
    }
  return (
    <>
      <h1>Draft preview: {story.slug}</h1>
      <p>
        Only complete languages appear. Other languages need text, narration,
        valid timings, and ready media on every page.
      </p>
      {translations.map((t) => (
        <Preview key={t.manifest.language} manifest={t.manifest} />
      ))}
    </>
  );
}

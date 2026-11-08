import 'dotenv/config';
import assert from 'node:assert/strict';
import { getPayload } from 'payload';
import config from './payload.config';
import { toStory } from './content';
const payload = await getPayload({ config });
let id: number | undefined;
try {
  const source = (
    await payload.find({
      collection: 'stories',
      where: { status: { equals: 'published' } },
      limit: 1,
      depth: 0,
    })
  ).docs[0];
  assert.ok(source);
  const data = JSON.parse(
    JSON.stringify(source, (key, value) => (key === 'id' ? undefined : value)),
  );
  delete data.updatedAt;
  delete data.createdAt;
  const narration = source.pages?.find(
    (p) => p.defaultNarration?.narration,
  )?.defaultNarration;
  assert.ok(narration?.narration);
  const saved = await payload.create({
    collection: 'stories',
    data: {
      ...data,
      status: 'draft',
      slug: `bookend-check-${Date.now()}`,
      coverPage: {
        transition: 'fade',
        illustration: source.defaultCover,
        defaultNarration: { narration: narration.narration },
      },
      endPage: { transition: 'fade', illustration: source.defaultCover },
    },
  });
  id = saved.id;
  assert.ok((saved.coverPage.defaultNarration?.durationMs ?? 0) > 0);
  const result = await toStory(saved, payload, true);
  const pages = result.translations[source.defaultLanguage!]!.manifest.pages;
  assert.equal(pages[0].kind, 'cover');
  assert.ok(pages[0].narration);
  assert.equal(pages.at(-1)?.kind, 'end');
  assert.equal(pages.length, (source.pages?.length ?? 0) + 2);
  console.log(
    'PASS: saved Cover/End fields, inferred voice-over duration and generated playable sequence.',
  );
} finally {
  if (id) await payload.delete({ collection: 'stories', id });
  await payload.destroy();
}

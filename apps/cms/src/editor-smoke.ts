import 'dotenv/config';
import assert from 'node:assert/strict';
import { getPayload } from 'payload';
import config from './payload.config';
import { toStory } from './content';
const payload = await getPayload({ config });
let storyId: number | undefined;
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
  const chosenDate = '2025-06-03T10:00:00.000Z';
  const data = JSON.parse(
    JSON.stringify(source, (key, value) => (key === 'id' ? undefined : value)),
  );
  delete data.updatedAt;
  delete data.createdAt;
  const created = await payload.create({
    collection: 'stories',
    data: {
      ...data,
      name: 'Editor smoke story',
      slug: `editor-smoke-${Date.now()}`,
      publishedAt: chosenDate,
    },
  });
  storyId = created.id;
  assert.equal(created.publishedAt, chosenDate);
  assert.equal('contentVersion' in created, false);
  const saved = await payload.update({
    collection: 'stories',
    id: created.id,
    data: { name: 'Editor smoke story updated' },
  });
  assert.equal(saved.publishedAt, chosenDate);
  assert.ok(Date.parse(saved.updatedAt) > Date.parse(created.updatedAt));
  const domain = await toStory(saved, payload, true);
  assert.equal(domain.updatedAt, saved.updatedAt);
  assert.equal(domain.translations.en?.manifest.updatedAt, saved.updatedAt);
  assert.equal(
    domain.translations.en?.thumbnail?.id,
    domain.translations.en?.cover.id,
  );
  const thumbnailId = data.defaultCover;
  const withThumbnail = await payload.update({
    collection: 'stories',
    id: created.id,
    data: { defaultThumbnail: thumbnailId },
  });
  const thumbnailStory = await toStory(withThumbnail, payload, true);
  assert.equal(
    thumbnailStory.translations.en?.thumbnail?.id,
    String(thumbnailId),
  );
  assert.equal(
    thumbnailStory.translations.en?.cover.id,
    domain.translations.en?.cover.id,
  );
  const previewResponse = await fetch(
    `http://localhost:3000/api/v1/stories/${created.id}/preview?language=en`,
  );
  assert.equal(previewResponse.status, 200);
  const publicPreview = (await previewResponse.json()).data;
  assert.equal(publicPreview.thumbnail.id, String(thumbnailId));
  assert.equal((await fetch(publicPreview.thumbnail.url)).status, 200);
  const changedDate = '2024-01-02T00:00:00.000Z';
  const edited = await payload.update({
    collection: 'stories',
    id: created.id,
    data: { publishedAt: changedDate },
  });
  assert.equal(edited.publishedAt, changedDate);
  const browserTags = await payload.find({
    collection: 'tags',
    where: { identifier: { equals: 'editor-smoke-tag' } },
    limit: 10,
  });
  if (!browserTags.docs.length)
    browserTags.docs.push(
      await payload.create({
        collection: 'tags',
        data: { identifier: 'Editor Smoke Tag', label: 'Editor smoke tag' },
      }),
    );
  assert.equal(
    browserTags.docs.length,
    1,
    'Browser create/reuse must yield one tag',
  );
  const tagged = await payload.update({
    collection: 'stories',
    id: created.id,
    data: { tags: [browserTags.docs[0].id] },
  });
  assert.ok(
    tagged.tags?.some(
      (t) => (typeof t === 'object' ? t.id : t) === browserTags.docs[0].id,
    ),
  );
  console.log(
    'PASS: editable publication dates survive saves, update timestamps advance and reach manifests, content counter removed, inline tag creation/reuse and relationship persistence.',
  );
} finally {
  if (storyId) await payload.delete({ collection: 'stories', id: storyId });
  const testTags = await payload.find({
    collection: 'tags',
    where: { identifier: { equals: 'editor-smoke-tag' } },
  });
  for (const tag of testTags.docs)
    await payload.delete({ collection: 'tags', id: tag.id });
  await payload.destroy();
}
process.exit(0);

import 'dotenv/config';
import assert from 'node:assert/strict';
import { getPayload } from 'payload';
import config from './payload.config';
import { toStory } from './content';

const payload = await getPayload({ config });
const createdCharacters: number[] = [];
let storyId: number | undefined;
try {
  const image = (
    await payload.find({
      collection: 'media',
      where: {
        and: [
          { mimeType: { contains: 'image/' } },
          { processing: { equals: 'ready' } },
        ],
      },
      limit: 1,
    })
  ).docs[0];
  assert.ok(image);
  const categories = (
    await payload.find({ collection: 'categories', limit: 2 })
  ).docs;
  assert.equal(categories.length, 2);
  for (const name of ['Taxonomy smoke A', 'Taxonomy smoke B']) {
    const character = await payload.create({
      collection: 'characters',
      data: { name, image: image.id, active: true },
    });
    createdCharacters.push(character.id);
  }
  const story = await payload.create({
    collection: 'stories',
    data: {
      name: 'Taxonomy smoke',
      title: 'Taxonomy smoke',
      slug: `taxonomy-smoke-${Date.now()}`,
      status: 'draft',
      defaultLanguage: 'en',
      minAge: 2,
      maxAge: 6,
      access: 'free',
      coverPage: { transition: 'fade' },
      endPage: { transition: 'fade' },
      categories: categories.map((c) => c.id),
      characters: createdCharacters,
    },
  });
  storyId = story.id;
  const domain = await toStory(
    await payload.findByID({ collection: 'stories', id: story.id, depth: 1 }),
    payload,
  );
  assert.deepEqual(domain.characters, createdCharacters.map(String));
  assert.deepEqual(
    domain.categories,
    categories.map((c) => String(c.id)),
  );
  const publicCharacters = await (
    await fetch('http://localhost:3000/api/v1/characters')
  ).json();
  const character = publicCharacters.data.find(
    (c: any) => c.id === String(createdCharacters[0]),
  );
  assert.ok(character?.image.url);
  const delivered = await fetch(character.image.url);
  assert.equal(delivered.status, 200);
  assert.ok(delivered.headers.get('content-type')?.startsWith('image/'));
  await payload.update({
    collection: 'characters',
    id: createdCharacters[0],
    data: { active: false },
  });
  assert.equal((await fetch(character.image.url)).status, 404);
  await assert.rejects(
    payload.create({
      collection: 'characters',
      data: { name: 'Invalid missing image' } as any,
    }),
  );
  console.log(
    'PASS: multiple categories/characters saved, previews mapped, public image delivered, inactive image blocked, required image validated.',
  );
} finally {
  if (storyId) await payload.delete({ collection: 'stories', id: storyId });
  for (const id of createdCharacters)
    await payload.delete({ collection: 'characters', id });
  await payload.destroy();
}

import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { getPayload } from 'payload';
import config from './payload.config';
import { parentHandler } from './parent-api';
const payload = await getPayload({ config });
const ids: number[] = [];
const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:8081';
async function call(
  path: string,
  token?: string,
  data?: unknown,
  requestOrigin = origin,
) {
  return parentHandler(
    new Request(`http://localhost:3000/api/parent/${path}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: {
        origin: requestOrigin,
        ...(token ? { cookie: `ft_parent=${token}` } : {}),
        'Content-Type': 'application/json',
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }),
    path.split('/'),
  );
}
try {
  const tokens: string[] = [];
  for (let i = 0; i < 2; i++) {
    const parent = await payload.create({
      collection: 'parent-accounts',
      data: { identity: `test:${randomUUID()}`, provider: 'google' },
    });
    ids.push(parent.id);
    const token = randomBytes(32).toString('base64url');
    tokens.push(token);
    await payload.create({
      collection: 'parent-sessions',
      data: {
        parent: parent.id,
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      },
    });
  }
  assert.equal((await call('family')).status, 401);
  assert.equal(
    (await call('family', tokens[0], undefined, 'https://untrusted.example'))
      .status,
    403,
  );
  const child = {
    id: randomUUID(),
    name: 'Smoke test child',
    icon: '🦊',
    age: 5,
    interests: ['Nature'],
    language: 'en',
  };
  assert.equal(
    (await call('child', tokens[0], { ...child, age: -1 })).status,
    400,
  );
  assert.equal((await call('child', tokens[0], child)).status, 200);
  assert.equal(
    (await (await call('family', tokens[1])).json()).children.length,
    0,
  );
  const attempt = {
    id: randomUUID(),
    childId: child.id,
    storyId: 'test',
    storyTitle: 'Test',
    language: 'en',
    completedAt: new Date().toISOString(),
    answers: [
      { question: 'Why?' },
      { question: 'How many?', selected: '3', correct: true },
    ],
  };
  assert.equal((await call('attempt', tokens[1], attempt)).status, 404);
  assert.equal((await call('attempt', tokens[0], attempt)).status, 200);
  assert.equal((await call('attempt', tokens[0], attempt)).status, 200);
  const family = await (await call('family', tokens[0])).json();
  assert.equal(family.children[0].name, child.name);
  assert.equal(family.attempts.length, 1);
  assert.equal((await call('logout', tokens[0], {})).status, 200);
  assert.equal((await call('family', tokens[0])).status, 401);
  await assert.rejects(
    payload.find({
      collection: 'parent-accounts',
      overrideAccess: false,
      user: null,
    }),
  );
  console.log(
    'PASS: child persistence, account isolation, CSRF origin checks, attempt deduplication, logout, and private collection access.',
  );
} finally {
  for (const parent of ids) {
    for (const collection of [
      'quiz-attempts',
      'child-profiles',
      'parent-sessions',
    ] as const)
      await payload.delete({
        collection,
        where: { parent: { equals: parent } },
      });
    await payload.delete({ collection: 'parent-accounts', id: parent });
  }
  await payload.destroy();
}
process.exit(0);

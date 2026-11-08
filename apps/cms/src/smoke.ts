import 'dotenv/config';
import { getPayload } from 'payload';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import config from './payload.config';
const payload = await getPayload({ config });
const password = randomBytes(32).toString('hex'),
  email = `smoke-${Date.now()}@example.invalid`;
const user = await payload.create({
  collection: 'users',
  data: { email, password, name: 'Temporary smoke-test administrator' },
});
let draftId: string | number | undefined;
try {
  const login = await payload.login({
    collection: 'users',
    data: { email, password },
  });
  assert.ok(login.token, 'CMS login must return a token');
  const base = 'http://localhost:3000';
  const home = await fetch(`${base}/api/v1/home?language=en`).then((r) =>
    r.json(),
  );
  assert.equal(home.data.items.length, 10);
  const next = await fetch(
    `${base}/api/v1/home?language=en&cursor=${home.data.nextCursor}`,
  ).then((r) => r.json());
  assert.equal(next.data.items.length, 2);
  const locked = home.data.items.find((s: any) => s.locked);
  assert.ok(locked);
  assert.equal(
    (await fetch(`${base}/api/v1/stories/${locked.id}/manifest?premium=true`))
      .status,
    403,
  );
  assert.equal((await fetch(`${base}/api/stories`)).status, 403);
  const free = home.data.items.find((s: any) => !s.locked),
    manifest = await fetch(`${base}/api/v1/stories/${free.id}/manifest`).then(
      (r) => r.json(),
    );
  assert.equal(manifest.data.pages.length, 5);
  const media = await fetch(manifest.data.pages[0].narration.url);
  assert.equal(media.status, 200);
  assert.ok((await media.arrayBuffer()).byteLength > 1000);
  const range = await fetch(manifest.data.pages[0].video.url, {
    headers: { Range: 'bytes=0-99' },
  });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 100);
  for (const language of ['es', 'ka']) {
    const translated = await fetch(
      `${base}/api/v1/stories/${free.id}/manifest?language=${language}`,
    ).then((r) => r.json());
    assert.equal(translated.data.language, language);
    assert.equal(translated.data.pages.length, 5);
    assert.notEqual(translated.data.pages[0].text, manifest.data.pages[0].text);
  }
  const session = await fetch(`${base}/api/v1/development/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country: 'US', channel: 'web', premium: true }),
  }).then((r) => r.json());
  const premium = await fetch(`${base}/api/v1/stories/${locked.id}/manifest`, {
    headers: { Authorization: `Bearer ${session.data.token}` },
  }).then((r) => r.json());
  assert.equal(premium.data.access, 'premium');
  for (const page of premium.data.pages) {
    assert.equal((await fetch(page.illustration.url)).status, 200);
  }
  assert.equal((await fetch(premium.data.pages[0].narration.url)).status, 200);
  const tampered = new URL(premium.data.pages[0].narration.url);
  tampered.searchParams.set(
    'ticket',
    tampered.searchParams.get('ticket') + 'x',
  );
  assert.equal((await fetch(tampered)).status, 401);
  const raw = await payload.findByID({
    collection: 'stories',
    id: free.id,
    depth: 0,
  });
  const clone: any = {
    ...JSON.parse(
      JSON.stringify(raw, (key, value) => (key === 'id' ? undefined : value)),
    ),
    slug: `smoke-${Date.now()}`,
    status: 'draft',
  };
  const d = await payload.create({ collection: 'stories', data: clone });
  draftId = d.id;
  const broken = structuredClone(d.pages as any[]);
  broken[0].translations[0].timings[0].offset = 9999;
  await assert.rejects(() =>
    payload.update({
      collection: 'stories',
      id: d.id,
      data: { status: 'published', pages: broken },
    }),
  );
  console.log(
    'PASS: CMS login, catalog 10+2 pagination, protected raw CMS API, Premium denial, all three languages, signed development Premium and asset capabilities, audio/video Range delivery, and invalid publishing rejection.',
  );
} finally {
  if (draftId) await payload.delete({ collection: 'stories', id: draftId });
  await payload.delete({ collection: 'users', id: user.id });
  await payload.destroy();
}

process.exit(0);

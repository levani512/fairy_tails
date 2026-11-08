import 'dotenv/config';
import { getPayload } from 'payload';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import config from './payload.config';
const payload = await getPayload({ config });
const email = `save-smoke-${Date.now()}@example.invalid`,
  password = randomBytes(32).toString('hex');
const user = await payload.create({
  collection: 'users',
  data: { email, password },
});
let id: number | undefined;
try {
  const session = await payload.login({
    collection: 'users',
    data: { email, password },
  });
  const headers = {
    Authorization: `JWT ${session.token}`,
    'Content-Type': 'application/json',
  };
  const response = await fetch('http://localhost:3000/api/stories', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      slug: `save-smoke-${Date.now()}`,
      status: 'draft',
      defaultLanguage: 'en',
      title: 'Test',
      description: 'Test',
      translations: [
        { language: 'es', title: 'Prueba', description: 'Prueba' },
      ],
      pages: [
        {
          name: 'Page one',
          defaultNarration: { text: 'Unfinished narration.' },
          translations: [{ language: 'es', text: 'Narración incompleta.' }],
        },
      ],
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  id = body.doc.id;
  assert.equal(body.doc.defaultLanguage, 'en');
  assert.equal(body.doc.title, 'Test');
  assert.equal(body.doc.name, 'Test');
  assert.equal(body.doc.translations[0].language, 'es');
  assert.equal(body.doc.translations[0].title, 'Prueba');
  assert.equal(
    body.doc.pages[0].defaultNarration.text,
    'Unfinished narration.',
  );
  assert.equal(body.doc.pages[0].translations[0].language, 'es');
  const publish = await fetch(`http://localhost:3000/api/stories/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'published' }),
  });
  const failure = await publish.json();
  assert.equal(publish.status, 400, JSON.stringify(failure));
  assert.match(JSON.stringify(failure), /narration audio/);
  assert.match(JSON.stringify(failure), /Choose Draft/);
  const draft = await payload.findByID({ collection: 'stories', id: id! });
  assert.equal(draft.status, 'draft');
  console.log(
    'PASS: incomplete story saves as Draft; publishing returns a readable HTTP 400 validation message; failed publish preserves saved draft.',
  );
} finally {
  if (id) await payload.delete({ collection: 'stories', id });
  await payload.delete({ collection: 'users', id: user.id });
  await payload.destroy();
}
process.exit(0);

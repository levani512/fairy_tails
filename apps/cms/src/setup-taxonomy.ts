import 'dotenv/config';
import { getPayload } from 'payload';
import config from './payload.config';

// Idempotent setup for local databases using Payload's development schema push.
const payload = await getPayload({ config });
for (const [order, name] of [
  'Night Stories',
  'Day Stories',
  'Character Series',
].entries()) {
  const existing = await payload.find({
    collection: 'categories',
    where: { name: { equals: name } },
    limit: 1,
  });
  if (!existing.totalDocs)
    await payload.create({
      collection: 'categories',
      data: { name, order, active: true },
    });
}
console.log(
  'Category setup complete. Existing stories and tags were preserved.',
);
await payload.destroy();

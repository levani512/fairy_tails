import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { processMedia } from './process';
loadEnv({ path: resolve('../../apps/cms/.env') });
process.chdir(resolve('../../apps/cms'));
const { getPayload } = await import('payload'),
  { default: config } = await import('../../../apps/cms/src/payload.config');
const payload = await getPayload({ config });
if (process.env.S3_BUCKET)
  throw new Error(
    'Worker currently supports local source storage only. Configure object-store job staging before enabling S3 processing.',
  );
let stopping = false;
process.on('SIGINT', () => {
  stopping = true;
});
process.on('SIGTERM', () => {
  stopping = true;
});
// Single worker by design. Production deployments need a leased distributed job queue.
while (!stopping) {
  const jobs = await payload.find({
    collection: 'media',
    where: { processing: { equals: 'pending' } },
    limit: 5,
    depth: 0,
  });
  for (const job of jobs.docs) {
    try {
      await processMedia(payload, job, process.cwd());
      console.log(`Processed media ${job.id}`);
    } catch (e) {
      await payload.update({
        collection: 'media',
        id: job.id,
        data: { processing: 'error', processingError: String(e) },
      });
    }
  }
  if (process.argv.includes('--once')) break;
  await new Promise((r) => setTimeout(r, 2000));
}
await payload.destroy();

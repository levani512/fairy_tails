import 'dotenv/config';
import { getPayload } from 'payload';
import config from './payload.config';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { processMedia } from '../../../workers/media/src/process';
const payload = await getPayload({ config });
const created: number[] = [];
try {
  for (const [file, kind] of [
    ['animation.mp4', 'video'],
    ['voice-0.wav', 'narration'],
  ] as const) {
    const media = await payload.create({
      collection: 'media',
      filePath: resolve('../../demo-assets', file),
      data: {} as any,
    });
    created.push(media.id);
    assert.equal(media.processing, 'pending');
    assert.equal(media.kind, kind === 'video' ? 'video' : 'audio');
    assert.equal(media.alt, file.replace(/\.[^.]+$/, '').replace(/-/g, ' '));
    const described = await payload.update({
      collection: 'media',
      id: media.id,
      data: { alt: 'My edited description' },
    });
    assert.equal(described.alt, 'My edited description');
    await processMedia(payload, media, process.cwd());
    const processed = await payload.findByID({
      collection: 'media',
      id: media.id,
      depth: 0,
    });
    assert.equal(processed.processing, 'ready');
    assert.ok((processed.durationMs ?? 0) > 0);
    const bytes = await readFile(resolve('media', processed.filename!));
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      processed.hash,
    );
    if (kind === 'video') {
      assert.ok(processed.generatedPoster);
      created.push(Number(processed.generatedPoster));
    }
  }
  console.log(
    'PASS: video/audio background encoding, media duration, generated poster, ready state and hash integrity.',
  );
} finally {
  for (const id of created) await payload.delete({ collection: 'media', id });
  await payload.destroy();
}

process.exit(0);

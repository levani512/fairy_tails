import type { Payload } from 'payload';
import { resolve, basename } from 'node:path';
import { mkdir, copyFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
async function encode(args: string[]) {
  if (!ffmpeg) throw new Error('FFmpeg is not installed for this platform');
  return new Promise<string>((ok, fail) => {
    let log = '';
    const child = spawn(ffmpeg!, ['-nostdin', '-y', '-threads', '2', ...args], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const timer = setTimeout(() => {
      child.kill();
      fail(new Error('Media processing exceeded two minutes'));
    }, 120000);
    child.stderr.on('data', (chunk) => {
      log = (log + String(chunk)).slice(-20000);
    });
    child.once('error', (e) => {
      clearTimeout(timer);
      fail(e);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) ok(log);
      else fail(new Error(`FFmpeg failed (${code}): ${log.slice(-1500)}`));
    });
  });
}
export async function processMedia(
  payload: Payload,
  job: {
    id: string | number;
    filename?: string | null;
    mimeType?: string | null;
    alt: string;
  },
  cmsDirectory: string,
) {
  if (!job.filename) throw new Error('Original upload missing');
  const video = job.mimeType?.startsWith('video/'),
    input = resolve(cmsDirectory, 'media', basename(job.filename)),
    temporary = resolve(cmsDirectory, '../../.local/media-jobs'),
    output = resolve(temporary, `${job.id}-processed.${video ? 'mp4' : 'wav'}`),
    posterFile = resolve(temporary, `${job.id}-poster.webp`);
  await mkdir(temporary, { recursive: true });
  await mkdir(resolve(cmsDirectory, 'media/originals'), { recursive: true });
  const originalFilename = `${job.id}-${basename(job.filename)}`;
  await copyFile(
    input,
    resolve(cmsDirectory, 'media/originals', originalFilename),
  );
  try {
    const log = await encode(
      video
        ? [
            '-i',
            input,
            '-vf',
            'scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2',
            '-c:v',
            'libx264',
            '-crf',
            '23',
            '-pix_fmt',
            'yuv420p',
            '-movflags',
            '+faststart',
            '-an',
            output,
          ]
        : ['-i', input, '-vn', '-c:a', 'pcm_s16le', '-ar', '44100', output],
    );
    const match = /Duration: (\d+):(\d+):([\d.]+)/.exec(log),
      durationMs = match
        ? (Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])) *
          1000
        : undefined;
    let generatedPoster: number | undefined;
    if (video) {
      await encode(['-i', output, '-frames:v', '1', posterFile]);
      const poster = await payload.create({
        collection: 'media',
        filePath: posterFile,
        data: {
          alt: `${job.alt} — generated poster`,
          kind: 'image',
          processing: 'ready',
        },
        context: { processed: true },
      });
      generatedPoster = Number(poster.id);
    }
    await payload.update({
      collection: 'media',
      id: job.id,
      filePath: output,
      data: {
        processing: 'ready',
        processingError: '',
        durationMs,
        originalFilename,
        generatedPoster,
      },
      context: { processed: true },
    });
  } finally {
    await unlink(output).catch(() => {});
    await unlink(posterFile).catch(() => {});
  }
}

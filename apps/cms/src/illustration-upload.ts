import sharp from 'sharp';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import ffmpeg from 'ffmpeg-static';
import { illustrationSizeError } from '../../../packages/shared/src/illustration';

export async function validateIllustrationFile(data: Buffer, mime: string) {
  let width = 0,
    height = 0;
  if (mime.startsWith('image/')) {
    const metadata = await sharp(data).metadata();
    width = metadata.width ?? 0;
    height = metadata.height ?? 0;
    if ((metadata.orientation ?? 1) >= 5) [width, height] = [height, width];
  } else if (mime.startsWith('video/')) {
    if (!ffmpeg) throw new Error('Video dimension validation is unavailable.');
    const directory = await mkdtemp(join(tmpdir(), 'fairytails-illustration-'));
    try {
      const input = join(directory, 'upload.mp4');
      await writeFile(input, data);
      const log = await new Promise<string>((resolve, reject) => {
        const child = spawn(
          ffmpeg!,
          [
            '-nostdin',
            '-i',
            input,
            '-map',
            '0:v:0',
            '-frames:v',
            '1',
            '-f',
            'null',
            '-',
          ],
          { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
        );
        let output = '';
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error('Video dimension validation timed out.'));
        }, 15000);
        child.stderr.on('data', (chunk) => {
          output = (output + String(chunk)).slice(-24000);
        });
        child.once('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          code === 0
            ? resolve(output)
            : reject(new Error('Cannot read video dimensions.'));
        });
      });
      // The output stream describes the displayed frame after rotation metadata.
      const streams = [
        ...log.matchAll(/Video:[^\r\n]*?\b(\d{2,5})x(\d{2,5})\b/g),
      ];
      const size = streams.at(-1);
      width = Number(size?.[1] ?? 0);
      height = Number(size?.[2] ?? 0);
    } finally {
      if (dirname(resolve(directory)) === resolve(tmpdir()) && basename(directory).startsWith('fairytails-illustration-'))
        await rm(directory, { recursive: true, force: true });
    }
  }
  const error = illustrationSizeError(width, height);
  if (error) throw new Error(error);
}

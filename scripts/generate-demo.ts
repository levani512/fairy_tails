import { generateDemo, assetDir } from './demo-data';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import ffmpeg from 'ffmpeg-static';
await generateDemo();
if (!ffmpeg) throw new Error('FFmpeg not available for this platform');
const result = spawnSync(
  ffmpeg,
  [
    '-y',
    '-loop',
    '1',
    '-i',
    resolve(assetDir, 'cover-0.webp'),
    '-vf',
    "scale=960:780,zoompan=z='min(zoom+0.0007,1.15)':d=150:s=960x780:fps=25",
    '-t',
    '6',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    resolve(assetDir, 'animation.mp4'),
  ],
  { stdio: 'inherit' },
);
if (result.status !== 0) throw new Error('Demo video generation failed');
console.log(
  'Original illustrations, narration, music, chime and MP4 animation ready.',
);

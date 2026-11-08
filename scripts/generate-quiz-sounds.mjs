import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Original synthesized feedback cues, bundled for offline playback.
const dir = fileURLToPath(new URL('../apps/client/assets/', import.meta.url));
mkdirSync(dir, { recursive: true });
for (const [name, notes] of [
  ['correct', [523.25, 659.25, 783.99]],
  ['wrong', [330, 261.63]],
  ['win', [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]],
]) {
  const rate = 22050,
    noteLength = 0.16,
    count = Math.ceil(rate * noteLength * notes.length);
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const time = i / rate,
      n = Math.min(notes.length - 1, Math.floor(time / noteLength)),
      t = time - n * noteLength;
    const envelope = Math.min(1, t / 0.015) * Math.max(0, 1 - t / noteLength);
    buffer.writeInt16LE(
      Math.round(Math.sin(2 * Math.PI * notes[n] * t) * envelope * 8000),
      44 + i * 2,
    );
  }
  writeFileSync(`${dir}/quiz-${name}.wav`, buffer);
}

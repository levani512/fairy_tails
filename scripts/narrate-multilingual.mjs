import initialize from '@echogarden/espeak-ng-emscripten';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../demo-assets/', import.meta.url));
await mkdir(directory, { recursive: true });
const module = await initialize();
const voice = new module.eSpeakNGWorker();
const texts = {
  en: [
    'Under a sleepy moon, a little fox found a golden seed.',
    'She carried it through the forest, where the trees whispered hello.',
    'Beside the river, a kind rabbit helped her plant the seed.',
    'They gave it water, warm wishes, and a little time to grow.',
    'At dawn, a tiny tree sparkled. There was enough wonder for everyone.',
  ],
  es: [
    'Bajo una luna soñolienta, una pequeña zorra encontró una semilla dorada.',
    'La llevó por el bosque, donde los árboles susurraban un saludo.',
    'Junto al río, un conejo amable la ayudó a plantar la semilla.',
    'Le dieron agua, buenos deseos y un poco de tiempo para crecer.',
    'Al amanecer, un pequeño árbol brilló. Había maravillas para todos.',
  ],
  ka: [
    'მთვარის შუქზე პატარა მელამ ოქროს თესლი იპოვა.',
    'მან თესლი ტყეში წაიღო, სადაც ხეები ჩურჩულებდნენ.',
    'მდინარესთან კეთილი კურდღელი თესლის დარგვაში დაეხმარა.',
    'მათ თესლს წყალი დაუსხეს და ზრდას დაელოდნენ.',
    'დილით პატარა ხე გაბრწყინდა. სიხარული ყველას ეყო.',
  ],
};
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(22050, 24);
  b.writeUInt32LE(44100, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => b.writeInt16LE(s, 44 + i * 2));
  return b;
}
for (const [language, pages] of Object.entries(texts)) {
  voice.set_voice(language);
  voice.set_rate(135);
  for (const [index, text] of pages.entries()) {
    const prefix = `voice-${language === 'en' ? '' : `${language}-`}${index}`;
    if (language === 'en') {
      try {
        await access(`${directory}/${prefix}.json`);
        await access(`${directory}/${prefix}.wav`);
        continue;
      } catch {}
    }
    const chunks = [],
      events = [];
    voice.synthesize(text, (samples, marks) => {
      if (samples?.length) chunks.push(Int16Array.from(samples));
      events.push(...marks);
    });
    const length = chunks.reduce((n, c) => n + c.length, 0),
      pcm = new Int16Array(length);
    let cursor = 0;
    for (const chunk of chunks) {
      pcm.set(chunk, cursor);
      cursor += chunk.length;
    }
    const durationMs = (pcm.length / 22050) * 1000;
    const words = events.filter((e) => e.type === 'word' && e.word_length > 0);
    const timings = words.map((e, i) => ({
      index: i,
      offset: e.text_position - 1,
      text: text.slice(
        e.text_position - 1,
        e.text_position - 1 + e.word_length,
      ),
      startMs: e.audio_position,
      endMs: i + 1 < words.length ? words[i + 1].audio_position : durationMs,
    }));
    if (!timings.length || timings.some((t) => !t.text || t.endMs <= t.startMs))
      throw new Error(
        `${language} page ${index}: invalid speech-engine events`,
      );
    await writeFile(`${directory}/${prefix}.wav`, wav(pcm));
    await writeFile(
      `${directory}/${prefix}.json`,
      JSON.stringify({ text, timings, durationMs }, null, 2),
    );
  }
  console.log(
    `Generated ${pages.length} ${language} demonstration narration clips using offline eSpeak. Robotic voices; editorial review needed.`,
  );
}

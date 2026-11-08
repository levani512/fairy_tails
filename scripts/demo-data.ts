import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '../apps/cms/node_modules/sharp/lib/index.js';
import {
  type Story,
  type Asset,
  type HomeVariant,
  type Tag,
  validatePublished,
} from '../packages/shared/src/index';
export const assetDir = fileURLToPath(
  new URL('../demo-assets/', import.meta.url),
);
export const titles = [
  'The Moonlit Seed',
  'A Pocketful of Stars',
  'The Sleepy Forest',
  'Rabbit’s Little Garden',
  'The Kindest Cloud',
  'A Boat for Bear',
  'The Lantern Keeper',
  'Owl and the Quiet Night',
  'The Little Blue Door',
  'A Song for the River',
  'The Brave Little Leaf',
  'Home Before the Moon',
];
export function illustration(i: number) {
  const palettes = [
    ['#183F48', '#AFC7AA', '#EFBA77'],
    ['#5B617E', '#C6BBCE', '#F1C382'],
    ['#396655', '#A5BF8E', '#E7B27C'],
    ['#9B6558', '#E8C5A7', '#E7C474'],
  ];
  const [sky, hill, fox] = palettes[i % 4];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="780" viewBox="0 0 960 780"><rect width="960" height="780" fill="${sky}"/><circle cx="730" cy="150" r="75" fill="#FFE5AE"/><circle cx="755" cy="130" r="65" fill="${sky}"/>${Array.from({ length: 30 }, (_, j) => `<circle cx="${(j * 137 + 31) % 960}" cy="${(j * 83 + 30) % 430}" r="${(j % 3) + 2}" fill="#FFE8BC" opacity=".6"/>`).join('')}<path d="M0 510 Q220 330 480 490 T960 430 V780 H0Z" fill="${hill}"/><path d="M0 650 Q320 420 680 610 T960 550 V780 H0Z" fill="#284D43"/>${[80, 210, 840].map((x, j) => `<path d="M${x} 660V${220 + j * 60}" stroke="#283D38" stroke-width="24"/><path d="M${x - 100} ${460 + j * 40}L${x} ${170 + j * 60}L${x + 100} ${460 + j * 40}Z" fill="#59806B"/>`).join('')}<ellipse cx="510" cy="700" rx="160" ry="24" fill="#183A32" opacity=".4"/><path d="M530 650 Q760 590 700 710 Q590 740 510 700" fill="${fox}"/><path d="M690 641 Q745 690 690 710L650 682Z" fill="#FFF1D7"/><ellipse cx="470" cy="621" rx="84" ry="106" fill="${fox}"/><path d="M387 532 L390 405 L465 480 L550 410 L553 535Z" fill="${fox}"/><path d="M404 510L407 450L440 490Z M501 490L536 450L535 510Z" fill="#5D493C"/><path d="M388 527Q470 560 554 527L470 604Z" fill="#FFF1D7"/><circle cx="428" cy="520" r="7" fill="#273A34"/><circle cx="514" cy="520" r="7" fill="#273A34"/><path d="M460 560 Q470 574 480 560Z" fill="#273A34"/><ellipse cx="470" cy="650" rx="43" ry="57" fill="#FFF1D7"/><path d="M326 700Q323 640 350 620" fill="none" stroke="#D7BD76" stroke-width="5"/><ellipse cx="340" cy="639" rx="19" ry="10" fill="#D7BD76" transform="rotate(-30 340 639)"/></svg>`;
}
function tone(seconds: number, frequency: number) {
  const rate = 22050,
    n = Math.floor(seconds * rate),
    b = Buffer.alloc(44 + n * 2);
  b.write('RIFF');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate,
      fade = Math.min(1, t * 4, (seconds - t) * 4);
    b.writeInt16LE(
      Math.round(
        Math.sin(2 * Math.PI * frequency * t) *
          Math.sin((Math.PI * t) / seconds) *
          1500 *
          fade,
      ),
      44 + i * 2,
    );
  }
  return b;
}
export async function generateDemo(base = 'http://localhost:3001') {
  await mkdir(assetDir, { recursive: true });
  const assets = new Map<string, { asset: Asset; file: string }>();
  async function asset(file: string, mime: string, bytes?: Buffer) {
    if (bytes) await writeFile(resolve(assetDir, file), bytes);
    const data = await readFile(resolve(assetDir, file));
    const a: Asset = {
      id: file,
      url: `${base}/media/${file}`,
      hash: createHash('sha256').update(data).digest('hex'),
      bytes: data.length,
      mime,
      ready: true,
    };
    assets.set(file, { asset: a, file: resolve(assetDir, file) });
    return a;
  }
  const covers = await Promise.all(
    titles.map(async (_, i) =>
      asset(
        `cover-${i}.webp`,
        'image/webp',
        await sharp(Buffer.from(illustration(i)))
          .webp({ quality: 85 })
          .toBuffer(),
      ),
    ),
  );
  const music = await asset('music.wav', 'audio/wav', tone(12, 196)),
    effect = await asset('chime.wav', 'audio/wav', tone(0.7, 784));
  const pages = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const data = JSON.parse(
        (await readFile(resolve(assetDir, `voice-${i}.json`), 'utf8')).replace(
          /^\uFEFF/,
          '',
        ),
      );
      const narration = await asset(`voice-${i}.wav`, 'audio/wav');
      return {
        id: `page-${i}`,
        name: `The seed · ${i + 1}`,
        text: data.text,
        illustration: covers[i],
        narration,
        durationMs: Math.max(...data.timings.map((t: any) => t.endMs)) + 100,
        delayMs: 200,
        timings: data.timings,
        effects: [{ asset: effect, atMs: 800, volume: 0.3, animation: true }],
        fit: 'contain' as const,
        layout: 'below' as const,
        transition: i % 2 ? ('slide' as const) : ('fade' as const),
        transitionMs: 300,
      };
    }),
  );
  let animation: Asset | undefined;
  try {
    await access(resolve(assetDir, 'animation.mp4'));
    animation = await asset('animation.mp4', 'video/mp4');
  } catch {}
  const stories: Story[] = titles.map((title, i) => {
    const id = `tale-${String(i + 1).padStart(2, '0')}`,
      access = i % 4 === 3 ? 'premium' : 'free';
    const manifest = validatePublished({
      id,
      updatedAt: '2026-11-07T00:00:00.000Z',
      language: 'en',
      title,
      pages: pages.map((p, j) => ({
        ...p,
        ...(j === 0 && animation
          ? { video: animation, poster: p.illustration }
          : {}),
      })),
      music: {
        asset: music,
        volume: 0.12,
        loop: true,
        duck: true,
        fadeMs: 500,
      },
      access,
    });
    return {
      id,
      slug: title.toLowerCase().replace(/[^a-z]+/g, '-'),
      status: 'published',
      updatedAt: '2026-11-07T00:00:00.000Z',
      minAge: 2 + (i % 3),
      maxAge: 6,
      tags: [i % 2 ? 'adventure' : 'bedtime', 'friendship'],
      access,
      translations: {
        en: {
          title,
          description:
            'A gentle woodland story about a little fox, a golden seed, and the wonder of sharing. Five quiet moments to enjoy together.',
          cover: covers[i],
          manifest,
        },
      },
    };
  });
  const localizedTitles = {
    es: [
      'La semilla de la luna',
      'Un bolsillo de estrellas',
      'El bosque dormido',
      'El jardín del conejo',
      'La nube más amable',
      'Un barco para oso',
      'El guardián del farol',
      'El búho y la noche',
      'La pequeña puerta azul',
      'Una canción para el río',
      'La hojita valiente',
      'En casa antes de la luna',
    ],
    ka: [
      'მთვარის თესლი',
      'ვარსკვლავები ჯიბეში',
      'მძინარე ტყე',
      'კურდღლის ბაღი',
      'კეთილი ღრუბელი',
      'ნავი დათვისთვის',
      'ფარნის მცველი',
      'ბუ და მშვიდი ღამე',
      'პატარა ლურჯი კარი',
      'სიმღერა მდინარისთვის',
      'მამაცი ფოთოლი',
      'შინ მთვარემდე',
    ],
  };
  for (const language of ['es', 'ka'] as const) {
    const localizedPages = await Promise.all(
      pages.map(async (p, index) => {
        const data = JSON.parse(
          await readFile(
            resolve(assetDir, `voice-${language}-${index}.json`),
            'utf8',
          ),
        );
        return {
          ...p,
          text: data.text,
          timings: data.timings,
          durationMs: data.durationMs,
          narration: await asset(`voice-${language}-${index}.wav`, 'audio/wav'),
          ...(index === 0 && animation
            ? { video: animation, poster: p.illustration }
            : {}),
        };
      }),
    );
    stories.forEach((story, index) => {
      const title = localizedTitles[language][index];
      story.translations[language] = {
        title,
        description:
          language === 'es'
            ? 'Un cuento tranquilo sobre una zorra, una semilla dorada y la alegría de compartir.'
            : 'მშვიდი ზღაპარი პატარა მელაზე, ოქროს თესლსა და მეგობრობაზე.',
        cover: covers[index],
        manifest: validatePublished({
          ...story.translations.en!.manifest,
          language,
          title,
          pages: localizedPages,
        }),
      };
    });
  }
  const channels = ['web', 'mobile', 'unity'] as const;
  const homes: HomeVariant[] = [
    {
      id: 'global',
      name: 'Global Default',
      active: true,
      countries: [],
      channels: [...channels],
      priority: 0,
      fallback: true,
      include: [],
      exclude: [],
      entries: [],
    },
    {
      id: 'us',
      name: 'United States',
      active: true,
      countries: ['US'],
      channels: [...channels],
      priority: 10,
      fallback: false,
      include: [],
      exclude: [],
      entries: [
        { storyId: 'tale-04', access: 'free', featured: true, order: 1 },
      ],
    },
    {
      id: 'es',
      name: 'Spain',
      active: true,
      countries: ['ES'],
      channels: [...channels],
      priority: 10,
      fallback: false,
      include: [],
      exclude: ['tale-12'],
      entries: [
        { storyId: 'tale-04', access: 'premium', featured: false, order: 4 },
      ],
    },
  ];
  const tags: Tag[] = [
    {
      id: 'bedtime',
      labels: { en: '☾ Bedtime', es: 'Buenas noches', ka: 'ძილის წინ' },
      active: true,
      order: 1,
    },
    {
      id: 'adventure',
      labels: { en: '✧ Adventure', es: 'Aventura', ka: 'თავგადასავალი' },
      active: true,
      order: 2,
    },
    {
      id: 'friendship',
      labels: { en: '♡ Friendship', es: 'Amistad', ka: 'მეგობრობა' },
      active: true,
      order: 3,
    },
  ];
  return { stories, homes, tags, assets };
}

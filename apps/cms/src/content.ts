import type { Payload } from 'payload';
import { z } from 'zod';
import { pageVisual } from './page-visual';
import {
  normalizePageNarration,
  pageNarrationLanguages,
} from './page-narration';
import {
  normalizeStoryMetadata,
  storyMetadataLanguages,
} from './story-metadata';
import {
  validatePublished,
  type Asset,
  type Story,
  type HomeVariant,
  type Manifest,
  type Language,
} from '../../../packages/shared/src/index';
export async function toStory(
  doc: any,
  payload: Payload,
  strict = false,
): Promise<Story> {
  doc = normalizePageNarration(normalizeStoryMetadata(doc));
  const resolve = async (value: any): Promise<Asset | undefined> => {
    if (!value) return undefined;
    const m =
      typeof value === 'object'
        ? value
        : await payload.findByID({
            collection: 'media',
            id: value,
            overrideAccess: true,
          });
    return {
      id: String(m.id),
      url: `/api/v1/assets/${m.id}`,
      hash: m.hash ?? '',
      bytes: m.filesize ?? 0,
      mime: m.mimeType ?? '',
      ready: m.processing === 'ready',
    };
  };
  const music = async (m: any) =>
    m?.asset
      ? {
          asset: (await resolve(m.asset))!,
          volume: m.volume ?? 0.2,
          loop: m.loop ?? true,
          duck: m.duck ?? true,
          fadeMs: m.fadeMs ?? 400,
        }
      : undefined;
  const story: Story = {
    id: String(doc.id),
    slug: doc.slug,
    status: doc.status,
    updatedAt: doc.updatedAt ?? new Date().toISOString(),
    minAge: doc.minAge,
    maxAge: doc.maxAge,
    tags: (doc.tags ?? []).map((t: any) => String(t.id ?? t)),
    categories: (doc.categories ?? []).map((t: any) => String(t.id ?? t)),
    characters: (doc.characters ?? []).map((t: any) => String(t.id ?? t)),
    access: doc.access,
    translations: {},
  };
  for (const t of storyMetadataLanguages(doc)) {
    try {
      if (!t.title?.trim() || !t.description?.trim())
        throw new Error('Add a title and description.');
      const storyCover = await resolve(t.cover ?? doc.defaultCover);
      const pages = await Promise.all(
        (doc.pages ?? []).map(async (p: any, i: number) => {
          const l = pageNarrationLanguages(p, doc.defaultLanguage).find(
            (x: any) => x.language === t.language,
          );
          if (!l) throw new Error(`Page ${i + 1}: missing ${t.language}`);
          const missing = [];
          if (
            l.syncState &&
            (l.syncState.text !== l.text ||
              l.syncState.audioId !== String(l.narration?.id ?? l.narration))
          )
            throw new Error(
              `Page ${i + 1}: narration changed. Sync audio with text again.`,
            );
          if (!l.text?.trim()) missing.push('narration text');
          if (!l.narration) missing.push('narration audio');
          if (!(l.durationMs > 0)) missing.push('narration duration');
          if (!Array.isArray(l.timings) || !l.timings.length)
            missing.push('word timings');
          if (missing.length)
            throw new Error(`Page ${i + 1}: add ${missing.join(', ')}.`);
          return {
            id: p.id ?? `page-${i}`,
            name: p.name,
            text: l.text,
            ...pageVisual(
              await resolve(
                l.video ?? l.illustration ?? p.video ?? p.illustration,
              ),
              storyCover,
            ),
            fit: 'contain',
            layout: 'below',
            transition: p.transition,
            transitionMs: p.transitionMs,
            narration: await resolve(l.narration),
            durationMs: l.durationMs,
            delayMs: l.delayMs,
            timings: l.timings,
            music: await music(p.music),
            effects: await Promise.all(
              (p.effects ?? []).map(async (e: any) => ({
                ...e,
                durationMs: e.durationMs || undefined,
                asset: await resolve(e.asset),
              })),
            ),
          };
        }),
      );
      const bookend = async (kind: 'cover' | 'end') => {
        const p = (kind === 'cover' ? doc.coverPage : doc.endPage) ?? {};
        const l =
          pageNarrationLanguages(p, doc.defaultLanguage).find(
            (x: any) => x.language === t.language,
          ) ?? {};
        return {
          id: `bookend-${kind}-${story.id}`,
          kind,
          name: kind === 'cover' ? 'Cover Page' : 'The End Page',
          text: '',
          ...pageVisual(
            (await resolve(l.illustration ?? p.illustration)) ?? storyCover,
            storyCover,
          ),
          narration: await resolve(l.narration),
          durationMs: l.durationMs ?? 0,
          delayMs: l.delayMs ?? 0,
          timings: [],
          transition: p.transition ?? 'fade',
          transitionMs: p.transitionMs ?? 300,
          music: await music(p.music),
          effects: await Promise.all(
            (p.effects ?? []).map(async (e: any) => ({
              ...e,
              durationMs: e.durationMs || undefined,
              asset: await resolve(e.asset),
            })),
          ),
        };
      };
      const manifest = validatePublished({
        id: story.id,
        updatedAt: story.updatedAt,
        language: t.language,
        title: t.title,
        cover: storyCover,
        pages: [await bookend('cover'), ...pages, await bookend('end')],
        music: await music(doc.music),
        quiz: doc.quiz?.length
          ? doc.quiz.map((q: any) => ({
              question: q.question,
              answers: (q.answers ?? []).map((a: any) => a.text),
              correctAnswer: q.answers?.length
                ? q.answers.findIndex((a: any) => a.correct)
                : undefined,
              explanation: q.explanation || undefined,
            }))
          : undefined,
        access: story.access,
      });
      const cover = await resolve(t.cover ?? doc.defaultCover);
      if (!cover?.ready) continue;
      const thumbnail =
        (await resolve(t.thumbnail ?? doc.defaultThumbnail)) ?? cover;
      if (!thumbnail.ready || !thumbnail.mime.startsWith('image/'))
        throw new Error('Thumbnail must be a ready image.');
      story.translations[t.language as Language] = {
        title: t.title,
        description: t.description,
        cover,
        thumbnail,
        manifest,
      };
    } catch (error) {
      if (strict)
        throw new Error(
          `Language ${t.language}: ${error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path[0] === 'pages' && typeof issue.path[1] === 'number' ? `Page ${issue.path[1] + 1}: ${issue.path.slice(2).join('.')}` : issue.path.join('.')}: ${issue.message}`).join('; ') : error instanceof Error ? error.message : String(error)}`,
        ); /* Incomplete languages are never exposed as playable. */
    }
  }
  return story;
}
export function toHome(d: any): HomeVariant {
  return {
    id: String(d.id),
    name: d.name,
    active: d.active,
    countries: d.countries ?? [],
    channels: d.channels ?? [],
    fallback: !!d.fallback,
    priority: d.priority ?? 0,
    include: (d.include ?? []).map((x: any) => String(x.id ?? x)),
    exclude: (d.exclude ?? []).map((x: any) => String(x.id ?? x)),
    entries: (d.entries ?? []).map((e: any) => ({
      storyId: String(e.story.id ?? e.story),
      access: e.access || undefined,
      featured: !!e.featured,
      order: e.order ?? 0,
    })),
  };
}
export function deliveryManifest(
  m: Manifest,
  base: string,
  ticket?: (a: Asset) => string,
) {
  const copy = structuredClone(m);
  const asset = (a: Asset) => {
    a.url = `${base}/assets/${a.id}?story=${encodeURIComponent(m.id)}&language=${m.language}&hash=${a.hash}`;
    if (ticket) a.url += `&ticket=${encodeURIComponent(ticket(a))}`;
  };
  for (const p of copy.pages) {
    [
      p.illustration,
      p.video,
      p.poster,
      p.narration,
      p.music?.asset,
      ...p.effects.map((e) => e.asset),
    ]
      .filter(Boolean)
      .forEach((a) => asset(a!));
  }
  if (copy.music) asset(copy.music.asset);
  return copy;
}

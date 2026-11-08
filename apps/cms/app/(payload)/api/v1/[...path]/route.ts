import { getPayload } from 'payload';
import config from '@payload-config';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
  apiData,
  errorResponse,
  allowedAsset,
  type Repository,
} from '../../../../../src/api';
import { toStory, toHome, deliveryManifest } from '../../../../../src/content';
import {
  preview,
  resolveVariant,
} from '../../../../../../../packages/access/src/index';
import {
  requestContext,
  issueDevelopmentSession,
  assetTicket,
  verifyAssetTicket,
} from '../../../../../src/sessions';
import {
  DomainError,
  languageSchema,
  type Manifest,
} from '../../../../../../../packages/shared/src/index';
export const dynamic = 'force-dynamic';
const counts = new Map<string, { n: number; until: number }>();
export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== process.env.CLIENT_ORIGIN)
      throw new DomainError('INVALID_INPUT', 'Origin not permitted', 403);
    // Single-process limit. Deploy behind a trusted gateway with per-client distributed limiting.
    const key = 'global';
    const now = Date.now();
    let rate = counts.get(key);
    if (!rate || rate.until < now) {
      rate = { n: 0, until: now + 60000 };
      counts.set(key, rate);
    }
    if (++rate.n > 1200)
      return Response.json(
        {
          error: { code: 'INVALID_INPUT', message: 'Please try again shortly' },
        },
        { status: 429 },
      );
    const payload = await getPayload({ config }),
      url = new URL(req.url),
      path = (await params).path.join('/');
    let context = requestContext(req);
    let loaded: Awaited<ReturnType<typeof toStory>>[] | undefined;
    const repo: Repository = {
      stories: async () =>
        loaded ??
        (loaded = await Promise.all(
          (
            await payload.find({
              collection: 'stories',
              where: { status: { equals: 'published' } },
              limit: 1000,
              depth: 3,
              overrideAccess: true,
            })
          ).docs.map((d) => toStory(d, payload)),
        )),
      homes: async () =>
        (
          await payload.find({
            collection: 'homes',
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          })
        ).docs.map(toHome),
      tags: async () =>
        (
          await payload.find({
            collection: 'tags',
            where: { active: { equals: true } },
            locale: 'all',
            limit: 1000,
            overrideAccess: true,
          })
        ).docs.map((d: any) => ({
          id: String(d.id),
          labels: d.label,
          active: d.active,
          order: d.order ?? 0,
        })),
    };
    let response: Response;
    if (path === 'categories' || path === 'characters') {
      const result = await payload.find({
        collection: path,
        where: { active: { equals: true } },
        sort: 'order',
        limit: 1000,
        depth: 1,
        overrideAccess: true,
      });
      const base = `${process.env.SERVER_URL ?? url.origin}/api/v1`;
      const data = result.docs
        .filter(
          (doc: any) =>
            path !== 'characters' ||
            (doc.image?.processing === 'ready' &&
              doc.image?.mimeType?.startsWith('image/')),
        )
        .map((doc: any) => ({
          id: String(doc.id),
          name: doc.name,
          active: doc.active,
          order: doc.order ?? 0,
          ...(path === 'characters'
            ? {
                image: {
                  url: `${base}/character-images/${doc.id}?v=${encodeURIComponent(doc.image.hash ?? doc.updatedAt)}`,
                },
              }
            : {}),
        }));
      response = Response.json(
        { data },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } else if (/^character-images\/\d+$/.test(path)) {
      const character = await payload.findByID({
        collection: 'characters',
        id: path.split('/')[1],
        depth: 1,
        overrideAccess: true,
      });
      const media = character.image;
      if (
        !character.active ||
        typeof media !== 'object' ||
        media.processing !== 'ready' ||
        !media.mimeType?.startsWith('image/') ||
        !media.filename
      )
        throw new DomainError('NOT_FOUND', 'Character image unavailable', 404);
      if (process.env.S3_BUCKET) {
        const { privateObjectURL } = await import('../../../../../src/s3');
        response = new Response(null, {
          status: 307,
          headers: {
            Location: await privateObjectURL(media.filename),
            'Cache-Control': 'private, no-store',
          },
        });
      } else {
        const bytes = await readFile(
          resolve(process.cwd(), 'media', basename(media.filename)),
        );
        response = new Response(bytes, {
          headers: {
            'Content-Type': media.mimeType,
            'Cache-Control': 'private, no-cache',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    } else if (path.startsWith('assets/')) {
      const id = path.split('/')[1],
        storyId = url.searchParams.get('story'),
        language = languageSchema.parse(
          url.searchParams.get('language') ?? 'en',
        );
      const stories = await repo.stories(),
        story = stories.find((s) => s.id === storyId);
      if (!story) throw new DomainError('NOT_FOUND', 'Story not found', 404);
      const ticket = url.searchParams.get('ticket');
      if (ticket)
        context = verifyAssetTicket(ticket, {
          story: story.id,
          asset: id,
          hash: url.searchParams.get('hash') ?? '',
          language,
          cover: url.searchParams.get('cover') === '1',
        });
      const translation = story.translations[language];
      const publicImage = [translation?.cover, translation?.thumbnail].find(
        (a) => a?.id === id,
      );
      let asset;
      if (url.searchParams.get('cover') === '1' && publicImage) {
        preview(
          story,
          resolveVariant(await repo.homes(), { ...context, language }),
          { ...context, language },
        );
        asset = publicImage;
      } else {
        asset = allowedAsset(
          story,
          { ...context, language },
          await repo.homes(),
          id,
        );
      }
      if (!asset || url.searchParams.get('hash') !== asset.hash)
        throw new DomainError('ASSET_MISSING', 'Asset unavailable', 404);
      const media: any = await payload.findByID({
        collection: 'media',
        id,
        overrideAccess: true,
      });
      // Private storage delivery: no direct public bucket URLs. S3 adapter requires its deployment delivery integration.
      if (process.env.S3_BUCKET) {
        const { privateObjectURL } = await import('../../../../../src/s3');
        const redirect = new Response(null, {
          status: 307,
          headers: {
            Location: await privateObjectURL(media.filename),
            'Cache-Control': 'private, no-store',
          },
        });
        if (origin) redirect.headers.set('Access-Control-Allow-Origin', origin);
        return redirect;
      }
      const bytes = await readFile(
        resolve(process.cwd(), 'media', basename(media.filename)),
      );
      const headers: Record<string, string> = {
        'Content-Type': asset.mime,
        'Cache-Control': 'private, max-age=3600',
        'Accept-Ranges': 'bytes',
      };
      const range = req.headers.get('range');
      if (range) {
        const m = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!m)
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${bytes.length}` },
          });
        const start = m[1]
            ? Number(m[1])
            : Math.max(0, bytes.length - Number(m[2])),
          end = m[1]
            ? m[2]
              ? Math.min(Number(m[2]), bytes.length - 1)
              : bytes.length - 1
            : bytes.length - 1;
        if (start > end || start >= bytes.length)
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${bytes.length}` },
          });
        response = new Response(bytes.subarray(start, end + 1), {
          status: 206,
          headers: {
            ...headers,
            'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
            'Content-Length': String(end - start + 1),
          },
        });
      } else
        response = new Response(bytes, {
          headers: { ...headers, 'Content-Length': String(bytes.length) },
        });
    } else {
      let data: any = await apiData(path, url, repo, context);
      const base = `${process.env.SERVER_URL ?? url.origin}/api/v1`;
      if (path.endsWith('/manifest') || path.endsWith('/download-manifest'))
        data = deliveryManifest(data as Manifest, base, (a) =>
          assetTicket(context, data.id, a.id, a.hash, data.language),
        );
      const cover = (p: any) => {
        const image = (a: any) => ({
          ...a,
          url: `${base}/assets/${a.id}?story=${p.id}&language=${url.searchParams.get('language') ?? 'en'}&cover=1&hash=${a.hash}&ticket=${encodeURIComponent(assetTicket(context, p.id, a.id, a.hash, languageSchema.parse(url.searchParams.get('language') ?? 'en'), true))}`,
        });
        return {
          ...p,
          cover: image(p.cover),
          thumbnail: image(p.thumbnail ?? p.cover),
        };
      };
      if (path === 'home') data = { ...data, items: data.items.map(cover) };
      if (path.endsWith('/preview')) data = cover(data);
      response = Response.json(
        { data },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (origin) response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    return response;
  } catch (e) {
    const r = errorResponse(e);
    if (req.headers.get('origin') === process.env.CLIENT_ORIGIN)
      r.headers.set('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN!);
    return r;
  }
}
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':
        process.env.CLIENT_ORIGIN ?? 'http://localhost:8081',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
    },
  });
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const origin = req.headers.get('origin');
  try {
    if (
      (await params).path.join('/') !== 'development/session' ||
      process.env.NODE_ENV === 'production'
    )
      throw new DomainError('NOT_FOUND', 'Endpoint not found', 404);
    if (origin && origin !== process.env.CLIENT_ORIGIN)
      throw new DomainError('INVALID_INPUT', 'Origin not permitted', 403);
    const result = issueDevelopmentSession(await req.json());
    return Response.json(
      { data: result },
      {
        headers: {
          'Cache-Control': 'no-store',
          ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
        },
      },
    );
  } catch (e) {
    const r = errorResponse(e);
    if (origin === process.env.CLIENT_ORIGIN)
      r.headers.set('Access-Control-Allow-Origin', origin!);
    return r;
  }
}

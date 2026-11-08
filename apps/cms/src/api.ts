import { z } from 'zod';
import {
  assetsOf,
  DomainError,
  languageSchema,
  type Story,
  type HomeVariant,
  type Tag,
} from '../../../packages/shared/src/index';
import {
  authorize,
  catalog,
  decision,
  preview,
  resolveVariant,
  type AccessContext,
} from '../../../packages/access/src/index';
export interface Repository {
  stories(): Promise<Story[]>;
  homes(): Promise<HomeVariant[]>;
  tags(): Promise<Tag[]>;
}
export const querySchema = z.object({
  language: languageSchema.default('en'),
  age: z.coerce.number().int().min(2).max(12).optional(),
  tags: z.string().optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});
export async function apiData(
  path: string,
  url: URL,
  repo: Repository,
  context: Omit<AccessContext, 'language'>,
) {
  const q = querySchema.parse(Object.fromEntries(url.searchParams)),
    c = { ...context, language: q.language };
  if (path === 'config')
    return {
      languages: ['en', 'es', 'ka'],
      channel: c.channel,
      country: c.country,
      features: { accounts: false, billing: false },
      development: process.env.NODE_ENV !== 'production',
    };
  if (path === 'tags')
    return (await repo.tags()).sort(
      (a, b) => a.order - b.order || a.id.localeCompare(b.id),
    );
  const [stories, homes] = await Promise.all([repo.stories(), repo.homes()]);
  if (path === 'home')
    return catalog(stories, homes, c, {
      ...q,
      tags: q.tags?.split(',').filter(Boolean),
    });
  const match =
    /^(?:stories\/([^/]+)\/(preview|manifest|download-manifest)|access\/stories\/([^/]+))$/.exec(
      path,
    );
  if (!match) throw new DomainError('NOT_FOUND', 'Endpoint not found', 404);
  const id = match[1] ?? match[3],
    s = stories.find((s) => s.id === id);
  if (!s) throw new DomainError('NOT_FOUND', 'Story not found', 404);
  const v = resolveVariant(homes, c);
  if (match[3]) return decision(s, v, c);
  if (match[2] === 'preview') return preview(s, v, c);
  const m = authorize(s, v, c);
  return {
    ...m,
    offlineUntil:
      m.access === 'premium'
        ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        : undefined,
  };
}
export function errorResponse(e: unknown) {
  if (e instanceof DomainError)
    return Response.json(
      { error: { code: e.code, message: e.message } },
      { status: e.status },
    );
  if (e instanceof z.ZodError)
    return Response.json(
      {
        error: {
          code: 'INVALID_INPUT',
          message: e.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; '),
        },
      },
      { status: 400 },
    );
  console.error(e);
  return Response.json(
    {
      error: {
        code: 'SERVER_FAILURE',
        message: 'Something went wrong. Please try again.',
      },
    },
    { status: 500 },
  );
}
export function allowedAsset(
  story: Story,
  c: AccessContext,
  homes: HomeVariant[],
  assetId: string,
) {
  const m = authorize(story, resolveVariant(homes, c), c);
  return assetsOf(m, 'id').find((a) => a.id === assetId);
}

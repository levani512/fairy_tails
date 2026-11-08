import {
  DomainError,
  type Channel,
  type HomeVariant,
  type Language,
  type Story,
  type Preview,
  type Catalog,
} from '../../shared/src/index';
export type AccessContext = {
  country: string;
  channel: Channel;
  premium: boolean;
  language: Language;
};
export interface AccessProvider {
  resolve(
    session: string | undefined,
  ): Promise<Omit<AccessContext, 'language'>>;
}
export function resolveVariant(
  variants: HomeVariant[],
  c: AccessContext,
): HomeVariant {
  const eligible = variants.filter(
    (v) => v.active && v.channels.includes(c.channel),
  );
  const sorted = (items: HomeVariant[]) =>
    items.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  const variant =
    sorted(eligible.filter((v) => v.countries.includes(c.country)))[0] ??
    sorted(eligible.filter((v) => v.fallback))[0];
  if (!variant)
    throw new DomainError(
      'REGION_UNAVAILABLE',
      'No Home configuration for this channel',
      403,
    );
  return variant;
}
export function decision(s: Story, v: HomeVariant, c: AccessContext) {
  if (s.status !== 'published')
    throw new DomainError('NOT_FOUND', 'Story not found', 404);
  if (
    v.exclude.includes(s.id) ||
    (v.include.length > 0 && !v.include.includes(s.id))
  )
    throw new DomainError(
      'REGION_UNAVAILABLE',
      'This story is unavailable in your region',
      403,
    );
  if (!s.translations[c.language])
    throw new DomainError(
      'LANGUAGE_UNAVAILABLE',
      'Choose another story language',
      404,
    );
  const access = v.entries.find((e) => e.storyId === s.id)?.access ?? s.access;
  return { access, locked: access === 'premium' && !c.premium };
}
export function preview(s: Story, v: HomeVariant, c: AccessContext): Preview {
  const d = decision(s, v, c),
    t = s.translations[c.language]!;
  return {
    id: s.id,
    updatedAt: s.updatedAt,
    title: t.title,
    description: t.description,
    cover: t.cover,
    thumbnail: t.thumbnail ?? t.cover,
    minAge: s.minAge,
    maxAge: s.maxAge,
    tags: s.tags,
    categories: s.categories ?? [],
    characters: s.characters ?? [],
    ...d,
    languages: Object.keys(s.translations) as Language[],
  };
}
export function authorize(s: Story, v: HomeVariant, c: AccessContext) {
  const d = decision(s, v, c);
  if (d.locked)
    throw new DomainError(
      'PREMIUM_REQUIRED',
      'This story needs Premium access',
      403,
    );
  return { ...s.translations[c.language]!.manifest, access: d.access };
}
export function catalog(
  stories: Story[],
  variants: HomeVariant[],
  c: AccessContext,
  q: { age?: number; tags?: string[]; cursor?: string; limit?: number },
): Catalog {
  const variant = resolveVariant(variants, c);
  const rows = stories
    .filter((s) => {
      try {
        decision(s, variant, c);
      } catch {
        return false;
      }
      return (
        (q.age === undefined || (s.minAge <= q.age && s.maxAge >= q.age)) &&
        (!q.tags?.length || q.tags.every((t) => s.tags.includes(t)))
      );
    })
    .sort((a, b) => {
      const ea = variant.entries.find((e) => e.storyId === a.id),
        eb = variant.entries.find((e) => e.storyId === b.id);
      return (
        Number(eb?.featured ?? false) - Number(ea?.featured ?? false) ||
        (ea?.order ?? 10000) - (eb?.order ?? 10000) ||
        a.id.localeCompare(b.id)
      );
    });
  const start = q.cursor ? rows.findIndex((s) => s.id === q.cursor) + 1 : 0;
  if (q.cursor && start === 0)
    throw new DomainError(
      'INVALID_INPUT',
      'Catalog changed; reload the first page',
    );
  const limit = Math.min(10, Math.max(1, q.limit ?? 10)),
    page = rows.slice(start, start + limit);
  return {
    items: page.map((s) => preview(s, variant, c)),
    nextCursor: start + limit < rows.length ? page.at(-1)!.id : null,
    variant: { id: variant.id, name: variant.name },
  };
}

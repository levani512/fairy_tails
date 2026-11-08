import { z } from 'zod';

export const languageSchema = z.enum(['en', 'es', 'ka']);
export type Language = z.infer<typeof languageSchema>;
export const channelSchema = z.enum(['web', 'mobile', 'unity']);
export type Channel = z.infer<typeof channelSchema>;
export const assetSchema = z.object({
  id: z.string(),
  url: z.string().min(1),
  hash: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  mime: z.string(),
  ready: z.boolean(),
});
export type Asset = z.infer<typeof assetSchema>;
export const timingSchema = z
  .object({
    index: z.number().int().nonnegative(),
    text: z.string().min(1),
    offset: z.number().int().nonnegative(),
    startMs: z.number().nonnegative(),
    endMs: z.number().positive(),
  })
  .refine((t) => t.endMs > t.startMs, 'End must follow start');
export type Timing = z.infer<typeof timingSchema>;
export const musicSchema = z.object({
  asset: assetSchema,
  volume: z.number().min(0).max(1).default(0.2),
  loop: z.boolean().default(true),
  duck: z.boolean().default(true),
  fadeMs: z.number().min(0).max(10000).default(400),
});
export const pageSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    kind: z.enum(['cover', 'end']).optional(),
    text: z.string(),
    illustration: assetSchema,
    video: assetSchema.optional(),
    poster: assetSchema.optional(),
    fit: z.enum(['contain', 'cover']).default('contain'),
    layout: z.enum(['below', 'overlay']).default('below'),
    narration: assetSchema.optional(),
    durationMs: z.number().nonnegative(),
    delayMs: z.number().nonnegative().default(0),
    timings: z.array(timingSchema),
    music: musicSchema.optional(),
    effects: z
      .array(
        z.object({
          asset: assetSchema,
          atMs: z.number().nonnegative(),
          volume: z.number().min(0).max(1),
          animation: z.boolean(),
          durationMs: z.number().positive().optional(),
        }),
      )
      .default([]),
    transition: z.enum(['fade', 'slide', 'none']).default('fade'),
    transitionMs: z.number().min(0).max(2000).default(300),
  })
  .superRefine((p, ctx) => {
    if (
      !p.kind &&
      (!p.text.trim() || !p.narration || p.durationMs <= 0 || !p.timings.length)
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Story pages require text, narration, duration and word timings',
      });
    let end = 0,
      offset = 0;
    p.timings.forEach((t, i) => {
      if (
        t.index !== i ||
        t.startMs < end ||
        t.offset < offset ||
        p.text.slice(t.offset, t.offset + t.text.length) !== t.text ||
        t.endMs > p.durationMs
      )
        ctx.addIssue({
          code: 'custom',
          path: ['timings', i],
          message:
            'Timing must match original text, index, order and audio duration',
        });
      end = t.endMs;
      offset = t.offset + t.text.length;
    });
  });
export type Page = z.infer<typeof pageSchema>;
export const quizQuestionSchema = z
  .object({
    question: z.string().trim().min(1),
    answers: z.array(z.string().trim().min(1)).max(6),
    correctAnswer: z.number().int().nonnegative().optional(),
    explanation: z.string().optional(),
  })
  .refine(
    (q) =>
      q.answers.length === 0
        ? q.correctAnswer === undefined
        : q.answers.length >= 2 &&
          q.correctAnswer !== undefined &&
          q.correctAnswer < q.answers.length,
    'Choose a valid correct answer',
  );
export const quizSchema = z.array(quizQuestionSchema).min(1).max(50);
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export const manifestSchema = z.object({
  id: z.string(),
  updatedAt: z.string().datetime(),
  language: languageSchema,
  title: z.string(),
  pages: z.array(pageSchema).min(1).max(202),
  music: musicSchema.optional(),
  quiz: quizSchema.optional(),
  cover: assetSchema.optional(),
  access: z.enum(['free', 'premium']),
  offlineUntil: z.string().datetime().optional(),
});
export type Manifest = z.infer<typeof manifestSchema>;
export type Tag = {
  id: string;
  labels: Partial<Record<Language, string>>;
  active: boolean;
  order: number;
};
export type Category = {
  id: string;
  name: string;
  active: boolean;
  order: number;
};
export type Character = Category & { image: { url: string } };
export type Story = {
  id: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  updatedAt: string;
  minAge: number;
  maxAge: number;
  tags: string[];
  categories?: string[];
  characters?: string[];
  access: 'free' | 'premium';
  translations: Partial<
    Record<
      Language,
      {
        title: string;
        description: string;
        cover: Asset;
        thumbnail?: Asset;
        manifest: Manifest;
      }
    >
  >;
};
export type HomeVariant = {
  id: string;
  name: string;
  active: boolean;
  countries: string[];
  channels: Channel[];
  priority: number;
  fallback: boolean;
  include: string[];
  exclude: string[];
  entries: {
    storyId: string;
    access?: 'free' | 'premium';
    featured: boolean;
    order: number;
  }[];
};
export type Preview = {
  id: string;
  updatedAt: string;
  title: string;
  description: string;
  cover: Asset;
  thumbnail?: Asset;
  minAge: number;
  maxAge: number;
  tags: string[];
  categories?: string[];
  characters?: string[];
  access: 'free' | 'premium';
  locked: boolean;
  languages: Language[];
};
export type Catalog = {
  items: Preview[];
  nextCursor: string | null;
  variant: { id: string; name: string };
};
export type ErrorCode =
  | 'NOT_FOUND'
  | 'REGION_UNAVAILABLE'
  | 'LANGUAGE_UNAVAILABLE'
  | 'PREMIUM_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'ASSET_MISSING'
  | 'INVALID_INPUT'
  | 'SERVER_FAILURE';
export class DomainError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function assetsOf(
  m: Manifest,
  deduplicateBy: 'hash' | 'id' = 'hash',
): Asset[] {
  const assets = m.pages
    .flatMap((p) => [
      p.illustration,
      p.video,
      p.poster,
      p.narration,
      p.music?.asset,
      ...p.effects.map((e) => e.asset),
    ])
    .concat(m.music?.asset, m.cover);
  return [
    ...new Map(
      assets.filter((a): a is Asset => !!a).map((a) => [a[deduplicateBy], a]),
    ).values(),
  ];
}
export function validatePublished(m: unknown): Manifest {
  const parsed = manifestSchema.parse(m);
  for (const p of parsed.pages) {
    if (
      !p.illustration.mime.startsWith('image/') ||
      (p.narration && !p.narration.mime.startsWith('audio/')) ||
      (p.video && p.video.mime !== 'video/mp4') ||
      p.effects.some((e) => !e.asset.mime.startsWith('audio/'))
    )
      throw new DomainError(
        'INVALID_INPUT',
        `Page ${p.name}: media types do not match their tracks`,
      );
  }
  if (new Set(parsed.pages.map((p) => p.id)).size !== parsed.pages.length)
    throw new DomainError('INVALID_INPUT', 'Page IDs must be unique');
  const missing = assetsOf(parsed).filter((a) => !a.ready);
  if (missing.length)
    throw new DomainError(
      'ASSET_MISSING',
      `Media not ready: ${missing.map((a) => a.id).join(', ')}`,
    );
  return parsed;
}
export type ChildProfile = {
  id: string;
  parentId?: string;
  nickname?: string;
  age?: number;
  avatarId?: string;
  interests: string[];
};
export interface ParentIdentity {
  id: string;
  providerSubject: string;
  childIds: string[];
}
export interface LearningEvent {
  id: string;
  profileId: string;
  storyId: string;
  type: 'started' | 'completed' | 'activity-attempt';
  occurredAt: string;
  activityId?: string;
  result?: unknown;
}

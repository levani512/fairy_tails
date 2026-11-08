import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  channelSchema,
  languageSchema,
  DomainError,
} from '../../../packages/shared/src/index';
import type { AccessContext } from '../../../packages/access/src/index';
const contextSchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$|^GLOBAL$/),
  channel: channelSchema,
  premium: z.boolean(),
});
const devSchema = contextSchema.extend({
  kind: z.literal('development'),
  expires: z.number(),
});
const mediaSchema = contextSchema.extend({
  kind: z.literal('media'),
  expires: z.number(),
  story: z.string(),
  asset: z.string(),
  hash: z.string(),
  language: languageSchema,
  cover: z.boolean(),
  development: z.boolean(),
});
function secret() {
  const key = process.env.PAYLOAD_SECRET;
  if (!key || key.length < 32)
    throw new Error('Signing secret is not configured');
  return key;
}
function sign(data: unknown) {
  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}
function verify(token: string) {
  const parts = token.split('.');
  if (parts.length !== 2 || token.length > 3000)
    throw new DomainError('SESSION_EXPIRED', 'Session invalid or expired', 401);
  const expected = createHmac('sha256', secret()).update(parts[0]).digest(),
    actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(expected, actual))
    throw new DomainError('SESSION_EXPIRED', 'Session invalid or expired', 401);
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (!Number.isFinite(data.expires) || data.expires < Date.now())
      throw new Error();
    return data;
  } catch {
    throw new DomainError('SESSION_EXPIRED', 'Session invalid or expired', 401);
  }
}
export function issueDevelopmentSession(value: unknown) {
  if (process.env.NODE_ENV === 'production')
    throw new DomainError('NOT_FOUND', 'Endpoint not found', 404);
  const context = contextSchema.parse(value);
  return {
    token: sign({
      ...context,
      kind: 'development',
      expires: Date.now() + 30 * 60 * 1000,
    }),
    ...context,
  };
}
export function requestContext(req: Request): Omit<AccessContext, 'language'> {
  const auth = req.headers.get('authorization');
  if (auth) {
    if (process.env.NODE_ENV === 'production')
      throw new DomainError(
        'SESSION_EXPIRED',
        'No production session provider is configured',
        401,
      );
    const session = devSchema.parse(verify(auth.replace(/^Bearer /, '')));
    return {
      country: session.country,
      channel: session.channel,
      premium: session.premium,
    };
  }
  return {
    country:
      process.env.NODE_ENV !== 'production'
        ? (process.env.DEV_COUNTRY ?? 'US')
        : (process.env.DEFAULT_COUNTRY ?? 'GLOBAL'),
    channel: channelSchema.parse(process.env.DISTRIBUTION_CHANNEL ?? 'web'),
    premium:
      process.env.NODE_ENV !== 'production' &&
      process.env.DEV_PREMIUM === 'true',
  };
}
export function assetTicket(
  context: Omit<AccessContext, 'language'>,
  story: string,
  asset: string,
  hash: string,
  language: AccessContext['language'],
  cover = false,
) {
  return sign({
    ...context,
    story,
    asset,
    hash,
    language,
    cover,
    kind: 'media',
    development: process.env.NODE_ENV !== 'production',
    expires: Date.now() + 10 * 60 * 1000,
  });
}
export function verifyAssetTicket(
  token: string,
  expected: {
    story: string;
    asset: string;
    hash: string;
    language: string;
    cover: boolean;
  },
) {
  const ticket = mediaSchema.parse(verify(token));
  if (
    (ticket.development && process.env.NODE_ENV === 'production') ||
    Object.entries(expected).some(
      ([k, v]) => ticket[k as keyof typeof ticket] !== v,
    )
  )
    throw new DomainError(
      'SESSION_EXPIRED',
      'Media permission does not match this asset',
      401,
    );
  return {
    country: ticket.country,
    channel: ticket.channel,
    premium: ticket.premium,
  };
}

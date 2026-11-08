import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from './payload.config';
import {
  childSchema,
  quizAttemptSchema,
} from '../../../packages/shared/src/family';

const clientOrigin = () => process.env.CLIENT_ORIGIN ?? 'http://localhost:8081';
const serverOrigin = () => process.env.SERVER_URL ?? 'http://localhost:3000';
const secure = () => serverOrigin().startsWith('https://');
const secret = () => new TextEncoder().encode(process.env.PAYLOAD_SECRET!);
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const cookie = (req: Request, key: string) =>
  req.headers
    .get('cookie')
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${key}=`))
    ?.slice(key.length + 1);
const providers = {
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    jwks: createRemoteJWKSet(
      new URL('https://www.googleapis.com/oauth2/v3/certs'),
    ),
  },
  apple: {
    auth: 'https://appleid.apple.com/auth/authorize',
    token: 'https://appleid.apple.com/auth/token',
    issuer: 'https://appleid.apple.com',
    jwks: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys')),
  },
};
type Provider = keyof typeof providers;
const credentials = (p: Provider) => ({
  id: process.env[`${p.toUpperCase()}_CLIENT_ID`],
  secret: process.env[`${p.toUpperCase()}_CLIENT_SECRET`],
});
const ready = (p: Provider) =>
  !!credentials(p).id && !!credentials(p).secret && (p !== 'apple' || secure());
const callback = (p: Provider) => `${serverOrigin()}/api/parent/callback/${p}`;
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });
function setCookie(
  res: NextResponse,
  name: string,
  value: string,
  maxAge: number,
  sameSite: 'lax' | 'none' = 'lax',
) {
  res.cookies.set(name, value, {
    httpOnly: true,
    secure: secure(),
    sameSite,
    path: '/api/parent',
    maxAge,
  });
}
async function current(req: Request, payload: any) {
  const token = cookie(req, 'ft_parent');
  if (!token) return null;
  const found = await payload.find({
    collection: 'parent-sessions',
    where: {
      and: [
        { tokenHash: { equals: hash(token) } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 1,
    depth: 1,
  });
  const session = found.docs[0];
  return session?.parent && typeof session.parent === 'object' ? session : null;
}
export async function parentHandler(req: Request, path: string[]) {
  const action = path.join('/');
  const origin = req.headers.get('origin');
  const isCallback = action.startsWith('callback/');
  if (!isCallback && origin && origin !== clientOrigin())
    return response({ error: 'Origin not allowed' }, 403);
  if (!isCallback && req.method === 'POST' && origin !== clientOrigin())
    return response({ error: 'Origin required' }, 403);
  let res: NextResponse;
  try {
    if (req.method === 'OPTIONS') res = new NextResponse(null, { status: 204 });
    else if (action === 'config' && req.method === 'GET')
      res = response({ google: ready('google'), apple: ready('apple') });
    else if (action.startsWith('sign-in/') && req.method === 'GET') {
      const p = path[1] as Provider;
      if (!providers[p] || !ready(p))
        return response(
          { error: 'This sign-in provider needs server configuration.' },
          503,
        );
      const state = randomBytes(32).toString('base64url'),
        nonce = randomBytes(32).toString('base64url'),
        verifier = randomBytes(48).toString('base64url');
      const transaction = await new SignJWT({
        state,
        nonce,
        verifier,
        provider: p,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('fairytails-oauth')
        .setAudience('fairytails-oauth')
        .setIssuedAt()
        .setExpirationTime('10m')
        .sign(secret());
      const target = new URL(providers[p].auth);
      target.search = new URLSearchParams({
        client_id: credentials(p).id!,
        redirect_uri: callback(p),
        response_type: 'code',
        scope: p === 'google' ? 'openid email profile' : 'email',
        state,
        nonce,
        ...(p === 'apple'
          ? { response_mode: 'form_post' }
          : {
              code_challenge: createHash('sha256')
                .update(verifier)
                .digest('base64url'),
              code_challenge_method: 'S256',
            }),
      }).toString();
      res = NextResponse.redirect(target);
      setCookie(
        res,
        'ft_oauth',
        transaction,
        600,
        p === 'apple' ? 'none' : 'lax',
      );
    } else if (isCallback && ['GET', 'POST'].includes(req.method)) {
      const p = path[1] as Provider;
      if (!providers[p] || !ready(p))
        throw new Error('Sign-in is not configured');
      const params =
        req.method === 'POST'
          ? new URLSearchParams(await req.text())
          : new URL(req.url).searchParams;
      const saved = cookie(req, 'ft_oauth');
      if (!saved) throw new Error('Sign-in expired');
      const { payload: transaction } = await jwtVerify(saved, secret(), {
        algorithms: ['HS256'],
        issuer: 'fairytails-oauth',
        audience: 'fairytails-oauth',
      });
      const state = params.get('state') ?? '';
      if (
        transaction.provider !== p ||
        typeof transaction.state !== 'string' ||
        state.length !== transaction.state.length ||
        !timingSafeEqual(Buffer.from(state), Buffer.from(transaction.state)) ||
        !params.get('code')
      )
        throw new Error('Invalid sign-in response');
      const tokens = await fetch(providers[p].token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: params.get('code')!,
          client_id: credentials(p).id!,
          client_secret: credentials(p).secret!,
          redirect_uri: callback(p),
          ...(p === 'google'
            ? { code_verifier: String(transaction.verifier) }
            : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!tokens.ok) throw new Error('Provider rejected sign-in');
      const tokenData = await tokens.json();
      const { payload: identity } = await jwtVerify(
        tokenData.id_token,
        providers[p].jwks,
        {
          issuer: providers[p].issuer,
          audience: credentials(p).id!,
          algorithms: ['RS256'],
        },
      );
      if (!identity.sub || identity.nonce !== transaction.nonce)
        throw new Error('Invalid identity');
      const payload = await getPayload({ config });
      const key = `${p}:${identity.sub}`;
      let parent = (
        await payload.find({
          collection: 'parent-accounts',
          where: { identity: { equals: key } },
          limit: 1,
        })
      ).docs[0];
      if (!parent)
        parent = await payload.create({
          collection: 'parent-accounts',
          data: {
            identity: key,
            provider: p,
            email:
              (identity.email_verified === true ||
                identity.email_verified === 'true') &&
              typeof identity.email === 'string'
                ? identity.email
                : undefined,
          },
        });
      const sessionToken = randomBytes(32).toString('base64url');
      await payload.create({
        collection: 'parent-sessions',
        data: {
          tokenHash: hash(sessionToken),
          parent: parent.id,
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
      });
      res = NextResponse.redirect(`${clientOrigin()}/?parents=1`, 303);
      setCookie(res, 'ft_parent', sessionToken, 30 * 86400);
      setCookie(res, 'ft_oauth', '', 0, p === 'apple' ? 'none' : 'lax');
    } else {
      const payload = await getPayload({ config });
      const session = await current(req, payload);
      if (action === 'session' && req.method === 'GET')
        res = response({
          parent: session
            ? {
                id: String(session.parent.id),
                email: session.parent.email,
                provider: session.parent.provider,
              }
            : null,
        });
      else if (!session)
        res = response({ error: 'Please sign in again.' }, 401);
      else {
        const parentId = session.parent.id;
        if (action === 'logout' && req.method === 'POST') {
          await payload.delete({
            collection: 'parent-sessions',
            id: session.id,
          });
          res = response({ ok: true });
          setCookie(res, 'ft_parent', '', 0);
        } else if (action === 'family' && req.method === 'GET') {
          const [children, attempts] = await Promise.all([
            payload.find({
              collection: 'child-profiles',
              where: { parent: { equals: parentId } },
              limit: 100,
              depth: 0,
            }),
            payload.find({
              collection: 'quiz-attempts',
              where: { parent: { equals: parentId } },
              limit: 10000,
              sort: '-createdAt',
              depth: 0,
            }),
          ]);
          res = response({
            children: children.docs.map((d) => d.profile),
            attempts: attempts.docs.map((d) => d.attempt),
          });
        } else if (
          ['child', 'attempt'].includes(action) &&
          req.method === 'POST'
        ) {
          const raw = await req.text();
          if (raw.length > 500000)
            return response({ error: 'Request too large' }, 413);
          const data = (
            action === 'child' ? childSchema : quizAttemptSchema
          ).parse(JSON.parse(raw));
          const collection =
            action === 'child' ? 'child-profiles' : 'quiz-attempts';
          if (action === 'attempt') {
            const child = await payload.find({
              collection: 'child-profiles',
              where: {
                ownerKey: { equals: `${parentId}:${(data as any).childId}` },
              },
              limit: 1,
            });
            if (!child.docs.length)
              return response({ error: 'Child profile not found' }, 404);
          }
          const ownerKey = `${parentId}:${data.id}`;
          const existing = (
            await payload.find({
              collection,
              where: { ownerKey: { equals: ownerKey } },
              limit: 1,
            })
          ).docs[0];
          const field = action === 'child' ? 'profile' : 'attempt';
          if (existing && action === 'child')
            await payload.update({
              collection,
              id: existing.id,
              data: { [field]: data },
            });
          else if (!existing)
            await payload.create({
              collection,
              data: { ownerKey, parent: parentId, [field]: data } as any,
            });
          res = response({ ok: true });
        } else res = response({ error: 'Not found' }, 404);
      }
    }
  } catch {
    if (isCallback) {
      res = NextResponse.redirect(
        `${clientOrigin()}/?parents=1&signin=failed`,
        303,
      );
      setCookie(res, 'ft_oauth', '', 0, secure() ? 'none' : 'lax');
    } else
      res = response(
        {
          error:
            'Unable to save or load this information. Check your entries and try again.',
        },
        400,
      );
  }
  res.headers.set('Access-Control-Allow-Origin', clientOrigin());
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Vary', 'Origin');
  return res;
}

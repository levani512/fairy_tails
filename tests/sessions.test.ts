import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import {
  issueDevelopmentSession,
  requestContext,
  assetTicket,
  verifyAssetTicket,
} from '../apps/cms/src/sessions';
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv(
    'PAYLOAD_SECRET',
    'unit-test-signing-secret-at-least-thirty-two-characters',
  );
});
afterEach(() => vi.unstubAllEnvs());
it('verifies signed development context and rejects modified claims', () => {
  const { token } = issueDevelopmentSession({
    country: 'ES',
    channel: 'unity',
    premium: true,
  });
  expect(
    requestContext(
      new Request('http://localhost', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  ).toEqual({ country: 'ES', channel: 'unity', premium: true });
  const [body, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
  claims.country = 'US';
  const changed = Buffer.from(JSON.stringify(claims)).toString('base64url');
  expect(() =>
    requestContext(
      new Request('http://localhost', {
        headers: { Authorization: `Bearer ${changed}.${signature}` },
      }),
    ),
  ).toThrow();
});
it('refuses development sessions and media tickets in production', () => {
  const { token } = issueDevelopmentSession({
    country: 'US',
    channel: 'web',
    premium: true,
  });
  const ticket = assetTicket(
    { country: 'US', channel: 'web', premium: true },
    's',
    'a',
    'hash',
    'en',
  );
  vi.stubEnv('NODE_ENV', 'production');
  expect(() =>
    issueDevelopmentSession({ country: 'US', channel: 'web', premium: true }),
  ).toThrow();
  expect(() =>
    requestContext(
      new Request('http://localhost', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ),
  ).toThrow();
  expect(() =>
    verifyAssetTicket(ticket, {
      story: 's',
      asset: 'a',
      hash: 'hash',
      language: 'en',
      cover: false,
    }),
  ).toThrow();
});
it('binds media capability to exact story, language, bytes and purpose', () => {
  const ticket = assetTicket(
    { country: 'US', channel: 'web', premium: true },
    's',
    'a',
    'hash',
    'en',
  );
  const expected = {
    story: 's',
    asset: 'a',
    hash: 'hash',
    language: 'en',
    cover: false,
  };
  expect(verifyAssetTicket(ticket, expected).premium).toBe(true);
  for (const changed of [
    { asset: 'b' },
    { story: 'b' },
    { hash: 'changed' },
    { language: 'es' },
    { cover: true },
  ])
    expect(() =>
      verifyAssetTicket(ticket, { ...expected, ...changed }),
    ).toThrow();
});
it('rejects expired sessions', () => {
  vi.useFakeTimers();
  try {
    const { token } = issueDevelopmentSession({
      country: 'US',
      channel: 'web',
      premium: false,
    });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(() =>
      requestContext(
        new Request('http://localhost', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    ).toThrow('expired');
  } finally {
    vi.useRealTimers();
  }
});

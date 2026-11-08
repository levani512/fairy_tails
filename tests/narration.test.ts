import { afterEach, expect, it, vi } from 'vitest';
import { alignmentTimings } from '../apps/cms/src/narration-alignment';
import { narrationEndpoints } from '../apps/cms/src/narration-endpoints';
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => Buffer.from('audio')),
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const handler = narrationEndpoints[0].handler;
function req(action: string, body: any = {}) {
  return {
    user: { id: 1 },
    headers: new Headers(),
    url: 'http://localhost:3000/api/narration/' + action,
    routeParams: { action },
    json: async () => body,
    payload: {
      findByID: vi.fn(async () => ({
        id: 7,
        mimeType: 'audio/mpeg',
        processing: 'ready',
        durationMs: 2000,
        filename: 'test.mp3',
      })),
    },
  } as any;
}
it('maps repeated and Unicode words to exact UTF-16 offsets', () => {
  const result = alignmentTimings(
    '🌙 მელა, მელა!',
    [
      { text: 'მელა', start: 0, end: 0.5 },
      { text: 'მელა', start: 0.6, end: 1 },
    ],
    1100,
  );
  expect(result.map((t) => t.offset)).toEqual([3, 9]);
  expect(result[1].endMs).toBe(1000);
});
it('rejects incomplete, mismatched or overlapping alignment', () => {
  expect(() =>
    alignmentTimings('one two', [{ text: 'two', start: 0, end: 1 }], 1000),
  ).toThrow();
  expect(() =>
    alignmentTimings('one two', [{ text: 'one', start: 0, end: 1 }], 1000),
  ).toThrow();
  expect(() =>
    alignmentTimings(
      'one two',
      [
        { text: 'one', start: 0, end: 1 },
        { text: 'two', start: 0.5, end: 2 },
      ],
      2000,
    ),
  ).toThrow();
});
it('requires an admin and rejects cross-origin calls', async () => {
  expect((await handler({ ...req('voices'), user: null })).status).toBe(401);
  expect(
    (
      await handler({
        ...req('voices'),
        headers: new Headers({ origin: 'https://other.test' }),
      })
    ).status,
  ).toBe(403);
});
it('reports missing configuration without exposing a key', async () => {
  vi.stubEnv('ELEVENLABS_API_KEY', '');
  expect(await (await handler(req('voices'))).json()).toEqual({
    configured: false,
    voices: [],
  });
});
it('lists voices with pagination and returns preview bytes without saving media', async () => {
  vi.stubEnv('ELEVENLABS_API_KEY', 'test-secret');
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        voices: [{ voice_id: 'a', name: 'A' }],
        has_more: true,
        next_page_token: 'next',
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        voices: [{ voice_id: 'b', name: 'B' }],
        has_more: false,
      }),
    )
    .mockResolvedValueOnce(
      new Response('audio', { headers: { 'Content-Type': 'audio/mpeg' } }),
    );
  vi.stubGlobal('fetch', fetcher);
  expect((await (await handler(req('voices'))).json()).voices).toHaveLength(2);
  const result = await handler(
    req('generate', { text: 'Hello', voiceId: 'a' }),
  );
  expect(result.headers.get('Content-Type')).toBe('audio/mpeg');
  expect(await result.text()).toBe('audio');
  expect(fetcher.mock.calls[2][1].headers['xi-api-key']).toBe('test-secret');
});
it('syncs a selected ready upload and returns duration plus source identity', async () => {
  vi.stubEnv('ELEVENLABS_API_KEY', 'test-secret');
  vi.stubEnv('S3_BUCKET', '');
  const fetcher = vi.fn(async () =>
    Response.json({ words: [{ text: 'Hello', start: 0, end: 1 }] }),
  );
  vi.stubGlobal('fetch', fetcher);
  const result = await handler(req('sync', { text: 'Hello', audioId: 7 }));
  const data = await result.json();
  expect(result.status).toBe(200);
  expect(data.syncState).toEqual({ text: 'Hello', audioId: '7' });
  expect(data.durationMs).toBe(2000);
  expect(data.timings[0].offset).toBe(0);
});
it('rejects pending audio and reports provider failures without leaking secrets', async () => {
  vi.stubEnv('ELEVENLABS_API_KEY', 'test-secret');
  const pending = req('sync', { text: 'Hello', audioId: 7 });
  pending.payload.findByID.mockResolvedValue({
    mimeType: 'audio/mpeg',
    processing: 'pending',
  });
  expect((await handler(pending)).status).toBe(400);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('secret provider details', { status: 401 })),
  );
  const failure = await handler(
    req('generate', { text: 'Hello', voiceId: 'a' }),
  );
  expect(await failure.text()).not.toContain('test-secret');
});

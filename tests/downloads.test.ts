import { describe, it, expect } from 'vitest';
import {
  DownloadManager,
  prioritizedAssets,
  type AssetStore,
} from '../packages/asset-manager/src/index';
import { manifest } from './fixtures';
function setup() {
  const bytes = new Set<string>(),
    meta = new Map<string, string>();
  const store: AssetStore = {
    has: async (a) => bytes.has(a.hash),
    put: async (a) => {
      bytes.add(a.hash);
    },
    resolve: async (a) => (bytes.has(a.hash) ? 'local:' + a.hash : a.url),
    remove: async (a) => {
      bytes.delete(a.hash);
    },
  };
  const manager = new DownloadManager(store, {
    get: async (k) => meta.get(k) ?? null,
    set: async (k, v) => {
      meta.set(k, v);
    },
    remove: async (k) => {
      meta.delete(k);
    },
  });
  return { manager, store, bytes, meta };
}
describe('offline storage', () => {
  it('keeps a verified previous revision playable when its update fails', async () => {
    const { manager, store } = setup();
    await manager.download(manifest);
    const updated = structuredClone(manifest);
    updated.updatedAt = '2026-11-08T00:00:00.000Z';
    updated.pages[0].illustration = {
      ...updated.pages[0].illustration,
      hash: 'new-content',
    };
    store.put = async () => {
      throw new Error('Connection lost');
    };
    await expect(manager.download(updated)).rejects.toThrow();
    expect((await manager.playable('s', 'en'))?.updatedAt).toBe(
      '2026-11-07T00:00:00.000Z',
    );
  });
  it('verifies all bytes before marking complete and survives restart', async () => {
    const { manager, store } = setup();
    await manager.download(manifest);
    expect((await manager.inspect('s', 'en'))?.state).toBe('downloaded');
    const restart = new DownloadManager(store, manager.metadata);
    expect(await restart.playable('s', 'en')).not.toBeNull();
  });
  it('detects eviction and timestamp changes', async () => {
    const { manager, bytes } = setup();
    await manager.download(manifest);
    expect(
      (await manager.inspect('s', 'en', '2026-11-08T00:00:00.000Z'))?.state,
    ).toBe('update-available');
    bytes.clear();
    expect((await manager.inspect('s', 'en'))?.state).toBe('error');
    expect(await manager.playable('s', 'en')).toBeNull();
  });
  it('records interrupted downloads and retries', async () => {
    const { manager, store } = setup();
    const put = store.put;
    store.put = async () => {
      throw new Error('Connection lost');
    };
    await expect(manager.download(manifest)).rejects.toThrow();
    expect((await manager.inspect('s', 'en'))?.state).toBe('error');
    store.put = put;
    await manager.download(manifest);
    expect((await manager.inspect('s', 'en'))?.state).toBe('downloaded');
  });
  it('never considers an interrupted persisted operation complete', async () => {
    const { manager, meta } = setup();
    meta.set(
      manager.key('s', 'en'),
      JSON.stringify({ manifest, state: 'downloading', completed: 0 }),
    );
    expect((await manager.inspect('s', 'en'))?.state).toBe('error');
  });
  it('isolates languages and removes manifest availability', async () => {
    const { manager } = setup();
    await manager.download(manifest);
    expect(await manager.inspect('s', 'es')).toBeNull();
    await manager.remove('s', 'en');
    expect(await manager.playable('s', 'en')).toBeNull();
  });
  it('denies expired premium offline licenses', async () => {
    const { manager } = setup();
    await manager.download({
      ...manifest,
      access: 'premium',
      offlineUntil: '2020-01-01T00:00:00.000Z',
    });
    expect(await manager.playable('s', 'en')).toBeNull();
  });
  it('prioritizes requested page, then upcoming pages', () => {
    const m = {
      ...manifest,
      pages: Array.from({ length: 5 }, (_, i) => ({
        ...manifest.pages[0],
        id: `p${i}`,
        illustration: {
          ...manifest.pages[0].illustration,
          id: `a${i}`,
          hash: `h${i}`,
        },
      })),
    };
    expect(
      prioritizedAssets(m, 2)
        .filter((a) => a.id.startsWith('a') && a.id.length > 1)
        .map((a) => a.id),
    ).toEqual(['a2', 'a3', 'a4', 'a0', 'a1']);
  });
});

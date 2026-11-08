import { assetsOf, type Asset, type Manifest } from '../../shared/src/index';
export interface AssetStore {
  has(a: Asset): Promise<boolean>;
  put(a: Asset, signal?: AbortSignal): Promise<void>;
  resolve(a: Asset): Promise<string>;
  remove(a: Asset): Promise<void>;
}
export interface MetadataStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export type DownloadState =
  | 'not-downloaded'
  | 'downloading'
  | 'downloaded'
  | 'update-available'
  | 'error'
  | 'insufficient-storage';
export type DownloadRecord = {
  manifest: Manifest;
  state: DownloadState;
  completed: number;
  error?: string;
};
export class DownloadManager {
  constructor(
    public assets: AssetStore,
    public metadata: MetadataStore,
  ) {}
  key(id: string, language: string) {
    return `download:${id}:${language}`;
  }
  async inspect(
    id: string,
    language: string,
    updatedAt?: string,
  ): Promise<DownloadRecord | null> {
    const raw = await this.metadata.get(this.key(id, language));
    if (!raw) return null;
    const r = JSON.parse(raw) as DownloadRecord;
    if (r.state === 'downloading' && !this.running.has(this.key(id, language)))
      r.state = 'error';
    if (
      r.state === 'downloaded' &&
      !(
        await Promise.all(assetsOf(r.manifest).map((a) => this.assets.has(a)))
      ).every(Boolean)
    )
      r.state = 'error';
    if (
      r.state === 'downloaded' &&
      updatedAt &&
      r.manifest.updatedAt !== updatedAt
    )
      r.state = 'update-available';
    return r;
  }
  private running = new Map<string, Promise<void>>();
  private tail: Promise<void> = Promise.resolve();
  download(
    m: Manifest,
    onProgress: (r: DownloadRecord) => void = () => {},
    signal?: AbortSignal,
  ): Promise<void> {
    const key = this.key(m.id, m.language),
      existing = this.running.get(key);
    if (existing) return existing;
    const task = this.tail
      .then(() => this.perform(m, onProgress, signal))
      .finally(() => this.running.delete(key));
    this.tail = task.catch(() => {});
    this.running.set(key, task);
    return task;
  }
  private async perform(
    m: Manifest,
    onProgress: (r: DownloadRecord) => void,
    signal?: AbortSignal,
  ) {
    const key = this.key(m.id, m.language),
      r: DownloadRecord = { manifest: m, state: 'downloading', completed: 0 };
    const previous = await this.inspect(m.id, m.language);
    if (previous?.state === 'downloaded')
      await this.metadata.set(`${key}:previous`, JSON.stringify(previous));
    const index: string[] = JSON.parse(
      (await this.metadata.get('download-index')) ?? '[]',
    );
    if (!index.includes(key))
      await this.metadata.set(
        'download-index',
        JSON.stringify([...index, key]),
      );
    const save = async () => {
      await this.metadata.set(key, JSON.stringify(r));
      onProgress({ ...r });
    };
    await save();
    try {
      for (const a of assetsOf(m)) {
        if (signal?.aborted) throw new Error('Download interrupted');
        if (!(await this.assets.has(a))) await this.assets.put(a, signal);
        if (!(await this.assets.has(a)))
          throw new Error(`Asset verification failed: ${a.id}`);
        r.completed++;
        await save();
      }
      r.state = 'downloaded';
      await save();
    } catch (e) {
      r.state =
        e instanceof Error && /quota|space/i.test(e.message)
          ? 'insufficient-storage'
          : 'error';
      r.error = String(e);
      await save();
      throw e;
    }
    // Cleanup is best-effort: a deletion failure must not invalidate verified media.
    try {
      const old = await this.metadata.get(`${key}:previous`);
      await this.metadata.remove(`${key}:previous`);
      if (old)
        await this.removeUnreferenced(
          assetsOf((JSON.parse(old) as DownloadRecord).manifest),
        );
    } catch {
      /* Leftover bytes can be removed on a later explicit deletion. */
    }
  }
  async remove(id: string, language: string) {
    if (this.running.size) throw new Error('Wait for downloads to finish');
    const key = this.key(id, language),
      record = await this.inspect(id, language);
    if (!record) return;
    const old = await this.metadata.get(`${key}:previous`);
    const candidates = [
      ...assetsOf(record.manifest),
      ...(old ? assetsOf((JSON.parse(old) as DownloadRecord).manifest) : []),
    ];
    const index: string[] = JSON.parse(
        (await this.metadata.get('download-index')) ?? '[]',
      ),
      remaining = index.filter((k) => k !== key);
    await this.metadata.remove(key);
    await this.metadata.remove(`${key}:previous`);
    await this.metadata.set('download-index', JSON.stringify(remaining));
    await this.removeUnreferenced(candidates);
  }
  private async removeUnreferenced(candidates: Asset[]) {
    const keys: string[] = JSON.parse(
        (await this.metadata.get('download-index')) ?? '[]',
      ),
      used = new Set<string>();
    for (const key of keys) {
      for (const suffix of ['', ':previous']) {
        const raw = await this.metadata.get(key + suffix);
        if (raw)
          assetsOf((JSON.parse(raw) as DownloadRecord).manifest).forEach((a) =>
            used.add(a.hash),
          );
      }
    }
    for (const a of candidates)
      if (!used.has(a.hash)) await this.assets.remove(a);
  }
  async playable(id: string, language: string) {
    let r = await this.inspect(id, language);
    if (r?.state !== 'downloaded') {
      const old = await this.metadata.get(`${this.key(id, language)}:previous`);
      if (old) {
        const previous = JSON.parse(old) as DownloadRecord;
        if (
          (
            await Promise.all(
              assetsOf(previous.manifest).map((a) => this.assets.has(a)),
            )
          ).every(Boolean)
        )
          r = previous;
      }
    }
    if (r?.state !== 'downloaded') return null;
    if (
      r.manifest.access === 'premium' &&
      (!r.manifest.offlineUntil ||
        Date.parse(r.manifest.offlineUntil) < Date.now())
    )
      return null;
    return r.manifest;
  }
}
export function prioritizedAssets(m: Manifest, index: number) {
  const order = [
    ...m.pages.slice(index, index + 3),
    ...m.pages.slice(index + 3),
    ...m.pages.slice(0, index),
  ];
  return assetsOf({ ...m, pages: order });
}
export async function preparePage(
  m: Manifest,
  index: number,
  store: AssetStore,
  signal: AbortSignal,
) {
  const p = m.pages[index];
  if (!p) throw new Error('Page not found');
  await Promise.all(
    [p.illustration, p.narration].map(async (a) => {
      if (!a) return;
      if (!(await store.has(a))) await store.put(a, signal);
      if (!(await store.has(a)))
        throw new Error(`Essential media missing: ${a.id}`);
    }),
  );
  return {
    illustration: true,
    narration: true,
    video: !p.video || (await store.has(p.video)),
  };
}
export async function preload(
  m: Manifest,
  index: number,
  store: AssetStore,
  signal: AbortSignal,
) {
  const queue = prioritizedAssets(m, index);
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      while (queue.length && !signal.aborted) {
        const a = queue.shift()!;
        if (!(await store.has(a))) await store.put(a, signal);
      }
    }),
  );
}

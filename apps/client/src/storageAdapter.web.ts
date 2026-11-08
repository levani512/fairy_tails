import type { AssetStore } from '../../../packages/asset-manager/src/index';
import type { Asset } from '../../../packages/shared/src/index';
import { sha256 } from '@noble/hashes/sha2.js';
import { lanCache } from './lan-cache.web';
const cache = async () =>
  typeof caches === 'undefined'
    ? lanCache
    : caches.open('fairytails-assets-v1');
const key = (a: Asset) => `${location.origin}/__asset/${a.hash}`;
const blobs = new Map<string, string>();
async function valid(a: Asset, r: Response | undefined) {
  if (!r) return false;
  const b = await r.arrayBuffer();
  return (
    b.byteLength === a.bytes &&
    Array.from(
      crypto.subtle
        ? new Uint8Array(await crypto.subtle.digest('SHA-256', b))
        : sha256(new Uint8Array(b)),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('') === a.hash
  );
}
export const assetStore: AssetStore = {
  async has(a) {
    return valid(a, await (await cache()).match(key(a)));
  },
  async put(a, signal) {
    const r = await fetch(a.url, { signal });
    if (!r.ok) throw new Error(`Media unavailable (${r.status})`);
    if (!(await valid(a, r.clone())))
      throw new Error('Media integrity check failed');
    await (await cache()).put(key(a), r);
  },
  async resolve(a) {
    const r = await (await cache()).match(key(a));
    if (!r) return a.url;
    let url = blobs.get(a.hash);
    if (!url) {
      url = URL.createObjectURL(await r.blob());
      blobs.set(a.hash, url);
    }
    return url;
  },
  async remove(a) {
    await (await cache()).delete(key(a));
    const b = blobs.get(a.hash);
    if (b) URL.revokeObjectURL(b);
    blobs.delete(a.hash);
  },
};

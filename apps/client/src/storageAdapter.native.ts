import { Directory, File, Paths } from 'expo-file-system';
import { digest, CryptoDigestAlgorithm } from 'expo-crypto';
import type { AssetStore } from '../../../packages/asset-manager/src/index';
import type { Asset } from '../../../packages/shared/src/index';
const directory = () => {
  const d = new Directory(Paths.document, 'fairytails');
  d.create({ idempotent: true, intermediates: true });
  return d;
};
const file = (a: Asset) =>
  new File(
    directory(),
    `${a.hash}.${a.mime.startsWith('video') ? 'mp4' : a.mime.startsWith('audio') ? 'wav' : 'webp'}`,
  );
export const assetStore: AssetStore = {
  async has(a) {
    const f = file(a);
    if (!f.exists || f.size !== a.bytes) return false;
    const bytes = await f.bytes();
    const hash = Array.from(
      new Uint8Array(await digest(CryptoDigestAlgorithm.SHA256, bytes)),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    return hash === a.hash;
  },
  async put(a, signal) {
    if (signal?.aborted) throw new Error('Download interrupted');
    const f = file(a);
    if (f.exists) f.delete();
    await File.downloadFileAsync(a.url, f);
    if (signal?.aborted || !(await assetStore.has(a))) {
      if (f.exists) f.delete();
      throw new Error('Download interrupted or integrity check failed');
    }
  },
  async resolve(a) {
    const f = file(a);
    return f.exists ? f.uri : a.url;
  },
  async remove(a) {
    const f = file(a);
    if (f.exists) f.delete();
  },
};

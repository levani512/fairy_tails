// CacheStorage is HTTPS-only. IndexedDB also works on private Wi-Fi HTTP origins.
type Cached = { bytes: ArrayBuffer; contentType: string };
let database: Promise<IDBDatabase> | undefined;
function db() {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('fairytails-lan-assets', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  }));
}
async function transact<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('assets', mode);
    const request = action(tx.objectStore('assets'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error ?? new Error('Media storage interrupted.'));
  });
}
export const lanCache = {
  async match(key: string): Promise<Response | undefined> {
    const data = await transact<Cached | undefined>('readonly', (s) =>
      s.get(key),
    );
    return data
      ? new Response(data.bytes, {
          headers: { 'Content-Type': data.contentType },
        })
      : undefined;
  },
  async put(key: string, response: Response) {
    const data: Cached = {
      bytes: await response.arrayBuffer(),
      contentType:
        response.headers.get('Content-Type') ?? 'application/octet-stream',
    };
    await transact('readwrite', (s) => s.put(data, key));
  },
  async delete(key: string) {
    await transact('readwrite', (s) => s.delete(key));
  },
};

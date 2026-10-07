/**
 * Penyimpanan data besar di perangkat (IndexedDB) untuk salinan katalog offline: localStorage hanya ±5 MB,
 * sedangkan katalog lengkap jauh lebih besar. Semua kegagalan (browser privat, IndexedDB diblokir, test)
 * diabaikan dengan aman — aplikasi tetap jalan, hanya tanpa salinan offline.
 */
const DB = 'lc-store';
const STORE = 'kv';

function open(): Promise<IDBDatabase | undefined> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(undefined);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
      req.onblocked = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        if (!db) return resolve(undefined);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => {
            db.close();
            resolve(req.result as T);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            resolve(undefined);
          };
        } catch {
          db.close();
          resolve(undefined);
        }
      }),
  );
}

export const bigGet = <T>(key: string) => run<T>('readonly', (s) => s.get(key));
export const bigSet = (key: string, value: unknown) =>
  run<IDBValidKey>('readwrite', (s) => s.put(value, key)).then(() => undefined);
export const bigDelete = (key: string) =>
  run<undefined>('readwrite', (s) => s.delete(key)).then(() => undefined);

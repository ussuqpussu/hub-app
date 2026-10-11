// Локальный кэш данных и очередь отправки. IndexedDB, а если он недоступен, память.
// В IndexedDB лежит то же, что и в репозитории: личные записи в зашифрованном виде.
const DB_NAME = 'hub-data';
const STORES = ['files', 'queue'];

let dbPromise = null;
const mem = { files: new Map(), queue: new Map() };

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        STORES.forEach((s) => {
          if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
  return dbPromise;
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(store, key) {
  const db = await open();
  if (!db) return mem[store].get(key);
  return wrap(db.transaction(store).objectStore(store).get(key));
}

export async function dbSet(store, key, value) {
  const db = await open();
  if (!db) {
    mem[store].set(key, value);
    return;
  }
  await wrap(db.transaction(store, 'readwrite').objectStore(store).put(value, key));
}

export async function dbDelete(store, key) {
  const db = await open();
  if (!db) {
    mem[store].delete(key);
    return;
  }
  await wrap(db.transaction(store, 'readwrite').objectStore(store).delete(key));
}

export async function dbAll(store) {
  const db = await open();
  if (!db) return [...mem[store].entries()].map(([key, value]) => ({ key, value }));
  const os = db.transaction(store).objectStore(store);
  const keys = await wrap(os.getAllKeys());
  const vals = await wrap(os.getAll());
  return keys.map((key, i) => ({ key, value: vals[i] }));
}

export async function dbClear() {
  const db = await open();
  mem.files.clear();
  mem.queue.clear();
  if (!db) return;
  await Promise.all(
    STORES.map((s) => wrap(db.transaction(s, 'readwrite').objectStore(s).clear())),
  );
}

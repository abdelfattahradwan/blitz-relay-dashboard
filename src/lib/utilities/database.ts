const DATABASE_NAME = "blitz-relay-dashboard";
const STORE_NAME = "secrets";

let database: Promise<IDBDatabase> | undefined;

function getDatabase(): Promise<IDBDatabase> {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

async function run<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await getDatabase();
  const store = database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getValue<T>(key: string): Promise<T | undefined> {
  return run<T | undefined>("readonly", (store) => {
    return store.get(key);
  });
}

export async function putValue(key: string, value: unknown): Promise<void> {
  await run("readwrite", (store) => {
    return store.put(value, key);
  });
}

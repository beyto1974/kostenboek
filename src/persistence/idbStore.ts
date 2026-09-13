import type { Book } from '../domain/types';
import { encodeBook, safeDecodeBook } from './codec';
import type { BookStore } from './ports';

const STORE = 'book';
const KEY = 'current';

/**
 * The book in this browser, in IndexedDB — the one storage a worker can reach.
 * The book is written as the same JSON text that leaves the app on export, so
 * what is on disk and what is in a backup file are the one format.
 *
 * Every call is guarded: a private window, a browser told to block site data, or
 * a quota that has run out must never break the page. It only means nothing was
 * saved, and the session carries on in memory.
 */
export function createIdbStore(
  name = 'kostenboek',
  factory: IDBFactory | null = globalThis.indexedDB ?? null
): BookStore {
  let connection: Promise<IDBDatabase | null> | null = null;

  function open(): Promise<IDBDatabase | null> {
    if (!factory) return Promise.resolve(null);
    connection ??= new Promise<IDBDatabase | null>((resolve) => {
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(name, 1);
      } catch {
        resolve(null);
        return;
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
    return connection;
  }

  async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
    const database = await open();
    if (!database) return null;
    return new Promise<T | null>((resolve) => {
      let request: IDBRequest;
      try {
        request = work(database.transaction(STORE, mode).objectStore(STORE));
      } catch {
        resolve(null);
        return;
      }
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => resolve(null);
    });
  }

  return {
    async load() {
      const text = await run<string>('readonly', (store) => store.get(KEY));
      return safeDecodeBook(text);
    },
    async save(book: Book) {
      await run('readwrite', (store) => store.put(encodeBook(book), KEY));
    },
    async clear() {
      await run('readwrite', (store) => store.delete(KEY));
    },
    async close() {
      const database = await open();
      database?.close();
      connection = null;
    }
  };
}

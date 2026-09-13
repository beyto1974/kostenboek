import type { Book } from '../domain/types';
import { encodeBook, safeDecodeBook } from './codec';
import type { BookStore } from './ports';

/**
 * The book held in this process only. Used by the tests, and by the worker when
 * the browser refuses IndexedDB — the session still works, it just will not be
 * there tomorrow.
 */
export function createMemoryStore(initial: Book | null = null): BookStore {
  let text = initial ? encodeBook(initial) : null;

  return {
    async load() {
      return safeDecodeBook(text);
    },
    async save(book) {
      text = encodeBook(book);
    },
    async clear() {
      text = null;
    },
    async close() {
      /* nothing is held open */
    }
  };
}

import type { Book } from '../domain/types';

/**
 * Where the book is kept. The app depends on this and never on IndexedDB, so the
 * worker can be given the real store and the tests an in-memory one — and a
 * remote store could be added later without anything above it changing.
 */
export interface BookStore {
  load(): Promise<Book | null>;
  save(book: Book): Promise<void>;
  clear(): Promise<void>;
  /** Lets go of the underlying connection. Calling it twice is fine. */
  close(): Promise<void>;
}

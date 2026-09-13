import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createIdbStore } from '../src/persistence/idbStore';
import { createMemoryStore } from '../src/persistence/memoryStore';
import type { BookStore } from '../src/persistence/ports';
import { emptyBook } from '../src/persistence/codec';
import { exampleBook } from './fixtures';

function behavesLikeABookStore(name: string, make: () => BookStore): void {
  describe(name, () => {
    let store: BookStore;

    beforeEach(() => {
      store = make();
    });

    it('has nothing in it to begin with', async () => {
      expect(await store.load()).toBeNull();
    });

    it('hands back what was saved', async () => {
      await store.save(exampleBook());
      expect(await store.load()).toEqual(exampleBook());
    });

    it('keeps only the last save', async () => {
      await store.save(exampleBook());
      await store.save(emptyBook());
      expect((await store.load())?.projects).toEqual([]);
    });

    it('empties out', async () => {
      await store.save(exampleBook());
      await store.clear();
      expect(await store.load()).toBeNull();
    });
  });
}

behavesLikeABookStore('the in-memory store', () => createMemoryStore());

let database = 0;
behavesLikeABookStore('the IndexedDB store', () => createIdbStore(`kostenboek-test-${(database += 1)}`));

describe('the IndexedDB store when the browser will not have it', () => {
  it('reads as empty and swallows a save rather than breaking the page', async () => {
    const store = createIdbStore('kostenboek-test-none', null);
    await store.save(exampleBook());
    expect(await store.load()).toBeNull();
  });
});

describe('the IndexedDB store across sessions', () => {
  it('finds the book again after the connection is closed', async () => {
    const first = createIdbStore('kostenboek-test-reopen');
    await first.save(exampleBook());
    await first.close();

    const second = createIdbStore('kostenboek-test-reopen');
    expect((await second.load())?.projects).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import { BookFormatError, decodeBook, emptyBook, encodeBook, safeDecodeBook } from '../src/persistence/codec';
import { exampleBook } from './fixtures';

describe('an empty book', () => {
  it('opens with no work in it and the Belgian VAT rate', () => {
    const book = emptyBook();
    expect(book.version).toBe(1);
    expect(book.projects).toEqual([]);
    expect(book.slots).toEqual({});
    expect(book.settings).toEqual({ vatRate: 0.21, dayStart: 8, dayEnd: 20 });
  });
});

describe('writing and reading a book', () => {
  it('survives the round trip unchanged', () => {
    const book = exampleBook();
    expect(decodeBook(encodeBook(book))).toEqual(book);
  });

  it('writes JSON a person can read in a text editor', () => {
    expect(encodeBook(emptyBook())).toContain('\n  "version": 1');
  });
});

describe('reading a file that is not what it claims', () => {
  it('refuses text that is not JSON', () => {
    expect(() => decodeBook('not json')).toThrow(BookFormatError);
  });

  it('refuses anything that is not a book', () => {
    expect(() => decodeBook('[]')).toThrow(BookFormatError);
    expect(() => decodeBook('{"version":1}')).toThrow(BookFormatError);
  });

  it('says so when the file comes from a newer version', () => {
    const newer = JSON.stringify({ ...emptyBook(), version: 99 });
    expect(() => decodeBook(newer)).toThrow(/newer version/i);
  });

  it('fills in settings the file left out', () => {
    const book = { ...emptyBook(), settings: undefined };
    expect(decodeBook(JSON.stringify(book)).settings.vatRate).toBe(0.21);
  });

  it('keeps the work and drops only the rows it cannot read', () => {
    const damaged = {
      ...exampleBook(),
      slots: {
        '2026-09-07T09': { projectId: 'nls', evening: false },
        'not-an-hour': { projectId: 'nls', evening: false },
        '2026-09-07T10': { projectId: 'ghost', evening: false }
      }
    };

    const book = decodeBook(JSON.stringify(damaged));
    expect(Object.keys(book.slots)).toEqual(['2026-09-07T09']);
  });

  it('drops a day that carries a status it does not know', () => {
    const damaged = { ...exampleBook(), days: { '2026-09-07': { status: 'forgotten' } } };
    expect(decodeBook(JSON.stringify(damaged)).days).toEqual({});
  });

  it('cleans up the text it was given', () => {
    const padded = {
      ...emptyBook(),
      projects: [
        {
          id: 'nls',
          code: ' slb ',
          name: '  Northside School site  ',
          client: 'Northside   School',
          rate: 10000,
          eveningRate: 15000,
          color: 'var(--project-1)',
          archived: false
        }
      ]
    };

    const project = decodeBook(JSON.stringify(padded)).projects[0];
    expect(project).toMatchObject({ code: 'NLS', name: 'Northside School site', client: 'Northside School' });
  });
});

describe('safeDecodeBook', () => {
  it('reads a good file', () => {
    expect(safeDecodeBook(encodeBook(exampleBook()))?.projects).toHaveLength(2);
  });

  it('treats anything unreadable as nothing saved', () => {
    expect(safeDecodeBook('rubbish')).toBeNull();
    expect(safeDecodeBook(null)).toBeNull();
    expect(safeDecodeBook(undefined)).toBeNull();
  });
});

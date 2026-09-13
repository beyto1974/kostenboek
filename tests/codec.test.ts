import { describe, expect, it } from 'vitest';
import { BookFormatError, decodeBook, emptyBook, encodeBook, safeDecodeBook } from '../src/persistence/codec';
import { exampleBook } from './fixtures';

describe('an empty book', () => {
  it('opens with no work in it and the Belgian VAT rate', () => {
    const book = emptyBook();
    expect(book.version).toBe(2);
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
    expect(encodeBook(emptyBook())).toContain('\n  "version": 2');
  });
});

describe('a book written by the first version', () => {
  const version1 = JSON.stringify({
    version: 1,
    projects: [
      {
        id: 'nls',
        code: 'NLS',
        name: 'Northside School site',
        client: 'Northside School',
        rate: 10000,
        eveningRate: 15000,
        color: 'var(--project-1)',
        archived: false
      }
    ],
    slots: {
      '2026-09-07T09': { projectId: 'nls', evening: false },
      '2026-09-07T19': { projectId: 'nls', evening: true }
    },
    days: { '2026-09-07': { status: 'unbilled' } },
    settings: { vatRate: 0.21, dayStart: 8, dayEnd: 20 }
  });

  it('is read, and every hour keeps what it was worth back then', () => {
    const book = decodeBook(version1);

    expect(book.version).toBe(2);
    expect(book.projects[0]?.premiumRate).toBe(15000);
    expect(book.slots['2026-09-07T09']).toEqual({ projectId: 'nls', kind: 'standard', rate: 10000 });
    expect(book.slots['2026-09-07T19']).toEqual({ projectId: 'nls', kind: 'premium', rate: 15000 });
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
        '2026-09-07T09': { projectId: 'nls', kind: 'standard', rate: 10000 },
        'not-an-hour': { projectId: 'nls', kind: 'standard', rate: 10000 },
        '2026-09-07T10': { projectId: 'ghost', kind: 'standard', rate: 10000 }
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
          code: ' nls ',
          name: '  Northside School site  ',
          client: 'Northside   School',
          rate: 10000,
          premiumRate: 15000,
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

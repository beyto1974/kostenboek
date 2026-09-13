import { describe, expect, it } from 'vitest';
import { fromEuros } from '../src/domain/money';
import { createMemoryStore } from '../src/persistence/memoryStore';
import { encodeBook, emptyBook } from '../src/persistence/codec';
import { createHandler } from '../src/worker/handler';
import type { Request, Response } from '../src/worker/protocol';
import { createInlineClient } from '../src/worker/client';
import { exampleBook } from './fixtures';

const NOW = () => new Date(2026, 8, 13, 10, 0);

function handler(book = exampleBook()) {
  const store = createMemoryStore(book);
  return { store, handle: createHandler({ store, clock: NOW, sample: exampleBook }) };
}

async function snapshot(handle: (request: Request) => Promise<Response>, request: Request) {
  const response = await handle(request);
  if (response.kind !== 'snapshot') throw new Error(`Expected a snapshot, got ${response.kind}.`);
  return response;
}

describe('opening the book', () => {
  it('hands back the book with the totals for the month the clock is in', async () => {
    const { handle } = handler();
    const opened = await snapshot(handle, { kind: 'open' });

    expect(opened.month).toBe('2026-09');
    expect(opened.today).toBe('2026-09-13');
    expect(opened.totals.hours).toBe(9);
    expect(opened.weeks).toHaveLength(5);
    expect(opened.aging.unbilled).toBe(fromEuros(200));
    expect(opened.isExample).toBe(false);
  });

  it('seeds the example when there is nothing saved yet', async () => {
    const store = createMemoryStore(null);
    const handle = createHandler({ store, clock: NOW, sample: exampleBook });

    const opened = await snapshot(handle, { kind: 'open' });
    expect(opened.isExample).toBe(true);
    expect(opened.totals.hours).toBe(9);
    expect((await store.load())?.projects).toHaveLength(2);
  });

  it('shows another month without changing anything', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const october = await snapshot(handle, { kind: 'view', month: '2026-10' });
    expect(october.month).toBe('2026-10');
    expect(october.totals.hours).toBe(0);
  });
});

describe('changing the book', () => {
  it('paints hours, saves them and answers with fresh totals', async () => {
    const { handle, store } = handler();
    await snapshot(handle, { kind: 'open' });

    const painted = await snapshot(handle, {
      kind: 'paint',
      slots: ['2026-09-10T09', '2026-09-10T10'],
      projectId: 'nls',
      rate: 'standard'
    });

    expect(painted.totals.hours).toBe(11);
    expect(painted.book.slots['2026-09-10T09']).toEqual({
      projectId: 'nls',
      kind: 'standard',
      rate: 10000
    });
    expect((await store.load())?.slots['2026-09-10T10']).toBeDefined();
  });

  it('clears hours again', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const cleared = await snapshot(handle, { kind: 'clear', slots: ['2026-09-07T09'] });
    expect(cleared.totals.hours).toBe(8);
  });

  it('moves a day to invoiced with a reference that is trimmed on the way in', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const marked = await snapshot(handle, {
      kind: 'setDayStatus',
      date: '2026-09-08',
      status: 'invoiced',
      invoiceRef: '  2026-014  ',
      sentOn: '2026-09-13'
    });

    expect(marked.book.days['2026-09-08']).toEqual({
      status: 'invoiced',
      invoiceRef: '2026-014',
      sentOn: '2026-09-13'
    });
    expect(marked.totals.byStatus.unbilled).toBe(0);
  });

  it('adds a project, trimming what was typed', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const added = await snapshot(handle, {
      kind: 'upsertProject',
      project: { code: ' hrb ', name: '  Harbour   Bakery shop ', client: ' Harbour Bakery ', rate: 8500 }
    });

    const project = added.book.projects.at(-1);
    expect(project).toMatchObject({
      code: 'HRB',
      name: 'Harbour Bakery shop',
      client: 'Harbour Bakery',
      rate: 8500,
      premiumRate: 8500
    });
    expect(project?.id).toBeTruthy();
  });

  it('edits a project that is already there instead of adding a second one', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const edited = await snapshot(handle, {
      kind: 'upsertProject',
      project: {
        id: 'nls',
        code: 'NLS',
        name: 'Northside School site',
        client: 'Northside School',
        rate: 10000,
        premiumRate: 14000
      }
    });

    expect(edited.book.projects).toHaveLength(2);
    expect(edited.book.projects[0]?.rate).toBe(10000);
  });

  it('a new rate is for the hours still to come, never for the ones already booked', async () => {
    const { handle } = handler();
    const before = await snapshot(handle, { kind: 'open' });

    await snapshot(handle, {
      kind: 'upsertProject',
      project: { id: 'nls', code: 'NLS', name: 'Northside School site', client: 'Northside School', rate: 20000 }
    });

    const after = await snapshot(handle, { kind: 'view', month: '2026-09' });
    expect(after.totals.byProject['nls']?.amount).toBe(before.totals.byProject['nls']?.amount);

    const painted = await snapshot(handle, {
      kind: 'paint',
      slots: ['2026-09-10T09'],
      projectId: 'nls',
      rate: 'standard'
    });
    expect(painted.book.slots['2026-09-10T09']?.rate).toBe(fromEuros(200));
    expect(painted.book.slots['2026-09-07T09']?.rate).toBe(fromEuros(100));
  });

  it('answers with an error a person can read, and keeps the book as it was', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const failed = await handle({
      kind: 'upsertProject',
      project: { code: '', name: '', client: '', rate: 8500 }
    });

    expect(failed.kind).toBe('error');
    if (failed.kind === 'error') expect(failed.message).toMatch(/project name/i);

    const after = await snapshot(handle, { kind: 'view', month: '2026-09' });
    expect(after.book.projects).toHaveLength(2);
  });
});

describe('the example', () => {
  it('goes away for good when it is cleared', async () => {
    const store = createMemoryStore(null);
    const handle = createHandler({ store, clock: NOW, sample: exampleBook });
    await snapshot(handle, { kind: 'open' });

    const cleared = await snapshot(handle, { kind: 'clearExample' });
    expect(cleared.isExample).toBe(false);
    expect(cleared.book.slots).toEqual({});
    expect(cleared.book.projects).toEqual([]);
  });
});

describe('files in and out', () => {
  it('writes the book out as a named file', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const written = await handle({ kind: 'export' });
    expect(written.kind).toBe('file');
    if (written.kind !== 'file') return;
    expect(written.filename).toBe('kostenboek-2026-09-13.json');
    expect(written.text).toContain(String.raw`"version": 2`);
  });

  it('reads a book back in and stops being the example', async () => {
    const store = createMemoryStore(null);
    const handle = createHandler({ store, clock: NOW, sample: exampleBook });
    await snapshot(handle, { kind: 'open' });

    const imported = await snapshot(handle, { kind: 'import', text: encodeBook(emptyBook()) });
    expect(imported.isExample).toBe(false);
    expect(imported.book.projects).toEqual([]);
  });

  it('explains a file it cannot read and leaves the book alone', async () => {
    const { handle } = handler();
    await snapshot(handle, { kind: 'open' });

    const failed = await handle({ kind: 'import', text: 'rubbish' });
    expect(failed.kind).toBe('error');
    if (failed.kind === 'error') expect(failed.message).toMatch(/not even JSON/i);

    const after = await snapshot(handle, { kind: 'view', month: '2026-09' });
    expect(after.totals.hours).toBe(9);
  });
});

describe('the client', () => {
  it('carries requests to a handler and answers each one in turn', async () => {
    const { handle } = handler();
    const client = createInlineClient(handle);

    const [opened, october] = await Promise.all([
      client.send({ kind: 'open' }),
      client.send({ kind: 'view', month: '2026-10' })
    ]);

    expect(opened.kind).toBe('snapshot');
    expect(october.kind === 'snapshot' && october.month).toBe('2026-10');
    client.close();
  });
});

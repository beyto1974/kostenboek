import { describe, expect, it } from 'vitest';
import { createRoot } from 'solid-js';
import { createMemoryStore } from '../src/persistence/memoryStore';
import { createHandler } from '../src/worker/handler';
import { createInlineClient } from '../src/worker/client';
import { createBookState } from '../src/ui/state';
import { exampleBook } from './fixtures';

const NOW = () => new Date(2026, 8, 13, 10, 0);

function state(book = exampleBook()) {
  const store = createMemoryStore(book);
  const client = createInlineClient(createHandler({ store, clock: NOW, sample: exampleBook }));
  return createRoot(() => createBookState(client));
}

describe('the state the views read', () => {
  it('is empty until the book is opened, then holds the month', async () => {
    const app = state();
    expect(app.ready()).toBe(false);

    await app.open();

    expect(app.ready()).toBe(true);
    expect(app.month()).toBe('2026-09');
    expect(app.today()).toBe('2026-09-13');
    expect(app.totals().hours).toBe(9);
    expect(app.projects()).toHaveLength(2);
  });

  it('starts on today and follows the day that is selected', async () => {
    const app = state();
    await app.open();
    expect(app.selectedDay()).toBe('2026-09-13');

    app.selectDay('2026-09-07');
    expect(app.selectedDay()).toBe('2026-09-07');
    expect(app.dayTally().hours).toBe(4);
  });

  it('paints hours through the worker and takes the totals it answers with', async () => {
    const app = state();
    await app.open();

    await app.paint(['2026-09-10T09', '2026-09-10T10']);

    expect(app.totals().hours).toBe(11);
    expect(app.slotAt('2026-09-10T09')?.projectId).toBe('nls');
  });

  it('paints with whichever project and rate the picker is on', async () => {
    const app = state();
    await app.open();
    app.selectProject('tin', 'premium');
    expect(app.activeRate()).toBe('premium');

    await app.paint(['2026-09-10T19']);
    expect(app.slotAt('2026-09-10T19')).toEqual({
      projectId: 'tin',
      kind: 'premium',
      rate: 12000
    });
  });

  it('clears an hour that is painted again with the same project', async () => {
    const app = state();
    await app.open();

    await app.toggle('2026-09-07T09');
    expect(app.slotAt('2026-09-07T09')).toBeUndefined();

    await app.toggle('2026-09-07T09');
    expect(app.slotAt('2026-09-07T09')?.projectId).toBe('nls');
  });

  it('walks a day on through its states', async () => {
    const app = state();
    await app.open();
    app.selectDay('2026-09-08');

    await app.advanceDayStatus('2026-09-08');
    expect(app.dayTally().status).toBe('invoiced');

    await app.advanceDayStatus('2026-09-08');
    expect(app.dayTally().status).toBe('paid');

    await app.advanceDayStatus('2026-09-08');
    expect(app.dayTally().status).toBe('unbilled');
  });

  it('moves to another month', async () => {
    const app = state();
    await app.open();

    await app.showMonth('2026-10');
    expect(app.month()).toBe('2026-10');
    expect(app.totals().hours).toBe(0);
  });

  it('keeps the last error where a view can show it, and lets it be dismissed', async () => {
    const app = state();
    await app.open();

    await app.importText('rubbish');
    expect(app.error()).toMatch(/not even JSON/i);

    app.dismissError();
    expect(app.error()).toBeNull();
  });
});

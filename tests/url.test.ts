import { describe, expect, it } from 'vitest';
import { readLocation, writeLocation } from '../src/ui/url';

describe('reading the address bar', () => {
  it('takes the tab, the month and the day from it', () => {
    expect(readLocation('?view=day&month=2026-10&day=2026-10-02')).toEqual({
      view: 'day',
      month: '2026-10',
      day: '2026-10-02'
    });
  });

  it('opens on the calendar when nothing is asked for', () => {
    expect(readLocation('')).toEqual({ view: 'calendar' });
    expect(readLocation('?')).toEqual({ view: 'calendar' });
  });

  it('reads the year overview', () => {
    expect(readLocation('?view=year&month=2026-09')).toEqual({
      view: 'year',
      month: '2026-09'
    });
  });

  it('ignores a tab, a month or a day it cannot make sense of', () => {
    expect(readLocation('?view=gantt')).toEqual({ view: 'calendar' });
    expect(readLocation('?view=matrix&month=octobre')).toEqual({ view: 'matrix' });
    expect(readLocation('?day=32-13-2026')).toEqual({ view: 'calendar' });
  });

  it('reads a day written with spaces around it', () => {
    expect(readLocation('?view= day &day= 2026-10-02 ')).toEqual({
      view: 'day',
      day: '2026-10-02'
    });
  });
});

describe('writing the address bar', () => {
  it('carries the tab, the month and the selected day', () => {
    expect(writeLocation({ view: 'day', month: '2026-10', day: '2026-10-02' })).toBe(
      '?view=day&month=2026-10&day=2026-10-02'
    );
  });

  it('leaves out what is not known yet', () => {
    expect(writeLocation({ view: 'calendar' })).toBe('?view=calendar');
  });

  it('is read back as what was written', () => {
    const state = { view: 'matrix' as const, month: '2026-09', day: '2026-09-13' };
    expect(readLocation(writeLocation(state))).toEqual(state);
  });
});

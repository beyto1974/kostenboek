import { describe, expect, it } from 'vitest';
import {
  clearSlots,
  hoursOfDay,
  paintSlots,
  parseSlot,
  setDayStatus,
  slotKey,
  slotRange
} from '../src/domain/slots';
import { exampleBook } from './fixtures';

describe('slot keys', () => {
  it('writes a date and an hour as one key', () => {
    expect(slotKey('2026-09-13', 9)).toBe('2026-09-13T09');
    expect(slotKey('2026-09-13', 20)).toBe('2026-09-13T20');
  });

  it('refuses an hour outside the day', () => {
    expect(() => slotKey('2026-09-13', 24)).toThrow();
    expect(() => slotKey('2026-09-13', -1)).toThrow();
    expect(() => slotKey('2026-09-13', 9.5)).toThrow();
  });

  it('reads a key back', () => {
    expect(parseSlot('2026-09-13T09')).toEqual({ date: '2026-09-13', hour: 9 });
    expect(() => parseSlot('2026-09-13')).toThrow();
  });

  it('lists the hours of a stretch, the last hour excluded', () => {
    expect(slotRange('2026-09-13', 9, 12)).toEqual([
      '2026-09-13T09',
      '2026-09-13T10',
      '2026-09-13T11'
    ]);
    expect(slotRange('2026-09-13', 12, 9)).toEqual([
      '2026-09-13T09',
      '2026-09-13T10',
      '2026-09-13T11'
    ]);
    expect(slotRange('2026-09-13', 9, 9)).toEqual([]);
  });
});

describe('painting hours', () => {
  it('fills hours with a project without touching the book it was given', () => {
    const before = exampleBook();
    const after = paintSlots(before, slotRange('2026-09-10', 9, 11), 'nls', false);

    expect(after.slots['2026-09-10T09']).toEqual({ projectId: 'nls', evening: false });
    expect(after.slots['2026-09-10T10']).toEqual({ projectId: 'nls', evening: false });
    expect(before.slots['2026-09-10T09']).toBeUndefined();
  });

  it('paints the evening rate when asked', () => {
    const after = paintSlots(exampleBook(), ['2026-09-10T19'], 'tin', true);
    expect(after.slots['2026-09-10T19']).toEqual({ projectId: 'tin', evening: true });
  });

  it('takes over an hour that already held another project', () => {
    const after = paintSlots(exampleBook(), ['2026-09-07T09'], 'tin', false);
    expect(after.slots['2026-09-07T09']?.projectId).toBe('tin');
  });

  it('refuses a project the book does not have', () => {
    expect(() => paintSlots(exampleBook(), ['2026-09-10T09'], 'nope', false)).toThrow(/nope/);
  });

  it('clears hours and forgets a day that is left empty', () => {
    const after = clearSlots(exampleBook(), slotRange('2026-09-08', 14, 20));
    expect(after.slots['2026-09-08T14']).toBeUndefined();
    expect(after.slots['2026-09-08T19']).toBeUndefined();
    expect(after.days['2026-09-08']).toBeUndefined();
  });

  it('keeps the status of a day that still has hours', () => {
    const after = clearSlots(exampleBook(), ['2026-09-07T09']);
    expect(after.days['2026-09-07']?.status).toBe('invoiced');
  });

  it('counts the hours booked on a day', () => {
    expect(hoursOfDay(exampleBook(), '2026-09-07')).toBe(4);
    expect(hoursOfDay(exampleBook(), '2026-09-30')).toBe(0);
  });
});

describe('day status', () => {
  it('moves a day on and keeps the invoice it was sent with', () => {
    const after = setDayStatus(exampleBook(), '2026-09-07', 'paid');
    expect(after.days['2026-09-07']).toEqual({
      status: 'paid',
      invoiceRef: '2026-013',
      sentOn: '2026-08-31'
    });
  });

  it('records the invoice when a day is marked invoiced', () => {
    const after = setDayStatus(exampleBook(), '2026-09-08', 'invoiced', {
      invoiceRef: '  2026-014 ',
      sentOn: '2026-09-13'
    });
    expect(after.days['2026-09-08']).toEqual({
      status: 'invoiced',
      invoiceRef: '2026-014',
      sentOn: '2026-09-13'
    });
  });

  it('drops the invoice again when a day goes back to unbilled', () => {
    const after = setDayStatus(exampleBook(), '2026-09-07', 'unbilled');
    expect(after.days['2026-09-07']).toEqual({ status: 'unbilled' });
  });

  it('refuses to give a status to a day with no hours on it', () => {
    expect(() => setDayStatus(exampleBook(), '2026-09-30', 'invoiced')).toThrow(/no hours/i);
  });
});

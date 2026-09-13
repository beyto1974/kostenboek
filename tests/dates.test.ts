import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  eachDayOfMonth,
  isWeekend,
  isoWeek,
  monthGrid,
  monthOf,
  plainDate,
  eachMonthOfYear,
  plainYear,
  today,
  weekdayIndex,
  yearColumns,
  yearOf
} from '../src/domain/dates';

describe('plainDate', () => {
  it('accepts a calendar date', () => {
    expect(plainDate('2026-09-13')).toBe('2026-09-13');
  });

  it('rejects anything that is not YYYY-MM-DD', () => {
    expect(() => plainDate('13/09/2026')).toThrow();
    expect(() => plainDate('2026-9-3')).toThrow();
    expect(() => plainDate('')).toThrow();
  });

  it('rejects a day the month does not have', () => {
    expect(() => plainDate('2026-02-30')).toThrow();
    expect(() => plainDate('2026-13-01')).toThrow();
  });

  it('accepts the leap day of a leap year and refuses it otherwise', () => {
    expect(plainDate('2028-02-29')).toBe('2028-02-29');
    expect(() => plainDate('2026-02-29')).toThrow();
  });
});

describe('today', () => {
  it('reads the date from the clock it is given', () => {
    expect(today(() => new Date(2026, 8, 13, 23, 30))).toBe('2026-09-13');
  });
});

describe('arithmetic', () => {
  it('adds days across a month end', () => {
    expect(addDays(plainDate('2026-09-30'), 1)).toBe('2026-10-01');
    expect(addDays(plainDate('2026-01-01'), -1)).toBe('2025-12-31');
  });

  it('adds months and clamps to the shorter month', () => {
    expect(addMonths(plainDate('2026-01-31'), 1)).toBe('2026-02-28');
    expect(addMonths(plainDate('2026-03-15'), -2)).toBe('2026-01-15');
    expect(addMonths(plainDate('2026-12-31'), 1)).toBe('2027-01-31');
  });

  it('knows how long a month is', () => {
    expect(daysInMonth(2026, 9)).toBe(30);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});

describe('weeks', () => {
  it('counts weekdays from Monday', () => {
    expect(weekdayIndex(plainDate('2026-09-14'))).toBe(0);
    expect(weekdayIndex(plainDate('2026-09-13'))).toBe(6);
  });

  it('marks Saturday and Sunday as the weekend', () => {
    expect(isWeekend(plainDate('2026-09-12'))).toBe(true);
    expect(isWeekend(plainDate('2026-09-13'))).toBe(true);
    expect(isWeekend(plainDate('2026-09-14'))).toBe(false);
  });

  it('numbers weeks the ISO way', () => {
    expect(isoWeek(plainDate('2026-09-13'))).toBe(37);
    expect(isoWeek(plainDate('2026-09-14'))).toBe(38);
    // 1 January 2027 is a Friday, so it belongs to week 53 of 2026.
    expect(isoWeek(plainDate('2027-01-01'))).toBe(53);
    expect(isoWeek(plainDate('2026-01-01'))).toBe(1);
  });
});

describe('a month as it is read', () => {
  it('names the month of a date', () => {
    expect(monthOf(plainDate('2026-09-13'))).toBe('2026-09');
  });

  it('lists every day of a month', () => {
    const days = eachDayOfMonth('2026-09');
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-09-01');
    expect(days[29]).toBe('2026-09-30');
  });

  it('lays a month out in weeks that start on Monday', () => {
    const grid = monthGrid('2026-09');
    expect(grid).toHaveLength(5);

    // 1 September 2026 is a Tuesday: one blank before it.
    expect(grid[0]?.days[0]).toBeNull();
    expect(grid[0]?.days[1]).toBe('2026-09-01');
    expect(grid[0]?.week).toBe(36);

    const last = grid[4];
    expect(last?.days[2]).toBe('2026-09-30');
    expect(last?.days[3]).toBeNull();
  });

  it('needs no blanks when a month starts on a Monday and fills its weeks', () => {
    const grid = monthGrid('2026-06');
    expect(grid[0]?.days[0]).toBe('2026-06-01');
    expect(grid.at(-1)?.days[1]).toBe('2026-06-30');
  });
});

describe('a year', () => {
  it('accepts a year and refuses anything else', () => {
    expect(plainYear('2026')).toBe('2026');
    expect(() => plainYear('26')).toThrow(TypeError);
    expect(() => plainYear('2026-09')).toThrow(TypeError);
  });

  it('reads the year off a date or a month', () => {
    expect(yearOf('2026-09-13')).toBe('2026');
    expect(yearOf('2026-09')).toBe('2026');
  });

  it('lists its twelve months in order', () => {
    const months = eachMonthOfYear('2026');
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });

  it('lays the year out in weeks read downwards', () => {
    const columns = yearColumns('2026');

    // 1 January 2026 is a Thursday: three blanks above it in the first column.
    expect(columns[0]?.days.slice(0, 4)).toEqual([null, null, null, '2026-01-01']);
    expect(columns.every((column) => column.days.length === 7)).toBe(true);

    const last = columns.at(-1);
    expect(last?.days[3]).toBe('2026-12-31');
    expect(last?.days[4]).toBeNull();
  });

  it('holds every day of the year once', () => {
    const days = yearColumns('2026')
      .flatMap((column) => column.days)
      .filter((day): day is string => day !== null);

    expect(days).toHaveLength(365);
    expect(new Set(days).size).toBe(365);
  });

  it('writes each month once, over the first column that month reaches', () => {
    const labels = yearColumns('2026')
      .map((column) => column.label)
      .filter((label): label is string => label !== null);

    expect(labels).toEqual(eachMonthOfYear('2026'));
  });

  it('lays out a leap year that starts on a Monday', () => {
    const columns = yearColumns('2024');
    expect(columns[0]?.days[0]).toBe('2024-01-01');
    expect(
      columns.flatMap((column) => column.days).filter((day) => day !== null)
    ).toHaveLength(366);
  });
});

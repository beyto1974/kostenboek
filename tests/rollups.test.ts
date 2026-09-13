import { describe, expect, it } from 'vitest';
import { eachMonthOfYear } from '../src/domain/dates';
import { fromEuros } from '../src/domain/money';
import {
  aging,
  dayBlocks,
  dayTally,
  emptyYearTotals,
  monthTotals,
  rateFor,
  weekTallies,
  yearTotals
} from '../src/domain/rollups';
import { exampleBook, tinsmith } from './fixtures';

describe('rates', () => {
  it('reads a project’s two rates by the button that picks them', () => {
    expect(rateFor(tinsmith, 'standard')).toBe(fromEuros(80));
    expect(rateFor(tinsmith, 'premium')).toBe(fromEuros(120));
  });

  it('adds up the rate written on each hour, not the rate the project has now', () => {
    const book = exampleBook();
    const raised = {
      ...book,
      projects: book.projects.map((project) =>
        project.id === 'nls' ? { ...project, rate: fromEuros(200) } : project
      )
    };

    expect(monthTotals(raised, '2026-09').amount).toBe(monthTotals(book, '2026-09').amount);
  });
});

describe('a day', () => {
  it('adds up its hours, its money and its projects', () => {
    const day = dayTally(exampleBook(), '2026-09-08');

    expect(day.hours).toBe(2);
    expect(day.amount).toBe(fromEuros(80 + 120));
    expect(day.status).toBe('unbilled');
    expect(day.byProject['tin']).toEqual({ hours: 2, amount: fromEuros(200) });
  });

  it('keeps the two rates apart, so a calendar cell can show them apart', () => {
    const blocks = dayBlocks(exampleBook(), '2026-09-08');

    expect(blocks).toEqual([
      { projectId: 'tin', kind: 'standard', hours: 1, amount: fromEuros(80) },
      { projectId: 'tin', kind: 'premium', hours: 1, amount: fromEuros(120) }
    ]);
  });

  it('has no blocks on a day with nothing on it', () => {
    expect(dayBlocks(exampleBook(), '2026-09-30')).toEqual([]);
  });

  it('reads an untouched day as empty and unbilled', () => {
    const day = dayTally(exampleBook(), '2026-09-30');
    expect(day).toMatchObject({ hours: 0, amount: 0, status: 'unbilled' });
  });
});

describe('a month', () => {
  it('adds up hours, money and VAT', () => {
    const month = monthTotals(exampleBook(), '2026-09');

    expect(month.hours).toBe(9);
    expect(month.amount).toBe(fromEuros(4 * 100 + 80 + 120 + 3 * 100));
    expect(month.vat).toBe(Math.round(month.amount * 0.21));
    expect(month.gross).toBe(month.amount + month.vat);
  });

  it('splits the money over the three states it can be in', () => {
    const month = monthTotals(exampleBook(), '2026-09');

    expect(month.byStatus.invoiced).toBe(fromEuros(400));
    expect(month.byStatus.unbilled).toBe(fromEuros(200));
    expect(month.byStatus.paid).toBe(fromEuros(300));
    expect(month.outstanding).toBe(fromEuros(600));
  });

  it('adds up each project and the average earned per hour', () => {
    const month = monthTotals(exampleBook(), '2026-09');

    expect(month.byProject['nls']).toEqual({ hours: 7, amount: fromEuros(700) });
    expect(month.averageRate).toBe(Math.round(month.amount / month.hours));
  });

  it('reads an empty month without dividing by zero', () => {
    const month = monthTotals(exampleBook(), '2026-11');
    expect(month).toMatchObject({ hours: 0, amount: 0, averageRate: 0, outstanding: 0 });
  });

  it('gives every week of the month its own line', () => {
    const weeks = weekTallies(exampleBook(), '2026-09');

    expect(weeks).toHaveLength(5);
    expect(weeks[1]).toMatchObject({ week: 37, hours: 9 });
    expect(weeks[0]?.hours).toBe(0);
  });
});

describe('how old the money is', () => {
  it('buckets what is owed by the day the invoice went out', () => {
    const buckets = aging(exampleBook(), '2026-09-13');

    // 2026-09-08 is not on an invoice yet.
    expect(buckets.unbilled).toBe(fromEuros(200));
    // Invoice 2026-013 went out on 31 August: thirteen days ago.
    expect(buckets.upTo30).toBe(fromEuros(400));
    expect(buckets.upTo60).toBe(0);
    expect(buckets.over60).toBe(0);
    expect(buckets.oldestDays).toBe(13);
  });

  it('moves an invoice into the next bucket as it ages', () => {
    const buckets = aging(exampleBook(), '2026-10-05');
    expect(buckets.upTo30).toBe(0);
    expect(buckets.upTo60).toBe(fromEuros(400));
    expect(buckets.oldestDays).toBe(35);
  });

  it('leaves paid work out of it', () => {
    const buckets = aging(exampleBook(), '2026-12-31');
    expect(buckets.over60).toBe(fromEuros(400));
    expect(buckets.unbilled).toBe(fromEuros(200));
  });
});

/** The example fortnight, plus a day the October after it, so a year has to span. */
function twoMonths() {
  const book = exampleBook();
  return {
    ...book,
    slots: {
      ...book.slots,
      '2026-10-05T09': { projectId: 'tin', kind: 'standard' as const, rate: fromEuros(80) },
      '2026-10-05T10': { projectId: 'tin', kind: 'standard' as const, rate: fromEuros(80) },
      '2025-12-31T09': { projectId: 'nls', kind: 'standard' as const, rate: fromEuros(100) }
    },
    days: { ...book.days, '2026-10-05': { status: 'paid' as const } }
  };
}

describe('a year', () => {
  it('adds up hours, money and VAT over all twelve months', () => {
    const year = yearTotals(exampleBook(), '2026');

    expect(year.year).toBe('2026');
    expect(year.hours).toBe(9);
    expect(year.amount).toBe(fromEuros(900));
    expect(year.vat).toBe(Math.round(year.amount * 0.21));
    expect(year.gross).toBe(year.amount + year.vat);
    expect(year.averageRate).toBe(Math.round(year.amount / year.hours));
  });

  it('sums across months, which one month at a time never does', () => {
    const book = twoMonths();
    const year = yearTotals(book, '2026');

    expect(year.hours).toBe(11);
    expect(year.amount).toBe(monthTotals(book, '2026-09').amount + monthTotals(book, '2026-10').amount);
    expect(year.byProject['tin']).toEqual({ hours: 4, amount: fromEuros(360) });
  });

  it('gives every month a line, empty ones included', () => {
    const year = yearTotals(twoMonths(), '2026');

    expect(year.months).toHaveLength(12);
    expect(year.months.map((line) => line.month)).toEqual(eachMonthOfYear('2026'));
    expect(year.months[8]).toMatchObject({ month: '2026-09', hours: 9, amount: fromEuros(900) });
    expect(year.months[9]).toMatchObject({ month: '2026-10', hours: 2, amount: fromEuros(160) });
    expect(year.months[0]).toMatchObject({ hours: 0, amount: 0 });
  });

  it('splits each month, and the year, over the three states money can be in', () => {
    const year = yearTotals(twoMonths(), '2026');

    expect(year.months[8]?.byStatus).toEqual({
      unbilled: fromEuros(200),
      invoiced: fromEuros(400),
      paid: fromEuros(300)
    });
    expect(year.byStatus.paid).toBe(fromEuros(300 + 160));
    expect(year.outstanding).toBe(fromEuros(600));
  });

  it('leaves the years either side of it alone', () => {
    const year = yearTotals(twoMonths(), '2025');

    expect(year.hours).toBe(1);
    expect(year.amount).toBe(fromEuros(100));
    expect(year.days['2026-09-07']).toBeUndefined();
  });

  it('hands the heatmap one entry per worked day, and the fullest of them', () => {
    const year = yearTotals(exampleBook(), '2026');

    expect(Object.keys(year.days)).toEqual(['2026-09-07', '2026-09-08', '2026-09-09']);
    expect(year.days['2026-09-07']).toEqual({
      hours: 4,
      amount: fromEuros(400),
      status: 'invoiced'
    });
    expect(year.busiestHours).toBe(4);
  });

  it('reads a year with nothing in it without dividing by zero', () => {
    const year = yearTotals(exampleBook(), '2030');

    expect(year).toMatchObject({ hours: 0, amount: 0, averageRate: 0, busiestHours: 0 });
    expect(year.months).toHaveLength(12);
    expect(emptyYearTotals('2030')).toEqual(year);
  });
});

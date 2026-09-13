import { describe, expect, it } from 'vitest';
import { fromEuros } from '../src/domain/money';
import { aging, dayBlocks, dayTally, monthTotals, rateFor, weekTallies } from '../src/domain/rollups';
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

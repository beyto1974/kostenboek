import { describe, expect, it } from 'vitest';
import { fromEuros } from '../src/domain/money';
import { aging, dayTally, monthTotals, rateOf, weekTallies } from '../src/domain/rollups';
import { exampleBook, tinsmith } from './fixtures';

describe('rates', () => {
  it('takes the evening rate only for an evening hour', () => {
    expect(rateOf(tinsmith, false)).toBe(fromEuros(80));
    expect(rateOf(tinsmith, true)).toBe(fromEuros(120));
  });
});

describe('a day', () => {
  it('adds up its hours, its money and its projects', () => {
    const day = dayTally(exampleBook(), '2026-09-08');

    expect(day.hours).toBe(2);
    expect(day.amount).toBe(fromEuros(75 + 105));
    expect(day.status).toBe('unbilled');
    expect(day.byProject['tin']).toEqual({ hours: 2, amount: fromEuros(180) });
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
    expect(month.amount).toBe(fromEuros(4 * 95 + 75 + 105 + 3 * 95));
    expect(month.vat).toBe(Math.round(month.amount * 0.21));
    expect(month.gross).toBe(month.amount + month.vat);
  });

  it('splits the money over the three states it can be in', () => {
    const month = monthTotals(exampleBook(), '2026-09');

    expect(month.byStatus.invoiced).toBe(fromEuros(380));
    expect(month.byStatus.unbilled).toBe(fromEuros(180));
    expect(month.byStatus.paid).toBe(fromEuros(285));
    expect(month.outstanding).toBe(fromEuros(560));
  });

  it('adds up each project and the average earned per hour', () => {
    const month = monthTotals(exampleBook(), '2026-09');

    expect(month.byProject['nls']).toEqual({ hours: 7, amount: fromEuros(665) });
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
    expect(buckets.unbilled).toBe(fromEuros(180));
    // Invoice 2026-013 went out on 31 August: thirteen days ago.
    expect(buckets.upTo30).toBe(fromEuros(380));
    expect(buckets.upTo60).toBe(0);
    expect(buckets.over60).toBe(0);
    expect(buckets.oldestDays).toBe(13);
  });

  it('moves an invoice into the next bucket as it ages', () => {
    const buckets = aging(exampleBook(), '2026-10-05');
    expect(buckets.upTo30).toBe(0);
    expect(buckets.upTo60).toBe(fromEuros(380));
    expect(buckets.oldestDays).toBe(35);
  });

  it('leaves paid work out of it', () => {
    const buckets = aging(exampleBook(), '2026-12-31');
    expect(buckets.over60).toBe(fromEuros(380));
    expect(buckets.unbilled).toBe(fromEuros(180));
  });
});

import { describe, expect, it } from 'vitest';
import { formatEuros, fromEuros, sumCents, toEuros, vatOn, withVat } from '../src/domain/money';

describe('euros and cents', () => {
  it('keeps money as whole cents', () => {
    expect(fromEuros(100)).toBe(10000);
    expect(fromEuros(95.5)).toBe(9550);
    expect(fromEuros(0)).toBe(0);
  });

  it('rounds a fraction of a cent to the nearest cent', () => {
    expect(fromEuros(0.005)).toBe(1);
    expect(fromEuros(0.004)).toBe(0);
  });

  it('refuses an amount that is not a number', () => {
    expect(() => fromEuros(Number.NaN)).toThrow();
    expect(() => fromEuros(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('reads cents back as euros', () => {
    expect(toEuros(9550)).toBe(95.5);
  });

  it('adds without drifting', () => {
    const rates = [fromEuros(100), fromEuros(0.1), fromEuros(0.2)];
    expect(sumCents(rates)).toBe(9530);
    expect(sumCents([])).toBe(0);
  });
});

describe('VAT', () => {
  it('takes 21 percent of an amount, rounded to the cent', () => {
    expect(vatOn(10000, 0.21)).toBe(2100);
    expect(vatOn(9533, 0.21)).toBe(2002);
  });

  it('adds VAT on top', () => {
    expect(withVat(10000, 0.21)).toBe(12100);
  });

  it('refuses a rate outside 0 to 1', () => {
    expect(() => vatOn(100, 21)).toThrow();
    expect(() => vatOn(100, -0.1)).toThrow();
  });
});

describe('formatting', () => {
  it('writes amounts the Belgian way, without the cents when there are none', () => {
    expect(formatEuros(123450)).toBe('€ 1.234,50');
    expect(formatEuros(10000)).toBe('€ 95');
    expect(formatEuros(0)).toBe('€ 0');
  });

  it('keeps a negative amount readable', () => {
    expect(formatEuros(-10000)).toBe('-€ 95');
  });
});

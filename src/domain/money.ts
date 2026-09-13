/**
 * Money is whole cents. Rates, day totals and invoice amounts all add up from
 * integers, so a month of hours never drifts by a cent the way floating-point
 * euros would.
 */
export type Cents = number;

export function fromEuros(amount: number): Cents {
  if (!Number.isFinite(amount)) throw new TypeError('An amount must be a finite number.');
  return Math.round(amount * 100);
}

export function toEuros(cents: Cents): number {
  return cents / 100;
}

export function sumCents(amounts: readonly Cents[]): Cents {
  let total = 0;
  for (const amount of amounts) total += amount;
  return total;
}

function assertRate(rate: number): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError('A VAT rate is a fraction between 0 and 1, such as 0.21.');
  }
}

/** The VAT due on an amount, rounded to the cent. */
export function vatOn(cents: Cents, rate: number): Cents {
  assertRate(rate);
  return Math.round(cents * rate);
}

export function withVat(cents: Cents, rate: number): Cents {
  return cents + vatOn(cents, rate);
}

/**
 * Belgian notation: a full stop between thousands, a comma before the cents, and
 * no cents at all when they are zero — an hour book is read in whole euros far
 * more often than in change. Written by hand rather than through Intl so the
 * separators are the same in every browser and in the tests.
 */
export function formatEuros(cents: Cents): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const whole = Math.floor(absolute / 100);
  const rest = absolute % 100;

  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const body = rest === 0 ? grouped : `${grouped},${String(rest).padStart(2, '0')}`;
  return `${negative ? '-' : ''}€ ${body}`;
}

import { fromEuros } from '../src/domain/money';
import type { Book, Project } from '../src/domain/types';

export const northside: Project = {
  id: 'nls',
  code: 'NLS',
  name: 'Northside School site',
  client: 'Northside School',
  rate: fromEuros(100),
  premiumRate: fromEuros(150),
  color: 'var(--project-1)',
  archived: false
};

export const tinsmith: Project = {
  id: 'tin',
  code: 'TIN',
  name: 'Tinsmith mail server',
  client: 'Tinsmith Studio',
  rate: fromEuros(80),
  premiumRate: fromEuros(120),
  color: 'var(--project-4)',
  archived: false
};

/**
 * A fortnight of September 2026, small enough to add up by hand in a test:
 *
 *  - 07/09  four hours of NLS, invoiced on 2026-08-31 (so it ages)
 *  - 08/09  two hours of TIN, one of them at the higher rate, unbilled
 *  - 09/09  three hours of NLS, paid
 *
 * Every hour carries the rate it was booked at, which is what keeps a later rate
 * change off work that is already done.
 */
export function exampleBook(): Book {
  const day = (projectId: string, rate: number) => ({
    projectId,
    kind: 'standard' as const,
    rate: fromEuros(rate)
  });

  return {
    version: 2,
    projects: [northside, tinsmith],
    slots: {
      '2026-09-07T09': day('nls', 95),
      '2026-09-07T10': day('nls', 95),
      '2026-09-07T11': day('nls', 95),
      '2026-09-07T12': day('nls', 95),
      '2026-09-08T14': day('tin', 75),
      '2026-09-08T19': { projectId: 'tin', kind: 'premium', rate: fromEuros(120) },
      '2026-09-09T09': day('nls', 95),
      '2026-09-09T10': day('nls', 95),
      '2026-09-09T11': day('nls', 95)
    },
    days: {
      '2026-09-07': { status: 'invoiced', invoiceRef: '2026-013', sentOn: '2026-08-31' },
      '2026-09-08': { status: 'unbilled' },
      '2026-09-09': { status: 'paid', invoiceRef: '2026-012', sentOn: '2026-08-14' }
    },
    settings: { vatRate: 0.21, dayStart: 8, dayEnd: 20 }
  };
}

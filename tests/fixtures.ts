import { fromEuros } from '../src/domain/money';
import type { Book, Project } from '../src/domain/types';

export const northside: Project = {
  id: 'nls',
  code: 'NLS',
  name: 'Northside School site',
  client: 'Northside School',
  rate: fromEuros(100),
  eveningRate: fromEuros(150),
  color: 'var(--project-1)',
  archived: false
};

export const tinsmith: Project = {
  id: 'tin',
  code: 'TIN',
  name: 'Tinsmith mail server',
  client: 'Tinsmith Studio',
  rate: fromEuros(80),
  eveningRate: fromEuros(120),
  color: 'var(--project-4)',
  archived: false
};

/**
 * A fortnight of September 2026, small enough to add up by hand in a test:
 *
 *  - 07/09  four hours of NLS, invoiced on 2026-08-31 (so it ages)
 *  - 08/09  two hours of TIN, one of them in the evening, unbilled
 *  - 09/09  three hours of NLS, paid
 */
export function exampleBook(): Book {
  return {
    version: 1,
    projects: [northside, tinsmith],
    slots: {
      '2026-09-07T09': { projectId: 'nls', evening: false },
      '2026-09-07T10': { projectId: 'nls', evening: false },
      '2026-09-07T11': { projectId: 'nls', evening: false },
      '2026-09-07T12': { projectId: 'nls', evening: false },
      '2026-09-08T14': { projectId: 'tin', evening: false },
      '2026-09-08T19': { projectId: 'tin', evening: true },
      '2026-09-09T09': { projectId: 'nls', evening: false },
      '2026-09-09T10': { projectId: 'nls', evening: false },
      '2026-09-09T11': { projectId: 'nls', evening: false }
    },
    days: {
      '2026-09-07': { status: 'invoiced', invoiceRef: '2026-013', sentOn: '2026-08-31' },
      '2026-09-08': { status: 'unbilled' },
      '2026-09-09': { status: 'paid', invoiceRef: '2026-012', sentOn: '2026-08-14' }
    },
    settings: { vatRate: 0.21, dayStart: 8, dayEnd: 20 }
  };
}

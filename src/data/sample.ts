import { addDays, isWeekend, today as todayFrom, type PlainDate } from '../domain/dates';
import { fromEuros } from '../domain/money';
import { slotKey, slotRange } from '../domain/slots';
import type { Book, DayRecord, Project, Slot, SlotKey } from '../domain/types';

/**
 * The book the app opens on, so the first look shows a month with money in it
 * rather than an empty grid. Shown as an example throughout and never passed off
 * as the reader's own hours.
 *
 * Three weeks of freelance work for four clients: the oldest week paid, the week
 * after it invoiced and still waiting, and everything since then not sent out
 * yet — the state a freelance month is usually in. The dates are generated from
 * the day it is opened rather than written down, so the story reads the same
 * whenever somebody arrives.
 */
export function sampleBook(today: PlainDate = todayFrom()): Book {
  const projects: Project[] = [
    project('nls', 'NLS', 'Northside School site', 'Northside School', 90, 140, 1),
    project('hrb', 'HRB', 'Harbour Bakery shop', 'Harbour Bakery', 80, 120, 2),
    project('orc', 'ORC', 'Orchard billing API', 'Orchard Hosting', 100, 150, 3),
    project('tin', 'TIN', 'Tinsmith mail server', 'Tinsmith Studio', 70, 100, 4)
  ];

  /** The last sixteen working days, most recent first. */
  const workdays: PlainDate[] = [];
  for (let back = 1; workdays.length < 16 && back < 40; back += 1) {
    const date = addDays(today, -back);
    if (!isWeekend(date)) workdays.push(date);
  }

  const slots: Record<SlotKey, Slot> = {};
  const days: Record<PlainDate, DayRecord> = {};

  workdays.forEach((date, index) => {
    for (const [id, from, to] of dayPattern(index)) {
      for (const key of slotRange(date, from, to)) slots[key] = { projectId: id, evening: false };
    }
    // One call-out a fortnight, billed at the evening rate.
    if (index === 2 || index === 11) {
      slots[slotKey(date, 19)] = { projectId: 'tin', evening: true };
      slots[slotKey(date, 20)] = { projectId: 'tin', evening: true };
    }
    days[date] = statusFor(index, today);
  });

  return {
    version: 1,
    example: true,
    projects,
    slots,
    days,
    settings: { vatRate: 0.21, dayStart: 8, dayEnd: 20 }
  };
}

/** What a working day looked like: project, first hour, hour after the last. */
function dayPattern(index: number): [string, number, number][] {
  switch (index % 5) {
    case 0:
      return [['nls', 9, 13]];
    case 1:
      return [['hrb', 13, 17]];
    case 2:
      return [['orc', 9, 12]];
    case 3:
      return [['tin', 14, 18]];
    default:
      return [
        ['nls', 10, 13],
        ['orc', 14, 16]
      ];
  }
}

function statusFor(index: number, today: PlainDate): DayRecord {
  if (index < 5) return { status: 'unbilled' };
  if (index < 10) return { status: 'invoiced', invoiceRef: '2026-013', sentOn: addDays(today, -9) };
  return { status: 'paid', invoiceRef: '2026-012', sentOn: addDays(today, -24) };
}

function project(
  id: string,
  code: string,
  name: string,
  client: string,
  rate: number,
  eveningRate: number,
  color: number
): Project {
  return {
    id,
    code,
    name,
    client,
    rate: fromEuros(rate),
    eveningRate: fromEuros(eveningRate),
    color: `var(--project-${color})`,
    archived: false
  };
}

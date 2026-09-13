import { plainDate, type PlainDate } from './dates';
import { cleanText } from './text';
import type { Book, DayRecord, DayStatus, ProjectId, SlotKey } from './types';

/**
 * The grid is the storage: an hour is either booked to a project or it is not.
 * Every function here hands back a new book, so the worker can swap one snapshot
 * for the next without anything holding a half-changed one.
 */

export function slotKey(date: PlainDate, hour: number): SlotKey {
  plainDate(date);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`An hour of the day is 0 to 23, not ${hour}.`);
  }
  return `${date}T${String(hour).padStart(2, '0')}`;
}

export function parseSlot(key: SlotKey): { date: PlainDate; hour: number } {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})$/.exec(key);
  if (!match) throw new TypeError(`"${key}" is not an hour of a day.`);
  return { date: plainDate(match[1] as string), hour: Number(match[2]) };
}

/** The hours of one day from one hour up to another, the last one excluded. */
export function slotRange(date: PlainDate, from: number, to: number): SlotKey[] {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const keys: SlotKey[] = [];
  for (let hour = start; hour < end; hour += 1) keys.push(slotKey(date, hour));
  return keys;
}

export function hoursOfDay(book: Book, date: PlainDate): number {
  let hours = 0;
  for (const key of Object.keys(book.slots)) if (key.startsWith(`${date}T`)) hours += 1;
  return hours;
}

export function slotsOfDay(book: Book, date: PlainDate): SlotKey[] {
  return Object.keys(book.slots)
    .filter((key) => key.startsWith(`${date}T`))
    .sort();
}

/** Books hours to a project, taking over whatever was in them. */
export function paintSlots(
  book: Book,
  keys: readonly SlotKey[],
  projectId: ProjectId,
  evening: boolean
): Book {
  if (!book.projects.some((project) => project.id === projectId)) {
    throw new RangeError(`There is no project "${projectId}" in this book.`);
  }

  const slots = { ...book.slots };
  const days = { ...book.days };
  for (const key of keys) {
    const { date } = parseSlot(key);
    slots[key] = { projectId, evening };
    days[date] ??= { status: 'unbilled' };
  }
  return { ...book, slots, days };
}

/** Empties hours, and lets go of a day that has nothing left on it. */
export function clearSlots(book: Book, keys: readonly SlotKey[]): Book {
  const slots = { ...book.slots };
  const touched = new Set<PlainDate>();
  for (const key of keys) {
    touched.add(parseSlot(key).date);
    delete slots[key];
  }

  const days = { ...book.days };
  for (const date of touched) {
    const stillWorked = Object.keys(slots).some((key) => key.startsWith(`${date}T`));
    if (!stillWorked) delete days[date];
  }
  return { ...book, slots, days };
}

export interface InvoiceMark {
  invoiceRef?: string;
  sentOn?: PlainDate;
}

/**
 * Moves a day along: unbilled → invoiced → paid. Going back to unbilled drops the
 * invoice it was on, since there is no invoice to point at any more; every other
 * move keeps it.
 */
export function setDayStatus(
  book: Book,
  date: PlainDate,
  status: DayStatus,
  mark: InvoiceMark = {}
): Book {
  if (hoursOfDay(book, date) === 0) {
    throw new RangeError(`${date} has no hours on it, so it has nothing to invoice.`);
  }

  const current = book.days[date];
  let next: DayRecord;
  if (status === 'unbilled') {
    next = { status };
  } else {
    next = { status };
    const reference = cleanText(mark.invoiceRef) || current?.invoiceRef;
    const sentOn = mark.sentOn ? plainDate(mark.sentOn) : current?.sentOn;
    if (reference) next.invoiceRef = reference;
    if (sentOn) next.sentOn = sentOn;
  }

  return { ...book, days: { ...book.days, [date]: next } };
}

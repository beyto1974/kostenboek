import { eachDayOfMonth, monthGrid, plainDate, type PlainDate, type PlainMonth } from './dates';
import type { Cents } from './money';
import { vatOn } from './money';
import { parseSlot } from './slots';
import type { Book, DayStatus, Project, ProjectId, RateKind, Slot } from './types';

/** Hours and what they are worth — the shape every total in the app takes. */
export interface Tally {
  hours: number;
  amount: Cents;
}

export interface DayTally extends Tally {
  date: PlainDate;
  status: DayStatus;
  byProject: Record<ProjectId, Tally>;
}

export interface WeekTally extends Tally {
  week: number;
}

export interface MonthTotals extends Tally {
  month: PlainMonth;
  vat: Cents;
  gross: Cents;
  /** What an hour earned on average this month. */
  averageRate: Cents;
  /** Everything not yet paid, invoiced or not. */
  outstanding: Cents;
  byStatus: Record<DayStatus, Cents>;
  byProject: Record<ProjectId, Tally>;
}

export interface Aging {
  unbilled: Cents;
  upTo30: Cents;
  upTo60: Cents;
  over60: Cents;
  /** Days since the oldest unpaid invoice went out; 0 when nothing is out. */
  oldestDays: number;
}

/** What the next hour of this project would be worth, at either of its two rates. */
export function rateFor(project: Project, kind: RateKind): Cents {
  return kind === 'premium' ? project.premiumRate : project.rate;
}

function add(into: Record<ProjectId, Tally>, id: ProjectId, amount: Cents): void {
  const current = into[id] ?? { hours: 0, amount: 0 };
  into[id] = { hours: current.hours + 1, amount: current.amount + amount };
}

/** The worth of one booked hour: the rate it was booked at, and nothing since. */
function worth(slot: Slot): Cents {
  return slot.rate;
}

export function dayTally(book: Book, date: PlainDate): DayTally {
  plainDate(date);
  const byProject: Record<ProjectId, Tally> = {};
  let hours = 0;
  let amount = 0;

  for (const [key, slot] of Object.entries(book.slots)) {
    if (!key.startsWith(`${date}T`)) continue;
    const value = worth(slot);
    hours += 1;
    amount += value;
    add(byProject, slot.projectId, value);
  }

  return { date, hours, amount, status: book.days[date]?.status ?? 'unbilled', byProject };
}

export function monthTotals(book: Book, month: PlainMonth): MonthTotals {
  const byStatus: Record<DayStatus, Cents> = { unbilled: 0, invoiced: 0, paid: 0 };
  const byProject: Record<ProjectId, Tally> = {};
  let hours = 0;
  let amount = 0;

  for (const date of eachDayOfMonth(month)) {
    const day = dayTally(book, date);
    if (day.hours === 0) continue;
    hours += day.hours;
    amount += day.amount;
    byStatus[day.status] += day.amount;
    for (const [id, tally] of Object.entries(day.byProject)) {
      const current = byProject[id] ?? { hours: 0, amount: 0 };
      byProject[id] = {
        hours: current.hours + tally.hours,
        amount: current.amount + tally.amount
      };
    }
  }

  const vat = vatOn(amount, book.settings.vatRate);
  return {
    month,
    hours,
    amount,
    vat,
    gross: amount + vat,
    averageRate: hours === 0 ? 0 : Math.round(amount / hours),
    outstanding: byStatus.unbilled + byStatus.invoiced,
    byStatus,
    byProject
  };
}

/** One line per calendar row of the month, for the week column beside the grid. */
export function weekTallies(book: Book, month: PlainMonth): WeekTally[] {
  return monthGrid(month).map((row) => {
    let hours = 0;
    let amount = 0;
    for (const date of row.days) {
      if (!date) continue;
      const day = dayTally(book, date);
      hours += day.hours;
      amount += day.amount;
    }
    return { week: row.week, hours, amount };
  });
}

const DAY_MS = 86_400_000;

function daysBetween(from: PlainDate, to: PlainDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * What is owed, by how long it has been owed. Work that has not been invoiced is
 * counted apart: it is not late, it is simply not asked for yet.
 */
export function aging(book: Book, asOf: PlainDate): Aging {
  plainDate(asOf);
  const buckets: Aging = { unbilled: 0, upTo30: 0, upTo60: 0, over60: 0, oldestDays: 0 };
  const seen = new Set<PlainDate>();

  for (const key of Object.keys(book.slots)) {
    const { date } = parseSlot(key);
    if (seen.has(date)) continue;
    seen.add(date);

    const day = dayTally(book, date);
    if (day.amount === 0) continue;
    const record = book.days[date];
    const status = record?.status ?? 'unbilled';
    if (status === 'paid') continue;
    if (status === 'unbilled') {
      buckets.unbilled += day.amount;
      continue;
    }

    const age = record?.sentOn ? daysBetween(record.sentOn, asOf) : 0;
    if (age <= 30) buckets.upTo30 += day.amount;
    else if (age <= 60) buckets.upTo60 += day.amount;
    else buckets.over60 += day.amount;
    buckets.oldestDays = Math.max(buckets.oldestDays, age);
  }

  return buckets;
}

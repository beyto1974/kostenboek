/**
 * Dates in this app are calendar dates, never instants: an hour booked on
 * 13 September stays on 13 September in any timezone. They are held as
 * 'YYYY-MM-DD' strings and all arithmetic goes through UTC so a daylight-saving
 * change can never move a day.
 */
export type PlainDate = string;

/** A calendar month, 'YYYY-MM'. */
export type PlainMonth = string;

/** A calendar year, 'YYYY'. */
export type PlainYear = string;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const YEAR_PATTERN = /^\d{4}$/;
const DAY_MS = 86_400_000;

/** Days in a month, 1-indexed on the month. */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) throw new RangeError(`There is no month ${month}.`);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Validates a calendar date and hands it back, so bad input stops at the edge. */
export function plainDate(value: string): PlainDate {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new TypeError(`A date must be written as YYYY-MM-DD, not "${value}".`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) throw new RangeError(`There is no month ${month} in "${value}".`);
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(`${value} is not a day that month has.`);
  }
  return value;
}

export function isPlainDate(value: unknown): value is PlainDate {
  if (typeof value !== 'string') return false;
  try {
    plainDate(value);
    return true;
  } catch {
    return false;
  }
}

/** Validates 'YYYY-MM'. */
export function plainMonth(value: string): PlainMonth {
  const match = MONTH_PATTERN.exec(value);
  if (!match) throw new TypeError(`A month must be written as YYYY-MM, not "${value}".`);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new RangeError(`There is no month ${month} in "${value}".`);
  return value;
}

/** Today, read from whatever clock is passed in — tests pass their own. */
export function today(clock: () => Date = () => new Date()): PlainDate {
  const now = clock();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Validates 'YYYY'. */
export function plainYear(value: string): PlainYear {
  if (!YEAR_PATTERN.test(value)) {
    throw new TypeError(`A year must be written as YYYY, not "${value}".`);
  }
  return value;
}

export function monthOf(date: PlainDate): PlainMonth {
  return date.slice(0, 7);
}

/** The year of a date or of a month — both are written year first. */
export function yearOf(dateOrMonth: PlainDate | PlainMonth): PlainYear {
  return dateOrMonth.slice(0, 4);
}

export function dayOfMonth(date: PlainDate): number {
  return Number(date.slice(8, 10));
}

export function addDays(date: PlainDate, days: number): PlainDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Adds months, clamping to the last day when the target month is shorter. */
export function addMonths(date: PlainDate, months: number): PlainDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const total = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(total / 12);
  const targetMonth = (total % 12) + 1;
  const clamped = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${targetYear}-${pad(targetMonth)}-${pad(clamped)}`;
}

/** Monday is 0, Sunday is 6 — the week as it is read here. */
export function weekdayIndex(date: PlainDate): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function isWeekend(date: PlainDate): boolean {
  return weekdayIndex(date) > 4;
}

/**
 * ISO 8601 week number: weeks run Monday to Sunday and belong to the year that
 * holds their Thursday, which is why 1 January can sit in week 53 of the year
 * before.
 */
export function isoWeek(date: PlainDate): number {
  const thursday = toUtc(date) + (3 - weekdayIndex(date)) * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const firstThursday = Date.UTC(year, 0, 4);
  const firstMonday = firstThursday - ((new Date(firstThursday).getUTCDay() + 6) % 7) * DAY_MS;
  return Math.round((thursday - firstMonday) / (7 * DAY_MS)) + 1;
}

export function eachDayOfMonth(month: PlainMonth): PlainDate[] {
  plainMonth(month);
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  const days: PlainDate[] = [];
  for (let day = 1; day <= daysInMonth(year, index); day += 1) days.push(`${month}-${pad(day)}`);
  return days;
}

/** One row of the calendar: seven slots, blank where the month has not started. */
export interface CalendarWeek {
  week: number;
  days: (PlainDate | null)[];
}

/** A month laid out as calendar rows, Monday first, for the calendar view. */
export function monthGrid(month: PlainMonth): CalendarWeek[] {
  const days = eachDayOfMonth(month);
  const first = days[0];
  if (!first) return [];

  const weeks: CalendarWeek[] = [];
  let row: (PlainDate | null)[] = new Array(weekdayIndex(first)).fill(null);
  let anchor = first;

  for (const day of days) {
    if (row.length === 0) anchor = day;
    row.push(day);
    if (row.length === 7) {
      weeks.push({ week: isoWeek(anchor), days: row });
      row = [];
    }
  }
  if (row.length > 0) {
    weeks.push({ week: isoWeek(anchor), days: [...row, ...new Array(7 - row.length).fill(null)] });
  }
  return weeks;
}

export function eachMonthOfYear(year: PlainYear): PlainMonth[] {
  plainYear(year);
  return Array.from({ length: 12 }, (_, index) => `${year}-${pad(index + 1)}`);
}

/**
 * One column of the year heatmap: a week read downwards, Monday at the top, with
 * blanks before the year has started and after it has ended.
 */
export interface YearColumn {
  days: (PlainDate | null)[];
  /** The month to write above this column, on the first column that month reaches. */
  label: PlainMonth | null;
}

/**
 * A whole year as week-tall columns, which is how a year of days fits on one
 * screen: 52 or 53 columns of seven, running from the Monday on or before
 * 1 January to the Sunday on or after 31 December.
 */
export function yearColumns(year: PlainYear): YearColumn[] {
  const days = eachMonthOfYear(year).flatMap(eachDayOfMonth);
  const first = days[0] as PlainDate;

  const columns: YearColumn[] = [];
  const labelled = new Set<PlainMonth>();
  let column: (PlainDate | null)[] = new Array(weekdayIndex(first)).fill(null);

  const close = (): void => {
    const opening = column.find((day): day is PlainDate => day !== null);
    const month = opening ? monthOf(opening) : null;
    const label = month && !labelled.has(month) ? month : null;
    if (label) labelled.add(label);
    columns.push({ days: [...column, ...new Array(7 - column.length).fill(null)], label });
    column = [];
  };

  for (const day of days) {
    column.push(day);
    if (column.length === 7) close();
  }
  if (column.length > 0) close();
  return columns;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toUtc(date: PlainDate): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

function fromUtc(ms: number): PlainDate {
  const at = new Date(ms);
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

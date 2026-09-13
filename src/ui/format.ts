import type { PlainDate, PlainMonth } from '../domain/dates';
import type { DayStatus } from '../domain/types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const STATUS_LABEL: Record<DayStatus, string> = {
  unbilled: 'to invoice',
  invoiced: 'invoiced',
  paid: 'paid'
};

/** Short enough for a calendar cell. */
export const STATUS_SHORT: Record<DayStatus, string> = {
  unbilled: 'open',
  invoiced: 'sent',
  paid: 'paid'
};

export function monthLabel(month: PlainMonth): string {
  const index = Number(month.slice(5, 7)) - 1;
  return `${MONTHS[index] ?? month} ${month.slice(0, 4)}`;
}

/** 'Sep' — the month where a column of a year is too narrow for its name. */
export function monthShort(month: PlainMonth): string {
  return MONTHS[Number(month.slice(5, 7)) - 1]?.slice(0, 3) ?? month;
}

export function weekdayLabel(index: number): string {
  return WEEKDAYS[index] ?? '';
}

/** '13/09', the way a date is read beside an hour. */
export function dayLabel(date: PlainDate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function hoursLabel(hours: number): string {
  return `${hours}h`;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

import { isPlainDate, type PlainDate } from '../domain/dates';
import { cleanText } from '../domain/text';
import type {
  Book,
  DayRecord,
  DayStatus,
  Project,
  RateKind,
  Settings,
  Slot,
  SlotKey
} from '../domain/types';

/**
 * The schema this build writes. A file from a later one is not opened; a file
 * from an earlier one is migrated on the way in.
 *
 *  1 → 2  every hour carries the rate it was booked at, and the second rate is a
 *         choice rather than something the clock decides (`eveningRate` became
 *         `premiumRate`, `evening: true` became `kind: 'premium'`).
 */
export const BOOK_VERSION = 2;

const DEFAULT_SETTINGS: Settings = { vatRate: 0.21, dayStart: 8, dayEnd: 20 };
const STATUSES: DayStatus[] = ['unbilled', 'invoiced', 'paid'];
const SLOT_KEY = /^(\d{4}-\d{2}-\d{2})T(\d{2})$/;

/** Raised with a message meant to be shown to the person who picked the file. */
export class BookFormatError extends Error {}

export function emptyBook(): Book {
  return { version: BOOK_VERSION, projects: [], slots: {}, days: {}, settings: { ...DEFAULT_SETTINGS } };
}

export function encodeBook(book: Book): string {
  return `${JSON.stringify(book, null, 2)}\n`;
}

/**
 * Reads a book back. Anything structural — not JSON, not an object, a version
 * from the future — is refused outright; a single unreadable hour or day is
 * dropped instead, because one bad row should never cost somebody a year of work.
 */
export function decodeBook(text: string): Book {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BookFormatError('This file is not a kostenboek export — it is not even JSON.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BookFormatError('This file does not hold a book.');
  }

  const candidate = raw as Record<string, unknown>;
  const version = candidate['version'];
  if (version !== BOOK_VERSION && version !== 1) {
    if (typeof version === 'number' && version > BOOK_VERSION) {
      throw new BookFormatError(
        `This file is from a newer version of kostenboek (${version}). Update the app, then open it again.`
      );
    }
    throw new BookFormatError('This file does not hold a book.');
  }
  if (!Array.isArray(candidate['projects'])) {
    throw new BookFormatError('This file has no projects in it, so it is not a book.');
  }

  const projects = candidate['projects'].flatMap(readProject);
  const byId = new Map(projects.map((project) => [project.id, project]));

  const book: Book = {
    version: BOOK_VERSION,
    projects,
    slots: readSlots(candidate['slots'], byId),
    days: readDays(candidate['days']),
    settings: readSettings(candidate['settings'])
  };
  if (candidate['example'] === true) book.example = true;
  return book;
}

/** Never throws: unreadable storage simply means nothing was saved. */
export function safeDecodeBook(text: string | null | undefined): Book | null {
  if (typeof text !== 'string' || text === '') return null;
  try {
    return decodeBook(text);
  } catch {
    return null;
  }
}

function readProject(value: unknown): Project[] {
  if (typeof value !== 'object' || value === null) return [];
  const raw = value as Record<string, unknown>;

  const id = cleanText(raw['id'] as string);
  const name = cleanText(raw['name'] as string);
  const code = cleanText(raw['code'] as string).toUpperCase();
  if (id === '' || name === '' || code === '') return [];

  const rate = wholeCents(raw['rate']);
  // 'eveningRate' is what version 1 called the second rate.
  const premiumRate = wholeCents(raw['premiumRate']) ?? wholeCents(raw['eveningRate']);
  if (rate === null) return [];

  return [
    {
      id,
      code,
      name,
      client: cleanText(raw['client'] as string),
      rate,
      premiumRate: premiumRate ?? rate,
      color: cleanText(raw['color'] as string) || 'var(--project-1)',
      archived: raw['archived'] === true
    }
  ];
}

function readSlots(value: unknown, projects: Map<string, Project>): Record<SlotKey, Slot> {
  if (typeof value !== 'object' || value === null) return {};
  const slots: Record<SlotKey, Slot> = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const match = SLOT_KEY.exec(key);
    if (!match || !isPlainDate(match[1] as string)) continue;
    if (Number(match[2]) > 23) continue;
    if (typeof raw !== 'object' || raw === null) continue;

    const slot = raw as Record<string, unknown>;
    const projectId = cleanText(slot['projectId'] as string);
    const project = projects.get(projectId);
    if (!project) continue;

    // Version 1 held the choice as a flag and no rate at all; the rate the
    // project has now is the closest thing to what that hour was worth.
    const kind: RateKind =
      slot['kind'] === 'premium' || slot['evening'] === true ? 'premium' : 'standard';
    const stored = wholeCents(slot['rate']);
    slots[key] = {
      projectId,
      kind,
      rate: stored ?? (kind === 'premium' ? project.premiumRate : project.rate)
    };
  }
  return slots;
}

function readDays(value: unknown): Record<PlainDate, DayRecord> {
  if (typeof value !== 'object' || value === null) return {};
  const days: Record<PlainDate, DayRecord> = {};

  for (const [date, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!isPlainDate(date) || typeof raw !== 'object' || raw === null) continue;
    const record = raw as Record<string, unknown>;
    const status = record['status'];
    if (typeof status !== 'string' || !STATUSES.includes(status as DayStatus)) continue;

    const day: DayRecord = { status: status as DayStatus };
    const reference = cleanText(record['invoiceRef'] as string);
    if (reference !== '') day.invoiceRef = reference;
    const sentOn = record['sentOn'];
    if (typeof sentOn === 'string' && isPlainDate(sentOn)) day.sentOn = sentOn;

    days[date] = day;
  }
  return days;
}

function readSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_SETTINGS };
  const raw = value as Record<string, unknown>;

  const vatRate = raw['vatRate'];
  const dayStart = raw['dayStart'];
  const dayEnd = raw['dayEnd'];

  return {
    vatRate:
      typeof vatRate === 'number' && vatRate >= 0 && vatRate <= 1 ? vatRate : DEFAULT_SETTINGS.vatRate,
    dayStart: hourOr(dayStart, DEFAULT_SETTINGS.dayStart),
    dayEnd: hourOr(dayEnd, DEFAULT_SETTINGS.dayEnd)
  };
}

function hourOr(value: unknown, fallback: number): number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23
    ? (value as number)
    : fallback;
}

function wholeCents(value: unknown): number | null {
  return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null;
}

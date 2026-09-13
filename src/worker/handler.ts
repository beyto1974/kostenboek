import {
  monthOf,
  plainMonth,
  today as todayFrom,
  yearOf,
  type PlainMonth
} from '../domain/dates';
import { colorForIndex } from '../domain/palette';
import { aging, monthTotals, weekTallies, yearTotals } from '../domain/rollups';
import { clearSlots, paintSlots, setDayStatus } from '../domain/slots';
import { cleanText, requireText } from '../domain/text';
import type { Book, Project } from '../domain/types';
import { BookFormatError, decodeBook, emptyBook, encodeBook } from '../persistence/codec';
import type { BookStore } from '../persistence/ports';
import type { ProjectInput, Request, Response } from './protocol';

export interface HandlerOptions {
  store: BookStore;
  clock?: () => Date;
  /** The book a first-time visitor is shown, so the app never opens empty. */
  sample?: () => Book;
}

/**
 * The whole application, minus the screen. It owns the book, writes it to the
 * store, and answers every request with the totals for the month being looked
 * at. It knows nothing about workers, which is why it can be tested by calling
 * it.
 */
export function createHandler({
  store,
  clock = () => new Date(),
  sample = emptyBook
}: HandlerOptions): (request: Request) => Promise<Response> {
  let book: Book | null = null;
  let month: PlainMonth | null = null;

  async function ensureOpen(): Promise<Book> {
    if (book) return book;
    const saved = await store.load();
    if (saved) {
      book = saved;
    } else {
      book = { ...sample(), example: true };
      await store.save(book);
    }
    return book;
  }

  async function commit(next: Book): Promise<Book> {
    book = next;
    await store.save(next);
    return next;
  }

  function snapshot(current: Book): Response {
    const today = todayFrom(clock);
    const shown = month ?? monthOf(today);
    return {
      kind: 'snapshot',
      book: current,
      month: shown,
      today,
      totals: monthTotals(current, shown),
      year: yearTotals(current, yearOf(shown)),
      weeks: weekTallies(current, shown),
      aging: aging(current, today),
      isExample: current.example === true
    };
  }

  return async function handle(request: Request): Promise<Response> {
    try {
      if ('month' in request && request.month) month = plainMonth(request.month);
      const current = await ensureOpen();
      month ??= monthOf(todayFrom(clock));

      switch (request.kind) {
        case 'open':
        case 'view':
          return snapshot(current);

        case 'paint':
          return snapshot(
            await commit(paintSlots(current, request.slots, request.projectId, request.rate))
          );

        case 'clear':
          return snapshot(await commit(clearSlots(current, request.slots)));

        case 'setDayStatus':
          return snapshot(
            await commit(
              setDayStatus(current, request.date, request.status, {
                ...(request.invoiceRef === undefined ? {} : { invoiceRef: request.invoiceRef }),
                ...(request.sentOn === undefined ? {} : { sentOn: request.sentOn })
              })
            )
          );

        case 'upsertProject':
          return snapshot(await commit(upsert(current, request.project)));

        case 'import':
          return snapshot(await commit({ ...decodeBook(request.text), example: undefined }));

        case 'export':
          return {
            kind: 'file',
            filename: `kostenboek-${todayFrom(clock)}.json`,
            text: encodeBook(current)
          };

        case 'clearExample':
          return snapshot(await commit(emptyBook()));
      }
    } catch (error) {
      return { kind: 'error', message: messageFor(error) };
    }
  };
}

/** Adds a project, or replaces the one with the same id. Text is cleaned here. */
function upsert(book: Book, input: ProjectInput): Book {
  const name = requireText(input.name, 'project name');
  const code = requireText(input.code, 'project code', 6).toUpperCase();
  const rate = wholeCents(input.rate, 'hourly rate');
  const premiumRate =
    input.premiumRate === undefined ? rate : wholeCents(input.premiumRate, 'second rate');

  const existing = input.id ? book.projects.find((project) => project.id === input.id) : undefined;
  const project: Project = {
    id: existing?.id ?? uniqueId(book, code),
    code,
    name,
    client: cleanText(input.client),
    rate,
    premiumRate,
    color: cleanText(input.color) || existing?.color || nextColor(book),
    archived: input.archived ?? existing?.archived ?? false
  };

  const projects = existing
    ? book.projects.map((candidate) => (candidate.id === project.id ? project : candidate))
    : [...book.projects, project];
  return { ...book, projects };
}

function uniqueId(book: Book, code: string): string {
  const base = code.toLowerCase();
  if (!book.projects.some((project) => project.id === base)) return base;
  let suffix = 2;
  while (book.projects.some((project) => project.id === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Ten project colours live in the stylesheet; after that they come round again. */
function nextColor(book: Book): string {
  return colorForIndex(book.projects.length);
}

function wholeCents(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`The ${field} must be a whole number of cents.`);
  }
  return value;
}

function messageFor(error: unknown): string {
  if (error instanceof BookFormatError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

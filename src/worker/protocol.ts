import type { PlainDate, PlainMonth } from '../domain/dates';
import type { Aging, MonthTotals, WeekTally } from '../domain/rollups';
import type { Book, DayStatus, ProjectId, RateKind, SlotKey } from '../domain/types';

/** What the UI may send a project's way. Rates are cents; text arrives untrimmed. */
export interface ProjectInput {
  id?: ProjectId;
  code: string;
  name: string;
  client?: string;
  rate: number;
  premiumRate?: number;
  color?: string;
  archived?: boolean;
}

export type Request =
  | { kind: 'open'; month?: PlainMonth }
  | { kind: 'view'; month: PlainMonth }
  | { kind: 'paint'; slots: SlotKey[]; projectId: ProjectId; rate: RateKind; month?: PlainMonth }
  | { kind: 'clear'; slots: SlotKey[]; month?: PlainMonth }
  | {
      kind: 'setDayStatus';
      date: PlainDate;
      status: DayStatus;
      invoiceRef?: string;
      sentOn?: PlainDate;
      month?: PlainMonth;
    }
  | { kind: 'upsertProject'; project: ProjectInput; month?: PlainMonth }
  | { kind: 'import'; text: string; month?: PlainMonth }
  | { kind: 'export' }
  | { kind: 'clearExample'; month?: PlainMonth };

/**
 * Every change answers with the whole picture for the month on screen, so the UI
 * never has to work out what a click did to a total — it just renders what came
 * back.
 */
export interface SnapshotResponse {
  kind: 'snapshot';
  book: Book;
  month: PlainMonth;
  today: PlainDate;
  totals: MonthTotals;
  weeks: WeekTally[];
  aging: Aging;
  isExample: boolean;
}

export type Response =
  | SnapshotResponse
  | { kind: 'file'; filename: string; text: string }
  | { kind: 'error'; message: string };

/** How a request and its answer travel over the port. */
export interface RequestEnvelope {
  id: number;
  request: Request;
}

export interface ResponseEnvelope {
  id: number;
  response: Response;
}

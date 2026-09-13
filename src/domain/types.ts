import type { PlainDate } from './dates';
import type { Cents } from './money';

export type ProjectId = string;

/** One hour of one day: '2026-09-13T09'. */
export type SlotKey = string;

/** Where the money for a day has got to. */
export type DayStatus = 'unbilled' | 'invoiced' | 'paid';

export interface Project {
  id: ProjectId;
  /** Three or four letters, how the project reads in a grid cell. */
  code: string;
  name: string;
  client: string;
  rate: Cents;
  /** What an hour outside office hours is worth. */
  eveningRate: Cents;
  /** A CSS custom property, so the palette stays with the stylesheet. */
  color: string;
  archived: boolean;
}

/** An hour that was worked. The rate is not stored — it is read from the project. */
export interface Slot {
  projectId: ProjectId;
  evening: boolean;
}

export interface DayRecord {
  status: DayStatus;
  invoiceRef?: string;
  /** The day the invoice went out; what the aging buckets count from. */
  sentOn?: PlainDate;
}

export interface Settings {
  vatRate: number;
  /** The first and last hour shown in the grid; hours outside it can still exist. */
  dayStart: number;
  dayEnd: number;
}

/** Everything the app keeps. One book per browser, exported as one file. */
export interface Book {
  version: 1;
  /** True while the book is still the worked example the app opened with. */
  example?: boolean;
  projects: Project[];
  slots: Record<SlotKey, Slot>;
  days: Record<PlainDate, DayRecord>;
  settings: Settings;
}

/**
 * The book lives in one browser and nowhere else, so the only thing standing
 * between a cleared cache and a lost year is an exported file. After a week
 * without one the app says so — once, dismissibly, and never about a book that
 * is still the example or still empty.
 */
export const BACKUP_AFTER_DAYS = 7;

/** How long a dismissal buys before the reminder comes back. */
export const DISMISS_FOR_HOURS = 24;

const DAY = 86_400_000;
const HOUR = 3_600_000;

export interface BackupInput {
  /** Milliseconds since the epoch, read at the moment of asking. */
  now: number;
  lastExportAt: number | null;
  /** When this browser first opened the book: what "never exported" counts from. */
  firstSeenAt: number;
  dismissedAt: number | null;
  hasWork: boolean;
  isExample: boolean;
}

export interface BackupReminder {
  due: boolean;
  /** Whole days since the last export, or since the book was first opened. */
  days: number;
}

export function backupReminder(input: BackupInput): BackupReminder {
  const since = input.lastExportAt ?? input.firstSeenAt;
  // A clock that has been moved back reads as no time passed, never as a negative age.
  const days = Math.max(0, Math.floor((input.now - since) / DAY));

  if (input.isExample || !input.hasWork) return { due: false, days };
  if (days < BACKUP_AFTER_DAYS) return { due: false, days };

  const snoozed =
    input.dismissedAt !== null && input.now - input.dismissedAt < DISMISS_FOR_HOURS * HOUR;
  return { due: !snoozed, days };
}

import { describe, expect, it } from 'vitest';
import { backupReminder, BACKUP_AFTER_DAYS, DISMISS_FOR_HOURS } from '../src/domain/backup';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = Date.parse('2026-09-13T10:00:00Z');

function ask(overrides: Partial<Parameters<typeof backupReminder>[0]> = {}) {
  return backupReminder({
    now: NOW,
    lastExportAt: null,
    firstSeenAt: NOW - 2 * DAY,
    dismissedAt: null,
    hasWork: true,
    isExample: false,
    ...overrides
  });
}

describe('when a backup is due', () => {
  it('stays quiet while the last export is recent', () => {
    expect(ask({ lastExportAt: NOW - 3 * DAY })).toMatchObject({ due: false, days: 3 });
  });

  it('asks once a week has gone by', () => {
    expect(ask({ lastExportAt: NOW - 7 * DAY })).toMatchObject({ due: true, days: 7 });
    expect(ask({ lastExportAt: NOW - 19 * DAY })).toMatchObject({ due: true, days: 19 });
  });

  it('counts from the first time the book was opened when nothing was ever exported', () => {
    expect(ask({ firstSeenAt: NOW - 2 * DAY })).toMatchObject({ due: false, days: 2 });
    expect(ask({ firstSeenAt: NOW - 9 * DAY })).toMatchObject({ due: true, days: 9 });
  });

  it('says nothing about a book that is still the example, or has no hours in it', () => {
    expect(ask({ firstSeenAt: NOW - 30 * DAY, isExample: true }).due).toBe(false);
    expect(ask({ firstSeenAt: NOW - 30 * DAY, hasWork: false }).due).toBe(false);
  });
});

describe('dismissing it', () => {
  it('is quiet for a day after it was dismissed', () => {
    const dismissed = { lastExportAt: NOW - 10 * DAY, dismissedAt: NOW - 2 * HOUR };
    expect(ask(dismissed).due).toBe(false);
  });

  it('comes back once the day is up, because the backup still has not been made', () => {
    const dismissed = { lastExportAt: NOW - 10 * DAY, dismissedAt: NOW - 25 * HOUR };
    expect(ask(dismissed).due).toBe(true);
  });
});

describe('a clock that reads earlier than the last export', () => {
  it('is treated as no time having passed rather than as a negative age', () => {
    expect(ask({ lastExportAt: NOW + 5 * DAY })).toMatchObject({ due: false, days: 0 });
  });
});

describe('the thresholds the reminder is written against', () => {
  it('are a week, and a day of quiet after a dismissal', () => {
    expect(BACKUP_AFTER_DAYS).toBe(7);
    expect(DISMISS_FOR_HOURS).toBe(24);
  });
});

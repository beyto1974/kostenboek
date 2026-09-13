/** How the page is painted. 'auto' means: whatever the system asks for. */
export type Theme = 'light' | 'dark' | 'auto';

const KEY = 'kostenboek.theme';
const THEMES: Theme[] = ['light', 'dark', 'auto'];

/**
 * A preference of this browser, not of the book — it is never exported and never
 * travels. Every access is guarded: a private window or a browser told to block
 * site data throws on the accessor itself, and that must not break the page.
 */
export function readTheme(storage: Storage | undefined = safeStorage()): Theme {
  try {
    const saved = storage?.getItem(KEY);
    return THEMES.includes(saved as Theme) ? (saved as Theme) : 'auto';
  } catch {
    return 'auto';
  }
}

export function writeTheme(theme: Theme, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(KEY, theme);
  } catch {
    /* the choice simply will not be remembered */
  }
}

const FIRST_SEEN = 'kostenboek.firstSeen';
const LAST_EXPORT = 'kostenboek.lastExport';
const DISMISSED = 'kostenboek.backupDismissed';

/** The three moments the backup reminder is worked out from, in this browser. */
export interface BackupMarks {
  firstSeenAt: number;
  lastExportAt: number | null;
  dismissedAt: number | null;
}

/**
 * Reads the marks, stamping the first visit the first time it is asked — that is
 * what "never exported" is counted from, so a brand new book is not nagged on the
 * day it is started.
 */
export function readBackupMarks(
  storage: Storage | undefined = safeStorage(),
  now: number = Date.now()
): BackupMarks {
  const firstSeen = readMoment(storage, FIRST_SEEN);
  if (firstSeen === null) writeMoment(storage, FIRST_SEEN, now);

  return {
    firstSeenAt: firstSeen ?? now,
    lastExportAt: readMoment(storage, LAST_EXPORT),
    dismissedAt: readMoment(storage, DISMISSED)
  };
}

export function markExported(at: number = Date.now(), storage: Storage | undefined = safeStorage()): void {
  writeMoment(storage, LAST_EXPORT, at);
  // A fresh export makes any dismissal beside the point.
  try {
    storage?.removeItem(DISMISSED);
  } catch {
    /* nothing to do */
  }
}

export function markDismissed(at: number = Date.now(), storage: Storage | undefined = safeStorage()): void {
  writeMoment(storage, DISMISSED, at);
}

function readMoment(storage: Storage | undefined, key: string): number | null {
  try {
    const saved = Number(storage?.getItem(key));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
}

function writeMoment(storage: Storage | undefined, key: string, at: number): void {
  try {
    storage?.setItem(key, String(at));
  } catch {
    /* the mark simply will not be remembered */
  }
}

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

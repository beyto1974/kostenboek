import { describe, expect, it } from 'vitest';
import { applyTheme, nextTheme } from '../src/ui/theme';
import {
  markDismissed,
  markExported,
  readBackupMarks,
  readTheme,
  writeTheme
} from '../src/persistence/preferences';

function fakeRoot() {
  const marks = new Map<string, string>();
  return {
    marks,
    setAttribute: (name: string, value: string) => void marks.set(name, value),
    removeAttribute: (name: string) => void marks.delete(name)
  };
}

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => void values.delete(key),
    setItem: (key: string, value: string) => void values.set(key, value)
  };
}

describe('painting a theme', () => {
  it('stamps the root for an explicit choice', () => {
    const root = fakeRoot();
    applyTheme('dark', root);
    expect(root.marks.get('data-theme')).toBe('dark');

    applyTheme('light', root);
    expect(root.marks.get('data-theme')).toBe('light');
  });

  it('leaves no mark at all for auto, so the system setting decides', () => {
    const root = fakeRoot();
    applyTheme('dark', root);
    applyTheme('auto', root);
    expect(root.marks.has('data-theme')).toBe(false);
  });
});

describe('the toggle', () => {
  it('walks auto, light, dark and back', () => {
    expect(nextTheme('auto')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('auto');
  });
});

describe('remembering the choice', () => {
  it('starts on auto', () => {
    expect(readTheme(fakeStorage())).toBe('auto');
  });

  it('reads back what was written', () => {
    const storage = fakeStorage();
    writeTheme('dark', storage);
    expect(readTheme(storage)).toBe('dark');
  });

  it('ignores a value it does not know', () => {
    expect(readTheme(fakeStorage({ 'kostenboek.theme': 'neon' }))).toBe('auto');
  });

  it('works in a browser that blocks site data', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    } as unknown as Storage;

    expect(readTheme(blocked)).toBe('auto');
    expect(() => writeTheme('dark', blocked)).not.toThrow();
    expect(readTheme(undefined)).toBe('auto');
  });
});

describe('what the browser remembers about backups', () => {
  const NOW = Date.parse('2026-09-13T10:00:00Z');

  it('stamps the first visit, and keeps that stamp on every visit after it', () => {
    const storage = fakeStorage();

    expect(readBackupMarks(storage, NOW).firstSeenAt).toBe(NOW);
    expect(readBackupMarks(storage, NOW + 86_400_000).firstSeenAt).toBe(NOW);
  });

  it('has nothing exported or dismissed to begin with', () => {
    const marks = readBackupMarks(fakeStorage(), NOW);
    expect(marks.lastExportAt).toBeNull();
    expect(marks.dismissedAt).toBeNull();
  });

  it('remembers an export and a dismissal', () => {
    const storage = fakeStorage();
    readBackupMarks(storage, NOW);

    markExported(NOW + 1000, storage);
    markDismissed(NOW + 2000, storage);

    const marks = readBackupMarks(storage, NOW + 3000);
    expect(marks.lastExportAt).toBe(NOW + 1000);
    expect(marks.dismissedAt).toBe(NOW + 2000);
  });

  it('forgets a value it cannot read as a moment in time', () => {
    const storage = fakeStorage({ 'kostenboek.lastExport': 'yesterday' });
    expect(readBackupMarks(storage, NOW).lastExportAt).toBeNull();
  });

  it('works in a browser that blocks site data', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    } as unknown as Storage;

    expect(readBackupMarks(blocked, NOW)).toEqual({
      firstSeenAt: NOW,
      lastExportAt: null,
      dismissedAt: null
    });
    expect(() => markExported(NOW, blocked)).not.toThrow();
  });
});

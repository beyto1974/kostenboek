import { describe, expect, it } from 'vitest';
import { applyTheme, nextTheme } from '../src/ui/theme';
import { readTheme, writeTheme } from '../src/persistence/preferences';

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

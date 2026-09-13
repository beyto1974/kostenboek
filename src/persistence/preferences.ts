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

function safeStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

import type { Theme } from '../persistence/preferences';

/** The part of an element a theme needs — the document root, in practice. */
export interface ThemeRoot {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Paints the page by stamping the root. The stylesheet holds the light palette on
 * bare `:root`, the dark one behind the system setting, and both `data-theme`
 * values override it — so 'auto' is the absence of the stamp, not a third palette.
 */
export function applyTheme(theme: Theme, root: ThemeRoot = document.documentElement): void {
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

/** The order the toggle walks: auto → light → dark → auto. */
export function nextTheme(theme: Theme): Theme {
  if (theme === 'auto') return 'light';
  if (theme === 'light') return 'dark';
  return 'auto';
}

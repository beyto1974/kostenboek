import type { JSX } from 'solid-js';
import type { Theme } from '../persistence/preferences';
import { nextTheme } from './theme';

const LABEL: Record<Theme, string> = { auto: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' };

/** One button that walks system → light → dark, never a hidden preference. */
export function ThemeToggle(props: { theme: Theme; onChange: (theme: Theme) => void }): JSX.Element {
  return (
    <button
      type="button"
      class="ghost"
      id="theme-toggle"
      aria-label={LABEL[props.theme]}
      onClick={() => props.onChange(nextTheme(props.theme))}
    >
      {LABEL[props.theme]}
    </button>
  );
}

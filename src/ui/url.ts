import { isPlainDate, type PlainDate, type PlainMonth } from '../domain/dates';

export type View = 'calendar' | 'matrix' | 'day' | 'year';

const VIEWS: View[] = ['calendar', 'matrix', 'day', 'year'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** What the address bar carries: which tab is open, and what it is looking at. */
export interface LocationState {
  view: View;
  month?: PlainMonth;
  day?: PlainDate;
}

/**
 * The tab lives in the query string so a reload, a bookmark or a link opens the
 * same screen. Anything unreadable is dropped rather than refused — a mangled
 * link should still open the app.
 */
export function readLocation(search: string): LocationState {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const view = params.get('view')?.trim();
  const month = params.get('month')?.trim();
  const day = params.get('day')?.trim();

  const state: LocationState = {
    view: VIEWS.includes(view as View) ? (view as View) : 'calendar'
  };
  if (month && MONTH.test(month)) state.month = month;
  if (day && isPlainDate(day)) state.day = day;
  return state;
}

export function writeLocation(state: LocationState): string {
  const params = new URLSearchParams();
  params.set('view', state.view);
  if (state.month) params.set('month', state.month);
  if (state.day) params.set('day', state.day);
  return `?${params.toString()}`;
}

import type { RateKind } from '../domain/types';

/**
 * How an hour is painted: its project's colour, and for the second rate the same
 * colour pulled towards the ink. That reads as darker on a light page and lighter
 * on a dark one — in both, plainly the same project at a different rate.
 */
export function rateShade(color: string, kind: RateKind): string {
  return kind === 'premium' ? `color-mix(in oklab, ${color} 62%, var(--ink))` : color;
}

import type { JSX } from 'solid-js';

/**
 * The k, spelled out of booked hour cells on the same 5x7 grid the month matrix
 * paints on. `public/logo.svg` is the same drawing for the browser's icon slots;
 * this one is inline so it takes its colours from the app's own theme variables
 * and turns with the theme toggle, which an <img> would not.
 */

const BOOKED = new Set(['0,0', '0,1', '0,2', '0,3', '0,4', '0,5', '0,6', '3,2', '2,3', '1,4', '2,5', '3,6']);
const INVOICED = '3,2';
const PAID = '3,6';

const COLS = 5;
const ROWS = 7;
const PITCH = 9;

type Cell = { key: string; x: number; y: number; kind: string };

const CELLS: Cell[] = Array.from({ length: ROWS }, (_, row) =>
  Array.from({ length: COLS }, (_, col) => {
    const key = `${col},${row}`;
    const kind = !BOOKED.has(key)
      ? 'mark-empty'
      : key === INVOICED
        ? 'mark-invoiced'
        : key === PAID
          ? 'mark-paid'
          : 'mark-booked';
    return { key, x: 10 + col * PITCH, y: 1 + row * PITCH, kind };
  })
).flat();

export function Mark(props: { size?: number }): JSX.Element {
  const size = props.size ?? 40;
  return (
    <svg
      class="mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      {/* Eased in off the edges so the mark keeps a margin of its own. */}
      <g transform="translate(3.12 3.1) scale(0.903)">
        {CELLS.map((cell) =>
          cell.kind === 'mark-empty' ? (
            <rect class={cell.kind} x={cell.x + 0.75} y={cell.y + 0.75} width="6.5" height="6.5" rx="1" />
          ) : (
            <rect class={cell.kind} x={cell.x} y={cell.y} width="8" height="8" rx="1" />
          )
        )}
      </g>
    </svg>
  );
}

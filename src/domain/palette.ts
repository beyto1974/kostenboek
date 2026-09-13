/**
 * Ten project colours live in the stylesheet; the book only ever holds the name
 * of one, so the palette can be restyled without touching anybody's data. A book
 * with more than ten projects starts the list again — past ten, colours stop
 * being told apart at a glance anyway.
 */
export const PROJECT_COLORS = Array.from(
  { length: 10 },
  (_, index) => `var(--project-${index + 1})`
);

export function colorForIndex(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length] as string;
}

import type { JSX } from 'solid-js';

/**
 * There from the first paint and gone the moment the book stops being the
 * example, so it is part of the page rather than something announced.
 */
export function ExampleBar(props: { onClear: () => void }): JSX.Element {
  return (
    <aside class="example" aria-label="Example data">
      <span class="tag">Example figures</span>
      <p>
        Three weeks of made-up freelance work, so there is something to read. Paint over it to make
        the book yours, or
      </p>
      <button type="button" class="ghost" onClick={() => props.onClear()}>
        clear the example
      </button>
    </aside>
  );
}

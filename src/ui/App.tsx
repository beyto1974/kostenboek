import type { JSX } from 'solid-js';

/** The shell. Views, totals and the worker-backed state arrive in later steps. */
export function App(): JSX.Element {
  return (
    <main class="wrap">
      <h1>Kostenboek</h1>
      <p class="sub">An hour book: paint the hours you worked, read what you are owed.</p>
    </main>
  );
}

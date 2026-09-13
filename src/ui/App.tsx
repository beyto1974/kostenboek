import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { sampleBook } from '../data/sample';
import { addDays, addMonths, monthOf, type PlainDate } from '../domain/dates';
import { createIdbStore } from '../persistence/idbStore';
import { readTheme, writeTheme, type Theme } from '../persistence/preferences';
import { createHandler } from '../worker/handler';
import { createInlineClient, createWorkerClient, type BookClient } from '../worker/client';
import { CalendarView } from './CalendarView';
import { DayView } from './DayView';
import { ExampleBar } from './ExampleBar';
import { MatrixView } from './MatrixView';
import { ProjectPicker } from './ProjectPicker';
import { ProjectsEditor } from './ProjectsEditor';
import { ThemeToggle } from './ThemeToggle';
import { TotalsRail } from './TotalsRail';
import { monthLabel } from './format';
import { createBookState } from './state';
import { applyTheme } from './theme';
import { readLocation, writeLocation, type View } from './url';

const VIEWS: { id: View; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'matrix', label: 'Month matrix' },
  { id: 'day', label: 'Day' }
];

/**
 * The book runs in a worker. A browser that will not give us one still works:
 * the same handler runs here instead, against the same IndexedDB.
 */
function connect(): BookClient {
  try {
    return createWorkerClient(
      new Worker(new URL('../worker/book.worker.ts', import.meta.url), { type: 'module' })
    );
  } catch {
    return createInlineClient(
      createHandler({ store: createIdbStore(), sample: () => sampleBook() })
    );
  }
}

export function App(): JSX.Element {
  const client = connect();
  const app = createBookState(client);
  const opened = readLocation(globalThis.location?.search ?? '');
  const [view, setView] = createSignal<View>(opened.view);
  const [theme, setTheme] = createSignal<Theme>(readTheme());
  let fileInput: HTMLInputElement | undefined;

  createEffect(() => applyTheme(theme()));

  // The address bar follows the screen, so a reload or a bookmark comes back to it.
  createEffect(() => {
    if (!app.ready()) return;
    const search = writeLocation({
      view: view(),
      month: app.month(),
      ...(view() === 'day' ? { day: app.selectedDay() } : {})
    });
    if (search !== globalThis.location.search) {
      globalThis.history.replaceState(null, '', `${globalThis.location.pathname}${search}`);
    }
  });

  function onKey(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement) return;
    const index = Number(event.key);
    if (index >= 1 && index <= app.projects().length) {
      app.selectProject(app.projects()[index - 1]!.id);
      return;
    }
    if (view() !== 'day') return;
    if (event.key === 'ArrowLeft') app.selectDay(addDays(app.selectedDay(), -1));
    if (event.key === 'ArrowRight') app.selectDay(addDays(app.selectedDay(), 1));
  }

  onMount(() => {
    void app.open().then(() => {
      // What the link asked for, once there is a book to show it against.
      if (opened.day) app.selectDay(opened.day);
      else if (opened.month) void app.showMonth(opened.month);
    });
    document.addEventListener('keydown', onKey);
  });
  onCleanup(() => {
    document.removeEventListener('keydown', onKey);
    client.close();
  });

  function openDay(date: PlainDate): void {
    app.selectDay(date);
    setView('day');
  }

  async function exportBook(): Promise<void> {
    const file = await app.exportFile();
    if (!file) return;
    const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importBook(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await app.importText(await file.text());
  }

  return (
    <div class="wrap">
      <header class="top">
        <div>
          <h1>
            Kostenboek <span>{monthLabel(app.month())}</span>
          </h1>
          <p class="sub">
            Every hour of the month is a box. Paint the hours you worked; the rate of the project
            turns them into money, and the rail keeps score of what is still owed to you.
          </p>
        </div>
        <div class="tools">
          <button type="button" class="ghost" onClick={() => void app.showMonth(step(app.month(), -1))}>
            ← previous
          </button>
          <button type="button" class="ghost" onClick={() => void app.showMonth(step(app.month(), 1))}>
            next →
          </button>
          <button type="button" class="ghost" onClick={() => void exportBook()}>
            Export
          </button>
          <button type="button" class="ghost" onClick={() => fileInput?.click()}>
            Import
          </button>
          <input
            id="import-file"
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importBook(event)}
          />
          <ThemeToggle
            theme={theme()}
            onChange={(next) => {
              setTheme(next);
              writeTheme(next);
            }}
          />
        </div>
      </header>

      <Show when={app.isExample()}>
        <ExampleBar onClear={() => void app.clearExample()} />
      </Show>

      <Show when={app.error()}>
        <p class="error" role="alert">
          {app.error()}
          <button type="button" class="ghost" onClick={() => app.dismissError()}>
            dismiss
          </button>
        </p>
      </Show>

      <ProjectPicker
        projects={app.projects()}
        active={app.activeProject()}
        activeRate={app.activeRate()}
        onPick={(id, rate) => app.selectProject(id, rate)}
      />
      <p class="hint">
        Pick a project and one of its two rates — the second rate (★) is a choice, not a time of
        day. Clicking an hour books it at what is picked; clicking it again empties it. A rate you
        change later leaves hours already booked as they are.{' '}
        <span class="key">1</span>–<span class="key">4</span> switches project.
      </p>

      <div class="tabs" role="tablist" aria-label="View">
        {VIEWS.map((entry) => (
          <button
            type="button"
            role="tab"
            aria-selected={view() === entry.id}
            onClick={() => setView(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <Show when={app.ready()} fallback={<p class="hint">Opening the book…</p>}>
        <div class="layout">
          <div>
            <Show when={view() === 'calendar'}>
              <CalendarView app={app} onOpenDay={openDay} />
            </Show>
            <Show when={view() === 'matrix'}>
              <MatrixView app={app} onOpenDay={openDay} />
            </Show>
            <Show when={view() === 'day'}>
              <DayView app={app} />
            </Show>
          </div>
          <TotalsRail app={app} />
        </div>
        <ProjectsEditor app={app} />
      </Show>
    </div>
  );
}

function step(month: string, months: number): string {
  return monthOf(addMonths(`${month || '2026-01'}-01`, months));
}

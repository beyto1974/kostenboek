import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, type JSX } from 'solid-js';
import { sampleBook } from '../data/sample';
import { backupReminder } from '../domain/backup';
import { addDays, addMonths, monthOf, type PlainDate, type PlainMonth } from '../domain/dates';
import { createIdbStore } from '../persistence/idbStore';
import {
  markDismissed,
  markExported,
  readBackupMarks,
  readTheme,
  writeTheme,
  type BackupMarks,
  type Theme
} from '../persistence/preferences';
import { createHandler } from '../worker/handler';
import { createInlineClient, createWorkerClient, type BookClient } from '../worker/client';
import { BackupBar } from './BackupBar';
import { CalendarView } from './CalendarView';
import { DayView } from './DayView';
import { ExampleBar } from './ExampleBar';
import { MatrixView } from './MatrixView';
import { ProjectPicker } from './ProjectPicker';
import { ProjectsEditor } from './ProjectsEditor';
import { ThemeToggle } from './ThemeToggle';
import { TotalsRail } from './TotalsRail';
import { YearView } from './YearView';
import { monthLabel } from './format';
import { createBookState } from './state';
import { applyTheme } from './theme';
import { readLocation, writeLocation, type View } from './url';

const VIEWS: { id: View; label: string }[] = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'matrix', label: 'Month matrix' },
  { id: 'day', label: 'Day' },
  { id: 'year', label: 'Year' }
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
  const [marks, setMarks] = createSignal<BackupMarks>(readBackupMarks());
  // The page is left open for days at a time, so the reminder is worked out
  // against a clock that keeps ticking rather than against the moment of loading.
  const [now, setNow] = createSignal(Date.now());
  let fileInput: HTMLInputElement | undefined;

  const backup = createMemo(() =>
    backupReminder({
      now: now(),
      lastExportAt: marks().lastExportAt,
      firstSeenAt: marks().firstSeenAt,
      dismissedAt: marks().dismissedAt,
      hasWork: Object.keys(app.book().slots).length > 0,
      isExample: app.isExample()
    })
  );

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

  // A quarter of an hour is fine for a threshold measured in days, and the tab
  // coming back to the front is the other moment worth re-reading the clock at.
  const tick = (): void => {
    setNow(Date.now());
  };
  const timer = setInterval(tick, 15 * 60 * 1000);

  onMount(() => {
    void app.open().then(() => {
      // What the link asked for, once there is a book to show it against.
      if (opened.day) app.selectDay(opened.day);
      else if (opened.month) void app.showMonth(opened.month);
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', tick);
    globalThis.addEventListener('focus', tick);
  });
  onCleanup(() => {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', tick);
    globalThis.removeEventListener('focus', tick);
    client.close();
  });

  function openDay(date: PlainDate): void {
    app.selectDay(date);
    setView('day');
  }

  function openMonth(month: PlainMonth): void {
    void app.showMonth(month);
    setView('calendar');
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

    markExported();
    setMarks(readBackupMarks());
  }

  function dismissBackup(): void {
    markDismissed();
    setMarks(readBackupMarks());
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
          <Show when={view() !== 'year'}>
            <button
              type="button"
              class="ghost"
              onClick={() => void app.showMonth(step(app.month(), -1))}
            >
              ← previous
            </button>
            <button
              type="button"
              class="ghost"
              onClick={() => void app.showMonth(step(app.month(), 1))}
            >
              next →
            </button>
          </Show>
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

      <Show when={backup().due}>
        <BackupBar
          days={backup().days}
          onExport={() => void exportBook()}
          onDismiss={dismissBackup}
        />
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
        <div class="layout" classList={{ wide: view() === 'year' }}>
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
            <Show when={view() === 'year'}>
              <YearView app={app} onOpenDay={openDay} onOpenMonth={openMonth} />
            </Show>
          </div>
          <Show when={view() !== 'year'}>
            <TotalsRail app={app} />
          </Show>
        </div>
        <ProjectsEditor app={app} />
      </Show>
    </div>
  );
}

function step(month: string, months: number): string {
  return monthOf(addMonths(`${month || '2026-01'}-01`, months));
}

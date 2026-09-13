import { createMemo, createSignal } from 'solid-js';
import { monthOf, type PlainDate, type PlainMonth } from '../domain/dates';
import { dayTally as tallyOfDay, type Aging, type DayTally, type MonthTotals, type WeekTally } from '../domain/rollups';
import { emptyBook } from '../persistence/codec';
import type { Book, DayStatus, Project, ProjectId, Slot, SlotKey } from '../domain/types';
import type { BookClient } from '../worker/client';
import type { ProjectInput, Request, SnapshotResponse } from '../worker/protocol';

const NEXT_STATUS: Record<DayStatus, DayStatus> = {
  unbilled: 'invoiced',
  invoiced: 'paid',
  paid: 'unbilled'
};

/**
 * Everything the views read, and the only place that talks to the worker. A
 * request always answers with the whole picture, so there is one assignment per
 * change and no derived number is ever computed twice.
 */
export function createBookState(client: BookClient) {
  const [snapshot, setSnapshot] = createSignal<SnapshotResponse | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [activeProjectId, setActiveProjectId] = createSignal<ProjectId | null>(null);
  const [selectedDay, setSelectedDay] = createSignal<PlainDate | null>(null);
  const [busy, setBusy] = createSignal(false);

  const book = createMemo<Book>(() => snapshot()?.book ?? emptyBook());
  const projects = createMemo<Project[]>(() => book().projects.filter((project) => !project.archived));
  const today = createMemo<PlainDate>(() => snapshot()?.today ?? '');
  const month = createMemo<PlainMonth>(() => snapshot()?.month ?? '');
  const day = createMemo<PlainDate>(() => selectedDay() ?? today());

  const activeProject = createMemo<Project | null>(() => {
    const wanted = activeProjectId();
    const list = projects();
    return list.find((project) => project.id === wanted) ?? list[0] ?? null;
  });

  async function send(request: Request): Promise<void> {
    setBusy(true);
    try {
      const response = await client.send(request);
      if (response.kind === 'snapshot') {
        setSnapshot(response);
        setError(null);
      } else if (response.kind === 'error') {
        setError(response.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    /* what there is to read */
    ready: () => snapshot() !== null,
    busy,
    error,
    book,
    projects,
    today,
    month,
    selectedDay: day,
    activeProject,
    isExample: () => snapshot()?.isExample === true,
    totals: (): MonthTotals =>
      snapshot()?.totals ?? {
        month: month(),
        hours: 0,
        amount: 0,
        vat: 0,
        gross: 0,
        averageRate: 0,
        outstanding: 0,
        byStatus: { unbilled: 0, invoiced: 0, paid: 0 },
        byProject: {}
      },
    weeks: (): WeekTally[] => snapshot()?.weeks ?? [],
    aging: (): Aging =>
      snapshot()?.aging ?? { unbilled: 0, upTo30: 0, upTo60: 0, over60: 0, oldestDays: 0 },
    dayTally: (): DayTally => tallyOfDay(book(), day() || '2000-01-01'),
    dayTallyOf: (date: PlainDate): DayTally => tallyOfDay(book(), date),
    slotAt: (key: SlotKey): Slot | undefined => book().slots[key],
    projectOf: (id: ProjectId): Project | undefined =>
      book().projects.find((project) => project.id === id),

    /* what a view can do */
    open: () => send({ kind: 'open' }),
    showMonth: (wanted: PlainMonth) => send({ kind: 'view', month: wanted }),
    selectProject: (id: ProjectId) => setActiveProjectId(id),
    selectDay: (date: PlainDate) => {
      setSelectedDay(date);
      if (monthOf(date) !== month()) void send({ kind: 'view', month: monthOf(date) });
    },

    paint: async (slots: SlotKey[], evening = false) => {
      const project = activeProject();
      if (!project || slots.length === 0) return;
      await send({ kind: 'paint', slots, projectId: project.id, evening });
    },
    clear: (slots: SlotKey[]) => send({ kind: 'clear', slots }),

    /** One click on an hour: fill it, or empty it when it already holds this exact booking. */
    toggle: async (key: SlotKey, evening = false) => {
      const project = activeProject();
      if (!project) return;
      const current = book().slots[key];
      if (current && current.projectId === project.id && current.evening === evening) {
        await send({ kind: 'clear', slots: [key] });
        return;
      }
      await send({ kind: 'paint', slots: [key], projectId: project.id, evening });
    },

    advanceDayStatus: (date: PlainDate) => {
      const current = book().days[date]?.status ?? 'unbilled';
      const next = NEXT_STATUS[current];
      return send({
        kind: 'setDayStatus',
        date,
        status: next,
        ...(next === 'invoiced' ? { sentOn: today() } : {})
      });
    },
    setDayStatus: (date: PlainDate, status: DayStatus, invoiceRef?: string, sentOn?: PlainDate) =>
      send({
        kind: 'setDayStatus',
        date,
        status,
        ...(invoiceRef === undefined ? {} : { invoiceRef }),
        ...(sentOn === undefined ? {} : { sentOn })
      }),

    upsertProject: (project: ProjectInput) => send({ kind: 'upsertProject', project }),
    importText: (text: string) => send({ kind: 'import', text }),
    clearExample: () => send({ kind: 'clearExample' }),

    exportFile: async (): Promise<{ filename: string; text: string } | null> => {
      const response = await client.send({ kind: 'export' });
      if (response.kind === 'file') return { filename: response.filename, text: response.text };
      if (response.kind === 'error') setError(response.message);
      return null;
    },

    dismissError: () => setError(null)
  };
}

export type BookState = ReturnType<typeof createBookState>;

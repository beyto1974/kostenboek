import { For, Show, type JSX } from 'solid-js';
import { eachDayOfMonth, isWeekend, weekdayIndex } from '../domain/dates';
import { formatEuros } from '../domain/money';
import { slotKey } from '../domain/slots';
import { dayLabel, hourLabel, hoursLabel, STATUS_LABEL, weekdayLabel } from './format';
import type { BookState } from './state';

/**
 * Every hour of the month on one sheet. Dragging fills a run of hours: the first
 * cell decides whether the drag is filling or emptying, so a wrong click is undone
 * by the same gesture that made it.
 */
export function MatrixView(props: { app: BookState; onOpenDay: (date: string) => void }): JSX.Element {
  const hours = () => {
    const { dayStart, dayEnd } = props.app.book().settings;
    return Array.from({ length: dayEnd - dayStart + 1 }, (_, index) => dayStart + index);
  };
  const days = () => (props.app.month() ? eachDayOfMonth(props.app.month()) : []);

  let painting = false;
  let mode: 'fill' | 'clear' = 'fill';

  function begin(key: string): void {
    const current = props.app.slotAt(key);
    const active = props.app.activeProject();
    mode =
      current && active && current.projectId === active.id && current.kind === props.app.activeRate()
        ? 'clear'
        : 'fill';
    painting = true;
    apply(key);
  }

  function apply(key: string): void {
    if (mode === 'clear') void props.app.clear([key]);
    else void props.app.paint([key]);
  }

  return (
    <section
      class="matrix"
      onMouseUp={() => {
        painting = false;
      }}
      onMouseLeave={() => {
        painting = false;
      }}
    >
      <table>
        <thead>
          <tr>
            <th class="day-column">day</th>
            <For each={hours()}>{(hour) => <th>{hour}</th>}</For>
            <th>hours</th>
            <th>amount</th>
            <th>status</th>
          </tr>
        </thead>
        <tbody>
          <For each={days()}>
            {(date) => {
              const tally = () => props.app.dayTallyOf(date);
              return (
                <tr classList={{ weekend: isWeekend(date), today: props.app.today() === date }}>
                  <th class="day-column">
                    <button type="button" class="link" onClick={() => props.onOpenDay(date)}>
                      {dayLabel(date)} {weekdayLabel(weekdayIndex(date))}
                    </button>
                  </th>

                  <For each={hours()}>
                    {(hour) => {
                      const key = slotKey(date, hour);
                      const slot = () => props.app.slotAt(key);
                      return (
                        <td>
                          <button
                            type="button"
                            class="slot"
                            style={{
                              background: slot()
                                ? (props.app.projectOf(slot()!.projectId)?.color ?? 'var(--unbilled)')
                                : 'transparent'
                            }}
                            aria-label={`${dayLabel(date)} ${hourLabel(hour)}`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              begin(key);
                            }}
                            onMouseEnter={() => {
                              if (painting) apply(key);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              void props.app.toggle(key);
                            }}
                          >
                            <Show when={slot()?.kind === 'premium'}>★</Show>
                          </button>
                        </td>
                      );
                    }}
                  </For>

                  <td class="figure">{tally().hours ? hoursLabel(tally().hours) : ''}</td>
                  <td class="figure money">{tally().amount ? formatEuros(tally().amount) : ''}</td>
                  <td>
                    <Show when={tally().hours > 0}>
                      <button
                        type="button"
                        class={`status ${tally().status}`}
                        onClick={() => void props.app.advanceDayStatus(date)}
                      >
                        {STATUS_LABEL[tally().status]}
                      </button>
                    </Show>
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </section>
  );
}

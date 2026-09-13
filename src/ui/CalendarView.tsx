import { For, Show, type JSX } from 'solid-js';
import { dayOfMonth, isWeekend, monthGrid } from '../domain/dates';
import { formatEuros } from '../domain/money';
import { hoursLabel, STATUS_SHORT, weekdayLabel } from './format';
import type { BookState } from './state';

/**
 * The month as it is read on a wall: seven columns, a week total beside them, and
 * each day showing what was worked on it. Clicking a day opens it.
 */
export function CalendarView(props: { app: BookState; onOpenDay: (date: string) => void }): JSX.Element {
  const rows = () => monthGrid(props.app.month());

  return (
    <section class="calendar">
      <div class="calendar-head">
        <For each={[0, 1, 2, 3, 4, 5, 6]}>{(index) => <div>{weekdayLabel(index)}</div>}</For>
        <div>week</div>
      </div>

      <For each={rows()}>
        {(row, index) => (
          <div class="calendar-row">
            <For each={row.days}>
              {(date) => (
                <Show when={date} fallback={<div class="cell empty" />}>
                  {(day) => {
                    const tally = () => {
                      props.app.book();
                      return props.app.dayTallyOf(day());
                    };
                    return (
                      <button
                        type="button"
                        class="cell"
                        classList={{
                          weekend: isWeekend(day()),
                          selected: props.app.selectedDay() === day()
                        }}
                        aria-current={props.app.today() === day() ? 'date' : undefined}
                        onClick={() => props.onOpenDay(day())}
                      >
                        <span class="cell-day">
                          {dayOfMonth(day())}
                          <Show when={tally().hours > 0}>
                            <em class={tally().status}>{STATUS_SHORT[tally().status]}</em>
                          </Show>
                        </span>

                        <span class="cell-blocks">
                          <For each={Object.entries(tally().byProject)}>
                            {([id, part]) => (
                              <span
                                class="block"
                                style={{
                                  background: props.app.projectOf(id)?.color ?? 'var(--unbilled)',
                                  flex: String(part.hours)
                                }}
                              >
                                {props.app.projectOf(id)?.code} {part.hours}h
                              </span>
                            )}
                          </For>
                        </span>

                        <Show when={tally().hours > 0}>
                          <span class="cell-total">
                            <span>{hoursLabel(tally().hours)}</span>
                            <b>{formatEuros(tally().amount)}</b>
                          </span>
                        </Show>
                      </button>
                    );
                  }}
                </Show>
              )}
            </For>

            <div class="week">
              <b>{props.app.weeks()[index()]?.hours ? hoursLabel(props.app.weeks()[index()]!.hours) : '–'}</b>
              <span>
                {props.app.weeks()[index()]?.amount
                  ? formatEuros(props.app.weeks()[index()]!.amount)
                  : ''}
              </span>
            </div>
          </div>
        )}
      </For>
    </section>
  );
}

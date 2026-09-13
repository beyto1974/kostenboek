import { For, Show, type JSX } from 'solid-js';
import { addDays, weekdayIndex } from '../domain/dates';
import { formatEuros } from '../domain/money';
import { slotKey } from '../domain/slots';
import { dayLabel, hourLabel, hoursLabel, STATUS_LABEL, weekdayLabel } from './format';
import type { BookState } from './state';

/** One day as wide bands: enough room to read the project and what the hour earned. */
export function DayView(props: { app: BookState }): JSX.Element {
  const date = () => props.app.selectedDay();
  const tally = () => props.app.dayTally();
  const hours = () => {
    const { dayStart, dayEnd } = props.app.book().settings;
    return Array.from({ length: dayEnd - dayStart + 1 }, (_, index) => dayStart + index);
  };

  return (
    <section class="day">
      <header class="day-head">
        <button
          type="button"
          class="ghost"
          aria-label="Previous day"
          onClick={() => props.app.selectDay(addDays(date(), -1))}
        >
          ←
        </button>
        <h2>
          {weekdayLabel(weekdayIndex(date()))} {dayLabel(date())}
        </h2>
        <span class="figure">
          {hoursLabel(tally().hours)} · {formatEuros(tally().amount)}
        </span>
        <Show when={tally().hours > 0}>
          <button
            type="button"
            class={`status ${tally().status}`}
            onClick={() => void props.app.advanceDayStatus(date())}
          >
            {STATUS_LABEL[tally().status]}
          </button>
        </Show>
        <span class="grow" />
        <button
          type="button"
          class="ghost"
          aria-label="Next day"
          onClick={() => props.app.selectDay(addDays(date(), 1))}
        >
          →
        </button>
      </header>

      <Show when={tally().hours > 0}>
        <div class="invoice-line">
          <label for="invoice-ref">invoice</label>
          <input
            id="invoice-ref"
            value={props.app.book().days[date()]?.invoiceRef ?? ''}
            placeholder="2026-014"
            onChange={(event) =>
              void props.app.setDayStatus(
                date(),
                'invoiced',
                event.currentTarget.value,
                props.app.book().days[date()]?.sentOn ?? props.app.today()
              )
            }
          />
          <Show
            when={props.app.book().days[date()]?.sentOn}
            fallback={<span class="note">not sent yet</span>}
          >
            {(sent) => <span class="note">sent {dayLabel(sent())}</span>}
          </Show>
        </div>
      </Show>

      <ul class="bands">
        <For each={hours()}>
          {(hour) => {
            const key = () => slotKey(date(), hour);
            const slot = () => props.app.slotAt(key());
            const project = () => (slot() ? props.app.projectOf(slot()!.projectId) : undefined);
            return (
              <li>
                <span class="band-time">{hourLabel(hour)}</span>
                <button
                  type="button"
                  class="band"
                  classList={{ filled: Boolean(slot()) }}
                  style={{ background: project()?.color ?? 'transparent' }}
                  onClick={() => void props.app.toggle(key())}
                >
                  <Show
                    when={project()}
                    fallback={
                      <span class="band-empty">
                        empty — click to book {props.app.activeProject()?.code ?? 'a project'}
                      </span>
                    }
                  >
                    {(found) => (
                      <>
                        <span class="band-code">{found().code}</span>
                        <span>
                          {found().name}
                          <Show when={slot()?.kind === 'premium'}> · second rate ★</Show>
                        </span>
                        <span class="band-rate">{formatEuros(slot()?.rate ?? 0)}</span>
                      </>
                    )}
                  </Show>
                </button>
              </li>
            );
          }}
        </For>
      </ul>

      <footer class="day-foot">
        <span>
          average{' '}
          {tally().hours ? formatEuros(Math.round(tally().amount / tally().hours)) : '–'} per hour
        </span>
        <span>
          <For each={Object.entries(tally().byProject)}>
            {([id, part], index) => (
              <>
                <Show when={index() > 0}> · </Show>
                {props.app.projectOf(id)?.code} {hoursLabel(part.hours)}
              </>
            )}
          </For>
        </span>
      </footer>
    </section>
  );
}

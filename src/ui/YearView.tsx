import { For, Show, type JSX } from 'solid-js';
import { yearColumns, type PlainDate, type PlainMonth } from '../domain/dates';
import { formatEuros } from '../domain/money';
import type { DayStatus } from '../domain/types';
import { dayLabel, hoursLabel, monthLabel, monthShort, STATUS_LABEL, weekdayLabel } from './format';
import type { BookState } from './state';

const SPLIT: { status: DayStatus; label: string; color: string }[] = [
  { status: 'unbilled', label: 'still to invoice', color: 'var(--unbilled)' },
  { status: 'invoiced', label: 'invoiced, waiting', color: 'var(--invoiced)' },
  { status: 'paid', label: 'paid', color: 'var(--paid)' }
];

/** Four shades above empty, so a glance tells a four-hour day from a ten-hour one. */
const STEPS = 4;

function heatStep(hours: number, busiest: number): number {
  if (hours === 0) return 0;
  return Math.max(1, Math.ceil((hours / Math.max(busiest, 1)) * STEPS));
}

/**
 * The year on one page. A month at a time answers what September came to; this
 * answers what the year came to, which month carried it, and — in the heatmap —
 * which weeks were full and which were empty.
 */
export function YearView(props: {
  app: BookState;
  onOpenDay: (date: PlainDate) => void;
  onOpenMonth: (month: PlainMonth) => void;
}): JSX.Element {
  const totals = () => props.app.yearTotals();
  const columns = () => yearColumns(props.app.year());
  const share = (amount: number) => (totals().amount ? `${(amount / totals().amount) * 100}%` : '0%');
  const shift = (years: number) => String(Number(props.app.year()) + years);
  // A project archived halfway through the year still worked hours in it, and the
  // table has to add up to the figure beside it.
  const projectRows = () =>
    props.app
      .book()
      .projects.filter(
        (project) => !project.archived || (totals().byProject[project.id]?.hours ?? 0) > 0
      );

  return (
    <section class="year">
      <header class="year-head">
        <button
          type="button"
          class="ghost"
          aria-label="Previous year"
          onClick={() => void props.app.showYear(shift(-1))}
        >
          ←
        </button>
        <h2>{props.app.year()}</h2>
        <span class="figure">
          {hoursLabel(totals().hours)} · {formatEuros(totals().amount)}
        </span>
        <span class="grow" />
        <button
          type="button"
          class="ghost"
          aria-label="Next year"
          onClick={() => void props.app.showYear(shift(1))}
        >
          →
        </button>
      </header>

      <div class="year-figures">
        <section class="tile lead">
          <h2>the year, still owed to you</h2>
          <div class="big">{formatEuros(totals().outstanding)}</div>
          <p class="note">
            {formatEuros(totals().byStatus.invoiced)} invoiced ·{' '}
            {formatEuros(totals().byStatus.unbilled)} not sent yet
          </p>
          <div class="bar">
            <For each={SPLIT}>
              {(part) => (
                <i style={{ width: share(totals().byStatus[part.status]), background: part.color }} />
              )}
            </For>
          </div>
          <ul class="split">
            <For each={SPLIT}>
              {(part) => (
                <li>
                  <span class="dot" style={{ background: part.color }} />
                  <span class="label">{part.label}</span>
                  {formatEuros(totals().byStatus[part.status])}
                </li>
              )}
            </For>
          </ul>
        </section>

        <section class="tile">
          <h2>billed across all twelve months</h2>
          <div class="big">{formatEuros(totals().amount)}</div>
          <p class="note">
            {hoursLabel(totals().hours)} · {formatEuros(totals().averageRate)} per hour on average
          </p>
          <div class="line">
            <span>VAT {Math.round(props.app.book().settings.vatRate * 100)}%</span>
            <span>{formatEuros(totals().vat)}</span>
          </div>
          <div class="line strong">
            <span>including VAT</span>
            <span>{formatEuros(totals().gross)}</span>
          </div>
        </section>

        <section class="tile">
          <h2>per project · whole year</h2>
          <table class="project-table">
            <tbody>
              <For each={projectRows()}>
                {(project) => {
                  const part = () => totals().byProject[project.id] ?? { hours: 0, amount: 0 };
                  return (
                    <tr>
                      <td>
                        <span class="swatch" style={{ background: project.color }} />
                        {project.code}
                      </td>
                      <td class="right">{hoursLabel(part().hours)}</td>
                      <td class="right">{formatEuros(part().amount)}</td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </section>
      </div>

      <div class="heatmap">
        <div class="heat-scroll">
          <div class="heat-months" aria-hidden="true">
            <For each={columns()}>
              {(column) => <span>{column.label ? monthShort(column.label) : ''}</span>}
            </For>
          </div>

          <div class="heat-body">
            <div class="heat-weekdays" aria-hidden="true">
              <For each={[0, 1, 2, 3, 4, 5, 6]}>
                {(index) => <span>{index % 2 === 0 && index < 5 ? weekdayLabel(index) : ''}</span>}
              </For>
            </div>

            <div class="heat-grid">
              <For each={columns()}>
                {(column) => (
                  <div class="heat-column">
                    <For each={column.days}>
                      {(date) => (
                        <Show when={date} fallback={<span class="heat void" />}>
                          {(day) => {
                            const worked = () => totals().days[day()];
                            const label = () => {
                              const heat = worked();
                              if (!heat) return `${dayLabel(day())} · nothing booked`;
                              return `${dayLabel(day())} · ${hoursLabel(heat.hours)} · ${formatEuros(
                                heat.amount
                              )} · ${STATUS_LABEL[heat.status]}`;
                            };
                            return (
                              <button
                                type="button"
                                class={`heat step-${heatStep(
                                  worked()?.hours ?? 0,
                                  totals().busiestHours
                                )}`}
                                classList={{ today: props.app.today() === day() }}
                                title={label()}
                                aria-label={label()}
                                onClick={() => props.onOpenDay(day())}
                              />
                            );
                          }}
                        </Show>
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
          </div>
        </div>

        <p class="heat-legend">
          <span>a square is a day · empty</span>
          <For each={[0, 1, 2, 3, 4]}>{(index) => <i class={`heat step-${index}`} />}</For>
          <span>
            {totals().busiestHours > 0
              ? `${hoursLabel(totals().busiestHours)}, the fullest day of the year`
              : 'nothing booked this year'}
          </span>
        </p>
      </div>

      <table class="project-table wide year-months">
        <thead>
          <tr>
            <th>month</th>
            <th class="right">hours</th>
            <th class="right">billed</th>
            <th class="right">to invoice</th>
            <th class="right">invoiced</th>
            <th class="right">paid</th>
          </tr>
        </thead>
        <tbody>
          <For each={totals().months}>
            {(line) => (
              <tr classList={{ quiet: line.hours === 0 }}>
                <td>
                  <button type="button" class="link" onClick={() => props.onOpenMonth(line.month)}>
                    {monthLabel(line.month)}
                  </button>
                </td>
                <td class="right">{line.hours ? hoursLabel(line.hours) : '–'}</td>
                <td class="right">{line.amount ? formatEuros(line.amount) : '–'}</td>
                <td class="right">
                  {line.byStatus.unbilled ? formatEuros(line.byStatus.unbilled) : '–'}
                </td>
                <td class="right">
                  {line.byStatus.invoiced ? formatEuros(line.byStatus.invoiced) : '–'}
                </td>
                <td class="right">{line.byStatus.paid ? formatEuros(line.byStatus.paid) : '–'}</td>
              </tr>
            )}
          </For>
        </tbody>
        <tfoot>
          <tr>
            <th>the whole year</th>
            <td class="right">{hoursLabel(totals().hours)}</td>
            <td class="right">{formatEuros(totals().amount)}</td>
            <td class="right">{formatEuros(totals().byStatus.unbilled)}</td>
            <td class="right">{formatEuros(totals().byStatus.invoiced)}</td>
            <td class="right">{formatEuros(totals().byStatus.paid)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

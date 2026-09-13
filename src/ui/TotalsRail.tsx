import { For, Show, type JSX } from 'solid-js';
import { formatEuros } from '../domain/money';
import type { DayStatus } from '../domain/types';
import { hoursLabel, monthLabel } from './format';
import type { BookState } from './state';

const SPLIT: { status: DayStatus; label: string; color: string }[] = [
  { status: 'unbilled', label: 'still to invoice', color: 'var(--unbilled)' },
  { status: 'invoiced', label: 'invoiced, waiting', color: 'var(--invoiced)' },
  { status: 'paid', label: 'paid', color: 'var(--paid)' }
];

/** What the month came to: owed first, because that is what the book is for. */
export function TotalsRail(props: { app: BookState }): JSX.Element {
  const totals = () => props.app.totals();
  const share = (amount: number) => (totals().amount ? `${(amount / totals().amount) * 100}%` : '0%');

  return (
    <aside class="rail">
      <section class="tile lead">
        <h2>still owed to you</h2>
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
        <h2>{monthLabel(props.app.month())}</h2>
        <div class="big">
          {hoursLabel(totals().hours)} · {formatEuros(totals().amount)}
        </div>
        <p class="note">{formatEuros(totals().averageRate)} per hour on average</p>
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
        <h2>per project</h2>
        <table class="project-table">
          <tbody>
            <For each={props.app.projects()}>
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

      <section class="tile">
        <h2>how old the money is · whole book</h2>
        <ul class="split">
          <li>
            <span class="label">not invoiced</span>
            {formatEuros(props.app.aging().unbilled)}
          </li>
          <li>
            <span class="label">sent, up to 30 days</span>
            {formatEuros(props.app.aging().upTo30)}
          </li>
          <li>
            <span class="label">31 to 60 days</span>
            {formatEuros(props.app.aging().upTo60)}
          </li>
          <li class="late">
            <span class="label">over 60 days</span>
            {formatEuros(props.app.aging().over60)}
          </li>
        </ul>
        <Show when={props.app.aging().oldestDays > 0}>
          <p class="note">Oldest invoice out for {props.app.aging().oldestDays} days.</p>
        </Show>
      </section>
    </aside>
  );
}

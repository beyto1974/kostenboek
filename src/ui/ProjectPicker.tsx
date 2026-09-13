import { For, type JSX } from 'solid-js';
import { formatEuros } from '../domain/money';
import type { Project, RateKind } from '../domain/types';
import { rateShade } from './palette';

/**
 * Which project the next painted hour belongs to, and at which of its two rates.
 * The second rate is a button, not a time of day: nothing about the hour on the
 * clock decides what the work was worth.
 */
export function ProjectPicker(props: {
  projects: Project[];
  active: Project | null;
  activeRate: RateKind;
  onPick: (id: string, rate: RateKind) => void;
}): JSX.Element {
  const chosen = (project: Project, rate: RateKind) =>
    props.active?.id === project.id && props.activeRate === rate;

  return (
    <div class="picker" role="radiogroup" aria-label="Project and rate">
      <For each={props.projects}>
        {(project, index) => (
          <div
            class="chip"
            style={{
              color: project.color,
              '--chip': project.color,
              '--chip-second': rateShade(project.color, 'premium')
            }}
          >
            <span class="swatch" style={{ background: project.color }} />
            <b>{project.code}</b>
            <span class="rates">
              <button
                type="button"
                role="radio"
                aria-checked={chosen(project, 'standard')}
                aria-label={`${project.name} at the standard rate`}
                onClick={() => props.onPick(project.id, 'standard')}
              >
                {formatEuros(project.rate)}
              </button>
              <button
                type="button"
                role="radio"
                class="second"
                aria-checked={chosen(project, 'premium')}
                aria-label={`${project.name} at the second rate`}
                onClick={() => props.onPick(project.id, 'premium')}
              >
                {formatEuros(project.premiumRate)} ★
              </button>
            </span>
            <span class="key">{index() + 1}</span>
          </div>
        )}
      </For>
    </div>
  );
}

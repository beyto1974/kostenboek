import { For, type JSX } from 'solid-js';
import { formatEuros } from '../domain/money';
import type { Project } from '../domain/types';

/**
 * Which project the next painted hour belongs to. The rates are on the chip
 * itself: picking a project is picking what an hour is worth.
 */
export function ProjectPicker(props: {
  projects: Project[];
  active: Project | null;
  onPick: (id: string) => void;
}): JSX.Element {
  return (
    <div class="picker" role="radiogroup" aria-label="Project">
      <For each={props.projects}>
        {(project, index) => (
          <button
            type="button"
            role="radio"
            class="chip"
            style={{ color: project.color }}
            aria-checked={props.active?.id === project.id}
            onClick={() => props.onPick(project.id)}
          >
            <span class="swatch" style={{ background: project.color }} />
            <b>{project.code}</b>
            <small>
              {formatEuros(project.rate)}/h · {formatEuros(project.eveningRate)} evening
            </small>
            <span class="key">{index() + 1}</span>
          </button>
        )}
      </For>
    </div>
  );
}

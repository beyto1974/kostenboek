import { createSignal, For, Show, type JSX } from 'solid-js';
import { formatEuros, parseAmount } from '../domain/money';
import type { Project } from '../domain/types';
import type { BookState } from './state';

/**
 * Projects and their two rates. Folded away by default: rates are set once and
 * then left alone, while hours are booked every day.
 */
export function ProjectsEditor(props: { app: BookState }): JSX.Element {
  const [editing, setEditing] = createSignal<Project | null>(null);
  const [code, setCode] = createSignal('');
  const [name, setName] = createSignal('');
  const [client, setClient] = createSignal('');
  const [rate, setRate] = createSignal('');
  const [evening, setEvening] = createSignal('');
  const [problem, setProblem] = createSignal<string | null>(null);

  function start(project: Project | null): void {
    setEditing(project);
    setCode(project?.code ?? '');
    setName(project?.name ?? '');
    setClient(project?.client ?? '');
    setRate(project ? String(project.rate / 100) : '');
    setEvening(project ? String(project.eveningRate / 100) : '');
    setProblem(null);
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    try {
      const current = editing();
      await props.app.upsertProject({
        ...(current ? { id: current.id } : {}),
        code: code(),
        name: name(),
        client: client(),
        rate: parseAmount(rate()),
        eveningRate: evening().trim() === '' ? parseAmount(rate()) : parseAmount(evening())
      });
      start(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That did not work.');
    }
  }

  return (
    <details class="projects">
      <summary>Projects and rates</summary>

      <table class="project-table wide">
        <thead>
          <tr>
            <th>code</th>
            <th>project</th>
            <th>client</th>
            <th class="right">day rate</th>
            <th class="right">evening</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <For each={props.app.projects()}>
            {(project) => (
              <tr>
                <td>
                  <span class="swatch" style={{ background: project.color }} />
                  {project.code}
                </td>
                <td>{project.name}</td>
                <td>{project.client}</td>
                <td class="right">{formatEuros(project.rate)}</td>
                <td class="right">{formatEuros(project.eveningRate)}</td>
                <td class="right">
                  <button type="button" class="link" onClick={() => start(project)}>
                    edit
                  </button>
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <form class="project-form" onSubmit={(event) => void submit(event)}>
        <h3>{editing() ? `Edit ${editing()?.code}` : 'New project'}</h3>
        <div class="fields">
          <label for="project-code">
            code
            <input
              id="project-code"
              value={code()}
              maxlength="6"
              placeholder="NLS"
              onInput={(event) => setCode(event.currentTarget.value)}
            />
          </label>
          <label for="project-name">
            project
            <input
              id="project-name"
              value={name()}
              placeholder="Northside School site"
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <label for="project-client">
            client
            <input
              id="project-client"
              value={client()}
              placeholder="Northside School"
              onInput={(event) => setClient(event.currentTarget.value)}
            />
          </label>
          <label for="project-rate">
            day rate
            <input
              id="project-rate"
              value={rate()}
              inputmode="decimal"
              placeholder="95"
              onInput={(event) => setRate(event.currentTarget.value)}
            />
          </label>
          <label for="project-evening">
            evening rate
            <input
              id="project-evening"
              value={evening()}
              inputmode="decimal"
              placeholder="same as the day rate"
              onInput={(event) => setEvening(event.currentTarget.value)}
            />
          </label>
        </div>

        <Show when={problem()}>
          <p class="problem">{problem()}</p>
        </Show>

        <div class="actions">
          <button type="submit" class="ghost">
            {editing() ? 'Save project' : 'Add project'}
          </button>
          <Show when={editing()}>
            <button type="button" class="link" onClick={() => start(null)}>
              cancel
            </button>
          </Show>
        </div>
      </form>
    </details>
  );
}

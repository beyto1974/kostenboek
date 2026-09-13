import type { JSX } from 'solid-js';

/**
 * The book is in this browser only. After a week without an exported file the
 * page says so — plainly, with the export a click away, and dismissible for a
 * day for somebody who is in the middle of something.
 */
export function BackupBar(props: {
  days: number;
  onExport: () => void;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <aside class="backup" role="status" aria-label="Backup reminder">
      <span class="tag">No backup</span>
      <p>
        Nothing exported for {props.days} days. The book lives in this browser only — clearing
        the site data would take it with it.
      </p>
      <button type="button" class="ghost" onClick={() => props.onExport()}>
        Export now
      </button>
      <button type="button" class="link" onClick={() => props.onDismiss()}>
        not now
      </button>
    </aside>
  );
}

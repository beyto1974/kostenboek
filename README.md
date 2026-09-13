# kostenboek

An hour book for freelance work. Every hour of the month is a box: paint the hours you
worked on a project and the money follows from that project's rate — a day rate and an
evening rate — through to what is still unbilled, what is invoiced, and what has been paid.

Local-first: the book lives in this browser, in IndexedDB, owned by a Web Worker that also
computes every total. Nothing is sent anywhere. JSON export and import are the way data
moves between machines or into a backup.

## Running it

```bash
npm install
npm run dev          # PORT=5173 npm run dev to pick the port yourself
npm test             # unit tests (vitest)
npm run check        # tsc --noEmit
```

## Layout

- `src/domain` — pure model: dates, money, slots, rollups. No DOM, no storage.
- `src/persistence` — codec, store port, IndexedDB adapter, export/import bundles.
- `src/worker` — the message protocol, its handler, the worker and its client.
- `src/ui` — Solid components: calendar, month matrix, day view, totals rail.
- `prototypes/` — the three HTML design studies this app grew out of. Not built.

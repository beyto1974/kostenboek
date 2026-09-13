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
npm run e2e          # browser smoke test (playwright, drives the built app)
npm run check        # tsc --noEmit
npm run verify       # all three
```

## Layout

- `src/domain` — pure model: dates, money, slots, rollups. No DOM, no storage.
- `src/persistence` — codec, store port, IndexedDB adapter, export/import bundles.
- `src/worker` — the message protocol, its handler, the worker and its client.
- `src/ui` — Solid components: calendar, month matrix, day view, totals rail.
- `src/data/sample.ts` — the worked example a first-time visitor is shown.
- `tests/`, `e2e/` — unit tests mirroring `src/`, and one browser smoke test.
- `prototypes/` — the three HTML design studies this app grew out of. Not built.

## How it fits together

The UI never touches storage. It sends a request to the worker (`src/worker/protocol.ts`)
and the worker answers with the whole picture for the month on screen — the book, the
totals, the week lines and the aging buckets — so a click never has to recompute a total
on the main thread. The same handler runs inline when a browser will not give us a worker.

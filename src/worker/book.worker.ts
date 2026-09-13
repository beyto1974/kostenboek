/// <reference lib="webworker" />
import { sampleBook } from '../data/sample';
import { createIdbStore } from '../persistence/idbStore';
import { createHandler } from './handler';
import type { RequestEnvelope, ResponseEnvelope } from './protocol';

/**
 * The book lives here: IndexedDB underneath, every total computed here, and the
 * page left with nothing to do but draw what comes back. A browser with nothing
 * saved yet gets the worked example rather than an empty grid.
 */
const handle = createHandler({ store: createIdbStore(), sample: () => sampleBook() });

self.addEventListener('message', (event: MessageEvent<RequestEnvelope>) => {
  const { id, request } = event.data;
  void handle(request).then((response) => {
    const envelope: ResponseEnvelope = { id, response };
    (self as unknown as Worker).postMessage(envelope);
  });
});

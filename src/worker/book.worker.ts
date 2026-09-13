/// <reference lib="webworker" />
import { emptyBook } from '../persistence/codec';
import { createIdbStore } from '../persistence/idbStore';
import { createHandler } from './handler';
import type { RequestEnvelope, ResponseEnvelope } from './protocol';

/**
 * The book lives here: IndexedDB underneath, every total computed here, and the
 * page left with nothing to do but draw what comes back.
 */
const handle = createHandler({ store: createIdbStore(), sample: emptyBook });

self.addEventListener('message', (event: MessageEvent<RequestEnvelope>) => {
  const { id, request } = event.data;
  void handle(request).then((response) => {
    const envelope: ResponseEnvelope = { id, response };
    (self as unknown as Worker).postMessage(envelope);
  });
});

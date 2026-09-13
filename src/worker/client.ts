import type { Request, RequestEnvelope, Response, ResponseEnvelope } from './protocol';

/** One line to the book, wherever it is kept. */
export interface BookClient {
  send(request: Request): Promise<Response>;
  close(): void;
}

/**
 * Talks to the book in its worker. Requests are numbered, so several can be in
 * flight — a painted run and a month change do not have to wait for each other.
 */
export function createWorkerClient(worker: Worker): BookClient {
  const waiting = new Map<number, (response: Response) => void>();
  let nextId = 0;

  worker.addEventListener('message', (event: MessageEvent<ResponseEnvelope>) => {
    const { id, response } = event.data;
    const settle = waiting.get(id);
    if (!settle) return;
    waiting.delete(id);
    settle(response);
  });

  worker.addEventListener('error', () => {
    for (const settle of waiting.values()) {
      settle({ kind: 'error', message: 'The book stopped answering. Reload the page.' });
    }
    waiting.clear();
  });

  return {
    send(request) {
      const id = (nextId += 1);
      return new Promise<Response>((resolve) => {
        waiting.set(id, resolve);
        const envelope: RequestEnvelope = { id, request };
        worker.postMessage(envelope);
      });
    },
    close() {
      waiting.clear();
      worker.terminate();
    }
  };
}

/**
 * The same line, with the handler on this side of it: what the tests use, and
 * what the app falls back to in a browser with no workers.
 */
export function createInlineClient(handle: (request: Request) => Promise<Response>): BookClient {
  let open = true;
  return {
    async send(request) {
      if (!open) return { kind: 'error', message: 'The book is closed.' };
      return handle(request);
    },
    close() {
      open = false;
    }
  };
}

/**
 * The pre-2020 subscription protocol, whose subprotocol string is confusingly the
 * literal `graphql-ws` (the modern one is `graphql-transport-ws`). Apollo Server 2
 * era endpoints still speak it, and the laboratory offers it as LEGACY_WS.
 *
 * Hand-rolled rather than pulled from `subscriptions-transport-ws`: that package is
 * deprecated, CJS-only, declares a `ws` peer range the workspace no longer satisfies,
 * and runs its own parse/validate outside envelop.
 *
 * Two client-side quirks show up when driving this from a browser, both in
 * @graphql-tools/executor-legacy-ws and neither fixable from here:
 *  - its teardown calls the node `ws` API `terminate()`, which the browser WebSocket
 *    does not have, so it throws after the stream has already completed. See
 *    dev/legacy-ws-shim.ts.
 *  - it ignores `request.signal`, so the laboratory's Stop button cannot cancel a run.
 */
import type { IncomingMessage } from 'node:http';
import type { WebSocket, WebSocketServer } from 'ws';
import {
  buildExecutionArgs,
  isSubscription,
  type EnvelopedRoot,
  type MockYoga,
  type SubscribePayload,
} from './yoga-enveloped';

const KEEP_ALIVE_MS = 12_000;

export const attachLegacyWSServer = (wss: WebSocketServer, yoga: MockYoga) => {
  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const running = new Map<string, AsyncIterator<unknown>>();
    let keepAlive: ReturnType<typeof setInterval> | undefined;

    const send = (message: Record<string, unknown>) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    };

    const stop = (id: string) => {
      void running.get(id)?.return?.(undefined);
      running.delete(id);
    };

    const run = async (id: string, payload: SubscribePayload) => {
      try {
        const args = await buildExecutionArgs(yoga, payload, { request, socket });

        if (Array.isArray(args)) {
          send({ type: 'error', id, payload: args });
          return;
        }

        const root = args.rootValue as EnvelopedRoot;
        const result = isSubscription(args.document, payload.operationName)
          ? await root.subscribe(args)
          : await root.execute(args);

        if (!(Symbol.asyncIterator in Object(result))) {
          send({ type: 'data', id, payload: result });
          send({ type: 'complete', id });
          return;
        }

        const iterator = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();
        running.set(id, iterator);

        try {
          // A `stop` calls return() on the iterator, which ends this loop and reports
          // the operation complete, as the protocol expects.
          for (let next = await iterator.next(); !next.done; next = await iterator.next()) {
            send({ type: 'data', id, payload: next.value });
          }

          send({ type: 'complete', id });
        } finally {
          running.delete(id);
        }
      } catch (error: unknown) {
        send({
          type: 'error',
          id,
          payload: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    };

    socket.on('message', (raw: unknown) => {
      let message: { type?: string; id?: string; payload?: SubscribePayload };

      try {
        message = JSON.parse(String(raw));
      } catch {
        send({ type: 'connection_error', payload: { message: 'Invalid message' } });
        return;
      }

      switch (message.type) {
        case 'connection_init':
          send({ type: 'connection_ack' });
          keepAlive ??= setInterval(() => send({ type: 'ka' }), KEEP_ALIVE_MS);
          break;
        case 'start':
          if (message.id && message.payload) {
            void run(message.id, message.payload);
          }
          break;
        case 'stop':
          if (message.id) {
            stop(message.id);
          }
          break;
        case 'connection_terminate':
          socket.close(1000);
          break;
      }
    });

    socket.on('close', () => {
      clearInterval(keepAlive);

      for (const id of [...running.keys()]) {
        stop(id);
      }
    });
  });
};

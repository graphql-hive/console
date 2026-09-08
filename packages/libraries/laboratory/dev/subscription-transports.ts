/**
 * Serves both WebSocket subscription protocols on the same path as the HTTP mock, so
 * every value of the laboratory's Settings > Subscriptions > Protocol works against
 * one endpoint: SSE and GRAPHQL_SSE come from yoga itself, WS and LEGACY_WS from here.
 *
 * Both servers are noServer and share one upgrade listener, dispatching on the offered
 * subprotocol. Vite's HMR listener claims an upgrade only when the protocol is
 * vite-hmr/vite-ping *and* the pathname is its base, so the two do not collide.
 *
 * Sockets are torn down when the dev server restarts, which any edit under dev/ causes
 * (vite.config.ts imports these files, making them config dependencies). A live
 * subscription drops at that point, by design: the next generation has a new schema.
 */
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';
import { attachLegacyWSServer } from './legacy-ws-server';
import { buildExecutionArgs, type EnvelopedRoot, type MockYoga } from './yoga-enveloped';

const MODERN_PROTOCOL = 'graphql-transport-ws';
const LEGACY_PROTOCOL = 'graphql-ws';

type UpgradeListener = (request: IncomingMessage, socket: Duplex, head: Buffer) => void;

/** Structural, so it accepts both a node http.Server and vite's HttpServer union. */
type UpgradableServer = {
  on(event: 'upgrade', listener: UpgradeListener): unknown;
  off(event: 'upgrade', listener: UpgradeListener): unknown;
};

const offeredProtocols = (request: IncomingMessage) => {
  const header = request.headers['sec-websocket-protocol'];
  const raw = Array.isArray(header) ? header.join(',') : (header ?? '');

  return raw.split(',').map(protocol => protocol.trim());
};

export const attachSubscriptionTransports = (options: {
  httpServer: UpgradableServer;
  yoga: MockYoga;
  path: string;
}) => {
  const modern = new WebSocketServer({ noServer: true, handleProtocols: () => MODERN_PROTOCOL });
  const legacy = new WebSocketServer({ noServer: true, handleProtocols: () => LEGACY_PROTOCOL });

  const disposable = useServer(
    {
      execute: args => (args.rootValue as EnvelopedRoot).execute(args),
      subscribe: args => (args.rootValue as EnvelopedRoot).subscribe(args),
      onSubscribe: (ctx, _id, payload) =>
        buildExecutionArgs(options.yoga, payload, {
          request: ctx.extra.request,
          socket: ctx.extra.socket,
        }),
    },
    modern,
  );

  attachLegacyWSServer(legacy, options.yoga);

  const onUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');

    if (pathname !== options.path) {
      return;
    }

    const offered = offeredProtocols(request);
    const target = offered.includes(MODERN_PROTOCOL)
      ? modern
      : offered.includes(LEGACY_PROTOCOL)
        ? legacy
        : null;

    // Nothing else owns this path, so an unknown subprotocol would hang forever.
    if (!target) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    target.handleUpgrade(request, socket, head, client =>
      target.emit('connection', client, request),
    );
  };

  options.httpServer.on('upgrade', onUpgrade);

  return {
    async dispose() {
      options.httpServer.off('upgrade', onUpgrade);
      await disposable.dispose();
      await Promise.all(
        [modern, legacy].map(server => new Promise<void>(resolve => server.close(() => resolve()))),
      );
    },
  };
};

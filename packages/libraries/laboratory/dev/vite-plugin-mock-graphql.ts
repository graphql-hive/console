/**
 * Mounts the mock endpoint and its WebSocket transports onto a vite dev server.
 *
 * Lives here rather than inline in vite.config.ts because foundry runs its own vite
 * server and needs the same endpoint; both configs register this plugin.
 */
import type { PluginOption } from 'vite';
import { createMockYoga } from './mock-graphql';
import { attachSubscriptionTransports } from './subscription-transports';

export const GRAPHQL_ENDPOINT = '/graphql';

/** Same-origin mock endpoint so `pnpm dev` needs no second process and no CORS. */
export const mockGraphQLEndpoint = (): PluginOption => ({
  name: 'laboratory-mock-graphql',
  apply: 'serve',
  configureServer(server) {
    const yoga = createMockYoga({ graphqlEndpoint: GRAPHQL_ENDPOINT });

    // Mounted without a route prefix so connect leaves req.url intact for yoga.
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith(GRAPHQL_ENDPOINT)) {
        return next();
      }

      return yoga(req, res);
    });

    // Null in middleware mode, where there is no server of ours to upgrade.
    if (!server.httpServer) {
      return;
    }

    const transports = attachSubscriptionTransports({
      httpServer: server.httpServer,
      yoga,
      path: GRAPHQL_ENDPOINT,
    });

    server.httpServer.once('close', () => void transports.dispose());
  },
});

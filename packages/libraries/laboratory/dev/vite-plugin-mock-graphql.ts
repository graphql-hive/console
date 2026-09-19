/**
 * Mounts the mock endpoint and its WebSocket transports onto a vite dev server.
 *
 * Lives here rather than inline in vite.config.ts because foundry runs its own vite
 * server and needs the same endpoint; both configs register this plugin.
 */
import path from 'node:path';
import type { PluginOption } from 'vite';
import { createMockYoga } from './mock-graphql';
import { attachSubscriptionTransports } from './subscription-transports';

export const GRAPHQL_ENDPOINT = '/graphql';

/**
 * Resolved from the working directory rather than import.meta.url: foundry bundles the
 * config that imports this file into node_modules/.cache, which moves the module but not
 * the process. Both `pnpm dev` and `pnpm foundry` run from the package directory.
 */
const DEFAULT_SCHEMA_PATH = path.resolve(process.cwd(), '../../../schema.graphql');

/** Same-origin mock endpoint so `pnpm dev` needs no second process and no CORS. */
export const mockGraphQLEndpoint = ({ schemaPath = DEFAULT_SCHEMA_PATH } = {}): PluginOption => ({
  name: 'laboratory-mock-graphql',
  apply: 'serve',
  configureServer(server) {
    const yoga = createMockYoga({ graphqlEndpoint: GRAPHQL_ENDPOINT, schemaPath });

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

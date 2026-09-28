import { parse as jsUrlParse, stringify as jsUrlStringify } from 'jsurl2';
import type { Client } from 'urql';
import { ErrorComponent } from '@/components/error';
import {
  createRouter,
  parseSearchWith,
  stringifySearchWith,
  type RouterHistory,
} from '@tanstack/react-router';
import { RouteNotFound } from './routes/root';
import { routeTree } from './routes/tree';

/** Routes whose search params contain arrays or objects and need jsurl2 encoding. */
function needsJsurl2() {
  const path = window.location.pathname;
  return path.endsWith('/insights') || path.endsWith('/traces') || path.endsWith('/proposals');
}

/**
 * The app's router. `main.tsx` passes the real urql client; a spec passes a test client and a memory
 * history to render the real tree at a URL.
 */
export function createAppRouter(options: { history?: RouterHistory; urqlClient: Client }) {
  return createRouter({
    routeTree,
    history: options.history,
    context: { urqlClient: options.urqlClient },
    // Every route gets these boundaries; a route declares its own only when it needs different behavior.
    defaultErrorComponent: ErrorComponent,
    defaultNotFoundComponent: RouteNotFound,
    parseSearch: parseSearchWith(str => {
      if (needsJsurl2()) {
        return jsUrlParse(str);
      }
      return JSON.parse(str);
    }),
    stringifySearch: stringifySearchWith(search => {
      if (needsJsurl2()) {
        return jsUrlStringify(search);
      }
      return JSON.stringify(search);
    }),
  });
}

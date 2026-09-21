import { parse as jsUrlParse, stringify as jsUrlStringify } from 'jsurl2';
import { ErrorComponent } from '@/components/error';
import { createRouter, parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import { RouteNotFound } from './routes/root';
import { routeTree } from './routes/tree';

/** Routes whose search params contain arrays or objects and need jsurl2 encoding. */
function needsJsurl2() {
  const path = window.location.pathname;
  return path.endsWith('/insights') || path.endsWith('/traces') || path.endsWith('/proposals');
}

export const router = createRouter({
  routeTree,
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

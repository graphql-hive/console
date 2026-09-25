import { z } from 'zod';
import type {
  AnyVariables,
  Client,
  DocumentInput,
  OperationResult,
  RequestPolicy,
} from '@urql/core';

declare module '@urql/core' {
  interface OperationContext {
    /** Set by `loadQuery` on a route preload; the progress bar leaves those out. */
    preload?: boolean;
  }
}

/**
 * Remove null and undefined values from an object before writing to URL search params.
 *
 * Null values in search params (e.g. `versions: null`) trigger Cloudflare security rules
 * and bloat the URL. Zod schemas with `.nullable().default(null)` automatically restore
 * omitted keys to null during route validation, so it's safe to strip them here.
 *
 * @example
 * // { name: "Hive CLI" } — versions stripped, Zod restores it as null
 * stripNullValues({ name: "Hive CLI", versions: null })
 *
 * // { name: "Hive CLI", versions: ["v1"] } — versions kept
 * stripNullValues({ name: "Hive CLI", versions: ["v1"] })
 */
export function stripNullValues<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)) as T;
}

/**
 * A path on this app: starts with `/` and is not protocol-relative (`//host` or its `/\host`
 * spelling, which browsers read the same way). Anything else could carry a user to another site.
 */
export function isSafeRedirectPath(value: string): boolean {
  return /^\/(?![/\\])/.test(value);
}

/**
 * `redirectToPath` arrives in the URL, so whoever wrote the link controls it. Validate it here,
 * once, and every page and redirect downstream gets a path on this app or the home page; a
 * hostile link degrades quietly instead of erroring or leaving the site.
 */
export const redirectToPathSchema = z
  .string()
  .optional()
  .transform(value => (value !== undefined && isSafeRedirectPath(value) ? value : '/'));

/** What a route loader receives that `loadQuery` needs: the client in router context, and whether this run is a preload. */
export type LoaderContext = { context: { urqlClient: Client }; preload: boolean };

/**
 * Runs `document` from a route loader through the app's cache and resolves on the first settled
 * result. Await it for what the page shows first, `void` it for what the page only warms; either
 * way the page's own `useQuery` with the same variables is then a cache hit. The result is never a
 * rejection: an error result is not cached, and the page surfaces it through `QueryError` as today.
 * The preload flag rides on the operation so a hover preload does not drive the top progress bar.
 */
export function loadQuery<Data, Variables extends AnyVariables>(
  loader: LoaderContext,
  document: DocumentInput<Data, Variables>,
  variables: Variables,
  requestPolicy: RequestPolicy = 'cache-first',
): Promise<OperationResult<Data, Variables>> {
  return loader.context.urqlClient
    .query(document, variables, { requestPolicy, preload: loader.preload })
    .toPromise();
}

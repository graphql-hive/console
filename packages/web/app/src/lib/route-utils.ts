import { z } from 'zod';
import {
  OrganizationLayoutQuery,
  ProjectLayoutQuery,
  TargetLayoutQuery,
} from '@/components/layouts/queries';
import { withinUnits, type DurationUnit } from '@/lib/date-math';
import { redirect, type AnyRedirect } from '@tanstack/react-router';
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

declare module '@tanstack/history' {
  interface HistoryState {
    /** Set by a range reset; the page's picker announces it once. */
    rangeReset?: true;
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

// For data that moves: every visit and Refresh revalidate, a hover preload only warms.
export function revalidate(loader: Pick<LoaderContext, 'preload'>): RequestPolicy {
  return loader.preload ? 'cache-first' : 'cache-and-network';
}

type BooleanKeys<T> = { [K in keyof T]-?: T[K] extends boolean ? K : never }[keyof T];

// Only an explicit false redirects: missing data or an error admits, and the page shows it.
function layoutGate<Data, Slugs extends AnyVariables, Node extends object>(
  document: DocumentInput<Data, Slugs>,
  slugsOf: (params: Slugs) => Slugs,
  nodeOf: (data: Data) => Node | null | undefined,
  root: (slugs: Slugs) => AnyRedirect,
) {
  return async (
    loader: LoaderContext & { params: Slugs },
    ...flags: [BooleanKeys<Node>, ...BooleanKeys<Node>[]]
  ): Promise<void> => {
    const slugs = slugsOf(loader.params);
    const result = await loadQuery(loader, document, slugs);
    const node = result.data ? nodeOf(result.data) : undefined;
    if (node && flags.every(flag => node[flag] === false)) {
      throw root(slugs);
    }
  };
}

// A loader's permission gate, read from the layout document the layout above already loaded.
export const requireLayoutFlag = {
  organization: layoutGate(
    OrganizationLayoutQuery,
    ({ organizationSlug }) => ({ organizationSlug }),
    data => data.organizationBySlug,
    params => redirect({ to: '/$organizationSlug', params }),
  ),
  project: layoutGate(
    ProjectLayoutQuery,
    ({ organizationSlug, projectSlug }) => ({ organizationSlug, projectSlug }),
    data => data.organization?.project,
    params => redirect({ to: '/$organizationSlug/$projectSlug', params }),
  ),
  target: layoutGate(
    TargetLayoutQuery,
    ({ organizationSlug, projectSlug, targetSlug }) => ({
      organizationSlug,
      projectSlug,
      targetSlug,
    }),
    data => data.organization?.project?.target,
    params => redirect({ to: '/$organizationSlug/$projectSlug/$targetSlug', params }),
  ),
};

type Range = { from: string; to: string };
type RangeSearch = Partial<Range> & Record<string, unknown>;

// What a screen can show: its default range, the units its picker offers, and its own path.
export type RangeBounds = { range: Range; units: DurationUnit[]; to: string };

// A `beforeLoad` that sends a bare URL to the default range, so a shared link always says what it shows.
export function defaultRange({ range, to }: Pick<RangeBounds, 'range' | 'to'>) {
  return ({ search, params }: { search: RangeSearch; params: Record<string, string> }) => {
    if (search.from === undefined && search.to === undefined) {
      throw redirect({ to, params, search: { ...search, ...range } });
    }
  };
}

export type RangeLoader = {
  params: Record<string, string>;
  deps: Partial<Range>;
  location: { search: RangeSearch };
};

// Back to the default; the note in history state is what the page's toast reads.
function resetRange(loader: RangeLoader, { range, to }: RangeBounds) {
  return redirect({
    to,
    params: loader.params,
    search: { ...loader.location.search, ...range },
    state: { rangeReset: true },
  });
}

// Before a loader warms anything: a range in a unit this screen's picker does not offer resets.
export function requireUnits(loader: RangeLoader, bounds: RangeBounds): void {
  for (const bound of [loader.deps.from, loader.deps.to]) {
    if (bound !== undefined && !withinUnits(bound, bounds.units)) {
      throw resetRange(loader, bounds);
    }
  }
}

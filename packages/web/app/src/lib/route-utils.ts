import { z } from 'zod';
import {
  OrganizationLayoutQuery,
  ProjectLayoutQuery,
  TargetLayoutQuery,
} from '@/components/layouts/queries';
import type { Preset } from '@/components/ui/date-range-picker';
import { parse } from '@/lib/date-math';
import { loaderPeriod, retentionBoundary } from '@/lib/hooks/use-date-range-controller';
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
    // Set by a range reset; the page's picker announces it once.
    rangeReset?: RangeResetReason;
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

// What a screen shows by default, and its own path.
export type RangeBounds = { preset: Preset; to: string };

// A beforeLoad that fills a bare URL with the default range, so a shared link says what it shows.
export function defaultRange({ preset, to }: RangeBounds) {
  return ({ search, params }: { search: RangeSearch; params: Record<string, string> }) => {
    if (search.from === undefined && search.to === undefined) {
      throw redirect({ to, params, search: { ...search, ...preset.range } });
    }
  };
}

export type RangeLoader = {
  params: Record<string, string>;
  deps: Partial<Range>;
  location: { search: RangeSearch };
};

export type RangeResetReason = 'unreadable' | 'retention';

// Back to the default; the note in history state is what the page's toast reads.
function resetRange(loader: RangeLoader, { preset, to }: RangeBounds, reason: RangeResetReason) {
  return redirect({
    to,
    params: loader.params,
    search: { ...loader.location.search, ...preset.range },
    state: { rangeReset: reason },
  });
}

// Before a loader warms anything: a range no screen can show resets, so the URL never carries one.
export function requireRange(loader: RangeLoader, bounds: RangeBounds): void {
  for (const bound of [loader.deps.from, loader.deps.to]) {
    if (bound !== undefined && !parse(bound)) {
      throw resetRange(loader, bounds, 'unreadable');
    }
  }
  try {
    loaderPeriod(loader.deps, bounds.preset);
  } catch {
    // Older than the rollups keep.
    throw resetRange(loader, bounds, 'retention');
  }
}

type SlugLoader = LoaderContext & { params: Record<string, string> };

function retentionOf(
  organization: Promise<{ usageRetentionInDays: number } | null | undefined>,
): Promise<number | undefined> {
  return organization.then(found => found?.usageRetentionInDays ?? undefined);
}

// The organization's usage retention, from the layout document the layout above already loaded.
export const usageRetention = {
  organization: ({ params: { organizationSlug }, ...loader }: SlugLoader) =>
    retentionOf(
      loadQuery(loader, OrganizationLayoutQuery, { organizationSlug }).then(
        result => result.data?.organizationBySlug,
      ),
    ),
  project: ({ params: { organizationSlug, projectSlug }, ...loader }: SlugLoader) =>
    retentionOf(
      loadQuery(loader, ProjectLayoutQuery, { organizationSlug, projectSlug }).then(
        result => result.data?.organization,
      ),
    ),
  target: ({ params: { organizationSlug, projectSlug, targetSlug }, ...loader }: SlugLoader) =>
    retentionOf(
      loadQuery(loader, TargetLayoutQuery, { organizationSlug, projectSlug, targetSlug }).then(
        result => result.data?.organization,
      ),
    ),
};

// After the warms: a start before what the plan keeps resets; missing data admits.
export async function requireRetention(
  loader: LoaderContext & RangeLoader,
  bounds: RangeBounds,
  retention: Promise<number | undefined> = usageRetention.target(loader),
): Promise<void> {
  const days = await retention;
  const from = loader.deps.from === undefined ? undefined : parse(loader.deps.from);
  if (days !== undefined && from && from.getTime() < retentionBoundary(days).getTime()) {
    throw resetRange(loader, bounds, 'retention');
  }
}

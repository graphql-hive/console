import { z } from 'zod';
import { createRoute, redirect, type AnyRoute } from '@tanstack/react-router';
import { organizationRoute } from './organization';
import { targetRoute } from './target/route';

/**
 * Every redirect that exists only because a URL moved. Old URLs keep working from bookmarks and
 * external links; new code links to the new shape. Entries stay until deliberately pruned (see
 * `since`). The examples feed `legacy.spec.ts`, which loads the router at `from` and asserts it
 * lands on `to`. The router follows a `beforeLoad` redirect with `replace`, so the old URL never
 * enters history, and a redirect without `params` inherits the old URL's params by name.
 *
 * `legacyPaths` are old paths, mounted as routes by `legacyRoutesUnder`. `legacySearch` are old
 * `?param=` forms of a path that still exists; the route that owns that path calls
 * `legacySearchRedirect` from its `beforeLoad`.
 *
 * Redirects that depend on data or config are not legacy and live on their routes:
 * - `/auth` -> `/auth/sign-in`, carrying `redirectToPath` (routes/anonymous.tsx)
 * - `/history` -> the target's latest version (routes/target/history.tsx)
 * - `/oidc-request` -> `redirectToPath` when the OIDC provider is off (pages/organization-oidc-request.tsx)
 * - a settings section the viewer may not open -> the first one they may (pages/target-settings.tsx)
 */
export type LegacyPath = {
  parent: () => AnyRoute;
  path: string;
  redirect: () => ReturnType<typeof redirect>;
  example: { from: string; to: string };
  since: string;
  why: string;
};

export const legacyPaths: LegacyPath[] = [
  {
    parent: () => targetRoute,
    path: 'trace/$traceId',
    redirect: () => redirect({ to: '/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId' }),
    example: { from: '/acme/shop/prod/trace/t1', to: '/acme/shop/prod/traces/t1' },
    since: '2026-09',
    why: 'Trace detail moved under /traces so the Traces nav item infers its active state from the URL.',
  },
  {
    parent: () => organizationRoute,
    path: 'view/manage-subscription',
    redirect: () => redirect({ to: '/$organizationSlug/view/subscription/manage' }),
    example: { from: '/acme/view/manage-subscription', to: '/acme/view/subscription/manage' },
    since: '2026-09',
    why: 'Nested under /view/subscription so the Subscription nav item infers its active state; the flat URL was a Next-to-Vite migration artifact.',
  },
];

export type LegacySearch<Value extends string> = {
  param: string;
  /** The old values; the owning route's `validateSearch` accepts them and nothing else. */
  values: z.ZodEnum<[Value, ...Value[]]>;
  redirect: (value: Value) => ReturnType<typeof redirect>;
  examples: Array<{ from: string; to: string }>;
  since: string;
  why: string;
};

const legacySearchEntry = <Value extends string>(entry: LegacySearch<Value>) => entry;

export const legacySearch = {
  targetSettings: legacySearchEntry({
    param: 'page',
    values: z.enum([
      'general',
      'cdn',
      'registry-token',
      'breaking-changes',
      'base-schema',
      'schema-contracts',
    ]),
    redirect: page =>
      page === 'general'
        ? redirect({ to: '/$organizationSlug/$projectSlug/$targetSlug/settings', search: {} })
        : redirect({
            to: `/$organizationSlug/$projectSlug/$targetSlug/settings/${page}`,
            search: {},
          }),
    examples: [
      { from: '/acme/shop/prod/settings?page=cdn', to: '/acme/shop/prod/settings/cdn' },
      { from: '/acme/shop/prod/settings?page=general', to: '/acme/shop/prod/settings' },
    ],
    since: '2026-09',
    why: 'Target settings sections became child routes; the bare URL is General.',
  }),
};

/** For the `beforeLoad` of the route that owns a legacy search param: redirects when it is set. */
export function legacySearchRedirect<Value extends string>(
  entry: LegacySearch<Value>,
  value: Value | undefined,
) {
  if (value !== undefined) {
    throw entry.redirect(value);
  }
}

/** The catalog's routes under `parent`, for that parent's `addChildren` in tree.ts. */
export function legacyRoutesUnder(parent: AnyRoute) {
  return legacyPaths
    .filter(entry => entry.parent() === parent)
    .map(entry =>
      createRoute({
        getParentRoute: entry.parent,
        path: entry.path,
        beforeLoad: () => {
          throw entry.redirect();
        },
      }),
    );
}

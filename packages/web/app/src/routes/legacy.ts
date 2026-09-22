import { z } from 'zod';
import { createRoute, redirect, type AnyRoute } from '@tanstack/react-router';
import { organizationRoute } from './organization/route';
import { targetAlertsRoute } from './target/alerts';
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
 * `legacySearchRedirect` from its `beforeLoad`, so a route module that names a parent here (an
 * `xRoute` module) must not itself import this module, or the two evaluate in a cycle.
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
    redirect: () =>
      // `search: true` keeps a shared link's selected span.
      redirect({ to: '/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId', search: true }),
    example: {
      from: '/acme/shop/prod/trace/t1?activeSpanId=s1',
      to: '/acme/shop/prod/traces/t1?activeSpanId=s1',
    },
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
  {
    parent: () => targetAlertsRoute,
    path: 'activity',
    redirect: () =>
      redirect({ to: '/$organizationSlug/$projectSlug/$targetSlug/alerts', search: true }),
    example: { from: '/acme/shop/prod/alerts/activity', to: '/acme/shop/prod/alerts' },
    since: '2026-09',
    why: 'Activity is the alerts index; the bare URL renders the default section. Its filter and range params carry over.',
  },
];

export type LegacySearch<Value extends string> = {
  param: string;
  /** The old values; the owning route's `validateSearch` accepts them and nothing else. */
  values: z.ZodEnum<[Value, ...Value[]]>;
  /** `search` is the rest of the old URL's params, for an entry that carries some of them over. */
  redirect: (value: Value, search: Record<string, unknown>) => ReturnType<typeof redirect>;
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
    // The rest of the search carries over: the CDN section drives its modals from it.
    redirect: (page, { page: _page, ...search }) =>
      page === 'general'
        ? redirect({ to: '/$organizationSlug/$projectSlug/$targetSlug/settings', search: {} })
        : redirect({
            to: `/$organizationSlug/$projectSlug/$targetSlug/settings/${page}`,
            search,
          }),
    examples: [
      { from: '/acme/shop/prod/settings?page=cdn', to: '/acme/shop/prod/settings/cdn' },
      {
        from: '/acme/shop/prod/settings?page=cdn&cdn=create',
        to: '/acme/shop/prod/settings/cdn?cdn=create',
      },
      { from: '/acme/shop/prod/settings?page=general', to: '/acme/shop/prod/settings' },
    ],
    since: '2026-09',
    why: 'Target settings sections became child routes; the bare URL is General.',
  }),
  organizationSettings: legacySearchEntry({
    param: 'page',
    values: z.enum(['general', 'sso', 'policy', 'access-tokens', 'personal-access-tokens']),
    redirect: page =>
      page === 'general'
        ? redirect({ to: '/$organizationSlug/view/settings', search: {} })
        : redirect({ to: `/$organizationSlug/view/settings/${page}`, search: {} }),
    examples: [
      { from: '/acme/view/settings?page=sso', to: '/acme/view/settings/sso' },
      { from: '/acme/view/settings?page=general', to: '/acme/view/settings' },
    ],
    since: '2026-09',
    why: 'Organization settings sections became child routes; the bare URL is General.',
  }),
  projectSettings: legacySearchEntry({
    param: 'page',
    values: z.enum(['general', 'policy', 'composition', 'access-tokens']),
    redirect: page =>
      page === 'general'
        ? redirect({ to: '/$organizationSlug/$projectSlug/view/settings', search: {} })
        : redirect({ to: `/$organizationSlug/$projectSlug/view/settings/${page}`, search: {} }),
    examples: [
      {
        from: '/acme/shop/view/settings?page=composition',
        to: '/acme/shop/view/settings/composition',
      },
      { from: '/acme/shop/view/settings?page=general', to: '/acme/shop/view/settings' },
    ],
    since: '2026-09',
    why: 'Project settings sections became child routes; the bare URL is General.',
  }),
  organizationMembers: legacySearchEntry({
    param: 'page',
    values: z.enum(['list', 'roles', 'invitations', 'groups']),
    redirect: (page, { page: _page, ...search }) =>
      page === 'list'
        ? redirect({ to: '/$organizationSlug/view/members', search })
        : redirect({ to: `/$organizationSlug/view/members/${page}`, search: {} }),
    examples: [
      { from: '/acme/view/members?page=invitations', to: '/acme/view/members/invitations' },
      { from: '/acme/view/members?page=list&search=jo', to: '/acme/view/members?search=jo' },
    ],
    since: '2026-09',
    why: 'Members sections became child routes; the bare URL is the list, which keeps its search and SCIM filter params.',
  }),
};

/** For the `beforeLoad` of the route that owns a legacy search param: redirects when it is set. */
export function legacySearchRedirect<Value extends string>(
  entry: LegacySearch<Value>,
  search: Record<string, unknown>,
) {
  // The owning route validated the param against `entry.values` already.
  const value = search[entry.param] as Value | undefined;
  if (value !== undefined) {
    throw entry.redirect(value, search);
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

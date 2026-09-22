import { createRoute, redirect, type AnyRoute } from '@tanstack/react-router';
import { organizationRoute } from './organization';
import { targetRoute } from './target/route';

/**
 * Every redirect that exists only because a URL moved. Old URLs keep working from bookmarks and
 * external links; new code links to the new shape. Entries stay until deliberately pruned (see
 * `since`). `example` feeds `legacy.spec.ts`, which loads the router at `from` and asserts it lands
 * on `to`. The router follows a `beforeLoad` redirect with `replace`, so the old URL never enters
 * history, and a redirect without `params` inherits the old URL's params by name.
 *
 * Redirects that depend on data or config are not legacy and live on their routes:
 * - `/auth` -> `/auth/sign-in`, carrying `redirectToPath` (routes/anonymous.tsx)
 * - `/history` -> the target's latest version (routes/target/history.tsx)
 * - `/oidc-request` -> `redirectToPath` when the OIDC provider is off (pages/organization-oidc-request.tsx)
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

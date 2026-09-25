import { ViewerQuery } from '@/components/layouts/queries';
import { ScopeSelector } from '@/components/layouts/scope-selector';
import { Header } from '@/components/navigation/header';
import { HiveLink } from '@/components/ui/hive-link';
import { UserMenu } from '@/components/ui/user-menu';
import { loadQuery } from '@/lib/route-utils';
import { createRoute, Outlet, useMatch } from '@tanstack/react-router';
import { authenticatedRoute } from './authenticated';

// The viewer is revalidated at most this often.
const VIEWER_MAX_AGE_MS = 60_000;
let viewerLoadedAt = 0;

// Mounted once above the organization, project and target routes; pathless, so URLs are unchanged.
export const withHeaderRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: 'with-header',
  shouldReload: () => Date.now() - viewerLoadedAt >= VIEWER_MAX_AGE_MS,
  loader: loader => {
    const stale = Date.now() - viewerLoadedAt >= VIEWER_MAX_AGE_MS;
    if (stale) {
      viewerLoadedAt = Date.now();
    }
    void loadQuery(loader, ViewerQuery, {}, stale ? 'cache-and-network' : 'cache-first');
  },
  component: function WithHeaderRoute() {
    // On the interstitial the organization query answers NEEDS_OIDC and reloads the page; skip it.
    const interstitial =
      useMatch({
        from: '/authenticated/with-header/$organizationSlug/oidc-request',
        shouldThrow: false,
      }) !== undefined;
    return (
      <>
        <Header>
          <div className="flex flex-row items-center gap-4">
            <HiveLink className="size-8" />
            <ScopeSelector />
          </div>
          <UserMenu withOrganization={!interstitial} />
        </Header>
        <Outlet />
      </>
    );
  },
});

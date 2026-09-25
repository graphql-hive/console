import { ViewerQuery } from '@/components/layouts/queries';
import { ScopeSelector } from '@/components/layouts/scope-selector';
import { Header } from '@/components/navigation/header';
import { HiveLink } from '@/components/ui/hive-link';
import { UserMenu } from '@/components/ui/user-menu';
import { loadQuery } from '@/lib/route-utils';
import { createRoute, Outlet, useMatch } from '@tanstack/react-router';
import { authenticatedRoute } from './authenticated';

let viewerLoadedAt = 0;

// Mounted once above the organization, project and target routes; pathless, so URLs are unchanged.
export const withHeaderRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: 'with-header',
  // Revalidate the viewer at most once a minute.
  shouldReload: () => Date.now() - viewerLoadedAt >= 60_000,
  loader: loader => {
    viewerLoadedAt = Date.now();
    void loadQuery(loader, ViewerQuery, {}, 'cache-and-network');
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

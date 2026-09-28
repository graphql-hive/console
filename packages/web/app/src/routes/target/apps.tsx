import { z } from 'zod';
import { loadQuery, requireLayoutFlag } from '@/lib/route-utils';
import {
  appVersionVariables,
  TargetAppsVersionQuery,
  TargetAppVersionPage,
} from '@/pages/target-app-version';
import {
  appsVariables,
  defaultAppsSort,
  TargetAppsPage,
  TargetAppsSortSchema,
  TargetAppsViewQuery,
} from '@/pages/target-apps';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

const TargetAppsRouteSearch = z.object({
  sort: TargetAppsSortSchema.optional(),
});

export const targetAppsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'apps',
  validateSearch: TargetAppsRouteSearch.parse,
  loaderDeps: ({ search }) => ({ sort: search.sort ?? defaultAppsSort }),
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    void loadQuery(
      loader,
      TargetAppsViewQuery,
      appsVariables({ organizationSlug, projectSlug, targetSlug }, loader.deps.sort),
    );
    return requireLayoutFlag.target(loader, 'viewerCanViewAppDeployments');
  },
  component: function TargetAppsRoute() {
    const { sort = defaultAppsSort } = targetAppsRoute.useSearch();
    return <TargetAppsPage sorting={sort} />;
  },
});

const TargetAppVersionRouteSearch = z.object({
  search: z.string().optional().catch(undefined),
  coordinates: z.string().optional().catch(undefined),
});

export const targetAppVersionRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'apps/$appName/$appVersion',
  validateSearch: TargetAppVersionRouteSearch.parse,
  loaderDeps: ({ search }) => ({ search: search.search ?? '', coordinates: search.coordinates }),
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug, appName, appVersion } = loader.params;
    void loadQuery(
      loader,
      TargetAppsVersionQuery,
      appVersionVariables(
        { organizationSlug, projectSlug, targetSlug },
        appName,
        appVersion,
        loader.deps,
      ),
    );
    return requireLayoutFlag.target(loader, 'viewerCanViewAppDeployments');
  },
  component: function TargetAppVersionRoute() {
    const { appName, appVersion } = targetAppVersionRoute.useParams();
    const { search = '', coordinates } = targetAppVersionRoute.useSearch();
    return (
      <TargetAppVersionPage
        appName={appName}
        appVersion={appVersion}
        search={search}
        coordinates={coordinates}
      />
    );
  },
});

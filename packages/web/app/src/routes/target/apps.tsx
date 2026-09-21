import { z } from 'zod';
import { TargetAppVersionPage } from '@/pages/target-app-version';
import { TargetAppsPage, TargetAppsSortSchema, type SortState } from '@/pages/target-apps';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

const TargetAppsRouteSearch = z.object({
  sort: TargetAppsSortSchema.optional(),
});

export const targetAppsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'apps',
  validateSearch: TargetAppsRouteSearch.parse,
  component: function TargetAppsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetAppsRoute.useParams();
    const {
      sort = {
        field: 'ACTIVATED_AT',
        direction: 'DESC',
      } satisfies SortState,
    } = targetAppsRoute.useSearch();
    return (
      <TargetAppsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        sorting={sort}
      />
    );
  },
});

export const targetAppVersionRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'apps/$appName/$appVersion',
  validateSearch: () => ({}) as { search?: string; coordinates?: string },
  component: function TargetAppVersionRoute() {
    const { organizationSlug, projectSlug, targetSlug, appName, appVersion } =
      targetAppVersionRoute.useParams();
    const { coordinates } = targetAppVersionRoute.useSearch();
    return (
      <TargetAppVersionPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        appName={appName}
        appVersion={appVersion}
        coordinates={coordinates}
      />
    );
  },
});

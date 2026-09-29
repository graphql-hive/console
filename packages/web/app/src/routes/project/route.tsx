import { ProjectLayout } from '@/components/layouts/project';
import { ProjectLayoutQuery } from '@/components/layouts/queries';
import { overviewPeriod } from '@/lib/overview-period';
import { loadQuery, requireLayoutFlag, revalidate } from '@/lib/route-utils';
import { ProjectIndexRouteSearch, ProjectOverviewPageQuery, ProjectPage } from '@/pages/project';
import { ProjectAlertsPage, ProjectAlertsPageQuery } from '@/pages/project-alerts';
import { createRoute, Outlet } from '@tanstack/react-router';
import { withHeaderRoute } from '../with-header';

export const projectRoute = createRoute({
  getParentRoute: () => withHeaderRoute,
  path: '$organizationSlug/$projectSlug',
  loader: loader => {
    const { organizationSlug, projectSlug } = loader.params;
    void loadQuery(loader, ProjectLayoutQuery, { organizationSlug, projectSlug });
  },
  component: function ProjectRoute() {
    return (
      <ProjectLayout>
        <Outlet />
      </ProjectLayout>
    );
  },
});

export const projectIndexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  validateSearch: ProjectIndexRouteSearch.parse,
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug } = loader.params;
    const { period, resolution } = overviewPeriod();
    void loadQuery(
      loader,
      ProjectOverviewPageQuery,
      { organizationSlug, projectSlug, chartResolution: resolution, period },
      revalidate(loader),
    );
    return { period, resolution };
  },
  component: function ProjectRoute() {
    const { search, sortBy, sortOrder } = projectIndexRoute.useSearch();
    return <ProjectPage search={search} sortBy={sortBy} sortOrder={sortOrder} />;
  },
});

export const projectAlertsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/alerts',
  // Read once: every alert and channel mutation updates the project in the cache.
  loader: loader => {
    const { organizationSlug, projectSlug } = loader.params;
    void loadQuery(loader, ProjectAlertsPageQuery, { organizationSlug, projectSlug });
    return requireLayoutFlag.project(loader, 'viewerCanModifyAlerts');
  },
  component: ProjectAlertsPage,
});

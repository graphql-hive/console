import { ProjectLayout } from '@/components/layouts/project';
import { ProjectIndexRouteSearch, ProjectPage } from '@/pages/project';
import { ProjectAlertsPage } from '@/pages/project-alerts';
import { createRoute, Outlet } from '@tanstack/react-router';
import { authenticatedRoute } from '../authenticated';

export const projectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug',
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
  component: function ProjectRoute() {
    const { search, sortBy, sortOrder } = projectIndexRoute.useSearch();
    return <ProjectPage search={search} sortBy={sortBy} sortOrder={sortOrder} />;
  },
});

export const projectAlertsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/alerts',
  component: ProjectAlertsPage,
});

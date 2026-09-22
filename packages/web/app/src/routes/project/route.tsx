import { ProjectLayout } from '@/components/layouts/project';
import { ProjectIndexRouteSearch, ProjectPage } from '@/pages/project';
import { ProjectAlertsPage } from '@/pages/project-alerts';
import { createRoute, Outlet } from '@tanstack/react-router';
import { authenticatedRoute } from '../authenticated';

export const projectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug',
  component: function ProjectRoute() {
    const { organizationSlug, projectSlug } = projectRoute.useParams();
    return (
      <ProjectLayout organizationSlug={organizationSlug} projectSlug={projectSlug}>
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
    const { organizationSlug, projectSlug } = projectIndexRoute.useParams();
    const { search, sortBy, sortOrder } = projectIndexRoute.useSearch();
    return (
      <ProjectPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    );
  },
});

export const projectAlertsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/alerts',
  component: function ProjectAlertsRoute() {
    const { organizationSlug, projectSlug } = projectAlertsRoute.useParams();
    return <ProjectAlertsPage organizationSlug={organizationSlug} projectSlug={projectSlug} />;
  },
});

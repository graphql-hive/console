import { z } from 'zod';
import { ProjectIndexRouteSearch, ProjectPage } from '@/pages/project';
import { ProjectAlertsPage } from '@/pages/project-alerts';
import { ProjectSettingsPage, ProjectSettingsPageEnum } from '@/pages/project-settings';
import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from './authenticated';

export const projectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug',
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

const ProjectSettingsRouteSearch = z.object({
  page: ProjectSettingsPageEnum.default('general').optional(),
});

export const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/settings',
  validateSearch(search) {
    return ProjectSettingsRouteSearch.parse(search);
  },
  component: function ProjectSettingsRoute() {
    const { organizationSlug, projectSlug } = projectSettingsRoute.useParams();
    const { page } = projectSettingsRoute.useSearch();

    return (
      <ProjectSettingsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        page={page}
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

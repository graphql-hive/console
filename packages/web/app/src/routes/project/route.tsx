import { ProjectLayout } from '@/components/layouts/project';
import { ProjectLayoutQuery } from '@/components/layouts/queries';
import { overviewPeriod } from '@/lib/overview-period';
import { loadQuery, requireLayoutFlag, revalidate, usageRetention } from '@/lib/route-utils';
import { ProjectIndexRouteSearch, ProjectOverviewPageQuery, ProjectPage } from '@/pages/project';
import {
  ProjectAlertChannelPage,
  ProjectAlertChannelPage_ChannelQuery,
} from '@/pages/project-alert-channel';
import { ProjectAlertsPage, ProjectAlertsPageQuery } from '@/pages/project-alerts';
import { UTCDate } from '@date-fns/utc';
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
  // The window depends on the plan, so the overview waits for the layout document on a cold load.
  loader: async loader => {
    const { organizationSlug, projectSlug } = loader.params;
    const retention = await usageRetention.project(loader);
    const { period, resolution } = overviewPeriod(new UTCDate(), retention);
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

export const projectAlertChannelRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/alerts/channels/$channelId',
  preloadStaleTime: 0,
  // The channel's configuration, revalidated on each visit; the live delivery data is the page's
  // own polling query.
  loader: loader => {
    const { organizationSlug, projectSlug, channelId } = loader.params;
    void loadQuery(
      loader,
      ProjectAlertChannelPage_ChannelQuery,
      { organizationSlug, projectSlug, channelId },
      revalidate(loader),
    );
    return requireLayoutFlag.project(loader, 'viewerCanModifyAlerts');
  },
  component: function ProjectAlertChannelRoute() {
    const { channelId } = projectAlertChannelRoute.useParams();
    return <ProjectAlertChannelPage channelId={channelId} />;
  },
});

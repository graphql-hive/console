import { z } from 'zod';
import { Page, TargetLayout } from '@/components/layouts/target';
import { AlertActivitySearch } from '@/components/target/alerts/search-schemas';
import { TargetAlertsPage } from '@/pages/target-alerts';
import { TargetAlertsActivityPage } from '@/pages/target-alerts-activity';
import { TargetAlertsCreatePage } from '@/pages/target-alerts-create';
import { TargetAlertsDetailPage } from '@/pages/target-alerts-detail';
import { TargetAlertsRulesPage } from '@/pages/target-alerts-rules';
import { createRoute, Navigate } from '@tanstack/react-router';
import { targetRoute } from './route';

// --- Alerts (nested routes with Outlet) ---

export const targetAlertsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'alerts',
  component: function TargetAlertsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetAlertsRoute.useParams();
    return (
      <TargetLayout
        page={Page.Alerts}
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      >
        <TargetAlertsPage
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
        />
      </TargetLayout>
    );
  },
});

export const targetAlertsIndexRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  path: '/',
  component: function TargetAlertsIndexRoute() {
    const params = targetAlertsIndexRoute.useParams();
    return (
      <Navigate to="/$organizationSlug/$projectSlug/$targetSlug/alerts/activity" params={params} />
    );
  },
});

export const targetAlertsRulesRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  path: 'rules',
  component: function TargetAlertsRulesRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetAlertsRulesRoute.useParams();
    return (
      <TargetAlertsRulesPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

export const targetAlertsActivityRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  path: 'activity',
  validateSearch: AlertActivitySearch.parse,
  component: function TargetAlertsActivityRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetAlertsActivityRoute.useParams();
    return (
      <TargetAlertsActivityPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const TargetAlertsCreateSearch = z.object({
  savedFilterId: z.string().optional(),
});

export const targetAlertsCreateRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  path: 'create',
  validateSearch: TargetAlertsCreateSearch.parse,
  component: function TargetAlertsCreateRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetAlertsCreateRoute.useParams();
    const { savedFilterId } = targetAlertsCreateRoute.useSearch();
    return (
      <TargetAlertsCreatePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        savedFilterId={savedFilterId}
      />
    );
  },
});

export const targetAlertsDetailRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  path: '$ruleId',
  component: function TargetAlertsDetailRoute() {
    const { organizationSlug, projectSlug, targetSlug, ruleId } =
      targetAlertsDetailRoute.useParams();
    return (
      <TargetAlertsDetailPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        ruleId={ruleId}
      />
    );
  },
});

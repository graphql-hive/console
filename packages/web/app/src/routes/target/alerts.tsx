import { z } from 'zod';
import { AlertActivitySearch } from '@/components/target/alerts/search-schemas';
import { TargetAlertsPage, TargetAlertsWithNav } from '@/pages/target-alerts';
import { TargetAlertsActivityPage } from '@/pages/target-alerts-activity';
import { TargetAlertsCreatePage } from '@/pages/target-alerts-create';
import { TargetAlertsDetailPage } from '@/pages/target-alerts-detail';
import { TargetAlertsRulesPage } from '@/pages/target-alerts-rules';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetAlertsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'alerts',
  component: TargetAlertsPage,
});

// Activity, rules and create sit beside the alerts nav; the rule detail below renders without it.
export const targetAlertsWithNavRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  id: 'with-nav',
  component: TargetAlertsWithNav,
});

export const targetAlertsIndexRoute = createRoute({
  getParentRoute: () => targetAlertsWithNavRoute,
  path: '/',
  validateSearch: AlertActivitySearch.parse,
  component: TargetAlertsActivityPage,
});

export const targetAlertsRulesRoute = createRoute({
  getParentRoute: () => targetAlertsWithNavRoute,
  path: 'rules',
  component: TargetAlertsRulesPage,
});

const TargetAlertsCreateSearch = z.object({
  savedFilterId: z.string().optional(),
});

export const targetAlertsCreateRoute = createRoute({
  getParentRoute: () => targetAlertsWithNavRoute,
  path: 'create',
  validateSearch: TargetAlertsCreateSearch.parse,
  component: function TargetAlertsCreateRoute() {
    const { savedFilterId } = targetAlertsCreateRoute.useSearch();
    return <TargetAlertsCreatePage savedFilterId={savedFilterId} />;
  },
});

export const targetAlertsDetailRoute = createRoute({
  getParentRoute: () => targetAlertsRoute,
  path: '$ruleId',
  component: function TargetAlertsDetailRoute() {
    const { ruleId } = targetAlertsDetailRoute.useParams();
    return <TargetAlertsDetailPage ruleId={ruleId} />;
  },
});

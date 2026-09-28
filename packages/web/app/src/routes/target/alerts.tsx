import { z } from 'zod';
import { AlertActivitySearch } from '@/components/target/alerts/search-schemas';
import { TargetAlertsPage, TargetAlertsWithNav } from '@/pages/target-alerts';
import { TargetAlertsActivityPage } from '@/pages/target-alerts-activity';
import {
  AlertForm_ChannelsQuery,
  AlertForm_SavedFiltersQuery,
} from '@/components/target/alerts/alert-form';
import {
  TargetAlertsCreatePage,
  TargetAlertsCreatePage_CapQuery,
} from '@/pages/target-alerts-create';
import { TargetAlertsDetailPage } from '@/pages/target-alerts-detail';
import { TargetAlertsRulesPage } from '@/pages/target-alerts-rules';
import { loadQuery, requireLayoutFlag } from '@/lib/route-utils';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetAlertsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'alerts',
  loader: loader => requireLayoutFlag.target(loader, 'viewerCanUseMetricAlertRules'),
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
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    const slugs = { organizationSlug, projectSlug, targetSlug };
    void loadQuery(loader, TargetAlertsCreatePage_CapQuery, slugs);
    void loadQuery(loader, AlertForm_ChannelsQuery, { organizationSlug, projectSlug });
    void loadQuery(loader, AlertForm_SavedFiltersQuery, slugs);
  },
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

import { z } from 'zod';
import {
  AlertForm_ChannelsQuery,
  AlertForm_SavedFiltersQuery,
} from '@/components/target/alerts/alert-form';
import { AlertActivitySearch } from '@/components/target/alerts/search-schemas';
import { loaderPeriod } from '@/lib/hooks/use-date-range-controller';
import {
  defaultRange,
  loadQuery,
  requireLayoutFlag,
  requireRange,
  requireRetention,
  revalidate,
  type RangeBounds,
} from '@/lib/route-utils';
import { TargetAlertsPage, TargetAlertsWithNav } from '@/pages/target-alerts';
import {
  presetLast1Hour,
  TargetAlertsActivityPage,
  TargetAlertsActivityPage_Query,
  TargetAlertsActivityPage_RetentionQuery,
} from '@/pages/target-alerts-activity';
import {
  TargetAlertsCreatePage,
  TargetAlertsCreatePage_CapQuery,
} from '@/pages/target-alerts-create';
import {
  TargetAlertsDetailPage,
  TargetAlertsDetailPage_RuleConfigQuery,
} from '@/pages/target-alerts-detail';
import { TargetAlertsRulesPage, TargetAlertsRulesPage_Query } from '@/pages/target-alerts-rules';
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

const activity: RangeBounds = {
  preset: presetLast1Hour,
  to: '/$organizationSlug/$projectSlug/$targetSlug/alerts',
};

export const targetAlertsIndexRoute = createRoute({
  getParentRoute: () => targetAlertsWithNavRoute,
  path: '/',
  validateSearch: AlertActivitySearch.parse,
  beforeLoad: defaultRange(activity),
  loaderDeps: ({ search }) => ({ from: search.from, to: search.to }),
  preloadStaleTime: 0,
  loader: async loader => {
    requireRange(loader, activity);
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    const slugs = { organizationSlug, projectSlug, targetSlug };
    const { period } = loaderPeriod(loader.deps, presetLast1Hour);
    // A plan change moves it: asked again on each visit, not on each poll.
    const retention = loadQuery(
      loader,
      TargetAlertsActivityPage_RetentionQuery,
      slugs,
      loader.cause === 'enter' ? revalidate(loader) : 'cache-first',
    );
    void loadQuery(
      loader,
      TargetAlertsActivityPage_Query,
      { ...slugs, from: period.from, to: period.to },
      revalidate(loader),
    );
    await requireRetention(
      loader,
      activity,
      retention.then(result => result.data?.target?.metricAlertStateLogRetentionDays ?? undefined),
    );
    return { period };
  },
  component: TargetAlertsActivityPage,
});

export const targetAlertsRulesRoute = createRoute({
  getParentRoute: () => targetAlertsWithNavRoute,
  path: 'rules',
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    void loadQuery(
      loader,
      TargetAlertsRulesPage_Query,
      { organizationSlug, projectSlug, targetSlug },
      revalidate(loader),
    );
  },
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
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug, ruleId } = loader.params;
    void loadQuery(
      loader,
      TargetAlertsDetailPage_RuleConfigQuery,
      { organizationSlug, projectSlug, targetSlug, ruleId },
      revalidate(loader),
    );
  },
  component: function TargetAlertsDetailRoute() {
    const { ruleId } = targetAlertsDetailRoute.useParams();
    return <TargetAlertsDetailPage ruleId={ruleId} />;
  },
});

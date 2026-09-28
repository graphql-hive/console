import { OperationsList_OperationsStatsQuery } from '@/components/target/insights/list';
import {
  InsightsDateRangeSearch,
  InsightsFilterSearch,
} from '@/components/target/insights/search-schemas';
import { Stats_GeneralOperationsStatsQuery } from '@/components/target/insights/stats';
import { presetLast1Day, presetLast7Days } from '@/components/ui/date-range-picker';
import { resolveDateRange } from '@/lib/hooks/use-date-range-controller';
import { loadQuery, type LoaderContext } from '@/lib/route-utils';
import {
  buildGraphQLFilter,
  InsightsFilterPicker_Query,
  TargetInsightsPage,
  TargetOperationsPageQuery,
} from '@/pages/target-insights';
import { TargetInsightsClientPage } from '@/pages/target-insights-client';
import { TargetInsightsCoordinatePage } from '@/pages/target-insights-coordinate';
import { TargetInsightsManageFiltersPage } from '@/pages/target-insights-manage-filters';
import {
  Operation_View_OperationBodyQuery,
  OperationInsightsPageQuery,
  TargetInsightsOperationPage,
} from '@/pages/target-insights-operation';
import { createRoute, redirect } from '@tanstack/react-router';
import { targetRoute } from './route';

// Stats move, so their documents revalidate on every visit and on Refresh (router.invalidate);
// the rest is read once, and a hover preload only warms.
const revalidate = (loader: LoaderContext) =>
  loader.preload ? ('cache-first' as const) : ('cache-and-network' as const);

export const targetInsightsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights',
  validateSearch: InsightsFilterSearch.parse,
  // A bare URL names the default range, so a shared link always says what it shows.
  beforeLoad: ({ search, params }) => {
    if (search.from === undefined && search.to === undefined) {
      throw redirect({
        to: '/$organizationSlug/$projectSlug/$targetSlug/insights',
        params,
        search: { ...search, from: presetLast7Days.range.from, to: presetLast7Days.range.to },
      });
    }
  },
  // Everything in the search but the saved filter's id reaches a query.
  loaderDeps: ({ search: { viewId: _viewId, ...deps } }) => deps,
  // A preload only warms, so the visit that follows it still runs the loader.
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    const selector = { organizationSlug, projectSlug, targetSlug };
    const { range: period, resolution } = resolveDateRange({
      from: loader.deps.from,
      to: loader.deps.to,
      defaultPreset: presetLast7Days,
    });
    const filter = buildGraphQLFilter(loader.deps);
    void loadQuery(loader, TargetOperationsPageQuery, selector);
    void loadQuery(loader, InsightsFilterPicker_Query, { selector, period });
    void loadQuery(
      loader,
      Stats_GeneralOperationsStatsQuery,
      { targetSelector: selector, period, filter, resolution },
      revalidate(loader),
    );
    void loadQuery(
      loader,
      OperationsList_OperationsStatsQuery,
      { targetSelector: selector, period, filter },
      revalidate(loader),
    );
    // The page reads the period from here, so both sides resolve "now" once.
    return { period, resolution };
  },
  component: TargetInsightsPage,
});

export const targetInsightsManageFiltersRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/manage-filters',
  component: TargetInsightsManageFiltersPage,
});

export const targetInsightsCoordinateRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/schema-coordinate/$coordinate',
  component: function TargetInsightsRoute() {
    const { coordinate } = targetInsightsCoordinateRoute.useParams();
    return <TargetInsightsCoordinatePage coordinate={coordinate} />;
  },
});

export const targetInsightsClientRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/client/$name',
  component: function TargetInsightsRoute() {
    const { name } = targetInsightsClientRoute.useParams();
    return <TargetInsightsClientPage name={name} />;
  },
});

export const targetInsightsOperationsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/$operationName/$operationHash',
  validateSearch: InsightsDateRangeSearch.parse,
  loaderDeps: ({ search }) => ({
    from: search.from ?? presetLast1Day.range.from,
    to: search.to ?? presetLast1Day.range.to,
  }),
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug, operationHash } = loader.params;
    const selector = { organizationSlug, projectSlug, targetSlug };
    const { range: period, resolution } = resolveDateRange({
      ...loader.deps,
      defaultPreset: presetLast1Day,
    });
    void loadQuery(loader, OperationInsightsPageQuery, selector);
    void loadQuery(loader, Operation_View_OperationBodyQuery, { selector, hash: operationHash });
    void loadQuery(
      loader,
      Stats_GeneralOperationsStatsQuery,
      { targetSelector: selector, period, filter: { operationIds: [operationHash] }, resolution },
      revalidate(loader),
    );
    return { period, resolution };
  },
  component: function TargetInsightsRoute() {
    const { operationName, operationHash } = targetInsightsOperationsRoute.useParams();
    return (
      <TargetInsightsOperationPage operationName={operationName} operationHash={operationHash} />
    );
  },
});

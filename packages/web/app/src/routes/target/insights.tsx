import { InsightsFilterSearch } from '@/components/target/insights/search-schemas';
import { TargetInsightsPage } from '@/pages/target-insights';
import { TargetInsightsClientPage } from '@/pages/target-insights-client';
import { TargetInsightsCoordinatePage } from '@/pages/target-insights-coordinate';
import { TargetInsightsManageFiltersPage } from '@/pages/target-insights-manage-filters';
import { TargetInsightsOperationPage } from '@/pages/target-insights-operation';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetInsightsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights',
  validateSearch: InsightsFilterSearch.parse,
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
  component: function TargetInsightsRoute() {
    const { operationName, operationHash } = targetInsightsOperationsRoute.useParams();
    return (
      <TargetInsightsOperationPage operationName={operationName} operationHash={operationHash} />
    );
  },
});

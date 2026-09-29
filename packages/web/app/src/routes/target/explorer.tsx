import { ExplorerSearch } from '@/components/target/explorer/search-schemas';
import { TypeFilter_AllTypes } from '@/components/target/explorer/use-explorer-filter-dimensions';
import { presetLast7Days, usageUnits } from '@/components/ui/date-range-picker';
import { loaderPeriod } from '@/lib/hooks/use-date-range-controller';
import {
  defaultRange,
  loadQuery,
  requireUnits,
  revalidate,
  type LoaderContext,
  type RangeBounds,
  type RangeLoader,
} from '@/lib/route-utils';
import { TargetExplorerPage, TargetExplorerPageQuery } from '@/pages/target-explorer';
import {
  DeprecatedSchemaExplorer_DeprecatedSchemaQuery,
  TargetExplorerDeprecatedPage,
  TargetExplorerDeprecatedSchemaPageQuery,
} from '@/pages/target-explorer-deprecated';
import {
  TargetExplorerTypenamePageQuery,
  TargetExplorerTypePage,
} from '@/pages/target-explorer-type';
import {
  TargetExplorerUnusedPage,
  TargetExplorerUnusedSchemaPageQuery,
  UnusedSchemaExplorer_UnusedSchemaQuery,
} from '@/pages/target-explorer-unused';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

const range = ({ search }: { search: { from?: string; to?: string } }) => ({
  from: search.from,
  to: search.to,
});

// The four views share the range the URL holds; a bare URL takes the last week.
const explorer = (to: string): RangeBounds => ({
  range: presetLast7Days.range,
  units: usageUnits,
  to,
});
const explorerAll = explorer('/$organizationSlug/$projectSlug/$targetSlug/explorer');
const explorerType = explorer('/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename');
const explorerDeprecated = explorer(
  '/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated',
);
const explorerUnused = explorer('/$organizationSlug/$projectSlug/$targetSlug/explorer/unused');

function explorerPeriod(loader: LoaderContext & RangeLoader, bounds: RangeBounds) {
  requireUnits(loader, bounds);
  const { organizationSlug, projectSlug, targetSlug } = loader.params;
  const { period } = loaderPeriod(loader.deps, presetLast7Days);
  return { slugs: { organizationSlug, projectSlug, targetSlug }, period };
}

export const targetExplorerRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(explorerAll),
  loaderDeps: range,
  preloadStaleTime: 0,
  loader: loader => {
    const { slugs, period } = explorerPeriod(loader, explorerAll);
    void loadQuery(loader, TargetExplorerPageQuery, { ...slugs, period }, revalidate(loader));
    void loadQuery(loader, TypeFilter_AllTypes, { ...slugs, period });
    return { period };
  },
  component: TargetExplorerPage,
});

export const targetExplorerTypeRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/$typename',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(explorerType),
  loaderDeps: range,
  preloadStaleTime: 0,
  loader: loader => {
    const { slugs, period } = explorerPeriod(loader, explorerType);
    void loadQuery(
      loader,
      TargetExplorerTypenamePageQuery,
      { ...slugs, period, typename: loader.params.typename },
      revalidate(loader),
    );
    void loadQuery(loader, TypeFilter_AllTypes, { ...slugs, period });
    return { period };
  },
  component: function TargetExplorerTypeRoute() {
    const { typename } = targetExplorerTypeRoute.useParams();
    return <TargetExplorerTypePage typename={typename} />;
  },
});

export const targetExplorerDeprecatedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/deprecated',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(explorerDeprecated),
  loaderDeps: range,
  preloadStaleTime: 0,
  loader: loader => {
    const { slugs, period } = explorerPeriod(loader, explorerDeprecated);
    void loadQuery(loader, TargetExplorerDeprecatedSchemaPageQuery, slugs);
    void loadQuery(
      loader,
      DeprecatedSchemaExplorer_DeprecatedSchemaQuery,
      { ...slugs, period },
      revalidate(loader),
    );
    return { period };
  },
  component: TargetExplorerDeprecatedPage,
});

export const targetExplorerUnusedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/unused',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(explorerUnused),
  loaderDeps: range,
  preloadStaleTime: 0,
  // Warmed even for a target without usage, whose page pauses its query: one wasted request there.
  loader: loader => {
    const { slugs, period } = explorerPeriod(loader, explorerUnused);
    void loadQuery(loader, TargetExplorerUnusedSchemaPageQuery, slugs);
    void loadQuery(
      loader,
      UnusedSchemaExplorer_UnusedSchemaQuery,
      { ...slugs, period },
      revalidate(loader),
    );
    return { period };
  },
  component: TargetExplorerUnusedPage,
});

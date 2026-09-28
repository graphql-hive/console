import { rememberedExplorerPeriod } from '@/components/target/explorer/period';
import { ExplorerSearch } from '@/components/target/explorer/search-schemas';
import { defaultRange } from '@/lib/route-utils';
import { TargetExplorerPage } from '@/pages/target-explorer';
import { TargetExplorerDeprecatedPage } from '@/pages/target-explorer-deprecated';
import { TargetExplorerTypePage } from '@/pages/target-explorer-type';
import { TargetExplorerUnusedPage } from '@/pages/target-explorer-unused';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

// A bare URL takes the preset last picked on any explorer view, so the views share one period.
export const targetExplorerRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(
    rememberedExplorerPeriod,
    '/$organizationSlug/$projectSlug/$targetSlug/explorer',
  ),
  component: TargetExplorerPage,
});

export const targetExplorerTypeRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/$typename',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(
    rememberedExplorerPeriod,
    '/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename',
  ),
  component: function TargetExplorerTypeRoute() {
    const { typename } = targetExplorerTypeRoute.useParams();
    return <TargetExplorerTypePage typename={typename} />;
  },
});

export const targetExplorerDeprecatedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/deprecated',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(
    rememberedExplorerPeriod,
    '/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated',
  ),
  component: TargetExplorerDeprecatedPage,
});

export const targetExplorerUnusedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/unused',
  validateSearch: ExplorerSearch.parse,
  beforeLoad: defaultRange(
    rememberedExplorerPeriod,
    '/$organizationSlug/$projectSlug/$targetSlug/explorer/unused',
  ),
  component: TargetExplorerUnusedPage,
});

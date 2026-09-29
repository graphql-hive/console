import { TargetExplorerPage } from '@/pages/target-explorer';
import { TargetExplorerDeprecatedPage } from '@/pages/target-explorer-deprecated';
import { TargetExplorerTypePage } from '@/pages/target-explorer-type';
import { TargetExplorerUnusedPage } from '@/pages/target-explorer-unused';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetExplorerRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer',
  component: TargetExplorerPage,
});

export const targetExplorerTypeRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/$typename',
  component: function TargetExplorerTypeRoute() {
    const { typename } = targetExplorerTypeRoute.useParams();
    return <TargetExplorerTypePage typename={typename} />;
  },
});

export const targetExplorerDeprecatedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/deprecated',
  component: TargetExplorerDeprecatedPage,
});

export const targetExplorerUnusedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/unused',
  component: TargetExplorerUnusedPage,
});

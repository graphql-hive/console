import { TargetExplorerPage } from '@/pages/target-explorer';
import { TargetExplorerDeprecatedPage } from '@/pages/target-explorer-deprecated';
import { TargetExplorerTypePage } from '@/pages/target-explorer-type';
import { TargetExplorerUnusedPage } from '@/pages/target-explorer-unused';
import { createRoute } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetExplorerRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer',
  component: function TargetExplorerRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetExplorerRoute.useParams();
    return (
      <TargetExplorerPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

export const targetExplorerTypeRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/$typename',
  component: function TargetExplorerTypeRoute() {
    const { organizationSlug, projectSlug, targetSlug, typename } =
      targetExplorerTypeRoute.useParams();
    return (
      <TargetExplorerTypePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        typename={typename}
      />
    );
  },
});

export const targetExplorerDeprecatedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/deprecated',
  component: function TargetExplorerDeprecatedRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetExplorerDeprecatedRoute.useParams();
    return (
      <TargetExplorerDeprecatedPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

export const targetExplorerUnusedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/unused',
  component: function TargetExplorerUnusedRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetExplorerUnusedRoute.useParams();
    return (
      <TargetExplorerUnusedPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

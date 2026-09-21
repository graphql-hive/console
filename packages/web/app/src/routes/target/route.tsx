import { ErrorComponent } from '@/components/error';
import { TargetPage } from '@/pages/target';
import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from '../authenticated';
import { RouteNotFound } from '../root';

export const targetRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug/$targetSlug',
  notFoundComponent: RouteNotFound,
  errorComponent: ErrorComponent,
});

export const targetIndexRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: '/',
  component: function TargetRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetIndexRoute.useParams();
    return (
      <TargetPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

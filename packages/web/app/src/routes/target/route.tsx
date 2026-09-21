import { TargetPage } from '@/pages/target';
import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from '../authenticated';

export const targetRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug/$targetSlug',
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

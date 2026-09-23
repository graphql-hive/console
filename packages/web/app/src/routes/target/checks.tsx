import { z } from 'zod';
import { TargetChecksPage } from '@/pages/target-checks';
import { TargetChecksAffectedDeploymentsPage } from '@/pages/target-checks-affected-deployments';
import { TargetChecksSinglePage } from '@/pages/target-checks-single';
import { createRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { targetRoute } from './route';

export const targetChecksRoute = createRoute({
  validateSearch: zodValidator(
    z.object({
      filter_changed: z.boolean().optional().catch(undefined),
      filter_failed: z.boolean().optional().catch(undefined),
    }),
  ),
  getParentRoute: () => targetRoute,
  path: 'checks',
  component: TargetChecksPage,
});

export const targetChecksSingleRoute = createRoute({
  getParentRoute: () => targetChecksRoute,
  path: '$schemaCheckId',
  component: function TargetChecksSingleRoute() {
    const { organizationSlug, projectSlug, targetSlug, schemaCheckId } =
      targetChecksSingleRoute.useParams();
    return (
      <TargetChecksSinglePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        schemaCheckId={schemaCheckId}
      />
    );
  },
});

export const targetChecksAffectedDeploymentsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'checks/$schemaCheckId/affected-deployments',
  validateSearch: () => ({}) as { coordinate?: string },
  component: function TargetChecksAffectedDeploymentsRoute() {
    const { organizationSlug, projectSlug, targetSlug, schemaCheckId } =
      targetChecksAffectedDeploymentsRoute.useParams();
    const { coordinate } = targetChecksAffectedDeploymentsRoute.useSearch();
    return (
      <TargetChecksAffectedDeploymentsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        schemaCheckId={schemaCheckId}
        coordinate={coordinate}
      />
    );
  },
});

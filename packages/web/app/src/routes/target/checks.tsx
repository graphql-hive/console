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
    const { schemaCheckId } = targetChecksSingleRoute.useParams();
    return <TargetChecksSinglePage schemaCheckId={schemaCheckId} />;
  },
});

export const targetChecksAffectedDeploymentsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'checks/$schemaCheckId/affected-deployments',
  validateSearch: () => ({}) as { coordinate?: string },
  component: function TargetChecksAffectedDeploymentsRoute() {
    const { schemaCheckId } = targetChecksAffectedDeploymentsRoute.useParams();
    const { coordinate } = targetChecksAffectedDeploymentsRoute.useSearch();
    return (
      <TargetChecksAffectedDeploymentsPage schemaCheckId={schemaCheckId} coordinate={coordinate} />
    );
  },
});

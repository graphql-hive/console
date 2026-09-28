import { z } from 'zod';
import { loadQuery } from '@/lib/route-utils';
import {
  ChecksPageQuery,
  SchemaChecks_NavigationQuery,
  TargetChecksPage,
} from '@/pages/target-checks';
import {
  affectedDeploymentsVariables,
  AffectedDeploymentsQuery,
  TargetChecksAffectedDeploymentsPage,
} from '@/pages/target-checks-affected-deployments';
import { ActiveSchemaCheckQuery, TargetChecksSinglePage } from '@/pages/target-checks-single';
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
  loaderDeps: ({ search }) => ({
    changed: search.filter_changed ?? false,
    failed: search.filter_failed ?? false,
  }),
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    const selector = { organizationSlug, projectSlug, targetSlug };
    void loadQuery(loader, ChecksPageQuery, selector);
    // The list's first page; the pages it loads later merge into it in the cache.
    void loadQuery(loader, SchemaChecks_NavigationQuery, {
      ...selector,
      after: null,
      filters: loader.deps,
    });
  },
  component: TargetChecksPage,
});

export const targetChecksSingleRoute = createRoute({
  getParentRoute: () => targetChecksRoute,
  path: '$schemaCheckId',
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug, schemaCheckId } = loader.params;
    void loadQuery(loader, ActiveSchemaCheckQuery, {
      organizationSlug,
      projectSlug,
      targetSlug,
      schemaCheckId,
    });
  },
  component: function TargetChecksSingleRoute() {
    const { schemaCheckId } = targetChecksSingleRoute.useParams();
    return <TargetChecksSinglePage schemaCheckId={schemaCheckId} />;
  },
});

export const targetChecksAffectedDeploymentsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'checks/$schemaCheckId/affected-deployments',
  validateSearch: zodValidator(z.object({ coordinate: z.string().optional() })),
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug, schemaCheckId } = loader.params;
    void loadQuery(
      loader,
      AffectedDeploymentsQuery,
      affectedDeploymentsVariables({ organizationSlug, projectSlug, targetSlug }, schemaCheckId, null),
    );
  },
  component: function TargetChecksAffectedDeploymentsRoute() {
    const { schemaCheckId } = targetChecksAffectedDeploymentsRoute.useParams();
    const { coordinate } = targetChecksAffectedDeploymentsRoute.useSearch();
    return (
      <TargetChecksAffectedDeploymentsPage schemaCheckId={schemaCheckId} coordinate={coordinate} />
    );
  },
});

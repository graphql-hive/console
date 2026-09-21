import { DiffsWorkerPoolProvider } from '@/components/theme/diffs-worker-pool-provider';
import { urqlClient } from '@/lib/urql';
import { TargetHistoryPage, TargetHistoryPageQuery } from '@/pages/target-history';
import { TargetHistorySchemaVersionPage } from '@/pages/target-history-schema-version';
import { createRoute, redirect } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetHistoryRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'history',
  // On the bare history route redirect to the target's latest version. Done here rather than in a
  // render effect so it runs once, deterministically, and can't loop.
  beforeLoad: async ({ params, location }) => {
    if (!/\/history\/?$/.test(location.pathname)) {
      return;
    }
    const result = await urqlClient.query(TargetHistoryPageQuery, params).toPromise();
    const versionId = result.data?.target?.latestSchemaVersion?.id;
    if (versionId) {
      throw redirect({
        to: '/$organizationSlug/$projectSlug/$targetSlug/history/$versionId',
        params: { ...params, versionId },
        replace: true,
      });
    }
  },
  component: function TargetHistoryRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetHistoryRoute.useParams();
    return (
      <TargetHistoryPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

export const targetHistoryVersionRoute = createRoute({
  getParentRoute: () => targetHistoryRoute,
  path: '$versionId',
  component: function TargetHistoryVersionRoute() {
    const { organizationSlug, projectSlug, targetSlug, versionId } =
      targetHistoryVersionRoute.useParams();
    return (
      <DiffsWorkerPoolProvider>
        <TargetHistorySchemaVersionPage
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
          targetSlug={targetSlug}
          schemaVersionId={versionId}
        />
      </DiffsWorkerPoolProvider>
    );
  },
});

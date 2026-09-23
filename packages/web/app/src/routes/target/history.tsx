import { DiffsWorkerPoolProvider } from '@/components/theme/diffs-worker-pool-provider';
import { urqlClient } from '@/lib/urql';
import { TargetHistoryLatestVersionQuery, TargetHistoryPage } from '@/pages/target-history';
import { TargetHistorySchemaVersionPage } from '@/pages/target-history-schema-version';
import { createRoute, redirect } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetHistoryRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'history',
  component: TargetHistoryPage,
});

// The bare URL is the latest version. A target without versions stays here and the list renders
// its empty state.
export const targetHistoryIndexRoute = createRoute({
  getParentRoute: () => targetHistoryRoute,
  path: '/',
  beforeLoad: async ({ params }) => {
    const result = await urqlClient.query(TargetHistoryLatestVersionQuery, params).toPromise();
    const versionId = result.data?.organization?.project?.target?.latestSchemaVersion?.id;
    if (versionId) {
      throw redirect({
        to: '/$organizationSlug/$projectSlug/$targetSlug/history/$versionId',
        params: { ...params, versionId },
      });
    }
  },
});

export const targetHistoryVersionRoute = createRoute({
  getParentRoute: () => targetHistoryRoute,
  path: '$versionId',
  component: function TargetHistoryVersionRoute() {
    const { versionId } = targetHistoryVersionRoute.useParams();
    return (
      <DiffsWorkerPoolProvider>
        <TargetHistorySchemaVersionPage schemaVersionId={versionId} />
      </DiffsWorkerPoolProvider>
    );
  },
});

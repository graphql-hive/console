import { SectionSkeleton } from '@/components/layouts/page-skeleton';
import { DiffsWorkerPoolProvider } from '@/components/theme/diffs-worker-pool-provider';
import { loadQuery } from '@/lib/route-utils';
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
  // A loader, not beforeLoad, so the wait shows a pending state; it renders in the history page's
  // pane, beside the versions list.
  pendingComponent: SectionSkeleton,
  loader: async loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    const result = await loadQuery(loader, TargetHistoryLatestVersionQuery, {
      organizationSlug,
      projectSlug,
      targetSlug,
    });
    const versionId = result.data?.organization?.project?.target?.latestSchemaVersion?.id;
    if (versionId) {
      throw redirect({
        to: '/$organizationSlug/$projectSlug/$targetSlug/history/$versionId',
        params: { organizationSlug, projectSlug, targetSlug, versionId },
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

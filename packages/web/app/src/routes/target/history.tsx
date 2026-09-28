import { SectionSkeleton } from '@/components/layouts/page-skeleton';
import { DiffsWorkerPoolProvider } from '@/components/theme/diffs-worker-pool-provider';
import { loadQuery, revalidate } from '@/lib/route-utils';
import {
  HistoryPage_VersionsPageQuery,
  TargetHistoryLatestVersionQuery,
  TargetHistoryPage,
  TargetHistoryPageQuery,
  versionsPageVariables,
} from '@/pages/target-history';
import {
  TargetHistoryGraphVersion_ActiveGraphVersionQuery,
  TargetHistorySchemaVersionPage,
} from '@/pages/target-history-schema-version';
import { createRoute, redirect } from '@tanstack/react-router';
import { targetRoute } from './route';

export const targetHistoryRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'history',
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug } = loader.params;
    const slugs = { organizationSlug, projectSlug, targetSlug };
    void loadQuery(loader, TargetHistoryPageQuery, slugs);
    // Versions arrive on their own, so the list's first page revalidates on every visit.
    void loadQuery(
      loader,
      HistoryPage_VersionsPageQuery,
      versionsPageVariables(slugs, null),
      revalidate(loader),
    );
  },
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
  loader: loader => {
    const { organizationSlug, projectSlug, targetSlug, versionId } = loader.params;
    void loadQuery(loader, TargetHistoryGraphVersion_ActiveGraphVersionQuery, {
      organizationSlug,
      projectSlug,
      targetSlug,
      schemaVersionId: versionId,
    });
  },
  component: function TargetHistoryVersionRoute() {
    const { versionId } = targetHistoryVersionRoute.useParams();
    return (
      <DiffsWorkerPoolProvider>
        <TargetHistorySchemaVersionPage schemaVersionId={versionId} />
      </DiffsWorkerPoolProvider>
    );
  },
});

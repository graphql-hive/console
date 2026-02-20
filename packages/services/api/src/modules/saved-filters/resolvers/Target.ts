import type { SavedFilterVisibilityType as GqlVisibility } from '../../../__generated__/types';
import type { SavedFilterVisibility } from '../../../shared/entities';
import { SavedFiltersProvider } from '../providers/saved-filters.provider';
import type { TargetResolvers } from './../../../__generated__/types';

function mapVisibility(visibility: GqlVisibility | null): SavedFilterVisibility | null {
  if (visibility === null) return null;
  return visibility === 'PRIVATE' ? 'private' : 'shared';
}

export const Target: Pick<
  TargetResolvers,
  'savedFilter' | 'savedFilters' | 'viewerCanCreateSavedFilter' | 'viewerCanShareSavedFilter'
> = {
  savedFilter: async (target, args, { injector }) => {
    const filter = await injector.get(SavedFiltersProvider).getSavedFilter(target, args.id);
    return filter ? { ...filter, targetId: target.id, orgId: target.orgId } : null;
  },
  savedFilters: async (target, args, { injector }) => {
    const result = await injector
      .get(SavedFiltersProvider)
      .getSavedFilters(
        target,
        args.type,
        args.first,
        args.after ?? null,
        mapVisibility(args.visibility ?? null),
        args.search ?? null,
      );
    return {
      ...result,
      edges: result.edges.map(edge => ({
        ...edge,
        node: { ...edge.node, targetId: target.id, orgId: target.orgId },
      })),
    };
  },
  viewerCanCreateSavedFilter: (target, _args, { session }) => {
    return session.canPerformAction({
      action: 'project:describe',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
      },
    });
  },
  viewerCanShareSavedFilter: (target, _args, { session }) => {
    return session.canPerformAction({
      action: 'sharedSavedFilter:modify',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
      },
    });
  },
};

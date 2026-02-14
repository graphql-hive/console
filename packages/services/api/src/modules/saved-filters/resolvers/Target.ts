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
  'savedFilter' | 'savedFilters' | 'viewerCanCreateSavedFilter'
> = {
  savedFilter: (target, args, { injector }) =>
    injector.get(SavedFiltersProvider).getSavedFilter(target, args.id),
  savedFilters: (target, args, { injector }) =>
    injector
      .get(SavedFiltersProvider)
      .getSavedFilters(
        target,
        args.type,
        args.first,
        args.after,
        mapVisibility(args.visibility ?? null),
        args.search ?? null,
      ),
  viewerCanCreateSavedFilter: (target, _args, { session }) => {
    return session.canPerformAction({
      action: 'project:modifySettings',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
      },
    });
  },
};

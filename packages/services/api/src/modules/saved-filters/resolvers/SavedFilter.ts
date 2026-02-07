import { Storage } from '../../shared/providers/storage';
import { SavedFiltersProvider } from '../providers/saved-filters.provider';
import type { SavedFilterResolvers } from './../../../__generated__/types';

export const SavedFilter: SavedFilterResolvers = {
  id: filter => filter.id,
  type: filter => filter.type,
  name: filter => filter.name,
  description: filter => filter.description,
  filters: filter => {
    const filters = filter.filters as {
      operationIds?: string[];
      clientFilters?: Array<{ name: string; versions?: string[] | null }>;
    };
    return {
      operationIds: filters.operationIds ?? [],
      clientFilters:
        filters.clientFilters?.map(cf => ({
          name: cf.name,
          versions: cf.versions ?? null,
        })) ?? [],
    };
  },
  visibility: filter => (filter.visibility === 'private' ? 'PRIVATE' : 'SHARED'),
  viewsCount: filter => filter.viewsCount,
  createdAt: filter => filter.createdAt,
  updatedAt: filter => filter.updatedAt,
  createdBy: async (filter, _args, { injector }) => {
    return injector.get(Storage).getUserById({ id: filter.createdByUserId });
  },
  updatedBy: async (filter, _args, { injector }) => {
    if (!filter.updatedByUserId) {
      return null;
    }
    return injector.get(Storage).getUserById({ id: filter.updatedByUserId });
  },
  viewerCanUpdate: async (filter, _args, { injector, session }) => {
    // Only check ownership/visibility - the actual permission check happens in the mutation
    // This is used for UI hints
    const currentUser = await session.getViewer();
    return injector.get(SavedFiltersProvider).canUserModifyFilter(filter, currentUser.id);
  },
  viewerCanDelete: async (filter, _args, { injector, session }) => {
    // Only check ownership/visibility - the actual permission check happens in the mutation
    // This is used for UI hints
    const currentUser = await session.getViewer();
    return injector.get(SavedFiltersProvider).canUserDeleteFilter(filter, currentUser.id);
  },
};

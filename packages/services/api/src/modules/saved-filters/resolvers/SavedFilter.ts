import { UTCDate } from '@date-fns/utc';
import { parseDateMathExpression } from '../../../shared/date-math';
import { Storage } from '../../shared/providers/storage';
import { SavedFiltersProvider } from '../providers/saved-filters.provider';
import type { SavedFilterResolvers } from './../../../__generated__/types';

export const SavedFilter: SavedFilterResolvers = {
  id: filter => filter.id,
  name: filter => filter.name,
  description: filter => filter.description,
  filters: filter => filter.filters,
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
    // For shared filters, check sharedSavedFilter:modify permission
    if (filter.visibility === 'shared' && filter.orgId) {
      const canModifyShared = await session.canPerformAction({
        action: 'sharedSavedFilter:modify',
        organizationId: filter.orgId,
        params: { organizationId: filter.orgId, projectId: filter.projectId },
      });
      if (!canModifyShared) return false;
    }
    // Check ownership (private filters can only be modified by creator)
    const currentUser = await session.getViewer();
    return injector.get(SavedFiltersProvider).canUserModifyFilter(filter, currentUser.id);
  },
  viewerCanDelete: async (filter, _args, { injector, session }) => {
    // For shared filters, check sharedSavedFilter:modify permission
    if (filter.visibility === 'shared' && filter.orgId) {
      const canModifyShared = await session.canPerformAction({
        action: 'sharedSavedFilter:modify',
        organizationId: filter.orgId,
        params: { organizationId: filter.orgId, projectId: filter.projectId },
      });
      if (!canModifyShared) return false;
    }
    // Check ownership (private filters can only be modified by creator)
    const currentUser = await session.getViewer();
    return injector.get(SavedFiltersProvider).canUserDeleteFilter(filter, currentUser.id);
  },
  operationsStats: filter => {
    if (!filter.targetId || !filter.orgId) {
      return null;
    }

    const dateRange = filter.filters.dateRange ?? { from: 'now-7d', to: 'now' };
    const now = new UTCDate();
    const from = parseDateMathExpression(dateRange.from, now);
    const to = parseDateMathExpression(dateRange.to, now);

    if (!from || !to) {
      return null;
    }

    return {
      organization: filter.orgId,
      project: filter.projectId,
      target: filter.targetId,
      period: { from, to },
      operations: filter.filters.operationHashes,
      clients: [],
      clientVersionFilters: filter.filters.clientFilters.map(cf => ({
        clientName: cf.name === 'unknown' ? '' : cf.name,
        versions: cf.versions ?? null,
      })),
    };
  },
};

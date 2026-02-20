import { UTCDate } from '@date-fns/utc';
import { parseDateMathExpression } from '../../../shared/date-math';
import { Storage } from '../../shared/providers/storage';
import { SavedFiltersProvider } from '../providers/saved-filters.provider';
import type { SavedFilterResolvers } from './../../../__generated__/types';

type ParsedFilters = {
  operationHashes: string[];
  clientFilters: Array<{ name: string; versions: string[] | null }>;
  dateRange: { from: string; to: string } | null;
};

function extractFilters(filterData: unknown): ParsedFilters {
  const filters = filterData as {
    operationHashes?: string[];
    clientFilters?: Array<{ name: string; versions?: string[] | null }>;
    dateRange?: { from: string; to: string } | null;
  };
  return {
    operationHashes: filters.operationHashes ?? [],
    clientFilters:
      filters.clientFilters?.map(cf => ({
        name: cf.name,
        versions: cf.versions ?? null,
      })) ?? [],
    dateRange: filters.dateRange ?? null,
  };
}

export const SavedFilter: SavedFilterResolvers = {
  id: filter => filter.id,
  type: filter => filter.type,
  name: filter => filter.name,
  description: filter => filter.description,
  filters: filter => extractFilters(filter.filters),
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
  operationsStats: filter => {
    if (!filter.targetId || !filter.orgId) {
      return null;
    }

    const filtersData = extractFilters(filter.filters);
    const dateRange = filtersData.dateRange ?? { from: 'now-7d', to: 'now' };
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
      operations: filtersData.operationHashes,
      clients: [],
      clientVersionFilters: filtersData.clientFilters.map(cf => ({
        clientName: cf.name === 'unknown' ? '' : cf.name,
        versions: cf.versions ?? null,
      })),
    };
  },
};

import { SavedFiltersProvider } from '../../providers/saved-filters.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateSavedFilter: NonNullable<MutationResolvers['updateSavedFilter']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = await injector
    .get(SavedFiltersProvider)
    .updateSavedFilter(input.target, input.id, {
      name: input.name ?? null,
      description: input.description,
      visibility: input.visibility ?? null,
      insightsFilter: input.insightsFilter
        ? {
            operationHashes: input.insightsFilter.operationHashes
              ? [...input.insightsFilter.operationHashes]
              : null,
            clientFilters:
              input.insightsFilter.clientFilters?.map(cf => ({
                name: cf.name,
                versions: cf.versions ? [...cf.versions] : null,
              })) ?? null,
            dateRange: input.insightsFilter.dateRange
              ? {
                  from: input.insightsFilter.dateRange.from,
                  to: input.insightsFilter.dateRange.to,
                }
              : null,
          }
        : null,
    });

  if (result.type === 'error') {
    return {
      error: {
        message: result.message,
      },
    };
  }

  return {
    ok: {
      savedFilter: result.savedFilter,
    },
  };
};

import { SavedFiltersProvider } from '../../providers/saved-filters.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createSavedFilter: NonNullable<MutationResolvers['createSavedFilter']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = await injector.get(SavedFiltersProvider).createSavedFilter(input.target, {
    name: input.name,
    description: input.description ?? null,
    visibility: input.visibility,
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
            ? { from: input.insightsFilter.dateRange.from, to: input.insightsFilter.dateRange.to }
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

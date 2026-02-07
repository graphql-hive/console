import { SavedFiltersProvider } from '../../providers/saved-filters.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateSavedFilter: NonNullable<MutationResolvers['updateSavedFilter']> = async (
  _parent,
  args,
  { injector },
) => {
  const result = await injector.get(SavedFiltersProvider).updateSavedFilter(
    args.selector,
    args.id,
    {
      name: args.input.name ?? null,
      description: args.input.description,
      visibility: args.input.visibility ?? null,
      insightsFilter: args.input.insightsFilter
        ? {
            operationIds: args.input.insightsFilter.operationIds
              ? [...args.input.insightsFilter.operationIds]
              : null,
            clientFilters:
              args.input.insightsFilter.clientFilters?.map(cf => ({
                name: cf.name,
                versions: cf.versions ? [...cf.versions] : null,
              })) ?? null,
          }
        : null,
    },
  );

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

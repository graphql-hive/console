import { SavedFiltersProvider } from '../../providers/saved-filters.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createSavedFilter: NonNullable<MutationResolvers['createSavedFilter']> = async (
  _parent,
  args,
  { injector },
) => {
  const result = await injector.get(SavedFiltersProvider).createSavedFilter(args.selector, {
    type: args.input.type,
    name: args.input.name,
    description: args.input.description ?? null,
    visibility: args.input.visibility,
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

import { SavedFiltersProvider } from '../../providers/saved-filters.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteSavedFilter: NonNullable<MutationResolvers['deleteSavedFilter']> = async (
  _parent,
  args,
  { injector },
) => {
  const result = await injector.get(SavedFiltersProvider).deleteSavedFilter(args.selector, args.id);

  if (result.type === 'error') {
    return {
      error: {
        message: result.message,
      },
    };
  }

  return {
    ok: {
      deletedId: result.deletedId,
    },
  };
};

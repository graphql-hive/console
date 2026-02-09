import { SavedFiltersProvider } from '../../providers/saved-filters.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const trackSavedFilterView: NonNullable<MutationResolvers['trackSavedFilterView']> = async (
  _parent,
  args,
  { injector },
) => {
  const result = await injector.get(SavedFiltersProvider).trackView(args.selector, args.id);

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

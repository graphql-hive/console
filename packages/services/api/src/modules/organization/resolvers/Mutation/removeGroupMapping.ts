import { Groups } from '../../providers/groups';
import type { MutationResolvers } from './../../../../__generated__/types';

export const removeGroupMapping: NonNullable<MutationResolvers['removeGroupMapping']> = async (
  _,
  args,
  { injector },
) => {
  const result = await injector.get(Groups).removeGroupMapping({
    groupMappingId: args.input.groupMappingId,
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
      group: result.group,
    },
  };
};

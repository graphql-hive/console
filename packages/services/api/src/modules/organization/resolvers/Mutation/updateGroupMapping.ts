import { Groups } from '../../providers/groups';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateGroupMapping: NonNullable<MutationResolvers['updateGroupMapping']> = async (
  _,
  args,
  { injector },
) => {
  const result = await injector.get(Groups).updateGroupMapping({
    groupMappingId: args.input.groupMappingId,
    newAssignedResources: args.input.assignedResources ?? null,
    newRoleId: args.input.roleId ?? null,
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

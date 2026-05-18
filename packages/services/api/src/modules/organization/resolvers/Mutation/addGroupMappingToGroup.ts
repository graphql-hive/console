import { Groups } from '../../providers/groups';
import type { MutationResolvers } from './../../../../__generated__/types';

export const addGroupMappingToGroup: NonNullable<
  MutationResolvers['addGroupMappingToGroup']
> = async (_, args, { injector }) => {
  const result = await injector.get(Groups).addGroupMappingToGroup({
    groupId: args.input.groupId,
    roleId: args.input.roleId,
    assignedResources: args.input.assignedResources ?? null,
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

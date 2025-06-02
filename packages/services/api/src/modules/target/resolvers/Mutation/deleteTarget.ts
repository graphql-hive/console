import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteTarget: NonNullable<MutationResolvers['deleteTarget']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(TargetManager).deleteTarget({
    target: input.target,
  });

  return {
    ok: {
      deletedTargetId: result.deletedTarget.id,
    },
  };
};

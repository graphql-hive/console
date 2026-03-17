import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createTarget: NonNullable<MutationResolvers['createTarget']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(TargetManager).createTarget({
    project: input.project,
    slug: input.slug,
  });

  if (result.ok) {
    return {
      ok: {
        selector: result.selector,
        createdTarget: result.target,
      },
    };
  }

  return {
    ok: null,
    error: {
      message: result.message,
      inputErrors: result.inputErrors ?? {},
    },
  };
};

import { TargetManager } from '../../providers/target-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateTargetSlug: NonNullable<MutationResolvers['updateTargetSlug']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = await injector.get(TargetManager).updateSlug({
    slug: input.slug,
    target: input.target,
  });

  if (result.ok) {
    return {
      ok: {
        selector: result.selector,
        target: result.target,
      },
    };
  }

  return {
    ok: null,
    error: {
      message: result.message,
    },
  };
};

import { ProjectManager } from '../../providers/project-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateProjectSlug: NonNullable<MutationResolvers['updateProjectSlug']> = async (
  _parent,
  { input },
  { injector },
) => {
  const result = await injector.get(ProjectManager).updateSlug({
    project: input.project,
    slug: input.slug,
  });

  if (result.ok) {
    return {
      ok: {
        updatedProject: result.project,
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

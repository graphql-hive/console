import { ProjectManager } from '../../providers/project-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteProject: NonNullable<MutationResolvers['deleteProject']> = async (
  _,
  { input },
  { injector },
) => {
  const deletedProject = await injector.get(ProjectManager).deleteProject({
    project: input.project,
  });

  return {
    ok: {
      deletedProjectId: deletedProject.id,
    },
  };
};

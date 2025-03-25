import { ProjectManager } from '../../providers/project-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const project: NonNullable<QueryResolvers['project']> = async (
  _,
  { reference },
  { injector },
) => {
  return await injector.get(ProjectManager).getProjectByRereference(reference);
};

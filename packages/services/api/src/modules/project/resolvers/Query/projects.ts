import { IdTranslator } from '../../../shared/providers/id-translator';
import { ProjectManager } from '../../providers/project-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const projects: NonNullable<QueryResolvers['projects']> = async (
  _,
  { selector },
  { injector },
) => {
  const organization = await injector.get(IdTranslator).translateOrganizationId(selector);
  return injector.get(ProjectManager).getProjects({ organizationId: organization });
};

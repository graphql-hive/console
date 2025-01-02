import { IdTranslator } from '../../../shared/providers/id-translator';
import { ProjectManager } from '../../providers/project-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const project: NonNullable<QueryResolvers['project']> = async (
  _,
  { selector },
  { injector },
) => {
  const translator = injector.get(IdTranslator);
  const [organization, project] = await Promise.all([
    translator.translateOrganizationId(selector),
    translator.translateProjectId(selector),
  ]);
  return injector.get(ProjectManager).getProject({
    projectId: project,
    organizationId: organization,
  });
};

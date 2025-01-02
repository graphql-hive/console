import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const target: NonNullable<QueryResolvers['target']> = async (
  _,
  { selector },
  { injector },
) => {
  const translator = injector.get(IdTranslator);
  const [organization, project, target] = await Promise.all([
    translator.translateOrganizationId(selector),
    translator.translateProjectId(selector),
    translator.translateTargetId(selector),
  ]);

  return injector.get(TargetManager).getTarget({
    organizationId: organization,
    targetId: target,
    projectId: project,
  });
};

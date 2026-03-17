import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const targets: NonNullable<QueryResolvers['targets']> = async (
  _,
  { selector },
  { injector },
) => {
  const translator = injector.get(IdTranslator);
  const [organization, project] = await Promise.all([
    translator.translateOrganizationId(selector),
    translator.translateProjectId(selector),
  ]);

  const targets = await injector.get(TargetManager).getTargets({
    organizationId: organization,
    projectId: project,
  });

  return {
    edges: targets.map(node => ({
      cursor: '',
      node,
    })),
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      endCursor: '',
      startCursor: '',
    },
  };
};

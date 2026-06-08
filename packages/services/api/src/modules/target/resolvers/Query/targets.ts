import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../providers/target-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const targets: NonNullable<QueryResolvers['targets']> = async (_, args, { injector }) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(args.selector),
    translator.translateProjectId(args.selector),
  ]);

  return injector.get(TargetManager).getPaginatedTargets(
    {
      organizationId,
      projectId,
    },
    {
      first: args.first ?? null,
      after: args.after ?? null,
      search: args.search ?? null,
      sort: args.sort ?? null,
    },
  );
};

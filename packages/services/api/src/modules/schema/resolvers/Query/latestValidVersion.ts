import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const latestValidVersion: NonNullable<QueryResolvers['latestValidVersion']> = async (
  _,
  args,
  { injector, session },
) => {
  const selector = await injector.get(IdTranslator).resolveTargetReference({
    reference: args.target ?? null,
  });

  if (!selector) {
    session.raise('project:describe');
  }

  await session.assertPerformAction({
    action: 'project:describe',
    organizationId: selector.organizationId,
    params: {
      organizationId: selector.organizationId,
      projectId: selector.projectId,
    },
  });

  const target = await injector.get(TargetManager).getTargetById({ targetId: selector.targetId });
  return injector.get(SchemaManager).getMaybeLatestValidVersion(target);
};

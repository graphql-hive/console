import { InsufficientPermissionError } from '../../../auth/lib/authz';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';
import type { QueryResolvers } from './../../../../__generated__/types';

export const latestValidVersion: NonNullable<QueryResolvers['latestValidVersion']> = async (
  _,
  args,
  { injector, session },
) => {
  const { targetId, projectId, organizationId } = await injector
    .get(IdTranslator)
    .resolveTargetReference({
      reference: args.target ?? null,
      onError() {
        throw new InsufficientPermissionError('project:describe');
      },
    });

  await session.assertPerformAction({
    action: 'project:describe',
    organizationId,
    params: {
      organizationId,
      projectId,
    },
  });

  const target = await injector.get(TargetManager).getTargetById({ targetId });
  return injector.get(SchemaManager).getMaybeLatestValidVersion(target);
};

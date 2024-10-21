import { TargetManager } from '../../../target/providers/target-manager';
import { SchemaManager } from '../../providers/schema-manager';
import type { QueryResolvers } from './../../../../__generated__/types.next';

export const latestValidVersion: NonNullable<QueryResolvers['latestValidVersion']> = async (
  _,
  __,
  { injector },
) => {
  const target = await injector.get(TargetManager).getTargetFromToken();

  return injector.get(SchemaManager).getMaybeLatestValidVersion({
    organizationId: target.orgId,
    projectId: target.projectId,
    targetId: target.id,
  });
};

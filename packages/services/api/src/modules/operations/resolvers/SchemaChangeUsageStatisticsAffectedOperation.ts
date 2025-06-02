import { SchemaChangeUsageStatisticsAffectedOperationResolvers } from '../../../__generated__/types';
import { OperationsReader } from '../providers/operations-reader';

export const SchemaChangeUsageStatisticsAffectedOperation: Pick<
  SchemaChangeUsageStatisticsAffectedOperationResolvers,
  'operation' | '__isTypeOf'
> = {
  operation: (affectedOperation, _, { injector }) => {
    return injector.get(OperationsReader).readOperation({
      targetIds: affectedOperation.targetIds,
      hash: affectedOperation.hash,
    });
  },
};

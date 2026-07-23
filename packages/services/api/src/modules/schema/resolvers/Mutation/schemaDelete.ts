import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaDelete: NonNullable<MutationResolvers['schemaDelete']> = async (
  _,
  { input },
  { injector, request },
) => {
  const result = await injector.get(SchemaPublisher).delete(
    {
      dryRun: input.dryRun,
      serviceName: input.serviceName.toLowerCase(),
      target: input.target,
      supportsRetry: input.supportsRetry,
    },
    request.signal,
  );

  if (result.__typename === 'SchemaDeleteRetry') {
    return result;
  }

  return {
    ...result,
    changes: result.changes,
    errors: result.errors?.map(error => ({
      ...error,
      path: 'path' in error ? error.path?.split('.') : null,
    })),
  };
};

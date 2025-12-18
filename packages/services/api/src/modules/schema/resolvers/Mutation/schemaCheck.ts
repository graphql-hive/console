import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaCheck: NonNullable<MutationResolvers['schemaCheck']> = async (
  _,
  { input },
  { injector },
) => {
  const result = await injector.get(SchemaPublisher).check({
    ...input,
    service: input.service?.toLowerCase(),
    target: input.target ?? null,
    schemaProposalId: input.schemaProposalId, // @todo check permission
  });

  if ('changes' in result && result.changes) {
    return {
      ...result,
      changes: result.changes,
      errors:
        result.errors?.map(error => ({
          ...error,
          path: 'path' in error ? error.path?.split('.') : null,
        })) ?? [],
    };
  }

  return result;
};

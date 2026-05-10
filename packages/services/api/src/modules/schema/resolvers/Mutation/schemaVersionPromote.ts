import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const schemaVersionPromote: NonNullable<MutationResolvers['schemaVersionPromote']> = async (
  _,
  args,
  { injector, request },
) => {
  const result = await injector.get(SchemaPublisher).promoteSchemaVersion(
    {
      target: args.input.target,
      schemaVersionId: args.input.schemaVersionId,
    },
    request.signal,
  );

  if (result.type === 'success') {
    return {
      ok: {
        newSchemaVersion: result.schemaVersion,
      },
    };
  }

  return {
    error: {
      message: result.message,
    },
  };
};

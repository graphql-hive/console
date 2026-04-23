import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const graphPromote: NonNullable<MutationResolvers['graphPromote']> = async (
  _parent,
  args,
  { injector, request },
) => {
  const result = await injector.get(SchemaPublisher).promoteGraph(
    {
      target: args.input.target,
      graphName: args.input.graphName,
      graphVersionId: args.input.graphVersionId,
    },
    request.signal,
  );

  if (result.type === 'success') {
    return {
      ok: {
        newGraphVersion: result.graphVersion,
      },
    };
  }

  return {
    error: {
      message: result.message,
    },
  };
};

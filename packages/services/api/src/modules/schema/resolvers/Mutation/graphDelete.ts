import { SchemaPublisher } from '../../providers/schema-publisher';
import type { MutationResolvers } from './../../../../__generated__/types';

export const graphDelete: NonNullable<MutationResolvers['graphDelete']> = async (
  _parent,
  args,
  { injector, request },
) => {
  const result = await injector.get(SchemaPublisher).deleteGraph(
    {
      graphName: args.input.graphName,
      target: args.input.target,
    },
    request.signal,
  );

  if (result.type === 'error') {
    return {
      error: {
        message: result.message,
      },
    };
  }
  return {
    ok: {
      deletedGraphName: args.input.graphName,
    },
  };
};

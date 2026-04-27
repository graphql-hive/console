import type { MutationResolvers } from '../../../../__generated__/types';
import { SchemaPublisher } from '../../providers/schema-publisher';

export const graphClone: NonNullable<MutationResolvers['graphClone']> = async (
  _,
  args,
  { injector, request },
) => {
  const result = await injector.get(SchemaPublisher).cloneGraph(
    {
      target: args.input.target,
      newGraphName: args.input.newGraphName,
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
      newGraph: result.graphVariant,
      newGraphUrl: '',
    },
  };
};

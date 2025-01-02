import { CollectionProvider } from '../../providers/collection.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createDocumentCollection: NonNullable<
  MutationResolvers['createDocumentCollection']
> = async (_, { selector, input }, { injector }) => {
  const result = await injector.get(CollectionProvider).createCollection(selector, {
    name: input.name,
    description: input.description ?? null,
  });

  return {
    ok: {
      __typename: 'ModifyDocumentCollectionOkPayload',
      collection: result.collection,
      updatedTarget: result.target,
    },
  };
};

import { CollectionProvider } from '../../providers/collection.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateDocumentCollection: NonNullable<
  MutationResolvers['updateDocumentCollection']
> = async (_, { selector, input }, { injector }) => {
  const result = await injector.get(CollectionProvider).updateCollection(selector, {
    collectionId: input.collectionId,
    description: input.description ?? null,
    name: input.name,
  });

  if (!result) {
    return {
      error: {
        __typename: 'ModifyDocumentCollectionError',
        message: 'Failed to locate a document collection',
      },
    };
  }

  return {
    ok: {
      __typename: 'ModifyDocumentCollectionOkPayload',
      collection: result.collection,
      updatedTarget: result.target,
    },
  };
};

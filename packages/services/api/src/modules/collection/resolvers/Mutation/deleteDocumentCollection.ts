import { CollectionProvider } from '../../providers/collection.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteDocumentCollection: NonNullable<
  MutationResolvers['deleteDocumentCollection']
> = async (_, { selector, id }, { injector }) => {
  const result = await injector
    .get(CollectionProvider)
    .deleteCollection(selector, { collectionId: id });

  return {
    ok: {
      __typename: 'DeleteDocumentCollectionOkPayload',
      deletedId: result.deletedCollectionId,
      updatedTarget: result.target,
    },
  };
};

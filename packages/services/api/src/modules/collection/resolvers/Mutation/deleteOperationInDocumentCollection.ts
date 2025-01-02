import { CollectionProvider } from '../../providers/collection.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteOperationInDocumentCollection: NonNullable<
  MutationResolvers['deleteOperationInDocumentCollection']
> = async (_, { selector, id }, { injector }) => {
  const result = await injector.get(CollectionProvider).deleteOperation(selector, {
    collectionDocumentId: id,
  });

  if (result.type === 'error') {
    return {
      error: {
        __typename: 'ModifyDocumentCollectionError',
        message: result.message,
      },
    };
  }

  return {
    ok: {
      __typename: 'DeleteDocumentCollectionOperationOkPayload',
      deletedId: result.deletedCollectionDocumentId,
      updatedTarget: result.target,
      updatedCollection: result.collection,
    },
  };
};

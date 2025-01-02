import { CollectionProvider } from '../../providers/collection.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const createOperationInDocumentCollection: NonNullable<
  MutationResolvers['createOperationInDocumentCollection']
> = async (_, { selector, input }, { injector }) => {
  const result = await injector.get(CollectionProvider).createOperation(selector, {
    collectionId: input.collectionId,
    operation: {
      name: input.name,
      query: input.query,
      variables: input.variables ?? null,
      headers: input.headers ?? null,
    },
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
      __typename: 'ModifyDocumentCollectionOperationOkPayload',
      operation: result.document,
      updatedTarget: result.target,
      collection: result.collection,
    },
  };
};

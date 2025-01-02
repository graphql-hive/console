import { CollectionProvider } from '../../providers/collection.provider';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateOperationInDocumentCollection: NonNullable<
  MutationResolvers['updateOperationInDocumentCollection']
> = async (_, { selector, input }, { injector }) => {
  const result = await injector.get(CollectionProvider).updateOperation(selector, {
    collectionDocumentId: input.operationId,
    operation: {
      name: input.name ?? null,
      query: input.query ?? null,
      headers: input.headers ?? null,
      variables: input.variables ?? null,
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

import { CollectionProvider } from '../providers/collection.provider';
import type { DocumentCollectionOperationResolvers } from './../../../__generated__/types';

export const DocumentCollectionOperation: DocumentCollectionOperationResolvers = {
  name: op => op.title,
  query: op => op.contents,
  collection: async (op, _args, { injector }) => {
    const collection = await injector
      .get(CollectionProvider)
      .getCollectionForDocumentCollectionOperation(op);

    // This should not happen, but we do want to flag this as an unexpected error.
    if (!collection) {
      throw new Error('Collection not found');
    }

    return collection;
  },
};

import { CollectionProvider } from '../providers/collection.provider';
import type { DocumentCollectionResolvers } from './../../../__generated__/types';

export const DocumentCollection: DocumentCollectionResolvers = {
  id: root => root.id,
  name: root => root.title,
  description: root => root.description,
  operations: (root, args, { injector }) =>
    injector
      .get(CollectionProvider)
      .getOperationsForDocumentCollection(root, args.first, args.after),
};

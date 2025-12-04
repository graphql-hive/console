import { useCallback, useState } from 'react';
import type { LabaratoryOperation } from '@/labaratory/lib/operations';
import type { LabaratoryTabsActions, LabaratoryTabsState } from '@/labaratory/lib/tabs';

export interface LabaratoryCollectionOperation extends LabaratoryOperation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface LabaratoryCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  operations: LabaratoryCollectionOperation[];
}

export interface LabaratoryCollectionsActions {
  addCollection: (
    collection: Omit<LabaratoryCollection, 'id' | 'createdAt' | 'operations'>,
  ) => void;
  addOperationToCollection: (
    collectionId: string,
    operation: Omit<LabaratoryCollectionOperation, 'createdAt'>,
  ) => void;
  deleteCollection: (collectionId: string) => void;
  deleteOperationFromCollection: (collectionId: string, operationId: string) => void;
  updateCollection: (
    collectionId: string,
    collection: Omit<LabaratoryCollection, 'id' | 'createdAt'>,
  ) => void;
  updateOperationInCollection: (
    collectionId: string,
    operationId: string,
    operation: Omit<LabaratoryCollectionOperation, 'id' | 'createdAt'>,
  ) => void;
}

export interface LabaratoryCollectionsState {
  collections: LabaratoryCollection[];
}

export interface LabaratoryCollectionsCallbacks {
  onCollectionCreate?: (collection: LabaratoryCollection) => void;
  onCollectionUpdate?: (collection: LabaratoryCollection) => void;
  onCollectionDelete?: (collection: LabaratoryCollection) => void;
  onCollectionOperationCreate?: (
    collection: LabaratoryCollection,
    operation: LabaratoryCollectionOperation,
  ) => void;
  onCollectionOperationUpdate?: (
    collection: LabaratoryCollection,
    operation: LabaratoryCollectionOperation,
  ) => void;
  onCollectionOperationDelete?: (
    collection: LabaratoryCollection,
    operation: LabaratoryCollectionOperation,
  ) => void;
}

export const useCollections = (
  props: {
    defaultCollections?: LabaratoryCollection[];
    onCollectionsChange?: (collections: LabaratoryCollection[]) => void;
    tabsApi?: LabaratoryTabsState & LabaratoryTabsActions;
  } & LabaratoryCollectionsCallbacks,
): LabaratoryCollectionsState & LabaratoryCollectionsActions => {
  const [collections, setCollections] = useState<LabaratoryCollection[]>(
    props.defaultCollections ?? [],
  );

  const addCollection = useCallback(
    (collection: Omit<LabaratoryCollection, 'id' | 'createdAt' | 'operations'>) => {
      const newCollection: LabaratoryCollection = {
        ...collection,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        operations: [],
      };
      const newCollections = [...collections, newCollection];
      setCollections(newCollections);
      props.onCollectionsChange?.(newCollections);
      props.onCollectionCreate?.(newCollection);
    },
    [collections, props],
  );

  const addOperation = useCallback(
    (collectionId: string, operation: Omit<LabaratoryCollectionOperation, 'createdAt'>) => {
      const newOperation: LabaratoryCollectionOperation = {
        ...operation,
        createdAt: new Date().toISOString(),
      };
      const newCollections = collections.map(collection =>
        collection.id === collectionId
          ? {
              ...collection,
              operations: [...collection.operations, newOperation],
            }
          : collection,
      );

      setCollections(newCollections);
      props.onCollectionsChange?.(newCollections);
      const updatedCollection = newCollections.find(collection => collection.id === collectionId);
      if (updatedCollection) {
        props.onCollectionUpdate?.(updatedCollection);
        props.onCollectionOperationCreate?.(updatedCollection, newOperation);
      }
    },
    [collections, props],
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      const collectionToDelete = collections.find(collection => collection.id === collectionId);
      const newCollections = collections.filter(collection => collection.id !== collectionId);
      setCollections(newCollections);
      props.onCollectionsChange?.(newCollections);
      if (collectionToDelete) {
        props.onCollectionDelete?.(collectionToDelete);
      }
    },
    [collections, props],
  );

  const deleteOperation = useCallback(
    (collectionId: string, operationId: string) => {
      let operationToDelete: LabaratoryCollectionOperation | undefined;
      const newCollections = collections.map(collection =>
        collection.id === collectionId
          ? {
              ...collection,
              operations: collection.operations.filter(operation => {
                if (operation.id === operationId) {
                  operationToDelete = operation;
                  return false;
                }
                return true;
              }),
            }
          : collection,
      );
      setCollections(newCollections);
      props.onCollectionsChange?.(newCollections);
      const updatedCollection = newCollections.find(collection => collection.id === collectionId);
      if (updatedCollection) {
        props.onCollectionUpdate?.(updatedCollection);
        if (operationToDelete) {
          props.onCollectionOperationDelete?.(updatedCollection, operationToDelete);
        }
      }
    },
    [collections, props],
  );

  const updateCollection = useCallback(
    (collectionId: string, collection: Omit<LabaratoryCollection, 'id' | 'createdAt'>) => {
      const newCollections = collections.map(c =>
        c.id === collectionId ? { ...c, ...collection } : c,
      );
      setCollections(newCollections);
      props.onCollectionsChange?.(newCollections);
      const updatedCollection = newCollections.find(collection => collection.id === collectionId);
      if (updatedCollection) {
        props.onCollectionUpdate?.(updatedCollection);
      }
    },
    [collections, props],
  );

  const updateOperation = useCallback(
    (
      collectionId: string,
      operationId: string,
      operation: Omit<LabaratoryCollectionOperation, 'id' | 'createdAt'>,
    ) => {
      let updatedOperation: LabaratoryCollectionOperation | undefined;
      const newCollections = collections.map(c => {
        if (c.id !== collectionId) {
          return c;
        }

        return {
          ...c,
          operations: c.operations.map(o => {
            if (o.id === operationId) {
              updatedOperation = { ...o, ...operation };
              return updatedOperation;
            }

            return o;
          }),
        };
      });
      setCollections(newCollections);
      props.onCollectionsChange?.(newCollections);
      const updatedCollection = newCollections.find(collection => collection.id === collectionId);
      if (updatedCollection) {
        props.onCollectionUpdate?.(updatedCollection);
        if (updatedOperation) {
          props.onCollectionOperationUpdate?.(updatedCollection, updatedOperation);
        }
      }
    },
    [collections, props],
  );

  return {
    collections,
    addCollection,
    addOperationToCollection: addOperation,
    deleteCollection,
    deleteOperationFromCollection: deleteOperation,
    updateCollection,
    updateOperationInCollection: updateOperation,
  };
};

import { useCallback, useState } from 'react';
import type { LaboratoryOperation } from '@/laboratory/lib/operations';
import type { LaboratoryTabsActions, LaboratoryTabsState } from '@/laboratory/lib/tabs';

export interface LaboratoryCollectionOperation extends LaboratoryOperation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface LaboratoryCollection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  operations: LaboratoryCollectionOperation[];
}

export interface LaboratoryCollectionsActions {
  addCollection: (
    collection: Omit<LaboratoryCollection, 'id' | 'createdAt' | 'operations'>,
  ) => void;
  addOperationToCollection: (
    collectionId: string,
    operation: Omit<LaboratoryCollectionOperation, 'createdAt'>,
  ) => void;
  deleteCollection: (collectionId: string) => void;
  deleteOperationFromCollection: (collectionId: string, operationId: string) => void;
  updateCollection: (
    collectionId: string,
    collection: Omit<LaboratoryCollection, 'id' | 'createdAt'>,
  ) => void;
  updateOperationInCollection: (
    collectionId: string,
    operationId: string,
    operation: Omit<LaboratoryCollectionOperation, 'id' | 'createdAt'>,
  ) => void;
}

export interface LaboratoryCollectionsState {
  collections: LaboratoryCollection[];
}

export interface LaboratoryCollectionsCallbacks {
  onCollectionCreate?: (collection: LaboratoryCollection) => void;
  onCollectionUpdate?: (collection: LaboratoryCollection) => void;
  onCollectionDelete?: (collection: LaboratoryCollection) => void;
  onCollectionOperationCreate?: (
    collection: LaboratoryCollection,
    operation: LaboratoryCollectionOperation,
  ) => void;
  onCollectionOperationUpdate?: (
    collection: LaboratoryCollection,
    operation: LaboratoryCollectionOperation,
  ) => void;
  onCollectionOperationDelete?: (
    collection: LaboratoryCollection,
    operation: LaboratoryCollectionOperation,
  ) => void;
}

export const useCollections = (
  props: {
    defaultCollections?: LaboratoryCollection[];
    onCollectionsChange?: (collections: LaboratoryCollection[]) => void;
    tabsApi?: LaboratoryTabsState & LaboratoryTabsActions;
  } & LaboratoryCollectionsCallbacks,
): LaboratoryCollectionsState & LaboratoryCollectionsActions => {
  const [collections, setCollections] = useState<LaboratoryCollection[]>(
    props.defaultCollections ?? [],
  );

  const addCollection = useCallback(
    (collection: Omit<LaboratoryCollection, 'id' | 'createdAt' | 'operations'>) => {
      const newCollection: LaboratoryCollection = {
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
    (collectionId: string, operation: Omit<LaboratoryCollectionOperation, 'createdAt'>) => {
      const newOperation: LaboratoryCollectionOperation = {
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
      let operationToDelete: LaboratoryCollectionOperation | undefined;
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
    (collectionId: string, collection: Omit<LaboratoryCollection, 'id' | 'createdAt'>) => {
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
      operation: Omit<LaboratoryCollectionOperation, 'id' | 'createdAt'>,
    ) => {
      let updatedOperation: LaboratoryCollectionOperation | undefined;
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

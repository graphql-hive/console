// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import {
  useCollections,
  type LaboratoryCollection,
  type LaboratoryCollectionOperation,
} from './collections';

const operation = (id: string): Omit<LaboratoryCollectionOperation, 'createdAt'> => ({
  id,
  name: id,
  description: '',
  query: 'query { a }',
  variables: '',
  headers: '',
  extensions: '',
});

describe('useCollections', () => {
  it('addCollection fires onCollectionsChange and onCollectionCreate', () => {
    const onCollectionsChange = vi.fn();
    const onCollectionCreate = vi.fn();
    const { result } = renderHook(() =>
      useCollections({ onCollectionsChange, onCollectionCreate }),
    );

    let created: LaboratoryCollection;
    act(() => {
      created = result.current.addCollection({ name: 'New' });
    });

    expect(created!.id).toBeTruthy();
    expect(onCollectionsChange).toHaveBeenCalledWith([created!]);
    expect(onCollectionCreate).toHaveBeenCalledWith(created!);
  });

  it('addOperationToCollection fires BOTH onCollectionOperationCreate and onCollectionUpdate', () => {
    const onCollectionOperationCreate = vi.fn();
    const onCollectionUpdate = vi.fn();
    const { result } = renderHook(() =>
      useCollections({ onCollectionOperationCreate, onCollectionUpdate }),
    );

    let collectionId: string;
    act(() => {
      collectionId = result.current.addCollection({ name: 'New' }).id;
    });
    act(() => {
      result.current.addOperationToCollection(collectionId, operation('op1'));
    });

    expect(onCollectionOperationCreate).toHaveBeenCalledTimes(1);
    expect(onCollectionOperationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: collectionId! }),
      expect.objectContaining({ id: 'op1' }),
    );
    expect(onCollectionUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: collectionId! }));
  });

  it('updateCollection merges the new name and fires onCollectionUpdate', () => {
    const onCollectionUpdate = vi.fn();
    const { result } = renderHook(() => useCollections({ onCollectionUpdate }));

    let collectionId: string;
    act(() => {
      collectionId = result.current.addCollection({ name: 'Old' }).id;
    });
    act(() => {
      result.current.updateCollection(collectionId, { name: 'Renamed' });
    });

    expect(result.current.collections[0].name).toBe('Renamed');
    expect(onCollectionUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed' }));
  });

  it('deleteCollection fires onCollectionDelete with the removed collection', () => {
    const onCollectionDelete = vi.fn();
    const { result } = renderHook(() => useCollections({ onCollectionDelete }));

    let collectionId: string;
    act(() => {
      collectionId = result.current.addCollection({ name: 'Doomed' }).id;
    });
    act(() => {
      result.current.deleteCollection(collectionId);
    });

    expect(result.current.collections).toHaveLength(0);
    expect(onCollectionDelete).toHaveBeenCalledWith(expect.objectContaining({ id: collectionId! }));
  });

  it('deleteOperationFromCollection fires onCollectionOperationDelete and onCollectionUpdate', () => {
    const onCollectionOperationDelete = vi.fn();
    const onCollectionUpdate = vi.fn();
    const { result } = renderHook(() =>
      useCollections({ onCollectionOperationDelete, onCollectionUpdate }),
    );

    let collectionId: string;
    act(() => {
      collectionId = result.current.addCollection({ name: 'C', operations: [operation('op1')] }).id;
    });
    act(() => {
      result.current.deleteOperationFromCollection(collectionId, 'op1');
    });

    expect(result.current.collections[0].operations).toHaveLength(0);
    expect(onCollectionOperationDelete).toHaveBeenCalledWith(
      expect.objectContaining({ id: collectionId! }),
      expect.objectContaining({ id: 'op1' }),
    );
    expect(onCollectionUpdate).toHaveBeenCalled();
  });

  it('updateOperationInCollection updates the operation and fires onCollectionOperationUpdate and onCollectionUpdate', () => {
    const onCollectionOperationUpdate = vi.fn();
    const onCollectionUpdate = vi.fn();
    const { result } = renderHook(() =>
      useCollections({ onCollectionOperationUpdate, onCollectionUpdate }),
    );

    let collectionId: string;
    act(() => {
      collectionId = result.current.addCollection({ name: 'C', operations: [operation('op1')] }).id;
    });
    act(() => {
      result.current.updateOperationInCollection(collectionId, 'op1', {
        name: 'Renamed',
        description: '',
        query: 'query { b }',
        variables: '',
        headers: '',
        extensions: '',
      });
    });

    expect(result.current.collections[0].operations[0].name).toBe('Renamed');
    expect(onCollectionOperationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: collectionId! }),
      expect.objectContaining({ id: 'op1', name: 'Renamed' }),
    );
    expect(onCollectionUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: collectionId! }));
  });
});

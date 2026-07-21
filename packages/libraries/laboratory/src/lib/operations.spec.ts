// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import type { LaboratoryCollectionsActions, LaboratoryCollectionsState } from './collections';
import { useOperations, type LaboratoryOperation } from './operations';
import type { LaboratoryTabsActions, LaboratoryTabsState } from './tabs';

const op = (id: string): LaboratoryOperation => ({
  id,
  name: '',
  query: 'query Foo { a }',
  variables: '',
  headers: '',
  extensions: '',
});

// Minimal tabsApi whose active tab points at the given operation id.
const tabsApiFor = (operationId: string) =>
  ({
    activeTab: { id: 't1', type: 'operation', data: { id: operationId, name: '' } },
    tabs: [{ id: 't1', type: 'operation', data: { id: operationId, name: '' } }],
    setActiveTab: vi.fn(),
    setTabs: vi.fn(),
    addTab: vi.fn(),
    updateTab: vi.fn(),
    deleteTab: vi.fn(),
  }) as unknown as LaboratoryTabsState & LaboratoryTabsActions;

// Minimal collectionsApi where the operation lives inside collection "c1".
const collectionsApiWith = (operationId: string) => {
  const updateOperationInCollection = vi.fn();
  const api = {
    collections: [
      {
        id: 'c1',
        name: 'C',
        createdAt: '2026-01-01T00:00:00.000Z',
        operations: [
          { ...op(operationId), description: '', createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      },
    ],
    addCollection: vi.fn(),
    addOperationToCollection: vi.fn(),
    deleteCollection: vi.fn(),
    deleteOperationFromCollection: vi.fn(),
    updateCollection: vi.fn(),
    updateOperationInCollection,
  } as unknown as LaboratoryCollectionsState & LaboratoryCollectionsActions;

  return { api, updateOperationInCollection };
};

describe('useOperations', () => {
  it('addOperation fires onOperationsChange and onOperationCreate', () => {
    const onOperationsChange = vi.fn();
    const onOperationCreate = vi.fn();
    const { result } = renderHook(() =>
      useOperations({ checkPermissions: () => true, onOperationsChange, onOperationCreate }),
    );

    let created: LaboratoryOperation;
    act(() => {
      created = result.current.addOperation({
        name: '',
        query: '',
        variables: '',
        headers: '',
        extensions: '',
      });
    });

    expect(created!.id).toBeTruthy();
    expect(onOperationsChange).toHaveBeenCalledWith([created!]);
    expect(onOperationCreate).toHaveBeenCalledWith(created!);
  });

  it('deleteOperation fires onOperationDelete and onOperationsChange', () => {
    const onOperationDelete = vi.fn();
    const onOperationsChange = vi.fn();
    const { result } = renderHook(() =>
      useOperations({
        checkPermissions: () => true,
        defaultOperations: [op('op1')],
        onOperationDelete,
        onOperationsChange,
      }),
    );

    act(() => {
      result.current.deleteOperation('op1');
    });

    expect(result.current.operations).toHaveLength(0);
    expect(onOperationDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'op1' }));
    expect(onOperationsChange).toHaveBeenCalledWith([]);
  });

  it('updateActiveOperation fires onOperationsChange and onOperationUpdate', () => {
    const onOperationUpdate = vi.fn();
    const onOperationsChange = vi.fn();
    const { result } = renderHook(() =>
      useOperations({
        checkPermissions: () => true,
        defaultOperations: [op('op1')],
        tabsApi: tabsApiFor('op1'),
        onOperationUpdate,
        onOperationsChange,
      }),
    );

    act(() => {
      result.current.updateActiveOperation({ query: 'query Bar { a }' });
    });

    expect(onOperationsChange).toHaveBeenCalled();
    expect(onOperationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'op1', query: 'query Bar { a }' }),
    );
  });

  it('writes an edit through to the collection when collectionsOperations:update is permitted', () => {
    const { api, updateOperationInCollection } = collectionsApiWith('op1');
    const { result } = renderHook(() =>
      useOperations({
        checkPermissions: () => true,
        defaultOperations: [op('op1')],
        tabsApi: tabsApiFor('op1'),
        collectionsApi: api,
      }),
    );

    act(() => {
      result.current.updateActiveOperation({ query: 'query Bar { a }' });
    });

    expect(updateOperationInCollection).toHaveBeenCalledTimes(1);
    expect(updateOperationInCollection).toHaveBeenCalledWith(
      'c1',
      'op1',
      expect.objectContaining({ query: 'query Bar { a }' }),
    );
  });

  it('does NOT write through to the collection when the permission is denied', () => {
    const { api, updateOperationInCollection } = collectionsApiWith('op1');
    const { result } = renderHook(() =>
      useOperations({
        checkPermissions: () => false,
        defaultOperations: [op('op1')],
        tabsApi: tabsApiFor('op1'),
        collectionsApi: api,
      }),
    );

    act(() => {
      result.current.updateActiveOperation({ query: 'query Bar { a }' });
    });

    expect(updateOperationInCollection).not.toHaveBeenCalled();
  });
});

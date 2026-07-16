// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import {
  useHistory,
  type LaboratoryHistoryRequest,
  type LaboratoryHistorySubscription,
} from './history';
import type { LaboratoryOperation } from './operations';

const operation: LaboratoryOperation = {
  id: 'op1',
  name: 'Op',
  query: 'query { a }',
  variables: '',
  headers: '',
  extensions: '',
};

const requestItem = (id: string): LaboratoryHistoryRequest => ({
  id,
  response: '{}',
  headers: '{}',
  operation,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const subscriptionItem = (id: string): LaboratoryHistorySubscription => ({
  id,
  responses: [],
  operation,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('useHistory', () => {
  it('addHistory generates an id and fires onHistoryChange before onHistoryCreate', () => {
    const onHistoryChange = vi.fn();
    const onHistoryCreate = vi.fn();
    const { result } = renderHook(() => useHistory({ onHistoryChange, onHistoryCreate }));

    const input: Omit<LaboratoryHistoryRequest, 'id'> = {
      response: '{}',
      headers: '{}',
      operation,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    let created: { id: string };
    act(() => {
      created = result.current.addHistory(input);
    });

    expect(created!.id).toBeTruthy();
    expect(onHistoryChange).toHaveBeenCalledTimes(1);
    expect(onHistoryCreate).toHaveBeenCalledWith(expect.objectContaining({ id: created!.id }));
    expect(onHistoryChange.mock.invocationCallOrder[0]).toBeLessThan(
      onHistoryCreate.mock.invocationCallOrder[0],
    );
  });

  it('addResponseToHistory appends to a subscription item and fires onHistoryUpdate', () => {
    const onHistoryUpdate = vi.fn();
    const { result } = renderHook(() =>
      useHistory({ defaultHistory: [subscriptionItem('sub1')], onHistoryUpdate }),
    );

    act(() => {
      result.current.addResponseToHistory('sub1', '{"data":1}');
    });

    const item = result.current.history[0] as LaboratoryHistorySubscription;
    expect(item.responses).toHaveLength(1);
    expect(item.responses[0].data).toBe('{"data":1}');
    expect(onHistoryUpdate).toHaveBeenCalledTimes(1);
  });

  it('addResponseToHistory is a no-op for a non-subscription (request) item', () => {
    const onHistoryUpdate = vi.fn();
    const { result } = renderHook(() =>
      useHistory({ defaultHistory: [requestItem('h1')], onHistoryUpdate }),
    );

    act(() => {
      result.current.addResponseToHistory('h1', '{"data":1}');
    });

    expect(onHistoryUpdate).not.toHaveBeenCalled();
  });

  it('deleteHistory fires onHistoryDelete once with the removed item', () => {
    const onHistoryDelete = vi.fn();
    const { result } = renderHook(() =>
      useHistory({ defaultHistory: [requestItem('h1'), requestItem('h2')], onHistoryDelete }),
    );

    act(() => {
      result.current.deleteHistory('h1');
    });

    expect(result.current.history).toHaveLength(1);
    expect(onHistoryDelete).toHaveBeenCalledTimes(1);
    expect(onHistoryDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'h1' }));
  });

  it('deleteAllHistory fires onHistoryDelete once per removed item', () => {
    const onHistoryDelete = vi.fn();
    const onHistoryChange = vi.fn();
    const { result } = renderHook(() =>
      useHistory({
        defaultHistory: [requestItem('h1'), requestItem('h2')],
        onHistoryDelete,
        onHistoryChange,
      }),
    );

    act(() => {
      result.current.deleteAllHistory();
    });

    expect(result.current.history).toHaveLength(0);
    expect(onHistoryChange).toHaveBeenCalledWith([]);
    expect(onHistoryDelete).toHaveBeenCalledTimes(2);
  });
});

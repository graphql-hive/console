// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { usePagedConnection } from './use-paged-connection';

const edges = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `e${i}` }));

describe('usePagedConnection', () => {
  it('pages through what is loaded without fetching', () => {
    const loadMore = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      usePagedConnection({
        edges: edges(25),
        pageInfo: { hasNextPage: false, endCursor: 'c25' },
        pageSize: 10,
        loadMore,
      }),
    );
    expect(result.current.rows.map(e => e.id)).toEqual(edges(10).map(e => e.id));
    expect(result.current.pagination.hasPreviousPage).toBe(false);
    expect(result.current.pagination.hasNextPage).toBe(true);

    act(() => result.current.pagination.onNext());
    act(() => result.current.pagination.onNext());
    expect(result.current.rows).toHaveLength(5);
    expect(result.current.pagination.summary).toBe('Page 3');
    expect(result.current.pagination.hasNextPage).toBe(false);
    expect(loadMore).not.toHaveBeenCalled();

    act(() => result.current.pagination.onPrevious());
    expect(result.current.pagination.summary).toBe('Page 2');
  });

  it('fetches the next page with the end cursor once the loaded pages run out', async () => {
    // The cache merges the fetched page into the connection, so the edges grow on the rerender.
    let loaded = edges(10);
    const loadMore = vi.fn(() => {
      loaded = edges(15);
      return Promise.resolve();
    });
    const { result, rerender } = renderHook(() =>
      usePagedConnection({
        edges: loaded,
        pageInfo: { hasNextPage: true, endCursor: 'c10' },
        pageSize: 10,
        loadMore,
      }),
    );
    expect(result.current.pagination.hasNextPage).toBe(true);
    await act(async () => {
      result.current.pagination.onNext();
    });
    rerender();
    expect(loadMore).toHaveBeenCalledWith('c10');
    expect(result.current.pagination.summary).toBe('Page 2');
    expect(result.current.rows.map(e => e.id)).toEqual(['e10', 'e11', 'e12', 'e13', 'e14']);
  });

  it('counts the pages in the summary when the connection reports a total', () => {
    const { result } = renderHook(() =>
      usePagedConnection({
        edges: edges(10),
        pageInfo: { hasNextPage: true, endCursor: 'c10' },
        pageSize: 10,
        total: 34,
        loadMore: () => Promise.resolve(),
      }),
    );
    expect(result.current.pagination.summary).toBe('Page 1 of 4');
  });

  it('stays on the last page that exists when the connection shrinks', () => {
    let loaded = edges(12);
    const { result, rerender } = renderHook(() =>
      usePagedConnection({
        edges: loaded,
        pageInfo: { hasNextPage: false },
        pageSize: 10,
        loadMore: () => Promise.resolve(),
      }),
    );
    act(() => result.current.pagination.onNext());
    expect(result.current.pagination.summary).toBe('Page 2');

    loaded = edges(9);
    rerender();
    expect(result.current.pagination.summary).toBe('Page 1');
    expect(result.current.rows).toHaveLength(9);
  });
});

import { useMemo, useState } from 'react';

/**
 * Previous and next pages over a relay connection that graphcache merges (`relayPagination`).
 * Loaded edges stay in the cache, so paging back is a slice; paging forward past what is loaded
 * fetches the next page with `after` and the merged connection grows. The summary is the page
 * number, out of the page count when the connection reports a total.
 */
export function usePagedConnection<TEdge>(args: {
  edges: readonly TEdge[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  pageSize: number;
  total?: number;
  loadMore: (after: string) => Promise<unknown>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadedPages = Math.max(1, Math.ceil(args.edges.length / args.pageSize));
  // A refetch can shrink the connection under the current page; stay on the last one that exists.
  const page = Math.min(pageIndex, loadedPages - 1);
  const { edges, pageSize } = args;
  // A stable slice, so a memoized list below only re-renders when the page's rows change.
  const rows = useMemo(
    () => edges.slice(page * pageSize, (page + 1) * pageSize),
    [edges, page, pageSize],
  );
  const hasNextLoaded = page + 1 < loadedPages;
  const hasNextPage = hasNextLoaded || args.pageInfo.hasNextPage;

  async function next() {
    if (hasNextLoaded) {
      setPageIndex(page + 1);
      return;
    }
    if (!args.pageInfo.hasNextPage || !args.pageInfo.endCursor) {
      return;
    }
    setLoading(true);
    try {
      await args.loadMore(args.pageInfo.endCursor);
      setPageIndex(page + 1);
    } finally {
      setLoading(false);
    }
  }

  return {
    rows,
    pagination: {
      kind: 'cursor' as const,
      hasPreviousPage: page > 0,
      hasNextPage,
      onPrevious: () => setPageIndex(Math.max(0, page - 1)),
      onNext: () => void next(),
      loading,
      summary:
        args.total === undefined
          ? `Page ${page + 1}`
          : `Page ${page + 1} of ${Math.max(1, Math.ceil(args.total / args.pageSize))}`,
    },
  };
}

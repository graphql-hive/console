import { useState } from 'react';

/**
 * Previous and next pages over a relay connection that graphcache merges (`relayPagination`).
 * Loaded edges stay in the cache, so paging back is a slice; paging forward past what is loaded
 * fetches the next page with `after` and the merged connection grows. There is no total, so the
 * summary is the page number.
 */
export function usePagedConnection<TEdge>(args: {
  edges: readonly TEdge[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  pageSize: number;
  loadMore: (after: string) => Promise<unknown>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadedPages = Math.max(1, Math.ceil(args.edges.length / args.pageSize));
  // A refetch can shrink the connection under the current page; stay on the last one that exists.
  const page = Math.min(pageIndex, loadedPages - 1);
  const start = page * args.pageSize;
  const rows = args.edges.slice(start, start + args.pageSize);
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
      summary: `Page ${page + 1}`,
    },
  };
}

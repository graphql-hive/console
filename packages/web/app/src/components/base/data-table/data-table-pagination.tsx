import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';

export type DataTablePaginationProps = {
  pageIndex: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const barClass =
  'border-neutral-4 bg-neutral-2 dark:bg-neutral-3 flex h-9 w-full items-center border-t text-sm';

const arrowClass =
  'text-neutral-10 hover:text-neutral-12 disabled:hover:text-neutral-10 inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40';

/**
 * Returns the page numbers to render as buttons, with `null` entries representing
 * ellipsis gaps. Always shows the first page, the last page, the current page, and a
 * small window around the current page.
 */
function getVisiblePages(pageIndex: number, pageCount: number): Array<number | null> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i);
  }

  const current = pageIndex;
  const pages: Array<number | null> = [0];

  const windowStart = Math.max(1, current - 1);
  const windowEnd = Math.min(pageCount - 2, current + 1);

  if (windowStart > 1) pages.push(null);
  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);
  if (windowEnd < pageCount - 2) pages.push(null);

  pages.push(pageCount - 1);
  return pages;
}

/** Numbered pages, for data the client holds in full. */
export function DataTablePagination({
  pageIndex,
  pageCount,
  onPageChange,
}: DataTablePaginationProps) {
  if (pageCount <= 1) return null;

  const pages = getVisiblePages(pageIndex, pageCount);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  return (
    <nav role="navigation" aria-label="Pagination" className={`${barClass} justify-center gap-1`}>
      <button
        type="button"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => onPageChange(pageIndex - 1)}
        className={arrowClass}
      >
        <ChevronLeft className="size-4" />
      </button>
      {pages.map((page, i) =>
        page === null ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden
            className="text-neutral-10 inline-flex size-8 items-center justify-center"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            aria-label={`Page ${page + 1}`}
            aria-current={page === pageIndex ? 'page' : undefined}
            onClick={() => onPageChange(page)}
            className={
              page === pageIndex
                ? 'bg-neutral-5 text-neutral-12 inline-flex size-6 items-center justify-center rounded-full font-mono text-xs'
                : 'text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 inline-flex size-6 items-center justify-center rounded-full font-mono text-xs transition-colors'
            }
          >
            {page + 1}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => onPageChange(pageIndex + 1)}
        className={arrowClass}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

export type DataTableCursorPaginationProps = {
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** What the page holds, such as "Showing 20 of 143 deployments". */
  summary?: ReactNode;
  loading?: boolean;
};

/**
 * Previous and next, for a cursor connection the API pages with `first` and `after`. There are
 * no page numbers because the API has no offsets to give.
 */
export function DataTableCursorPagination({
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
  summary,
  loading = false,
}: DataTableCursorPaginationProps) {
  return (
    <nav role="navigation" aria-label="Pagination" className={`${barClass} justify-between px-2`}>
      <span className="text-neutral-10 px-2 text-xs">{summary}</span>
      <span className="inline-flex items-center gap-1">
        {loading ? <LoaderCircle className="text-neutral-10 size-4 animate-spin" /> : null}
        <button
          type="button"
          aria-label="Previous page"
          disabled={!hasPreviousPage || loading}
          onClick={onPrevious}
          className={arrowClass}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={!hasNextPage || loading}
          onClick={onNext}
          className={arrowClass}
        >
          <ChevronRight className="size-4" />
        </button>
      </span>
    </nav>
  );
}

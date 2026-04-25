import { ChevronLeft, ChevronRight } from 'lucide-react';

export type DataTablePaginationProps = {
  pageIndex: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

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
    <nav
      role="navigation"
      aria-label="Pagination"
      className="flex items-center justify-center gap-1 text-sm"
    >
      <button
        type="button"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => onPageChange(pageIndex - 1)}
        className="text-neutral-10 hover:text-neutral-12 disabled:hover:text-neutral-10 inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40"
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
                ? 'bg-neutral-5 text-neutral-12 inline-flex size-8 items-center justify-center rounded-md'
                : 'text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 inline-flex size-8 items-center justify-center rounded-md transition-colors'
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
        className="text-neutral-10 hover:text-neutral-12 disabled:hover:text-neutral-10 inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

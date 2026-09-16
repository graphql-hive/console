import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '../input/input';
import { Spinner } from '../spinner/spinner';

export type DataTablePaginationProps = {
  pageIndex: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

const barClass =
  'border-neutral-4 bg-neutral-2 dark:bg-neutral-3 flex h-9 w-full items-center border-t text-sm';

const arrowClass =
  'text-neutral-10 hover:text-neutral-12 disabled:hover:text-neutral-10 inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40';

const wordClass =
  'text-neutral-10 hover:text-neutral-12 disabled:hover:text-neutral-10 inline-flex h-8 items-center rounded-md px-2 text-xs transition-colors disabled:opacity-40';

/**
 * First, previous, next and last with the page position between them and a field to jump to a
 * page, for data the client holds in full.
 */
export function DataTablePagination({
  pageIndex,
  pageCount,
  onPageChange,
}: DataTablePaginationProps) {
  const [draft, setDraft] = useState(String(pageIndex + 1));
  useEffect(() => {
    setDraft(String(pageIndex + 1));
  }, [pageIndex]);

  if (pageCount <= 1) return null;

  const canPrev = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  const jump = () => {
    const page = Number.parseInt(draft, 10);
    if (Number.isNaN(page)) {
      setDraft(String(pageIndex + 1));
      return;
    }
    onPageChange(Math.min(pageCount - 1, Math.max(0, page - 1)));
  };

  return (
    <nav role="navigation" aria-label="Pagination" className={`${barClass} justify-center gap-1`}>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange(0)}
        className={wordClass}
      >
        First
      </button>
      <button
        type="button"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => onPageChange(pageIndex - 1)}
        className={arrowClass}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="text-neutral-12 px-2 font-mono text-xs tabular-nums" aria-live="polite">
        {pageIndex + 1} / {pageCount}
      </span>
      <button
        type="button"
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => onPageChange(pageIndex + 1)}
        className={arrowClass}
      >
        <ChevronRight className="size-4" />
      </button>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange(pageCount - 1)}
        className={wordClass}
      >
        Last
      </button>
      <label className="text-neutral-10 ml-4 inline-flex items-center gap-2 text-xs">
        Go to
        <Input
          size="compact"
          width="xs"
          type="number"
          min={1}
          max={pageCount}
          value={draft}
          aria-label="Go to page"
          onChange={event => setDraft(event.target.value)}
          onBlur={jump}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              jump();
            }
          }}
        />
      </label>
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
        {loading ? <Spinner variants={{ size: 'sm' }} /> : null}
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

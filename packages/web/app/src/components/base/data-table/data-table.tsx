import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type OnChangeFn,
  type Row,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { Tooltip } from '../floating/tooltip/tooltip';
import type { OnSurface } from '../shared-styles';
import { Spinner } from '../spinner/spinner';
import {
  DataTableBody,
  DataTableCellSlot,
  DataTableExpandedRow,
  DataTableFooterRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  wrapperClass,
  type DataTableColumnLayout,
} from './data-table-components';
import {
  DataTableCursorPagination,
  DataTablePagination,
  type DataTableCursorPaginationProps,
} from './data-table-pagination';

declare module '@tanstack/react-table' {
  // The generics are TanStack's; an augmentation has to repeat them to merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> extends DataTableColumnLayout {
    /** Renders the header as a sort toggle. */
    sortable?: boolean;
    /** Explains the column, on an info icon after the header label. */
    tooltip?: string;
  }
}

export type DataTablePaginationProp =
  | { kind: 'client'; pageSize?: number }
  | ({ kind: 'cursor' } & DataTableCursorPaginationProps)
  | { kind: 'none' };

export type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  getRowId?: (row: TData) => string;
  /** What the empty table says; a node when it needs a link or a second line. */
  emptyMessage?: ReactNode;
  /** Replaces the rows with a spinner while the first page loads. */
  loading?: boolean;
  variants?: {
    onSurface?: OnSurface;
    /** Alternate rows take a tint one step off the surface. On by default. */
    striped?: boolean;
    bordered?: boolean;
  };
  /**
   * `client` pages rows the table already holds; `cursor` hands paging to the caller for a
   * connection the API pages with `first` and `after`. Client with 20 rows a page by default.
   */
  pagination?: DataTablePaginationProp;
  /**
   * Owned sorting, for a page that sorts on the server. Columns opt in with `meta.sortable`.
   * With `manual` the API always sorts, so a header toggles between descending and ascending
   * instead of cycling through unsorted.
   */
  sorting?: { state: SortingState; onChange: OnChangeFn<SortingState>; manual?: boolean };
  /**
   * The sort a client-sorted table opens with, for rows that arrive in a known order so the
   * header can say so. Ignored when the page passes `sorting` and holds the state itself.
   */
  initialSorting?: SortingState;
  /** A closing row: a label across the columns and a value in the last, such as a total. */
  footer?: { label: ReactNode; value: ReactNode };
  /**
   * Per-row state the data implies: a solved ticket is muted, a disabled contract is disabled, a
   * disabled member is critical (tinted so it stands out from the rows around it).
   */
  rowState?: (
    row: TData,
  ) => { muted?: boolean; disabled?: boolean; critical?: boolean } | undefined;
  /** The row the page is showing details for. */
  selectedRowId?: string;
  /**
   * When provided, each row is expandable. Clicking the trailing chevron toggles
   * an inline panel rendered by this function.
   */
  renderSubComponent?: (row: Row<TData>) => ReactNode;
  /** Click handler invoked when a row is clicked (mutually exclusive with renderSubComponent). */
  onRowClick?: (row: TData) => void;
  /** Hide the trailing chevron indicator (rows stay clickable; hover signals interactivity). */
  hideRowIndicator?: boolean;
};

function SortHeader<TData>({
  header,
  label,
}: {
  header: Header<TData, unknown>;
  label: ReactNode;
}) {
  const { column } = header;
  const sorted = column.getIsSorted();
  const { sorting } = header.getContext().table.getState();
  // Shift only means something once there is a sort to add to.
  const teachShift = !sorted && sorting.length > 0 && column.getCanMultiSort();
  return (
    <Tooltip
      disabled={!teachShift}
      content="Shift-click to add as a secondary sort"
      trigger={
        <button
          type="button"
          // Not TanStack's toggle handler: it ignores columns without an accessor, and a
          // server-sorted column has no reason to carry one. Shift stacks a tiebreaker
          // the way the handler would.
          onClick={event => column.toggleSorting(undefined, event.shiftKey)}
          className="text-fg-secondary hover:text-fg inline-flex items-center gap-1 text-xs font-medium"
        >
          {label}
          <ArrowDown
            className={cn(
              'size-3 transition-transform',
              sorted ? 'text-success' : 'opacity-30',
              sorted === 'asc' && 'rotate-180',
            )}
          />
          {sorted && sorting.length > 1 ? (
            <span className="text-success text-2xs tabular-nums" aria-label="Sort priority">
              {column.getSortIndex() + 1}
            </span>
          ) : null}
        </button>
      }
    />
  );
}

export function DataTable<TData>({
  data,
  columns,
  getRowId,
  emptyMessage = 'No rows to display.',
  loading = false,
  variants,
  pagination = { kind: 'client' },
  sorting,
  initialSorting,
  footer,
  rowState,
  selectedRowId,
  renderSubComponent,
  onRowClick,
  hideRowIndicator = false,
}: DataTableProps<TData>) {
  const onSurface = variants?.onSurface ?? 'base';
  const striped = variants?.striped ?? true;
  const bordered = variants?.bordered ?? true;
  const hasTrailingColumn = !hideRowIndicator && (!!renderSubComponent || !!onRowClick);
  const hasHeader = columns.some(column => column.header !== undefined);
  const [ownSorting, setOwnSorting] = useState<SortingState>(initialSorting ?? []);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting: sorting?.state ?? ownSorting },
    onSortingChange: sorting?.onChange ?? setOwnSorting,
    manualSorting: sorting?.manual ?? false,
    enableSortingRemoval: !sorting?.manual,
    // The server APIs take a single sort key, so shift falls back to a plain click there.
    enableMultiSort: !sorting?.manual,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: pagination.kind === 'client' ? getPaginationRowModel() : undefined,
    getExpandedRowModel: renderSubComponent ? getExpandedRowModel() : undefined,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: pagination.kind === 'client' ? (pagination.pageSize ?? 20) : data.length || 1,
      },
    },
    // Don't snap back to page 1 when data changes
    autoResetPageIndex: false,
  });

  const pageCount = table.getPageCount();
  const { pageIndex } = table.getState().pagination;
  useEffect(() => {
    if (pageCount > 0 && pageIndex > pageCount - 1) {
      table.setPageIndex(pageCount - 1);
    }
  }, [pageCount, pageIndex, table]);

  const rows = table.getRowModel().rows;
  const totalColumnCount = columns.length + (hasTrailingColumn ? 1 : 0);

  return (
    <div className={wrapperClass(onSurface, bordered)}>
      <div className="relative w-full overflow-auto">
        <table className="w-full text-sm">
          {hasHeader ? (
            <DataTableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <DataTableRow key={headerGroup.id} onSurface={onSurface}>
                  {headerGroup.headers.map(header => {
                    const meta = header.column.columnDef.meta;
                    const label = header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext());
                    return (
                      <DataTableHead key={header.id} layout={meta} onSurface={onSurface}>
                        <span className="inline-flex items-center gap-1">
                          {meta?.sortable ? <SortHeader header={header} label={label} /> : label}
                          {meta?.tooltip ? (
                            <Tooltip
                              trigger={
                                <span className="text-fg-muted inline-flex">
                                  <Info className="size-3.5" />
                                </span>
                              }
                              content={meta.tooltip}
                            />
                          ) : null}
                        </span>
                      </DataTableHead>
                    );
                  })}
                  {hasTrailingColumn ? <DataTableHead compact onSurface={onSurface} /> : null}
                </DataTableRow>
              ))}
            </DataTableHeader>
          ) : null}
          <DataTableBody>
            {loading ? (
              <DataTableRow onSurface={onSurface}>
                <DataTableCellSlot colSpan={totalColumnCount} variant="empty">
                  <Spinner />
                </DataTableCellSlot>
              </DataTableRow>
            ) : rows.length === 0 ? (
              <DataTableRow onSurface={onSurface}>
                <DataTableCellSlot colSpan={totalColumnCount} variant="empty">
                  {emptyMessage}
                </DataTableCellSlot>
              </DataTableRow>
            ) : (
              rows.map((row, index) => {
                const handleClick = renderSubComponent
                  ? () => row.toggleExpanded()
                  : onRowClick
                    ? () => onRowClick(row.original)
                    : undefined;
                const state = rowState?.(row.original);
                return (
                  <Fragment key={row.id}>
                    <DataTableRow
                      onSurface={onSurface}
                      // Counted over data rows, so an expanded panel does not shift the stripes.
                      striped={striped && index % 2 === 1}
                      expanded={row.getIsExpanded()}
                      selected={selectedRowId !== undefined && row.id === selectedRowId}
                      muted={state?.muted}
                      disabled={state?.disabled}
                      critical={state?.critical}
                      onClick={handleClick}
                    >
                      {row.getVisibleCells().map(cell => (
                        <DataTableCellSlot key={cell.id} layout={cell.column.columnDef.meta}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </DataTableCellSlot>
                      ))}
                      {hasTrailingColumn ? (
                        <DataTableCellSlot variant="compact">
                          {renderSubComponent ? (
                            <ChevronDown
                              className={cn(
                                'size-4 transition-transform',
                                row.getIsExpanded() && 'rotate-180',
                              )}
                            />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </DataTableCellSlot>
                      ) : null}
                    </DataTableRow>
                    {renderSubComponent && row.getIsExpanded() ? (
                      <DataTableExpandedRow colSpan={totalColumnCount}>
                        {renderSubComponent(row)}
                      </DataTableExpandedRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </DataTableBody>
          {footer ? (
            <DataTableFooterRow
              label={footer.label}
              value={footer.value}
              columnCount={totalColumnCount}
            />
          ) : null}
        </table>
      </div>
      {pagination.kind === 'client' && table.getPageCount() > 1 ? (
        <DataTablePagination
          pageIndex={table.getState().pagination.pageIndex}
          pageCount={table.getPageCount()}
          onPageChange={page => table.setPageIndex(page)}
        />
      ) : null}
      {pagination.kind === 'cursor' &&
      (pagination.hasPreviousPage || pagination.hasNextPage || pagination.loading) ? (
        <DataTableCursorPagination
          hasPreviousPage={pagination.hasPreviousPage}
          hasNextPage={pagination.hasNextPage}
          onPrevious={pagination.onPrevious}
          onNext={pagination.onNext}
          summary={pagination.summary}
          loading={pagination.loading}
        />
      ) : null}
    </div>
  );
}

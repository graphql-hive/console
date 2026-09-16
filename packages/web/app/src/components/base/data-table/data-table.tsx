import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ChevronDown, ChevronRight, Info, LoaderCircle } from 'lucide-react';
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
  /** A closing row: a label across the columns and a value in the last, such as a total. */
  footer?: { label: ReactNode; value: ReactNode };
  /** Per-row state the data implies: a solved ticket is muted, a disabled contract is disabled. */
  rowState?: (row: TData) => { muted?: boolean; disabled?: boolean } | undefined;
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
  const sorted = header.column.getIsSorted();
  return (
    <button
      type="button"
      // Not TanStack's toggle handler: it ignores columns without an accessor, and a
      // server-sorted column has no reason to carry one.
      onClick={() => header.column.toggleSorting()}
      className="text-neutral-10 hover:text-neutral-12 inline-flex items-center gap-1 text-xs font-medium"
    >
      {label}
      <ArrowDown
        className={cn(
          'size-3 transition-transform',
          sorted ? 'opacity-100' : 'opacity-30',
          sorted === 'asc' && 'rotate-180',
        )}
      />
    </button>
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
  const [ownSorting, setOwnSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting: sorting?.state ?? ownSorting },
    onSortingChange: sorting?.onChange ?? setOwnSorting,
    manualSorting: sorting?.manual ?? false,
    enableSortingRemoval: !sorting?.manual,
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
                                <span className="text-neutral-9 inline-flex">
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
                  <LoaderCircle className="mx-auto size-5 animate-spin" aria-label="Loading" />
                </DataTableCellSlot>
              </DataTableRow>
            ) : rows.length === 0 ? (
              <DataTableRow onSurface={onSurface}>
                <DataTableCellSlot colSpan={totalColumnCount} variant="empty">
                  {emptyMessage}
                </DataTableCellSlot>
              </DataTableRow>
            ) : (
              rows.map(row => {
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
                      striped={striped}
                      expanded={row.getIsExpanded()}
                      selected={selectedRowId !== undefined && row.id === selectedRowId}
                      muted={state?.muted}
                      disabled={state?.disabled}
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
